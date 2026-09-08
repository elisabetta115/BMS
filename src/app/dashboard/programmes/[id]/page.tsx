"use client";

import Header from "@/components/Header";
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
  const [programme, setProgramme] = useState<MicroProgramme | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [credProgress, setCredProgress] = useState<Record<string, CredProg>>({});
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => { if (!r.ok) { router.push("/login"); return null; } return r.json(); })
      .then(d => { if (d?.user) setUser(d.user); })
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    if (!user || !programmeId) return;

    Promise.all([
      fetch(`/api/micro-programmes/${programmeId}`).then(r => r.ok ? r.json() : null),
      fetch("/api/enrollments").then(r => r.ok ? r.json() : { programmes: [] }),
    ])
      .then(([progRes, enrRes]) => {
        if (!progRes?.programme) { setError("Programme not found."); return; }
        setProgramme(progRes.programme);
        const isEnrolled = (enrRes.programmes || []).some((p: any) => p.id === programmeId);
        setEnrolled(isEnrolled);
      })
      .catch(() => setError("Failed to load programme."))
      .finally(() => setLoading(false));
  }, [user, programmeId]);

  useEffect(() => {
    if (!user || !programme) { setProgressLoaded(true); return; }
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
  }, [user, programme]);

  async function handleEnroll() {
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

  if (!user) return null;

  if (loading) {
    return (
      <>
        <Header />
        <main className="py-20"><div className="flex justify-center"><div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" /></div></main>
      </>
    );
  }

  if (error || !programme) {
    return (
      <>
        <Header />
        <main className="py-20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-gray-500 mb-4">{error || "Programme not found."}</p>
            <Link href="/programs" className="text-[var(--bms-green)] hover:underline">← Back to programmes</Link>
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
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/programs" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">← Back to programmes</Link>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-[var(--bms-green)] to-[var(--bms-blue)] flex items-center justify-center">
                {programme.hasImage ? (
                  <img src={`/api/images/programme/${programme.id}`} alt={programme.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white/40 text-6xl font-bold">{programme.code}</span>
                )}
              </div>
              <div className="p-8">
                <p className="text-sm text-gray-500 mb-2">{programme.code} | {programme.project}</p>
                <h1 className="text-3xl font-bold mb-4" style={{ color: "var(--bms-dark)" }}>{programme.title}</h1>
                {programme.description && <p className="text-gray-600 mb-6">{programme.description}</p>}
                <p className="text-sm text-gray-500 mb-6">This programme includes <strong>{programme.credentials.length}</strong> micro-credentials.</p>
                <button onClick={handleEnroll} disabled={enrolling} className="px-8 py-3 rounded-full text-white font-medium text-sm" style={{ background: "var(--bms-green)" }}>
                  {enrolling ? "Enrolling…" : "Enroll in this programme"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  const totalCourses = programme.credentials.length;
  const completedCredentials = progressLoaded
    ? programme.credentials.filter(c => credProgress[c.id]?.hasPassed)
    : [];
  const completedCount = completedCredentials.length;
  const remainingCourses = programme.credentials.filter(c => !credProgress[c.id]?.hasPassed);
  const hasPassed = progressLoaded && totalCourses > 0 && completedCount === totalCourses;
  const progressPercent = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;

  const ringSize = 220;
  const ringStroke = 18;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const progressFraction = completedCount / Math.max(totalCourses, 1);

  return (
    <>
      <Header />
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard/my-programmes" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
            ← Back to my programmes
          </Link>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <p className="text-sm text-gray-500 mb-2">{programme.code} | {programme.project}</p>
              <h1 className="text-4xl font-bold mb-6 leading-tight" style={{ color: "var(--bms-dark)" }}>
                {programme.title}
              </h1>
              {programme.description && <p className="text-gray-600 mb-8">{programme.description}</p>}

              <div className={`rounded-2xl p-6 mb-10 ${hasPassed ? "bg-green-50 border border-green-200" : "bg-[var(--bms-green-light)]"}`}>
                {hasPassed ? (
                  <div className="flex items-center gap-3 mb-2">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bms-green)" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                    <h3 className="font-bold text-lg" style={{ color: "var(--bms-green)" }}>Programme Complete!</h3>
                  </div>
                ) : (
                  <h3 className="font-bold text-lg mb-2" style={{ color: "var(--bms-green)" }}>Your Programme Journey</h3>
                )}
                <p className="text-sm text-gray-700">
                  {hasPassed
                    ? `You have passed all ${totalCourses} credential${totalCourses !== 1 ? "s" : ""} in this programme.`
                    : `Track and plan your progress through the ${totalCourses} courses in this programme. To complete the programme, you must earn a verified certificate for each course.`}
                </p>
              </div>

              {/* Remaining */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--bms-green)"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                  <h2 className="text-2xl font-bold" style={{ color: "var(--bms-green)" }}>Remaining Courses</h2>
                  <span className="text-2xl font-bold text-gray-700">{remainingCourses.length}</span>
                </div>
                <hr className="border-[var(--bms-green-light)] border-t-2 mb-6" />
                {remainingCourses.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">All courses complete!</p>
                ) : (
                  <div className="space-y-4">
                    {remainingCourses.map(c => {
                      const prog = credProgress[c.id];
                      return (
                        <div key={c.id} className="border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <h4 className="font-bold text-lg mb-1" style={{ color: "var(--bms-dark)" }}>{c.title}</h4>
                            <p className="text-sm text-gray-500">{c.code} | {c.project}</p>
                            {prog && prog.currentGrade > 0 && (
                              <p className="text-xs text-blue-600 mt-1">Current grade: <strong>{prog.currentGrade}%</strong> / pass at {c.passGrade}%</p>
                            )}
                          </div>
                          <Link
                            href={`/dashboard/credentials/${c.id}`}
                            className="self-start sm:self-center px-6 py-2.5 rounded-md text-white text-sm font-medium whitespace-nowrap"
                            style={{ background: "var(--bms-blue)" }}
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--bms-green)"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                  <h2 className="text-2xl font-bold" style={{ color: "var(--bms-green)" }}>Completed courses</h2>
                  <span className="text-2xl font-bold text-gray-700">{completedCount}</span>
                </div>
                <hr className="border-[var(--bms-green-light)] border-t-2 mb-6" />
                {completedCredentials.length === 0 ? (
                  <div>
                    <p className="font-semibold text-gray-700 mb-1">As you complete courses, you will see them listed here.</p>
                    <p className="text-sm text-gray-500">Complete courses on your schedule to ensure you stand out in your field!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedCredentials.map(c => (
                      <div key={c.id} className="border border-green-200 bg-green-50 rounded-xl p-5 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bms-green)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                            <h4 className="font-bold" style={{ color: "var(--bms-dark)" }}>{c.title}</h4>
                          </div>
                          <p className="text-sm text-gray-500 ml-6">{c.code} | {c.project}</p>
                        </div>
                        <Link
                          href={`/dashboard/credentials/${c.id}`}
                          className="px-4 py-2 rounded-md text-sm font-medium text-[var(--bms-green)] border border-[var(--bms-green)] hover:bg-[var(--bms-green-light)] transition-colors whitespace-nowrap"
                        >
                          Review
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar */}
            <aside className="space-y-8">
              {/* Progress ring */}
              <div className={`border-2 rounded-2xl p-8 text-center ${hasPassed ? "border-green-300 bg-green-50" : "border-[var(--bms-green-light)]"}`}>
                <h3 className="text-xl font-bold mb-6" style={{ color: "var(--bms-green)" }}>
                  {hasPassed ? "Complete!" : "Programme Progress"}
                </h3>
                <div className="relative flex justify-center">
                  <svg width={ringSize} height={ringSize} className="-rotate-90">
                    <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke="var(--bms-green-light)" strokeWidth={ringStroke} />
                    <circle
                      cx={ringSize / 2} cy={ringSize / 2} r={ringRadius}
                      fill="none" stroke="var(--bms-green)" strokeWidth={ringStroke}
                      strokeDasharray={`${ringCircumference * progressFraction} ${ringCircumference}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <p className="text-4xl font-bold" style={{ color: hasPassed ? "var(--bms-green)" : "var(--bms-dark)" }}>
                      {progressPercent}%
                    </p>
                    <p className="text-xs text-gray-500">{completedCount} / {totalCourses} passed</p>
                  </div>
                </div>
              </div>

              {/* Programme Record */}
              <div>
                <h3 className="text-lg font-bold mb-3" style={{ color: "var(--bms-green)" }}>Programme Record</h3>
                <hr className="border-[var(--bms-green-light)] border-t-2 mb-4" />
                {hasPassed ? (
                  <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800 space-y-3">
                    <p className="font-semibold">You have completed this programme.</p>
                    <p className="text-green-700">All {totalCourses} credentials have been passed.</p>
                    <button
                      onClick={() => downloadCertificate(programmeId)}
                      className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-full font-medium text-sm border-2 border-[var(--bms-green)] text-[var(--bms-green)] bg-white hover:bg-[var(--bms-green-light)] transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download Certificate
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Once you complete one of the programme requirements you have a programme record.
                    This record is marked complete once you meet all programme requirements.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
