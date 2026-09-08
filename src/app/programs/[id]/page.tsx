"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface MicroCredential {
  id: string;
  title: string;
  code: string;
  project: string;
  passGrade: number;
  hasImage?: boolean;
}

interface MicroProgramme {
  id: string;
  title: string;
  slug: string;
  code: string;
  project: string;
  description: string | null;
  hasImage: boolean;
  credentials: MicroCredential[];
}

interface CredProg { currentGrade: number; hasPassed: boolean; }

async function downloadCertificate(programmeId: string) {
  const r = await fetch(`/api/certificates/download?programmeId=${programmeId}`);
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    alert(d.error || "Certificate not available for this project yet.");
    return;
  }
  const blob = await r.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = "certificate.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export default function ProgrammeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const programmeId = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [programme, setProgramme] = useState<MicroProgramme | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [credProgress, setCredProgress] = useState<Record<string, CredProg>>({});
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setUser(d.user); })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authChecked || !programmeId) return;

    const tasks: Promise<any>[] = [
      fetch(`/api/micro-programmes/${programmeId}`).then(r => r.ok ? r.json() : null),
    ];
    if (user) {
      tasks.push(fetch("/api/enrollments").then(r => r.ok ? r.json() : { programmes: [] }));
    }

    Promise.all(tasks)
      .then(([progRes, enrRes]) => {
        if (!progRes?.programme) { setError("Programme not found."); return; }
        setProgramme(progRes.programme);
        if (enrRes) {
          const isEnrolled = (enrRes.programmes || []).some((p: any) => p.id === programmeId);
          setEnrolled(isEnrolled);
        }
      })
      .catch(() => setError("Failed to load programme."))
      .finally(() => setLoading(false));
  }, [authChecked, user, programmeId]);

  // Fetch per-credential progress once programme + enrolled user are known
  useEffect(() => {
    if (!user || !programme || !enrolled) { setProgressLoaded(true); return; }
    const credIds = programme.credentials.map(c => c.id);
    Promise.all(
      credIds.map(id =>
        fetch(`/api/micro-credentials/${id}/progress`)
          .then(r => r.ok ? r.json() : { currentGrade: 0, hasPassed: false })
          .then(p => [id, { currentGrade: p.currentGrade ?? 0, hasPassed: p.hasPassed ?? false }] as const)
      )
    )
      .then(entries => setCredProgress(Object.fromEntries(entries)))
      .catch(() => {})
      .finally(() => setProgressLoaded(true));
  }, [user, programme, enrolled]);

  async function handleEnroll() {
    if (!user) { router.push(`/login?redirect=/programs/${programmeId}`); return; }
    setEnrolling(true);
    try {
      const r = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "programme", id: programmeId }),
      });
      if (r.ok) setEnrolled(true);
      else { const d = await r.json(); setError(d.error || "Failed to enroll."); }
    } catch { setError("Network error."); }
    setEnrolling(false);
  }

  if (!authChecked || loading) {
    return (
      <>
        <Header />
        <main className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-6" />
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="h-3 w-48 bg-gray-200 rounded animate-pulse mb-3" />
                <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-8 w-1/2 bg-gray-200 rounded animate-pulse mb-6" />
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse mb-8" />
                <div className="rounded-2xl bg-gray-100 p-6 mb-10">
                  <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-3" />
                  <div className="h-3 w-full bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-4/5 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-2xl border border-brand-line p-5">
                      <div className="h-5 w-2/3 bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-3 w-1/3 bg-gray-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
              <aside className="space-y-8">
                <div className="border-2 border-gray-200 rounded-2xl p-6">
                  <div className="h-3 w-full bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-4/5 bg-gray-200 rounded animate-pulse mb-4" />
                  <div className="h-11 w-full bg-gray-200 rounded-full animate-pulse" />
                </div>
                <div className="border-2 border-gray-200 rounded-2xl p-8 text-center">
                  <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mx-auto mb-6" />
                  <div className="w-[220px] h-[220px] rounded-full bg-gray-200 animate-pulse mx-auto" />
                </div>
              </aside>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !programme) {
    return (
      <>
        <Header />
        <main id="main" className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <p className="mb-4 text-brand-muted">{error || "Programme not found."}</p>
            <Link href="/programs" className="font-semibold text-brand-green hover:underline">
              ← Back to programmes
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const totalCourses = programme.credentials.length;
  const completedCredentials = progressLoaded
    ? programme.credentials.filter(c => credProgress[c.id]?.hasPassed)
    : [];
  const completedCount = completedCredentials.length;
  const remainingCourses = programme.credentials.filter(c => !credProgress[c.id]?.hasPassed);
  const hasPassed = enrolled && progressLoaded && totalCourses > 0 && completedCount === totalCourses;
  const progressPercent = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;

  const ringSize = 220;
  const ringStroke = 18;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const progressFraction = completedCount / Math.max(totalCourses, 1);

  return (
    <>
      <Header />
      <main id="main">
        <div className="mx-auto max-w-[1180px] px-6 py-12 lg:px-8">
          <Link
            href={enrolled ? "/dashboard/my-programmes" : "/programs"}
            className="mb-6 inline-block text-sm font-semibold text-brand-muted transition-colors hover:text-brand-green"
          >
            ← {enrolled ? "Back to my programmes" : "Back to programmes"}
          </Link>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid gap-10 lg:grid-cols-3">
            {/* Left: Title + courses */}
            <div className="lg:col-span-2">
              <p className="mb-3 text-lg font-bold text-brand-green">{programme.code} | {programme.project}</p>
              <h1 className="mb-6 text-4xl font-bold leading-tight text-brand-dark md:text-5xl">
                {programme.title}
              </h1>

              {programme.description && (
                <p className="mb-8 text-lg leading-8 text-brand-muted">{programme.description}</p>
              )}

              {/* Journey / passed box */}
              <div className={`rounded-2xl p-6 mb-10 ${hasPassed ? "border border-brand-line bg-brand-pale" : "bg-brand-pale"}`}>
                {hasPassed ? (
                  <div className="flex items-center gap-3 mb-2">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#079845" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                    <h3 className="font-bold text-lg text-brand-green">Programme Complete!</h3>
                  </div>
                ) : (
                  <h3 className="font-bold text-lg mb-2 text-brand-green">Your Programme Journey</h3>
                )}
                <p className="text-sm text-brand-dark">
                  {hasPassed
                    ? `You have passed all ${totalCourses} credential${totalCourses !== 1 ? "s" : ""} in this programme.`
                    : `Track and plan your progress through the ${totalCourses} courses in this programme. To complete the programme, you must earn a verified certificate for each course.`}
                </p>
              </div>

              {/* Remaining */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#079845"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                  <h2 className="text-2xl font-bold text-brand-green">Remaining Courses</h2>
                  <span className="text-2xl font-bold text-brand-dark">{remainingCourses.length}</span>
                </div>
                <hr className="border-t border-brand-pale mb-6" />

                {remainingCourses.length === 0 ? (
                  <p className="text-brand-muted text-sm py-4">All courses complete!</p>
                ) : (
                  <div className="space-y-4">
                    {remainingCourses.map(c => {
                      const prog = credProgress[c.id];
                      return (
                        <div key={c.id} className="rounded-2xl border border-brand-line border border-brand-line p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <h4 className="font-bold text-lg mb-1" style={{ color: "var(--bms-dark)" }}>{c.title}</h4>
                            <p className="text-sm text-brand-muted">{c.code} | {c.project}</p>
                            {prog && prog.currentGrade > 0 && (
                              <p className="text-xs text-brand-green mt-1">Current grade: <strong>{prog.currentGrade}%</strong> / pass at {c.passGrade}%</p>
                            )}
                          </div>
                          <Link
                            href={`/dashboard/credentials/${c.id}`}
                            className="self-start sm:self-center inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brand-green px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-green-dark"
                            style={{ background: "#079845" }}
                          >
                            {prog && prog.currentGrade > 0 ? "Continue" : "View Details"}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Completed */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#079845"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                  <h2 className="text-2xl font-bold text-brand-green">Completed courses</h2>
                  <span className="text-2xl font-bold text-brand-dark">{completedCount}</span>
                </div>
                <hr className="border-t border-brand-pale mb-6" />

                {completedCredentials.length === 0 ? (
                  <div>
                    <p className="font-semibold text-brand-dark mb-1">As you complete courses, you will see them listed here.</p>
                    <p className="text-sm text-brand-muted">Complete courses on your schedule to ensure you stand out in your field!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedCredentials.map(c => (
                      <div key={c.id} className="border border-brand-line bg-brand-pale rounded-2xl border border-brand-line p-5 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#079845" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                            <h4 className="font-bold" style={{ color: "var(--bms-dark)" }}>{c.title}</h4>
                          </div>
                          <p className="text-sm text-brand-muted ml-6">{c.code} | {c.project}</p>
                        </div>
                        <Link
                          href={`/dashboard/credentials/${c.id}`}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-brand-green px-5 py-2 text-sm font-bold text-brand-green transition-colors hover:bg-brand-pale"
                        >
                          Review
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Progress + enroll + Record */}
            <aside className="space-y-8">
              {/* Enroll card */}
              {!enrolled && (
                <div className="border border-brand-green rounded-2xl p-6 text-center">
                  <p className="text-sm text-brand-muted mb-4">
                    {user
                      ? "Enroll to start tracking your progress through this programme."
                      : "Log in to enroll and track your progress."}
                  </p>
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full px-6 py-3 rounded-full text-white font-medium text-sm transition-colors disabled:opacity-60"
                    style={{ background: "var(--bms-green)" }}
                  >
                    {user ? (enrolling ? "Enrolling…" : "Enroll in this programme") : "Log in to enroll"}
                  </button>
                </div>
              )}

              {/* Progress card */}
              <div className={`border-2 rounded-2xl p-8 text-center ${hasPassed ? "border-brand-green bg-brand-pale" : "border-brand-pale"}`}>
                <h3 className="text-xl font-bold mb-6 text-brand-green">
                  {hasPassed ? "Complete!" : "Programme Progress"}
                </h3>
                <div className="relative flex justify-center">
                  <svg width={ringSize} height={ringSize} className="-rotate-90">
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      fill="none"
                      stroke="#eaf3e7"
                      strokeWidth={ringStroke}
                    />
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      fill="none"
                      stroke="#079845"
                      strokeWidth={ringStroke}
                      strokeDasharray={`${ringCircumference * progressFraction} ${ringCircumference}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <p className="text-4xl font-bold" style={{ color: hasPassed ? "var(--bms-green)" : "var(--bms-dark)" }}>
                      {progressPercent}%
                    </p>
                    <p className="text-xs text-brand-muted">{completedCount} / {totalCourses} passed</p>
                  </div>
                </div>
              </div>

              {/* Programme Record */}
              <div>
                <h3 className="text-lg font-bold mb-3 text-brand-green">Programme Record</h3>
                <hr className="border-t border-brand-pale mb-4" />
                {hasPassed ? (
                  <div className="rounded-xl border border-brand-line bg-brand-pale p-4 text-sm text-brand-green space-y-3">
                    <p className="font-semibold">You have completed this programme.</p>
                    <p className="text-brand-green">All {totalCourses} credentials have been passed.</p>
                    <button
                      onClick={() => downloadCertificate(programmeId)}
                      className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-full font-medium text-sm border border-brand-green text-brand-green bg-white hover:bg-brand-pale transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download Certificate
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-brand-muted leading-relaxed">
                    Once you complete one of the programme requirements you have a programme record.
                    This record is marked complete once you meet all programme requirements.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
