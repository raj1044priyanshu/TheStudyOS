export const dynamic = "force-dynamic";

import { getEmailConfigDiagnostics } from "@/lib/email";
import {
  normalizeBugFeedbackIssue,
  normalizeErrorLogIssue,
  RESOLVED_BUG_FEEDBACK_STATUS,
  RESOLVED_ERROR_STATUS,
  sortAdminIssuesByUpdatedAt,
  UNRESOLVED_BUG_FEEDBACK_STATUSES,
  UNRESOLVED_ERROR_STATUSES
} from "@/lib/admin/issues";
import { requireRateLimitedAdmin, routeError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toSerializable } from "@/lib/serialize";
import { AchievementModel } from "@/models/Achievement";
import { AppErrorLogModel } from "@/models/AppErrorLog";
import { AdminAuditLogModel } from "@/models/AdminAuditLog";
import { FeedbackModel } from "@/models/Feedback";
import { NoteModel } from "@/models/Note";
import { QuizModel } from "@/models/Quiz";
import { StudyPlanModel } from "@/models/StudyPlan";
import { UserModel } from "@/models/User";

export async function GET(request: Request) {
  try {
    const authResult = await requireRateLimitedAdmin(request, {
      policy: "adminRead",
      key: "admin-overview"
    });
    if (authResult.error) return authResult.error;

    await connectToDatabase();

    const [users, notes, quizzes, plans, achievements, feedback, openFeedback, errors, openErrors, recentFeedback, recentErrors, recentAudit, bugFeedbackCount, unresolvedBugFeedbackCount, resolvedBugFeedbackCount, unresolvedErrorCount, resolvedErrorCount, unresolvedErrorItems, unresolvedBugFeedbackItems] =
      await Promise.all([
        UserModel.countDocuments({}),
        NoteModel.countDocuments({}),
        QuizModel.countDocuments({}),
        StudyPlanModel.countDocuments({}),
        AchievementModel.countDocuments({}),
        FeedbackModel.countDocuments({}),
        FeedbackModel.countDocuments({ status: { $in: ["open", "in_review"] } }),
        AppErrorLogModel.countDocuments({}),
        AppErrorLogModel.countDocuments({ status: { $in: ["open", "acknowledged"] } }),
        FeedbackModel.find({})
          .sort({ createdAt: -1 })
          .limit(5)
          .select("category status priority message name email pageUrl createdAt")
          .lean(),
        AppErrorLogModel.find({})
          .sort({ lastSeenAt: -1 })
          .limit(5)
          .select("source severity status message route url occurrences lastSeenAt")
          .lean(),
        AdminAuditLogModel.find({})
          .sort({ createdAt: -1 })
          .limit(8)
          .select("action targetModel targetId summary createdAt")
          .lean(),
        FeedbackModel.countDocuments({ category: "bug" }),
        FeedbackModel.countDocuments({ category: "bug", status: { $in: UNRESOLVED_BUG_FEEDBACK_STATUSES } }),
        FeedbackModel.countDocuments({ category: "bug", status: RESOLVED_BUG_FEEDBACK_STATUS }),
        AppErrorLogModel.countDocuments({ status: { $in: UNRESOLVED_ERROR_STATUSES } }),
        AppErrorLogModel.countDocuments({ status: RESOLVED_ERROR_STATUS }),
        AppErrorLogModel.find({ status: { $in: UNRESOLVED_ERROR_STATUSES } })
          .sort({ lastSeenAt: -1 })
          .limit(8)
          .select("message status severity route url source userId userEmail lastSeenAt")
          .lean(),
        FeedbackModel.find({ category: "bug", status: { $in: UNRESOLVED_BUG_FEEDBACK_STATUSES } })
          .sort({ updatedAt: -1, createdAt: -1 })
          .limit(8)
          .select("message status priority pageUrl userId email updatedAt createdAt")
          .lean()
      ]);

    const emailDiagnostics = getEmailConfigDiagnostics();
    const activeBugs = sortAdminIssuesByUpdatedAt([
      ...unresolvedErrorItems.map((item) => normalizeErrorLogIssue(item)),
      ...unresolvedBugFeedbackItems.map((item) => normalizeBugFeedbackIssue(item))
    ]).slice(0, 8);
    const bugMetrics = {
      totalTrackedIssues: errors + bugFeedbackCount,
      unresolvedIssues: unresolvedErrorCount + unresolvedBugFeedbackCount,
      resolvedIssues: resolvedErrorCount + resolvedBugFeedbackCount,
      runtimeErrorCount: errors,
      bugFeedbackCount,
      unresolvedErrorCount,
      unresolvedBugFeedbackCount,
      resolvedErrorCount,
      resolvedBugFeedbackCount
    };

    return Response.json({
      metrics: {
        users,
        notes,
        quizzes,
        plans,
        achievements,
        feedback,
        openFeedback,
        errors,
        openErrors
      },
      bugMetrics,
      activeBugs: toSerializable(activeBugs),
      recentFeedback: toSerializable(recentFeedback),
      recentErrors: toSerializable(recentErrors),
      recentAudit: toSerializable(recentAudit),
      system: {
        emailConfigured: emailDiagnostics.ok,
        emailDiagnostics: emailDiagnostics.diagnostics
      }
    });
  } catch (error) {
    return routeError("admin:overview", error);
  }
}
