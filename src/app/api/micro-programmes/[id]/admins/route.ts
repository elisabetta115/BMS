// app/api/micro-programmes/[id]/admins/route.ts
// A programme's programme admins (see src/lib/admin.ts). Only site admins see
// or change them.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const USER_FIELDS = { id: true, name: true, username: true, email: true } as const;

/**
 * The programme's admins, or with ?search=… the learners (not site admins,
 * not already admins here) whose name, email or username contains it, as
 * suggestions while the site admin types.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;

    const search = req.nextUrl.searchParams.get("search");
    if (search !== null) {
      const q = search.trim();
      if (q.length < 2) return NextResponse.json({ candidates: [] });
      const candidates = await prisma.user.findMany({
        where: {
          role: "USER",
          managedProgrammes: { none: { programmeId: id } },
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { name: "asc" },
        take: 8,
        select: USER_FIELDS,
      });
      return NextResponse.json({ candidates });
    }

    const rows = await prisma.programmeAdmin.findMany({
      where: { programmeId: id },
      orderBy: { createdAt: "asc" },
      select: { user: { select: USER_FIELDS } },
    });
    return NextResponse.json({ admins: rows.map((r) => r.user) });
  } catch (err) {
    console.error("Error fetching programme admins:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}

/** Body: { identifier }, the learner's email address or username. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    const { identifier } = await req.json();
    const value = typeof identifier === "string" ? identifier.trim() : "";
    if (!value) return NextResponse.json({ error: "Enter the learner's email address or username." }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: value, mode: "insensitive" } },
          { username: { equals: value, mode: "insensitive" } },
        ],
      },
      select: { ...USER_FIELDS, role: true },
    });
    if (!user) return NextResponse.json({ error: "No account uses that email address or username. Type part of the learner's name, email or username and pick them from the list." }, { status: 404 });
    if (user.role === "ADMIN") {
      return NextResponse.json({ error: `${user.name} is a site admin and can already manage every programme.` }, { status: 400 });
    }

    const programme = await prisma.microProgramme.findUnique({ where: { id }, select: { id: true } });
    if (!programme) return NextResponse.json({ error: "Programme not found." }, { status: 404 });

    try {
      await prisma.programmeAdmin.create({ data: { userId: user.id, programmeId: id } });
    } catch (err: any) {
      if (err?.code === "P2002") {
        return NextResponse.json({ error: `${user.name} is already an admin of this programme.` }, { status: 409 });
      }
      throw err;
    }
    const { role: _role, ...admin } = user;
    return NextResponse.json({ admin }, { status: 201 });
  } catch (err) {
    console.error("Error adding programme admin:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}

/** ?userId=… */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });
    await prisma.programmeAdmin.deleteMany({ where: { programmeId: id, userId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error removing programme admin:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
