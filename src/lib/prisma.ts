import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { RDS_CA } from "./rds-ca.mjs";

const { Pool } = pg;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

// A database on this computer (local development) has no TLS; anything else must be RDS.
function isLocalDatabase(url: string | undefined): boolean {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url ?? "").hostname);
  } catch {
    return false;
  }
}

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // RDS requires TLS; verify the server against the Amazon RDS CAs so a
    // spoofed host can't receive the password.
    ssl: isLocalDatabase(process.env.DATABASE_URL) ? false : { ca: RDS_CA },
    // Amplify SSR runs each request on its own serverless instance, and idle
    // instances keep their connections open for minutes. With 5 per instance the
    // db.t4g.micro ran out of connections (P2037, 2026-10-27); an instance only
    // serves one request at a time, so one connection is enough.
    max: 1,
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
