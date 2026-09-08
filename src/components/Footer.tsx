"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Logo */}
          <div>
            <Link href="/" className="inline-block mb-4">
              <img
                src="/images/logo.png"
                alt="BoostMySkills"
                className="h-10"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  if (target.parentElement) {
                    target.parentElement.innerHTML =
                      '<span style="color:#1a8a5c;font-weight:700;font-size:1.25rem;">BoostMySkills</span>';
                  }
                }}
              />
            </Link>
          </div>

          {/* Column 1 — Policies */}
          <div>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="https://www.res4city.eu/self-assessment/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Self-Assessment
                </a>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/cookie_policy" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/tos" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Terms and Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2 — Projects */}
          <div>
            <p className="text-gray-900 font-bold text-base mb-4">Our projects</p>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="https://www.res4city.eu/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors">
                  RES4CITY
                </a>
              </li>
              <li>
                <a href="https://www.sherlockproject.eu/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors">
                  SHERLOCK
                </a>
              </li>
              <li>
                <a href="https://www.coss.ac.kr/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors">
                  COSS
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 — Contact */}
          <div>
            <p className="text-gray-900 font-bold text-base mb-4">Get in touch</p>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-gray-900 transition-colors">
                  About us
                </Link>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/company/res4city/posts/?feedView=all"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-gray-700 hover:text-gray-900 transition-colors"
                  aria-label="LinkedIn"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}