import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // RDS requires TLS. rejectUnauthorized:false = encrypt without verifying the
    // Amazon RDS CA chain (swap in `ca:` with the RDS bundle to verify fully).
    ssl: { rejectUnauthorized: false },
    // Amplify SSR runs on short-lived serverless instances; keep each pool small
    // so many concurrent instances don't exhaust the db.t4g.micro connection cap.
    max: 5,
    idleTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
}

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
