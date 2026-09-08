import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    if (!prisma) return NextResponse.json({ error: "Not configured." }, { status: 500 });

    const { unitId } = await params;

    try {
      await prisma.unitCompletion.upsert({
        where: { userId_unitId: { userId: session.userId, unitId } },
        create: { userId: session.userId, unitId },
        update: {},
      });
    } catch (upsertErr: any) {
      if (upsertErr?.code !== "P2002") throw upsertErr;
      // Race condition: another request already created the record — that's fine
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error completing unit:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
