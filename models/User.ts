import { Schema, model, models, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    image: { type: String, default: null },
    googleId: { type: String, default: null },
    streak: { type: Number, default: 0 },
    streakLastActivityAt: { type: Date, default: null },
    streakBreakPending: { type: Boolean, default: false },
    lastBrokenStreak: { type: Number, default: 0 },
    streakBrokenAt: { type: Date, default: null },
    lastStreakCelebrationMilestone: { type: Number, default: 0 },
    timezone: { type: String, default: "UTC" },
    lastStreakRiskReminderDay: { type: String, default: null },
    lastDailyReminderDay: { type: String, default: null },
    lastStreakBreakNoticeDay: { type: String, default: null },
    lastActive: { type: Date, default: Date.now },
    totalNotesGenerated: { type: Number, default: 0 },
    totalQuizzesTaken: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    lastLevelUpAt: { type: Date, default: null },
    onboardingCompleted: { type: Boolean, default: false },
    isTourShown: { type: Boolean, default: false },
    welcomeScreenSeen: { type: Boolean, default: false },
    notificationPreferences: {
      achievement: { type: Boolean, default: true },
      streakRisk: { type: Boolean, default: true },
      weeklySummary: { type: Boolean, default: true },
      dailyReminder: { type: Boolean, default: true }
    }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export type UserDocument = InferSchemaType<typeof UserSchema>;
export const UserModel = models.User || model("User", UserSchema);
