"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface MicroCredential {
  id: string;
  title: string;
  code: string;
}
interface MicroProgramme {
  id: string;
  title: string;
  slug: string;
  code: string;
  project: string;
  description: string | null;
  image: string | null;
  hasImage: boolean;
  credentials?: MicroCredential[];
}

export default function ProgramsPage() {
  const router = useRouter();
  const [programmes, setProgrammes] = useState<MicroProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrolError, setEnrolError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.user) return;
        setIsLoggedIn(true);
        return fetch("/api/enrollments")
          .then((r) => (r.ok ? r.json() : { programmes: [] }))
          .then((e) => setEnrolledIds(new Set((e.programmes || []).map((p: { id: string }) => p.id))));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/micro-programmes")
      .then((r) => (r.ok ? r.json() : { programmes: [] }))
      .then((d) => setProgrammes(d.programmes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Live behaviour: "Enrol" enrols in the programme and opens the programme page,
  // where each micro-credential has its own "Enroll Now".
  async function handleEnrol(id: string) {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/programs/${id}`);
      return;
    }
    if (enrolledIds.has(id)) {
      router.push(`/programs/${id}`);
      return;
    }
    setEnrollingId(id);
    setEnrolError(null);
    try {
      const r = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "programme", id }),
      });
      if (r.ok) {
        router.push(`/programs/${id}`);
        return;
      }
      const d = await r.json().catch(() => ({}));
      setEnrolError({ id, message: d.error || "Failed to enrol." });
    } catch {
      setEnrolError({ id, message: "Network error. Please try again." });
    }
    setEnrollingId(null);
  }

  return (
    <>
      <Header />
      <main id="main">
        <section className="bms-section bms-catalogue">
          <span className="bms-section-eyebrow">Catalogue</span>
          <h1 className="bms-section-title">Micro-programmes</h1>

          {loading ? (
            <p className="bms-courses-empty">Loading micro-programmes…</p>
          ) : programmes.length === 0 ? (
            <p className="bms-courses-empty">No micro-programmes available yet.</p>
          ) : (
            <div className="bms-program-grid">
              {programmes.map((p) => {
                const href = `/programs/${p.id}`;
                const img = p.hasImage ? `/api/images/programme/${p.id}` : p.image || "";
                return (
                  <article className="bms-program-card" key={p.id}>
                    <Link aria-label={p.title} href={href}>
                      <div className="bms-card-image flex items-center justify-center">
                        {img ? (
                          <img src={img} alt={p.title} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-4xl font-bold text-brand-green/30">{p.code}</span>
                        )}
                      </div>
                    </Link>
                    <div className="bms-card-body">
                      <h3 className="bms-card-title">
                        <Link href={href}>{p.title}</Link>
                      </h3>
                      <div className="mb-8">
                        <p className="bms-card-meta">
                          {p.code} | {p.project}
                        </p>
                        {p.credentials && p.credentials.length > 0 && (
                          <p className="bms-card-list-title">Includes the following micro-credentials:</p>
                        )}
                      </div>
                      {p.credentials && p.credentials.length > 0 && (
                        <ul className="bms-card-list">
                          {p.credentials.map((c) => (
                            <li key={c.id}>{c.title}</li>
                          ))}
                        </ul>
                      )}
                      <div className="bms-card-actions">
                        <button
                          type="button"
                          className="bms-pill"
                          onClick={() => handleEnrol(p.id)}
                          disabled={enrollingId === p.id}
                        >
                          {enrollingId === p.id ? "Enrolling…" : "Enrol"}
                        </button>
                        {enrolError?.id === p.id && <p className="bms-enrol-error mt-3">{enrolError.message}</p>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
