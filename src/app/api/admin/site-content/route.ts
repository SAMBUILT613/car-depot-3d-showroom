import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAdminPermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAdminSiteContentRecord, parseSiteContent } from "@/lib/site-content";
import { isTrustedMutationOrigin } from "@/lib/security/origin";
import { safeRouteError } from "@/lib/security/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdminPermission("content:manage");
    const record = await getAdminSiteContentRecord();
    return NextResponse.json({
      ok: true,
      draft: record.draft,
      draftVersion: record.draftVersion,
      publishedVersion: record.publishedVersion,
      publishedAt: record.publishedAt,
      revisions: record.revisions,
    }, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (error) { return safeRouteError(error); }
}

export async function PUT(request: Request) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Request origin rejected" }, { status: 403 });
  }
  try {
    const actor = await requireAdminPermission("content:manage");
    const raw = await request.text();
    if (raw.length > 190_000) return NextResponse.json({ ok: false, error: "The content document is too large" }, { status: 413 });
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON document" }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
    const input = body as Record<string, unknown>;
    if (!Number.isSafeInteger(input.expectedDraftVersion) || Number(input.expectedDraftVersion) < 0) {
      return NextResponse.json({ ok: false, error: "A valid draft version is required. Refresh the editor and try again." }, { status: 400 });
    }
    let draft;
    try { draft = parseSiteContent(input.draft); }
    catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Invalid site content" }, { status: 422 }); }

    const current = await getAdminSiteContentRecord();
    if (current.draftVersion !== Number(input.expectedDraftVersion)) {
      return NextResponse.json({ ok: false, error: "This draft changed in another session. Refresh the editor before saving." }, { status: 409 });
    }
    const note = typeof input.note === "string" ? input.note.trim().slice(0, 240) : null;
    const nextVersion = current.draftVersion + 1;
    await prisma.$transaction(async (tx) => {
          const claimed = await tx.siteContent.updateMany({
            where: { key: "global", draftVersion: current.draftVersion },
            data: { draft: draft as Prisma.InputJsonValue, draftVersion: { increment: 1 }, updatedByClerkId: actor.clerkId },
          });
          if (claimed.count !== 1) throw new Error("ENES_CONTENT_CONFLICT");
          await tx.siteContentRevision.create({
            data: { siteContentKey: "global", version: nextVersion, content: draft as Prisma.InputJsonValue, createdByClerkId: actor.clerkId, note },
          });
          await tx.auditLog.create({
            data: { actorAdminId: actor.adminUserId, actorClerkId: actor.clerkId, action: "SITE_CONTENT_DRAFT_SAVED", entityType: "SiteContent", entityId: "global", metadata: { version: nextVersion } },
          });
    });
    const fresh = await getAdminSiteContentRecord();
    return NextResponse.json({ ok: true, draftVersion: fresh.draftVersion, publishedVersion: fresh.publishedVersion, publishedAt: fresh.publishedAt, revisions: fresh.revisions }, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (error) {
    if (error instanceof Error && error.message === "ENES_CONTENT_CONFLICT") {
      return NextResponse.json({ ok: false, error: "This draft changed in another session. Refresh the editor before saving." }, { status: 409 });
    }
    return safeRouteError(error);
  }
}
