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
  description: string | null;
  image: string | null;
  hasImage?: boolean;
  developedBy: string | null;
  passGrade: number;
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

export default function MyCredentialsPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<MicroCredential[]>([]);
  const [progress, setProgress] = useState<Record<string, CredentialProgress>>({});
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [credProgrammes, setCredProgrammes] = useState<Record<string, string[]>>({});
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
        const creds: MicroCredential[] = data.credentials || [];
        setCredentials(creds);

        const entries = await Promise.all(
          creds.map(c =>
            fetch(`/api/micro-credentials/${c.id}/progress`)
              .then(r => r.ok ? r.json() : { currentGrade: 0, hasPassed: false })
              .then(p => [c.id, { currentGrade: p.currentGrade ?? 0, hasPassed: p.hasPassed ?? false }] as const)
          )
        );
        setProgress(Object.fromEntries(entries));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    fetch("/api/micro-programmes").then(r => r.ok ? r.json() : { programmes: [] })
      .then(d => {
        const map: Record<string, string[]> = {};
        (d.programmes || []).forEach((prog: any) => {
          (prog.credentials || []).forEach((cred: any) => {
            if (!map[cred.id]) map[cred.id] = [];
            map[cred.id].push(prog.title);
          });
        });
        setCredProgrammes(map);
      })
      .catch(() => {});
  }, []);

  const projectOptions = useMemo(() =>
    Array.from(new Set(credentials.map(c => c.project).filter(Boolean))).sort()
  , [credentials]);

  const orgOptions = useMemo(() =>
    Array.from(new Set(credentials.map(c => c.developedBy).filter((v): v is string => Boolean(v)))).sort()
  , [credentials]);

  const programmeOptions = useMemo(() => {
    const all = new Set<string>();
    credentials.forEach(c => (credProgrammes[c.id] || []).forEach(p => all.add(p)));
    return Array.from(all).sort();
  }, [credentials, credProgrammes]);

  const filtered = useMemo(() => {
    let result = credentials;
    if (projectFilter) result = result.filter(c => c.project === projectFilter);
    if (orgFilter) result = result.filter(c => c.developedBy === orgFilter);
    if (programmeFilter) result = result.filter(c => (credProgrammes[c.id] || []).includes(programmeFilter));
    if (statusFilter === "completed") result = result.filter(c => progress[c.id]?.hasPassed);
    if (statusFilter === "in-progress") result = result.filter(c => !progress[c.id]?.hasPassed);
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(c => c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.project.toLowerCase().includes(q));
  }, [credentials, search, projectFilter, orgFilter, programmeFilter, statusFilter, progress, credProgrammes]);

  return (
    <>
      <Header />
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4" style={{ color: "var(--bms-dark)" }}>My Micro-credentials</h1>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
                <input
                  type="text"
                  placeholder="Search credentials…"
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
              {orgOptions.length > 0 && (
                <select
                  value={orgFilter}
                  onChange={e => setOrgFilter(e.target.value)}
                  style={{ padding: "12px 16px", border: `1.5px solid ${orgFilter ? "#1a8a5c" : "#e8e8e8"}`, borderRadius: "12px", fontSize: "14px", outline: "none", background: "white", cursor: "pointer", color: orgFilter ? "#1a8a5c" : "#666", minWidth: "160px" }}
                >
                  <option value="">All Organisations</option>
                  {orgOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
              {programmeOptions.length > 0 && (
                <select
                  value={programmeFilter}
                  onChange={e => setProgrammeFilter(e.target.value)}
                  style={{ padding: "12px 16px", border: `1.5px solid ${programmeFilter ? "#1a8a5c" : "#e8e8e8"}`, borderRadius: "12px", fontSize: "14px", outline: "none", background: "white", cursor: "pointer", color: programmeFilter ? "#1a8a5c" : "#666", minWidth: "180px" }}
                >
                  <option value="">All Programmes</option>
                  {programmeOptions.map(p => <option key={p} value={p}>{p}</option>)}
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
              </select>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg mb-4">You haven&apos;t enrolled in any micro-credentials yet.</p>
              <Link href="/courses" className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium text-sm" style={{ background: "var(--bms-green)" }}>
                Browse Micro-credentials
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-16">{(search || projectFilter || orgFilter || programmeFilter || statusFilter) ? "No credentials match your search or filters." : "You haven't enrolled in any micro-credentials yet."}</p>
          ) : (
            <div className="space-y-8">
              {filtered.map((cred) => {
                const prog = progress[cred.id];
                const hasPassed = prog?.hasPassed ?? false;
                const currentGrade = prog?.currentGrade ?? 0;

                return (
                  <div key={cred.id} className={`flex flex-col md:flex-row gap-6 bg-white rounded-2xl border overflow-hidden ${hasPassed ? "border-green-300" : "border-gray-200"}`}>
                    <div className="md:w-80 h-56 md:h-auto bg-gradient-to-br from-[var(--bms-green-light)] to-[#d4edda] flex items-center justify-center flex-shrink-0">
                      {cred.hasImage
                        ? <img src={`/api/images/credential/${cred.id}`} alt={cred.title} className="w-full h-full object-cover" />
                        : cred.image
                          ? <img src={cred.image} alt={cred.title} className="w-full h-full object-cover" />
                          : <span className="text-[var(--bms-green)] text-5xl font-bold opacity-30">{cred.code}</span>}
                    </div>
                    <div className="flex-1 p-6 md:py-8">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h2 className="text-2xl font-bold" style={{ color: "var(--bms-dark)" }}>{cred.title}</h2>
                        {hasPassed ? (
                          <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                            Passed
                          </span>
                        ) : (
                          <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-sm font-medium">
                            In progress
                          </span>
                        )}
                      </div>
                      {cred.developedBy && <p className="text-gray-600 mb-1">Developed by: <span className="font-semibold">{cred.developedBy}</span></p>}
                      <p className="text-gray-600 mb-4">Course number: <span className="font-semibold">{cred.code} | {cred.project}</span></p>

                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--bms-green)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                          <span className="text-sm" style={{ color: "var(--bms-green)" }}>
                            Pass: <strong>{cred.passGrade}%</strong>
                          </span>
                        </div>
                        {prog && (
                          <div className="flex items-center gap-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={hasPassed ? "var(--bms-green)" : "#9ca3af"} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            <span className="text-sm" style={{ color: hasPassed ? "var(--bms-green)" : "#6b7280" }}>
                              Your grade: <strong>{currentGrade}%</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <Link
                          href={`/dashboard/credentials/${cred.id}`}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium text-sm"
                          style={{ background: hasPassed ? "var(--bms-green)" : "var(--bms-blue)" }}
                        >
                          {hasPassed ? "View credential" : "Continue learning"}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                        </Link>
                        {hasPassed && (
                          <button
                            onClick={() => downloadCertificate(`/api/certificates/download?credentialId=${cred.id}`)}
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
