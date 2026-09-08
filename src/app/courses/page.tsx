"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";

interface MicroCredential {
  id: string; title: string; slug: string; code: string; project: string;
  description: string | null; image: string | null; hasImage: boolean; developedBy: string | null; passGrade: number;
}

export default function CoursesPage() {
  const [credentials, setCredentials] = useState<MicroCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState("");
  const [credProgrammes, setCredProgrammes] = useState<Record<string, string[]>>({});
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setIsLoggedIn(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/micro-credentials").then(r => r.ok ? r.json() : { credentials: [] })
      .then(d => setCredentials(d.credentials || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

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
    Object.values(credProgrammes).forEach(progs => progs.forEach(p => all.add(p)));
    return Array.from(all).sort();
  }, [credProgrammes]);

  const filtered = useMemo(() => {
    let result = credentials;
    if (projectFilter) result = result.filter(c => c.project === projectFilter);
    if (orgFilter) result = result.filter(c => c.developedBy === orgFilter);
    if (programmeFilter) result = result.filter(c => (credProgrammes[c.id] || []).includes(programmeFilter));
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(c => c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.project.toLowerCase().includes(q) || (c.developedBy || "").toLowerCase().includes(q));
  }, [credentials, search, projectFilter, orgFilter, programmeFilter, credProgrammes]);

  const equalizeHeights = useCallback(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll<HTMLElement>(".catalogue-card");
    cards.forEach(card => { card.style.height = "auto"; });
    let maxH = 0;
    cards.forEach(card => { maxH = Math.max(maxH, card.offsetHeight); });
    if (maxH > 0) cards.forEach(card => { card.style.height = `${maxH}px`; });
  }, []);

  useEffect(() => {
    equalizeHeights();
    window.addEventListener("resize", equalizeHeights);
    return () => window.removeEventListener("resize", equalizeHeights);
  }, [filtered, equalizeHeights]);

  return (
    <>
      <Header />
      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--bms-dark)" }}>All Micro-credentials</h1>

          {/* Search + Filters */}
          <div className="mb-10 flex flex-col sm:flex-row flex-wrap gap-3">
            <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
              <input
                type="text"
                style={{ width: "100%", padding: "12px 16px 12px 44px", border: "1.5px solid #e8e8e8", borderRadius: "12px", fontSize: "14px", outline: "none", background: "white" }}
                placeholder="Search credentials..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={e => { e.target.style.borderColor = "#1a8a5c"; }}
                onBlur={e => { e.target.style.borderColor = "#e8e8e8"; }}
              />
              <svg style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
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
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col">
                  <div className="h-40 bg-gray-200 animate-pulse" />
                  <div className="p-5 flex flex-col flex-1 gap-3">
                    <div className="h-4 bg-gray-200 rounded-lg animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-200 rounded-lg animate-pulse w-1/2" />
                    <div className="h-3 bg-gray-200 rounded-lg animate-pulse w-full" />
                    <div className="h-3 bg-gray-200 rounded-lg animate-pulse w-5/6" />
                    <div className="h-9 bg-gray-200 rounded-full animate-pulse w-24 mt-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500 text-center py-20">{(search || projectFilter || orgFilter || programmeFilter) ? "No credentials match your search or filters." : "No micro-credentials available yet."}</p>
          ) : (
            <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map(c => (
                <div key={c.id} className="catalogue-card bg-white rounded-2xl shadow-md overflow-hidden flex flex-col">
                  <div className="h-40 bg-gradient-to-br from-[var(--bms-green-light)] to-[#d4edda] relative flex items-center justify-center">
                    {c.hasImage ? <img src={`/api/images/credential/${c.id}`} alt={c.title} className="w-full h-full object-cover" /> : c.image ? <img src={c.image} alt={c.title} className="w-full h-full object-cover" /> : <span className="text-[var(--bms-green)] text-5xl font-bold opacity-30">{c.code}</span>}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base leading-snug mb-1">{c.title}</h4>
                      <p className="text-xs text-gray-500 mb-2">{c.code} | {c.project}</p>
                      {c.developedBy && <p className="text-xs text-gray-500 mb-3">By {c.developedBy}</p>}
                      {c.description && <p className="text-sm text-gray-600 mb-4 line-clamp-3">{c.description}</p>}
                    </div>
                    <Link href={`/credentials/${c.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-full self-start mt-4" style={{ background: "var(--bms-green)" }}>
                      View <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      {isLoggedIn === false && <Footer />}
    </>
  );
}
