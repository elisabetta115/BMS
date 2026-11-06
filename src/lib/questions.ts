// Checks on quiz questions, shared by the admin editor and the save routes.

/** True if the question's right answer is one of its options. */
export function hasValidAnswer(q: { options?: unknown; correctIndex?: unknown }): boolean {
  return Array.isArray(q.options) && Number.isInteger(q.correctIndex) && (q.correctIndex as number) >= 0 && (q.correctIndex as number) < q.options.length;
}

/**
 * For a micro-credential's content as the editor sends it: an error naming
 * the first quiz question without a valid right answer, or null if all have one.
 */
export function missingAnswerError(sections: any[] | undefined): string | null {
  for (const s of sections || [])
    for (const ss of s.subsections || [])
      for (const u of ss.units || []) {
        if (u.type !== "QUIZ") continue;
        const qi = (u.questions || []).findIndex((q: any) => !hasValidAnswer(q));
        if (qi >= 0) return `Choose the correct answer for question ${qi + 1} of the unit “${u.title || "Untitled"}”.`;
      }
  return null;
}
