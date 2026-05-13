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

function buildUnitCreate(u: any, ui: number) {
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
}

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    const credential = await prisma.microCredential.findUnique({
      where: { id },
      include: INCLUDE_FULL,
    });
    if (!credential) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ credential: stripBinaryFromCredential(credential) });
  } catch (err) {
    console.error("Error fetching credential:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    const { title, slug, code, project, description, developedBy, passGrade, sections, imageBase64, imageMime, removeImage } = await req.json();

    await prisma.credentialSection.deleteMany({ where: { credentialId: id } });

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (slug !== undefined) data.slug = slug;
    if (code !== undefined) data.code = code;
    if (project !== undefined) data.project = project;
    if (description !== undefined) data.description = description || null;
    if (developedBy !== undefined) data.developedBy = developedBy || null;
    if (passGrade !== undefined) data.passGrade = passGrade;

    if (imageBase64 && imageMime) {
      data.imageData = Buffer.from(imageBase64, "base64");
      data.imageMime = imageMime;
    } else if (removeImage) {
      data.imageData = null;
      data.imageMime = null;
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
                create: (ss.units || []).map((u: any, ui: number) => buildUnitCreate(u, ui)),
              },
            })),
          },
        })),
      };
    }

    const credential = await prisma.microCredential.update({
      where: { id },
      data,
      include: INCLUDE_FULL,
    });
    return NextResponse.json({ credential: stripBinaryFromCredential(credential) });
  } catch (err: any) {
    console.error("Error updating credential:", err);
    if (err?.code === "P2002") return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    await prisma.microCredential.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting credential:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
