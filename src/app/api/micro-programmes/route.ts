import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const programmes = await prisma.microProgramme.findMany({
      orderBy: { code: "asc" },
      include: {
        credentials: {
          orderBy: { order: "asc" },
          include: { credential: true },
        },
      },
    });
    // Flatten credentials
    const result = programmes.map((p: any) => ({
      ...p,
      credentials: p.credentials.map((pc: any) => pc.credential),
    }));
    return NextResponse.json({ programmes: result });
  } catch (err) {
    console.error("Error fetching micro-programmes:", err);
    return NextResponse.json({ error: "Failed to fetch micro-programmes." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const body = await req.json();
    const { title, slug, code, project, description, image } = body;

    if (!title || !slug || !code || !project) {
      return NextResponse.json({ error: "Title, slug, code, and project are required." }, { status: 400 });
    }

    const programme = await prisma.microProgramme.create({
      data: {
        title,
        slug,
        code,
        project,
        description: description || null,
        image: image || null,
      },
    });

    return NextResponse.json({ programme }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating micro-programme:", err);
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "A micro-programme with this slug already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create micro-programme." }, { status: 500 });
  }
}
