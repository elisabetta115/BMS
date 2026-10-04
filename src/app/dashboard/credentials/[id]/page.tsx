"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CourseHeader, { CourseFallback } from "@/components/course/CourseHeader";
import { useCourse } from "@/components/course/useCourse";
import { flatUnits } from "@/components/course/types";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRight, ChevronDown, ChevronUp, CircleCheck, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function CourseOutlinePage() {
  const params = useParams();
  const credentialId = params?.id as string;
  const { user, credential, enrolled, loading, error, completedUnitIds } = useCourse(credentialId);
  // null until the learner toggles something: until then the section holding
  // their next unit is open, like the live course outline.
  const [expanded, setExpanded] = useState<Set<string> | null>(null);

  const units = useMemo(() => (credential ? flatUnits(credential) : []), [credential]);
  const nextUnit = units.find((u) => !completedUnitIds.has(u.id)) ?? units[units.length - 1];
  const started = units.some((u) => completedUnitIds.has(u.id));

  const defaultExpanded = useMemo(() => {
    const section = credential?.sections.find((s) =>
      s.subsections.some((ss) => ss.units.some((u) => u.id === nextUnit?.id))
    );
    return new Set(section ? [section.id] : credential?.sections[0] ? [credential.sections[0].id] : []);
  }, [credential, nextUnit]);

  if (!user) return null;
  if (loading) return <><Header /><CourseFallback state="loading" credentialId={credentialId} /></>;
  if (error || !credential) {
    return <><Header /><CourseFallback state="error" credentialId={credentialId} message={error || "Micro-credential not found."} /></>;
  }
  if (!enrolled) return <><Header /><CourseFallback state="not-enrolled" credentialId={credentialId} /></>;

  const openSections = expanded ?? defaultExpanded;
  const allOpen = credential.sections.length > 0 && credential.sections.every((s) => openSections.has(s.id));

  function toggleSection(id: string) {
    const next = new Set(openSections);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  function toggleAll() {
    setExpanded(allOpen ? new Set() : new Set(credential!.sections.map((s) => s.id)));
  }

  const unitHref = (unitId: string) => `/dashboard/credentials/${credentialId}/units/${unitId}`;

  return (
    <>
      <CourseHeader userName={user.username || user.name} course={credential} activeTab="course" />
      <main id="main" className="bms-outline">
        <h1 className="bms-outline-title">{credential.title}</h1>

        <div className="bms-outline-grid">
          <div>
            <div className="bms-outline-start">
              <h2>{started ? "Pick up where you left off" : "Begin your course today"}</h2>
              {nextUnit && (
                <Link href={unitHref(nextUnit.id)} className="bms-outline-start-btn">
                  {started ? "Resume course" : "Start course"} <ArrowRight aria-hidden="true" size={22} />
                </Link>
              )}
            </div>

            <div className="bms-outline-sections-head">
              <h2>Sections</h2>
              {credential.sections.length > 0 && (
                <button type="button" onClick={toggleAll} className="bms-outline-expand">
                  {allOpen ? "Collapse all" : "Expand all"}
                  {allOpen ? <ChevronUp aria-hidden="true" size={22} /> : <ChevronDown aria-hidden="true" size={22} />}
                </button>
              )}
            </div>

            {credential.sections.length === 0 ? (
              <p className="bms-outline-empty">No content available yet.</p>
            ) : (
              <ol className="bms-outline-sections">
                {credential.sections.map((section) => {
                  const isOpen = openSections.has(section.id);
                  return (
                    <li key={section.id} className={cn("bms-outline-section", isOpen && "is-open")}>
                      <button
                        type="button"
                        className="bms-outline-section-btn"
                        onClick={() => toggleSection(section.id)}
                        aria-expanded={isOpen}
                      >
                        <span>{section.title}</span>
                        {isOpen ? <Minus aria-hidden="true" size={22} strokeWidth={3} /> : <Plus aria-hidden="true" size={22} strokeWidth={3} />}
                      </button>
                      {isOpen && (
                        <ul className="bms-outline-subsections">
                          {section.subsections.map((ss) => {
                            const done = ss.units.length > 0 && ss.units.every((u) => completedUnitIds.has(u.id));
                            return (
                              <li key={ss.id}>
                                <CircleCheck
                                  aria-label={done ? "Completed" : "Not completed"}
                                  size={18}
                                  strokeWidth={1.75}
                                  className={done ? "is-done" : undefined}
                                />
                                {ss.units[0] ? (
                                  <Link href={unitHref(ss.units[0].id)}>{ss.title}</Link>
                                ) : (
                                  <span>{ss.title}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
