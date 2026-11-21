import { CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";
import { writeAuditLog, type Actor } from "@/lib/auth";
import { deleteR2Object, getR2Client } from "@/lib/media/storage";
import { createNotification, notifyActiveAdministrators } from "@/lib/notifications";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { validNairaAmount, validText } from "@/lib/security/http";

type Body = Record<string, unknown>;
type Scalar = string | number | boolean | null;
export type Fields = Record<string, Scalar>;

const CATEGORIES = new Set(["Property", "Cars", "Home & Living", "Marketplace"]);
const PROPERTY_INTENTS = new Set(["FOR_RENT", "FOR_SALE", "LAND_FOR_SALE", "COMMERCIAL_FOR_RENT", "COMMERCIAL_FOR_SALE", "SHORT_LET"]);
const CATEGORY_FIELDS: Record<string, string[]> = {
  Property: ["intent", "propertyType", "bedrooms", "bathrooms", "landSize", "furnishing", "parkingSpaces"],
  Cars: ["make", "model", "vehicleYear", "mileage", "transmission", "fuelType", "condition"],
  "Home & Living": ["condition", "itemBrand", "itemDimensions", "quantity", "deliveryAvailable"],
  Marketplace: ["condition", "itemBrand", "itemDimensions", "quantity", "deliveryAvailable"],
};
const CATEGORY_SPECIFIC = [
  "intent", "propertyType", "bedrooms", "bathrooms", "landSize", "furnishing", "parkingSpaces",
  "make", "model", "vehicleYear", "mileage", "transmission", "fuelType",
  "condition", "itemBrand", "itemDimensions", "quantity", "deliveryAvailable",
];
export const SELLER_EDITABLE_STATUSES = ["PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED"];
export const TRACKED_FIELDS = [
  "title", "description", "price", "pricePeriod", "category", "subCategory", "condition",
  ...CATEGORY_SPECIFIC.filter((key) => key !== "condition"),
  "state", "city", "area", "sellerName", "sellerPhone", "sellerEmail",
];

function optionalText(value: unknown, maximum: number) {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "string" && value.trim().length <= maximum ? value.trim() : null;
}
function safeInteger(value: unknown, min: number, max: number) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
}
function safeNumber(value: unknown, min: number, max: number) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
export function normalizePublicPhone(value: unknown, fallback: string | null) {
  const raw = typeof value === "string" && value.trim() ? value : fallback || "";
  const digits = raw.replace(/\D/g, "");
  if (/^0[789][01]\d{8}$/.test(digits)) return `234${digits.slice(1)}`;
  if (/^234[789][01]\d{8}$/.test(digits)) return digits;
  if (digits.length >= 10 && digits.length <= 15 && !digits.startsWith("0")) return digits;
  return null;
}

export function parseListingFields(
  body: Body,
  options: { admin: boolean; fixedCategory?: string; current: { sellerPhone: string } },
): { ok: true; data: Fields } | { ok: false; error: string } {
  const bad = (error: string) => ({ ok: false as const, error });
  if (!validText(body.title, 120) || !validText(body.description, 12000) || String(body.description).trim().length < 30) {
    return bad("Provide a clear title and a description of at least 30 characters.");
  }
  const rawPrice = typeof body.price === "string" && body.price.trim() ? Number(body.price) : body.price;
  if (!validNairaAmount(rawPrice)) return bad("Enter a valid price in naira.");
  const category = options.fixedCategory ?? body.category;
  if (typeof category !== "string" || !CATEGORIES.has(category)) return bad("Choose a supported listing category.");
  const state = typeof body.state === "string" ? body.state.trim() : "";
  if (!state || !(NIGERIAN_STATES as readonly string[]).includes(state) || !validText(body.city, 100)) {
    return bad("Choose a valid Nigerian state and enter a city or town.");
  }
  if (category === "Property" && (!PROPERTY_INTENTS.has(body.intent as string) || !validText(body.propertyType, 80))) return bad("Choose the property purpose and property type.");
  if (category === "Cars" && (!validText(body.make, 80) || !validText(body.model, 80) || !["New", "Foreign Used", "Nigerian Used"].includes(body.condition as string))) return bad("Vehicle make, model and condition are required.");
  if (["Home & Living", "Marketplace"].includes(category) && !["New", "Used", "Refurbished"].includes(body.condition as string)) return bad("Choose the item condition.");
  if (category === "Marketplace" && !validText(body.subCategory, 100)) return bad("Choose or describe the type of item.");

  const data: Fields = {
    title: (body.title as string).trim(),
    description: (body.description as string).trim(),
    price: rawPrice as number,
    pricePeriod: optionalText(body.pricePeriod, 40),
    category,
    subCategory: optionalText(body.subCategory, 100),
    condition: optionalText(body.condition, 60),
    intent: optionalText(body.intent, 40),
    propertyType: optionalText(body.propertyType, 80),
    bedrooms: safeInteger(body.bedrooms, 0, 100),
    bathrooms: safeNumber(body.bathrooms, 0, 100),
    landSize: optionalText(body.landSize, 80),
    furnishing: optionalText(body.furnishing, 40),
    parkingSpaces: safeInteger(body.parkingSpaces, 0, 1000),
    make: optionalText(body.make, 80),
    model: optionalText(body.model, 80),
    vehicleYear: safeInteger(body.vehicleYear, 1900, new Date().getFullYear() + 1),
    mileage: safeInteger(body.mileage, 0, 2_000_000_000),
    transmission: optionalText(body.transmission, 40),
    fuelType: optionalText(body.fuelType, 40),
    itemBrand: optionalText(body.itemBrand, 80),
    itemDimensions: optionalText(body.itemDimensions, 80),
    quantity: safeInteger(body.quantity, 1, 100000),
    deliveryAvailable: body.deliveryAvailable === true || body.deliveryAvailable === "true",
    state,
    city: (body.city as string).trim(),
    area: optionalText(body.area, 120),
  };
  const allowed = new Set(CATEGORY_FIELDS[category]);
  for (const key of CATEGORY_SPECIFIC) if (!allowed.has(key)) data[key] = key === "deliveryAvailable" ? false : null;

  const phone = normalizePublicPhone(body.sellerPhone, options.current.sellerPhone);
  if (!phone) return bad("Enter a valid public contact number, including a Nigerian mobile number or international country code.");
  data.sellerPhone = phone;
  if (options.admin) {
    if (body.sellerName !== undefined) {
      if (!validText(body.sellerName, 120)) return bad("Enter the seller's name.");
      data.sellerName = (body.sellerName as string).trim();
    }
    if (body.sellerEmail !== undefined) {
      const email = typeof body.sellerEmail === "string" ? body.sellerEmail.trim() : "";
      if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return bad("Enter a valid seller email address, or leave it empty.");
      data.sellerEmail = email || null;
    }
  }
  return { ok: true, data };
}

export type EditResult =
  | { ok: true; changed: string[]; version: number | null }
  | { ok: false; status: number; error: string };
const fail = (status: number, error: string): EditResult => ({ ok: false, status, error });

export async function applyListingEdit(input: {
  listingId: string;
  kind: "seller" | "admin";
  actor: Actor;
  editorName: string;
  body: Body;
}): Promise<EditResult> {
  const { listingId, kind, actor, editorName, body } = input;
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      media: {
        where: { deletedAt: null, status: { in: ["APPROVED", "PENDING_REVIEW"] } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!listing) return fail(404, "Listing not found.");
  if (kind === "seller") {
    const owns = listing.sellerUserId === actor.userId || (listing.sellerId !== null && listing.sellerId === actor.clerkId);
    if (!owns) return fail(404, "Listing not found.");
    if (!SELLER_EDITABLE_STATUSES.includes(listing.status)) return fail(409, "This listing can no longer be edited. Please contact ENES.");
  }

  const parsed = parseListingFields(body, {
    admin: kind === "admin",
    fixedCategory: kind === "seller" ? listing.category : undefined,
    current: { sellerPhone: listing.sellerPhone },
  });
  if (!parsed.ok) return fail(400, parsed.error);

  // ----- Photo plan -----
  const order = Array.isArray(body.mediaOrder)
    ? body.mediaOrder.filter((value): value is string => typeof value === "string" && value.length <= 80)
    : null;
  const existingIds = new Set(listing.media.map((media) => media.id));
  type Pending = { id: string; bucketName: string; objectKey: string; mimeType: string };
  let added: Pending[] = [];
  let removed = [] as typeof listing.media;
  let reordered = false;
  const copies: { id: string; bucket: string; key: string; url: string; sourceBucket: string; sourceKey: string }[] = [];

  if (order) {
    if (order.length > 10 || new Set(order).size !== order.length) return fail(400, "Use no more than 10 different photos.");
    const newIds = order.filter((id) => !existingIds.has(id));
    added = newIds.length
      ? await prisma.listingMedia.findMany({
          where: { id: { in: newIds }, uploaderUserId: actor.userId, listingId: null, status: "PENDING_REVIEW", deletedAt: null },
          select: { id: true, bucketName: true, objectKey: true, mimeType: true },
        })
      : [];
    if (added.length !== newIds.length) return fail(400, "One or more new photos are no longer available. Please upload them again.");
    removed = listing.media.filter((media) => !order.includes(media.id));
    const keptBefore = listing.media.filter((media) => order.includes(media.id)).map((media) => media.id);
    const keptAfter = order.filter((id) => existingIds.has(id));
    reordered = keptBefore.join(",") !== keptAfter.join(",");

    if (listing.status === "PUBLISHED" && added.length) {
      const privateBucket = process.env.R2_BUCKET_NAME?.trim();
      const publicBucket = process.env.R2_PUBLIC_BUCKET_NAME?.trim();
      const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
      if (!privateBucket || !publicBucket || publicBucket === privateBucket || !publicBase) {
        return fail(503, "Photo publishing is not configured yet. Please contact ENES.");
      }
      const client = getR2Client();
      try {
        for (const media of added) {
          if (media.bucketName !== privateBucket || !media.objectKey.startsWith("pending/")) return fail(409, "A new photo is not in the expected upload area. Upload it again.");
          const extension = media.mimeType === "image/png" ? "png" : media.mimeType === "image/webp" ? "webp" : "jpg";
          const key = `approved/listings/${listing.id}/${media.id}.${extension}`;
          await client.send(new HeadObjectCommand({ Bucket: privateBucket, Key: media.objectKey }));
          await client.send(new CopyObjectCommand({
            Bucket: publicBucket,
            Key: key,
            CopySource: `${privateBucket}/${media.objectKey.split("/").map(encodeURIComponent).join("/")}`,
            ContentType: media.mimeType,
            MetadataDirective: "REPLACE",
            Metadata: { "enes-media-id": media.id },
            CacheControl: "public, max-age=31536000, immutable",
          }));
          copies.push({ id: media.id, bucket: publicBucket, key, url: `${publicBase}/${key}`, sourceBucket: media.bucketName, sourceKey: media.objectKey });
        }
      } catch (error) {
        console.error("Edit photo publish failed", error instanceof Error ? error.name : "UnknownError");
        await Promise.all(copies.map((copy) => client.send(new DeleteObjectCommand({ Bucket: copy.bucket, Key: copy.key })).catch(() => undefined)));
        return fail(502, "The new photos could not be published. Please try again.");
      }
    }
  }

  // ----- Field diff -----
  const row = listing as unknown as Record<string, Scalar | undefined>;
  const before: Fields = {};
  for (const key of TRACKED_FIELDS) before[key] = row[key] ?? null;
  const after: Fields = { ...before, ...parsed.data };
  const changes: Record<string, { from: Scalar; to: Scalar }> = {};
  for (const key of TRACKED_FIELDS) if ((before[key] ?? null) !== (after[key] ?? null)) changes[key] = { from: before[key] ?? null, to: after[key] ?? null };
  const changedKeys = Object.keys(changes);
  const photoParts = [
    added.length ? `photos +${added.length}` : "",
    removed.length ? `photos -${removed.length}` : "",
    reordered ? "photo order" : "",
  ].filter(Boolean);
  if (!changedKeys.length && !photoParts.length) return { ok: true, changed: [], version: null };
  const summary = [...changedKeys, ...photoParts];

  // Legacy URL projection (kept in step with approved media only)
  let images: string[] | null = null;
  if (order) {
    const urlById = new Map<string, string>();
    for (const media of listing.media) if (media.status === "APPROVED" && media.publicUrl) urlById.set(media.id, media.publicUrl);
    for (const copy of copies) urlById.set(copy.id, copy.url);
    images = order.flatMap((id) => (urlById.has(id) ? [urlById.get(id) as string] : []));
  }

  const version = await prisma.$transaction(async (tx) => {
    await tx.listing.update({
      where: { id: listing.id },
      data: { ...parsed.data, ...(images ? { images } : {}) } as never,
    });
    if (order) {
      let index = 0;
      for (const id of order) {
        const copy = copies.find((item) => item.id === id);
        if (existingIds.has(id)) {
          await tx.listingMedia.update({ where: { id }, data: { sortOrder: index } });
        } else {
          const result = await tx.listingMedia.updateMany({
            where: { id, uploaderUserId: actor.userId, listingId: null, status: "PENDING_REVIEW", deletedAt: null },
            data: copy
              ? {
                  listingId: listing.id, sortOrder: index, bucketName: copy.bucket, objectKey: copy.key, publicUrl: copy.url,
                  status: "APPROVED", reviewedAt: new Date(), reviewedByAdminId: actor.adminUserId, rejectionReason: null,
                }
              : { listingId: listing.id, sortOrder: index },
          });
          if (result.count !== 1) throw new Error("A new photo could not be attached.");
        }
        index += 1;
      }
      for (const media of removed) {
        await tx.listingMedia.update({ where: { id: media.id }, data: { deletedAt: new Date(), status: "DELETED" } });
      }
    }
    const last = await tx.listingVersion.findFirst({ where: { listingId: listing.id }, orderBy: { version: "desc" }, select: { version: true } });
    const next = (last?.version ?? 0) + 1;
    await tx.listingVersion.create({
      data: {
        listingId: listing.id,
        version: next,
        changedByClerkId: actor.clerkId,
        changeReason: `${kind === "admin" ? "Admin" : "Seller"} edit by ${editorName}: ${summary.join(", ")}`.slice(0, 500),
        snapshot: JSON.parse(JSON.stringify({
          editor: { kind, name: editorName },
          statusAtEdit: listing.status,
          fields: after,
          changes,
          media: { added: added.length, removed: removed.length, reordered, publishedImmediately: copies.length },
        })),
      },
    });
    return next;
  });

  // ----- Best-effort storage cleanup and notifications (never fail the edit) -----
  for (const copy of copies) await deleteR2Object(copy.sourceBucket, copy.sourceKey).catch(() => undefined);
  for (const media of removed) await deleteR2Object(media.bucketName, media.objectKey).catch(() => undefined);

  await writeAuditLog(actor, {
    action: kind === "admin" ? "LISTING_EDITED_BY_ADMIN" : "LISTING_EDITED_BY_SELLER",
    entityType: "Listing",
    entityId: listing.id,
    before: Object.fromEntries(changedKeys.map((key) => [key, changes[key].from])),
    after: Object.fromEntries(changedKeys.map((key) => [key, changes[key].to])),
    metadata: { version, status: listing.status, photos: photoParts },
  }).catch((error) => console.error("Listing edit audit failed", error instanceof Error ? error.name : "UnknownError"));

  const title = String(after.title);
  if (kind === "seller" && listing.status === "PUBLISHED") {
    await notifyActiveAdministrators({
      type: "LISTING_EDITED",
      title: "Live listing edited by seller",
      body: `${editorName} edited “${title}”: ${summary.join(", ")}.`,
      data: { listingId: listing.id, version },
      href: `/admin/listings/${listing.id}/edit`,
    }).catch((error) => console.error("Edit notification failed", error instanceof Error ? error.name : "UnknownError"));
  }
  if (kind === "admin" && listing.sellerUserId && listing.sellerUserId !== actor.userId) {
    await createNotification({
      userId: listing.sellerUserId,
      type: "LISTING_UPDATED_BY_ADMIN",
      title: "ENES updated your listing",
      body: `ENES made changes to “${title}”.`,
      data: { listingId: listing.id, version },
      href: `/dashboard/listings/${listing.id}/edit`,
    }).catch((error) => console.error("Seller notification failed", error instanceof Error ? error.name : "UnknownError"));
  }
  return { ok: true, changed: summary, version };
}
