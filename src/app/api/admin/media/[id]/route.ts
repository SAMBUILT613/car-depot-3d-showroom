import { NextRequest, NextResponse } from "next/server";
import { CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { requireAdminPermission, isAuthFailure, writeAuditLog } from "@/lib/auth";
import { getR2Client } from "@/lib/media/storage";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const conflict = (message: string) =>
  NextResponse.json({ ok: false, error: message }, { status: 409 });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let copiedPublicObject: { bucket: string; key: string } | null = null;

  try {
    const body = await request.json().catch(() => null);
    const action = body?.action;
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ ok: false, error: "Action must be approve or reject." }, { status: 400 });
    }

    const actor = await requireAdminPermission(action === "approve" ? "media:approve" : "media:reject");
    const { id } = await params;
    const media = await prisma.listingMedia.findUnique({ where: { id } });

    if (!media || !media.listingId || media.deletedAt) {
      return NextResponse.json({ ok: false, error: "Pending listing media was not found." }, { status: 404 });
    }
    if (media.status !== "PENDING_REVIEW") {
      return conflict("This image has already been reviewed.");
    }

    if (action === "reject") {
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (reason.length < 5 || reason.length > 1000) {
        return NextResponse.json({ ok: false, error: "Provide a rejection reason between 5 and 1,000 characters." }, { status: 400 });
      }

      // Compare-and-set: only one moderator can transition a pending record.
      const changed = await prisma.listingMedia.updateMany({
        where: {
          id, status: "PENDING_REVIEW", deletedAt: null,
          bucketName: media.bucketName, objectKey: media.objectKey,
        },
        data: {
          status: "REJECTED", reviewedByAdminId: actor.adminUserId,
          reviewedAt: new Date(), rejectionReason: reason,
        },
      });
      if (changed.count !== 1) return conflict("Another administrator has already reviewed this image.");

      try {
        const client = getR2Client();
        await client.send(new DeleteObjectCommand({ Bucket: media.bucketName, Key: media.objectKey }));
      } catch (error) {
        console.error("Rejected media cleanup failed", error instanceof Error ? error.name : "UnknownError");
      }

      await writeAuditLog(actor, {
        action: "MEDIA_REJECTED", entityType: "ListingMedia", entityId: id,
        before: { status: media.status }, after: { status: "REJECTED" },
        metadata: { listingId: media.listingId, reason },
      });
      return NextResponse.json({ ok: true, status: "REJECTED" });
    }

    const privateBucket = process.env.R2_BUCKET_NAME?.trim();
    const publicBucket = process.env.R2_PUBLIC_BUCKET_NAME?.trim();
    const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
    if (!privateBucket || !publicBucket || publicBucket === privateBucket || !publicBase) {
      return NextResponse.json({
        ok: false,
        error: "Configure separate private and public R2 buckets and the approved-media delivery URL before approving images.",
      }, { status: 503 });
    }
    if (media.bucketName !== privateBucket || !media.objectKey.startsWith("pending/")) {
      return conflict("The source image is not in the private pending-media area.");
    }

    const extension = media.mimeType === "image/png" ? "png" : media.mimeType === "image/webp" ? "webp" : "jpg";
    const newKey = `approved/listings/${media.listingId}/${media.id}.${extension}`;
    const client = getR2Client();

    await client.send(new HeadObjectCommand({ Bucket: privateBucket, Key: media.objectKey }));
    await client.send(new CopyObjectCommand({
      Bucket: publicBucket,
      Key: newKey,
      CopySource: `${privateBucket}/${media.objectKey.split("/").map(encodeURIComponent).join("/")}`,
      ContentType: media.mimeType,
      MetadataDirective: "REPLACE",
      Metadata: { "enes-media-id": media.id },
      CacheControl: "public, max-age=31536000, immutable",
    }));
    copiedPublicObject = { bucket: publicBucket, key: newKey };

    // Compare-and-set after the copy. Concurrent approval requests use the same
    // immutable destination key; a losing approval must not delete the winner's copy.
    const changed = await prisma.listingMedia.updateMany({
      where: {
        id, status: "PENDING_REVIEW", deletedAt: null,
        bucketName: privateBucket, objectKey: media.objectKey,
      },
      data: {
        bucketName: publicBucket,
        objectKey: newKey,
        publicUrl: `${publicBase}/${newKey}`,
        status: "APPROVED",
        reviewedByAdminId: actor.adminUserId,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });

    if (changed.count !== 1) {
      // If another approval won, its record points at this same destination.
      const latest = await prisma.listingMedia.findUnique({
        where: { id }, select: { status: true, bucketName: true, objectKey: true },
      });
      if (!(latest?.status === "APPROVED" && latest.bucketName === publicBucket && latest.objectKey === newKey)) {
        await client.send(new DeleteObjectCommand({ Bucket: publicBucket, Key: newKey })).catch(() => undefined);
      }
      copiedPublicObject = null;
      return conflict("Another administrator has already reviewed this image.");
    }

    // The private source is removed only after the public copy and DB transition succeed.
    await client.send(new DeleteObjectCommand({ Bucket: privateBucket, Key: media.objectKey })).catch((error) => {
      console.error("Approved media pending-copy cleanup failed", error instanceof Error ? error.name : "UnknownError");
    });
    copiedPublicObject = null;

    await writeAuditLog(actor, {
      action: "MEDIA_APPROVED", entityType: "ListingMedia", entityId: id,
      before: { status: media.status, bucketName: media.bucketName, objectKey: media.objectKey },
      after: { status: "APPROVED", bucketName: publicBucket, objectKey: newKey },
      metadata: { listingId: media.listingId },
    });
    return NextResponse.json({ ok: true, status: "APPROVED" });
  } catch (error) {
    if (copiedPublicObject) {
      try {
        const { id } = await params;
        const latest = await prisma.listingMedia.findUnique({
          where: { id }, select: { status: true, bucketName: true, objectKey: true },
        });
        const isCommitted = latest?.status === "APPROVED"
          && latest.bucketName === copiedPublicObject.bucket
          && latest.objectKey === copiedPublicObject.key;
        if (!isCommitted) {
          await getR2Client().send(new DeleteObjectCommand({
            Bucket: copiedPublicObject.bucket, Key: copiedPublicObject.key,
          }));
        }
      } catch {
        // Prefer a possible orphan over deleting an object that may have committed.
        console.error("Approved-media cleanup requires manual review");
      }
    }
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error("Media moderation failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The media moderation action could not be completed." }, { status: 500 });
  }
}
