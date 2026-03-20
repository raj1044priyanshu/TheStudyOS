import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, applyRouteRateLimit } from "@/lib/api";
import { NotificationModel } from "@/models/Notification";

export async function GET() {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`notifications:${authResult.userId}`);
  if (rate) return rate;

  await connectToDatabase();
  const [notifications, unreadCount] = await Promise.all([
    NotificationModel.find({ userId: authResult.userId }).sort({ createdAt: -1 }).limit(20).lean(),
    NotificationModel.countDocuments({ userId: authResult.userId, read: false })
  ]);

  return NextResponse.json({
    notifications: notifications.map((notification) => ({
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl ?? null,
      read: notification.read,
      createdAt: notification.createdAt ? new Date(notification.createdAt).toISOString() : new Date().toISOString()
    })),
    unreadCount
  });
}

export async function PATCH(request: Request) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`notifications:${authResult.userId}`);
  if (rate) return rate;

  const body = (await request.json().catch(() => ({}))) as { id?: string };

  await connectToDatabase();

  if (body.id) {
    await NotificationModel.updateOne({ _id: body.id, userId: authResult.userId }, { $set: { read: true } });
  } else {
    await NotificationModel.updateMany({ userId: authResult.userId, read: false }, { $set: { read: true } });
  }

  const unreadCount = await NotificationModel.countDocuments({ userId: authResult.userId, read: false });
  return NextResponse.json({ success: true, unreadCount });
}
