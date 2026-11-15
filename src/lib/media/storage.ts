import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";
import { detectImage, getImageDimensions, stripImageMetadata } from "@/lib/media/image";

export const MAX_LISTING_IMAGE_BYTES = 5 * 1024 * 1024;

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

export class MediaStorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaStorageConfigurationError";
  }
}
const MAX_IMAGE_DIMENSION = 12_000;
const MAX_IMAGE_PIXELS = 40_000_000;

export function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) throw new MediaStorageConfigurationError("R2 media storage is not configured.");
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function uploadPendingListingImage(input: { file: File; userId: string; altText?: string }) {
  const privateBucket = process.env.R2_BUCKET_NAME?.trim();
  const publicBucket = process.env.R2_PUBLIC_BUCKET_NAME?.trim();
  if (!privateBucket) throw new MediaStorageConfigurationError("The private R2 bucket is not configured.");
  if (publicBucket && publicBucket === privateBucket) {
    throw new MediaStorageConfigurationError("Private pending media and public approved media must use separate R2 buckets.");
  }
  if (input.file.size < 1 || input.file.size > MAX_LISTING_IMAGE_BYTES) {
    throw new MediaValidationError("Images must be between 1 byte and 5 MB.");
  }

  const original = Buffer.from(await input.file.arrayBuffer());
  const detected = detectImage(original);
  if (!detected || detected.mimeType !== input.file.type) {
    throw new MediaValidationError("The uploaded file does not match a supported JPEG, PNG or WebP image.");
  }
  const dimensions = getImageDimensions(original, detected);
  if (!dimensions || !dimensions.width || !dimensions.height
    || dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION
    || dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
    throw new MediaValidationError("Image dimensions are invalid or exceed the allowed limit.");
  }
  let sanitized: Buffer;
  try {
    sanitized = stripImageMetadata(original, detected);
  } catch {
    throw new MediaValidationError("The image file is incomplete or invalid.");
  }
  const mediaId = randomUUID();
  const objectKey = `pending/${input.userId}/${mediaId}.${detected.extension}`;
  const client = getR2Client();

  await client.send(new PutObjectCommand({
    Bucket: privateBucket,
    Key: objectKey,
    Body: sanitized,
    ContentType: detected.mimeType,
    CacheControl: "private, no-store",
    Metadata: { "enes-media-id": mediaId },
  }));

  try {
    const media = await prisma.listingMedia.create({
      data: {
        id: mediaId,
        uploaderUserId: input.userId,
        objectKey,
        bucketName: privateBucket,
        originalName: input.file.name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 180),
        mimeType: detected.mimeType,
        byteSize: sanitized.byteLength,
        width: dimensions.width,
        height: dimensions.height,
        altText: input.altText?.slice(0, 180) || null,
        status: "PENDING_REVIEW",
      },
    });
    return { id: media.id, width: dimensions.width, height: dimensions.height, mimeType: detected.mimeType };
  } catch (error) {
    await client.send(new DeleteObjectCommand({ Bucket: privateBucket, Key: objectKey })).catch(() => undefined);
    throw error;
  }
}

export async function attachPendingMediaToListing(
  input: { listingId: string; userId: string; mediaIds: string[] },
  tx: Prisma.TransactionClient = prisma,
) {
  const ids = [...new Set(input.mediaIds)].slice(0, 10);
  if (!ids.length) return [];
  const media = await tx.listingMedia.findMany({
    where: { id: { in: ids }, uploaderUserId: input.userId, listingId: null, status: "PENDING_REVIEW", deletedAt: null },
  });
  if (media.length !== ids.length) throw new Error("One or more uploaded images are invalid or no longer available.");
  const updated = await tx.listingMedia.updateMany({
    where: { id: { in: ids }, uploaderUserId: input.userId, listingId: null, status: "PENDING_REVIEW" },
    data: { listingId: input.listingId },
  });
  if (updated.count !== ids.length) throw new Error("One or more uploaded images could not be attached to the listing.");
  return media;
}

export async function deleteR2Object(bucket: string, key: string) {
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
