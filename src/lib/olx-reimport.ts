// Re-importing an Open edX course over a micro-credential that already exists
// ("replace" in the import). The archive carries no BMS ids, so each imported
// section, subsection, unit and quiz question is matched to the existing part
// it most likely is. The course is then saved in place by
// syncCredentialContent: matched parts keep their ids, and with them the
// learners' completions and answers. Parts no longer in the archive are
// removed, with the learners' records for them.
//
// Units are matched in passes, strictest first, each taking only what earlier
// passes left. The same type is always required.
//   1. same section, subsection and title   (unchanged, or reordered)
//   2. same subsection and title            (section renamed, or moved)
//   3. same section and title               (subsection renamed, or moved)
//   4. same content, wherever it is         (unit renamed or moved): a video
//      with the same link, a presentation with the same file name, a quiz
//      sharing the most question texts
//   5. same title, if no other unit has it  (moved anywhere else)
// Position alone is never enough: a different unit put where a removed one
// was must not inherit the learners' completions.
// Quiz questions are matched within their unit, by text, then by position
// when the options are the same (question text edited).

import type { Prisma } from "@prisma/client";
import type { ParsedQuestion, ParsedSection, ParsedSubsection, ParsedUnit } from "@/lib/olx-import";

type Tx = Prisma.TransactionClient;

const norm = (s: string | null | undefined) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

export interface ReimportReport {
  unitsKept: number;
  unitsAdded: number;
  unitsRemoved: number;
  questionsKept: number;
  questionsAdded: number;
  questionsRemoved: number;
}

/** The existing content of a micro-credential, as the matching needs it. */
export function loadExistingContent(tx: Tx, credentialId: string) {
  return tx.credentialSection.findMany({
    where: { credentialId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      subsections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          units: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              type: true,
              videoUrl: true,
              fileName: true,
              questions: { orderBy: { order: "asc" }, select: { id: true, question: true, options: true } },
            },
          },
        },
      },
    },
  });
}
type ExistingContent = Awaited<ReturnType<typeof loadExistingContent>>;

/**
 * One matching pass: each still-unmatched wanted item takes the first unused
 * candidate with the same key, in document order. A null key opts out.
 */
function matchPass<W, C extends { id: string }>(
  wanted: W[],
  candidates: C[],
  matched: Map<W, C>,
  used: Set<string>,
  keyOfWanted: (w: W) => string | null,
  keyOfCandidate: (c: C) => string | null,
) {
  const pools = new Map<string, C[]>();
  for (const c of candidates) {
    if (used.has(c.id)) continue;
    const k = keyOfCandidate(c);
    if (k === null) continue;
    if (!pools.has(k)) pools.set(k, []);
    pools.get(k)!.push(c);
  }
  for (const w of wanted) {
    if (matched.has(w)) continue;
    const k = keyOfWanted(w);
    if (k === null) continue;
    const c = pools.get(k)?.shift();
    if (c) {
      matched.set(w, c);
      used.add(c.id);
    }
  }
}

/** Keys that occur exactly once in `items`. */
function uniqueKeys<T>(items: T[], key: (t: T) => string): Set<string> {
  const counts = new Map<string, number>();
  for (const t of items) counts.set(key(t), (counts.get(key(t)) ?? 0) + 1);
  return new Set([...counts].filter(([, n]) => n === 1).map(([k]) => k));
}

interface NewUnit { unit: ParsedUnit; section: string; subsection: string; }
interface OldUnit {
  id: string; type: string; title: string; section: string; subsection: string;
  videoUrl: string | null; fileName: string | null;
  questions: { id: string; question: string; options: string[] }[];
}

/**
 * The archive's content in the shape the admin editor saves
 * (syncCredentialContent), carrying the ids of the existing parts it matched.
 * `fileKeys` holds the S3 keys the archive's files were uploaded to.
 */
export function matchReimport(parsed: ParsedSection[], existing: ExistingContent, fileKeys: Map<ParsedUnit, string>) {
  // Sections and subsections hold no learner data; matching them by title
  // just avoids needless new rows.
  const sectionMatch = new Map<ParsedSection, ExistingContent[number]>();
  const usedSections = new Set<string>();
  matchPass(parsed, existing, sectionMatch, usedSections, (s) => norm(s.title), (s) => norm(s.title));

  const newSubs = parsed.flatMap((s) => s.subsections.map((ss) => ({ ss, sectionId: sectionMatch.get(s)?.id ?? null })));
  const oldSubs = existing.flatMap((s) => s.subsections.map((ss) => ({ id: ss.id, title: ss.title, sectionId: s.id })));
  const subMatch = new Map<(typeof newSubs)[number], (typeof oldSubs)[number]>();
  const usedSubs = new Set<string>();
  matchPass(newSubs, oldSubs, subMatch, usedSubs, (n) => (n.sectionId ? `${n.sectionId}|${norm(n.ss.title)}` : null), (o) => `${o.sectionId}|${norm(o.title)}`);
  matchPass(newSubs, oldSubs, subMatch, usedSubs, (n) => norm(n.ss.title), (o) => norm(o.title));
  const subsectionId = new Map<ParsedSubsection, string>([...subMatch].map(([n, o]) => [n.ss, o.id]));

  // Units: what learners' completions hang off.
  const newUnits: NewUnit[] = parsed.flatMap((s) =>
    s.subsections.flatMap((ss) => ss.units.map((unit) => ({ unit, section: norm(s.title), subsection: norm(ss.title) }))),
  );
  const oldUnits: OldUnit[] = existing.flatMap((s) =>
    s.subsections.flatMap((ss) =>
      ss.units.map((u) => ({
        id: u.id, type: u.type, title: norm(u.title), section: norm(s.title), subsection: norm(ss.title),
        videoUrl: u.videoUrl, fileName: u.fileName, questions: u.questions,
      })),
    ),
  );
  const unitMatch = new Map<NewUnit, OldUnit>();
  const usedUnits = new Set<string>();
  const pass = (keyNew: (n: NewUnit) => string | null, keyOld: (o: OldUnit) => string | null) =>
    matchPass(newUnits, oldUnits, unitMatch, usedUnits, keyNew, keyOld);
  pass((n) => `${n.unit.type}|${n.section}|${n.subsection}|${norm(n.unit.title)}`, (o) => `${o.type}|${o.section}|${o.subsection}|${o.title}`);
  pass((n) => `${n.unit.type}|${n.subsection}|${norm(n.unit.title)}`, (o) => `${o.type}|${o.subsection}|${o.title}`);
  pass((n) => `${n.unit.type}|${n.section}|${norm(n.unit.title)}`, (o) => `${o.type}|${o.section}|${o.title}`);
  // 4. Same content.
  const contentKey = (type: string, video: string | null | undefined, file: string | null | undefined) =>
    type === "VIDEO" && video ? `VIDEO|${video.trim()}` : type === "PRESENTATION" && file ? `PRESENTATION|${norm(file)}` : null;
  pass((n) => contentKey(n.unit.type, n.unit.videoUrl, n.unit.file?.name), (o) => contentKey(o.type, o.videoUrl, o.fileName));
  for (const n of newUnits) {
    if (n.unit.type !== "QUIZ" || unitMatch.has(n)) continue;
    const texts = new Set((n.unit.questions || []).map((q) => norm(q.question)));
    let best: OldUnit | null = null;
    let bestShared = 0;
    for (const o of oldUnits) {
      if (o.type !== "QUIZ" || usedUnits.has(o.id)) continue;
      const shared = o.questions.filter((q) => texts.has(norm(q.question))).length;
      if (shared > bestShared) { best = o; bestShared = shared; }
    }
    if (best) { unitMatch.set(n, best); usedUnits.add(best.id); }
  }
  {
    const titleKey = (type: string, title: string) => `${type}|${title}`;
    const freeNew = uniqueKeys(newUnits.filter((n) => !unitMatch.has(n)), (n) => titleKey(n.unit.type, norm(n.unit.title)));
    const freeOld = uniqueKeys(oldUnits.filter((o) => !usedUnits.has(o.id)), (o) => titleKey(o.type, o.title));
    pass(
      (n) => (freeNew.has(titleKey(n.unit.type, norm(n.unit.title))) ? titleKey(n.unit.type, norm(n.unit.title)) : null),
      (o) => (freeOld.has(titleKey(o.type, o.title)) ? titleKey(o.type, o.title) : null),
    );
  }
  const unitOf = new Map<ParsedUnit, OldUnit>([...unitMatch].map(([n, o]) => [n.unit, o]));

  // Quiz questions, within each matched quiz: what learners' answers hang off.
  const questionId = new Map<ParsedQuestion, string>();
  for (const [n, o] of unitMatch) {
    if (n.unit.type !== "QUIZ") continue;
    const wanted = (n.unit.questions || []).map((q, i) => ({ q, i }));
    const candidates = o.questions.map((q, i) => ({ ...q, i }));
    const matched = new Map<(typeof wanted)[number], (typeof candidates)[number]>();
    const used = new Set<string>();
    const optionsKey = (i: number, options: string[]) => `${i}|${JSON.stringify(options.map(norm))}`;
    matchPass(wanted, candidates, matched, used, (w) => norm(w.q.question), (c) => norm(c.question));
    matchPass(wanted, candidates, matched, used, (w) => optionsKey(w.i, w.q.options), (c) => optionsKey(c.i, c.options));
    for (const [w, c] of matched) questionId.set(w.q, c.id);
  }

  const sections = parsed.map((s) => ({
    id: sectionMatch.get(s)?.id,
    title: s.title,
    subsections: s.subsections.map((ss) => ({
      id: subsectionId.get(ss),
      title: ss.title,
      units: ss.units.map((u) => {
        const unit: Record<string, any> = {
          id: unitOf.get(u)?.id,
          title: u.title,
          type: u.type,
          weight: Number(u.weight) || 0,
          videoUrl: u.type === "VIDEO" ? u.videoUrl || null : null,
        };
        if (u.type === "PRESENTATION") {
          const key = fileKeys.get(u);
          if (u.file && key) Object.assign(unit, { fileKey: key, fileMime: u.file.mime, fileName: u.file.name });
          else if (u.file) Object.assign(unit, { fileBase64: u.file.base64, fileMime: u.file.mime, fileName: u.file.name });
          else unit.removeFile = true;
        }
        if (u.type === "QUIZ") {
          unit.questions = (u.questions || []).map((q) => ({
            id: questionId.get(q),
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            title: q.title ?? null,
            maxAttempts: q.maxAttempts ?? null,
          }));
        }
        return unit;
      }),
    })),
  }));

  const oldQuestionCount = oldUnits.reduce((n, o) => n + o.questions.length, 0);
  const newQuestionCount = newUnits.reduce((n, u) => n + (u.unit.type === "QUIZ" ? u.unit.questions?.length ?? 0 : 0), 0);
  const report: ReimportReport = {
    unitsKept: unitMatch.size,
    unitsAdded: newUnits.length - unitMatch.size,
    unitsRemoved: oldUnits.length - unitMatch.size,
    questionsKept: questionId.size,
    questionsAdded: newQuestionCount - questionId.size,
    questionsRemoved: oldQuestionCount - questionId.size,
  };
  return { sections, report };
}
