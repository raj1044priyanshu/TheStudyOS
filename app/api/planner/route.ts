import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, applyRouteRateLimit, parseJsonString } from "@/lib/api";
import { generateText as generateContent } from "@/lib/content-service";
import { StudyPlanModel } from "@/models/StudyPlan";
import { ExamModel } from "@/models/Exam";
import { evaluateAchievements, logActivity } from "@/lib/progress";
import { sendAchievementEmail, sendStreakBrokenEmail, sendStreakMilestoneEmail } from "@/lib/email";
import { UserModel } from "@/models/User";
import { createAchievementNotifications, createNotification } from "@/lib/notifications";
import { buildChapterPlan } from "@/lib/planner-prefill";
import { buildPlannerQuizHref, normalizeTopicList } from "@/lib/planner-utils";

const subjectSchema = z.object({
  name: z.string().min(2),
  examDate: z.string(),
  importance: z.number().min(1).max(5)
});

const confirmedExamSchema = z.object({
  examId: z.string().optional(),
  subject: z.string().min(2),
  examName: z.string().min(2),
  examDate: z.string().min(1),
  board: z.string().optional().nullable(),
  chapters: z.array(z.string().min(1)).max(64),
  source: z.enum(["manual", "saved", "official", "saved+official"]),
  notes: z.string().optional(),
  officialExamDate: z.string().optional().nullable()
});

const studyContextSchema = z.object({
  className: z.string().min(2),
  board: z.string().min(2),
  stream: z.enum(["Science", "Commerce", "Humanities", "Other"]).optional().or(z.literal("")),
  studyHoursPerDay: z.number().min(1).max(16),
  startDate: z.string().min(1),
  examYear: z.number().int().min(2000).max(2100).optional()
});

const postSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  subjects: z.array(subjectSchema).min(1).optional(),
  hoursPerDay: z.number().min(1).max(16),
  startDate: z.string(),
  focusTopics: z.array(z.string().trim().min(2).max(80)).max(12).optional(),
  prefillSource: z.enum(["manual", "autopsy", "exam", "upcoming-exams", "prefill", "assistant"]).optional(),
  studyContext: studyContextSchema.optional(),
  confirmedExams: z.array(confirmedExamSchema).max(24).optional()
});

const patchSchema = z.object({
  planId: z.string(),
  date: z.string(),
  taskIndex: z.number(),
  completed: z.boolean().optional(),
  action: z.enum(["toggle-complete", "mark-studied"]).optional()
});

const deleteSchema = z.object({
  planId: z.string()
});

type PlannerTask = {
  subject: string;
  topic: string;
  duration: number;
  type: "study" | "revision" | "practice" | "break";
  completed?: boolean;
  examId?: string | null;
  examName?: string | null;
  chapter?: string | null;
  checkpointStatus?: "not_started" | "studied" | "checkpoint_required" | "passed" | "revise_again";
  checkpointId?: string | null;
  checkpointScore?: number | null;
};

type PlannerDay = {
  date: string;
  tasks: PlannerTask[];
};

interface PlannerDoc {
  _id: Types.ObjectId;
  name?: string;
  examDate?: Date;
  startDate?: Date;
  hoursPerDay?: number;
  studyContext?: {
    className?: string;
    board?: string;
    stream?: string;
    studyHoursPerDay?: number;
    startDate?: string;
    examYear?: number | null;
  } | null;
  subjects: {
    name: string;
    hoursPerDay: number;
    priority: number;
  }[];
  exams?: Array<{
    examId?: string | null;
    subject: string;
    examName: string;
    examDate: string;
    board?: string | null;
    chapters: string[];
    source: string;
    notes?: string;
    officialExamDate?: string | null;
  }>;
  generatedPlan: PlannerDay[];
  createdAt?: Date;
}

function normalizeTaskType(value: unknown): PlannerTask["type"] {
  if (typeof value !== "string") return "study";
  const normalized = value.trim().toLowerCase();
  if (normalized === "study" || normalized === "revision" || normalized === "practice" || normalized === "break") {
    return normalized;
  }
  if (normalized === "rest") {
    return "break";
  }
  return "study";
}

function normalizeDuration(value: unknown, taskType: PlannerTask["type"]) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return taskType === "break" ? 15 : 45;
  }

  if (taskType === "break") {
    return Math.max(5, Math.min(45, Math.round(parsed)));
  }

  return Math.max(10, Math.min(180, Math.round(parsed)));
}

function normalizeGeneratedPlan(plan: unknown): PlannerDay[] {
  if (!Array.isArray(plan)) return [];

  const normalizedDays: PlannerDay[] = [];

  for (const day of plan) {
    const rawDate = day && typeof day === "object" && "date" in day ? String((day as { date?: unknown }).date ?? "").trim() : "";
    const rawTasks = day && typeof day === "object" && "tasks" in day ? (day as { tasks?: unknown }).tasks : [];
    const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : "";
    if (!date || !Array.isArray(rawTasks)) {
      continue;
    }

    const tasks: PlannerTask[] = [];
    for (const task of rawTasks) {
      if (!task || typeof task !== "object") continue;
      const typedTask = task as {
        subject?: unknown;
        topic?: unknown;
        duration?: unknown;
        type?: unknown;
        completed?: unknown;
        examId?: unknown;
        examName?: unknown;
        chapter?: unknown;
        checkpointStatus?: unknown;
        checkpointId?: unknown;
        checkpointScore?: unknown;
      };
      const taskType = normalizeTaskType(typedTask.type);
      const subject = String(typedTask.subject ?? "").trim() || (taskType === "break" ? "Break" : "General");
      const topic = String(typedTask.topic ?? "").trim() || (taskType === "break" ? "Short break" : "Focused session");
      const checkpointStatus = (() => {
        const raw = String(typedTask.checkpointStatus ?? "").trim();
        if (["not_started", "studied", "checkpoint_required", "passed", "revise_again"].includes(raw)) {
          return raw as PlannerTask["checkpointStatus"];
        }
        return taskType === "break" ? "passed" : "not_started";
      })();

      tasks.push({
        subject,
        topic,
        duration: normalizeDuration(typedTask.duration, taskType),
        type: taskType,
        completed: Boolean(taskType === "break" ? typedTask.completed ?? false : typedTask.completed ?? false),
        examId: typeof typedTask.examId === "string" ? typedTask.examId : null,
        examName: typeof typedTask.examName === "string" ? typedTask.examName : null,
        chapter: typeof typedTask.chapter === "string" ? typedTask.chapter : topic,
        checkpointStatus,
        checkpointId: typeof typedTask.checkpointId === "string" ? typedTask.checkpointId : null,
        checkpointScore: typeof typedTask.checkpointScore === "number" ? typedTask.checkpointScore : null
      });
    }

    if (!tasks.length) {
      continue;
    }

    normalizedDays.push({ date, tasks });
  }

  return normalizedDays;
}

function plannerSummary(plan: PlannerDoc) {
  const totalTasks = plan.generatedPlan.reduce((sum, day) => sum + day.tasks.length, 0);
  const completedTasks = plan.generatedPlan.reduce(
    (sum, day) => sum + day.tasks.filter((task) => Boolean(task.completed)).length,
    0
  );
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return {
    _id: plan._id.toString(),
    name: plan.name ?? "Study Plan",
    createdAt: plan.createdAt?.toISOString() ?? new Date().toISOString(),
    startDate: plan.startDate?.toISOString() ?? null,
    examDate: plan.examDate?.toISOString() ?? null,
    hoursPerDay: plan.hoursPerDay ?? 1,
    subjects: plan.subjects,
    exams: plan.exams ?? [],
    studyContext: plan.studyContext ?? null,
    totalDays: plan.generatedPlan.length,
    totalTasks,
    completedTasks,
    completionRate
  };
}

function plannerDetails(plan: PlannerDoc) {
  return {
    ...plannerSummary(plan),
    generatedPlan: plan.generatedPlan
  };
}

export async function GET(request: Request) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;
  const rate = await applyRouteRateLimit(`planner:${authResult.userId}`);
  if (rate) return rate;

  await connectToDatabase();

  const url = new URL(request.url);
  const queryPlanId = url.searchParams.get("planId");

  const plans = (await StudyPlanModel.find({ userId: authResult.userId })
    .sort({ createdAt: -1 })
    .lean()) as unknown as PlannerDoc[];

  if (!plans.length) {
    return NextResponse.json({ plans: [], selectedPlan: null });
  }

  let selectedPlan = plans[0];
  if (queryPlanId && Types.ObjectId.isValid(queryPlanId)) {
    const found = plans.find((plan) => plan._id.toString() === queryPlanId);
    if (found) {
      selectedPlan = found;
    }
  }

  return NextResponse.json({
    plans: plans.map(plannerSummary),
    selectedPlan: plannerDetails(selectedPlan)
  });
}

export async function POST(request: Request) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;
  const rate = await applyRouteRateLimit(`planner:${authResult.userId}`);
  if (rate) return rate;

  const body = postSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  if (!(body.data.subjects?.length || body.data.confirmedExams?.length)) {
    return NextResponse.json({ error: "At least one subject or confirmed exam is required" }, { status: 400 });
  }

  const { name, subjects = [], hoursPerDay, startDate, focusTopics = [], studyContext, confirmedExams = [] } = body.data;
  const normalizedFocusTopics = [...new Set(focusTopics.map((topic) => topic.trim()).filter(Boolean))].slice(0, 12);
  const normalizedConfirmedExams =
    confirmedExams.length > 0
      ? confirmedExams.map((exam) => ({
          ...exam,
          chapters: normalizeTopicList(exam.chapters)
        }))
      : [];

  const generatedPlan =
    normalizedConfirmedExams.length > 0
      ? buildChapterPlan({
          confirmedExams: normalizedConfirmedExams,
          focusTopics: normalizedFocusTopics,
          hoursPerDay,
          startDate
        })
      : (() => {
          const prompt = `Create a detailed daily study schedule for a student.
Subjects and exam dates: ${JSON.stringify(subjects)}.
Available hours per day: ${hoursPerDay}.
Start date: ${startDate}.
Focus topics to prioritize: ${normalizedFocusTopics.length ? normalizedFocusTopics.join(", ") : "None"}.
Rules:
Prioritize subjects with sooner exam dates
Give harder/important subjects more time
Include revision days before each exam
Alternate subjects to avoid fatigue
Include short breaks
If focus topics are provided, make sure they appear as specific task topics throughout the plan.
Respond in this EXACT JSON format:
{ "plan": [{ "date": "YYYY-MM-DD", "tasks": [{"subject": "", "topic": "", "duration": 60, "type": "study|revision|practice|break"}] }] }`;

          return prompt;
        })();

  const legacyGeneratedPlan = Array.isArray(generatedPlan)
    ? generatedPlan
    : normalizeGeneratedPlan(parseJsonString(await generateContent(generatedPlan))?.plan);

  const effectiveSubjects =
    normalizedConfirmedExams.length > 0
      ? normalizedConfirmedExams.map((exam, index) => ({
          name: exam.subject,
          examDate: exam.examDate,
          importance: Math.max(1, Math.min(5, 5 - index))
        }))
      : subjects;

  await connectToDatabase();
  const plan = (await StudyPlanModel.create({
    userId: authResult.userId,
    name: name?.trim() || `${effectiveSubjects[0]?.name ?? "Study"} Plan`,
    examDate: effectiveSubjects
      .map((subject) => new Date(subject.examDate))
      .filter((date) => !Number.isNaN(date.valueOf()))
      .sort((a, b) => a.getTime() - b.getTime())[0],
    startDate: new Date(startDate),
    hoursPerDay,
    studyContext: studyContext
      ? {
          className: studyContext.className,
          board: studyContext.board,
        stream: studyContext.stream ?? "",
        studyHoursPerDay: studyContext.studyHoursPerDay,
        startDate: studyContext.startDate,
        examYear: studyContext.examYear ?? null
      }
    : undefined,
    subjects: effectiveSubjects.map((item) => ({
      name: item.name,
      hoursPerDay,
      priority: item.importance
    })),
    exams: normalizedConfirmedExams,
    generatedPlan: legacyGeneratedPlan
  })) as unknown as PlannerDoc;

  if (normalizedConfirmedExams.length > 0) {
    await Promise.all(
      normalizedConfirmedExams
        .filter((exam) => exam.examId)
        .map((exam) =>
          ExamModel.updateOne(
            { _id: exam.examId, userId: authResult.userId },
            {
              $set: {
                board: exam.board ?? studyContext?.board ?? null,
                examDate: new Date(exam.examDate),
                syllabus: exam.chapters
              }
            }
          )
        )
    );
  }

  const plannerOwner = await UserModel.findById(authResult.userId).select("streak level").lean();
  const newAchievements = plannerOwner
    ? await evaluateAchievements(authResult.userId, plannerOwner.streak ?? 0, plannerOwner.level ?? 1)
    : [];

  if (newAchievements.length) {
    await createAchievementNotifications(authResult.userId, newAchievements).catch((error) => {
      console.error("Failed to create achievement notifications for planner creation", error);
    });

    if (authResult.session?.user?.email) {
      await Promise.all(
        newAchievements.map((achievement) => sendAchievementEmail(authResult.session!.user!.email!, achievement.title, achievement.description))
      ).catch((error) => {
        console.error("Failed to send achievement emails for planner creation", error);
        return null;
      });
    }
  }

  return NextResponse.json({
    success: true,
    planId: plan._id.toString(),
    selectedPlan: plannerDetails(plan),
    summary: plannerSummary(plan),
    events: {
      newAchievements
    }
  });
}

export async function PATCH(request: Request) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;
  const rate = await applyRouteRateLimit(`planner:${authResult.userId}`);
  if (rate) return rate;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { planId, date, taskIndex, completed = false, action = "toggle-complete" } = parsed.data;

  await connectToDatabase();
  const plan = await StudyPlanModel.findOne({ _id: planId, userId: authResult.userId });
  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const day = plan.generatedPlan.find(
    (
      item: {
        date: string;
        tasks: Array<{
          completed?: boolean;
          subject: string;
          duration: number;
          type?: string;
          checkpointStatus?: string;
        }>;
      }
    ) => item.date === date
  );
  if (!day || !day.tasks[taskIndex]) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const task = day.tasks[taskIndex];

  if (action === "mark-studied") {
    if (task.type === "break") {
      task.completed = true;
      task.checkpointStatus = "passed";
    } else {
      task.checkpointStatus = "checkpoint_required";
    }
  } else {
    if (completed && task.type !== "break" && task.checkpointStatus !== "passed") {
      if (task.checkpointStatus !== "revise_again") {
        task.checkpointStatus = "checkpoint_required";
        await plan.save();
      }

      const redirectTo = buildPlannerQuizHref({
        subject: task.subject,
        topic: task.chapter ?? task.topic,
        planId: plan._id.toString(),
        date,
        taskIndex
      });

      return NextResponse.json(
        {
          error: "Pass the chapter checkpoint before marking this complete",
          reason: "checkpoint_required",
          redirectTo,
          selectedPlan: plannerDetails(plan.toObject() as unknown as PlannerDoc),
          summary: plannerSummary(plan.toObject() as unknown as PlannerDoc)
        },
        { status: 409 }
      );
    }
    task.completed = completed;
  }
  await plan.save();

  let events = null;
  if (action === "toggle-complete" && completed) {
    events = await logActivity({
      userId: authResult.userId,
      subject: task.subject,
      type: "planner",
      minutesStudied: task.duration
    });

    if (events.newAchievements.length) {
      await createAchievementNotifications(authResult.userId, events.newAchievements).catch((error) => {
        console.error("Failed to create achievement notifications for planner event", error);
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
        console.error("Failed to create streak-break notification for planner event", error);
      });

      if (authResult.session?.user?.email) {
        await sendStreakBrokenEmail(authResult.session.user.email, events.streakBroken.previous).catch((error) => {
          console.error("Failed to send streak-break email for planner event", error);
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
        console.error("Failed to create streak-milestone notification for planner event", error);
      });
    }

    if ((events.newAchievements.length || events.streakMilestone.happened) && authResult.session?.user?.email) {
      const emailTasks = [
        ...(events.streakMilestone.happened && events.streakMilestone.milestone
          ? [sendStreakMilestoneEmail(authResult.session.user.email!, events.streakMilestone.milestone)]
          : []),
        ...events.newAchievements.map((achievement) =>
          sendAchievementEmail(authResult.session!.user!.email!, achievement.title, achievement.description)
        )
      ];

      await Promise.all(emailTasks).catch((error) => {
        console.error("Failed to send achievement emails for planner event", error);
        return null;
      });
    }
  }

  const planDoc = plan.toObject() as unknown as PlannerDoc;

  return NextResponse.json({
    success: true,
    selectedPlan: plannerDetails(planDoc),
    summary: plannerSummary(planDoc),
    events
  });
}

export async function DELETE(request: Request) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;
  const rate = await applyRouteRateLimit(`planner:${authResult.userId}`);
  if (rate) return rate;

  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { planId } = parsed.data;
  await connectToDatabase();
  const deleted = await StudyPlanModel.findOneAndDelete({ _id: planId, userId: authResult.userId }).lean();

  if (!deleted) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
