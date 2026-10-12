import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { consumeEmailToken } from "@/lib/email-tokens";
import { emails, sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed, retryAfter } = rateLimit(`reset:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: `Too many requests. Try again in ${retryAfter}s.` }, { status: 429 });
  }

  try {
    const { token, password } = await req.json().catch(() => ({}));
    if (typeof password !== "string" || !password) {
      return NextResponse.json({ error: "Enter a new password." }, { status: 400 });
    }
    // Check the password before using up the link, so a typo doesn't waste it.
    const passwordError = validatePassword(password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    const record = await consumeEmailToken(token, ["RESET_PASSWORD"]);
    if (!record) {
      return NextResponse.json(
        { error: "This link has expired or has already been used. Please ask for a new one." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: await hashPassword(password),
        // The link reached their inbox, which also proves the address is theirs.
        emailVerifiedAt: record.user.emailVerifiedAt ?? new Date(),
      },
    });

    await sendEmail(record.user.email, emails.passwordChanged(record.user.name)).catch((err) =>
      console.error("Reset password: could not send password-changed alert:", err)
    );

    return NextResponse.json({ message: "Your password has been changed. You can now sign in." });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
