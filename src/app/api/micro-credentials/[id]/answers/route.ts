import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** The signed-in learner's answers to every quiz question in a micro-credential. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  try {
    const { id } = await params;
    const answers = await prisma.questionAnswer.findMany({
      where: { userId: session.userId, question: { unit: { subsection: { section: { credentialId: id } } } } },
      select: {
        questionId: true,
        savedChoice: true,
        submittedChoice: true,
        attempts: true,
        correct: true,
        question: { select: { correctIndex: true } },
      },
    });
    return NextResponse.json({
      answers: answers.map(({ question, ...a }) => ({
        ...a,
        correctIndex: a.attempts > 0 ? question.correctIndex : null,
      })),
    });
  } catch (err) {
    console.error("Error fetching answers:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
