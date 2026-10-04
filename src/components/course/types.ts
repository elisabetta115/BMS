export interface Question {
  id: string;
  /** The problem's own name; null for questions created before names were stored. */
  title: string | null;
  question: string;
  options: string[];
  /** Only sent to admins; learners get it from their answer after submitting. */
  correctIndex?: number;
  /** Tries allowed; null means unlimited. */
  maxAttempts: number | null;
  order: number;
}

/** The signed-in learner's answer to one question (from /api/micro-credentials/[id]/answers). */
export interface Answer {
  questionId: string;
  savedChoice: number | null;
  submittedChoice: number | null;
  attempts: number;
  correct: boolean | null;
  correctIndex: number | null;
}

export interface Unit {
  id: string;
  title: string;
  type: "VIDEO" | "PRESENTATION" | "QUIZ";
  order: number;
  weight: number;
  videoUrl: string | null;
  hasFile: boolean;
  questions: Question[];
}

export interface Subsection {
  id: string;
  title: string;
  order: number;
  units: Unit[];
}

export interface Section {
  id: string;
  title: string;
  order: number;
  subsections: Subsection[];
}

export interface CourseCredential {
  id: string;
  title: string;
  slug: string;
  code: string;
  project: string;
  description: string | null;
  overview: string | null;
  objectives: string | null;
  developedBy: string | null;
  passGrade: number;
  hasImage: boolean;
  sections: Section[];
}

export function flatUnits(credential: CourseCredential): Unit[] {
  return credential.sections.flatMap((s) => s.subsections.flatMap((ss) => ss.units));
}
