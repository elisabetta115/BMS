"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EmptyEnrolments from "@/components/EmptyEnrolments";
import Link from "next/link";
import { ArrowRight, EllipsisVertical, Info } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
  hasImage?: boolean;
  developedBy: string | null;
  passGrade: number;
}

interface RelatedProgramme {
  id: string;
  title: string;
  image: string | null;
  hasImage?: boolean;
}

function CredentialRow({
  cred,
  hasPassed,
  programmes,
  onUnenroll,
}: {
  cred: MicroCredential;
  hasPassed: boolean;
  programmes: RelatedProgramme[];
  onUnenroll: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const img = cred.hasImage ? `/api/images/credential/${cred.id}` : cred.image || "";

  return (
    <li>
      <div className="bms-mycred-row">
        <div className="bms-mycred-media">
          {img ? <img src={img} alt={cred.title} /> : <span>{cred.code}</span>}
        </div>
        <div className="bms-mycred-info">
          <div className="bms-mycred-head">
            <h2 className="bms-mycred-name">{cred.title}</h2>
            <div className="bms-mycred-menu" ref={menuRef}>
              <button
                type="button"
                className={cn("bms-mycred-kebab", menuOpen && "is-open")}
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={`Options for ${cred.title}`}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <EllipsisVertical aria-hidden="true" size={22} />
              </button>
              {menuOpen && (
                <div className="bms-mycred-menu-panel" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onUnenroll();
                    }}
                  >
                    Unenroll
                  </button>
                </div>
              )}
            </div>
          </div>
          {cred.developedBy && (
            <p className="bms-mycred-detail">
              Developed by: <strong>{cred.developedBy}</strong>
            </p>
          )}
          <p className="bms-mycred-detail">
            Course number:{" "}
            <strong>
              {cred.code} | {cred.project}
            </strong>
          </p>
          {hasPassed ? (
            <p className="bms-mycred-grade is-passed">
              <Info aria-hidden="true" size={22} fill="currentColor" stroke="#fff" />
              <span>
                Congratulations. Your certificate is ready.
                <Link href={`/dashboard/credentials/${cred.id}/certificate`}>View Certificate.</Link>
              </span>
            </p>
          ) : (
            <p className="bms-mycred-grade">
              <Info aria-hidden="true" size={22} fill="currentColor" stroke="#fff" />
              Grade required to pass the course: {cred.passGrade}%
            </p>
          )}
          <div className="bms-mycred-actions">
            <Link className="bms-mycred-view" href={`/dashboard/credentials/${cred.id}`}>
              View Micro-credential <ArrowRight aria-hidden="true" size={20} />
            </Link>
          </div>
        </div>
      </div>
      {programmes.length > 0 && (
        <div className="bms-mycred-related">
          <h3>Related Micro-programme(s):</h3>
          <ul>
            {programmes.map((p) => {
              const thumb = p.hasImage ? `/api/images/programme/${p.id}` : p.image || "";
              return (
                <li key={p.id}>
                  <div className="bms-mycred-related-thumb">{thumb && <img src={thumb} alt="" />}</div>
                  <div>
                    <p>{p.title}</p>
                    <Link href={`/programs/${p.id}`}>View micro-programme</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}

export default function MyCredentialsPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<MicroCredential[]>([]);
  const [passed, setPassed] = useState<Record<string, boolean>>({});
  const [relatedByCred, setRelatedByCred] = useState<Record<string, RelatedProgramme[]>>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [unenrollTarget, setUnenrollTarget] = useState<MicroCredential | null>(null);
  const [unenrolling, setUnenrolling] = useState(false);
  const [unenrollError, setUnenrollError] = useState("");

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
              .then((r) => (r.ok ? r.json() : { hasPassed: false }))
              .then((p) => [c.id, p.hasPassed ?? false] as const)
          )
        );
        setPassed(Object.fromEntries(entries));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    fetch("/api/micro-programmes")
      .then((r) => (r.ok ? r.json() : { programmes: [] }))
      .then((d) => {
        const map: Record<string, RelatedProgramme[]> = {};
        (d.programmes || []).forEach((prog: RelatedProgramme & { credentials?: { id: string }[] }) => {
          (prog.credentials || []).forEach((c) => {
            (map[c.id] ??= []).push({ id: prog.id, title: prog.title, image: prog.image, hasImage: prog.hasImage });
          });
        });
        setRelatedByCred(map);
      })
      .catch(() => {});
  }, []);

  async function confirmUnenroll() {
    if (!unenrollTarget) return;
    setUnenrolling(true);
    setUnenrollError("");
    try {
      const r = await fetch("/api/enrollments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "credential", id: unenrollTarget.id }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setUnenrollError(d.error || "Failed to unenroll.");
        return;
      }
      setCredentials((prev) => prev.filter((c) => c.id !== unenrollTarget.id));
      setUnenrollTarget(null);
    } catch {
      setUnenrollError("Network error. Please try again.");
    } finally {
      setUnenrolling(false);
    }
  }

  return (
    <>
      <Header />
      <main id="main">
        <section className="bms-dash">
          <h1 className="bms-dash-title">My Micro-credentials</h1>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-green border-t-transparent" />
            </div>
          ) : credentials.length === 0 ? (
            <EmptyEnrolments />
          ) : (
            <ul className="bms-mycred-list">
              {credentials.map((cred) => (
                <CredentialRow
                  key={cred.id}
                  cred={cred}
                  hasPassed={passed[cred.id] ?? false}
                  programmes={relatedByCred[cred.id] || []}
                  onUnenroll={() => {
                    setUnenrollError("");
                    setUnenrollTarget(cred);
                  }}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />

      {unenrollTarget && (
        <div className="bms-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="unenroll-title">
          <div className="bms-modal bms-unenroll-modal">
            <h2 id="unenroll-title">Unenroll from course?</h2>
            {unenrollError && <p className="bms-modal-error">{unenrollError}</p>}
            <div className="bms-unenroll-actions">
              <button type="button" className="is-cancel" onClick={() => setUnenrollTarget(null)} disabled={unenrolling}>
                Never mind
              </button>
              <button type="button" className="is-confirm" onClick={confirmUnenroll} disabled={unenrolling}>
                {unenrolling ? "Unenrolling…" : "Unenroll"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
