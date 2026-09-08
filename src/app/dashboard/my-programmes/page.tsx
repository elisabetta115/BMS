"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { ArrowRight, Award, Search } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

interface MicroCredential {
  id: string;
  title: string;
  slug: string;
  code: string;
  project: string;
  passGrade: number;
}

interface MicroProgramme {
  id: string;
  title: string;
  slug: string;
  code: string;
  project: string;
  description: string | null;
  image: string | null;
  hasImage?: boolean;
  credentials?: MicroCredential[];
}

interface CredentialProgress {
  currentGrade: number;
  hasPassed: boolean;
}

async function downloadCertificate(url: string) {
  const r = await fetch(url);
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

const selectClass =
  "rounded-[10px] border border-[#bdbdbd] bg-white px-4 py-3 text-base text-brand-dark outline-none sm:min-w-48";

export default function MyProgrammesPage() {
  const router = useRouter();
  const [programmes, setProgrammes] = useState<MicroProgramme[]>([]);
  const [credProgress, setCredProgress] = useState<Record<string, CredentialProgress>>({});
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
        else router.push("/");
      })
      .catch(() => router.push("/"));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/enrollments")
      .then((r) => r.json())
      .then(async (data) => {
        const progs: MicroProgramme[] = data.programmes || [];
        setProgrammes(progs);
        const credIds = [...new Set(progs.flatMap((p) => (p.credentials || []).map((c) => c.id)))];
        const entries = await Promise.all(
          credIds.map((id) =>
            fetch(`/api/micro-credentials/${id}/progress`)
              .then((r) => (r.ok ? r.json() : { currentGrade: 0, hasPassed: false }))
              .then((p) => [id, { currentGrade: p.currentGrade ?? 0, hasPassed: p.hasPassed ?? false }] as const)
          )
        );
        setCredProgress(Object.fromEntries(entries));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const projectOptions = useMemo(
    () => Array.from(new Set(programmes.map((p) => p.project).filter(Boolean))).sort(),
    [programmes]
  );

  const filtered = useMemo(() => {
    let result = programmes;
    if (projectFilter) result = result.filter((p) => p.project === projectFilter);
    if (statusFilter)
      result = result.filter((p) => {
        const creds = p.credentials || [];
        const hasPassed = creds.length > 0 && creds.every((c) => credProgress[c.id]?.hasPassed);
        const anyStarted = creds.some((c) => (credProgress[c.id]?.currentGrade ?? 0) > 0);
        if (statusFilter === "completed") return hasPassed;
        if (statusFilter === "in-progress") return !hasPassed && anyStarted;
        if (statusFilter === "not-started") return !hasPassed && !anyStarted;
        return true;
      });
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.project.toLowerCase().includes(q)
    );
  }, [programmes, search, projectFilter, statusFilter, credProgress]);

  function progStatus(prog: MicroProgramme) {
    const creds = prog.credentials || [];
    const totalCount = creds.length;
    const passedCount = creds.filter((c) => credProgress[c.id]?.hasPassed).length;
    const hasPassed = totalCount > 0 && passedCount === totalCount;
    return { hasPassed, passedCount, totalCount };
  }

  return (
    <>
      <Header />
      <main id="main">
        <section className="bms-dash">
          <h1 className="bms-dash-title">My Micro-programmes</h1>

          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <label className="bms-courses-search flex-1">
              <Search aria-hidden="true" size={20} />
              <input
                type="search"
                placeholder="Search programmes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            {projectOptions.length > 0 && (
              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className={selectClass}>
                <option value="">All projects</option>
                {projectOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In progress</option>
              <option value="not-started">Not started</option>
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-green border-t-transparent" />
            </div>
          ) : programmes.length === 0 ? (
            <div className="bms-dash-empty">
              <div className="bms-dash-empty-art">
                <img src="/images/dashboard/empty-enrolments-live.svg" alt="" />
              </div>
              <div>
                <h2 className="bms-dash-empty-title">You are not enrolled in any micro-programme yet</h2>
                <div className="bms-dash-empty-actions">
                  <Link className="bms-dash-cta" href="/programs">
                    Browse micro-programmes <ArrowRight aria-hidden="true" size={18} />
                  </Link>
                </div>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <p className="bms-dash-note">No programmes match your search or filters.</p>
          ) : (
            <ul className="bms-dash-cards">
              {filtered.map((prog) => {
                const { hasPassed, passedCount, totalCount } = progStatus(prog);
                const anyStarted = (prog.credentials || []).some(
                  (c) => (credProgress[c.id]?.currentGrade ?? 0) > 0
                );
                const percent = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
                const img = prog.hasImage ? `/api/images/programme/${prog.id}` : prog.image || "";
                return (
                  <li className="bms-dash-card" key={prog.id}>
                    <div className="bms-dash-card-media flex items-center justify-center bg-brand-pale">
                      {img ? (
                        <img src={img} alt={prog.title} />
                      ) : (
                        <span className="text-4xl font-bold text-brand-green/30">{prog.code}</span>
                      )}
                    </div>
                    <div className="bms-dash-card-body">
                      <p className="bms-dash-card-meta">
                        {prog.code} | {prog.project}
                      </p>
                      <h3 className="bms-dash-card-title">{prog.title}</h3>
                      {totalCount > 0 && (
                        <div className="bms-dash-progress">
                          <span className="bms-dash-progress-bar">
                            <span style={{ width: `${percent}%` }} />
                          </span>
                          <span className="bms-dash-progress-label">
                            {passedCount}/{totalCount} passed
                          </span>
                        </div>
                      )}
                      <p
                        className={
                          "bms-dash-cert-status " +
                          (hasPassed ? "is-eligible" : anyStarted ? "is-pending" : "is-pending")
                        }
                      >
                        {hasPassed ? "Programme complete" : anyStarted ? "In progress" : "Not started"}
                      </p>
                      <div className="bms-dash-card-actions-row">
                        <Link className="bms-dash-card-link" href={`/programs/${prog.id}`}>
                          {hasPassed ? "View programme" : "Continue"} <ArrowRight aria-hidden="true" size={16} />
                        </Link>
                        {hasPassed && (
                          <button
                            type="button"
                            className="bms-dash-cert-btn"
                            onClick={() =>
                              downloadCertificate(`/api/certificates/download?programmeId=${prog.id}`)
                            }
                          >
                            <Award aria-hidden="true" size={15} />
                            Download certificate
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
