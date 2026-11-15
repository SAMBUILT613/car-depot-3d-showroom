import { NextRequest, NextResponse } from "next/server";
import { ensureCurrentUser, isAuthFailure } from "@/lib/auth";
import { safeConsumeRateLimit } from "@/lib/security/rate-limit";
import { MediaStorageConfigurationError, MediaValidationError, uploadPendingListingImage } from "@/lib/media/storage";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 6 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "The upload request is too large. Each image must be 5 MB or smaller." }, { status: 413 });
    }
    const user = await ensureCurrentUser();
    const limit = await safeConsumeRateLimit({ request, route: "listing-media-upload", actorId: user.clerkId, limit: 30, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ ok: false, error: "You have reached the image upload limit. Try again later." }, { status: 429 });

    const formData = await request.formData();
    const file = formData.get("file");
    const altText = formData.get("altText");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Choose an image to upload." }, { status: 400 });
    if (altText !== null && typeof altText !== "string") return NextResponse.json({ ok: false, error: "Invalid image description." }, { status: 400 });

    const media = await uploadPendingListingImage({ file, userId: user.id, altText: typeof altText === "string" ? altText : undefined });
    return NextResponse.json({ ok: true, mediaId: media.id, width: media.width, height: media.height, mimeType: media.mimeType }, { status: 201 });
  } catch (error) {
    if (isAuthFailure(error)) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    if (error instanceof MediaValidationError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    if (error instanceof MediaStorageConfigurationError) {
      console.error("Pending media storage is not configured");
      return NextResponse.json({ ok: false, error: "Image uploads are temporarily unavailable." }, { status: 503 });
    }
    console.error("Pending media upload failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ ok: false, error: "The image could not be uploaded." }, { status: 500 });
  }
}
