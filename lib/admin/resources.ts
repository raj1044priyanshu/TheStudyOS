import { AchievementModel } from "@/models/Achievement";
import { AppErrorLogModel } from "@/models/AppErrorLog";
import { AppSettingsModel } from "@/models/AppSettings";
import { AdminAuditLogModel } from "@/models/AdminAuditLog";
import { ConceptNodeModel } from "@/models/ConceptNode";
import { DoubtsSessionModel } from "@/models/DoubtsSession";
import { EvaluationModel } from "@/models/Evaluation";
import { ExamModel } from "@/models/Exam";
import { FeedbackModel } from "@/models/Feedback";
import { FlashcardModel } from "@/models/Flashcard";
import { FocusSessionModel } from "@/models/FocusSession";
import { FormulaSheetModel } from "@/models/FormulaSheet";
import { NoteModel } from "@/models/Note";
import { NotificationModel } from "@/models/Notification";
import { PastPaperModel } from "@/models/PastPaper";
import { PlannerCheckpointModel } from "@/models/PlannerCheckpoint";
import { ProgressModel } from "@/models/Progress";
import { QuizModel } from "@/models/Quiz";
import { RevisionItemModel } from "@/models/RevisionItem";
import { ScanResultModel } from "@/models/ScanResult";
import { StudyPlanModel } from "@/models/StudyPlan";
import { StudyRoomModel } from "@/models/StudyRoom";
import { StudySessionModel } from "@/models/StudySession";
import { TeachMeSessionModel } from "@/models/TeachMeSession";
import { UserModel } from "@/models/User";

export const ADMIN_RESOURCE_CONFIG = {
  users: {
    label: "Users",
    model: UserModel,
    searchFields: ["name", "email"],
    sort: { updatedAt: -1 as const }
  },
  notes: {
    label: "Notes",
    model: NoteModel,
    searchFields: ["title", "subject", "topic", "tags"],
    sort: { createdAt: -1 as const },
    supportsUserFilter: true
  },
  quizzes: {
    label: "Quizzes",
    model: QuizModel,
    searchFields: ["topic", "subject"],
    sort: { createdAt: -1 as const },
    supportsUserFilter: true
  },
  studyPlans: {
    label: "Study Plans",
    model: StudyPlanModel,
    searchFields: ["name"],
    sort: { createdAt: -1 as const },
    supportsUserFilter: true
  },
  exams: {
    label: "Exams",
    model: ExamModel,
    searchFields: ["subject", "examName", "board"],
    sort: { examDate: 1 as const },
    supportsUserFilter: true
  },
  flashcards: {
    label: "Flashcards",
    model: FlashcardModel,
    searchFields: ["topic", "subject"],
    sort: { createdAt: -1 as const },
    supportsUserFilter: true
  },
  revisionItems: {
    label: "Revision Items",
    model: RevisionItemModel,
    searchFields: ["topic", "subject", "sourceTitle"],
    sort: { nextReviewDate: 1 as const },
    supportsUserFilter: true
  },
  progress: {
    label: "Progress",
    model: ProgressModel,
    searchFields: ["subjectStudied"],
    sort: { date: -1 as const },
    supportsUserFilter: true
  },
  achievements: {
    label: "Achievements",
    model: AchievementModel,
    searchFields: ["title", "description", "type", "achievementId"],
    sort: { unlockedAt: -1 as const },
    supportsUserFilter: true
  },
  notifications: {
    label: "Notifications",
    model: NotificationModel,
    searchFields: ["title", "message", "type"],
    sort: { createdAt: -1 as const },
    supportsUserFilter: true
  },
  studyRooms: {
    label: "Study Rooms",
    model: StudyRoomModel,
    searchFields: ["roomCode", "subject"],
    sort: { createdAt: -1 as const }
  },
  focusSessions: {
    label: "Focus Sessions",
    model: FocusSessionModel,
    searchFields: ["subject", "topic", "soundUsed"],
    sort: { completedAt: -1 as const },
    supportsUserFilter: true
  },
  studySessions: {
    label: "Study Sessions",
    model: StudySessionModel,
    searchFields: ["dayKey", "timezone"],
    sort: { lastTrackedAt: -1 as const },
    supportsUserFilter: true
  },
  scanResults: {
    label: "Scan Results",
    model: ScanResultModel,
    searchFields: ["subject", "topic", "summary", "explanation"],
    sort: { createdAt: -1 as const },
    supportsUserFilter: true
  },
  pastPapers: {
    label: "Past Papers",
    model: PastPaperModel,
    searchFields: ["fileName", "subject", "examBoard"],
    sort: { createdAt: -1 as const },
    supportsUserFilter: true
  },
  doubtsSessions: {
    label: "Doubts Sessions",
    model: DoubtsSessionModel,
    searchFields: ["subject"],
    sort: { createdAt: -1 as const },
    supportsUserFilter: true
  },
  teachMeSessions: {
    label: "Teach Me Sessions",
    model: TeachMeSessionModel,
    searchFields: ["subject", "topic"],
    sort: { createdAt: -1 as const },
    supportsUserFilter: true
  },
  evaluations: {
    label: "Evaluations",
    model: EvaluationModel,
    searchFields: ["subject", "question", "examBoard", "grade"],
    sort: { createdAt: -1 as const },
    supportsUserFilter: true
  },
  formulaSheets: {
    label: "Formula Sheets",
    model: FormulaSheetModel,
    searchFields: ["subject"],
    sort: { updatedAt: -1 as const },
    supportsUserFilter: true
  },
  conceptNodes: {
    label: "Concept Nodes",
    model: ConceptNodeModel,
    searchFields: ["conceptName", "subject", "sourceTitle"],
    sort: { lastEncountered: -1 as const },
    supportsUserFilter: true
  },
  plannerCheckpoints: {
    label: "Planner Checkpoints",
    model: PlannerCheckpointModel,
    searchFields: ["subject", "chapter", "examName", "board"],
    sort: { updatedAt: -1 as const },
    supportsUserFilter: true
  },
  feedback: {
    label: "Feedback",
    model: FeedbackModel,
    searchFields: ["message", "name", "email", "pageUrl", "category"],
    sort: { createdAt: -1 as const },
    supportsUserFilter: true
  },
  errorLogs: {
    label: "Error Logs",
    model: AppErrorLogModel,
    searchFields: ["message", "route", "url", "fingerprint", "userEmail"],
    sort: { lastSeenAt: -1 as const }
  },
  adminAudit: {
    label: "Admin Audit",
    model: AdminAuditLogModel,
    searchFields: ["action", "targetModel", "targetId", "summary"],
    sort: { createdAt: -1 as const }
  },
  appSettings: {
    label: "App Settings",
    model: AppSettingsModel,
    searchFields: ["key", "landing.heroTitle", "landing.platformTitle"],
    sort: { updatedAt: -1 as const }
  }
} as const;

export type AdminResourceKey = keyof typeof ADMIN_RESOURCE_CONFIG;

export function isAdminResourceKey(resource: string): resource is AdminResourceKey {
  return resource in ADMIN_RESOURCE_CONFIG;
}

export function getAdminResourceConfig(resource: string) {
  return isAdminResourceKey(resource) ? ADMIN_RESOURCE_CONFIG[resource] : null;
}

export const ADMIN_RESOURCE_OPTIONS = Object.entries(ADMIN_RESOURCE_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
  supportsUserFilter: Boolean("supportsUserFilter" in config && config.supportsUserFilter)
}));
