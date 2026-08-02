import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/**
 * Connections each instance may hold.
 *
 * Supabase's session-mode pooler caps the project at 15 clients, while node-pg
 * defaults to 10 per pool — so two warm Vercel instances could exhaust it on
 * their own, and the whole app started failing with
 * "(EMAXCONNSESSION) max clients reached in session mode".
 *
 * Serverless wants 1: an instance serves one request at a time, and a warm
 * instance holds its connections open between invocations. The worker is a
 * single long-running process and can afford more — raise it there with
 * DATABASE_POOL_MAX if queue throughput ever needs it.
 */
function poolMax(): number {
  const raw = Number(process.env.DATABASE_POOL_MAX);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl,
      max: poolMax(),
      // Hand connections back to the pooler quickly rather than letting a warm
      // but idle instance sit on a slot.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
    }),
  });
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrisma(), prop, receiver);
  },
});
