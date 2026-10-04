"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CourseHeader, { CourseFallback } from "@/components/course/CourseHeader";
import { useCourse } from "@/components/course/useCourse";
import { flatUnits, type Answer, type Question, type Unit } from "@/components/course/types";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookText,
  Check,
  ChevronLeft,
  ChevronRight,
  Copyright,
  ExternalLink,
  FileDown,
  Info,
  Save,
  SquarePen,
  Video,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes("youtu.be")) videoId = u.pathname.slice(1);
    else if (u.hostname.includes("youtube.com")) videoId = u.searchParams.get("v");
    if (!videoId) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

/* ── Quiz player ────────────────────────────────────────────── */
function QuizQuestion({
  question: q,
  title,
  graded,
  answer,
  onAnswer,
}: {
  question: Question;
  title: string;
  graded: boolean;
  answer: Answer | undefined;
  onAnswer: (answer: Answer) => void;
}) {
  const [choice, setChoice] = useState<number | null>(answer?.savedChoice ?? answer?.submittedChoice ?? null);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const attempts = answer?.attempts ?? 0;
  const attemptsLeft = q.maxAttempts === null || attempts < q.maxAttempts;
  // Marks and feedback show for the submitted answer until the learner picks something else.
  const showingResult = attempts > 0 && choice === answer?.submittedChoice;
  const isCorrect = showingResult && answer?.correct === true;
  const savedNotGraded =
    !showingResult && choice !== null && choice === answer?.savedChoice && answer?.savedChoice !== answer?.submittedChoice;

  async function send(action: "save" | "submit") {
    if (choice === null) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/questions/${q.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, action }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Something went wrong. Please try again.");
      setShown(false);
      onAnswer(d.answer);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bms-quiz-problem" aria-labelledby={`q-title-${q.id}`}>
      <h3 className="bms-quiz-title" id={`q-title-${q.id}`}>
        {title}
      </h3>
      <p className="bms-quiz-points">
        {attempts > 0 ? `${answer?.correct ? 1 : 0}/1 point` : "0.0/1.0 point"} ({graded ? "graded" : "ungraded"})
      </p>
      <p className="bms-quiz-prompt">{q.question}</p>

      <div role="radiogroup" aria-labelledby={`q-title-${q.id}`}>
        {q.options.map((opt, oi) => {
          const isSelected = choice === oi;
          const isAnswer = shown && oi === answer?.correctIndex;
          return (
            <label
              key={oi}
              className={cn(
                "bms-quiz-option",
                showingResult && isSelected && (isCorrect ? "is-correct" : "is-wrong"),
                isAnswer && "is-answer"
              )}
            >
              <input
                type="radio"
                name={`q-${q.id}`}
                checked={isSelected}
                // Not `disabled`: live keeps the radios coloured once the tries are used up.
                aria-disabled={!attemptsLeft || busy}
                onChange={() => {
                  if (!attemptsLeft || busy) return;
                  setChoice(oi);
                  setShown(false);
                }}
              />
              <span>
                {opt}
                {isAnswer && <Check aria-label="Correct answer" className="bms-quiz-answer-tick" size={22} strokeWidth={3.5} />}
              </span>
            </label>
          );
        })}
      </div>

      {showingResult &&
        (isCorrect ? (
          <Check aria-label="Correct" className="bms-quiz-mark is-correct" size={24} strokeWidth={3.5} />
        ) : (
          <X aria-label="Incorrect" className="bms-quiz-mark is-wrong" size={24} strokeWidth={3.5} />
        ))}

      <div className="bms-quiz-tools">
        {attempts > 0 && (
          <button type="button" onClick={() => setShown(true)} disabled={shown}>
            Show answer
          </button>
        )}
        {attemptsLeft && !showingResult && (
          <button type="button" onClick={() => send("save")} disabled={choice === null || busy}>
            Save
          </button>
        )}
      </div>

      <div className="bms-quiz-submit">
        <button type="button" disabled={choice === null || !attemptsLeft || busy} onClick={() => send("submit")}>
          Submit
        </button>
        {q.maxAttempts !== null && (
          <span>
            You have used {attempts} of {q.maxAttempts} attempt{q.maxAttempts === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {error && <p className="bms-modal-error">{error}</p>}

      {shown ? (
        <p className="bms-quiz-feedback">
          <Info aria-hidden="true" size={24} className="is-info" fill="currentColor" stroke="#fff" />
          Answers are displayed within the problem
        </p>
      ) : showingResult ? (
        <p className="bms-quiz-feedback">
          {isCorrect ? (
            <>
              <Check aria-hidden="true" size={22} strokeWidth={3.5} className="is-correct" />
              Correct (1/1 point)
            </>
          ) : (
            <>
              <X aria-hidden="true" size={22} strokeWidth={3.5} className="is-wrong" />
              Incorrect (0/1 point)
            </>
          )}
        </p>
      ) : savedNotGraded ? (
        <p className="bms-quiz-feedback is-saved">
          <Save aria-hidden="true" size={22} className="is-saved" />
          Your answers have been saved but not graded. Click &apos;Submit&apos; to grade them.
        </p>
      ) : null}
    </section>
  );
}

/** A quiz unit: one Open edX-style problem block per question. */
function QuizPlayer({
  unit,
  answers,
  onAnswer,
}: {
  unit: Unit;
  answers: Map<string, Answer>;
  onAnswer: (answer: Answer) => void;
}) {
  if (unit.questions.length === 0) {
    return <p className="bms-learn-text">This quiz has no questions yet.</p>;
  }
  return (
    <div className="bms-quiz">
      {unit.questions.map((q, qi) => (
        <QuizQuestion
          key={q.id}
          question={q}
          // Older questions have no stored name: use the unit's name, as live problems usually do.
          title={q.title || (qi === 0 ? unit.title : "problem")}
          graded={unit.weight > 0}
          answer={answers.get(q.id)}
          onAnswer={onAnswer}
        />
      ))}
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

  // Like videos, a presentation counts as complete as soon as it is opened.
  useEffect(() => {
    onComplete();
  }, [onComplete]);

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


function UnitTypeIcon({ type }: { type: Unit["type"] }) {
  if (type === "VIDEO") return <Video aria-label="Video" size={24} fill="currentColor" strokeWidth={1.5} />;
  if (type === "PRESENTATION") return <BookText aria-label="Presentation" size={24} strokeWidth={2.25} />;
  return <SquarePen aria-label="Quiz" size={24} strokeWidth={2.25} />;
}

/* ── Main page ──────────────────────────────────────────────── */
export default function UnitViewerPage() {
  const router = useRouter();
  const params = useParams();
  const credentialId = params?.id as string;
  const unitId = params?.unitId as string;
  const { user, credential, enrolled, loading, error, completedUnitIds, setCompletedUnitIds } =
    useCourse(credentialId);

  const unit = credential ? flatUnits(credential).find((u) => u.id === unitId) ?? null : null;

  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [answersLoaded, setAnswersLoaded] = useState(false);
  useEffect(() => {
    if (!enrolled || !credentialId) return;
    fetch(`/api/micro-credentials/${credentialId}/answers`)
      .then((r) => (r.ok ? r.json() : { answers: [] }))
      .then((d) => setAnswers(new Map((d.answers || []).map((a: Answer) => [a.questionId, a]))))
      .catch(() => {})
      .finally(() => setAnswersLoaded(true));
  }, [enrolled, credentialId]);

  const handleAnswer = useCallback(
    (answer: Answer) => {
      const next = new Map(answers).set(answer.questionId, answer);
      setAnswers(next);
      // The server marks a quiz unit done once all of its questions are submitted.
      if (unit && unit.questions.every((q) => (next.get(q.id)?.attempts ?? 0) > 0)) {
        setCompletedUnitIds((prev) => new Set([...prev, unit.id]));
      }
    },
    [answers, unit, setCompletedUnitIds]
  );

  const handleComplete = useCallback(() => {
    if (!unit || completedUnitIds.has(unit.id)) return;
    fetch(`/api/units/${unit.id}/complete`, { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success) setCompletedUnitIds((prev) => new Set([...prev, unit.id]));
      })
      .catch(() => {});
  }, [unit, completedUnitIds, setCompletedUnitIds]);

  if (!user) return null;
  if (loading) return <><Header /><CourseFallback state="loading" credentialId={credentialId} /></>;
  if (error || !credential || !unit) {
    return (
      <>
        <Header />
        <CourseFallback state="error" credentialId={credentialId} message={error || "Unit not found."} />
      </>
    );
  }
  if (!enrolled) return <><Header /><CourseFallback state="not-enrolled" credentialId={credentialId} /></>;

  const sectionIdx = credential.sections.findIndex((s) =>
    s.subsections.some((ss) => ss.units.some((u) => u.id === unitId))
  );
  const section = credential.sections[sectionIdx];
  const subsection = section.subsections.find((ss) => ss.units.some((u) => u.id === unitId))!;

  const allUnits = flatUnits(credential);
  const currentIdx = allUnits.findIndex((u) => u.id === unitId);
  const prevUnit = currentIdx > 0 ? allUnits[currentIdx - 1] : null;
  const nextUnit = currentIdx < allUnits.length - 1 ? allUnits[currentIdx + 1] : null;

  const outlineHref = `/dashboard/credentials/${credentialId}`;
  const unitHref = (id: string) => `${outlineHref}/units/${id}`;
  const goPrev = () => prevUnit && router.push(unitHref(prevUnit.id));
  // On the last unit the live site shows "End", which opens the Progress tab.
  const goNext = () => router.push(nextUnit ? unitHref(nextUnit.id) : `${outlineHref}/progress`);

  return (
    <>
      <CourseHeader userName={user.username || user.name} course={credential} activeTab="course" />
      <main id="main" className="bms-unit">
        <nav className="bms-unit-breadcrumb" aria-label="Breadcrumb">
          <Link href={outlineHref}>{credential.title}</Link>
          <ChevronRight aria-hidden="true" size={20} strokeWidth={2.5} />
          <Link href={outlineHref}>{section.title}</Link>
          <ChevronRight aria-hidden="true" size={20} strokeWidth={2.5} />
          <Link href={unitHref(subsection.units[0].id)}>{subsection.title}</Link>
        </nav>

        <div className="bms-unit-seq">
          <button type="button" className="bms-unit-seq-arrow" onClick={goPrev} disabled={!prevUnit} aria-label="Previous unit">
            <ArrowLeft aria-hidden="true" size={24} />
          </button>
          <ol>
            {subsection.units.map((u, i) => (
              <li key={u.id}>
                <Link
                  href={unitHref(u.id)}
                  className={cn(u.id === unitId && "is-active")}
                  aria-current={u.id === unitId ? "page" : undefined}
                  title={u.title}
                >
                  <span className="bms-unit-seq-num">
                    {sectionIdx + 1}.{i + 1}
                  </span>
                  <UnitTypeIcon type={u.type} />
                </Link>
              </li>
            ))}
          </ol>
          <button type="button" className="bms-unit-seq-arrow" onClick={goNext} aria-label="Next unit">
            <ArrowRight aria-hidden="true" size={24} />
          </button>
        </div>

        <div className="bms-unit-body">
          <h1 className="bms-unit-title">{unit.title}</h1>

          <div className="bms-unit-content">
            {unit.type === "VIDEO" && <VideoPlayer unit={unit} onComplete={handleComplete} />}
            {unit.type === "PRESENTATION" && <PresentationViewer unit={unit} onComplete={handleComplete} />}
            {unit.type === "QUIZ" &&
              (answersLoaded ? (
                <QuizPlayer key={unit.id} unit={unit} answers={answers} onAnswer={handleAnswer} />
              ) : (
                <div className="flex justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-green border-t-transparent" />
                </div>
              ))}
          </div>

          <div className="bms-unit-nav">
            <button type="button" className="bms-unit-prev" onClick={goPrev} disabled={!prevUnit}>
              <ChevronLeft aria-hidden="true" size={22} /> Previous
            </button>
            <button type="button" className="bms-unit-next" onClick={goNext}>
              {nextUnit ? "Next" : "End"} <ChevronRight aria-hidden="true" size={22} />
            </button>
          </div>
        </div>

        <p className="bms-unit-rights">
          <Copyright aria-hidden="true" size={20} /> All Rights Reserved
        </p>
      </main>
      <Footer />
    </>
  );
}
