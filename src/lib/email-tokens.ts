import { createHash, randomBytes } from "crypto";
import type { EmailTokenPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** How long each kind of emailed link keeps working. */
export const TOKEN_TTL_HOURS: Record<EmailTokenPurpose, number> = {
  VERIFY_EMAIL: 24,
  RESET_PASSWORD: 1,
  CHANGE_EMAIL: 24,
};

const RESEND_COOLDOWN_MS = 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a one-time link token, replacing any unused one with the same purpose
 * (so only the newest email works). Returns the raw token to put in the email;
 * only its hash is stored.
 */
export async function createEmailToken(
  userId: string,
  purpose: EmailTokenPurpose,
  newEmail?: string
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.emailToken.deleteMany({ where: { userId, purpose, usedAt: null } }),
    prisma.emailToken.create({
      data: {
        userId,
        purpose,
        tokenHash: hashToken(token),
        newEmail: newEmail ?? null,
        expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS[purpose] * 60 * 60 * 1000),
      },
    }),
  ]);
  return token;
}

/** True if a link of this kind was emailed to the user in the last minute. */
export async function sentRecently(userId: string, purpose: EmailTokenPurpose): Promise<boolean> {
  const recent = await prisma.emailToken.findFirst({
    where: { userId, purpose, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
    select: { id: true },
  });
  return recent !== null;
}

/**
 * Marks the token as used and returns it with its user, or null when it is
 * unknown, expired, already used or meant for something else. The update only
 * matches an unused row, so two clicks at once can't both succeed.
 */
export async function consumeEmailToken(token: unknown, purposes: EmailTokenPurpose[]) {
  if (typeof token !== "string" || !token) return null;
  const tokenHash = hashToken(token);
  const { count } = await prisma.emailToken.updateMany({
    where: { tokenHash, purpose: { in: purposes }, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (count !== 1) return null;
  return prisma.emailToken.findUnique({ where: { tokenHash }, include: { user: true } });
}
