"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: Logo + Catalogue */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center">
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

            {/* Catalogue dropdown — desktop only */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setCatalogueOpen(!catalogueOpen)}
                onBlur={() => setTimeout(() => setCatalogueOpen(false), 150)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-[var(--bms-green)] transition-colors"
              >
                Catalogue
                <svg
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  fill="none"
                  className={`transition-transform ${catalogueOpen ? "rotate-180" : ""}`}
                >
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
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
          </div>

          {/* Right side: Register + Sign in */}
          <nav className="hidden md:flex items-center gap-4">
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
          </nav>

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
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Catalogue</p>
            <Link href="/programs" className="block text-sm font-medium text-gray-700 hover:text-[var(--bms-green)] py-2.5 px-2" onClick={() => setMobileOpen(false)}>
              Micro-programmes
            </Link>
            <Link href="/courses" className="block text-sm font-medium text-gray-700 hover:text-[var(--bms-green)] py-2.5 px-2" onClick={() => setMobileOpen(false)}>
              Micro-credentials
            </Link>
            <div className="pt-3 mt-3 border-t space-y-2">
              <Link href="/register" className="block text-sm font-medium py-2.5 px-2" style={{ color: "var(--bms-green)" }} onClick={() => setMobileOpen(false)}>
                Register for free
              </Link>
              <Link href="/login" className="block text-sm font-medium py-2.5 px-2" style={{ color: "var(--bms-green)" }} onClick={() => setMobileOpen(false)}>
                Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}