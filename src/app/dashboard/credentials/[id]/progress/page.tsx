"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CourseHeader, { CourseFallback } from "@/components/course/CourseHeader";
import { useCourse } from "@/components/course/useCourse";
import { flatUnits, type Answer, type Unit } from "@/components/course/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronUp, CircleCheck, TriangleAlert } from "lucide-react";

const TYPE_LABELS: Record<Unit["type"], string> = { VIDEO: "Video", PRESENTATION: "Presentation", QUIZ: "Quiz" };

export default function CourseProgressPage() {
  const params = useParams();
  const credentialId = params?.id as string;
  const { user, credential, enrolled, loading, error, completedUnitIds, currentGrade, hasPassed } =
    useCourse(credentialId);
  const [openSubsections, setOpenSubsections] = useState<Set<string>>(new Set());
  // Like the live site: "Request certificate" generates it, then "View my certificate" appears.
  const [certState, setCertState] = useState<"ready" | "generating" | "available">("ready");
  const [certError, setCertError] = useState("");
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());

  useEffect(() => {
    if (!enrolled || !credentialId) return;
    fetch(`/api/micro-credentials/${credentialId}/answers`)
      .then((r) => (r.ok ? r.json() : { answers: [] }))
      .then((d) => setAnswers(new Map((d.answers || []).map((a: Answer) => [a.questionId, a]))))
      .catch(() => {});
  }, [enrolled, credentialId]);

  async function requestCertificate() {
    setCertState("generating");
    setCertError("");
    try {
      const r = await fetch(`/api/certificates/download?credentialId=${credentialId}`);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Certificate not available for this project yet.");
      }
      setCertState("available");
    } catch (e) {
      setCertError((e as Error).message);
      setCertState("ready");
    }
  }

  if (!user) return null;
  if (loading) return <><Header /><CourseFallback state="loading" credentialId={credentialId} /></>;
  if (error || !credential) {
    return <><Header /><CourseFallback state="error" credentialId={credentialId} message={error || "Micro-credential not found."} /></>;
  }
  if (!enrolled) return <><Header /><CourseFallback state="not-enrolled" credentialId={credentialId} /></>;

  const outlineHref = `/dashboard/credentials/${credentialId}`;
  const allUnits = flatUnits(credential);
  const completion = allUnits.length
    ? Math.round((allUnits.filter((u) => completedUnitIds.has(u.id)).length / allUnits.length) * 100)
    : 0;

  // Same rule as the server (src/lib/grading.ts): a quiz earns its weight in proportion to right
  // answers; quizzes finished before answers were recorded keep their full weight.
  const submitted = (questionId: string) => (answers.get(questionId)?.attempts ?? 0) > 0;
  const isLegacyDone = (u: Unit) => completedUnitIds.has(u.id) && !u.questions.some((q) => submitted(q.id));
  const questionPoint = (u: Unit, questionId: string) =>
    submitted(questionId) ? (answers.get(questionId)?.correct ? 1 : 0) : isLegacyDone(u) ? 1 : 0;
  function unitEarned(u: Unit) {
    if (u.type === "QUIZ" && u.questions.length > 0) {
      const right = u.questions.reduce((sum, q) => sum + questionPoint(u, q.id), 0);
      return (u.weight * right) / u.questions.length;
    }
    return completedUnitIds.has(u.id) ? u.weight : 0;
  }

  // Grade summary: one row per kind of graded unit (each unit carries a % weight of the final grade).
  const summary = (Object.keys(TYPE_LABELS) as Unit["type"][])
    .map((type) => {
      const graded = allUnits.filter((u) => u.type === type && u.weight > 0);
      const weight = graded.reduce((sum, u) => sum + u.weight, 0);
      const earned = Math.round(graded.reduce((sum, u) => sum + unitEarned(u), 0));
      return { type, weight, earned, grade: weight ? Math.round((earned / weight) * 100) : 0 };
    })
    .filter((row) => row.weight > 0);

  // Detailed grades: every quiz question is one point.
  const detailed = credential.sections
    .map((section) => ({
      section,
      subsections: section.subsections
        .map((ss) => {
          const problems = ss.units
            .filter((u) => u.type === "QUIZ")
            .flatMap((u) => u.questions.map((q) => ({ id: q.id, earned: questionPoint(u, q.id) })));
          return { ss, problems, earned: problems.reduce((sum, p) => sum + p.earned, 0) };
        })
        .filter((row) => row.problems.length > 0),
    }))
    .filter((row) => row.subsections.length > 0);

  function toggleSubsection(id: string) {
    setOpenSubsections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Donut ring for course completion.
  const ringRadius = 64;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const gradeBar = Math.min(currentGrade, 100);

  return (
    <>
      <CourseHeader userName={user.username || user.name} course={credential} activeTab="progress" />
      <main id="main" className="bms-outline">
        <h1 className="bms-progress-title">Your progress</h1>

        <div className="bms-progress-grid">
          <div>
            <section className="bms-progress-completion">
              <div>
                <h2>Course completion</h2>
                <p>
                  This represents how much of the course content you have completed. Note that some content may not
                  yet be released.
                </p>
              </div>
              <div className="bms-progress-ring" aria-label={`${completion}% of the course completed`}>
                <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90" aria-hidden="true">
                  <circle cx="80" cy="80" r={ringRadius} fill="none" stroke="#d5e7d0" strokeWidth="26" />
                  {completion > 0 && (
                    <circle
                      cx="80"
                      cy="80"
                      r={ringRadius}
                      fill="none"
                      stroke="#079845"
                      strokeWidth="26"
                      strokeDasharray={`${(ringCircumference * completion) / 100} ${ringCircumference}`}
                    />
                  )}
                </svg>
                <span>{completion}%</span>
              </div>
            </section>

            <section className="bms-progress-grades">
              <div>
                <h2>Grades</h2>
                <p>This represents your weighted grade against the grade needed to pass this course.</p>
              </div>
              <div className="bms-progress-bar" aria-label={`Current grade ${currentGrade}%, passing grade ${credential.passGrade}%`}>
                <div
                  className={`bms-progress-bar-current${gradeBar >= 50 ? " is-right" : ""}`}
                  style={{ left: `${gradeBar}%` }}
                >
                  <span className="bms-progress-bar-tip">{currentGrade}%</span>
                  <span className="bms-progress-bar-label">Your current grade</span>
                </div>
                <div className="bms-progress-bar-track">
                  {/* Green fill shows only the grade earned so far; the pass mark is just the dot. */}
                  <span style={{ width: `${gradeBar}%` }} />
                  <i style={{ left: `${credential.passGrade}%` }} />
                </div>
                <div className="bms-progress-bar-pass" style={{ left: `${credential.passGrade}%` }}>
                  <span className="bms-progress-bar-label">Passing grade</span>
                  <span className="bms-progress-bar-tip">{credential.passGrade}%</span>
                </div>
              </div>
            </section>

            <p className="bms-progress-alert">
              {hasPassed ? (
                <>
                  <CircleCheck aria-hidden="true" size={28} fill="currentColor" stroke="#f6f7f9" />
                  You&apos;re currently passing this course
                </>
              ) : (
                <>
                  <TriangleAlert aria-hidden="true" size={26} fill="currentColor" stroke="#f6f7f9" />
                  A weighted grade of {credential.passGrade}% is required to pass in this course
                </>
              )}
            </p>

            <h2 className="bms-progress-heading">Grade summary</h2>
            <div className="bms-progress-table">
              <table>
                <thead>
                  <tr>
                    <th>Assignment type</th>
                    <th>Weight</th>
                    <th>Grade</th>
                    <th>Weighted grade</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row) => (
                    <tr key={row.type}>
                      <td>{TYPE_LABELS[row.type]}</td>
                      <td>{row.weight}%</td>
                      <td>{row.grade}%</td>
                      <td>
                        <strong>{row.earned}%</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Your current weighted grade summary</td>
                    <td>{currentGrade}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <h2 className="bms-progress-heading">Detailed grades</h2>
            {detailed.length === 0 ? (
              <p className="bms-progress-note">You currently have no graded problem scores.</p>
            ) : (
              detailed.map(({ section, subsections }) => (
                <div key={section.id} className="bms-progress-table bms-progress-detail">
                  <div className="bms-progress-detail-head">
                    <span>{section.title}</span>
                    <span>Score</span>
                  </div>
                  {subsections.map(({ ss, problems, earned }) => {
                    const isOpen = openSubsections.has(ss.id);
                    return (
                      <div key={ss.id} className="bms-progress-detail-row">
                        <div className="bms-progress-detail-line">
                          <button
                            type="button"
                            onClick={() => toggleSubsection(ss.id)}
                            aria-expanded={isOpen}
                            aria-label={`${isOpen ? "Hide" : "Show"} problem scores for ${ss.title}`}
                          >
                            {isOpen ? <ChevronUp aria-hidden="true" size={18} /> : <ChevronDown aria-hidden="true" size={18} />}
                          </button>
                          <Link href={`${outlineHref}/units/${ss.units[0].id}`}>{ss.title}</Link>
                          <span>
                            {earned}/{problems.length}
                          </span>
                        </div>
                        {isOpen && (
                          <p className="bms-progress-problems">
                            Problem Scores:
                            {problems.map((p) => (
                              <span key={p.id}>{p.earned}/1</span>
                            ))}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}

            <p className="bms-progress-footnote">
              For progress on ungraded aspects of the course, view your <Link href={outlineHref}>Course Outline</Link>.
            </p>
          </div>

          <aside className="bms-progress-side">
            <section className="bms-progress-cert">
              {!hasPassed ? (
                <>
                  <h2>Certificate status</h2>
                  <p>In order to qualify for a certificate, you must have a passing grade.</p>
                </>
              ) : certState === "available" ? (
                <>
                  <h2>Your certificate is available!</h2>
                  <p>
                    Showcase your accomplishment on LinkedIn or your resumé today. You can download your certificate
                    now and access it any time from your <Link href="/dashboard/my-credentials">Dashboard</Link> and{" "}
                    <Link href="/dashboard/profile">Profile</Link>.
                  </p>
                  <Link href={`${outlineHref}/certificate`} className="bms-progress-cert-btn">
                    View my certificate
                  </Link>
                </>
              ) : (
                <>
                  <h2>Certificate status</h2>
                  <p>Congratulations, you qualified for a certificate! In order to access your certificate, request it below.</p>
                  <button type="button" className="bms-progress-cert-btn" onClick={requestCertificate}>
                    Request certificate
                  </button>
                  {certError && <p className="bms-modal-error">{certError}</p>}
                </>
              )}
            </section>

            <section className="bms-progress-links">
              <h2>Related links</h2>
              <Link href={outlineHref}>Course Outline</Link>
              <p>A birds-eye view of your course content.</p>
            </section>
          </aside>
        </div>
      </main>
      <Footer />
      {certState === "generating" && (
        <div className="bms-progress-generating" role="status">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-brand-green" />
          <p>Generating certificate...</p>
        </div>
      )}
    </>
  );
}
