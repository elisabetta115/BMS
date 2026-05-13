import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function stripBinaryFromCredential(c: any) {
  return {
    ...c,
    imageData: undefined,
    hasImage: !!c.imageData,
    sections: (c.sections || []).map((s: any) => ({
      ...s,
      subsections: (s.subsections || []).map((ss: any) => ({
        ...ss,
        units: (ss.units || []).map((u: any) => ({
          ...u,
          pptxData: undefined,
          hasPptx: !!u.pptxData,
        })),
      })),
    })),
  };
}

export async function GET() {
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const credentials = await prisma.microCredential.findMany({
      orderBy: { code: "asc" },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { subsections: { orderBy: { order: "asc" }, include: { units: { orderBy: { order: "asc" }, include: { questions: { orderBy: { order: "asc" } } } } } } },
        },
      },
    });
    const result = credentials.map(stripBinaryFromCredential);
    return NextResponse.json({ credentials: result });
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
    const { title, slug, code, project, description, developedBy, passGrade, sections, imageBase64, imageMime } = await req.json();
    if (!title || !slug || !code) return NextResponse.json({ error: "Title, slug, and code required." }, { status: 400 });

    const data: any = {
      title, slug, code,
      project: project || "RES4CITY",
      description: description || null,
      developedBy: developedBy || null,
      passGrade: passGrade || 50,
    };

    if (imageBase64 && imageMime) {
      data.imageData = Buffer.from(imageBase64, "base64");
      data.imageMime = imageMime;
    }

    if (sections && sections.length > 0) {
      data.sections = {
        create: sections.map((s: any, si: number) => ({
          title: s.title,
          order: si,
          subsections: {
            create: (s.subsections || []).map((ss: any, ssi: number) => ({
              title: ss.title,
              order: ssi,
              units: {
                create: (ss.units || []).map((u: any, ui: number) => {
                  const unitData: any = {
                    title: u.title,
                    type: u.type,
                    order: ui,
                    videoUrl: u.videoUrl || null,
                  };
                  if (u.type === "PRESENTATION" && u.pptxBase64) {
                    unitData.pptxData = Buffer.from(u.pptxBase64, "base64");
                    unitData.pptxMime = u.pptxMime || "application/vnd.openxmlformats-officedocument.presentationml.presentation";
                    unitData.pptxName = u.pptxName || "presentation.pptx";
                  }
                  if (u.type === "QUIZ" && u.questions?.length) {
                    unitData.questions = {
                      create: u.questions.map((q: any, qi: number) => ({
                        question: q.question,
                        options: q.options,
                        correctIndex: q.correctIndex,
                        order: qi,
                      })),
                    };
                  }
                  return unitData;
                }),
              },
            })),
          },
        })),
      };
    }

    const credential = await prisma.microCredential.create({
      data,
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { subsections: { orderBy: { order: "asc" }, include: { units: { orderBy: { order: "asc" }, include: { questions: { orderBy: { order: "asc" } } } } } } },
        },
      },
    });
    return NextResponse.json({
      credential: stripBinaryFromCredential(credential),
    }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating micro-credential:", err);
    if (err?.code === "P2002") return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
    return NextResponse.json({ error: "Failed to create." }, { status: 500 });
  }
}
