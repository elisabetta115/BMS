import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    if (!prisma) return NextResponse.json({ error: "Not configured." }, { status: 500 });

    const { id } = await params;

    const [completions, credential] = await Promise.all([
      prisma.unitCompletion.findMany({
        where: {
          userId: session.userId,
          unit: { subsection: { section: { credentialId: id } } },
        },
        select: { unitId: true, unit: { select: { weight: true } } },
      }),
      prisma.microCredential.findUnique({
        where: { id },
        select: { passGrade: true },
      }),
    ]);

    const completedUnitIds = completions.map(c => c.unitId);
    const currentGrade = completions.reduce((sum, c) => sum + c.unit.weight, 0);
    const hasPassed = !!credential && currentGrade >= credential.passGrade;

    return NextResponse.json({ completedUnitIds, currentGrade, hasPassed });
  } catch (err) {
    console.error("Error fetching progress:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
