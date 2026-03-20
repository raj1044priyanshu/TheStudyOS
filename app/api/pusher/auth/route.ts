import { NextResponse } from "next/server";
import { requireUser, routeError } from "@/lib/api";
import { isPusherConfigured, pusherServer } from "@/lib/pusher";

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    if (!isPusherConfigured() || !pusherServer) {
      return NextResponse.json({ error: "Study room is unavailable until Pusher is configured." }, { status: 503 });
    }

    const body = (await request.json().catch(() => ({}))) as { socket_id?: string; channel_name?: string };
    if (!body.socket_id || !body.channel_name) {
      return NextResponse.json({ error: "Missing socket or channel" }, { status: 400 });
    }

    const auth = (pusherServer as unknown as {
      authorizeChannel: (
        socketId: string,
        channelName: string,
        data: { user_id: string; user_info: Record<string, string | null | undefined> }
      ) => unknown;
    }).authorizeChannel(body.socket_id, body.channel_name, {
      user_id: authResult.userId,
      user_info: {
        name: authResult.session.user?.name,
        avatar: authResult.session.user?.image
      }
    });

    return NextResponse.json(auth);
  } catch (error) {
    return routeError("pusher-auth", error);
  }
}
