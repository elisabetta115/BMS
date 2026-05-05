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
    const credential = await prisma.microCredential.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: "asc" } } },
    });
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
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    const body = await req.json();
    const { questions, ...fields } = body;

    // Update the credential fields
    const credential = await prisma.microCredential.update({
      where: { id },
      data: {
        ...fields,
        videoUrl: fields.videoUrl || null,
        pptUrl: fields.pptUrl || null,
      },
    });

    // Replace quiz questions if provided
    if (questions !== undefined) {
      await prisma.quizQuestion.deleteMany({ where: { credentialId: id } });
      if (questions.length > 0) {
        await prisma.quizQuestion.createMany({
          data: questions.map((q: any, i: number) => ({
            credentialId: id,
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            order: i,
          })),
        });
      }
    }

    const updated = await prisma.microCredential.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: "asc" } } },
    });

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
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

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
