"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, CircleUserRound } from "lucide-react";

export type MfeMenuItem = { label: string; href: string } | { label: string; logout: true };

/**
 * Compact header used by the live site's learner apps (course outline, unit
 * player, account settings): small logo, page-specific content, and a
 * bordered username button with a dropdown.
 */
export default function MfeHeader({
  userName,
  menuItems,
  showAvatar = false,
  children,
}: {
  userName: string;
  menuItems: MfeMenuItem[];
  showAvatar?: boolean;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <div className="bms-mfe-header">
      <Link href="/dashboard" aria-label="BoostMySkills home" className="shrink-0">
        <img src="/logos/boostmyskills-logo.png" alt="BoostMySkills" className="bms-mfe-logo" />
      </Link>
      <div className="bms-mfe-header-main">{children}</div>
      <div className="bms-mfe-user" ref={menuRef}>
        <button
          type="button"
          className="bms-mfe-user-btn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {showAvatar && <CircleUserRound aria-hidden="true" size={30} strokeWidth={1.75} />}
          <span className="truncate">{userName}</span>
          <ChevronDown aria-hidden="true" size={16} strokeWidth={2.5} />
        </button>
        {open && (
          <div className="bms-mfe-user-menu" role="menu">
            {menuItems.map((item) =>
              "logout" in item ? (
                <button key={item.label} type="button" onClick={handleLogout}>
                  {item.label}
                </button>
              ) : (
                <Link key={item.label} href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
