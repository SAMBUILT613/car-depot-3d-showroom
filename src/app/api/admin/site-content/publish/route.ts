import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { getAdminSiteContentRecord, parseSiteContent } from "@/lib/site-content";
import { isTrustedMutationOrigin } from "@/lib/security/origin";
import { safeRouteError } from "@/lib/security/http";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Request origin rejected" }, { status: 403 });
  }
  try {
    const actor = await requireOwner();
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON request" }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
    const expectedDraftVersion = (body as Record<string, unknown>).expectedDraftVersion;
    if (!Number.isSafeInteger(expectedDraftVersion) || Number(expectedDraftVersion) < 1) {
      return NextResponse.json({ ok: false, error: "Save a valid draft before publishing" }, { status: 400 });
    }

    const record = await getAdminSiteContentRecord();
    if (record.draftVersion !== Number(expectedDraftVersion)) {
      return NextResponse.json({ ok: false, error: "The draft changed. Refresh and review the latest version before publishing." }, { status: 409 });
    }
    if (record.publishedVersion >= Number(expectedDraftVersion)) {
      return NextResponse.json({ ok: false, error: "This version is already published. Save a new draft before publishing again." }, { status: 409 });
    }
    const content = parseSiteContent(record.draft);
    const publishedAt = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.siteContent.updateMany({
        where: { key: "global", draftVersion: Number(expectedDraftVersion), publishedVersion: { lt: Number(expectedDraftVersion) } },
        data: { published: content as Prisma.InputJsonValue, publishedVersion: Number(expectedDraftVersion), publishedAt, publishedByClerkId: actor.clerkId },
      });
      if (claimed.count !== 1) throw new Error("ENES_PUBLISH_CONFLICT");
      await tx.auditLog.create({
        data: { actorAdminId: actor.adminUserId, actorClerkId: actor.clerkId, action: "SITE_CONTENT_PUBLISHED", entityType: "SiteContent", entityId: "global", metadata: { version: Number(expectedDraftVersion) } },
      });
      return tx.siteContent.findUniqueOrThrow({ where: { key: "global" }, select: { publishedVersion: true, publishedAt: true } });
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, publishedVersion: result.publishedVersion, publishedAt: result.publishedAt }, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (error) {
    if (error instanceof Error && error.message === "ENES_PUBLISH_CONFLICT") {
      return NextResponse.json({ ok: false, error: "The draft changed during publication. Refresh and try again." }, { status: 409 });
    }
    return safeRouteError(error);
  }
}
