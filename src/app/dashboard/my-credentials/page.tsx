"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface MicroCredential {
  id: string;
  title: string;
  slug: string;
  code: string;
  project: string;
  description: string | null;
  image: string | null;
  developedBy: string | null;
  passGrade: number;
}

export default function MyCredentialsPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<MicroCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => { if (!r.ok) { router.push("/login"); return null; } return r.json(); })
      .then((data) => { if (data?.user) setUser(data.user); })
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/enrollments")
      .then((r) => r.json())
      .then((data) => setCredentials(data.credentials || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <>
      <Header />
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-8" style={{ color: "var(--bms-dark)" }}>My Micro-credentials</h1>
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg mb-4">You haven&apos;t enrolled in any micro-credentials yet.</p>
              <Link href="/courses" className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium text-sm" style={{ background: "var(--bms-green)" }}>
                Browse Micro-credentials
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {credentials.map((cred) => (
                <div key={cred.id} className="flex flex-col md:flex-row gap-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="md:w-80 h-56 md:h-auto bg-gradient-to-br from-[var(--bms-green-light)] to-[#d4edda] flex items-center justify-center flex-shrink-0">
                    {cred.image ? <img src={cred.image} alt={cred.title} className="w-full h-full object-cover" /> : <span className="text-[var(--bms-green)] text-5xl font-bold opacity-30">{cred.code}</span>}
                  </div>
                  <div className="flex-1 p-6 md:py-8">
                    <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--bms-dark)" }}>{cred.title}</h2>
                    {cred.developedBy && <p className="text-gray-600 mb-1">Developed by: <span className="font-semibold">{cred.developedBy}</span></p>}
                    <p className="text-gray-600 mb-4">Course number: <span className="font-semibold">{cred.code} | {cred.project}</span></p>
                    <div className="flex items-center gap-2 mb-6">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--bms-green)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                      <span className="text-sm font-medium" style={{ color: "var(--bms-green)" }}>Grade required to pass the course: {cred.passGrade}%</span>
                    </div>
                    <Link href={`/credentials/${cred.id}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium text-sm" style={{ background: "var(--bms-green)" }}>
                      View Micro-credential
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
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
