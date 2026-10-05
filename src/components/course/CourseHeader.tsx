"use client";

import Link from "next/link";
import MfeHeader from "@/components/MfeHeader";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils/cn";

interface CourseInfo {
  id: string;
  title: string;
  code: string;
  project: string;
  organisation: string | null;
}

/** Learner course header: course code + title, user menu, and Course / Progress tabs. */
export default function CourseHeader({
  userName,
  course,
  activeTab,
}: {
  userName: string;
  course: CourseInfo;
  activeTab: "course" | "progress";
}) {
  const base = `/dashboard/credentials/${course.id}`;
  return (
    <header className="bms-course-header">
      <MfeHeader
        userName={userName}
        menuItems={[
          { label: "Account", href: "/dashboard/profile" },
          { label: "Sign Out", logout: true },
        ]}
      >
        <div className="bms-mfe-course">
          <span className="bms-mfe-course-meta">
            {[course.organisation, `${course.code} | ${course.project}`].filter(Boolean).join(" ")}
          </span>
          <span className="bms-mfe-course-title">{course.title}</span>
        </div>
      </MfeHeader>
      <nav className="bms-course-tabs" aria-label="Course">
        <Link href={base} className={cn(activeTab === "course" && "is-active")} aria-current={activeTab === "course" ? "page" : undefined}>
          Course
        </Link>
        <Link
          href={`${base}/progress`}
          className={cn(activeTab === "progress" && "is-active")}
          aria-current={activeTab === "progress" ? "page" : undefined}
        >
          Progress
        </Link>
      </nav>
    </header>
  );
}

/** Loading / error / not-enrolled states shared by the learner course pages. */
export function CourseFallback({
  state,
  credentialId,
  message,
}: {
  state: "loading" | "error" | "not-enrolled";
  credentialId: string;
  message?: string;
}) {
  return (
    <>
      <main id="main" className="py-20">
        {state === "loading" ? (
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-green border-t-transparent" />
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-4 text-center">
            <p className="mb-4 text-brand-muted">
              {state === "not-enrolled" ? "You are not enrolled in this micro-credential." : message}
            </p>
            {state === "not-enrolled" ? (
              <Link
                href={`/credentials/${credentialId}`}
                className="inline-flex items-center justify-center rounded-full bg-brand-green px-8 py-3 text-sm font-bold text-white"
              >
                View and enroll
              </Link>
            ) : (
              <Link href="/dashboard/my-credentials" className="font-semibold text-brand-green hover:underline">
                ← Back to my micro-credentials
              </Link>
            )}
          </div>
        )}
      </main>
      {state !== "loading" && <Footer />}
    </>
  );
}
