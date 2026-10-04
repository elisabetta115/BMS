"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CourseCredential } from "./types";

interface SessionUser {
  name: string;
  username: string | null;
  role: string;
}

/** Loads everything an enrolled learner's course pages need: session, credential, enrolment and progress. */
export function useCourse(credentialId: string) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [credential, setCredential] = useState<CourseCredential | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completedUnitIds, setCompletedUnitIds] = useState<Set<string>>(new Set());
  const [currentGrade, setCurrentGrade] = useState(0);
  const [hasPassed, setHasPassed] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setUser(d.user);
        else router.push("/login");
      })
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    if (!user || !credentialId) return;
    Promise.all([
      fetch(`/api/micro-credentials/${credentialId}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/enrollments").then((r) => (r.ok ? r.json() : { credentials: [] })),
      fetch(`/api/micro-credentials/${credentialId}/progress`).then((r) =>
        r.ok ? r.json() : { completedUnitIds: [] }
      ),
    ])
      .then(([credRes, enrRes, progRes]) => {
        if (!credRes?.credential) {
          setError("Micro-credential not found.");
          return;
        }
        setCredential(credRes.credential);
        setEnrolled((enrRes.credentials || []).some((c: { id: string }) => c.id === credentialId));
        setCompletedUnitIds(new Set(progRes.completedUnitIds || []));
        setCurrentGrade(progRes.currentGrade ?? 0);
        setHasPassed(progRes.hasPassed ?? false);
      })
      .catch(() => setError("Failed to load micro-credential."))
      .finally(() => setLoading(false));
  }, [user, credentialId]);

  return {
    user,
    credential,
    enrolled,
    loading,
    error,
    completedUnitIds,
    setCompletedUnitIds,
    currentGrade,
    hasPassed,
  };
}
