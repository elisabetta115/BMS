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

const selectClass =
  "rounded-[10px] border border-[#bdbdbd] bg-white px-4 py-3 text-base text-brand-dark outline-none sm:min-w-44";

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
        const creds: MicroCredential[] = data.credentials || [];
        setCredentials(creds);
        const entries = await Promise.all(
          creds.map((c) =>
            fetch(`/api/micro-credentials/${c.id}/progress`)
              .then((r) => (r.ok ? r.json() : { currentGrade: 0, hasPassed: false }))
              .then((p) => [c.id, { currentGrade: p.currentGrade ?? 0, hasPassed: p.hasPassed ?? false }] as const)
          )
        );
        setProgress(Object.fromEntries(entries));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    fetch("/api/micro-programmes")
      .then((r) => (r.ok ? r.json() : { programmes: [] }))
      .then((d) => {
        const map: Record<string, string[]> = {};
        (d.programmes || []).forEach((prog: { title: string; credentials?: { id: string }[] }) => {
          (prog.credentials || []).forEach((cred) => {
            if (!map[cred.id]) map[cred.id] = [];
            map[cred.id].push(prog.title);
          });
        });
        setCredProgrammes(map);
      })
      .catch(() => {});
  }, []);

  const projectOptions = useMemo(
    () => Array.from(new Set(credentials.map((c) => c.project).filter(Boolean))).sort(),
    [credentials]
  );
  const orgOptions = useMemo(
    () => Array.from(new Set(credentials.map((c) => c.developedBy).filter((v): v is string => Boolean(v)))).sort(),
    [credentials]
  );
  const programmeOptions = useMemo(() => {
    const all = new Set<string>();
    credentials.forEach((c) => (credProgrammes[c.id] || []).forEach((p) => all.add(p)));
    return Array.from(all).sort();
  }, [credentials, credProgrammes]);

  const filtered = useMemo(() => {
    let result = credentials;
    if (projectFilter) result = result.filter((c) => c.project === projectFilter);
    if (orgFilter) result = result.filter((c) => c.developedBy === orgFilter);
    if (programmeFilter) result = result.filter((c) => (credProgrammes[c.id] || []).includes(programmeFilter));
    if (statusFilter === "completed") result = result.filter((c) => progress[c.id]?.hasPassed);
    if (statusFilter === "in-progress") result = result.filter((c) => !progress[c.id]?.hasPassed);
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.project.toLowerCase().includes(q)
    );
  }, [credentials, search, projectFilter, orgFilter, programmeFilter, statusFilter, progress, credProgrammes]);

  return (
    <>
      <Header />
      <main id="main">
        <section className="bms-dash">
          <h1 className="bms-dash-title">My Micro-credentials</h1>

          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <label className="bms-courses-search flex-1">
              <Search aria-hidden="true" size={20} />
              <input
                type="search"
                placeholder="Search credentials…"
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
            {orgOptions.length > 0 && (
              <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className={selectClass}>
                <option value="">All organisations</option>
                {orgOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
            {programmeOptions.length > 0 && (
              <select value={programmeFilter} onChange={(e) => setProgrammeFilter(e.target.value)} className={selectClass}>
                <option value="">All programmes</option>
                {programmeOptions.map((p) => (
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
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-green border-t-transparent" />
            </div>
          ) : credentials.length === 0 ? (
            <div className="bms-dash-empty">
              <div className="bms-dash-empty-art">
                <img src="/images/dashboard/empty-enrolments-live.svg" alt="" />
              </div>
              <div>
                <h2 className="bms-dash-empty-title">You are not enrolled in any micro-credential yet</h2>
                <div className="bms-dash-empty-actions">
                  <Link className="bms-dash-cta" href="/courses">
                    Browse micro-credentials <ArrowRight aria-hidden="true" size={18} />
                  </Link>
                </div>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <p className="bms-dash-note">No credentials match your search or filters.</p>
          ) : (
            <ul className="bms-dash-cards">
              {filtered.map((cred) => {
                const prog = progress[cred.id];
                const hasPassed = prog?.hasPassed ?? false;
                const currentGrade = prog?.currentGrade ?? 0;
                const percent = Math.min(100, Math.round((currentGrade / Math.max(cred.passGrade, 1)) * 100));
                const img = cred.hasImage ? `/api/images/credential/${cred.id}` : cred.image || "";
                return (
                  <li className="bms-dash-card" key={cred.id}>
                    <div className="bms-dash-card-media flex items-center justify-center bg-brand-pale">
                      {img ? (
                        <img src={img} alt={cred.title} />
                      ) : (
                        <span className="text-4xl font-bold text-brand-green/30">{cred.code}</span>
                      )}
                    </div>
                    <div className="bms-dash-card-body">
                      <p className="bms-dash-card-meta">
                        {cred.code} | {cred.project}
                      </p>
                      <h3 className="bms-dash-card-title">{cred.title}</h3>
                      <div className="bms-dash-progress">
                        <span className="bms-dash-progress-bar">
                          <span style={{ width: `${hasPassed ? 100 : percent}%` }} />
                        </span>
                        <span className="bms-dash-progress-label">
                          {currentGrade}% · pass {cred.passGrade}%
                        </span>
                      </div>
                      <p className={"bms-dash-cert-status " + (hasPassed ? "is-eligible" : "is-pending")}>
                        {hasPassed ? "Passed" : "In progress"}
                      </p>
                      <div className="bms-dash-card-actions-row">
                        <Link className="bms-dash-card-link" href={`/dashboard/credentials/${cred.id}`}>
                          {hasPassed ? "View credential" : "Continue"} <ArrowRight aria-hidden="true" size={16} />
                        </Link>
                        {hasPassed && (
                          <button
                            type="button"
                            className="bms-dash-cert-btn"
                            onClick={() =>
                              downloadCertificate(`/api/certificates/download?credentialId=${cred.id}`)
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
