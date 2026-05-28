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

export default function ProgrammeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const programmeId = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [programme, setProgramme] = useState<MicroProgramme | null>(null);
  const [enrolled, setEnrolled] = useState(false);
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
        <main className="py-20"><div className="flex justify-center"><div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" /></div></main>
        <Footer />
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
        <Footer />
      </>
    );
  }

  /* ─── Single dashboard view for everyone ───────────── */
  const totalCourses = programme.credentials.length;
  const completedCount = 0; // dynamic later
  const remainingCount = totalCourses - completedCount;
  const remainingCourses = programme.credentials;
  const completedCourses: MicroCredential[] = [];

  const ringSize = 220;
  const ringStroke = 18;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const progressFraction = totalCourses > 0 ? completedCount / totalCourses : 0;

  return (
    <>
      <Header />
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href={enrolled ? "/dashboard/my-programmes" : "/programs"}
            className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block"
          >
            ← {enrolled ? "Back to my programmes" : "Back to programmes"}
          </Link>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Title + courses */}
            <div className="lg:col-span-2">
              <p className="text-sm text-gray-500 mb-2">{programme.code} | {programme.project}</p>
              <h1 className="text-4xl font-bold mb-6 leading-tight" style={{ color: "var(--bms-dark)" }}>
                {programme.title}
              </h1>

              {programme.description && (
                <p className="text-gray-600 mb-8">{programme.description}</p>
              )}

              {/* Journey box */}
              <div className="bg-[var(--bms-green-light)] rounded-2xl p-6 mb-10">
                <h3 className="font-bold text-lg mb-2" style={{ color: "var(--bms-green)" }}>Your Programme Journey</h3>
                <p className="text-sm text-gray-700">
                  Track and plan your progress through the {totalCourses} courses in this programme.
                  To complete the programme, you must earn a verified certificate for each course.
                </p>
              </div>

              {/* Remaining */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--bms-green)"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                  <h2 className="text-2xl font-bold" style={{ color: "var(--bms-green)" }}>Remaining Courses</h2>
                  <span className="text-2xl font-bold text-gray-700">{remainingCount}</span>
                </div>
                <hr className="border-[var(--bms-green-light)] border-t-2 mb-6" />

                {remainingCourses.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">All courses complete!</p>
                ) : (
                  <div className="space-y-4">
                    {remainingCourses.map(c => (
                      <div key={c.id} className="border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-lg mb-1" style={{ color: "var(--bms-dark)" }}>{c.title}</h4>
                          <p className="text-sm text-gray-500">(Self-paced) {c.code} | {c.project}</p>
                        </div>
                        <Link
                          href={`/dashboard/credentials/${c.id}`}
                          className="self-start sm:self-center px-6 py-2.5 rounded-md text-white text-sm font-medium whitespace-nowrap"
                          style={{ background: "var(--bms-blue)" }}
                        >
                          View Details
                        </Link>
                      </div>
                    ))}
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

                {completedCourses.length === 0 ? (
                  <div>
                    <p className="font-semibold text-gray-700 mb-1">As you complete courses, you will see them listed here.</p>
                    <p className="text-sm text-gray-500">Complete courses on your schedule to ensure you stand out in your field!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedCourses.map(c => (
                      <div key={c.id} className="border border-gray-200 rounded-xl p-5">
                        <h4 className="font-bold text-lg mb-1" style={{ color: "var(--bms-dark)" }}>{c.title}</h4>
                        <p className="text-sm text-gray-500">{c.code} | {c.project}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Progress + enroll + Record */}
            <aside className="space-y-8">
              {/* Enroll card — only when not enrolled */}
              {!enrolled && (
                <div className="border-2 border-[var(--bms-green)] rounded-2xl p-6 text-center">
                  <p className="text-sm text-gray-600 mb-4">
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
                    {user
                      ? (enrolling ? "Enrolling…" : "Enroll in this programme")
                      : "Log in to enroll"}
                  </button>
                </div>
              )}

              {/* Progress card */}
              <div className="border-2 border-[var(--bms-green-light)] rounded-2xl p-8 text-center">
                <h3 className="text-xl font-bold mb-6" style={{ color: "var(--bms-green)" }}>Programme Progress</h3>
                <div className="flex justify-center mb-2">
                  <svg width={ringSize} height={ringSize} className="-rotate-90">
                    {Array.from({ length: totalCourses }).map((_, i) => {
                      const segLen = ringCircumference / totalCourses;
                      const gap = 6;
                      const dash = Math.max(0, segLen - gap);
                      return (
                        <circle
                          key={`bg-${i}`}
                          cx={ringSize / 2}
                          cy={ringSize / 2}
                          r={ringRadius}
                          fill="none"
                          stroke="var(--bms-green-light)"
                          strokeWidth={ringStroke}
                          strokeDasharray={`${dash} ${ringCircumference - dash}`}
                          strokeDashoffset={-(i * segLen) + gap / 2}
                        />
                      );
                    })}
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      fill="none"
                      stroke="var(--bms-green)"
                      strokeWidth={ringStroke}
                      strokeDasharray={`${ringCircumference * progressFraction} ${ringCircumference}`}
                      strokeLinecap="butt"
                    />
                  </svg>
                </div>
                <p className="text-3xl font-bold -mt-32 mb-32" style={{ color: "var(--bms-green)" }}>
                  {completedCount} / {totalCourses}
                </p>
              </div>

              {/* Record placeholder */}
              <div>
                <h3 className="text-lg font-bold mb-3" style={{ color: "var(--bms-green)" }}>Programme Record</h3>
                <hr className="border-[var(--bms-green-light)] border-t-2 mb-4" />
                <p className="text-sm text-gray-600 leading-relaxed">
                  Once you complete one of the program requirements you have a program record.
                  This record is marked complete once you meet all program requirements.
                  A program record can be used to continue your learning.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}