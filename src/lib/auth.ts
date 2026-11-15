import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { PermissionKey } from "@/lib/permissions";

export class AuthenticationError extends Error {
  readonly status = 401;
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  readonly status = 403;
  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export type Actor = {
  clerkId: string;
  userId: string;
  adminUserId: string | null;
  isOwner: boolean;
  permissions: Set<string>;
};

function configuredOwnerId() {
  return process.env.ENES_OWNER_CLERK_ID?.trim() || null;
}

export async function ensureCurrentUser() {
  const session = await auth();
  if (!session.userId) throw new AuthenticationError();
  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== session.userId) {
    throw new AuthenticationError("Your account session could not be verified");
  }

  const email = clerkUser.emailAddresses.find((entry) => entry.id === clerkUser.primaryEmailAddressId)?.emailAddress
    ?? clerkUser.emailAddresses[0]?.emailAddress
    ?? null;
  const phone = clerkUser.phoneNumbers.find((entry) => entry.id === clerkUser.primaryPhoneNumberId)?.phoneNumber ?? null;
  const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim()
    || clerkUser.username
    || "ENES member";

  const verifiedEmail = clerkUser.emailAddresses.find((entry) => entry.id === clerkUser.primaryEmailAddressId)?.verification?.status === "verified";
  const user = await prisma.user.upsert({
    where: { clerkId: session.userId },
    create: {
      clerkId: session.userId,
      email,
      emailNormalized: email?.trim().toLowerCase() ?? null,
      emailVerified: verifiedEmail,
      displayName,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      phone,
      avatarUrl: clerkUser.imageUrl || null,
    },
    update: {
      email,
      emailNormalized: email?.trim().toLowerCase() ?? null,
      emailVerified: verifiedEmail,
      displayName,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      phone,
      avatarUrl: clerkUser.imageUrl || null,
    },
  });
  if (user.status !== "ACTIVE") throw new AuthorizationError("This ENES account is not active. Contact support for assistance.");
  return user;
}

async function provisionConfiguredOwner(clerkId: string, sessionId: string | null): Promise<Actor> {
  // The configured Clerk identity is the only authority for primary ownership.
  const user = await ensureCurrentUser();
  const ownerRole = await prisma.role.upsert({
    where: { key: "OWNER" },
    create: {
      key: "OWNER",
      name: "Owner",
      description: "Reserved for ENES_OWNER_CLERK_ID; never assignable by administrators.",
      isSystem: true,
    },
    update: { name: "Owner", isSystem: true },
  });
  const admin = await prisma.adminUser.upsert({
    where: { userId: user.id },
    create: { userId: user.id, status: "ACTIVE", isOwner: true, activatedAt: new Date() },
    update: { status: "ACTIVE", isOwner: true, removedAt: null, suspendedAt: null, activatedAt: new Date() },
  });
  await prisma.adminUserRole.upsert({
    where: { adminUserId_roleId: { adminUserId: admin.id, roleId: ownerRole.id } },
    create: { adminUserId: admin.id, roleId: ownerRole.id, assignedById: user.id },
    update: { assignedById: user.id },
  });
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  if (sessionId) {
    await prisma.securityEvent.createMany({
      data: [{
        userId: user.id,
        sessionId,
        dedupeKey: `owner-session:${sessionId}`,
        eventType: "OWNER_SESSION_AUTHENTICATED",
        severity: "INFO",
        metadata: { source: "ENES_OWNER_CLERK_ID" },
      }],
      skipDuplicates: true,
    });
  }
  return { clerkId, userId: user.id, adminUserId: admin.id, isOwner: true, permissions: new Set(["*"]) };
}

export async function getAdminActor(): Promise<Actor> {
  const session = await auth();
  const clerkId = session.userId;
  if (!clerkId) throw new AuthenticationError();

  const ownerId = configuredOwnerId();
  if (ownerId && clerkId === ownerId) return provisionConfiguredOwner(clerkId, session.sessionId ?? null);

  const admin = await prisma.adminUser.findFirst({
    where: {
      status: "ACTIVE",
      isOwner: false,
      removedAt: null,
      suspendedAt: null,
      user: { clerkId, status: "ACTIVE" },
    },
    include: {
      user: true,
      roles: {
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      },
    },
  });
  if (!admin) throw new AuthorizationError("This account is not an active ENES administrator");

  const permissionKeys = new Set<string>();
  for (const assignment of admin.roles) {
    // A database role can never confer primary ownership.
    if (assignment.role.key === "OWNER") continue;
    for (const item of assignment.role.permissions) permissionKeys.add(item.permission.key);
  }

  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  if (session.sessionId) {
    await prisma.securityEvent.createMany({
      data: [{
        userId: admin.userId,
        sessionId: session.sessionId,
        dedupeKey: `admin-session:${session.sessionId}`,
        eventType: "ADMIN_SESSION_AUTHENTICATED",
        severity: "INFO",
        metadata: { adminUserId: admin.id, roleKeys: admin.roles.map((entry) => entry.role.key) },
      }],
      skipDuplicates: true,
    });
  }
  return { clerkId, userId: admin.userId, adminUserId: admin.id, isOwner: false, permissions: permissionKeys };
}

export async function requireAdminPermission(permission: PermissionKey | string): Promise<Actor> {
  const actor = await getAdminActor();
  if (actor.isOwner || actor.permissions.has(permission)) return actor;
  throw new AuthorizationError();
}

export async function requireOwner(): Promise<Actor> {
  const actor = await getAdminActor();
  if (!actor.isOwner) throw new AuthorizationError("Only the designated ENES Owner can perform this action");
  return actor;
}

export async function requireAdminPage(permission: PermissionKey | string): Promise<Actor> {
  try {
    return await requireAdminPermission(permission);
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/admin/sign-in");
    redirect("/");
  }
}

export async function writeAuditLog(
  actor: Actor,
  entry: {
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
    metadata?: unknown;
  },
) {
  const toJson = (value: unknown) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  return prisma.auditLog.create({
    data: {
      actorAdminId: actor.adminUserId,
      actorClerkId: actor.clerkId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      before: toJson(entry.before),
      after: toJson(entry.after),
      metadata: toJson(entry.metadata),
    },
  });
}

export async function assertNotOwnerClerkId(targetClerkId: string) {
  const ownerId = configuredOwnerId();
  if (ownerId && targetClerkId === ownerId) {
    throw new AuthorizationError("The primary ENES Owner account cannot be suspended, removed or demoted");
  }
}

export function isAuthFailure(error: unknown): error is AuthenticationError | AuthorizationError {
  return error instanceof AuthenticationError || error instanceof AuthorizationError;
}
