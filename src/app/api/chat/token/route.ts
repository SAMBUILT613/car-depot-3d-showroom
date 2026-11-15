import { NextRequest, NextResponse } from "next/server";
import * as Ably from "ably";
import { ensureCurrentUser, isAuthFailure } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const conversationId = request.nextUrl.searchParams.get("conversationId");
    if (!conversationId || conversationId.length > 80) return NextResponse.json({ error: "Conversation is required." }, { status: 400 });
    if (!process.env.ABLY_API_KEY) return NextResponse.json({ error: "Realtime messaging is not configured." }, { status: 503 });

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: user.id } },
      select: { id: true },
    });
    if (!participant) return NextResponse.json({ error: "Conversation access denied." }, { status: 403 });

    const blocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blocker: { conversationMemberships: { some: { conversationId } } }, blockedId: user.id },
          { blockerId: user.id, blocked: { conversationMemberships: { some: { conversationId } } } },
        ],
      },
      select: { id: true },
    });
    if (blocked) return NextResponse.json({ error: "Realtime access is unavailable." }, { status: 403 });

    const realtime = new Ably.Rest({ key: process.env.ABLY_API_KEY });
    const channel = `conversation:${conversationId}`;
    const tokenRequest = await realtime.auth.createTokenRequest({
      clientId: user.clerkId,
      ttl: 10 * 60 * 1000,
      capability: JSON.stringify({ [channel]: ["subscribe"] }),
    });
    return NextResponse.json(tokenRequest);
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Ably token request failed", error);
    return NextResponse.json({ error: "Realtime access could not be prepared." }, { status: 503 });
  }
}
