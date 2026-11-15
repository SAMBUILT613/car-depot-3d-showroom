import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

function hashKey(value: string) {
  const secret = process.env.RATE_LIMIT_HASH_SECRET
    || (process.env.NODE_ENV !== "production" ? "enes-local-development-rate-limit" : null);
  if (!secret) throw new Error("RATE_LIMIT_HASH_SECRET is required for production rate limiting");
  return createHash("sha256").update(`${secret}:${value}`).digest("hex");
}

export function requestFingerprint(request: NextRequest, actorId?: string | null) {
  // Cloudflare's cf-connecting-ip is the authoritative edge-provided client IP.
  if (actorId) return hashKey(`user:${actorId}`);
  const edgeIp = request.headers.get("cf-connecting-ip")
    || (process.env.NODE_ENV !== "production" ? request.headers.get("x-real-ip") : null);
  if (!edgeIp) throw new Error("Cloudflare client IP is unavailable for anonymous rate limiting");
  return hashKey(`ip:${edgeIp}`);
}

export async function consumeRateLimit(input: {
  request: NextRequest;
  route: string;
  actorId?: string | null;
  limit: number;
  windowMs: number;
}) {
  const keyHash = requestFingerprint(input.request, input.actorId);
  const bucketStart = new Date(Math.floor(Date.now() / input.windowMs) * input.windowMs);
  const expiresAt = new Date(bucketStart.getTime() + input.windowMs * 3);
  const row = await prisma.rateLimitBucket.upsert({
    where: { keyHash_route_bucketStart: { keyHash, route: input.route, bucketStart } },
    create: { keyHash, route: input.route, bucketStart, expiresAt, count: 1 },
    update: { count: { increment: 1 }, expiresAt },
  });
  return {
    allowed: row.count <= input.limit,
    remaining: Math.max(0, input.limit - row.count),
    resetAt: new Date(bucketStart.getTime() + input.windowMs),
  };
}

// Fail closed: if the database-backed limit cannot be checked, reject the mutation.
export async function safeConsumeRateLimit(input: Parameters<typeof consumeRateLimit>[0]) {
  try {
    return await consumeRateLimit(input);
  } catch (error) {
    console.error("Rate-limit store unavailable; rejecting mutation", error instanceof Error ? error.name : "UnknownError");
    return { allowed: false, remaining: 0, resetAt: new Date(Date.now() + input.windowMs) };
  }
}
