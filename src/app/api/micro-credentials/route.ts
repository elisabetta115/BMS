import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    if (!prisma) {
      return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    }
    const credentials = await prisma.microCredential.findMany({
      orderBy: { code: "asc" },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ credentials });
  } catch (err) {
    console.error("Error fetching micro-credentials:", err);
    return NextResponse.json({ error: "Failed to fetch micro-credentials." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  try {
    if (!prisma) {
      return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    }

    const body = await req.json();
    const { title, slug, code, project, description, image, developedBy, passGrade, videoUrl, pptUrl, questions } = body;

    if (!title || !slug || !code || !project) {
      return NextResponse.json({ error: "Title, slug, code, and project are required." }, { status: 400 });
    }

    const credential = await prisma.microCredential.create({
      data: {
        title,
        slug,
        code,
        project,
        description: description || null,
        image: image || null,
        developedBy: developedBy || null,
        passGrade: passGrade || 50,
        videoUrl: videoUrl || null,
        pptUrl: pptUrl || null,
        questions: questions && questions.length > 0
          ? {
              create: questions.map((q: any, i: number) => ({
                question: q.question,
                options: q.options,
                correctIndex: q.correctIndex,
                order: i,
              })),
            }
          : undefined,
      },
      include: { questions: true },
    });

    return NextResponse.json({ credential }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating micro-credential:", err);
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "A micro-credential with this slug already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create micro-credential." }, { status: 500 });
  }
}
