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
export type QuizOptionKey = "A" | "B" | "C" | "D";
export type NoteDetailLevel = "quick" | "standard" | "detailed";
export type NoteStyle = "minimal" | "classic" | "topper";
export type PlannerTaskType = "study" | "revision" | "practice" | "break";
export type FlashcardDifficulty = DifficultyLevel;
export type SimplifyLevel = "phd" | "professor" | "teacher" | "student" | "child";
export type RevisionSourceType = "note" | "flashcard" | "quiz" | "manual";
export type ConceptSourceType = "note" | "quiz" | "doubt" | "flashcard";
export type ScanErrorType = "factual" | "calculation" | "misconception";
export type MistakeType = "misconception" | "silly_error" | "knowledge_gap" | "guessed" | "time_pressure";
export type StudyForecast = "light" | "moderate" | "heavy";
export type ExamQuestionType = "mcq" | "short" | "long" | "numerical";
export type StudyRoomTimerAction = "start" | "pause" | "reset";
export type StudyRoomQuizStatus = "waiting" | "live" | "complete";
export type FormulaQuizCount = 5 | 10 | 15 | 20;

export type LegacyAchievementType =
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

export type AchievementType =
  | LegacyAchievementType
  | "note_10"
  | "note_50"
  | "quiz_perfect"
  | "quiz_10"
  | "night_owl"
  | "early_bird"
  | "speed_note"
  | "feynman_5"
  | "scan_first"
  | "formula_20"
  | "focus_60"
  | "group_host"
  | "all_features"
  | "level_scholar"
  | "level_genius";

export interface DoubtMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  inputMode?: "text" | "voice";
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
  cachedAt?: string | null;
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
  type: PlannerTaskType;
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
  cachedAt?: string | null;
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
  correct: QuizOptionKey;
  explanation: string;
}

export interface QuizSubmittedAnswer {
  questionIndex: number;
  selectedOption: QuizOptionKey | null;
  selectedText: string;
  isCorrect: boolean;
}

export type QuizSubmissionAnswer = QuizSubmittedAnswer;

export interface QuizAutopsyMistake {
  questionIndex: number;
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  mistakeType: MistakeType;
  explanation: string;
}

export interface QuizAutopsyWeakTopic {
  topic: string;
  reason: string;
  revisionLink: string;
}

export interface QuizAutopsyRadarPoint {
  subject: string;
  score: number;
}

export interface QuizAutopsy {
  mistakeBreakdown: QuizAutopsyMistake[];
  weakTopics: QuizAutopsyWeakTopic[];
  strengthTopics: string[];
  overallPattern: string;
  radarData: QuizAutopsyRadarPoint[];
  generatedAt: string;
}

export interface FlashCard {
  front: string;
  back: string;
  difficulty: DifficultyLevel;
}

export interface FlashcardDeckSummary {
  _id: string;
  topic: string;
  subject: string;
  cards: FlashCard[];
  createdAt: string;
  cachedAt?: string | null;
}

export interface AchievementDefinition {
  id: AchievementType;
  name: string;
  icon: string;
  desc: string;
  color: string;
  xp: number;
}

export interface GamificationEvent {
  xpGained: number;
  levelUp: {
    happened: boolean;
    from: number;
    to: number;
  };
  newAchievements: Array<{
    type: AchievementType;
    title: string;
    description: string;
    icon?: string;
    color?: string;
    xp?: number;
  }>;
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
  totalXP?: number;
  level: number;
  levelName?: string;
  levelIcon?: string;
  xpToNextLevel?: number | null;
  progressToNextLevel?: number;
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

export interface FocusSuggestion {
  nextTopic: string;
  reason: string;
}

export interface FocusSessionPayload {
  subject: string;
  topic: string;
  duration: number;
  wasCompleted: boolean;
  soundUsed: string;
}

export interface FocusCompletionResponse {
  streak: number;
  message: string;
  nextTopicSuggestion: FocusSuggestion;
  events?: GamificationEvent;
}

export interface ScanConcept {
  name: string;
  explanation: string;
}

export interface ScanError {
  originalText: string;
  correction: string;
  type: ScanErrorType;
}

export interface ScanAnalysisResponse {
  _id?: string;
  imageUrl?: string;
  transcription: string;
  subject: string;
  topic: string;
  summary: string;
  concepts: ScanConcept[];
  errors: ScanError[];
  convertedNoteId?: string | null;
  createdAt?: string;
}

export interface ConceptRelation {
  conceptName: string;
  relationship: string;
}

export interface KnowledgeGraphNodeData {
  label: string;
  subject: string;
  confidence: number;
  source: ConceptSourceType;
  sourceId?: string;
  sourceTitle?: string;
  lastEncountered?: string;
}

export interface KnowledgeGraphNode {
  id: string;
  data: KnowledgeGraphNodeData;
  position: {
    x: number;
    y: number;
  };
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  animated?: boolean;
}

export interface KnowledgeGraphPayload {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  total: number;
  truncated: boolean;
}

export interface FormulaEntry {
  _id: string;
  formulaText: string;
  formulaName: string;
  chapter: string;
  sourceNoteId?: string | null;
  sourceNoteTitle?: string | null;
  addedAt: string;
  isManual: boolean;
  sourceNoteExists?: boolean;
}

export interface FormulaSheetSummary {
  _id: string;
  subject: string;
  formulas: FormulaEntry[];
  updatedAt: string;
}

export interface QuickQuizPayload {
  questions: QuizQuestion[];
}

export interface ExamSummary {
  _id: string;
  subject: string;
  examName: string;
  examDate: string;
  board?: string | null;
  syllabus: string[];
  readiness: number;
  daysUntil: number;
  isPast: boolean;
}

export interface PanicPlanSession {
  time: "morning" | "afternoon" | "evening";
  topic: string;
  technique: string;
  duration: number;
}

export interface PanicPlanDay {
  date: string;
  sessions: PanicPlanSession[];
}

export interface PanicPlanPayload {
  plan: PanicPlanDay[];
}

export interface TeachMeMisconception {
  text: string;
  correction: string;
}

export interface TeachMeEvaluation {
  understandingScore: number;
  correctPoints: string[];
  missedPoints: string[];
  misconceptions: TeachMeMisconception[];
  aiSimplifiedExplanation: string;
  encouragement: string;
  previousScore?: number | null;
  improvementDelta?: number | null;
}

export interface TeachMeHistoryItem extends TeachMeEvaluation {
  _id: string;
  topic: string;
  subject: string;
  studentExplanation: string;
  createdAt: string;
}

export interface RevisionItemSummary {
  _id: string;
  topic: string;
  subject: string;
  type: RevisionSourceType;
  sourceId?: string | null;
  sourceTitle: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewDate?: string | null;
  lastScore?: number | null;
  reviewPreview?: string | null;
}

export interface RevisionDuePayload {
  due: RevisionItemSummary[];
  upcoming: Array<{
    date: string;
    count: number;
    items: RevisionItemSummary[];
  }>;
}

export interface StudyRoomMember {
  userId: string;
  name: string;
  avatar: string;
  joinedAt: string;
  isHost?: boolean;
  online?: boolean;
}

export interface StudyRoomChatMessage {
  userId: string;
  name: string;
  avatar: string;
  content: string;
  timestamp: string;
  system?: boolean;
}

export interface StudyRoomTimerState {
  duration: number;
  startedAt?: string | null;
  paused: boolean;
}

export interface StudyRoomLeaderboardEntry {
  userId: string;
  name: string;
  avatar: string;
  score: number;
  answers: Array<{
    questionIndex: number;
    answer: QuizOptionKey;
    timeTaken: number;
    points: number;
    correct: boolean;
  }>;
  streak: number;
}

export interface StudyRoomPayload {
  _id: string;
  roomCode: string;
  hostUserId: string;
  members: StudyRoomMember[];
  subject: string;
  isActive: boolean;
  timerDuration: number;
  timerStartedAt?: string | null;
  timerPaused: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface EvaluationScorePart {
  obtained: number;
  max: number;
  comment?: string;
}

export interface EvaluationResult {
  _id?: string;
  subject: string;
  question: string;
  studentAnswer: string;
  wordCount: number;
  maxMarks: number;
  examBoard: string;
  scores: {
    content: EvaluationScorePart;
    structure: EvaluationScorePart;
    language: EvaluationScorePart;
    examples: EvaluationScorePart;
    conclusion: EvaluationScorePart;
  };
  totalObtained: number;
  totalMax: number;
  grade: string;
  feedback: string[];
  overallComment?: string;
  improvedAnswer?: string | null;
  createdAt?: string;
}

export interface DailyBriefPayload {
  greeting: string;
  profile: {
    firstName: string;
  };
  dateLabel: string;
  quote: {
    text: string;
    author: string;
  };
  todayPlan: StudyTask[];
  exams: ExamSummary[];
  yesterdayProgress: {
    quizScore?: number | null;
    studyMinutes?: number | null;
  } | null;
  weakestTopic: {
    topic: string;
    subject: string;
  } | null;
  revisionDue: number;
  studyForecast: StudyForecast;
  isNewUser: boolean;
}

export interface SimplifyResponse {
  simplifiedText: string;
  level: SimplifyLevel;
  wordCount: number;
}

export interface AchievementRecord {
  _id?: string;
  userId?: string;
  achievementId?: AchievementType;
  type?: AchievementType;
  title: string;
  description: string;
  unlockedAt: string;
  icon?: string;
  color?: string;
  xp?: number;
}

export interface AchievementProgress {
  currentXp: number;
  currentLevel: number;
  nextLevelXp: number | null;
  levelName: string;
  levelIcon: string;
  progressToNextLevel: number;
}

export interface PastPaperQuestion {
  questionText: string;
  topic: string;
  difficulty: DifficultyLevel;
  marks: number;
  questionType: ExamQuestionType;
}

export interface TopicFrequencyPoint {
  topic: string;
  count: number;
  percentage: number;
}

export interface PredictedTopic {
  topic: string;
  confidence: number;
  reason: string;
}

export interface PracticeQuestion {
  question: string;
  modelAnswer: string;
  marks: number;
  topic: string;
}

export interface PastPaperAnalysis {
  _id?: string;
  fileName: string;
  subject: string;
  year: number;
  examBoard: string;
  imageUrl?: string | null;
  questions: PastPaperQuestion[];
  topicFrequency: TopicFrequencyPoint[];
  predictedTopics: PredictedTopic[];
  practiceQuestions: PracticeQuestion[];
  examInsights?: {
    totalQuestions: number;
    totalMarks: number;
    difficultyBreakdown: Record<DifficultyLevel, number>;
    mostTestedTopic: string;
    leastTestedTopic: string;
  };
  createdAt?: string;
}

export interface LevelDefinition {
  minXp: number;
  maxXp: number | null;
  level: number;
  name: "Novice" | "Scholar" | "Genius" | "Legend";
  icon: "🌱" | "📖" | "💡" | "👑";
}

export interface CachedEnvelope<T> {
  cachedAt: string;
  data: T;
}
