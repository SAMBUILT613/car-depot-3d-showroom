// Prisma 7 config file.
// - datasource.url is used by `prisma migrate` (DDL operations).
//   Must be the DIRECT endpoint for reliable DDL.
// - Runtime PrismaClient uses DATABASE_URL (pooler) via the adapter in src/lib/db.ts.
import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  migrations: {
    path: path.join(__dirname, "prisma", "migrations"),
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
