"use client";

import Link from "next/link";
import { Suspense, useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { AuthShell, AuthField } from "@/components/auth/AuthShell";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [linkExpired, setLinkExpired] = useState(false);
  const [done, setDone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(data.message);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
        setLinkExpired(/expired|already been used/i.test(data.error || ""));
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token || linkExpired) {
    return (
      <div className="bms-auth-form-anim">
        <span className="bms-auth-error" role="alert">
          {linkExpired ? error : "This link is incomplete. Please open it again from your email."}
        </span>
        <Link href="/forgot-password" className="bms-auth-submit">
          Ask for a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bms-auth-form-anim">
        <p className="bms-auth-status" role="status">
          {done}
        </p>
        <Link href="/login" className="bms-auth-submit">
          Sign in
        </Link>
      </div>
    );
  }

  const toggle = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? "Hide password" : "Show password"}
      style={{ background: "none", border: 0, display: "inline-flex", color: "#666", cursor: "pointer" }}
    >
      {showPassword ? <EyeOff aria-hidden="true" size={22} /> : <Eye aria-hidden="true" size={22} />}
    </button>
  );

  return (
    <form className="bms-auth-form-anim" onSubmit={handleSubmit} noValidate>
      <p className="bms-auth-note" style={{ margin: "0 0 1.65rem" }}>
        Choose a new password: at least 8 characters, with an uppercase letter, a lowercase letter and a number.
      </p>
      <AuthField
        label="New password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        required
        icon={toggle}
      />
      <AuthField
        label="Confirm new password"
        type={showPassword ? "text" : "password"}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        required
      />

      {error && <span className="bms-auth-error">{error}</span>}

      <button type="submit" className="bms-auth-submit" disabled={loading}>
        {loading ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell active="login">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
