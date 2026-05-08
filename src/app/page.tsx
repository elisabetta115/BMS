"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";

interface MicroCredential { id: string; title: string; code: string; }
interface MicroProgramme { id: string; title: string; slug: string; code: string; project: string; description: string | null; image: string | null; credentials?: MicroCredential[]; }

export default function ProgramsPage() {
  const [programmes, setProgrammes] = useState<MicroProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/micro-programmes")
      .then(r => r.ok ? r.json() : { programmes: [] })
      .then(d => setProgrammes(d.programmes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return programmes;
    const q = search.toLowerCase();
    return programmes.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.project.toLowerCase().includes(q) ||
      (p.credentials || []).some(c => c.title.toLowerCase().includes(q))
    );
  }, [programmes, search]);

  return (
    <>
      <Header />
      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
            <h1 className="text-3xl font-bold" style={{ color: "var(--bms-dark)" }}>All Micro-programmes</h1>
            <div className="relative w-full sm:w-80">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input
                type="text"
                className="auth-input pl-10"
                placeholder="Search programmes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500 text-center py-20">{search ? "No programmes match your search." : "No micro-programmes available yet."}</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map(p => (
                <div key={p.id} className="programme-card bg-white rounded-2xl shadow-md overflow-hidden flex flex-col">
                  <div className="h-48 bg-gradient-to-br from-[var(--bms-green)] to-[var(--bms-blue)] relative flex items-center justify-center">
                    {p.image ? <img src={p.image} alt={p.title} className="w-full h-full object-cover" /> : <span className="text-white/40 text-6xl font-bold">{p.code}</span>}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h4 className="font-semibold text-base leading-snug mb-1">{p.title}</h4>
                    <p className="text-xs text-gray-500 mb-3">{p.code} | {p.project}</p>
                    {p.credentials && p.credentials.length > 0 && (
                      <>
                        <p className="text-xs font-medium text-gray-600 mb-2">Includes the following micro-credentials:</p>
                        <ul className="text-xs text-gray-500 space-y-0.5 mb-4 flex-1">
                          {p.credentials.map(c => <li key={c.id} className="flex gap-1"><span className="text-[var(--bms-green)]">•</span> {c.title}</li>)}
                        </ul>
                      </>
                    )}
                    <Link href={`/dashboard/programs/${p.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-full self-start" style={{ background: "var(--bms-green)" }}>
                      Enrol <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
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
