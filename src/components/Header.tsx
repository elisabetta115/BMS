"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface User {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [myCoursesOpen, setMyCoursesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const catalogueRef = useRef<HTMLDivElement>(null);
  const myCoursesRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (catalogueRef.current && !catalogueRef.current.contains(e.target as Node)) setCatalogueOpen(false);
      if (myCoursesRef.current && !myCoursesRef.current.contains(e.target as Node)) setMyCoursesOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setUserMenuOpen(false);
    router.push("/");
  }

  const chevron = (open: boolean) => (
    <svg
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link href={user ? "/dashboard" : "/"} className="flex items-center">
              <img
                src="/images/logo.png"
                alt="BoostMySkills"
                className="h-8"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.parentElement!.innerHTML =
                    '<span style="color:#1a8a5c;font-weight:700;font-size:1.15rem;">BoostMySkills</span>';
                }}
              />
            </Link>

            <nav className="hidden md:flex items-center gap-5">
              {/* My courses dropdown — only for logged-in users */}
              {user && (
                <div className="relative" ref={myCoursesRef}>
                  <button
                    onClick={() => { setMyCoursesOpen(!myCoursesOpen); setCatalogueOpen(false); }}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-[var(--bms-green)] transition-colors"
                  >
                    My courses
                    {chevron(myCoursesOpen)}
                  </button>
                  {myCoursesOpen && (
                    <div className="absolute top-full left-0 mt-3 bg-white rounded-lg shadow-xl border py-1 min-w-[220px]">
                      <Link
                        href="/dashboard/my-programmes"
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setMyCoursesOpen(false)}
                      >
                        My Micro-programmes
                      </Link>
                      <Link
                        href="/dashboard/my-credentials"
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setMyCoursesOpen(false)}
                      >
                        My Micro-credentials
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Catalogue dropdown */}
              <div className="relative" ref={catalogueRef}>
                <button
                  onClick={() => { setCatalogueOpen(!catalogueOpen); setMyCoursesOpen(false); }}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-[var(--bms-green)] transition-colors"
                >
                  Catalogue
                  {chevron(catalogueOpen)}
                </button>
                {catalogueOpen && (
                  <div className="absolute top-full left-0 mt-3 bg-white rounded-lg shadow-xl border py-1 min-w-[200px]">
                    <Link
                      href="/programs"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setCatalogueOpen(false)}
                    >
                      Micro-programmes
                    </Link>
                    <Link
                      href="/courses"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setCatalogueOpen(false)}
                    >
                      Micro-credentials
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-4">
            {loading ? (
              <div className="w-20 h-8" />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[var(--bms-green)] transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                  {user.name}
                  {chevron(userMenuOpen)}
                </button>
                {userMenuOpen && (
                  <div className="absolute top-full right-0 mt-3 bg-white rounded-lg shadow-xl border py-1 min-w-[180px]">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    {user.role === "ADMIN" && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Admin Panel
                      </Link>
                    )}
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/register"
                  className="text-sm font-medium px-5 py-2 rounded-full border transition-colors"
                  style={{ borderColor: "var(--bms-green)", color: "var(--bms-green)" }}
                >
                  Register for free
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-medium px-5 py-2 rounded-full text-white transition-colors"
                  style={{ background: "var(--bms-green)" }}
                >
                  Sign in
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 text-gray-700" onClick={() => setMobileOpen(!mobileOpen)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t py-4 space-y-1">
            {user && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">My courses</p>
                <Link href="/dashboard/my-programmes" className="block text-sm font-medium text-gray-700 hover:text-[var(--bms-green)] py-2.5 px-2" onClick={() => setMobileOpen(false)}>
                  My Micro-programmes
                </Link>
                <Link href="/dashboard/my-credentials" className="block text-sm font-medium text-gray-700 hover:text-[var(--bms-green)] py-2.5 px-2" onClick={() => setMobileOpen(false)}>
                  My Micro-credentials
                </Link>
                <div className="border-t my-2" />
              </>
            )}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Catalogue</p>
            <Link href="/programs" className="block text-sm font-medium text-gray-700 hover:text-[var(--bms-green)] py-2.5 px-2" onClick={() => setMobileOpen(false)}>
              Micro-programmes
            </Link>
            <Link href="/courses" className="block text-sm font-medium text-gray-700 hover:text-[var(--bms-green)] py-2.5 px-2" onClick={() => setMobileOpen(false)}>
              Micro-credentials
            </Link>
            <div className="pt-3 mt-3 border-t space-y-2">
              {user ? (
                <>
                  <Link href="/dashboard" className="block text-sm font-medium py-2.5 px-2 text-gray-700" onClick={() => setMobileOpen(false)}>
                    Dashboard
                  </Link>
                  {user.role === "ADMIN" && (
                    <Link href="/admin" className="block text-sm font-medium py-2.5 px-2 text-gray-700" onClick={() => setMobileOpen(false)}>
                      Admin Panel
                    </Link>
                  )}
                  <button onClick={handleLogout} className="block text-sm font-medium py-2.5 px-2 text-red-600">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/register" className="block text-sm font-medium py-2.5 px-2" style={{ color: "var(--bms-green)" }} onClick={() => setMobileOpen(false)}>
                    Register for free
                  </Link>
                  <Link href="/login" className="block text-sm font-medium py-2.5 px-2" style={{ color: "var(--bms-green)" }} onClick={() => setMobileOpen(false)}>
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
