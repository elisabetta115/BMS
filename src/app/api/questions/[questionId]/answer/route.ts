import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Save or submit a learner's answer to one quiz question, like an Open edX
 * problem: "save" stores the choice without grading; "submit" grades it and
 * uses one of the question's tries (null maxAttempts = unlimited).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ questionId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  try {
    const { questionId } = await params;
    const { choice, action } = await req.json().catch(() => ({}));
    if (action !== "save" && action !== "submit") {
      return NextResponse.json({ error: "Action must be 'save' or 'submit'." }, { status: 400 });
    }

    const question = await prisma.unitQuestion.findUnique({
      where: { id: questionId },
      select: {
        options: true,
        correctIndex: true,
        maxAttempts: true,
        unitId: true,
        unit: { select: { subsection: { select: { section: { select: { credentialId: true } } } } } },
      },
    });
    if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });
    if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) {
      return NextResponse.json({ error: "Please select an answer." }, { status: 400 });
    }

    const credentialId = question.unit.subsection.section.credentialId;
    const enrolled = await prisma.credentialEnrollment.findUnique({
      where: { userId_credentialId: { userId: session.userId, credentialId } },
      select: { id: true },
    });
    if (!enrolled) return NextResponse.json({ error: "You are not enrolled in this micro-credential." }, { status: 403 });

    const key = { userId_questionId: { userId: session.userId, questionId } };
    const existing = await prisma.questionAnswer.findUnique({ where: key });

    let answer;
    if (action === "save") {
      answer = await prisma.questionAnswer.upsert({
        where: key,
        create: { userId: session.userId, questionId, savedChoice: choice },
        update: { savedChoice: choice },
      });
    } else {
      if (question.maxAttempts !== null && (existing?.attempts ?? 0) >= question.maxAttempts) {
        return NextResponse.json({ error: "You have used all your attempts for this question." }, { status: 400 });
      }
      const correct = choice === question.correctIndex;
      answer = await prisma.questionAnswer.upsert({
        where: key,
        create: { userId: session.userId, questionId, savedChoice: choice, submittedChoice: choice, attempts: 1, correct },
        update: { savedChoice: choice, submittedChoice: choice, attempts: { increment: 1 }, correct },
      });

      // Once every question in the unit has been submitted, the unit counts as done for course completion.
      const [total, submitted] = await Promise.all([
        prisma.unitQuestion.count({ where: { unitId: question.unitId } }),
        prisma.questionAnswer.count({
          where: { userId: session.userId, attempts: { gt: 0 }, question: { unitId: question.unitId } },
        }),
      ]);
      if (submitted >= total) {
        await prisma.unitCompletion
          .upsert({
            where: { userId_unitId: { userId: session.userId, unitId: question.unitId } },
            create: { userId: session.userId, unitId: question.unitId },
            update: {},
          })
          .catch((e: { code?: string }) => {
            if (e?.code !== "P2002") throw e;
          });
      }
    }

    return NextResponse.json({
      answer: {
        questionId,
        savedChoice: answer.savedChoice,
        submittedChoice: answer.submittedChoice,
        attempts: answer.attempts,
        correct: answer.correct,
        // Only revealed after a submission, for "Show answer".
        correctIndex: answer.attempts > 0 ? question.correctIndex : null,
      },
    });
  } catch (err) {
    console.error("Error saving answer:", err);
    return NextResponse.json({ error: "Failed to save your answer." }, { status: 500 });
  }
}
