"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ programmes: 0, credentials: 0 });
  const [loading, setLoading] = useState(true);

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
      .then((data) => {
        setStats({
          programmes: data.programmes?.length || 0,
          credentials: data.credentials?.length || 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <>
      <Header />
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--bms-dark)" }}>
            Welcome back, {user.name}
          </h1>
          <p className="text-gray-500 mb-10">Here&apos;s an overview of your learning journey.</p>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link href="/dashboard/my-programmes" className="block bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--bms-green-light)" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--bms-green)"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                </div>
                <h3 className="font-bold text-lg mb-1" style={{ color: "var(--bms-dark)" }}>My Micro-programmes</h3>
                <p className="text-gray-500 text-sm mb-3">Enrolled in {stats.programmes} programme{stats.programmes !== 1 ? "s" : ""}</p>
                <span className="text-sm font-semibold" style={{ color: "var(--bms-green)" }}>View all →</span>
              </Link>

              <Link href="/dashboard/my-credentials" className="block bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--bms-green-light)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--bms-green)"><path d="M7 2v11h3v9l7-12h-4l4-8z" /></svg>
                </div>
                <h3 className="font-bold text-lg mb-1" style={{ color: "var(--bms-dark)" }}>My Micro-credentials</h3>
                <p className="text-gray-500 text-sm mb-3">Enrolled in {stats.credentials} credential{stats.credentials !== 1 ? "s" : ""}</p>
                <span className="text-sm font-semibold" style={{ color: "var(--bms-green)" }}>View all →</span>
              </Link>

              {user.role === "ADMIN" && (
                <Link href="/admin" className="block bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: "#fef3c7" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#d97706"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z" /></svg>
                  </div>
                  <h3 className="font-bold text-lg mb-1" style={{ color: "var(--bms-dark)" }}>Admin Panel</h3>
                  <p className="text-gray-500 text-sm mb-3">Manage courses and programmes</p>
                  <span className="text-sm font-semibold" style={{ color: "#d97706" }}>Open →</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
