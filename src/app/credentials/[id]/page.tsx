"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowRight, Info } from "lucide-react";
import type { CourseCredential } from "@/components/course/types";
import { siteConfig } from "@/data/site";

/**
 * The importer stores the course "about" text as plain text: one paragraph per
 * line, "• " bullets, and the Background section appended to the overview.
 */
function splitOverview(overview: string | null): { context: string | null; background: string | null } {
  if (!overview) return { context: null, background: null };
  const [context, background] = overview.split(/\n+Background\n/);
  return { context: context?.trim() || null, background: background?.trim() || null };
}

function RichText({ text }: { text: string }) {
  const blocks: ({ type: "p"; text: string } | { type: "ul"; items: string[] })[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("•")) {
      const item = line.replace(/^•\s*/, "");
      const last = blocks[blocks.length - 1];
      if (last?.type === "ul") last.items.push(item);
      else blocks.push({ type: "ul", items: [item] });
    } else {
      blocks.push({ type: "p", text: line });
    }
  }
  return (
    <>
      {blocks.map((b, i) =>
        b.type === "p" ? (
          <p key={i} className="bms-cd-text">
            {b.text}
          </p>
        ) : (
          <ul key={i} className="bms-cd-bullets">
            {b.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        )
      )}
    </>
  );
}

const shareIcons = {
  twitter:
    "M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z",
  facebook:
    "M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.378 14.192 5 15.115 5H18V0h-3.808C10.596 0 9 1.583 9 4.615V8z",
  linkedin:
    "M4.98 3.5C4.98 4.881 3.87 6 2.5 6S.02 4.881.02 3.5C.02 2.12 1.13 1 2.5 1s2.48 1.12 2.48 2.5zM5 8H0v16h5V8zm7.982 0H8.014v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0V24H24V13.869c0-7.88-8.922-7.593-11.018-3.714V8z",
};

export default function CredentialDetailPage() {
  const router = useRouter();
  const params = useParams();
  const credentialId = params?.id as string;

  const [user, setUser] = useState<{ name: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [credential, setCredential] = useState<CourseCredential | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setUser(d.user);
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authChecked || !credentialId) return;
    Promise.all([
      fetch(`/api/micro-credentials/${credentialId}`).then((r) => (r.ok ? r.json() : null)),
      user ? fetch("/api/enrollments").then((r) => (r.ok ? r.json() : { credentials: [] })) : null,
    ])
      .then(([credRes, enrRes]) => {
        if (!credRes?.credential) {
          setError("Micro-credential not found.");
          return;
        }
        setCredential(credRes.credential);
        if (enrRes) setEnrolled((enrRes.credentials || []).some((c: { id: string }) => c.id === credentialId));
      })
      .catch(() => setError("Failed to load micro-credential."))
      .finally(() => setLoading(false));
  }, [authChecked, user, credentialId]);

  // Live behaviour: enrolling takes the learner to "My Micro-credentials".
  async function handleEnroll() {
    if (!user) {
      router.push(`/login?redirect=/credentials/${credentialId}`);
      return;
    }
    setEnrolling(true);
    setError("");
    try {
      const r = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "credential", id: credentialId }),
      });
      if (r.ok) {
        router.push("/dashboard/my-credentials");
        return;
      }
      const d = await r.json().catch(() => ({}));
      setError(d.error || "Failed to enroll.");
    } catch {
      setError("Network error.");
    }
    setEnrolling(false);
  }

  if (!authChecked || loading) {
    return (
      <>
        <Header />
        <main className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-green border-t-transparent" />
        </main>
      </>
    );
  }

  if (!credential) {
    return (
      <>
        <Header />
        <main id="main" className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <p className="mb-4 text-brand-muted">{error || "Micro-credential not found."}</p>
            <Link href="/courses" className="font-semibold text-brand-green hover:underline">
              ← Back to micro-credentials
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const { context, background } = splitOverview(credential.overview);
  const overviewText = context || credential.description;
  const shareUrl = encodeURIComponent(`${siteConfig.url}/credentials/${credential.id}`);
  const shareLinks = [
    { label: "Share on Twitter", icon: shareIcons.twitter, href: `https://twitter.com/intent/tweet?url=${shareUrl}` },
    { label: "Share on Facebook", icon: shareIcons.facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}` },
    { label: "Share on LinkedIn", icon: shareIcons.linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}` },
  ];

  return (
    <>
      <Header course={{ meta: `${credential.code} | ${credential.project}`, title: credential.title }} />
      <main id="main" className="bms-cd">
        <section className="bms-cd-hero">
          <div className="bms-cd-hero-image">
            {credential.hasImage ? (
              <img src={`/api/images/credential/${credential.id}`} alt={credential.title} />
            ) : (
              <span>{credential.code}</span>
            )}
          </div>
          <div className="bms-cd-intro">
            <h1 className="bms-cd-title">{credential.title}</h1>
            {credential.developedBy && <p className="bms-cd-by">by {credential.developedBy}</p>}
            {enrolled ? (
              <div className="bms-cd-hero-actions">
                <span className="bms-cd-enrolled">You are enrolled in this course</span>
                <Link className="bms-cd-enrol ml-auto" href={`/dashboard/credentials/${credential.id}`}>
                  View Course <ArrowRight aria-hidden="true" size={20} />
                </Link>
              </div>
            ) : (
              <div className="bms-cd-hero-actions">
                <button type="button" className="bms-cd-enrol" onClick={handleEnroll} disabled={enrolling}>
                  {enrolling ? "Enrolling…" : "Enrol"} <ArrowRight aria-hidden="true" size={20} />
                </button>
                <div className="bms-cd-social">
                  {shareLinks.map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d={s.icon} />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="bms-enrol-error mt-3">{error}</p>}
          </div>
        </section>

        <div className="bms-cd-body">
          <div className="bms-cd-main">
            {overviewText && (
              <section>
                <h2 className="bms-cd-heading">Context and overview</h2>
                <RichText text={overviewText} />
              </section>
            )}
            {credential.objectives && (
              <section>
                <h2 className="bms-cd-heading">Learning objectives</h2>
                <RichText text={credential.objectives} />
              </section>
            )}
            {background && (
              <section>
                <h2 className="bms-cd-heading">Background</h2>
                <RichText text={background} />
              </section>
            )}
          </div>

          <aside>
            <div className="bms-cd-meta">
              <p>
                <Info aria-hidden="true" size={22} fill="currentColor" stroke="#f6f7f9" />
                <span>
                  Course Number:{" "}
                  <strong>
                    {credential.code} | {credential.project}
                  </strong>
                </span>
              </p>
            </div>

            {(credential.sections.length > 0 || credential.developedBy) && (
              <div className="bms-cd-sections">
                {credential.sections.length > 0 && (
                  <>
                    <h2 className="bms-cd-sections-title">Sections</h2>
                    <ol className="bms-cd-sections-list">
                      {credential.sections.map((s, i) => (
                        <li key={s.id}>
                          <span className="bms-cd-section-num">{i + 1}</span>
                          <span>{s.title}</span>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                {credential.developedBy && (
                  <>
                    <p className="bms-cd-createdby">Created and delivered by:</p>
                    <p className="bms-cd-author">{credential.developedBy}</p>
                  </>
                )}
              </div>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
