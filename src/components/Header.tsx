"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Menu, X, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SessionUser {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
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
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCatalogueOpen(false);
        setMyCoursesOpen(false);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setUserMenuOpen(false);
    router.push("/");
  }

  const triggerClass =
    "inline-flex items-center gap-1.5 text-base font-semibold leading-[1.2] text-brand-dark transition-colors hover:text-brand-green";
  const menuPanelClass =
    "absolute left-0 top-full mt-3 z-50 min-w-56 rounded-lg bg-white py-3 shadow-soft border border-brand-line";
  const menuLinkClass =
    "block px-5 py-3 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-pale hover:text-brand-green";

  return (
    <header className="sticky top-0 z-50 border-b border-brand-line bg-white">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 lg:px-8">
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-10">
          <Link href={user ? "/dashboard" : "/"} aria-label="BoostMySkills home" className="shrink-0">
            <img
              src="/logos/boostmyskills-logo.png"
              alt="BoostMySkills"
              className="h-12 w-auto"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                if (target.parentElement) {
                  target.parentElement.innerHTML =
                    '<span style="color:#079845;font-weight:800;font-size:1.15rem;">BoostMySkills</span>';
                }
              }}
            />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {user && (
              <div className="relative" ref={myCoursesRef}>
                <button
                  type="button"
                  onClick={() => {
                    setMyCoursesOpen((v) => !v);
                    setCatalogueOpen(false);
                  }}
                  className={triggerClass}
                  aria-expanded={myCoursesOpen}
                  aria-haspopup="menu"
                >
                  My courses
                  <ChevronDown size={18} strokeWidth={2.5} className={cn("transition-transform", myCoursesOpen && "rotate-180")} />
                </button>
                {myCoursesOpen && (
                  <div className={menuPanelClass} role="menu">
                    <Link href="/dashboard/my-programmes" className={menuLinkClass} onClick={() => setMyCoursesOpen(false)}>
                      My Micro-programmes
                    </Link>
                    <Link href="/dashboard/my-credentials" className={menuLinkClass} onClick={() => setMyCoursesOpen(false)}>
                      My Micro-credentials
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div className="relative" ref={catalogueRef}>
              <button
                type="button"
                onClick={() => {
                  setCatalogueOpen((v) => !v);
                  setMyCoursesOpen(false);
                }}
                className={triggerClass}
                aria-expanded={catalogueOpen}
                aria-haspopup="menu"
              >
                Catalogue
                <ChevronDown size={18} strokeWidth={2.5} className={cn("transition-transform", catalogueOpen && "rotate-180")} />
              </button>
              {catalogueOpen && (
                <div className={menuPanelClass} role="menu">
                  <Link href="/programs" className={menuLinkClass} onClick={() => setCatalogueOpen(false)}>
                    Micro-programmes
                  </Link>
                  <Link href="/courses" className={menuLinkClass} onClick={() => setCatalogueOpen(false)}>
                    Micro-credentials
                  </Link>
                </div>
              )}
            </div>

            <Link href="/about" className={triggerClass}>
              About us
            </Link>
          </nav>
        </div>

        {/* Right: auth actions */}
        <div className="hidden items-center gap-4 lg:flex">
          {loading ? (
            <div className="h-9 w-40" />
          ) : user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className={cn(triggerClass, "gap-2")}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
              >
                <User size={20} />
                {user.name}
                <ChevronDown size={18} strokeWidth={2.5} className={cn("transition-transform", userMenuOpen && "rotate-180")} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-3 z-50 min-w-52 rounded-lg border border-brand-line bg-white py-3 shadow-soft" role="menu">
                  <Link href="/dashboard" className={menuLinkClass} onClick={() => setUserMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <Link href="/dashboard/profile" className={menuLinkClass} onClick={() => setUserMenuOpen(false)}>
                    My Profile
                  </Link>
                  {user.role === "ADMIN" && (
                    <Link href="/admin" className={menuLinkClass} onClick={() => setUserMenuOpen(false)}>
                      Admin Panel
                    </Link>
                  )}
                  <hr className="my-2 border-brand-line" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-5 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-brand-pale"
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
                className="inline-flex items-center justify-center rounded-full border border-brand-green px-8 py-2 text-base font-bold leading-[30px] text-brand-dark transition-colors hover:bg-brand-pale"
              >
                Register for free
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-brand-green bg-brand-green px-8 py-2 text-base font-bold leading-[30px] text-white transition-colors hover:bg-white hover:text-brand-green"
              >
                Sign in
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-line text-brand-dark lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-brand-line bg-white px-4 py-5 lg:hidden">
          <nav className="mx-auto flex max-w-[1440px] flex-col gap-1">
            {user && (
              <>
                <p className="px-2 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-brand-muted">My courses</p>
                <Link href="/dashboard/my-programmes" className="py-2.5 px-2 text-lg font-bold text-brand-dark" onClick={() => setMobileOpen(false)}>
                  My Micro-programmes
                </Link>
                <Link href="/dashboard/my-credentials" className="py-2.5 px-2 text-lg font-bold text-brand-dark" onClick={() => setMobileOpen(false)}>
                  My Micro-credentials
                </Link>
                <hr className="my-2 border-brand-line" />
              </>
            )}
            <p className="px-2 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-brand-muted">Catalogue</p>
            <Link href="/programs" className="py-2.5 px-2 text-lg font-bold text-brand-dark" onClick={() => setMobileOpen(false)}>
              Micro-programmes
            </Link>
            <Link href="/courses" className="py-2.5 px-2 text-lg font-bold text-brand-dark" onClick={() => setMobileOpen(false)}>
              Micro-credentials
            </Link>
            <Link href="/about" className="py-2.5 px-2 text-lg font-bold text-brand-dark" onClick={() => setMobileOpen(false)}>
              About us
            </Link>

            <div className="mt-4 grid gap-3 border-t border-brand-line pt-4">
              {user ? (
                <>
                  <Link href="/dashboard" className="rounded-full bg-brand-green px-6 py-3 text-center font-bold text-white" onClick={() => setMobileOpen(false)}>
                    Dashboard
                  </Link>
                  <Link href="/dashboard/profile" className="rounded-full border border-brand-green px-6 py-3 text-center font-bold text-brand-dark" onClick={() => setMobileOpen(false)}>
                    My Profile
                  </Link>
                  {user.role === "ADMIN" && (
                    <Link href="/admin" className="rounded-full border border-brand-green px-6 py-3 text-center font-bold text-brand-dark" onClick={() => setMobileOpen(false)}>
                      Admin Panel
                    </Link>
                  )}
                  <button type="button" onClick={handleLogout} className="rounded-full px-6 py-3 text-center font-bold text-red-600">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/register" className="rounded-full border border-brand-green px-6 py-3 text-center font-bold text-brand-dark" onClick={() => setMobileOpen(false)}>
                    Register for free
                  </Link>
                  <Link href="/login" className="rounded-full bg-brand-green px-6 py-3 text-center font-bold text-white" onClick={() => setMobileOpen(false)}>
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
