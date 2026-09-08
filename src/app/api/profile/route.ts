import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword, verifyPassword, validatePassword, validateEmail, createSessionToken, setSessionCookie } from "@/lib/auth";
import { findUserById, findUserByEmail, updateUser } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const user = await findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ name: user.name, email: user.email, country: user.country });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, email, country, currentPassword, newPassword } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }
  if (name.length < 2 || name.length > 100) {
    return NextResponse.json({ error: "Name must be between 2 and 100 characters." }, { status: 400 });
  }
  if (!validateEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const user = await findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // If email changed, check it's not taken
  const normalEmail = email.toLowerCase().trim();
  if (normalEmail !== user.email) {
    const existing = await findUserByEmail(normalEmail);
    if (existing) return NextResponse.json({ error: "This email is already in use." }, { status: 409 });
  }

  // Always require current password
  if (!currentPassword) {
    return NextResponse.json({ error: "Your current password is required to save changes." }, { status: 400 });
  }
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const patch: Parameters<typeof updateUser>[1] = {
    name: name.trim(),
    email: normalEmail,
    country: country?.trim() || null,
  };

  // Set new password if provided
  if (newPassword) {
    const pwError = validatePassword(newPassword);
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });
    patch.passwordHash = await hashPassword(newPassword);
  }

  const updated = await updateUser(session.userId, patch);

  // Refresh session cookie so name/email changes are reflected immediately
  const token = await createSessionToken({
    userId: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
  });
  await setSessionCookie(token);

  return NextResponse.json({ message: "Profile updated successfully." });
}
