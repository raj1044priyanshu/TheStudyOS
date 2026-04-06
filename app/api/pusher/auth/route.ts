import { z } from "zod";
import { NextResponse } from "next/server";
import { buildValidationErrorResponse, requireRateLimitedUser, routeError } from "@/lib/api";
import { isPusherConfigured, pusherServer } from "@/lib/pusher";

const channelAuthSchema = z.object({
  socketId: z.string().trim().min(1).max(200),
  channelName: z.string().trim().regex(/^presence-room-[A-Z0-9]{6}$/)
});

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
    const authResult = await requireRateLimitedUser(request, {
      policy: "realtimeAuth",
      key: "pusher-auth"
    });
    if (authResult.error) return authResult.error;

    if (!isPusherConfigured() || !pusherServer) {
      return NextResponse.json({ error: "Study room is unavailable until Pusher is configured." }, { status: 503 });
    }

    const parsedPayload = channelAuthSchema.safeParse(await parseChannelAuthorizationPayload(request));
    if (!parsedPayload.success) {
      return buildValidationErrorResponse(parsedPayload.error);
    }
    const { socketId, channelName } = parsedPayload.data;

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
