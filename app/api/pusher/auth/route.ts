import { NextResponse } from "next/server";
import { requireUser, routeError } from "@/lib/api";
import { isPusherConfigured, pusherServer } from "@/lib/pusher";

async function parseChannelAuthorizationPayload(request: Request) {
  const formRequest = request.clone();
  const form = await formRequest.formData().catch(() => null);
  const socketIdEntry = form?.get("socket_id");
  const channelNameEntry = form?.get("channel_name");
  const socketId = typeof socketIdEntry === "string" ? socketIdEntry.trim() : "";
  const channelName = typeof channelNameEntry === "string" ? channelNameEntry.trim() : "";

  if (socketId && channelName) {
    return { socketId, channelName };
  }

  const body = (await request.json().catch(() => null)) as { socket_id?: string; channel_name?: string } | null;

  return {
    socketId: body?.socket_id?.trim() ?? "",
    channelName: body?.channel_name?.trim() ?? ""
  };
}

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    if (!isPusherConfigured() || !pusherServer) {
      return NextResponse.json({ error: "Study room is unavailable until Pusher is configured." }, { status: 503 });
    }

    const { socketId, channelName } = await parseChannelAuthorizationPayload(request);
    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: "Missing channel authorization payload. Expected socket_id and channel_name." },
        { status: 400 }
      );
    }

    try {
      const auth = (pusherServer as unknown as {
        authorizeChannel: (
          currentSocketId: string,
          currentChannelName: string,
          data: { user_id: string; user_info: Record<string, string | null | undefined> }
        ) => unknown;
      }).authorizeChannel(socketId, channelName, {
        user_id: authResult.userId,
        user_info: {
          name: authResult.session.user?.name,
          avatar: authResult.session.user?.image
        }
      });

      return NextResponse.json(auth);
    } catch (error) {
      console.error("[pusher-auth:authorize]", error);
      return NextResponse.json(
        { error: "Pusher channel authorization failed. Verify the server app credentials and cluster." },
        { status: 502 }
      );
    }
  } catch (error) {
    return routeError("pusher-auth", error);
  }
}
