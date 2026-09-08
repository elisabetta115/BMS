"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

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
  sections: Section[];
}

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1);
    } else if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v");
    }
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

function flatUnits(credential: MicroCredential): Unit[] {
  return credential.sections.flatMap(s =>
    s.subsections.flatMap(ss => ss.units)
  );
}

/* ── Quiz player ────────────────────────────────────────────── */
function QuizPlayer({ unit, onComplete }: { unit: Unit; onComplete: () => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => unit.questions.map(() => null)
  );
  const [submitted, setSubmitted] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  function select(qi: number, optionIdx: number) {
    if (submitted) return;
    setAnswers(prev => {
      const next = [...prev];
      next[qi] = optionIdx;
      return next;
    });
  }

  function submit() {
    if (answers.some(a => a === null)) return;
    setSubmitted(true);
  }

  function retry() {
    setAnswers(unit.questions.map(() => null));
    setSubmitted(false);
    setAlreadyCompleted(false);
  }

  const correctCount = submitted
    ? unit.questions.filter((q, i) => answers[i] === q.correctIndex).length
    : 0;
  const total = unit.questions.length;
  const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const allCorrect = submitted && correctCount === total;
  const allAnswered = answers.every(a => a !== null);

  useEffect(() => {
    if (allCorrect && !alreadyCompleted) {
      setAlreadyCompleted(true);
      onComplete();
    }
  }, [allCorrect, alreadyCompleted, onComplete]);

  if (total === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        This quiz has no questions yet.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {submitted && (
        <div
          className="rounded-2xl p-6 text-center mb-2"
          style={{
            background: scorePct === 100 ? "var(--bms-green-light)" : scorePct >= 70 ? "#fefce8" : "#fef2f2",
            borderColor: scorePct === 100 ? "var(--bms-green)" : scorePct >= 70 ? "#fbbf24" : "#fca5a5",
            borderWidth: 2,
          }}
        >
          {scorePct === 100 && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bms-green)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              <span className="text-sm font-semibold" style={{ color: "var(--bms-green)" }}>Unit completed!</span>
            </div>
          )}
          <p className="text-3xl font-bold mb-1" style={{ color: scorePct === 100 ? "var(--bms-green)" : scorePct >= 70 ? "#d97706" : "#dc2626" }}>
            {scorePct}%
          </p>
          <p className="text-sm font-medium" style={{ color: scorePct === 100 ? "var(--bms-green)" : scorePct >= 70 ? "#d97706" : "#dc2626" }}>
            {correctCount} / {total} correct
          </p>
          {unit.weight > 0 && (
            <p className="text-xs text-gray-500 mt-1">This quiz counts for {unit.weight}% of your grade.</p>
          )}
          {scorePct < 100 && (
            <p className="text-xs text-gray-500 mt-1">Get all answers right to complete this unit.</p>
          )}
          <button
            onClick={retry}
            className="mt-4 px-6 py-2 rounded-full text-white text-sm font-medium"
            style={{ background: "var(--bms-blue)" }}
          >
            Retry
          </button>
        </div>
      )}

      {unit.questions.map((q, qi) => {
        const chosen = answers[qi];

        return (
          <div key={q.id} className="border border-gray-200 rounded-2xl p-6">
            <p className="font-semibold text-base mb-4" style={{ color: "var(--bms-dark)" }}>
              <span className="text-gray-400 mr-2">{qi + 1}.</span>
              {q.question}
            </p>

            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isSelected = chosen === oi;
                const isCorrectOpt = q.correctIndex === oi;

                let borderColor = "border-gray-200";
                let bgColor = "bg-white";
                let textColor = "text-gray-700";

                if (submitted) {
                  if (isCorrectOpt) {
                    borderColor = "border-green-400";
                    bgColor = "bg-green-50";
                    textColor = "text-green-800";
                  } else if (isSelected && !isCorrectOpt) {
                    borderColor = "border-red-400";
                    bgColor = "bg-red-50";
                    textColor = "text-red-800";
                  }
                } else if (isSelected) {
                  borderColor = "border-[var(--bms-green)]";
                  bgColor = "bg-[var(--bms-green-light)]";
                  textColor = "text-[var(--bms-dark)]";
                }

                return (
                  <button
                    key={oi}
                    onClick={() => select(qi, oi)}
                    disabled={submitted}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 ${borderColor} ${bgColor} ${textColor} flex items-center gap-3 transition-colors disabled:cursor-default`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                        isSelected
                          ? submitted
                            ? isCorrectOpt
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-red-500 bg-red-500 text-white"
                            : "border-[var(--bms-green)] bg-[var(--bms-green)] text-white"
                          : submitted && isCorrectOpt
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {submitted && isCorrectOpt ? "✓" : submitted && isSelected && !isCorrectOpt ? "✗" : ""}
                    </span>
                    <span className="text-sm">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {!submitted && (
        <button
          onClick={submit}
          disabled={!allAnswered}
          className="w-full py-3 rounded-full text-white font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "var(--bms-green)" }}
        >
          {allAnswered ? "Submit answers" : `Answer all ${total} questions to submit`}
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

  if (!unit.videoUrl) {
    return <div className="text-center py-16 text-gray-500">No video URL set for this unit.</div>;
  }

  const embedUrl = youtubeEmbedUrl(unit.videoUrl);

  if (embedUrl) {
    return (
      <div className="rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={unit.title}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
      <video src={unit.videoUrl} controls className="w-full h-full" title={unit.title} />
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
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [unit.id, unit.hasFile]);

  if (!unit.hasFile) {
    return <div className="text-center py-16 text-gray-500">No presentation file uploaded for this unit.</div>;
  }

  const downloadUrl = `/pptx/${unit.id}`;

  function handleDownload() {
    onComplete();
  }

  if (status === "loading") {
    return (
      <div
        className="rounded-2xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-3"
        style={{ height: "76vh", minHeight: 500 }}
      >
        <div className="w-8 h-8 border-[3px] border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Preparing presentation…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="rounded-2xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-4 px-8 text-center"
        style={{ height: "76vh", minHeight: 500 }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M9 17h6m-3-3v3M7 3h10l4 4v14H3V3h4"/></svg>
        <p className="text-gray-600 font-medium">The presentation could not be displayed.</p>
        <p className="text-sm text-gray-400">Download it to view on your device.</p>
        <a
          href={downloadUrl}
          download
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-white text-sm font-medium"
          style={{ background: "var(--bms-green)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          Download presentation
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-50" style={{ height: "76vh", minHeight: 500 }}>
        <iframe
          src={blobUrl!}
          className="w-full h-full border-0"
          title={unit.title}
        />
      </div>
      <div className="flex items-center justify-end gap-3">
        <a
          href={blobUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
          Open in new tab
        </a>
        <a
          href={downloadUrl}
          download
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          Download .pptx
        </a>
      </div>
    </div>
  );
}

/* ── Unit type badge ────────────────────────────────────────── */
function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; color: string }> = {
    VIDEO: { label: "Video", color: "bg-blue-100 text-blue-700" },
    PRESENTATION: { label: "Presentation", color: "bg-purple-100 text-purple-700" },
    QUIZ: { label: "Quiz", color: "bg-amber-100 text-amber-700" },
  };
  const { label, color } = map[type] ?? { label: type, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${color}`}>{label}</span>
  );
}

/* ── Main page ──────────────────────────────────────────────── */
export default function UnitViewerPage() {
  const router = useRouter();
  const params = useParams();
  const credentialId = params?.id as string;
  const unitId = params?.unitId as string;

  const [user, setUser] = useState<any>(null);
  const [credential, setCredential] = useState<MicroCredential | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completedUnitIds, setCompletedUnitIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => { if (!r.ok) { router.push("/login"); return null; } return r.json(); })
      .then(d => { if (d?.user) setUser(d.user); })
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    if (!user || !credentialId) return;

    Promise.all([
      fetch(`/api/micro-credentials/${credentialId}`).then(r => r.ok ? r.json() : null),
      fetch("/api/enrollments").then(r => r.ok ? r.json() : { credentials: [] }),
      fetch(`/api/micro-credentials/${credentialId}/progress`).then(r => r.ok ? r.json() : { completedUnitIds: [] }),
    ])
      .then(([credRes, enrRes, progRes]) => {
        if (!credRes?.credential) { setError("Micro-credential not found."); return; }
        const cred: MicroCredential = credRes.credential;
        setCredential(cred);

        const isEnrolled = (enrRes.credentials || []).some((c: any) => c.id === credentialId);
        setEnrolled(isEnrolled);

        setCompletedUnitIds(new Set(progRes.completedUnitIds || []));

        const found = flatUnits(cred).find(u => u.id === unitId) ?? null;
        if (!found) setError("Unit not found.");
        setUnit(found);
      })
      .catch(() => setError("Failed to load content."))
      .finally(() => setLoading(false));
  }, [user, credentialId, unitId]);

  const handleComplete = useCallback(() => {
    if (!unit || completedUnitIds.has(unit.id)) return;

    fetch(`/api/units/${unit.id}/complete`, { method: "POST" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.success) {
          setCompletedUnitIds(prev => new Set([...prev, unit.id]));
        }
      })
      .catch(() => {});
  }, [unit, completedUnitIds]);

  if (!user) return null;

  if (loading) {
    return (
      <>
        <Header />
        <main className="py-20">
          <div className="flex justify-center">
            <div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
      </>
    );
  }

  if (error || !credential || !unit) {
    return (
      <>
        <Header />
        <main className="py-20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-gray-500 mb-4">{error || "Content not found."}</p>
            <Link href={`/dashboard/credentials/${credentialId}`} className="text-[var(--bms-green)] hover:underline">
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
        <main className="py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-gray-600 mb-4">You are not enrolled in this micro-credential.</p>
            <Link
              href={`/credentials/${credentialId}`}
              className="inline-block px-8 py-3 rounded-full text-white font-medium text-sm"
              style={{ background: "var(--bms-green)" }}
            >
              View and enroll
            </Link>
          </div>
        </main>
      </>
    );
  }

  const allUnits = flatUnits(credential);
  const currentIdx = allUnits.findIndex(u => u.id === unitId);
  const prevUnit = currentIdx > 0 ? allUnits[currentIdx - 1] : null;
  const nextUnit = currentIdx < allUnits.length - 1 ? allUnits[currentIdx + 1] : null;

  function SidebarUnitList({ onClick }: { onClick?: () => void }) {
    return (
      <>
        {credential!.sections.map(section => (
          <div key={section.id}>
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{section.title}</p>
            </div>
            {section.subsections.map(ss => (
              <div key={ss.id}>
                {ss.title && (
                  <div className="px-5 py-2 border-b border-gray-50">
                    <p className="text-xs font-medium text-gray-500">{ss.title}</p>
                  </div>
                )}
                {ss.units.map(u => {
                  const isActive = u.id === unitId;
                  const isDone = completedUnitIds.has(u.id);
                  return (
                    <Link
                      key={u.id}
                      href={`/dashboard/credentials/${credentialId}/units/${u.id}`}
                      onClick={onClick}
                      className={`flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                        isActive ? "bg-[var(--bms-green-light)]" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className={isActive ? "text-[var(--bms-green)]" : isDone ? "text-green-500" : "text-gray-400"}>
                        {isDone ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                        ) : u.type === "VIDEO" ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        ) : u.type === "PRESENTATION" ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                        )}
                      </span>
                      <span className={`text-xs flex-1 ${isActive ? "font-semibold text-[var(--bms-dark)]" : isDone ? "text-gray-500" : "text-gray-700"}`}>
                        {u.title}
                      </span>
                      {u.weight > 0 && (
                        <span className="text-xs text-gray-400 flex-shrink-0">{u.weight}%</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </>
    );
  }

  const isCurrentUnitDone = completedUnitIds.has(unitId);

  return (
    <>
      <Header />
      <main className="py-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top breadcrumb */}
          <div className="py-4 border-b border-gray-100 flex items-center gap-2 text-sm text-gray-500">
            <Link href={`/dashboard/credentials/${credentialId}`} className="hover:text-gray-700">
              ← {credential.title}
            </Link>
            <span>/</span>
            <span className="text-gray-700 font-medium truncate max-w-xs">{unit.title}</span>
            {isCurrentUnitDone && (
              <span className="ml-1 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                Completed
              </span>
            )}
          </div>

          <div className="flex gap-8 py-8">
            {/* Sidebar: course outline */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-6 border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100" style={{ background: "var(--bms-green-light)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--bms-green)" }}>
                    Course outline
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {completedUnitIds.size} / {allUnits.length} completed
                  </p>
                </div>
                <div className="overflow-y-auto max-h-[70vh]">
                  <SidebarUnitList />
                </div>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Mobile sidebar toggle */}
              <button
                className="lg:hidden mb-4 flex items-center gap-2 text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg"
                onClick={() => setSidebarOpen(v => !v)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" /></svg>
                {sidebarOpen ? "Hide outline" : "Show course outline"}
              </button>

              {/* Mobile sidebar */}
              {sidebarOpen && (
                <div className="lg:hidden border border-gray-200 rounded-2xl overflow-hidden mb-6">
                  <SidebarUnitList onClick={() => setSidebarOpen(false)} />
                </div>
              )}

              {/* Unit header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <TypeBadge type={unit.type} />
                  {unit.weight > 0 && (
                    <span className="text-xs text-gray-500">{unit.weight}% of grade</span>
                  )}
                  {isCurrentUnitDone && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                      Completed
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold leading-tight" style={{ color: "var(--bms-dark)" }}>
                  {unit.title}
                </h1>
              </div>

              {/* Unit content */}
              {unit.type === "VIDEO" && <VideoPlayer unit={unit} onComplete={handleComplete} />}
              {unit.type === "PRESENTATION" && <PresentationViewer unit={unit} onComplete={handleComplete} />}
              {unit.type === "QUIZ" && <QuizPlayer unit={unit} onComplete={handleComplete} />}

              {/* Prev / Next navigation */}
              <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
                {prevUnit ? (
                  <Link
                    href={`/dashboard/credentials/${credentialId}/units/${prevUnit.id}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
                    <span className="max-w-[160px] truncate">{prevUnit.title}</span>
                  </Link>
                ) : (
                  <Link
                    href={`/dashboard/credentials/${credentialId}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                    Back to credential
                  </Link>
                )}

                {nextUnit ? (
                  <Link
                    href={`/dashboard/credentials/${credentialId}/units/${nextUnit.id}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium transition-colors"
                    style={{ background: "var(--bms-green)" }}
                  >
                    <span className="max-w-[160px] truncate">{nextUnit.title}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                  </Link>
                ) : (
                  <Link
                    href={`/dashboard/credentials/${credentialId}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium transition-colors"
                    style={{ background: "var(--bms-green)" }}
                  >
                    Back to overview
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
