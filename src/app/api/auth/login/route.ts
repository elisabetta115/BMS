import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

async function findUserByEmailOrName(identifier: string) {
  // Try email first
  const byEmail = await findUserByEmail(identifier.toLowerCase().trim());
  if (byEmail) return byEmail;

  // Try by name (case-insensitive) via Prisma
  if (prisma) {
    const byName = await prisma.user.findFirst({
      where: {
        name: { equals: identifier.trim(), mode: "insensitive" },
      },
    });
    return byName;
  }

  return null;
}

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
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email/name and password are required." }, { status: 400 });
    }

    const user = await findUserByEmailOrName(email);

    if (!user) {
      await verifyPassword(password, "$2a$12$000000000000000000000000000000000000000000");
      return NextResponse.json({ error: "Invalid email/name or password." }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email/name or password." }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      message: "Logged in successfully.",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
