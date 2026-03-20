import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, applyRouteRateLimit, parseJsonString } from "@/lib/api";
import { generateContent } from "@/lib/gemini";
import { StudyPlanModel } from "@/models/StudyPlan";
import { evaluateAchievements, logActivity } from "@/lib/progress";
import { sendAchievementEmail, sendStreakBrokenEmail, sendStreakMilestoneEmail } from "@/lib/email";
import { UserModel } from "@/models/User";
import { createAchievementNotifications, createNotification } from "@/lib/notifications";

const subjectSchema = z.object({
  name: z.string().min(2),
  examDate: z.string(),
  importance: z.number().min(1).max(5)
});

const postSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  subjects: z.array(subjectSchema).min(1),
  hoursPerDay: z.number().min(1).max(16),
  startDate: z.string()
});

const patchSchema = z.object({
  planId: z.string(),
  date: z.string(),
  taskIndex: z.number(),
  completed: z.boolean()
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
  subjects: {
    name: string;
    hoursPerDay: number;
    priority: number;
  }[];
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
      const typedTask = task as { subject?: unknown; topic?: unknown; duration?: unknown; type?: unknown };
      const taskType = normalizeTaskType(typedTask.type);
      const subject = String(typedTask.subject ?? "").trim() || (taskType === "break" ? "Break" : "General");
      const topic = String(typedTask.topic ?? "").trim() || (taskType === "break" ? "Short break" : "Focused session");

      tasks.push({
        subject,
        topic,
        duration: normalizeDuration(typedTask.duration, taskType),
        type: taskType,
        completed: false
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

  const { name, subjects, hoursPerDay, startDate } = body.data;
  const prompt = `Create a detailed daily study schedule for a student.
Subjects and exam dates: ${JSON.stringify(subjects)}.
Available hours per day: ${hoursPerDay}.
Start date: ${startDate}.
Rules:
Prioritize subjects with sooner exam dates
Give harder/important subjects more time
Include revision days before each exam
Alternate subjects to avoid fatigue
Include short breaks
Respond in this EXACT JSON format:
{ "plan": [{ "date": "YYYY-MM-DD", "tasks": [{"subject": "", "topic": "", "duration": 60, "type": "study|revision|practice|break"}] }] }`;

  const response = await generateContent(prompt);
  const json = parseJsonString(response) as { plan?: unknown };
  const generatedPlan = normalizeGeneratedPlan(json.plan);

  await connectToDatabase();
  const plan = (await StudyPlanModel.create({
    userId: authResult.userId,
    name: name?.trim() || `${subjects[0].name} Plan`,
    examDate: subjects
      .map((subject) => new Date(subject.examDate))
      .filter((date) => !Number.isNaN(date.valueOf()))
      .sort((a, b) => a.getTime() - b.getTime())[0],
    startDate: new Date(startDate),
    hoursPerDay,
    subjects: subjects.map((item) => ({
      name: item.name,
      hoursPerDay,
      priority: item.importance
    })),
    generatedPlan
  })) as unknown as PlannerDoc;

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

  const { planId, date, taskIndex, completed } = parsed.data;

  await connectToDatabase();
  const plan = await StudyPlanModel.findOne({ _id: planId, userId: authResult.userId });
  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const day = plan.generatedPlan.find(
    (item: { date: string; tasks: Array<{ completed?: boolean; subject: string; duration: number }> }) =>
      item.date === date
  );
  if (!day || !day.tasks[taskIndex]) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  day.tasks[taskIndex].completed = completed;
  await plan.save();

  let events = null;
  if (completed) {
    const task = day.tasks[taskIndex];
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
        actionUrl: "/progress"
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
