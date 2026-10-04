"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowRight, ChevronDown, Search } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface MicroCredential {
  id: string;
  title: string;
  slug: string;
  code: string;
  project: string;
  description: string | null;
  image: string | null;
  hasImage: boolean;
  developedBy: string | null;
  passGrade: number;
}

function FilterDropdown({
  label,
  value,
  options,
  counts,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  counts: Record<string, number>;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="bms-course-filter" ref={ref}>
      <button type="button" className="bms-course-dropbtn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="bms-course-dropbtn-label">{label}</span>
        <span className="bms-course-dropbtn-value">{value || "All Default"}</span>
        <ChevronDown aria-hidden="true" size={20} className={cn("bms-course-dropbtn-arrow", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="bms-course-dropdown">
          <li>
            <button type="button" className={cn(!value && "is-selected")} onClick={() => { onChange(""); setOpen(false); }}>
              <span>All Default</span>
            </button>
          </li>
          {options.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                className={cn(value === opt && "is-selected")}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                <span>{opt}</span>
                <span className="bms-course-dropdown-count">{counts[opt] ?? 0}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CoursesPage() {
  const [credentials, setCredentials] = useState<MicroCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState("");
  const [credProgrammes, setCredProgrammes] = useState<Record<string, string[]>>({});
  const router = useRouter();
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
          .then((r) => (r.ok ? r.json() : { credentials: [] }))
          .then((e) => setEnrolledIds(new Set((e.credentials || []).map((c: { id: string }) => c.id))));
      })
      .catch(() => {});
  }, []);

  // Live behaviour: "Enrol" enrols straight away and lands on "My Micro-credentials".
  async function handleEnrol(id: string) {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/credentials/${id}`);
      return;
    }
    if (enrolledIds.has(id)) {
      router.push(`/dashboard/credentials/${id}`);
      return;
    }
    setEnrollingId(id);
    setEnrolError(null);
    try {
      const r = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "credential", id }),
      });
      if (r.ok) {
        router.push("/dashboard/my-credentials");
        return;
      }
      const d = await r.json().catch(() => ({}));
      setEnrolError({ id, message: d.error || "Failed to enrol." });
    } catch {
      setEnrolError({ id, message: "Network error. Please try again." });
    }
    setEnrollingId(null);
  }

  useEffect(() => {
    fetch("/api/micro-credentials")
      .then((r) => (r.ok ? r.json() : { credentials: [] }))
      .then((d) => setCredentials(d.credentials || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
    Object.values(credProgrammes).forEach((progs) => progs.forEach((p) => all.add(p)));
    return Array.from(all).sort();
  }, [credProgrammes]);

  const counts = useMemo(() => {
    const tally = (values: (string | null)[]) =>
      values.reduce<Record<string, number>>((acc, v) => {
        if (v) acc[v] = (acc[v] ?? 0) + 1;
        return acc;
      }, {});
    return {
      project: tally(credentials.map((c) => c.project)),
      org: tally(credentials.map((c) => c.developedBy)),
      programme: tally(credentials.flatMap((c) => credProgrammes[c.id] || [])),
    };
  }, [credentials, credProgrammes]);

  const filtered = useMemo(() => {
    let result = credentials;
    if (projectFilter) result = result.filter((c) => c.project === projectFilter);
    if (orgFilter) result = result.filter((c) => c.developedBy === orgFilter);
    if (programmeFilter) result = result.filter((c) => (credProgrammes[c.id] || []).includes(programmeFilter));
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.project.toLowerCase().includes(q) ||
        (c.developedBy || "").toLowerCase().includes(q)
    );
  }, [credentials, search, projectFilter, orgFilter, programmeFilter, credProgrammes]);

  return (
    <>
      <Header />
      <main id="main">
        <section className="bms-courses">
          <h1 className="bms-courses-heading">Viewing {filtered.length} courses</h1>

          <div className="bms-courses-layout">
            <div className="bms-courses-grid">
              {loading ? (
                <p className="bms-courses-empty">Loading micro-credentials…</p>
              ) : filtered.length === 0 ? (
                <p className="bms-courses-empty">
                  {search || projectFilter || orgFilter || programmeFilter
                    ? "No credentials match your search or filters."
                    : "No micro-credentials available yet."}
                </p>
              ) : (
                filtered.map((c) => {
                  const href = `/credentials/${c.id}`;
                  const img = c.hasImage ? `/api/images/credential/${c.id}` : c.image || "";
                  return (
                    <article className="bms-course-card" key={c.id}>
                      <Link className="bms-course-image" href={href}>
                        {img ? (
                          <img src={img} alt={c.title} />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-brand-pale text-4xl font-bold text-brand-green/30">
                            {c.code}
                          </span>
                        )}
                      </Link>
                      <div className="bms-course-body">
                        {c.developedBy && <span className="bms-course-org">{c.developedBy}</span>}
                        <span className="bms-course-code">
                          {c.code} | {c.project}
                        </span>
                        <h2 className="bms-course-title">
                          <Link href={href}>{c.title}</Link>
                        </h2>
                        <div className="bms-course-actions">
                          <button
                            type="button"
                            className="bms-course-enrol"
                            onClick={() => handleEnrol(c.id)}
                            disabled={enrollingId === c.id}
                          >
                            {enrollingId === c.id ? "Enrolling…" : "Enrol"}
                            <ArrowRight aria-hidden="true" size={18} strokeWidth={2.5} />
                          </button>
                          <Link className="bms-course-more" href={href}>
                            More info <ArrowRight aria-hidden="true" size={20} />
                          </Link>
                        </div>
                        {enrolError?.id === c.id && <p className="bms-enrol-error mt-3">{enrolError.message}</p>}
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <aside className="bms-courses-sidebar">
              <label className="bms-courses-search">
                <Search aria-hidden="true" size={20} />
                <input
                  type="search"
                  placeholder="Search for a course"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <h2 className="bms-courses-refine">Refine Your Search</h2>
              {projectOptions.length > 0 && (
                <FilterDropdown label="Project" value={projectFilter} options={projectOptions} counts={counts.project} onChange={setProjectFilter} />
              )}
              {orgOptions.length > 0 && (
                <FilterDropdown label="Organisation" value={orgFilter} options={orgOptions} counts={counts.org} onChange={setOrgFilter} />
              )}
              {programmeOptions.length > 0 && (
                <FilterDropdown
                  label="Micro-Programme"
                  value={programmeFilter}
                  options={programmeOptions}
                  counts={counts.programme}
                  onChange={setProgrammeFilter}
                />
              )}
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
