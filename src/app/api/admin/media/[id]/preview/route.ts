import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { isAuthFailure, requireAdminPermission } from "@/lib/auth";
import { getR2Client } from "@/lib/media/storage";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminPermission("media:view");
    const { id } = await params;
    const media = await prisma.listingMedia.findFirst({ where: { id, status: "PENDING_REVIEW", deletedAt: null }, select: { bucketName: true, objectKey: true, mimeType: true, byteSize: true } });
    if (!media || media.byteSize > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(media.mimeType)) {
      return NextResponse.json({ ok: false, error: "Pending image not found." }, { status: 404 });
    }
    if (media.bucketName !== process.env.R2_BUCKET_NAME || !media.objectKey.startsWith("pending/")) {
      return NextResponse.json({ ok: false, error: "Image is not stored in the private pending-media area." }, { status: 409 });
    }
    const result = await getR2Client().send(new GetObjectCommand({ Bucket: media.bucketName, Key: media.objectKey }));
    if (!result.Body) return NextResponse.json({ ok: false, error: "Image file is unavailable." }, { status: 404 });
    const bytes = await result.Body.transformToByteArray();
    if (bytes.byteLength > 5 * 1024 * 1024) return NextResponse.json({ ok: false, error: "Image exceeds the preview limit." }, { status: 413 });
    const responseBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(responseBuffer).set(bytes);
    return new Response(responseBuffer, { headers: {
      "Content-Type": media.mimeType,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
    } });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Private media preview failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The private image preview is unavailable." }, { status: 500 });
  }
}
