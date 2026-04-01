import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, applyRouteRateLimit, parseJsonString } from "@/lib/api";
import { generateTextWithMetadata as generateContentWithMetadata } from "@/lib/content-service";
import { quizAnswerSchema, validateGeneratedQuiz, type QuizAnswer } from "@/lib/quiz-content";
import { QuizModel } from "@/models/Quiz";
import { StudyPlanModel } from "@/models/StudyPlan";
import { logActivity } from "@/lib/progress";
import { scheduleRevisionItem } from "@/lib/revision";
import { upsertConceptNode, updateConceptConfidence } from "@/lib/knowledge-graph";
import { sendAchievementEmail, sendStreakBrokenEmail, sendStreakMilestoneEmail } from "@/lib/email";
import { createAchievementNotifications, createNotification } from "@/lib/notifications";

const plannerContextSchema = z.object({
  planId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  taskIndex: z.number().int().min(0)
});

const postSchema = z.object({
  topic: z.string().min(2),
  subject: z.string().min(2),
  difficulty: z.enum(["easy", "medium", "hard"]),
  numQuestions: z.number().min(1).max(20),
  plannerContext: plannerContextSchema.optional()
});

const patchSchema = z.object({
  quizId: z.string(),
  answers: z.array(quizAnswerSchema.nullable()),
  timeTaken: z.number().min(0),
  subject: z.string().min(2)
});

function buildQuizPrompt({
  topic,
  subject,
  difficulty,
  numQuestions
}: {
  topic: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  numQuestions: number;
}) {
  return `Create exactly ${numQuestions} multiple-choice questions for ${subject} on "${topic}" at ${difficulty} difficulty.
Return ONLY valid JSON in this exact shape:
{
  "questions": [
    {
      "question": "clear question text",
      "options": {
        "A": "option A",
        "B": "option B",
        "C": "option C",
        "D": "option D"
      },
      "correct": "A",
      "explanation": "Correct answer is A because ..."
    }
  ]
}
Rules:
- Provide exactly ${numQuestions} questions.
- Each question must have 4 distinct options.
- Only one option can be objectively correct.
- Do not use "all of the above" or "none of the above".
- Explanations must explicitly justify the correct option and stay consistent with the marked answer.
- Avoid trick wording, ambiguity, and meta commentary.`;
}

function buildQuizRepairPrompt({
  topic,
  subject,
  difficulty,
  numQuestions,
  issues
}: {
  topic: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  numQuestions: number;
  issues: string[];
}) {
  return `${buildQuizPrompt({ topic, subject, difficulty, numQuestions })}

The previous draft failed validation for these reasons:
${issues.map((issue, index) => `${index + 1}. ${issue}`).join("\n")}

Rewrite the full JSON response from scratch and fix every issue.`;
}

async function generateReviewedQuiz({
  topic,
  subject,
  difficulty,
  numQuestions
}: {
  topic: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  numQuestions: number;
}) {
  let issues: string[] = [];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const prompt =
      attempt === 1
        ? buildQuizPrompt({ topic, subject, difficulty, numQuestions })
        : buildQuizRepairPrompt({ topic, subject, difficulty, numQuestions, issues });

    const generated = await generateContentWithMetadata(prompt);
    let parsedPayload: unknown;

    try {
      parsedPayload = parseJsonString(generated.text);
    } catch {
      issues = ["The model did not return valid JSON."];
      continue;
    }

    const validation = validateGeneratedQuiz(parsedPayload, numQuestions);
    if (validation.success) {
      return {
        questions: validation.questions,
        generationMeta: {
          provider: generated.provider,
          model: generated.model,
          attempts: attempt,
          repaired: attempt > 1,
          validatedAt: new Date()
        }
      };
    }

    issues = validation.issues;
  }

  throw new Error("We couldn't generate a reliable quiz this time. Please try again with a narrower topic.");
}

export async function POST(request: Request) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;
  const rate = await applyRouteRateLimit(`quiz:${authResult.userId}`);
  if (rate) return rate;

  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { topic, subject, difficulty, numQuestions, plannerContext } = parsed.data;
  try {
    const generated = await generateReviewedQuiz({ topic, subject, difficulty, numQuestions });

    await connectToDatabase();
    const quiz = await QuizModel.create({
      userId: authResult.userId,
      topic,
      subject,
      questions: generated.questions,
      totalQuestions: generated.questions.length,
      plannerContext: plannerContext ?? null,
      generationMeta: generated.generationMeta
    });

    return NextResponse.json({ success: true, quizId: quiz._id, quiz });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quiz generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET() {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  await connectToDatabase();
  const quizzes = await QuizModel.find({ userId: authResult.userId })
    .sort({ completedAt: -1, createdAt: -1 })
    .select("topic subject score totalQuestions completedAt autopsy")
    .limit(25)
    .lean();

  return NextResponse.json({
    quizzes: quizzes.map((quiz) => ({
      _id: quiz._id.toString(),
      topic: quiz.topic,
      subject: quiz.subject,
      score: quiz.score ?? null,
      totalQuestions: quiz.totalQuestions ?? 0,
      completedAt: quiz.completedAt ? new Date(quiz.completedAt).toISOString() : null,
      hasAutopsy: Boolean(quiz.autopsy)
    }))
  });
}

export async function PATCH(request: Request) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectToDatabase();
  const quiz = await QuizModel.findOne({ _id: parsed.data.quizId, userId: authResult.userId });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const normalizedAnswers = Array.from({ length: quiz.questions.length }, (_, index) => parsed.data.answers[index] ?? null);
  const correctCount = quiz.questions.reduce(
    (
      count: number,
      question: { correct: QuizAnswer },
      index: number
    ) => (normalizedAnswers[index] === question.correct ? count + 1 : count),
    0
  );
  const percent = quiz.questions.length === 0 ? 0 : Math.round((correctCount / quiz.questions.length) * 100);
  const submittedAnswers = quiz.questions.map(
    (
      question: {
        correct: QuizAnswer;
        options: Record<QuizAnswer, string>;
      },
      index: number
    ) => {
      const selectedOption = normalizedAnswers[index];
      return {
        questionIndex: index,
        selectedOption,
        selectedText: selectedOption ? question.options[selectedOption] : "",
        isCorrect: selectedOption === question.correct
      };
    }
  );

  quiz.score = percent;
  quiz.timeTaken = parsed.data.timeTaken;
  quiz.completedAt = new Date();
  quiz.submittedAnswers = submittedAnswers;
  await quiz.save();

  let plannerCheckpoint: { passed: boolean; planId: string; date: string; taskIndex: number } | null = null;
  if (quiz.plannerContext?.planId && quiz.plannerContext?.date && typeof quiz.plannerContext?.taskIndex === "number") {
    const plan = await StudyPlanModel.findOne({ _id: quiz.plannerContext.planId, userId: authResult.userId });
    const day = plan?.generatedPlan.find((item: { date: string }) => item.date === quiz.plannerContext.date);
    const task = day?.tasks?.[quiz.plannerContext.taskIndex];

    if (plan && day && task) {
      task.checkpointId = quiz._id.toString();
      task.checkpointScore = percent;
      task.checkpointStatus = percent >= 50 ? "passed" : "revise_again";
      task.completed = percent >= 50;
      await plan.save();
      plannerCheckpoint = {
        passed: percent >= 50,
        planId: quiz.plannerContext.planId,
        date: quiz.plannerContext.date,
        taskIndex: quiz.plannerContext.taskIndex
      };
    }
  }

  const events = await logActivity({
    userId: authResult.userId,
    subject: quiz.subject,
    type: "quiz",
    quizScore: percent,
    minutesStudied: parsed.data.timeTaken
  });

  await Promise.allSettled([
    scheduleRevisionItem({
      userId: authResult.userId,
      topic: quiz.topic,
      subject: quiz.subject,
      type: "quiz",
      sourceId: quiz._id.toString(),
      sourceTitle: `${quiz.subject}: ${quiz.topic}`
    }),
    upsertConceptNode({
      userId: authResult.userId,
      conceptName: quiz.topic,
      subject: quiz.subject,
      sourceId: quiz._id.toString(),
      sourceType: "quiz",
      sourceTitle: quiz.topic
    }),
    updateConceptConfidence(authResult.userId, quiz.subject, percent)
  ]);

  if (events.newAchievements.length) {
    await createAchievementNotifications(authResult.userId, events.newAchievements).catch((error) => {
      console.error("Failed to create achievement notifications for quiz event", error);
    });
  }

  if (events.streakBroken.happened) {
    await createNotification({
      userId: authResult.userId,
      type: "system",
      title: "Streak broken",
      message: `You lost a ${events.streakBroken.previous}-day streak. Restart today.`,
      actionUrl: "/dashboard"
    }).catch((error) => {
      console.error("Failed to create streak-break notification for quiz event", error);
    });

    if (authResult.session?.user?.email) {
      await sendStreakBrokenEmail(authResult.session.user.email, events.streakBroken.previous).catch((error) => {
        console.error("Failed to send streak-break email for quiz event", error);
        return null;
      });
    }
  }

  if (events.streakMilestone.happened && events.streakMilestone.milestone) {
    await createNotification({
      userId: authResult.userId,
      type: "system",
      title: `${events.streakMilestone.milestone}-day streak reached`,
      message: `You extended your streak to ${events.streakMilestone.milestone} days.`,
      actionUrl: "/dashboard/track"
    }).catch((error) => {
      console.error("Failed to create streak-milestone notification for quiz event", error);
    });
  }

  if (authResult.session?.user?.email && (events.newAchievements.length || events.streakMilestone.happened)) {
    const emailTasks = [
      ...(events.streakMilestone.happened && events.streakMilestone.milestone
        ? [sendStreakMilestoneEmail(authResult.session.user.email!, events.streakMilestone.milestone)]
        : []),
      ...events.newAchievements.map((achievement) =>
        sendAchievementEmail(authResult.session!.user!.email!, achievement.title, achievement.description)
      )
    ];

    await Promise.all(emailTasks).catch((error) => {
      console.error("Failed to send achievement emails for quiz event", error);
      return null;
    });
  }

  return NextResponse.json({
    success: true,
    quiz,
    events,
    result: {
      correctCount,
      totalQuestions: quiz.questions.length,
      percent
    },
    autopsyAvailable: percent < 100,
    plannerCheckpoint
  });
}
