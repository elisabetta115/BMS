// Saves a micro-credential's content (sections → subsections → units → quiz
// questions) as the admin editor sends it, by updating the existing rows in
// place, matched by id, instead of deleting and recreating them all.
//
// Learners' unit completions and quiz answers point at unit and question ids,
// so keeping the ids keeps their progress. Only the parts the admin actually
// removed are deleted, together with the learners' records for them.
//
// Answers store the chosen option's position. When a question's options
// change, each answer is moved to where its option now is, and re-marked
// (see reworkAnswers).

import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

const DEFAULT_FILE_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/** True if any field in `data` differs from `old` (a new uploaded file always counts as a change). */
function differs(old: Record<string, any>, data: Record<string, any>): boolean {
  return Object.entries(data).some(([key, value]) => {
    if (key === "fileData") return Buffer.isBuffer(value);
    return JSON.stringify(old[key] ?? null) !== JSON.stringify(value ?? null);
  });
}

/**
 * The existing row for an id the editor sent, if it belongs to this
 * micro-credential and hasn't been used yet in this save. Ids from elsewhere
 * (another course's unit) or repeated ids are treated as new parts, so a save
 * can never take over or duplicate rows it doesn't own.
 */
function claim<T>(id: unknown, existing: Map<string, T>, kept: Set<string>): T | null {
  if (typeof id !== "string" || kept.has(id)) return null;
  const row = existing.get(id);
  if (!row) return null;
  kept.add(id);
  return row;
}

interface OldUnit {
  id: string;
  fileKey: string | null;
  fileMime: string | null;
  fileName: string | null;
}

/** A unit's columns from the editor's data. Mirrors what creating the unit from scratch used to store. */
function unitData(u: any, order: number, subsectionId: string, old: OldUnit | null): Record<string, any> {
  const data: Record<string, any> = {
    subsectionId,
    title: String(u.title ?? ""),
    type: u.type,
    order,
    weight: Number(u.weight) || 0,
    videoUrl: u.videoUrl || null,
  };
  const hadFile = !!(old && (old.fileKey || old.fileMime || old.fileName));
  const clearFile = () => Object.assign(data, { fileData: null, fileKey: null, fileMime: null, fileName: null });

  if (u.type !== "PRESENTATION") {
    if (hadFile) clearFile();
    return data;
  }

  const b64 = u.fileBase64 || u.pptxBase64;
  const mime = u.fileMime || u.pptxMime;
  const name = u.fileName || u.pptxName;
  if (u.fileKey) {
    // A file in S3: the one it already had, or a new upload.
    Object.assign(data, { fileKey: String(u.fileKey), fileMime: mime || DEFAULT_FILE_MIME, fileName: name || "file" });
    if (old && old.fileKey !== u.fileKey) data.fileData = null;
  } else if (b64) {
    // A file sent in the request, kept in the database.
    Object.assign(data, { fileData: Buffer.from(b64, "base64"), fileKey: null, fileMime: mime || DEFAULT_FILE_MIME, fileName: name || "file" });
  } else if (u.removeFile && hadFile) {
    clearFile();
  }
  // Otherwise the file wasn't touched: the editor never sends a database-kept
  // file's bytes back, so leave the stored file as it is.
  return data;
}

function questionData(q: any, order: number, unitId: string): Record<string, any> {
  return {
    unitId,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    order,
    title: q.title || null,
    maxAttempts: Number.isInteger(q.maxAttempts) && q.maxAttempts > 0 ? q.maxAttempts : null,
  };
}

/**
 * Where each old option is in the new list, or null if it was removed: the
 * same text first (each new option taken once), else the same position when
 * the option there was edited rather than moved.
 */
export function mapOptions(oldOptions: string[], newOptions: string[]): (number | null)[] {
  const key = (o: string) => o.trim().replace(/\s+/g, " ").toLowerCase();
  const map: (number | null)[] = oldOptions.map(() => null);
  const taken = new Set<number>();
  oldOptions.forEach((o, i) => {
    const j = newOptions.findIndex((n, j) => !taken.has(j) && key(n) === key(o));
    if (j >= 0) { map[i] = j; taken.add(j); }
  });
  oldOptions.forEach((_, i) => {
    if (map[i] === null && i < newOptions.length && !taken.has(i) && !oldOptions.some((o) => key(o) === key(newOptions[i]))) {
      map[i] = i;
      taken.add(i);
    }
  });
  return map;
}

interface Rework {
  questionId: string;
  unitId: string;
  /** Old option position → new one (null: removed). Null when the options didn't change. */
  map: (number | null)[] | null;
  correctIndex: number;
}

/**
 * Updates learners' answers to questions whose options or right answer
 * changed: each saved / submitted choice follows its option to its new
 * position and the submitted one is re-marked. An answer whose submitted
 * option was removed is reset, so the learner can answer the question again.
 */
async function reworkAnswers(tx: Tx, reworks: Rework[]) {
  const resetIn = new Map<string, Set<string>>(); // unitId → learners whose answer there was reset
  for (const r of reworks) {
    const answers = await tx.questionAnswer.findMany({
      where: { questionId: r.questionId },
      select: { id: true, userId: true, savedChoice: true, submittedChoice: true, correct: true },
    });
    const move = (c: number | null) => (c === null ? null : r.map ? r.map[c] ?? null : c);
    const reset: string[] = [];
    // Updates grouped by their new values, applied to row ids: updating by old
    // values instead would let a swap (0↔1) re-move rows already moved.
    const updates = new Map<string, { data: { savedChoice: number | null; submittedChoice: number | null; correct: boolean | null }; ids: string[] }>();
    for (const a of answers) {
      const submitted = move(a.submittedChoice);
      if (a.submittedChoice !== null && submitted === null) {
        reset.push(a.id);
        if (!resetIn.has(r.unitId)) resetIn.set(r.unitId, new Set());
        resetIn.get(r.unitId)!.add(a.userId);
        continue;
      }
      const data = { savedChoice: move(a.savedChoice), submittedChoice: submitted, correct: submitted === null ? a.correct : submitted === r.correctIndex };
      if (data.savedChoice === a.savedChoice && data.submittedChoice === a.submittedChoice && data.correct === a.correct) continue;
      const k = JSON.stringify(data);
      if (!updates.has(k)) updates.set(k, { data, ids: [] });
      updates.get(k)!.ids.push(a.id);
    }
    if (reset.length) await tx.questionAnswer.deleteMany({ where: { id: { in: reset } } });
    for (const { data, ids } of updates.values()) await tx.questionAnswer.updateMany({ where: { id: { in: ids } }, data });
  }

  // A completed quiz with no submitted answers left would earn its full weight
  // (grading's rule for quizzes finished before answers were recorded), so a
  // learner whose only answers were reset gets the quiz back to do again.
  for (const [unitId, users] of resetIn) {
    for (const userId of users) {
      const left = await tx.questionAnswer.count({ where: { userId, attempts: { gt: 0 }, question: { unitId } } });
      if (left === 0) await tx.unitCompletion.deleteMany({ where: { userId, unitId } });
    }
  }
}

export async function syncCredentialContent(tx: Tx, credentialId: string, sections: any[]): Promise<void> {
  const existing = await tx.credentialSection.findMany({
    where: { credentialId },
    select: {
      id: true, title: true, order: true,
      subsections: {
        select: {
          id: true, sectionId: true, title: true, order: true,
          units: {
            select: {
              id: true, subsectionId: true, title: true, type: true, order: true, weight: true, videoUrl: true,
              fileKey: true, fileMime: true, fileName: true,
              questions: {
                select: { id: true, unitId: true, title: true, question: true, options: true, correctIndex: true, order: true, maxAttempts: true },
              },
            },
          },
        },
      },
    },
  });

  const oldSections = new Map(existing.map((s) => [s.id, s]));
  const oldSubsections = new Map(existing.flatMap((s) => s.subsections).map((ss) => [ss.id, ss]));
  const oldUnits = new Map([...oldSubsections.values()].flatMap((ss) => ss.units).map((u) => [u.id, u]));
  const oldQuestions = new Map([...oldUnits.values()].flatMap((u) => u.questions).map((q) => [q.id, q]));

  const kept = { sections: new Set<string>(), subsections: new Set<string>(), units: new Set<string>(), questions: new Set<string>() };
  const reworks: Rework[] = [];

  for (const [si, s] of (sections || []).entries()) {
    const sData = { title: String(s.title ?? ""), order: si };
    const oldS = claim(s.id, oldSections, kept.sections);
    let sectionId: string;
    if (oldS) {
      sectionId = oldS.id;
      if (differs(oldS, sData)) await tx.credentialSection.update({ where: { id: sectionId }, data: sData });
    } else {
      sectionId = (await tx.credentialSection.create({ data: { ...sData, credentialId }, select: { id: true } })).id;
    }

    for (const [ssi, ss] of (s.subsections || []).entries()) {
      const ssData = { sectionId, title: String(ss.title ?? ""), order: ssi };
      const oldSs = claim(ss.id, oldSubsections, kept.subsections);
      let subsectionId: string;
      if (oldSs) {
        subsectionId = oldSs.id;
        if (differs(oldSs, ssData)) await tx.credentialSubsection.update({ where: { id: subsectionId }, data: ssData });
      } else {
        subsectionId = (await tx.credentialSubsection.create({ data: ssData, select: { id: true } })).id;
      }

      for (const [ui, u] of (ss.units || []).entries()) {
        const oldU = claim(u.id, oldUnits, kept.units);
        const uData = unitData(u, ui, subsectionId, oldU);
        let unitId: string;
        if (oldU) {
          unitId = oldU.id;
          if (differs(oldU, uData)) await tx.credentialUnit.update({ where: { id: unitId }, data: uData as any });
        } else {
          unitId = (await tx.credentialUnit.create({ data: uData as any, select: { id: true } })).id;
        }

        // Only quizzes have questions; any others the unit had are deleted below, as before.
        if (u.type !== "QUIZ") continue;
        for (const [qi, q] of (u.questions || []).entries()) {
          const qData = questionData(q, qi, unitId);
          const oldQ = claim(q.id, oldQuestions, kept.questions);
          if (oldQ) {
            if (differs(oldQ, qData)) await tx.unitQuestion.update({ where: { id: oldQ.id }, data: qData as any });
            const optionsChanged = JSON.stringify(oldQ.options) !== JSON.stringify(qData.options);
            if (optionsChanged || oldQ.correctIndex !== qData.correctIndex) {
              reworks.push({ questionId: oldQ.id, unitId, map: optionsChanged ? mapOptions(oldQ.options, qData.options) : null, correctIndex: qData.correctIndex });
            }
          } else {
            await tx.unitQuestion.create({ data: qData as any });
          }
        }
      }
    }
  }

  // Delete what the admin removed. Anything kept was moved to its new parent
  // above, so deleting an old parent can't take a kept part with it.
  const removed = (all: Map<string, unknown>, keep: Set<string>) => [...all.keys()].filter((id) => !keep.has(id));
  const removedQuestions = removed(oldQuestions, kept.questions);
  const removedUnits = removed(oldUnits, kept.units);
  const removedSubsections = removed(oldSubsections, kept.subsections);
  const removedSections = removed(oldSections, kept.sections);
  if (removedQuestions.length) await tx.unitQuestion.deleteMany({ where: { id: { in: removedQuestions } } });
  if (removedUnits.length) await tx.credentialUnit.deleteMany({ where: { id: { in: removedUnits } } });
  if (removedSubsections.length) await tx.credentialSubsection.deleteMany({ where: { id: { in: removedSubsections } } });
  if (removedSections.length) await tx.credentialSection.deleteMany({ where: { id: { in: removedSections } } });

  await reworkAnswers(tx, reworks);
}
