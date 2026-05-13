"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";

interface MicroCredential {
  id: string; title: string; slug: string; code: string; project: string;
  description: string | null; image: string | null; hasImage: boolean; developedBy: string | null; passGrade: number;
}

export default function CoursesPage() {
  const [credentials, setCredentials] = useState<MicroCredential[]>([]);
  const [allProjects, setAllProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("ALL");

  useEffect(() => {
    Promise.all([
      fetch("/api/micro-programmes").then(r => r.ok ? r.json() : { programmes: [] }),
      fetch("/api/micro-credentials").then(r => r.ok ? r.json() : { credentials: [] }),
    ]).then(([pD, cD]) => {
      const progs = pD.programmes || [];
      const creds = cD.credentials || [];
      setCredentials(creds);
      const projectSet = new Set<string>();
      progs.forEach((p: any) => { if (p.project) projectSet.add(p.project); });
      creds.forEach((c: any) => { if (c.project) projectSet.add(c.project); });
      setAllProjects(Array.from(projectSet).sort());
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let r = credentials;
    if (projectFilter !== "ALL") r = r.filter(c => c.project === projectFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(c => c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || (c.developedBy || "").toLowerCase().includes(q));
    }
    return r;
  }, [credentials, search, projectFilter]);

  return (
    <>
      <Header />
      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--bms-dark)" }}>All Micro-credentials</h1>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <div style={{ position: "relative", flex: 1 }}>
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
            <div className="flex gap-2 flex-wrap">
              {["ALL", ...allProjects].map(p => (
                <button
                  key={p}
                  onClick={() => setProjectFilter(p)}
                  style={projectFilter === p ? { background: "#1a8a5c", color: "white", borderColor: "#1a8a5c" } : {}}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${projectFilter !== p ? "bg-white text-gray-600 border-gray-200 hover:border-gray-400" : ""}`}
                >
                  {p === "ALL" ? "All Projects" : p}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500 text-center py-20">{search || projectFilter !== "ALL" ? "No credentials match your search." : "No micro-credentials available yet."}</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map(c => (
                <div key={c.id} className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col">
                  <div className="h-40 bg-gradient-to-br from-[var(--bms-green-light)] to-[#d4edda] relative flex items-center justify-center">
                    {c.hasImage ? <img src={`/api/images/credential/${c.id}`} alt={c.title} className="w-full h-full object-cover" /> : c.image ? <img src={c.image} alt={c.title} className="w-full h-full object-cover" /> : <span className="text-[var(--bms-green)] text-5xl font-bold opacity-30">{c.code}</span>}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h4 className="font-semibold text-base leading-snug mb-1">{c.title}</h4>
                    <p className="text-xs text-gray-500 mb-2">{c.code} | {c.project}</p>
                    {c.developedBy && <p className="text-xs text-gray-500 mb-3">By {c.developedBy}</p>}
                    {c.description && <p className="text-sm text-gray-600 mb-4 flex-1 line-clamp-3">{c.description}</p>}
                    <Link href={`/dashboard/credentials/${c.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-full self-start" style={{ background: "var(--bms-green)" }}>
                      View <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
