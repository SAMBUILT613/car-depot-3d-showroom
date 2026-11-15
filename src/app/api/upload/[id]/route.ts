import { NextResponse } from "next/server";
import { ensureCurrentUser, isAuthFailure } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteR2Object } from "@/lib/media/storage";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await ensureCurrentUser();
    const { id } = await params;
    const media = await prisma.listingMedia.findFirst({
      where: { id, uploaderUserId: user.id, listingId: null, status: "PENDING_REVIEW", deletedAt: null },
      select: { id: true, bucketName: true, objectKey: true },
    });
    if (!media) return NextResponse.json({ ok: false, error: "Pending image not found or no longer removable." }, { status: 404 });

    // Mark first; if storage deletion fails the private object can be removed by cleanup.
    await prisma.listingMedia.update({ where: { id: media.id }, data: { status: "DELETED", deletedAt: new Date() } });
    try {
      await deleteR2Object(media.bucketName, media.objectKey);
    } catch (error) {
      console.error("Pending R2 cleanup failed", error instanceof Error ? error.name : "UnknownError");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Pending media removal failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The pending image could not be removed." }, { status: 500 });
  }
}
