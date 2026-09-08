"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SessionUser {
  name: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [stats, setStats] = useState({ programmes: 0, credentials: 0 });
  const [loading, setLoading] = useState(true);

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

  const cards = [
    {
      href: "/dashboard/my-programmes",
      type: "Micro-programmes",
      title: "My Micro-programmes",
      sub: `Enrolled in ${stats.programmes} programme${stats.programmes !== 1 ? "s" : ""}`,
    },
    {
      href: "/dashboard/my-credentials",
      type: "Micro-credentials",
      title: "My Micro-credentials",
      sub: `Enrolled in ${stats.credentials} credential${stats.credentials !== 1 ? "s" : ""}`,
    },
    ...(user.role === "ADMIN"
      ? [{ href: "/admin", type: "Admin", title: "Admin Panel", sub: "Manage courses and programmes" }]
      : []),
  ];

  return (
    <>
      <Header />
      <main id="main">
        <section className="bms-dash">
          <h1 className="bms-dash-title">Welcome back, {user.name}</h1>
          <p className="bms-dash-note">Here&apos;s an overview of your learning journey.</p>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-green border-t-transparent" />
            </div>
          ) : (
            <ul className="bms-dash-list" style={{ marginTop: "2.5rem" }}>
              {cards.map((c) => (
                <li className="bms-dash-list-item" key={c.href}>
                  <p className="bms-dash-list-type">{c.type}</p>
                  <h3 className="bms-dash-list-title">{c.title}</h3>
                  <p className="bms-dash-note" style={{ margin: "0.5rem 0 0" }}>
                    {c.sub}
                  </p>
                  <Link className="bms-dash-list-link" href={c.href}>
                    Open <ArrowRight aria-hidden="true" size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
