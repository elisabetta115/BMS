"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

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
  const [programmes, setProgrammes] = useState<MicroProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setIsLoggedIn(Boolean(d?.user));
      })
      .catch(() => setIsLoggedIn(false));
  }, []);

  useEffect(() => {
    fetch("/api/micro-programmes")
      .then((r) => (r.ok ? r.json() : { programmes: [] }))
      .then((d) => setProgrammes(d.programmes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const projectOptions = useMemo(
    () => Array.from(new Set(programmes.map((p) => p.project).filter(Boolean))).sort(),
    [programmes]
  );

  const filtered = useMemo(() => {
    let result = programmes;
    if (projectFilter) result = result.filter((p) => p.project === projectFilter);
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.project.toLowerCase().includes(q) ||
        (p.credentials || []).some((c) => c.title.toLowerCase().includes(q))
    );
  }, [programmes, search, projectFilter]);

  return (
    <>
      <Header />
      <main id="main">
        <section className="bms-section bms-catalogue">
          <span className="bms-section-eyebrow">Catalogue</span>
          <h1 className="bms-section-title">Micro-programmes</h1>

          <div className="mb-10 flex flex-col gap-3 sm:flex-row">
            <label className="bms-courses-search flex-1">
              <Search aria-hidden="true" size={20} />
              <input
                type="search"
                placeholder="Search micro-programmes"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="rounded-[10px] border border-[#bdbdbd] bg-white px-4 py-3 text-base text-brand-dark outline-none sm:min-w-52"
            >
              <option value="">All projects</option>
              {projectOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="bms-courses-empty">Loading micro-programmes…</p>
          ) : filtered.length === 0 ? (
            <p className="bms-courses-empty">
              {search || projectFilter
                ? "No programmes match your search or filters."
                : "No micro-programmes available yet."}
            </p>
          ) : (
            <div className="bms-program-grid">
              {filtered.map((p) => {
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
                        <Link className="bms-pill" href={href}>
                          View
                          <ArrowRight aria-hidden="true" size={18} strokeWidth={2.5} style={{ marginLeft: "0.5rem" }} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      {isLoggedIn === false && <Footer />}
    </>
  );
}
