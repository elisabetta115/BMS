"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EmptyEnrolments from "@/components/EmptyEnrolments";
import Link from "next/link";
import { ArrowRight, Award } from "lucide-react";
import { useState, useEffect } from "react";
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
  const [passed, setPassed] = useState<Record<string, boolean>>({});
  const [enrolledCredIds, setEnrolledCredIds] = useState<Set<string>>(new Set());
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
        const enrolledIds = new Set<string>((data.credentials || []).map((c: { id: string }) => c.id));
        setEnrolledCredIds(enrolledIds);
        const credIds = [...new Set(progs.flatMap((p) => (p.credentials || []).map((c) => c.id)))].filter((id) =>
          enrolledIds.has(id)
        );
        const entries = await Promise.all(
          credIds.map((id) =>
            fetch(`/api/micro-credentials/${id}/progress`)
              .then((r) => (r.ok ? r.json() : { hasPassed: false }))
              .then((p) => [id, p.hasPassed ?? false] as const)
          )
        );
        setPassed(Object.fromEntries(entries));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Like the live site: passed = completed, enrolled but not passed = in progress, not enrolled = remaining.
  function progStatus(prog: MicroProgramme) {
    const creds = prog.credentials || [];
    const completed = creds.filter((c) => passed[c.id]).length;
    const inProgress = creds.filter((c) => enrolledCredIds.has(c.id) && !passed[c.id]).length;
    return { completed, inProgress, remaining: creds.length - completed - inProgress, total: creds.length };
  }

  return (
    <>
      <Header />
      <main id="main">
        <section className="bms-myprog">
          <div className="bms-myprog-header">
            <h1 className="bms-myprog-title">My micro-programmes</h1>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-green border-t-transparent" />
            </div>
          ) : programmes.length === 0 ? (
            <div className="bms-myprog-empty">
              <EmptyEnrolments />
            </div>
          ) : (
            <ul className="bms-myprog-list">
              {programmes.map((prog) => {
                const { completed, inProgress, remaining, total } = progStatus(prog);
                const hasPassed = total > 0 && completed === total;
                const img = prog.hasImage ? `/api/images/programme/${prog.id}` : prog.image || "";
                return (
                  <li className="bms-myprog-card" key={prog.id}>
                    <div className="bms-myprog-banner">
                      {img ? <img src={img} alt={prog.title} /> : <span>{prog.code}</span>}
                    </div>
                    <div className="bms-myprog-content">
                      <h2 className="bms-myprog-name">{prog.title}</h2>
                      {total > 0 && (
                        <div className="bms-myprog-status">
                          <p className="is-completed">
                            <strong>{completed}</strong> Completed
                          </p>
                          <p className="is-inprogress">
                            <strong>{inProgress}</strong> In Progress
                          </p>
                          <p className="is-remaining">
                            <strong>{remaining}</strong> Remaining
                          </p>
                        </div>
                      )}
                      <div className="bms-myprog-actions">
                        <Link className="bms-myprog-btn" href={`/programs/${prog.id}`}>
                          View micro-programmes <ArrowRight aria-hidden="true" size={20} />
                        </Link>
                        {hasPassed && (
                          <button
                            type="button"
                            className="bms-dash-cert-btn"
                            onClick={() => downloadCertificate(`/api/certificates/download?programmeId=${prog.id}`)}
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
      <Footer />
    </>
  );
}
