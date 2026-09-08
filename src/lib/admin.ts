import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 403 });

  if (prisma) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });
    if (user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  } else if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  return { userId: session.userId };
}
