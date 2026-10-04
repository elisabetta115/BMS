"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { CircleCheck } from "lucide-react";

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
  const [enrolledCredIds, setEnrolledCredIds] = useState<Set<string>>(new Set());
  const [enrollingCredId, setEnrollingCredId] = useState<string | null>(null);
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
          setEnrolledCredIds(new Set((enrRes.credentials || []).map((c: any) => c.id)));
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

  // "Enroll Now" on a course card works like "Enrol" on a micro-credential.
  async function handleEnrollCourse(credentialId: string) {
    setEnrollingCredId(credentialId);
    setError("");
    try {
      const r = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "credential", id: credentialId }),
      });
      if (r.ok) {
        router.push("/dashboard/my-credentials");
        return;
      }
      const d = await r.json().catch(() => ({}));
      setError(d.error || "Failed to enroll.");
    } catch {
      setError("Network error.");
    }
    setEnrollingCredId(null);
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
    ? programme.credentials.filter((c) => credProgress[c.id]?.hasPassed)
    : [];
  const completedCount = completedCredentials.length;
  const remainingCourses = programme.credentials.filter((c) => !credProgress[c.id]?.hasPassed);
  const hasPassed = enrolled && progressLoaded && totalCourses > 0 && completedCount === totalCourses;

  // Segmented progress ring: one segment per course, green once that course is passed.
  const ringRadius = 108;
  const segment = (2 * Math.PI * ringRadius) / Math.max(totalCourses, 1);

  function courseButton(c: MicroCredential) {
    if (enrolledCredIds.has(c.id)) {
      return (
        <Link href={`/dashboard/credentials/${c.id}`} className="bms-prog-course-btn">
          View Course
        </Link>
      );
    }
    if (!user || !enrolled) {
      return (
        <Link href={`/credentials/${c.id}`} className="bms-prog-course-btn">
          View Course
        </Link>
      );
    }
    return (
      <button
        type="button"
        className="bms-prog-course-btn"
        onClick={() => handleEnrollCourse(c.id)}
        disabled={enrollingCredId === c.id}
      >
        {enrollingCredId === c.id ? "Enrolling…" : "Enroll Now"}
      </button>
    );
  }

  return (
    <>
      <Header />
      <main id="main" className="bms-prog">
        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="bms-prog-grid">
          <div>
            <h1 className="bms-prog-title">{programme.title}</h1>

            <div className="bms-prog-journey">
              <h2>{hasPassed ? "Programme Complete!" : "Your Programme Journey"}</h2>
              <p>
                {hasPassed
                  ? `You have passed all ${totalCourses} courses in this programme.`
                  : `Track and plan your progress through the ${totalCourses} courses in this programme. To complete the programme, you must earn a verified certificate for each course.`}
              </p>
            </div>

            <h2 className="bms-prog-list-heading">
              <svg width="24" height="28" viewBox="5 3 14 18" fill="#079845" aria-hidden="true"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>
              Remaining Courses <span>{remainingCourses.length}</span>
            </h2>
            {remainingCourses.length === 0 ? (
              <p className="bms-prog-empty">All courses complete!</p>
            ) : (
              <ul className="bms-prog-courses">
                {remainingCourses.map((c) => (
                  <li key={c.id}>
                    <h3>{c.title}</h3>
                    <p>
                      {c.code} | {c.project}
                    </p>
                    <div className="bms-prog-course-actions">{courseButton(c)}</div>
                  </li>
                ))}
              </ul>
            )}

            <h2 className="bms-prog-list-heading">
              <svg width="24" height="28" viewBox="5 3 14 18" fill="#079845" aria-hidden="true"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>
              Completed courses <span>{completedCount}</span>
            </h2>
            {completedCredentials.length === 0 ? (
              <div className="bms-prog-empty">
                <p>
                  <strong>As you complete courses, you will see them listed here.</strong>
                </p>
                <p>Complete courses on your schedule to ensure you stand out in your field!</p>
              </div>
            ) : (
              <ul className="bms-prog-courses">
                {completedCredentials.map((c) => (
                  <li key={c.id}>
                    <h3>
                      <Link href={`/dashboard/credentials/${c.id}`}>{c.title}</Link>
                    </h3>
                    <p>
                      {c.code} | {c.project}
                    </p>
                    <p className="bms-prog-cert-status">
                      Certificate Status: <CircleCheck aria-label="Earned" size={20} fill="#079845" stroke="#fff" />
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside>
            {!enrolled && (
              <div className="bms-prog-enrol">
                <p>
                  {user
                    ? "Enroll to start tracking your progress through this programme."
                    : "Log in to enroll and track your progress."}
                </p>
                <button type="button" onClick={handleEnroll} disabled={enrolling} className="bms-outline-start-btn">
                  {user ? (enrolling ? "Enrolling…" : "Enroll in this programme") : "Log in to enroll"}
                </button>
              </div>
            )}

            <div className="bms-prog-progress">
              <h2>Programme Progress</h2>
              <div className="bms-prog-ring">
                <svg width="250" height="250" viewBox="0 0 250 250" className="-rotate-90" aria-hidden="true">
                  {programme.credentials.map((c, i) => (
                    <circle
                      key={c.id}
                      cx="125"
                      cy="125"
                      r={ringRadius}
                      fill="none"
                      stroke={credProgress[c.id]?.hasPassed ? "#079845" : "#d5e7d0"}
                      strokeWidth="28"
                      strokeDasharray={`${segment - 6} ${2 * Math.PI * ringRadius}`}
                      strokeDashoffset={-(segment * i + 3)}
                    />
                  ))}
                  {programme.credentials.map((c, i) => (
                    <circle
                      key={`tick-${c.id}`}
                      cx="125"
                      cy="125"
                      r={ringRadius}
                      fill="none"
                      stroke="#079845"
                      strokeWidth="28"
                      strokeDasharray={`6 ${2 * Math.PI * ringRadius}`}
                      strokeDashoffset={-(segment * i - 3)}
                    />
                  ))}
                </svg>
                <span>
                  {completedCount} / {totalCourses}
                </span>
              </div>
            </div>

            {completedCredentials.length > 0 && (
              <div className="bms-prog-earned">
                <h2>Earned Certificates</h2>
                <ul>
                  {completedCredentials.map((c) => (
                    <li key={c.id}>
                      <Link href={`/dashboard/credentials/${c.id}/certificate`} className="bms-prog-earned-thumb" aria-label={`${c.title} certificate`}>
                        <svg viewBox="0 0 64 48" aria-hidden="true">
                          <rect x="2" y="2" width="60" height="44" rx="2" fill="#fff" stroke="#454545" strokeWidth="2.5" />
                          <rect x="10" y="12" width="22" height="3" fill="#079845" />
                          <rect x="10" y="20" width="28" height="2" fill="#bdbdbd" />
                          <rect x="10" y="26" width="24" height="2" fill="#bdbdbd" />
                          <circle cx="48" cy="20" r="7" fill="#d5e7d0" stroke="#079845" strokeWidth="2" />
                          <path d="M44 26l-2 12 6-3 6 3-2-12" fill="#079845" />
                        </svg>
                      </Link>
                      <Link href={`/dashboard/credentials/${c.id}/certificate`}>{c.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bms-prog-record">
              <h2>Programme Record</h2>
              {hasPassed ? (
                <>
                  <p>You have completed this programme. All {totalCourses} courses have been passed.</p>
                  <button type="button" onClick={() => downloadCertificate(programmeId)} className="bms-outline-start-btn">
                    Download Certificate
                  </button>
                </>
              ) : (
                <p>
                  Once you complete one of the program requirements you have a program record. This record is marked
                  complete once you meet all program requirements. A program record can be used to continue your
                  learning journey and demonstrate your learning to others.
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
