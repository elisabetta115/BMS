import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
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
    const { credentialIds } = await req.json();

    if (!Array.isArray(credentialIds)) {
      return NextResponse.json({ error: "credentialIds must be an array." }, { status: 400 });
    }

    // Verify programme exists
    const programme = await prisma.microProgramme.findUnique({ where: { id } });
    if (!programme) {
      return NextResponse.json({ error: "Programme not found." }, { status: 404 });
    }

    // Delete all existing links
    await prisma.programmeCredential.deleteMany({ where: { programmeId: id } });

    // Create new links in order
    if (credentialIds.length > 0) {
      await prisma.programmeCredential.createMany({
        data: credentialIds.map((credentialId: string, index: number) => ({
          programmeId: id,
          credentialId,
          order: index,
        })),
      });
    }

    return NextResponse.json({ message: "Credentials updated.", count: credentialIds.length });
  } catch (err) {
    console.error("Error linking credentials:", err);
    return NextResponse.json({ error: "Failed to update credentials." }, { status: 500 });
  }
}
