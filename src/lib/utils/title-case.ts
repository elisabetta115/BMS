const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with"]);

/**
 * A title typed all in capitals ("SERIOUS GAME", "FINAL EXAM") in title case,
 * the way the live site shows it: "Serious Game", "Risk Assessment and
 * Monitoring". Titles with any lowercase letter, and single words (likely an
 * acronym such as "ESG"), are left as they are.
 */
export function fixAllCapsTitle(title: string): string {
  if (/\p{Ll}/u.test(title) || !/\s/.test(title.trim())) return title;
  const words = title.trim().toLowerCase().split(/\s+/);
  return words
    .map((w, i) =>
      i > 0 && SMALL_WORDS.has(w) && !words[i - 1].endsWith(":") ? w : w.replace(/\p{L}/u, (c) => c.toUpperCase())
    )
    .join(" ");
}
