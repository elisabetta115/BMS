import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import { RDS_CA } from "../src/lib/rds-ca.mjs";

const { Pool } = pg;

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
// Same rule as src/lib/prisma.ts: no TLS only for a database on this computer.
const isLocal = (() => {
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname); } catch { return false; }
})();
const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { ca: RDS_CA },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Admin";

  if (!email || !password) {
    console.log("Skipping admin seed: ADMIN_EMAIL or ADMIN_PASSWORD not set.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", passwordHash },
    create: { email, name, passwordHash, role: "ADMIN", emailVerifiedAt: new Date() },
  });

  console.log(`✓ Admin user ${email} is ready.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
