import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProgrammeAccess } from "@/lib/admin";

/** Sets which micro-credentials are in the programme, in order: body { credentialIds }. */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireProgrammeAccess(id);
  if (auth instanceof NextResponse) return auth;

  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { credentialIds } = await req.json();

    if (!Array.isArray(credentialIds) || credentialIds.some((c) => typeof c !== "string")) {
      return NextResponse.json({ error: "credentialIds must be a list of ids." }, { status: 400 });
    }
    if (new Set(credentialIds).size !== credentialIds.length) {
      return NextResponse.json({ error: "A micro-credential is listed twice." }, { status: 400 });
    }

    const programme = await prisma.microProgramme.findUnique({ where: { id }, select: { id: true } });
    if (!programme) {
      return NextResponse.json({ error: "Programme not found." }, { status: 404 });
    }

    // Programme admins may add any existing micro-credential too, which then
    // lets them edit it (see src/lib/admin.ts).
    const found = await prisma.microCredential.count({ where: { id: { in: credentialIds } } });
    if (found !== credentialIds.length) {
      return NextResponse.json({ error: "One of these micro-credentials no longer exists. Reload the page and try again." }, { status: 400 });
    }

    // Replace the list in one transaction: if writing the new list fails, the
    // old one stays, rather than the programme being left with none.
    await prisma.$transaction([
      prisma.programmeCredential.deleteMany({ where: { programmeId: id } }),
      prisma.programmeCredential.createMany({
        data: credentialIds.map((credentialId: string, index: number) => ({ programmeId: id, credentialId, order: index })),
      }),
    ]);

    return NextResponse.json({ message: "Credentials updated.", count: credentialIds.length });
  } catch (err) {
    console.error("Error linking credentials:", err);
    return NextResponse.json({ error: "Failed to update credentials." }, { status: 500 });
  }
}
