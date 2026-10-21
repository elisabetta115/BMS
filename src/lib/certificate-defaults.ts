// Certificate settings shared with the admin form. Kept apart from certificate.ts so the
// form can use them without bundling pdf-lib.

export interface CertificateLayout {
  introText: string;
  closingText: string;
  /** Content box, in % of the page: top and bottom edges, and width (centred). */
  contentTop: number;
  contentBottom: number;
  contentWidth: number;
}

export const DEFAULT_CONTENT_BOX = { contentTop: 10, contentBottom: 70, contentWidth: 64 };

/** Same wording as the backfill in prisma/certificate-text-layout.sql. */
export function defaultIntroText(project: string) {
  return `successfully completed, received a passing grade, and was awarded this ${project || "[project]"} Certificate of Completion in`;
}
