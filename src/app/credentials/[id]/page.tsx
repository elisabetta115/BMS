"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState, useEffect } from "react";
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

function unitTypeLabel(type: string) {
  if (type === "VIDEO") return "Video";
  if (type === "PRESENTATION") return "Presentation";
  if (type === "QUIZ") return "Quiz";
  return type;
}

function unitTypeIcon(type: string) {
  if (type === "VIDEO") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
  );
  if (type === "PRESENTATION") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
  );
}

export default function CredentialDetailPage() {
  const router = useRouter();
  const params = useParams();
  const credentialId = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [credential, setCredential] = useState<MicroCredential | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setUser(d.user); })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authChecked || !credentialId) return;

    const tasks: Promise<any>[] = [
      fetch(`/api/micro-credentials/${credentialId}`).then(r => r.ok ? r.json() : null),
    ];
    if (user) {
      tasks.push(fetch("/api/enrollments").then(r => r.ok ? r.json() : { credentials: [] }));
    }

    Promise.all(tasks)
      .then(([credRes, enrRes]) => {
        if (!credRes?.credential) { setError("Micro-credential not found."); return; }
        setCredential(credRes.credential);
        if (enrRes) {
          const isEnrolled = (enrRes.credentials || []).some((c: any) => c.id === credentialId);
          setEnrolled(isEnrolled);
        }
      })
      .catch(() => setError("Failed to load micro-credential."))
      .finally(() => setLoading(false));
  }, [authChecked, user, credentialId]);

  async function handleEnroll() {
    if (!user) { router.push(`/login?redirect=/credentials/${credentialId}`); return; }
    setEnrolling(true);
    try {
      const r = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "credential", id: credentialId }),
      });
      if (r.ok) setEnrolled(true);
      else { const d = await r.json(); setError(d.error || "Failed to enroll."); }
    } catch { setError("Network error."); }
    setEnrolling(false);
  }

  function toggleSection(id: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (!authChecked || loading) {
    return (
      <>
        <Header />
        <main className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-4 w-36 bg-gray-200 rounded animate-pulse mb-6" />
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="h-3 w-48 bg-gray-200 rounded animate-pulse mb-3" />
                <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-8 w-1/2 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-40 bg-gray-200 rounded animate-pulse mb-6" />
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse mb-8" />
                <div className="rounded-2xl bg-gray-100 p-6 mb-10">
                  <div className="h-5 w-44 bg-gray-200 rounded animate-pulse mb-3" />
                  <div className="h-3 w-full bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-2xl border border-brand-line p-5">
                      <div className="h-5 w-2/3 bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-3 w-1/4 bg-gray-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
              <aside className="space-y-6">
                <div className="rounded-2xl h-48 bg-gray-200 animate-pulse" />
                <div className="border-2 border-gray-200 rounded-2xl p-6">
                  <div className="h-3 w-full bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-4/5 bg-gray-200 rounded animate-pulse mb-4" />
                  <div className="h-11 w-full bg-gray-200 rounded-full animate-pulse" />
                </div>
                <div className="rounded-2xl border border-brand-line p-6 space-y-4">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </main>
        <Footer />
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
            <Link href="/courses" className="font-semibold text-brand-green hover:underline">
              ← Back to micro-credentials
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const totalUnits = credential.sections.reduce(
    (acc, s) => acc + s.subsections.reduce((a, ss) => a + ss.units.length, 0), 0
  );
  const totalSections = credential.sections.length;

  return (
    <>
      <Header />
      <main id="main">
        <div className="mx-auto max-w-[1180px] px-6 py-12 lg:px-8">
          <Link
            href={enrolled ? "/dashboard/my-credentials" : "/courses"}
            className="mb-6 inline-block text-sm font-semibold text-brand-muted transition-colors hover:text-brand-green"
          >
            ← {enrolled ? "Back to my micro-credentials" : "Back to micro-credentials"}
          </Link>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid gap-10 lg:grid-cols-3">
            {/* Left: content */}
            <div className="lg:col-span-2">
              <p className="mb-3 text-lg font-bold text-brand-green">{credential.code} | {credential.project}</p>
              <h1 className="mb-4 text-4xl font-bold leading-tight text-brand-dark md:text-5xl">
                {credential.title}
              </h1>

              {credential.developedBy && (
                <p className="mb-6 text-sm text-brand-muted">
                  Developed by: <span className="font-semibold text-brand-dark">{credential.developedBy}</span>
                </p>
              )}

              {credential.description && (
                <p className="mb-8 text-lg leading-8 text-brand-muted">{credential.description}</p>
              )}

              {/* Journey box */}
              <div className="bg-brand-pale rounded-2xl p-6 mb-10">
                <h3 className="font-bold text-lg mb-2 text-brand-green">Your Learning Journey</h3>
                <p className="text-sm text-brand-dark">
                  Track and complete your progress through the {totalUnits} unit{totalUnits !== 1 ? "s" : ""} in this micro-credential.
                  A minimum grade of <strong>{credential.passGrade}%</strong> is required to pass.
                </p>
              </div>

              {/* Overview */}
              {credential.overview && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4 text-brand-green">Overview</h2>
                  <hr className="border-t border-brand-pale mb-4" />
                  <p className="text-brand-muted leading-relaxed whitespace-pre-line">{credential.overview}</p>
                </div>
              )}

              {/* Objectives */}
              {credential.objectives && (
                <div className="mb-10">
                  <h2 className="text-2xl font-bold mb-4 text-brand-green">Learning Objectives</h2>
                  <hr className="border-t border-brand-pale mb-4" />
                  <p className="text-brand-muted leading-relaxed whitespace-pre-line">{credential.objectives}</p>
                </div>
              )}

              {/* Course structure */}
              {credential.sections.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#079845"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>
                    <h2 className="text-2xl font-bold text-brand-green">Course Content</h2>
                    <span className="text-lg font-bold text-brand-muted">{totalSections} section{totalSections !== 1 ? "s" : ""} · {totalUnits} unit{totalUnits !== 1 ? "s" : ""}</span>
                  </div>
                  <hr className="border-t border-brand-pale mb-6" />

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
                            <div>
                              <span className="font-semibold text-base" style={{ color: "var(--bms-dark)" }}>{section.title}</span>
                              <span className="ml-3 text-sm text-brand-muted">{sectionUnits} unit{sectionUnits !== 1 ? "s" : ""}</span>
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
                                    <div className="px-5 py-2 bg-brand-wash text-sm font-medium text-brand-muted border-b border-brand-line">
                                      {ss.title}
                                    </div>
                                  )}
                                  {ss.units.map(unit => (
                                    <div key={unit.id} className="flex items-center gap-3 px-5 py-3 border-b border-brand-line last:border-0">
                                      <span className="text-brand-muted flex-shrink-0">{unitTypeIcon(unit.type)}</span>
                                      <span className="text-sm text-brand-dark flex-1">{unit.title}</span>
                                      <span className="text-xs text-brand-muted flex-shrink-0">{unitTypeLabel(unit.type)}</span>
                                      {unit.weight > 0 && (
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-pale text-brand-green flex-shrink-0">
                                          {unit.weight}%
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right: sidebar */}
            <aside className="space-y-6">
              {/* Image / placeholder */}
              <div className="rounded-2xl overflow-hidden h-48 bg-gradient-to-br from-[var(--bms-green)] to-[#079845] flex items-center justify-center">
                {credential.hasImage ? (
                  <img src={`/api/images/credential/${credential.id}`} alt={credential.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white/40 text-6xl font-bold">{credential.code}</span>
                )}
              </div>

              {/* Enroll card or continue button */}
              {enrolled ? (
                <div className="border border-brand-green rounded-2xl p-6 text-center">
                  <p className="text-sm font-semibold text-brand-green mb-1">You are enrolled</p>
                  <p className="text-xs text-brand-muted mb-4">Track your progress and access all course materials.</p>
                  <Link
                    href={`/dashboard/credentials/${credential.id}`}
                    className="block w-full px-6 py-3 rounded-full text-white font-medium text-sm text-center transition-colors"
                    style={{ background: "var(--bms-green)" }}
                  >
                    Continue Learning
                  </Link>
                </div>
              ) : (
                <div className="border border-brand-green rounded-2xl p-6 text-center">
                  <p className="text-sm text-brand-muted mb-4">
                    {user
                      ? "Enroll to access all course materials and track your progress."
                      : "Log in to enroll and start learning."}
                  </p>
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full px-6 py-3 rounded-full text-white font-medium text-sm transition-colors disabled:opacity-60"
                    style={{ background: "var(--bms-green)" }}
                  >
                    {user ? (enrolling ? "Enrolling…" : "Enroll in this micro-credential") : "Log in to enroll"}
                  </button>
                </div>
              )}

              {/* Stats card */}
              <div className="rounded-2xl border border-brand-line p-6 space-y-4">
                <h3 className="font-bold text-base" style={{ color: "var(--bms-dark)" }}>Credential Details</h3>

                <div className="flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#079845"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>
                  <span className="text-sm text-brand-muted">{totalSections} section{totalSections !== 1 ? "s" : ""}</span>
                </div>

                <div className="flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#079845"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                  <span className="text-sm text-brand-muted">{totalUnits} unit{totalUnits !== 1 ? "s" : ""} total</span>
                </div>

                <div className="flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#079845"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" /></svg>
                  <span className="text-sm text-brand-muted">Pass grade: <strong>{credential.passGrade}%</strong></span>
                </div>

                {credential.developedBy && (
                  <div className="flex items-start gap-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#079845" className="flex-shrink-0 mt-0.5"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                    <span className="text-sm text-brand-muted">By {credential.developedBy}</span>
                  </div>
                )}
              </div>

              {/* Credential Record */}
              <div>
                <h3 className="text-lg font-bold mb-3 text-brand-green">Credential Record</h3>
                <hr className="border-t border-brand-pale mb-4" />
                <p className="text-sm text-brand-muted leading-relaxed">
                  Once you meet all requirements for this micro-credential, you will receive a credential record.
                  This record can be used to demonstrate your skills and continue your learning journey.
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
