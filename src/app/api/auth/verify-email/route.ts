import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createSessionToken, setSessionCookie } from "@/lib/auth";
import { consumeEmailToken } from "@/lib/email-tokens";
import { emails, sendEmail } from "@/lib/email";

// Called by /verify-email with the token from the emailed link. Handles both the
// sign-up confirmation and confirming a new address from the profile page.
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json().catch(() => ({}));
    const record = await consumeEmailToken(token, ["VERIFY_EMAIL", "CHANGE_EMAIL"]);
    if (!record) {
      return NextResponse.json({ error: "This link has expired or has already been used." }, { status: 400 });
    }

    if (record.purpose === "VERIFY_EMAIL") {
      if (!record.user.emailVerifiedAt) {
        await prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
      }
      return NextResponse.json({ purpose: record.purpose, message: "Your email is confirmed. You can now sign in." });
    }

    // CHANGE_EMAIL: the address may have been taken since the link was sent.
    const newEmail = record.newEmail!;
    const taken = await prisma.user.findUnique({ where: { email: newEmail } });
    if (taken && taken.id !== record.userId) {
      if (taken.emailVerifiedAt) {
        return NextResponse.json({ error: "This email is already used by another account." }, { status: 409 });
      }
      // An unconfirmed sign-up with that address; this click proves the address is this user's.
      await prisma.user.delete({ where: { id: taken.id } });
    }

    const oldEmail = record.user.email;
    const updated = await prisma.user.update({
      where: { id: record.userId },
      data: { email: newEmail, emailVerifiedAt: new Date() },
    });

    await sendEmail(oldEmail, emails.emailChanged(updated.name, newEmail)).catch((err) =>
      console.error("Verify email: could not notify old address:", err)
    );

    // If this browser is signed in as the same user, show the new address straight away.
    const session = await getSession();
    if (session?.userId === updated.id) {
      await setSessionCookie(
        await createSessionToken({
          userId: updated.id,
          email: updated.email,
          name: updated.name,
          username: updated.username,
          role: updated.role,
        })
      );
    }

    return NextResponse.json({ purpose: record.purpose, message: `Your email address is now ${newEmail}.` });
  } catch (err) {
    console.error("Verify email error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
