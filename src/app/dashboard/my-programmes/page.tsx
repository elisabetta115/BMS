"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface MicroProgramme {
  id: string;
  title: string;
  slug: string;
  code: string;
  project: string;
  description: string | null;
  image: string | null;
  credentials?: any[];
}

export default function MyProgrammesPage() {
  const router = useRouter();
  const [programmes, setProgrammes] = useState<MicroProgramme[]>([]);
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
      .then((data) => setProgrammes(data.programmes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <>
      <Header />
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-8" style={{ color: "var(--bms-dark)" }}>My Micro-programmes</h1>
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : programmes.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg mb-4">You haven&apos;t enrolled in any micro-programmes yet.</p>
              <Link href="/programs" className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium text-sm" style={{ background: "var(--bms-green)" }}>
                Browse Micro-programmes
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {programmes.map((prog) => (
                <div key={prog.id} className="flex flex-col md:flex-row gap-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="md:w-80 h-56 md:h-auto bg-gradient-to-br from-[var(--bms-green)] to-[var(--bms-blue)] flex items-center justify-center flex-shrink-0">
                    {prog.image ? <img src={prog.image} alt={prog.title} className="w-full h-full object-cover" /> : <span className="text-white/40 text-5xl font-bold">{prog.code}</span>}
                  </div>
                  <div className="flex-1 p-6 md:py-8">
                    <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--bms-dark)" }}>{prog.title}</h2>
                    <p className="text-gray-600 mb-4">{prog.code} | {prog.project}</p>
                    {prog.description && <p className="text-gray-500 text-sm mb-4">{prog.description}</p>}
                    {prog.credentials && prog.credentials.length > 0 && (
                      <p className="text-xs font-medium text-gray-600 mb-4">Includes {prog.credentials.length} micro-credentials</p>
                    )}
                    <Link href={`/programs/${prog.id}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium text-sm" style={{ background: "var(--bms-green)" }}>
                      View Micro-programme
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