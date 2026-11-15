import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const PERMISSIONS = [
  "listings:view", "listings:create_for_seller", "listings:edit", "listings:approve", "listings:reject",
  "listings:request_changes", "listings:archive", "listings:delete", "listings:feature",
  "media:view", "media:approve", "media:reject",
  "users:view", "users:edit", "users:suspend", "users:restore", "sellers:view", "sellers:verify", "sellers:suspend",
  "verification:view", "verification:review", "verification:revoke", "reports:view", "reports:assign", "reports:resolve",
  "messages:view", "messages:moderate", "enquiries:view", "enquiries:manage", "property_requests:view", "property_requests:manage",
  "categories:manage", "content:manage", "content:publish", "services:view", "services:create", "services:edit", "services:approve", "services:suspend",
  "service_enquiries:view", "service_enquiries:manage", "admins:view", "admins:invite", "admins:manage", "admins:assign_roles",
  "admins:suspend", "analytics:view", "analytics:export", "settings:view", "settings:manage", "security:view", "audit:view",
];

const ADMIN_CONTROL = new Set([
  "admins:invite", "admins:manage", "admins:assign_roles", "admins:suspend", "settings:manage", "security:view", "content:publish",
]);

const ROLE_DEFINITIONS = [
  { key: "OWNER", name: "Owner", description: "Reserved for the exact Clerk identity configured by ENES_OWNER_CLERK_ID.", permissions: PERMISSIONS },
  { key: "SUPER_ADMIN", name: "Super Admin", description: "Broad operational control, excluding protected ownership, administrator assignment and critical settings.", permissions: PERMISSIONS.filter((key) => !ADMIN_CONTROL.has(key)) },
  { key: "OPERATIONS_MANAGER", name: "Operations Manager", description: "Oversees listings, users, reports, enquiries and operational workflows.", permissions: [
    "listings:view", "listings:create_for_seller", "listings:edit", "listings:approve", "listings:reject", "listings:request_changes", "listings:archive",
    "media:view", "media:approve", "media:reject", "users:view", "users:edit", "users:suspend", "users:restore", "sellers:view", "sellers:suspend",
    "reports:view", "reports:assign", "reports:resolve", "messages:view", "messages:moderate", "enquiries:view", "enquiries:manage",
    "property_requests:view", "property_requests:manage", "services:view", "services:create", "services:edit", "services:approve", "services:suspend",
    "service_enquiries:view", "service_enquiries:manage", "verification:view", "analytics:view", "settings:view", "audit:view",
  ] },
  { key: "LISTING_MODERATOR", name: "Listing Moderator", description: "Reviews listings and handles listing-related reports and messages.", permissions: [
    "listings:view", "listings:edit", "listings:approve", "listings:reject", "listings:request_changes", "listings:archive",
    "media:view", "media:approve", "media:reject", "reports:view", "reports:assign", "reports:resolve", "messages:view", "messages:moderate", "users:view", "sellers:view", "services:view",
  ] },
  { key: "CONTENT_MANAGER", name: "Content Manager", description: "Manages marketplace categories, attributes and approved public content.", permissions: ["listings:view", "categories:manage", "content:manage", "analytics:view"] },
  { key: "VERIFICATION_OFFICER", name: "Verification Officer", description: "Reviews documented verification evidence and records scoped decisions.", permissions: ["sellers:view", "sellers:verify", "verification:view", "verification:review", "verification:revoke"] },
  { key: "SUPPORT_AGENT", name: "Support Agent", description: "Handles user support and enquiries with limited record access.", permissions: ["users:view", "users:edit", "sellers:view", "listings:view", "reports:view", "messages:view", "enquiries:view", "service_enquiries:view", "service_enquiries:manage"] },
  { key: "ANALYST", name: "Analyst", description: "Read-only operational analytics and audit visibility.", permissions: ["listings:view", "users:view", "reports:view", "analytics:view", "analytics:export", "audit:view", "services:view"] },
  { key: "PROPERTY_MANAGER_ADMIN", name: "Property Management Admin", description: "Scoped access for property-management services and requests.", permissions: ["listings:view", "listings:edit", "sellers:view", "reports:view", "messages:view", "analytics:view", "property_requests:view", "property_requests:manage", "services:view", "services:create", "services:edit", "service_enquiries:view", "service_enquiries:manage"] },
];

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Database connection is not configured. Set DIRECT_URL or DATABASE_URL.");
  process.exit(2);
}

const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10000, ssl: { rejectUnauthorized: true } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  const permissionRows = new Map();
  for (const key of PERMISSIONS) {
    const row = await prisma.permission.upsert({
      where: { key },
      create: { key, description: `ENES permission: ${key}` },
      update: { description: `ENES permission: ${key}` },
    });
    permissionRows.set(key, row.id);
  }

  for (const definition of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { key: definition.key },
      create: { key: definition.key, name: definition.name, description: definition.description, isSystem: true },
      update: { name: definition.name, description: definition.description, isSystem: true },
    });
    const permissionIds = definition.permissions.map((key) => {
      const permissionId = permissionRows.get(key);
      if (!permissionId) throw new Error(`Unknown permission ${key} in role ${definition.key}`);
      return { roleId: role.id, permissionId };
    });
    await prisma.$transaction(async (tx) => {
      // System-role grants are synchronised exactly on every run. Custom role grants are untouched.
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      if (permissionIds.length) await tx.rolePermission.createMany({ data: permissionIds });
    });
  }

  // Deliberately do not create AdminUser records or grant OWNER to a first login.
  // The configured Clerk identity is provisioned by src/lib/auth.ts only.
  console.log(`RBAC seed complete: ${PERMISSIONS.length} permissions, ${ROLE_DEFINITIONS.length} system roles.`);
} catch (error) {
  console.error("RBAC seed failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pool.end();
}
