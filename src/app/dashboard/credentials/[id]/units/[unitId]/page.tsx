"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CircleCheck, ExternalLink, FileDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  order: number;
}

interface Unit {
  id: string;
  title: string;
  type: "VIDEO" | "PRESENTATION" | "QUIZ";
  order: number;
  weight: number;
  videoUrl: string | null;
  hasFile: boolean;
  questions: Question[];
}

interface Subsection {
  id: string;
  title: string;
  order: number;
  units: Unit[];
}

interface Section {
  id: string;
  title: string;
  order: number;
  subsections: Subsection[];
}

interface MicroCredential {
  id: string;
  title: string;
  code?: string;
  project?: string;
  sections: Section[];
}

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes("youtu.be")) videoId = u.pathname.slice(1);
    else if (u.hostname.includes("youtube.com")) videoId = u.searchParams.get("v");
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

function flatUnits(credential: MicroCredential): Unit[] {
  return credential.sections.flatMap((s) => s.subsections.flatMap((ss) => ss.units));
}

/* ── Quiz player ────────────────────────────────────────────── */
function QuizPlayer({ unit, onComplete }: { unit: Unit; onComplete: () => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => unit.questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  function select(qi: number, optionIdx: number) {
    if (submitted) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[qi] = optionIdx;
      return next;
    });
  }

  function submit() {
    if (answers.some((a) => a === null)) return;
    setSubmitted(true);
  }

  function retry() {
    setAnswers(unit.questions.map(() => null));
    setSubmitted(false);
    setAlreadyCompleted(false);
  }

  const correctCount = submitted ? unit.questions.filter((q, i) => answers[i] === q.correctIndex).length : 0;
  const total = unit.questions.length;
  const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const allCorrect = submitted && correctCount === total;
  const allAnswered = answers.every((a) => a !== null);

  useEffect(() => {
    if (allCorrect && !alreadyCompleted) {
      setAlreadyCompleted(true);
      onComplete();
    }
  }, [allCorrect, alreadyCompleted, onComplete]);

  if (total === 0) {
    return <p className="bms-learn-text">This quiz has no questions yet.</p>;
  }

  return (
    <div>
      <p className="bms-learn-quiz-warn">Answer every question. Get them all right to complete this unit.</p>

      {submitted && (
        <p
          className={cn(
            "bms-learn-feedback",
            scorePct === 100 ? "bms-learn-feedback-correct" : "bms-learn-feedback-incorrect"
          )}
        >
          {scorePct}% — {correctCount} / {total} correct.
          {unit.weight > 0 ? ` This quiz counts for ${unit.weight}% of your grade.` : ""}
          {scorePct < 100 ? " Get all answers right to complete this unit." : ""}
        </p>
      )}

      {unit.questions.map((q, qi) => {
        const chosen = answers[qi];
        return (
          <fieldset className="bms-learn-question" key={q.id}>
            <legend>
              <span className="bms-learn-qnum">Question {qi + 1}</span>
            </legend>
            <p className="bms-learn-qprompt">{q.question}</p>
            {q.options.map((opt, oi) => {
              const isSelected = chosen === oi;
              const isCorrectOpt = q.correctIndex === oi;
              return (
                <label
                  key={oi}
                  className={cn(
                    "bms-learn-option",
                    submitted && "is-locked",
                    submitted && isCorrectOpt && "is-answer",
                    submitted && isSelected && !isCorrectOpt && "is-wrong",
                    !submitted && isSelected && "is-chosen"
                  )}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={isSelected}
                    disabled={submitted}
                    onChange={() => select(qi, oi)}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </fieldset>
        );
      })}

      {!submitted ? (
        <button type="button" className="bms-learn-check" onClick={submit} disabled={!allAnswered}>
          {allAnswered ? "Submit answers" : `Answer all ${total} questions`}
        </button>
      ) : (
        <button type="button" className="bms-learn-check" onClick={retry}>
          Retry quiz
        </button>
      )}
    </div>
  );
}

/* ── Video player ───────────────────────────────────────────── */
function VideoPlayer({ unit, onComplete }: { unit: Unit; onComplete: () => void }) {
  useEffect(() => {
    onComplete();
  }, [onComplete]);

  if (!unit.videoUrl) return <p className="bms-learn-text">No video URL set for this unit.</p>;

  const embedUrl = youtubeEmbedUrl(unit.videoUrl);

  return (
    <div className="bms-learn-video">
      {embedUrl ? (
        <iframe
          src={embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={unit.title}
        />
      ) : (
        <video src={unit.videoUrl} controls title={unit.title} style={{ width: "100%", height: "100%" }} />
      )}
    </div>
  );
}

/* ── Presentation viewer ────────────────────────────────────── */
function PresentationViewer({ unit, onComplete }: { unit: Unit; onComplete: () => void }) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!unit.hasFile) return;
    let objectUrl: string | null = null;
    fetch(`/api/units/${unit.id}/pdf`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [unit.id, unit.hasFile]);

  if (!unit.hasFile) return <p className="bms-learn-text">No presentation file uploaded for this unit.</p>;

  const downloadUrl = `/pptx/${unit.id}`;

  if (status === "loading") {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border border-brand-line bg-brand-wash"
        style={{ height: "70vh", minHeight: 460 }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-green border-t-transparent" />
        <p className="bms-learn-video-hint">Preparing presentation…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-xl border border-brand-line bg-brand-wash px-8 text-center"
        style={{ height: "70vh", minHeight: 460 }}
      >
        <p className="bms-learn-text" style={{ margin: 0 }}>
          The presentation could not be displayed. Download it to view on your device.
        </p>
        <a href={downloadUrl} download onClick={onComplete} className="bms-learn-check">
          <FileDown aria-hidden="true" size={16} /> Download presentation
        </a>
      </div>
    );
  }

  return (
    <div>
      <div
        className="overflow-hidden rounded-xl border border-brand-line bg-brand-wash"
        style={{ height: "70vh", minHeight: 460 }}
      >
        <iframe src={blobUrl!} className="h-full w-full border-0" title={unit.title} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
        <a href={blobUrl!} target="_blank" rel="noopener noreferrer" className="bms-learn-nav">
          <ExternalLink aria-hidden="true" size={16} /> Open in new tab
        </a>
        <a href={downloadUrl} download onClick={onComplete} className="bms-learn-nav">
          <FileDown aria-hidden="true" size={16} /> Download .pptx
        </a>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */
export default function UnitViewerPage() {
  const router = useRouter();
  const params = useParams();
  const credentialId = params?.id as string;
  const unitId = params?.unitId as string;

  const [user, setUser] = useState<{ name: string } | null>(null);
  const [credential, setCredential] = useState<MicroCredential | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completedUnitIds, setCompletedUnitIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => {
        if (!r.ok) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.user) setUser(d.user);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    if (!user || !credentialId) return;
    Promise.all([
      fetch(`/api/micro-credentials/${credentialId}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/enrollments").then((r) => (r.ok ? r.json() : { credentials: [] })),
      fetch(`/api/micro-credentials/${credentialId}/progress`).then((r) =>
        r.ok ? r.json() : { completedUnitIds: [] }
      ),
    ])
      .then(([credRes, enrRes, progRes]) => {
        if (!credRes?.credential) {
          setError("Micro-credential not found.");
          return;
        }
        const cred: MicroCredential = credRes.credential;
        setCredential(cred);
        setEnrolled((enrRes.credentials || []).some((c: { id: string }) => c.id === credentialId));
        setCompletedUnitIds(new Set(progRes.completedUnitIds || []));
        const found = flatUnits(cred).find((u) => u.id === unitId) ?? null;
        if (!found) setError("Unit not found.");
        setUnit(found);
      })
      .catch(() => setError("Failed to load content."))
      .finally(() => setLoading(false));
  }, [user, credentialId, unitId]);

  const handleComplete = useCallback(() => {
    if (!unit || completedUnitIds.has(unit.id)) return;
    fetch(`/api/units/${unit.id}/complete`, { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success) setCompletedUnitIds((prev) => new Set([...prev, unit.id]));
      })
      .catch(() => {});
  }, [unit, completedUnitIds]);

  if (!user) return null;

  if (loading) {
    return (
      <>
        <Header />
        <main id="main" className="py-20">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-green border-t-transparent" />
          </div>
        </main>
      </>
    );
  }

  if (error || !credential || !unit) {
    return (
      <>
        <Header />
        <main id="main" className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <p className="mb-4 text-brand-muted">{error || "Content not found."}</p>
            <Link href={`/dashboard/credentials/${credentialId}`} className="font-semibold text-brand-green hover:underline">
              ← Back to credential
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (!enrolled) {
    return (
      <>
        <Header />
        <main id="main" className="py-16">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <p className="mb-4 text-brand-muted">You are not enrolled in this micro-credential.</p>
            <Link
              href={`/credentials/${credentialId}`}
              className="inline-flex items-center justify-center rounded-full bg-brand-green px-8 py-3 text-sm font-bold text-white"
            >
              View and enroll
            </Link>
          </div>
        </main>
      </>
    );
  }

  const allUnits = flatUnits(credential);
  const currentIdx = allUnits.findIndex((u) => u.id === unitId);
  const prevUnit = currentIdx > 0 ? allUnits[currentIdx - 1] : null;
  const nextUnit = currentIdx < allUnits.length - 1 ? allUnits[currentIdx + 1] : null;
  const isCurrentUnitDone = completedUnitIds.has(unitId);

  return (
    <>
      <Header />
      <main id="main">
        <div className="bms-learn">
          <aside className="bms-learn-sidebar">
            <Link className="bms-learn-back" href={`/dashboard/credentials/${credentialId}`}>
              <ArrowLeft aria-hidden="true" size={16} /> Back to credential
            </Link>
            {(credential.code || credential.project) && (
              <p className="bms-learn-eyebrow">
                {[credential.code, credential.project].filter(Boolean).join(" | ")}
              </p>
            )}
            <h1 className="bms-learn-course-title">{credential.title}</h1>
            <p className="bms-learn-progress">
              {completedUnitIds.size} / {allUnits.length} completed
            </p>
            <ol className="bms-learn-units">
              {allUnits.map((u) => {
                const isActive = u.id === unitId;
                const isDone = completedUnitIds.has(u.id);
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      className={cn(isActive && "is-active")}
                      onClick={() => router.push(`/dashboard/credentials/${credentialId}/units/${u.id}`)}
                    >
                      {isDone ? (
                        <CircleCheck aria-hidden="true" size={18} className="bms-learn-tick" />
                      ) : (
                        <span className="bms-learn-dot" />
                      )}
                      <span>{u.title}</span>
                      {u.weight > 0 && (
                        <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#999" }}>{u.weight}%</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          <main className="bms-learn-main">
            <p className="bms-learn-section-eyebrow">
              {unit.type === "VIDEO" ? "Video" : unit.type === "PRESENTATION" ? "Presentation" : "Quiz"}
              {unit.weight > 0 ? ` · ${unit.weight}% of grade` : ""}
              {isCurrentUnitDone ? " · Completed" : ""}
            </p>
            <h2 className="bms-learn-unit-title">{unit.title}</h2>

            {unit.type === "VIDEO" && <VideoPlayer unit={unit} onComplete={handleComplete} />}
            {unit.type === "PRESENTATION" && <PresentationViewer unit={unit} onComplete={handleComplete} />}
            {unit.type === "QUIZ" && <QuizPlayer unit={unit} onComplete={handleComplete} />}

            <div className="bms-learn-actions">
              {prevUnit ? (
                <button
                  type="button"
                  className="bms-learn-nav"
                  onClick={() => router.push(`/dashboard/credentials/${credentialId}/units/${prevUnit.id}`)}
                >
                  <ArrowLeft aria-hidden="true" size={16} /> Previous
                </button>
              ) : (
                <button
                  type="button"
                  className="bms-learn-nav"
                  onClick={() => router.push(`/dashboard/credentials/${credentialId}`)}
                >
                  <ArrowLeft aria-hidden="true" size={16} /> Overview
                </button>
              )}

              {unit.type !== "QUIZ" ? (
                <button
                  type="button"
                  className="bms-learn-complete"
                  onClick={handleComplete}
                  disabled={isCurrentUnitDone}
                >
                  <Check aria-hidden="true" size={16} /> {isCurrentUnitDone ? "Completed" : "Mark as complete"}
                </button>
              ) : (
                <span className="bms-learn-quiz-progress">Complete the quiz to finish this unit</span>
              )}

              {nextUnit ? (
                <button
                  type="button"
                  className="bms-learn-nav"
                  onClick={() => router.push(`/dashboard/credentials/${credentialId}/units/${nextUnit.id}`)}
                >
                  Next <ArrowRight aria-hidden="true" size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="bms-learn-nav"
                  onClick={() => router.push(`/dashboard/credentials/${credentialId}`)}
                >
                  Finish <ArrowRight aria-hidden="true" size={16} />
                </button>
              )}
            </div>
          </main>
        </div>
      </main>
    </>
  );
}
