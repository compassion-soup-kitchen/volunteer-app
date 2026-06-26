import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let _db: PrismaClient | null = null;

export function getDb() {
  if (!_db) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
      max: 1,
    });
    _db = new PrismaClient({ adapter });
  }
  return _db;
}
