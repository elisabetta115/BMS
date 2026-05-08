import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const INCLUDE_FULL = {
  sections: {
    orderBy: { order: "asc" as const },
    include: {
      subsections: {
        orderBy: { order: "asc" as const },
        include: {
          units: {
            orderBy: { order: "asc" as const },
            include: { questions: { orderBy: { order: "asc" as const } } },
          },
        },
      },
    },
  },
};

export async function GET() {
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const credentials = await prisma.microCredential.findMany({ orderBy: { code: "asc" }, include: INCLUDE_FULL });
    return NextResponse.json({ credentials });
  } catch (err) {
    console.error("Error fetching micro-credentials:", err);
    return NextResponse.json({ error: "Failed to fetch." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized." }, { status: 403 });

  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { title, slug, code, project, description, image, developedBy, passGrade, sections } = await req.json();
    if (!title || !slug || !code || !project) return NextResponse.json({ error: "Title, slug, code, and project are required." }, { status: 400 });

    const credential = await prisma.microCredential.create({
      data: {
        title, slug, code, project,
        description: description || null, image: image || null,
        developedBy: developedBy || null, passGrade: passGrade || 50,
        sections: sections && sections.length > 0 ? {
          create: sections.map((sec: any, si: number) => ({
            title: sec.title, order: si,
            subsections: sec.subsections && sec.subsections.length > 0 ? {
              create: sec.subsections.map((sub: any, ssi: number) => ({
                title: sub.title, order: ssi,
                units: sub.units && sub.units.length > 0 ? {
                  create: sub.units.map((unit: any, ui: number) => ({
                    title: unit.title, type: unit.type, order: ui,
                    videoUrl: unit.videoUrl || null,
                    questions: unit.questions && unit.questions.length > 0 ? {
                      create: unit.questions.map((q: any, qi: number) => ({
                        question: q.question, options: q.options, correctIndex: q.correctIndex, order: qi,
                      })),
                    } : undefined,
                  })),
                } : undefined,
              })),
            } : undefined,
          })),
        } : undefined,
      },
      include: INCLUDE_FULL,
    });

    return NextResponse.json({ credential }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating micro-credential:", err);
    if (err?.code === "P2002") return NextResponse.json({ error: "A credential with this slug already exists." }, { status: 409 });
    return NextResponse.json({ error: "Failed to create." }, { status: 500 });
  }
}
