"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CourseFallback } from "@/components/course/CourseHeader";
import { useCourse } from "@/components/course/useCourse";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";

export default function CertificatePage() {
  const params = useParams();
  const credentialId = params?.id as string;
  const { user, credential, enrolled, loading, error, hasPassed } = useCourse(credentialId);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState("");
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!hasPassed) return;
    let objectUrl: string | null = null;
    fetch(`/api/certificates/download?credentialId=${credentialId}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error || "Certificate not available for this project yet.");
        }
        return r.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      })
      .catch((e: Error) => setPdfError(e.message));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasPassed, credentialId]);

  function print() {
    try {
      frameRef.current?.contentWindow?.print();
    } catch {
      if (pdfUrl) window.open(pdfUrl, "_blank", "noopener");
    }
  }

  if (!user) return null;
  if (loading) return <><Header /><CourseFallback state="loading" credentialId={credentialId} /></>;
  if (error || !credential) {
    return <><Header /><CourseFallback state="error" credentialId={credentialId} message={error || "Micro-credential not found."} /></>;
  }
  if (!enrolled) return <><Header /><CourseFallback state="not-enrolled" credentialId={credentialId} /></>;

  return (
    <>
      <header className="bms-cert-header">
        <Link href="/dashboard" aria-label="BoostMySkills home">
          <img src="/logos/boostmyskills-logo.png" alt="BoostMySkills" />
        </Link>
      </header>
      <main id="main" className="bms-cert">
        {hasPassed ? (
          <>
            <section className="bms-cert-banner">
              <div>
                <h1>{user.name}, you earned a certificate!</h1>
                <p>
                  Congratulations! Here is your <strong>certificate</strong> for successfully completing your
                  micro-credential. Show it off to family, friends, and colleagues in your social and professional
                  networks.
                </p>
                <button type="button" onClick={print} disabled={!pdfUrl}>
                  <Printer aria-hidden="true" size={20} /> Print Certificate
                </button>
              </div>
            </section>
            <div className="bms-cert-body">
              {pdfError ? (
                <p className="bms-cert-message">{pdfError}</p>
              ) : pdfUrl ? (
                <iframe ref={frameRef} src={pdfUrl} title={`${credential.title} certificate`} />
              ) : (
                <div className="flex justify-center py-24">
                  <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-green border-t-transparent" />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bms-cert-body">
            <p className="bms-cert-message">
              You have not earned a certificate for {credential.title} yet.{" "}
              <Link href={`/dashboard/credentials/${credentialId}/progress`}>See your progress</Link>.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
