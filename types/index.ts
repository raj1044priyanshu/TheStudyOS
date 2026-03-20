export type SubjectOption =
  | "Mathematics"
  | "Physics"
  | "Chemistry"
  | "Biology"
  | "History"
  | "Geography"
  | "English"
  | "Computer Science"
  | "Economics"
  | "Other";

export type DifficultyLevel = "easy" | "medium" | "hard";
export type AchievementType =
  | "first_note"
  | "five_notes"
  | "ten_notes"
  | "twentyfive_notes"
  | "first_quiz"
  | "five_quizzes"
  | "ten_quizzes"
  | "quiz_master_80"
  | "quiz_master_90"
  | "first_plan"
  | "first_task_completed"
  | "ten_tasks_completed"
  | "fifty_tasks_completed"
  | "streak_3"
  | "streak_7"
  | "streak_14"
  | "streak_30"
  | "streak_60"
  | "streak_100"
  | "active_60_minutes"
  | "weekly_300_minutes"
  | "weekly_600_minutes"
  | "level_5"
  | "level_10"
  | "level_20";

export interface DoubtMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface NoteSummary {
  _id: string;
  title: string;
  subject: string;
  topic: string;
  class: string;
  contentPreview: string;
  isFavorite: boolean;
  tags: string[];
  createdAt: string;
}

export interface NoteVisual {
  key: string;
  description: string;
  imageUrl: string;
  provider: string;
  model: string;
  generatedAt: string;
}

export interface StudyTask {
  subject: string;
  topic: string;
  duration: number;
  type: "study" | "revision" | "practice" | "break";
  completed?: boolean;
}

export interface StudyPlanDay {
  date: string;
  tasks: StudyTask[];
}

export interface PlannerSummary {
  _id: string;
  name: string;
  createdAt: string;
  startDate: string | null;
  examDate: string | null;
  hoursPerDay: number;
  subjects: {
    name: string;
    hoursPerDay: number;
    priority: number;
  }[];
  totalDays: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

export interface PlannerDetails extends PlannerSummary {
  generatedPlan: StudyPlanDay[];
}

export interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: "A" | "B" | "C" | "D";
  explanation: string;
}

export interface FlashCard {
  front: string;
  back: string;
  difficulty: DifficultyLevel;
}

export interface GamificationEvent {
  xpGained: number;
  levelUp: {
    happened: boolean;
    from: number;
    to: number;
  };
  newAchievements: {
    type: AchievementType;
    title: string;
    description: string;
  }[];
  streakUpdated: {
    previous: number;
    current: number;
  };
  streakBroken: {
    happened: boolean;
    previous: number;
    at: string | null;
  };
  streakMilestone: {
    happened: boolean;
    milestone: number | null;
  };
}

export interface UserStats {
  streak: number;
  xp: number;
  level: number;
  totalNotesGenerated: number;
  totalQuizzesTaken: number;
  averageQuizScore: number;
  studyMinutesWeek: number;
}

export interface ProgressChartPoint {
  date: string;
  score: number;
}

export interface SubjectBreakdownPoint {
  subject: string;
  minutes: number;
}

export interface HeatMapDay {
  date: string;
  value: number;
}

export interface MindMapNodeInput {
  id: string;
  label: string;
  level: number;
  parentId?: string;
}

export interface NotificationPreferences {
  achievement: boolean;
  streakRisk: boolean;
  weeklySummary: boolean;
  dailyReminder: boolean;
}
