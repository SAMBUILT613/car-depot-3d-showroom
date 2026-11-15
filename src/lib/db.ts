import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

type PrismaGlobal = typeof globalThis & {
  __enesPrisma?: PrismaClient;
  __enesPgPool?: Pool;
};

const prismaGlobal = globalThis as PrismaGlobal;

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("Database connection is not configured.");
  }

  const configuredMax = Number(process.env.PG_POOL_MAX ?? "2");
  const max = Number.isInteger(configuredMax)
    ? Math.min(3, Math.max(1, configuredMax))
    : 2;

  const pool = new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    allowExitOnIdle: true,
  });

  // Keep idle connection errors observable without logging connection details.
  pool.on("error", () => {
    console.error("An idle PostgreSQL connection encountered an error.");
  });

  return pool;
}

function getPrismaClient(): PrismaClient {
  if (!prismaGlobal.__enesPrisma) {
    const pool = prismaGlobal.__enesPgPool ?? createPool();
    prismaGlobal.__enesPgPool = pool;
    prismaGlobal.__enesPrisma = new PrismaClient({
      adapter: new PrismaPg(pool),
    });
  }

  return prismaGlobal.__enesPrisma;
}

// Reuse one small Prisma client/pool per warm Node.js function instance.
// Netlify's Next.js adapter runs server code in Node.js, not a Workers isolate.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
