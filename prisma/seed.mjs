import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
    create: { email, name, passwordHash, role: "ADMIN" },
  });

  console.log(`✓ Admin user ${email} is ready.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
