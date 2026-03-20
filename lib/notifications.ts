import { NotificationModel } from "@/models/Notification";

type NotificationType = "welcome" | "achievement" | "reminder" | "weekly_summary" | "system";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
  await NotificationModel.create({
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    actionUrl: input.actionUrl ?? null,
    read: false
  });
}

export async function createAchievementNotifications(
  userId: string,
  achievements: Array<{ title: string; description: string }>
) {
  if (!achievements.length) return;

  await NotificationModel.insertMany(
    achievements.map((achievement) => ({
      userId,
      type: "achievement",
      title: `Achievement unlocked: ${achievement.title}`,
      message: achievement.description,
      actionUrl: "/progress",
      read: false
    }))
  );
}

export async function createWelcomeNotification(userId: string) {
  await createNotification({
    userId,
    type: "welcome",
    title: "Welcome to StudyOS",
    message: "Your workspace is ready. Open the welcome flow and start your first guided study session.",
    actionUrl: "/welcome"
  });
}
