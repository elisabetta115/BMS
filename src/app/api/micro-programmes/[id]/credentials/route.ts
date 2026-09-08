import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

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
