import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser, isAuthFailure } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeConsumeRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const limit = await safeConsumeRateLimit({ request, route: "user-block", actorId: user.clerkId, limit: 20, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "Please try again later." }, { status: 429 });
    const body = await request.json().catch(() => null);
    if (typeof body?.blockedClerkId !== "string" || body.blockedClerkId.length > 80 || body.blockedClerkId === user.clerkId) {
      return NextResponse.json({ ok: false, error: "Choose a valid account to block." }, { status: 400 });
    }
    const target = await prisma.user.findUnique({ where: { clerkId: body.blockedClerkId }, select: { id: true, status: true } });
    if (!target || target.status !== "ACTIVE") return NextResponse.json({ ok: false, error: "Account not found." }, { status: 404 });
    await prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId: target.id } },
      create: { blockerId: user.id, blockedId: target.id },
      update: {},
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("User block action failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The account could not be blocked." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await ensureCurrentUser();
    const body = await request.json().catch(() => null);
    if (typeof body?.blockedClerkId !== "string" || body.blockedClerkId.length > 80) return NextResponse.json({ ok: false, error: "Choose a valid account." }, { status: 400 });
    const target = await prisma.user.findUnique({ where: { clerkId: body.blockedClerkId }, select: { id: true } });
    if (!target) return NextResponse.json({ ok: true });
    await prisma.userBlock.deleteMany({ where: { blockerId: user.id, blockedId: target.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: "The account could not be unblocked." }, { status: 500 });
  }
}
