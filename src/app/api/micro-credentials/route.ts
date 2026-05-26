// app/api/micro-credentials/route.ts
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
          fileData: undefined,
          hasFile: !!u.fileData,
        })),
      })),
    })),
  };
}

// Sum every unit weight across all sections/subsections — must be ≤ 100.
function validateWeights(sections: any[]): string | null {
  let total = 0;
  for (const s of sections || []) {
    for (const ss of s.subsections || []) {
      for (const u of ss.units || []) {
        const w = Number(u.weight) || 0;
        if (w < 0 || w > 100) return `Unit "${u.title || "(untitled)"}" weight must be between 0 and 100.`;
        total += w;
      }
    }
  }
  if (total > 100) return `Total unit weight is ${total}%. It must not exceed 100%.`;
  return null;
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
    if (!title || !code) return NextResponse.json({ error: "Title and code required." }, { status: 400 });

    const weightErr = validateWeights(sections || []);
    if (weightErr) return NextResponse.json({ error: weightErr }, { status: 400 });

    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const data: any = {
      title, slug: finalSlug, code,
      project: project || "",
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
                    weight: Number(u.weight) || 0,
                    videoUrl: u.videoUrl || null,
                  };
                  if (u.type === "PRESENTATION") {
                    const b64 = u.fileBase64 || u.pptxBase64;
                    const mime = u.fileMime || u.pptxMime;
                    const name = u.fileName || u.pptxName;
                    if (b64) {
                      unitData.fileData = Buffer.from(b64, "base64");
                      unitData.fileMime =
                        mime || "application/vnd.openxmlformats-officedocument.presentationml.presentation";
                      unitData.fileName = name || "file";
                    }
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