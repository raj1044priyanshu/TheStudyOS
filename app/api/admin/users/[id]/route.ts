export const dynamic = "force-dynamic";

import { NoteModel } from "@/models/Note";
import { QuizModel } from "@/models/Quiz";
import { StudyPlanModel } from "@/models/StudyPlan";
import { FeedbackModel } from "@/models/Feedback";
import { AppErrorLogModel } from "@/models/AppErrorLog";
import { UserModel } from "@/models/User";
import { createAdminAuditLog } from "@/lib/admin/audit";
import { requireAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";

interface Context {
  params: { id: string };
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;

    await connectToDatabase();

    const [user, noteCount, quizCount, planCount, feedbackCount, errorCount] = await Promise.all([
      UserModel.findById(params.id).lean(),
      NoteModel.countDocuments({ userId: params.id }),
      QuizModel.countDocuments({ userId: params.id }),
      StudyPlanModel.countDocuments({ userId: params.id }),
      FeedbackModel.countDocuments({ userId: params.id }),
      AppErrorLogModel.countDocuments({ affectedUserIds: params.id })
    ]);

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    return Response.json({
      user: toSerializable(user),
      stats: {
        noteCount,
        quizCount,
        planCount,
        feedbackCount,
        errorCount
      },
      relatedLinks: [
        { label: "Notes", href: `/admin/resources?resource=notes&userId=${params.id}` },
        { label: "Quizzes", href: `/admin/resources?resource=quizzes&userId=${params.id}` },
        { label: "Plans", href: `/admin/resources?resource=studyPlans&userId=${params.id}` },
        { label: "Feedback", href: `/admin/feedback?userId=${params.id}` },
        { label: "Errors", href: `/admin/errors?userId=${params.id}` }
      ]
    });
  } catch (error) {
    return routeError("admin:users:get", error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const authResult = await requireAdmin();
    if (authResult.error) return authResult.error;

    const payload = (await request.json().catch(() => null)) as
      | {
          role?: "student" | "admin";
          status?: "active" | "suspended";
        }
      | null;

    if (!payload || (!payload.role && !payload.status)) {
      return Response.json({ error: "No updates provided." }, { status: 400 });
    }

    await connectToDatabase();
    const user = await UserModel.findById(params.id);
    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const before = user.toObject();

    if (payload.role) {
      user.role = payload.role;
    }

    if (payload.status) {
      user.status = payload.status;
    }

    await user.save();

    await createAdminAuditLog({
      actorUserId: authResult.userId,
      action: "user.update",
      targetModel: "User",
      targetId: user._id.toString(),
      summary: `Updated ${user.email} role/status`,
      before,
      after: user.toObject()
    });

    return Response.json({ ok: true, user: toSerializable(user.toObject()) });
  } catch (error) {
    return routeError("admin:users:update", error);
  }
}
