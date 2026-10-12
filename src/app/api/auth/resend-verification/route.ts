import { NextRequest, NextResponse } from "next/server";
import { findUserByEmailOrName } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createEmailToken, sentRecently } from "@/lib/email-tokens";
import { appUrl, emails, sendEmail } from "@/lib/email";

// Sends the confirmation link again. Needs the account's password (the person has
// just typed it on the sign-in or register form), so it can't be used to spam
// arbitrary addresses.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed, retryAfter } = rateLimit(`resend:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: `Too many requests. Try again in ${retryAfter}s.` }, { status: 429 });
  }

  try {
    const { email, password } = await req.json().catch(() => ({}));
    if (!email || !password) {
      return NextResponse.json({ error: "Email/name and password are required." }, { status: 400 });
    }

    const user = await findUserByEmailOrName(email);
    if (!user) {
      await verifyPassword(password, "$2a$12$000000000000000000000000000000000000000000");
      return NextResponse.json({ error: "Invalid email/name or password." }, { status: 401 });
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email/name or password." }, { status: 401 });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({ message: "Your email is already confirmed. You can sign in now." });
    }
    if (await sentRecently(user.id, "VERIFY_EMAIL")) {
      return NextResponse.json(
        { error: "We've just sent you an email. Please wait a minute before asking for another one." },
        { status: 429 }
      );
    }

    const token = await createEmailToken(user.id, "VERIFY_EMAIL");
    await sendEmail(user.email, emails.verifyEmail(user.name, `${appUrl()}/verify-email?token=${token}`));

    return NextResponse.json({ message: `We've sent a new confirmation link to ${user.email}.` });
  } catch (err) {
    console.error("Resend verification error:", err);
    return NextResponse.json(
      { error: "We couldn't send the email right now. Please try again in a few minutes." },
      { status: 503 }
    );
  }
}
