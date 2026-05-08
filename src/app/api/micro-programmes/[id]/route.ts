import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const INCLUDE_FULL = {
  credentials: {
    orderBy: { order: "asc" as const },
    include: {
      credential: {
        include: {
          sections: {
            orderBy: { order: "asc" as const },
            include: { subsections: { orderBy: { order: "asc" as const }, include: { units: { orderBy: { order: "asc" as const }, include: { questions: { orderBy: { order: "asc" as const } } } } } } },
          },
        },
      },
    },
  },
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    const p = await prisma.microProgramme.findUnique({ where: { id }, include: INCLUDE_FULL });
    if (!p) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ programme: { ...p, credentials: p.credentials.map((pc: any) => pc.credential) } });
  } catch (err) { console.error(err); return NextResponse.json({ error: "Failed." }, { status: 500 }); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    const body = await req.json();
    const data: any = {};
    for (const k of ["title", "slug", "code", "project", "description", "image"]) { if (body[k] !== undefined) data[k] = body[k] || null; }
    const p = await prisma.microProgramme.update({ where: { id }, data, include: INCLUDE_FULL });
    return NextResponse.json({ programme: { ...p, credentials: p.credentials.map((pc: any) => pc.credential) } });
  } catch (err) { console.error(err); return NextResponse.json({ error: "Failed." }, { status: 500 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    await prisma.microProgramme.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted." });
  } catch (err) { console.error(err); return NextResponse.json({ error: "Failed." }, { status: 500 }); }
}
