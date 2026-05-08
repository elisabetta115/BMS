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
          include: {
            credential: {
              include: {
                sections: {
                  orderBy: { order: "asc" },
                  include: { subsections: { orderBy: { order: "asc" }, include: { units: { orderBy: { order: "asc" }, include: { questions: { orderBy: { order: "asc" } } } } } } },
                },
              },
            },
          },
        },
      },
    });
    const result = programmes.map((p: any) => ({ ...p, credentials: p.credentials.map((pc: any) => pc.credential) }));
    return NextResponse.json({ programmes: result });
  } catch (err) {
    console.error("Error fetching micro-programmes:", err);
    return NextResponse.json({ error: "Failed to fetch." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { title, slug, code, project, description, image } = await req.json();
    if (!title || !slug || !code) return NextResponse.json({ error: "Title, slug, and code required." }, { status: 400 });
    const programme = await prisma.microProgramme.create({ data: { title, slug, code, project: project || "RES4CITY", description: description || null, image: image || null } });
    return NextResponse.json({ programme }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating micro-programme:", err);
    if (err?.code === "P2002") return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
    return NextResponse.json({ error: "Failed to create." }, { status: 500 });
  }
}
