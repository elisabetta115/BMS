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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    const credential = await prisma.microCredential.findUnique({ where: { id }, include: INCLUDE_FULL });
    if (!credential) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ credential });
  } catch (err) {
    console.error("Error fetching micro-credential:", err);
    return NextResponse.json({ error: "Failed to fetch." }, { status: 500 });
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
    const body = await req.json();
    const { sections, ...fields } = body;

    // Update scalar fields
    const updateData: any = {};
    for (const key of ["title", "slug", "code", "project", "description", "image", "developedBy", "passGrade"]) {
      if (fields[key] !== undefined) updateData[key] = fields[key] === "" ? null : fields[key];
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.microCredential.update({ where: { id }, data: updateData });
    }

    // Rebuild sections if provided
    if (sections !== undefined) {
      // Delete all existing sections (cascades to subsections, units, questions)
      await prisma.credentialSection.deleteMany({ where: { credentialId: id } });

      // Recreate
      for (let si = 0; si < sections.length; si++) {
        const sec = sections[si];
        const createdSec = await prisma.credentialSection.create({
          data: { credentialId: id, title: sec.title, order: si },
        });
        for (let ssi = 0; ssi < (sec.subsections || []).length; ssi++) {
          const sub = sec.subsections[ssi];
          const createdSub = await prisma.credentialSubsection.create({
            data: { sectionId: createdSec.id, title: sub.title, order: ssi },
          });
          for (let ui = 0; ui < (sub.units || []).length; ui++) {
            const unit = sub.units[ui];
            const createdUnit = await prisma.credentialUnit.create({
              data: { subsectionId: createdSub.id, title: unit.title, type: unit.type, order: ui, videoUrl: unit.videoUrl || null },
            });
            if (unit.questions && unit.questions.length > 0) {
              await prisma.unitQuestion.createMany({
                data: unit.questions.map((q: any, qi: number) => ({
                  unitId: createdUnit.id, question: q.question, options: q.options, correctIndex: q.correctIndex, order: qi,
                })),
              });
            }
          }
        }
      }
    }

    const updated = await prisma.microCredential.findUnique({ where: { id }, include: INCLUDE_FULL });
    return NextResponse.json({ credential: updated });
  } catch (err) {
    console.error("Error updating micro-credential:", err);
    return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized." }, { status: 403 });

  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    await prisma.microCredential.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted." });
  } catch (err) {
    console.error("Error deleting micro-credential:", err);
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}
