"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";

type Result = { ok: true; message: string; purpose: string } | { ok: false; message: string };

function VerifyEmail() {
  const token = useSearchParams().get("token") || "";
  const [result, setResult] = useState<Result | null>(null);
  // Links are single-use: make sure the token is sent once even when React runs effects twice.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    if (!token) {
      setResult({ ok: false, message: "This link is incomplete. Please open it again from your email." });
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        setResult(
          res.ok
            ? { ok: true, message: data.message, purpose: data.purpose }
            : { ok: false, message: data.error || "Something went wrong. Please try again." }
        );
      })
      .catch(() => setResult({ ok: false, message: "Network error. Please reload the page." }));
  }, [token]);

  if (!result) {
    return (
      <p className="bms-auth-note" role="status">
        Confirming your email…
      </p>
    );
  }

  if (!result.ok) {
    return (
      <>
        <span className="bms-auth-error" role="alert">
          {result.message}
        </span>
        <p className="bms-auth-note">
          If you registered but the link no longer works, sign in and choose &quot;send it again&quot; to get a new
          one.
        </p>
        <Link href="/login" className="bms-auth-submit">
          Go to sign in
        </Link>
      </>
    );
  }

  const changedEmail = result.purpose === "CHANGE_EMAIL";
  return (
    <>
      <p className="bms-auth-status" role="status">
        {result.message}
      </p>
      <Link href={changedEmail ? "/dashboard/profile" : "/login"} className="bms-auth-submit">
        {changedEmail ? "Go to my profile" : "Sign in"}
      </Link>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell active="login">
      <div className="bms-auth-form-anim">
        <Suspense fallback={null}>
          <VerifyEmail />
        </Suspense>
      </div>
    </AuthShell>
  );
}
