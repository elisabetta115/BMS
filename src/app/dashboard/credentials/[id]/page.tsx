"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

async function downloadCertificate(credentialId: string) {
  const r = await fetch(`/api/certificates/download?credentialId=${credentialId}`);
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

function unitTypeIcon(type: string) {
  if (type === "VIDEO") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
  );
  if (type === "PRESENTATION") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
  );
}

export default function DashboardCredentialPage() {
  const router = useRouter();
  const params = useParams();
  const credentialId = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [credential, setCredential] = useState<MicroCredential | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [completedUnitIds, setCompletedUnitIds] = useState<Set<string>>(new Set());
  const [currentGrade, setCurrentGrade] = useState(0);
  const [hasPassed, setHasPassed] = useState(false);

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
        setCredential(credRes.credential);
        const isEnrolled = (enrRes.credentials || []).some((c: any) => c.id === credentialId);
        setEnrolled(isEnrolled);
        setCompletedUnitIds(new Set(progRes.completedUnitIds || []));
        setCurrentGrade(progRes.currentGrade ?? 0);
        setHasPassed(progRes.hasPassed ?? false);
      })
      .catch(() => setError("Failed to load micro-credential."))
      .finally(() => setLoading(false));
  }, [user, credentialId]);

  function toggleSection(id: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

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

  if (error || !credential) {
    return (
      <>
        <Header />
        <main id="main" className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <p className="mb-4 text-brand-muted">{error || "Micro-credential not found."}</p>
            <Link href="/dashboard/my-credentials" className="font-semibold text-brand-green hover:underline">← Back to my micro-credentials</Link>
          </div>
        </main>
      </>
    );
  }

  if (!enrolled) {
    return (
      <>
        <Header />
        <main id="main">
          <div className="mx-auto max-w-3xl px-6 py-12 lg:px-8">
            <Link href="/courses" className="mb-6 inline-block text-sm font-semibold text-brand-muted transition-colors hover:text-brand-green">← Back to micro-credentials</Link>
            <div className="rounded-2xl border border-brand-line bg-white p-8 text-center">
              <p className="text-brand-muted mb-4">You are not enrolled in this micro-credential.</p>
              <Link
                href={`/credentials/${credential.id}`}
                className="inline-block px-8 py-3 rounded-full text-white font-medium text-sm"
                style={{ background: "var(--bms-green)" }}
              >
                View and enroll
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  const allUnits = credential.sections.flatMap(s => s.subsections.flatMap(ss => ss.units));
  const totalUnits = allUnits.length;
  const completedCount = completedUnitIds.size;
  const totalSections = credential.sections.length;
  const gradeToPass = credential.passGrade;

  const ringSize = 220;
  const ringStroke = 18;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const gradeFraction = Math.min(currentGrade / 100, 1);

  return (
    <>
      <Header />
      <main id="main">
        <div className="mx-auto max-w-[1180px] px-6 py-12 lg:px-8">
          <Link href="/dashboard/my-credentials" className="mb-6 inline-block text-sm font-semibold text-brand-muted transition-colors hover:text-brand-green">
            ← Back to my micro-credentials
          </Link>

          <div className="grid gap-10 lg:grid-cols-3">
            {/* Left: content */}
            <div className="lg:col-span-2">
              <p className="mb-3 text-lg font-bold text-brand-green">{credential.code} | {credential.project}</p>
              <h1 className="mb-6 text-4xl font-bold leading-tight text-brand-dark md:text-5xl">
                {credential.title}
              </h1>

              {credential.description && (
                <p className="mb-8 text-lg leading-8 text-brand-muted">{credential.description}</p>
              )}

              {/* Journey box */}
              <div className={`rounded-2xl p-6 mb-10 ${hasPassed ? "border border-brand-line bg-brand-pale" : "bg-brand-pale"}`}>
                {hasPassed ? (
                  <div className="flex items-center gap-3 mb-3">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#079845" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                    <h3 className="font-bold text-lg text-brand-green">Credential Passed!</h3>
                  </div>
                ) : (
                  <h3 className="font-bold text-lg mb-2 text-brand-green">Your Learning Journey</h3>
                )}
                <p className="text-sm text-brand-dark">
                  {hasPassed
                    ? `You have achieved a grade of ${currentGrade}%, meeting the minimum requirement of ${credential.passGrade}%.`
                    : `Complete units to earn your grade. You need ${credential.passGrade}% to pass — your current grade is ${currentGrade}%.`}
                </p>
              </div>

              {/* Course content */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#079845"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>
                  <h2 className="text-2xl font-bold text-brand-green">Course Content</h2>
                  <span className="text-2xl font-bold text-brand-dark">{totalSections} section{totalSections !== 1 ? "s" : ""}</span>
                </div>
                <hr className="border-t border-brand-pale mb-6" />

                {credential.sections.length === 0 ? (
                  <p className="text-brand-muted text-sm py-4">No content available yet.</p>
                ) : (
                  <div className="space-y-3">
                    {credential.sections.map(section => {
                      const isOpen = expandedSections.has(section.id);
                      const sectionUnits = section.subsections.reduce((a, ss) => a + ss.units.length, 0);
                      return (
                        <div key={section.id} className="rounded-2xl border border-brand-line overflow-hidden">
                          <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between p-5 text-left hover:bg-brand-wash transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-lg" style={{ color: "var(--bms-dark)" }}>{section.title}</span>
                              <span className="text-sm text-brand-muted">{sectionUnits} unit{sectionUnits !== 1 ? "s" : ""}</span>
                            </div>
                            <svg
                              width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"
                              className={`transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </button>

                          {isOpen && (
                            <div className="border-t border-brand-line">
                              {section.subsections.map(ss => (
                                <div key={ss.id}>
                                  {ss.title && (
                                    <div className="px-5 py-2.5 bg-brand-wash text-sm font-semibold text-brand-muted border-b border-brand-line">
                                      {ss.title}
                                    </div>
                                  )}
                                  {ss.units.map(unit => {
                                    const isDone = completedUnitIds.has(unit.id);
                                    return (
                                      <div
                                        key={unit.id}
                                        className="flex items-center gap-4 px-5 py-4 border-b border-brand-line last:border-0 hover:bg-brand-wash/50 transition-colors"
                                      >
                                        <span className={isDone ? "text-brand-green flex-shrink-0" : "text-brand-muted flex-shrink-0"}>
                                          {isDone ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                                          ) : unitTypeIcon(unit.type)}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-sm font-medium truncate ${isDone ? "text-brand-muted" : "text-brand-dark"}`}>{unit.title}</p>
                                          <p className="text-xs text-brand-muted mt-0.5 capitalize">{unit.type.toLowerCase()}</p>
                                        </div>
                                        {unit.weight > 0 && (
                                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-pale text-brand-green flex-shrink-0">
                                            {unit.weight}%
                                          </span>
                                        )}
                                        <Link
                                          href={`/dashboard/credentials/${credentialId}/units/${unit.id}`}
                                          className="flex-shrink-0 rounded-full bg-brand-green px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-green-dark"
                                        >
                                          {isDone ? "Review" : "Open"}
                                        </Link>
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Completed units */}
              <div className="mt-10">
                <div className="flex items-center gap-2 mb-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#079845"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>
                  <h2 className="text-2xl font-bold text-brand-green">Completed units</h2>
                  <span className="text-2xl font-bold text-brand-dark">{completedCount}</span>
                </div>
                <hr className="border-t border-brand-pale mb-6" />
                {completedCount === 0 ? (
                  <div>
                    <p className="font-semibold text-brand-dark mb-1">As you complete units, you will see them listed here.</p>
                    <p className="text-sm text-brand-muted">Complete units on your schedule to earn your credential!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {credential.sections.flatMap(s => s.subsections.flatMap(ss => ss.units))
                      .filter(u => completedUnitIds.has(u.id))
                      .map(u => (
                        <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-brand-line bg-brand-pale p-3">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#079845" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          <span className="text-sm text-brand-dark flex-1 truncate">{u.title}</span>
                          <Link
                            href={`/dashboard/credentials/${credentialId}/units/${u.id}`}
                            className="text-xs text-brand-green hover:underline flex-shrink-0"
                          >
                            Review
                          </Link>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: progress + record */}
            <aside className="space-y-6">
              {/* Grade ring */}
              <div className={`border-2 rounded-2xl p-8 text-center ${hasPassed ? "border-brand-green bg-brand-pale" : "border-brand-pale"}`}>
                <h3 className="text-xl font-bold mb-6 text-brand-green">
                  {hasPassed ? "Passed!" : "Your Grade"}
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
                      strokeDasharray={`${ringCircumference * gradeFraction} ${ringCircumference}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <p className="text-4xl font-bold" style={{ color: hasPassed ? "var(--bms-green)" : "var(--bms-dark)" }}>
                      {currentGrade}%
                    </p>
                    <p className="text-xs text-brand-muted">
                      {hasPassed ? "Grade achieved" : `Pass required: ${gradeToPass}%`}
                    </p>
                  </div>
                </div>

                {/* Unit completion sub-row */}
                <div className="mt-2 pt-4 border-t border-brand-pale flex items-center justify-between text-sm text-brand-muted">
                  <span>Units completed</span>
                  <span className="font-semibold text-brand-green">{completedCount} / {totalUnits}</span>
                </div>
              </div>

              {/* Credential record */}
              <div>
                <h3 className="text-lg font-bold mb-3 text-brand-green">Credential Record</h3>
                <hr className="border-t border-brand-pale mb-4" />
                {hasPassed ? (
                  <div className="rounded-xl border border-brand-line bg-brand-pale p-4 text-sm text-brand-green">
                    <p className="font-semibold mb-1">You have passed this micro-credential.</p>
                    <p className="text-brand-green mb-4">You achieved {currentGrade}%, above the minimum required grade of {credential.passGrade}%.</p>
                    <button
                      onClick={() => downloadCertificate(credentialId)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm border border-brand-green text-brand-green bg-white hover:bg-brand-pale transition-colors w-full justify-center"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download Certificate
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-brand-muted leading-relaxed">
                    Complete units to build your grade. A minimum of <strong>{credential.passGrade}%</strong> is required to earn this credential record.
                    Your current grade is <strong>{currentGrade}%</strong>.
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
