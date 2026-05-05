import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    const programme = await prisma.microProgramme.findUnique({
      where: { id },
      include: {
        credentials: {
          orderBy: { order: "asc" },
          include: { credential: true },
        },
      },
    });
    if (!programme) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({
      programme: {
        ...programme,
        credentials: programme.credentials.map((pc: any) => pc.credential),
      },
    });
  } catch (err) {
    console.error("Error fetching micro-programme:", err);
    return NextResponse.json({ error: "Failed to fetch." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    const body = await req.json();
    const programme = await prisma.microProgramme.update({ where: { id }, data: body });
    return NextResponse.json({ programme });
  } catch (err) {
    console.error("Error updating micro-programme:", err);
    return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    await prisma.microProgramme.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted." });
  } catch (err) {
    console.error("Error deleting micro-programme:", err);
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}
