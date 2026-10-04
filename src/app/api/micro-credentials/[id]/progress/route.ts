import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCredentialProgress } from "@/lib/grading";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    if (!prisma) return NextResponse.json({ error: "Not configured." }, { status: 500 });

    const { id } = await params;

    const { completedUnitIds, currentGrade, hasPassed } = await getCredentialProgress(session.userId, id);

    return NextResponse.json({ completedUnitIds, currentGrade, hasPassed });
  } catch (err) {
    console.error("Error fetching progress:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
