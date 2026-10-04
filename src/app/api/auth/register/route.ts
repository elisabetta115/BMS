import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, findUserByUsername, createUser } from "@/lib/db";
import {
  hashPassword,
  validatePassword,
  validateEmail,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// Same choices as the live registration form.
const GENDERS = ["m", "f", "nb", "pn", "o"];

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed, retryAfter } = rateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${retryAfter}s.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { name, email, password, country, gender, termsAccepted } = body;
    const username = typeof body.username === "string" ? body.username.trim() : "";

    if (!name || !username || !email || !password || !country) {
      return NextResponse.json(
        { error: "Full name, username, email, password and country are required." },
        { status: 400 }
      );
    }
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: "Name must be between 2 and 100 characters." }, { status: 400 });
    }
    if (username.length < 2 || username.length > 30) {
      return NextResponse.json({ error: "Username must be between 2 and 30 characters." }, { status: 400 });
    }
    if (!/^[A-Za-z0-9_-]+$/.test(username)) {
      return NextResponse.json(
        { error: "Usernames can only contain letters (A-Z, a-z), numerals (0-9), underscores (_), and hyphens (-)." },
        { status: 400 }
      );
    }
    if (gender && !GENDERS.includes(gender)) {
      return NextResponse.json({ error: "Please select a valid gender." }, { status: 400 });
    }
    if (termsAccepted !== true) {
      return NextResponse.json({ error: "You must agree to the Terms and Conditions." }, { status: 400 });
    }
    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const existing = await findUserByEmail(email.toLowerCase().trim());
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    if (await findUserByUsername(username)) {
      return NextResponse.json(
        { error: `It looks like ${username} belongs to an existing account. Try again with a different username.` },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({
      name: name.trim(),
      username,
      email: email.toLowerCase().trim(),
      passwordHash,
      country: country.trim(),
      gender: gender || null,
    });

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      role: user.role,
    });
    await setSessionCookie(token);

    return NextResponse.json(
      { message: "Account created successfully.", user: { id: user.id, name: user.name, email: user.email, role: user.role } },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
