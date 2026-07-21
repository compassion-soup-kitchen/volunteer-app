import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Stashed on globalThis so dev-server hot reloads reuse the pool instead of
// leaking a new one per module instance.
const globalForDb = globalThis as unknown as { _db?: PrismaClient };

export function getDb() {
  if (!globalForDb._db) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
      // One long-lived server process serves every request, so the pool must
      // hold more than one connection or all queries serialize behind it.
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    });
    globalForDb._db = new PrismaClient({ adapter });
  }
  return globalForDb._db;
}
