export const dynamic = "force-dynamic";

import { z } from "zod";
import { NoteModel } from "@/models/Note";
import { QuizModel } from "@/models/Quiz";
import { StudyPlanModel } from "@/models/StudyPlan";
import { FeedbackModel } from "@/models/Feedback";
import { AppErrorLogModel } from "@/models/AppErrorLog";
import { UserModel } from "@/models/User";
import { createAdminAuditLog } from "@/lib/admin/audit";
import {
  buildValidationErrorResponse,
  objectIdRouteParamSchema,
  requireRateLimitedAdmin,
  routeError
} from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";

interface Context {
  params: { id: string };
}

const updateSchema = z
  .object({
    role: z.enum(["student", "tester", "admin"]).optional(),
    status: z.enum(["active", "suspended"]).optional()
  })
  .refine((payload) => payload.role || payload.status, {
    message: "No updates provided."
  });

export async function GET(request: Request, { params }: Context) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminRead",
      key: "admin-user-detail"
    });
    if (authResult.error) return authResult.error;

    const parsedId = objectIdRouteParamSchema.safeParse(params.id);
    if (!parsedId.success) {
      return buildValidationErrorResponse(parsedId.error);
    }

    await connectToDatabase();

    const [user, noteCount, quizCount, planCount, feedbackCount, errorCount] = await Promise.all([
      UserModel.findById(parsedId.data).lean(),
      NoteModel.countDocuments({ userId: parsedId.data }),
      QuizModel.countDocuments({ userId: parsedId.data }),
      StudyPlanModel.countDocuments({ userId: parsedId.data }),
      FeedbackModel.countDocuments({ userId: parsedId.data }),
      AppErrorLogModel.countDocuments({ affectedUserIds: parsedId.data })
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
        { label: "Notes", href: `/admin/resources?resource=notes&userId=${parsedId.data}` },
        { label: "Quizzes", href: `/admin/resources?resource=quizzes&userId=${parsedId.data}` },
        { label: "Plans", href: `/admin/resources?resource=studyPlans&userId=${parsedId.data}` },
        { label: "Feedback", href: `/admin/feedback?userId=${parsedId.data}` },
        { label: "Errors", href: `/admin/errors?userId=${parsedId.data}` }
      ]
    });
  } catch (error) {
    return routeError("admin:users:get", error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminWrite",
      key: "admin-user-update"
    });
    if (authResult.error) return authResult.error;

    const parsedId = objectIdRouteParamSchema.safeParse(params.id);
    if (!parsedId.success) {
      return buildValidationErrorResponse(parsedId.error);
    }

    const payload = updateSchema.safeParse(await request.json().catch(() => null));
    if (!payload.success) {
      return buildValidationErrorResponse(payload.error);
    }

    await connectToDatabase();
    const user = await UserModel.findById(parsedId.data);
    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const before = user.toObject();

    if (payload.data.role) {
      user.role = payload.data.role;
    }

    if (payload.data.status) {
      user.status = payload.data.status;
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
