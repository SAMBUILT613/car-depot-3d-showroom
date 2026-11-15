import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/auth";
import { sendListingApprovedEmail } from "@/lib/email";

export type ListingModerationAction = "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "ARCHIVE" | "SUSPEND";

const NEXT_STATUS: Record<ListingModerationAction, string> = {
  APPROVE: "PUBLISHED",
  REJECT: "REJECTED",
  REQUEST_CHANGES: "CHANGES_REQUESTED",
  ARCHIVE: "ARCHIVED",
  SUSPEND: "SUSPENDED",
};

export async function moderateListing(actor: Actor, listingId: string, action: ListingModerationAction, reason?: string) {
  const current = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      media: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      seller: { select: { status: true } },
    },
  });
  if (!current) throw new Error("LISTING_NOT_FOUND");

  if (["REJECT", "REQUEST_CHANGES", "SUSPEND"].includes(action) && (!reason || reason.trim().length < 5 || reason.trim().length > 2000)) {
    throw new Error("A clear reason of at least 5 characters is required for this action.");
  }
  if (action === "APPROVE" && !["PENDING_REVIEW", "CHANGES_REQUESTED"].includes(current.status)) {
    throw new Error("Only pending or corrected listings can be approved.");
  }
  if (action === "APPROVE" && current.sellerUserId && current.seller?.status !== "ACTIVE") {
    throw new Error("The seller account must be active before this listing can be published.");
  }
  if (action === "APPROVE") {
    const publicBucket = process.env.R2_PUBLIC_BUCKET_NAME?.trim();
    const approvedMedia = current.media.filter((media) => media.status === "APPROVED" && media.publicUrl && publicBucket && media.bucketName === publicBucket);
    if (approvedMedia.length === 0) throw new Error("Approve at least one image in the public media bucket before publishing this listing.");
  }

  const status = NEXT_STATUS[action];
  const publicImages = action === "APPROVE"
    ? current.media.filter((media) => media.status === "APPROVED" && media.publicUrl && media.bucketName === process.env.R2_PUBLIC_BUCKET_NAME).map((media) => media.publicUrl!)
    : current.images;
  const before = {
    status: current.status,
    title: current.title,
    price: current.price,
    imageCount: current.images.length,
  };

  const transactionResult = await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.update({
      where: { id: listingId },
      data: {
        status,
        ...(action === "APPROVE" ? {
          publishedAt: new Date(),
          reviewedAt: new Date(),
          reviewedByAdminId: actor.adminUserId,
          images: publicImages,
          rejectionReason: null,
        } : {}),
        ...(action === "REJECT" || action === "REQUEST_CHANGES" || action === "SUSPEND" ? {
          rejectionReason: reason!.trim(),
          reviewedAt: new Date(),
          reviewedByAdminId: actor.adminUserId,
        } : {}),
      },
    });

    await tx.listingStatusHistory.create({
      data: {
        listingId,
        fromStatus: current.status,
        toStatus: status,
        reason: reason?.trim() || `Administrator action: ${action}`,
        actorClerkId: actor.clerkId,
        actorAdminId: actor.adminUserId,
      },
    });

    const latestVersion = await tx.listingVersion.findFirst({
      where: { listingId }, orderBy: { version: "desc" }, select: { version: true },
    });
    await tx.listingVersion.create({
      data: {
        listingId,
        version: (latestVersion?.version || 0) + 1,
        changedByClerkId: actor.clerkId,
        changeReason: `Moderation: ${action}`,
        snapshot: {
          title: listing.title,
          description: listing.description,
          price: listing.price,
          category: listing.category,
          state: listing.state,
          city: listing.city,
          status: listing.status,
          images: listing.images,
        },
      },
    });

    if (action === "REQUEST_CHANGES") {
      await tx.correctionRequest.create({
        data: { listingId, requestedByAdminId: actor.adminUserId, instructions: reason!.trim() },
      });
    }

    let approvalNotificationId: string | null = null;
    if (current.sellerUserId) {
      const notification = await tx.notification.create({
        data: {
          userId: current.sellerUserId,
          type: action === "APPROVE" ? "LISTING_APPROVED" : action === "REQUEST_CHANGES" ? "LISTING_CHANGES_REQUESTED" : action === "REJECT" ? "LISTING_REJECTED" : "LISTING_STATUS_CHANGED",
          title: action === "APPROVE" ? "Your listing is published" : action === "REQUEST_CHANGES" ? "Your listing needs changes" : action === "REJECT" ? "Your listing was not approved" : "Your listing status changed",
          body: reason?.trim() || `Your listing status is now ${status}.`,
          data: { listingId },
        },
        select: { id: true },
      });
      if (action === "APPROVE") approvalNotificationId = notification.id;
    }

    await tx.auditLog.create({
      data: {
        actorAdminId: actor.adminUserId,
        actorClerkId: actor.clerkId,
        action: `LISTING_${action}`,
        entityType: "Listing",
        entityId: listingId,
        before,
        after: { status, title: listing.title, imageCount: listing.images.length },
        metadata: reason ? { reason: reason.trim() } : undefined,
      },
    });
    return { listing, approvalNotificationId };
  });

  const updated = transactionResult.listing;
  if (action === "APPROVE" && updated.sellerEmail) {
    const emailResult = await sendListingApprovedEmail(updated.sellerEmail, updated.title, updated.id);
    if (transactionResult.approvalNotificationId) {
      await prisma.notificationDelivery.create({
        data: {
          notificationId: transactionResult.approvalNotificationId,
          channel: "EMAIL",
          status: emailResult.sent ? "SENT" : "NOT_CONFIGURED",
          providerId: emailResult.providerId,
          attempts: 1,
          sentAt: emailResult.sent ? new Date() : null,
          lastError: emailResult.reason,
        },
      });
    }
  }
  return updated;
}
