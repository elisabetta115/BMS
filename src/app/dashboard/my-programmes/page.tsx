"use client";

import Header from "@/components/Header";
import Link from "next/link";
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

export default function MyProgrammesPage() {
  const router = useRouter();
  const [programmes, setProgrammes] = useState<MicroProgramme[]>([]);
  const [credProgress, setCredProgress] = useState<Record<string, CredentialProgress>>({});
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => { if (data?.user) setUser(data.user); else router.push("/"); })
      .catch(() => router.push("/"));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/enrollments")
      .then((r) => r.json())
      .then(async (data) => {
        const progs: MicroProgramme[] = data.programmes || [];
        setProgrammes(progs);

        // Collect unique credential IDs across all programmes
        const credIds = [...new Set(progs.flatMap(p => (p.credentials || []).map(c => c.id)))];

        const entries = await Promise.all(
          credIds.map(id =>
            fetch(`/api/micro-credentials/${id}/progress`)
              .then(r => r.ok ? r.json() : { currentGrade: 0, hasPassed: false })
              .then(p => [id, { currentGrade: p.currentGrade ?? 0, hasPassed: p.hasPassed ?? false }] as const)
          )
        );
        setCredProgress(Object.fromEntries(entries));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const projectOptions = useMemo(() =>
    Array.from(new Set(programmes.map(p => p.project).filter(Boolean))).sort()
  , [programmes]);

  const filtered = useMemo(() => {
    let result = programmes;
    if (projectFilter) result = result.filter(p => p.project === projectFilter);
    if (statusFilter) result = result.filter(p => {
      const creds = p.credentials || [];
      const hasPassed = creds.length > 0 && creds.every(c => credProgress[c.id]?.hasPassed);
      const anyStarted = creds.some(c => (credProgress[c.id]?.currentGrade ?? 0) > 0);
      if (statusFilter === "completed") return hasPassed;
      if (statusFilter === "in-progress") return !hasPassed && anyStarted;
      if (statusFilter === "not-started") return !hasPassed && !anyStarted;
      return true;
    });
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(p => p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.project.toLowerCase().includes(q));
  }, [programmes, search, projectFilter, statusFilter, credProgress]);

  function progStatus(prog: MicroProgramme): { hasPassed: boolean; passedCount: number; totalCount: number } {
    const creds = prog.credentials || [];
    const totalCount = creds.length;
    const passedCount = creds.filter(c => credProgress[c.id]?.hasPassed).length;
    const hasPassed = totalCount > 0 && passedCount === totalCount;
    return { hasPassed, passedCount, totalCount };
  }

  return (
    <>
      <Header />
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4" style={{ color: "var(--bms-dark)" }}>My Micro-programmes</h1>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
                <input
                  type="text"
                  placeholder="Search programmes…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: "100%", padding: "12px 16px 12px 44px", border: "1.5px solid #e8e8e8", borderRadius: "12px", fontSize: "14px", outline: "none", background: "white" }}
                  onFocus={e => { e.target.style.borderColor = "#1a8a5c"; }}
                  onBlur={e => { e.target.style.borderColor = "#e8e8e8"; }}
                />
                <svg style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </div>
              {projectOptions.length > 0 && (
                <select
                  value={projectFilter}
                  onChange={e => setProjectFilter(e.target.value)}
                  style={{ padding: "12px 16px", border: `1.5px solid ${projectFilter ? "#1a8a5c" : "#e8e8e8"}`, borderRadius: "12px", fontSize: "14px", outline: "none", background: "white", cursor: "pointer", color: projectFilter ? "#1a8a5c" : "#666", minWidth: "160px" }}
                >
                  <option value="">All Projects</option>
                  {projectOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: "12px 16px", border: `1.5px solid ${statusFilter ? "#1a8a5c" : "#e8e8e8"}`, borderRadius: "12px", fontSize: "14px", outline: "none", background: "white", cursor: "pointer", color: statusFilter ? "#1a8a5c" : "#666", minWidth: "160px" }}
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="in-progress">In progress</option>
                <option value="not-started">Not started</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : programmes.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg mb-4">You haven&apos;t enrolled in any micro-programmes yet.</p>
              <Link href="/programs" className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium text-sm" style={{ background: "var(--bms-green)" }}>
                Browse Micro-programmes
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-16">{(search || projectFilter || statusFilter) ? "No programmes match your search or filters." : "You haven’t enrolled in any micro-programmes yet."}</p>
          ) : (
            <div className="space-y-8">
              {filtered.map((prog) => {
                  const { hasPassed, passedCount, totalCount } = progStatus(prog);
                  const anyStarted = (prog.credentials || []).some(c => (credProgress[c.id]?.currentGrade ?? 0) > 0);

                  return (
                    <div key={prog.id} className={`flex flex-col md:flex-row gap-6 bg-white rounded-2xl border overflow-hidden ${hasPassed ? "border-green-300" : "border-gray-200"}`}>
                      <div className="md:w-80 h-56 md:h-auto bg-gradient-to-br from-[var(--bms-green)] to-[var(--bms-blue)] flex items-center justify-center flex-shrink-0">
                        {prog.hasImage
                          ? <img src={`/api/images/programme/${prog.id}`} alt={prog.title} className="w-full h-full object-cover" />
                          : prog.image
                            ? <img src={prog.image} alt={prog.title} className="w-full h-full object-cover" />
                            : <span className="text-white/40 text-5xl font-bold">{prog.code}</span>}
                      </div>
                      <div className="flex-1 p-6 md:py-8">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h2 className="text-2xl font-bold" style={{ color: "var(--bms-dark)" }}>{prog.title}</h2>
                          {hasPassed ? (
                            <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                              Passed
                            </span>
                          ) : anyStarted ? (
                            <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
                              In progress
                            </span>
                          ) : (
                            <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-sm font-medium">
                              Not started
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 mb-2">{prog.code} | {prog.project}</p>
                        {prog.description && <p className="text-gray-500 text-sm mb-4">{prog.description}</p>}

                        {totalCount > 0 && (
                          <div className="flex items-center gap-2 mb-6">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={hasPassed ? "var(--bms-green)" : "#9ca3af"} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                            <span className="text-sm" style={{ color: hasPassed ? "var(--bms-green)" : "#6b7280" }}>
                              <strong>{passedCount}</strong> / {totalCount} credential{totalCount !== 1 ? "s" : ""} passed
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-3 flex-wrap">
                          <Link
                            href={`/programs/${prog.id}`}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium text-sm"
                            style={{ background: hasPassed ? "var(--bms-green)" : "var(--bms-blue)" }}
                          >
                            {hasPassed ? "View programme" : "Continue learning"}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                          </Link>
                          {hasPassed && (
                            <button
                              onClick={() => downloadCertificate(`/api/certificates/download?programmeId=${prog.id}`)}
                              className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-medium text-sm border-2 border-[var(--bms-green)] text-[var(--bms-green)] hover:bg-[var(--bms-green-light)] transition-colors"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              Download Certificate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
