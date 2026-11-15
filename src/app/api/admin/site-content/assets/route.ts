import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { requireAdminPermission } from "@/lib/auth";
import { isTrustedMutationOrigin } from "@/lib/security/origin";
import { safeRouteError } from "@/lib/security/http";
import { getR2Client, MediaStorageConfigurationError } from "@/lib/media/storage";
import { detectImage, getImageDimensions, stripImageMetadata } from "@/lib/media/image";

export const runtime = "nodejs";
const MAX_SITE_ASSET_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 12_000;
const MAX_PIXELS = 40_000_000;

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Request origin rejected" }, { status: 403 });
  }
  try {
    await requireAdminPermission("content:manage");
    const bucket = process.env.R2_PUBLIC_BUCKET_NAME?.trim();
    const publicBase = process.env.R2_PUBLIC_URL?.trim();
    if (!bucket || !publicBase) throw new MediaStorageConfigurationError("Public site asset storage is not configured.");
    if (bucket === process.env.R2_BUCKET_NAME?.trim()) throw new MediaStorageConfigurationError("Site assets must use the approved public bucket, separate from pending listing media.");
    let baseUrl: URL;
    try { baseUrl = new URL(publicBase); } catch { throw new MediaStorageConfigurationError("Public site asset URL is invalid."); }
    if (baseUrl.protocol !== "https:") throw new MediaStorageConfigurationError("Public site assets require an HTTPS URL.");

    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_SITE_ASSET_BYTES + 512 * 1024) {
      return NextResponse.json({ ok: false, error: "The image upload is larger than the allowed request size." }, { status: 413 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Choose an image file first." }, { status: 400 });
    if (file.size < 1 || file.size > MAX_SITE_ASSET_BYTES) return NextResponse.json({ ok: false, error: "Images must be between 1 byte and 8 MB." }, { status: 422 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const detected = detectImage(bytes);
    if (!detected || detected.mimeType !== file.type) return NextResponse.json({ ok: false, error: "Use a valid JPEG, PNG or WebP image." }, { status: 422 });
    const dimensions = getImageDimensions(bytes, detected);
    if (!dimensions || !dimensions.width || !dimensions.height || dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION || dimensions.width * dimensions.height > MAX_PIXELS) {
      return NextResponse.json({ ok: false, error: "Image dimensions are invalid or too large." }, { status: 422 });
    }
    let sanitized: Buffer;
    try { sanitized = stripImageMetadata(bytes, detected); } catch { return NextResponse.json({ ok: false, error: "The image file is incomplete or invalid." }, { status: 422 }); }

    const key = `site-assets/${randomUUID()}.${detected.extension}`;
    const client = getR2Client();
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: sanitized,
      ContentType: detected.mimeType,
      CacheControl: "public, max-age=31536000, immutable",
      Metadata: { "enes-asset-kind": "site-content" },
    }));
    const relativeKey = key.split("/").map(encodeURIComponent).join("/");
    const url = `${publicBase.replace(/\/$/, "")}/${relativeKey}`;
    return NextResponse.json({ ok: true, url, width: dimensions.width, height: dimensions.height, mimeType: detected.mimeType }, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (error) { return safeRouteError(error); }
}
