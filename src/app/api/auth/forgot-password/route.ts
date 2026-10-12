import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, findUserByUsername } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { createEmailToken, sentRecently } from "@/lib/email-tokens";
import { appUrl, emails, sendEmail } from "@/lib/email";

// Same answer whether or not the account exists, so this can't be used to find
// out who is registered.
const SENT = {
  message: "If an account exists for that email or username, we've sent it a link to reset the password. Check your inbox.",
};

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed, retryAfter } = rateLimit(`forgot:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: `Too many requests. Try again in ${retryAfter}s.` }, { status: 429 });
  }

  try {
    const { email } = await req.json().catch(() => ({}));
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Enter your email or username." }, { status: 400 });
    }

    const user = (await findUserByEmail(email.toLowerCase().trim())) ?? (await findUserByUsername(email.trim()));
    if (user && !(await sentRecently(user.id, "RESET_PASSWORD"))) {
      const token = await createEmailToken(user.id, "RESET_PASSWORD");
      await sendEmail(user.email, emails.resetPassword(user.name, `${appUrl()}/reset-password?token=${token}`));
    }

    return NextResponse.json(SENT);
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "We couldn't send the email right now. Please try again in a few minutes." },
      { status: 503 }
    );
  }
}
