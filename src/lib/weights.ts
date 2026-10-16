// Unit weights are percentages of a micro-credential's grade and can be
// fractions, like Open edX's: 50% shared by 9 exercises is 5.5555…% each.
// Fractions don't add up exactly in floating point (nine of those make
// 49.99999999999999), so totals are compared with a small tolerance: half of
// the 0.01 that formatWeight shows, so a total shown as "100" counts as 100%.

const TOLERANCE = 0.005;

/** True when a total of unit weights is more than 100%. */
export function exceedsFullWeight(total: number): boolean {
  return total > 100 + TOLERANCE;
}

/** True when a total of unit weights is 100%. */
export function isFullWeight(total: number): boolean {
  return Math.abs(total - 100) <= TOLERANCE;
}

/** A weight for display, with at most two decimals: 5.5555… → "5.56", 50 → "50". */
export function formatWeight(weight: number): string {
  return String(Math.round(weight * 100) / 100);
}
