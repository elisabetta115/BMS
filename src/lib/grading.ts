import { prisma } from "./prisma";

export interface CredentialProgress {
  completedUnitIds: string[];
  /** Weighted grade, 0–100, rounded to a whole percent. */
  currentGrade: number;
  hasPassed: boolean;
}

/**
 * A learner's grade for one micro-credential, the way the live Open edX site
 * counts it: each unit is worth `weight`% of the grade. Videos and
 * presentations earn their weight once completed; a quiz earns its weight in
 * proportion to the questions answered correctly. Quizzes completed before
 * answers were recorded (old "all answers right" rule) keep their full weight.
 */
export async function getCredentialProgress(userId: string, credentialId: string): Promise<CredentialProgress> {
  if (!prisma) throw new Error("Database not configured.");

  const [credential, units, completions, answers] = await Promise.all([
    prisma.microCredential.findUnique({ where: { id: credentialId }, select: { passGrade: true } }),
    prisma.credentialUnit.findMany({
      where: { subsection: { section: { credentialId } } },
      select: { id: true, type: true, weight: true, questions: { select: { id: true } } },
    }),
    prisma.unitCompletion.findMany({
      where: { userId, unit: { subsection: { section: { credentialId } } } },
      select: { unitId: true },
    }),
    prisma.questionAnswer.findMany({
      where: { userId, attempts: { gt: 0 }, question: { unit: { subsection: { section: { credentialId } } } } },
      select: { questionId: true, correct: true },
    }),
  ]);

  const completed = new Set(completions.map((c) => c.unitId));
  const answered = new Map(answers.map((a) => [a.questionId, a.correct === true]));

  let grade = 0;
  for (const unit of units) {
    if (unit.type === "QUIZ" && unit.questions.length > 0) {
      const submitted = unit.questions.filter((q) => answered.has(q.id));
      if (submitted.length > 0) {
        const right = submitted.filter((q) => answered.get(q.id)).length;
        grade += (unit.weight * right) / unit.questions.length;
      } else if (completed.has(unit.id)) {
        grade += unit.weight;
      }
    } else if (completed.has(unit.id)) {
      grade += unit.weight;
    }
  }

  const currentGrade = Math.round(grade);
  return {
    completedUnitIds: [...completed],
    currentGrade,
    hasPassed: !!credential && currentGrade >= credential.passGrade,
  };
}
