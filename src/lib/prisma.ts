// Prisma client singleton.
// NOTE: Run `npx prisma generate` and `npx prisma db push` after setting up
// your Supabase DATABASE_URL in .env. This file will work once the Prisma
// client has been generated.
//
// Until then, the app uses a raw-SQL fallback via Supabase JS (see db.ts).

let PrismaClientClass: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  PrismaClientClass = require("@prisma/client").PrismaClient;
} catch {
  // Prisma client not generated yet — will fall back to db.ts
  PrismaClientClass = null;
}

const globalForPrisma = globalThis as unknown as { prisma: any };

export const prisma = PrismaClientClass
  ? globalForPrisma.prisma || new PrismaClientClass()
  : null;

if (PrismaClientClass && process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
