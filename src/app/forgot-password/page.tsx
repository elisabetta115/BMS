"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { Mail } from "lucide-react";
import { AuthShell, AuthField } from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter your email or username.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Something went wrong. Please try again.");
      else setSent(data.message);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell active="login">
      {sent ? (
        <div className="bms-auth-form-anim">
          <p className="bms-auth-status" role="status">
            {sent}
          </p>
          <p className="bms-auth-note">The link works for 1 hour. If nothing arrives, check your spam folder.</p>
          <Link href="/login" className="bms-auth-submit">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="bms-auth-form-anim" onSubmit={handleSubmit} noValidate>
          <p className="bms-auth-note" style={{ margin: "0 0 1.65rem" }}>
            Forgot your password? Enter your email or username and we&apos;ll send you a link to choose a new one.
          </p>
          <AuthField
            label="Email or username"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            icon={<Mail aria-hidden="true" size={22} />}
          />

          {error && <span className="bms-auth-error">{error}</span>}

          <button type="submit" className="bms-auth-submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>

          <Link href="/login" className="bms-auth-forgot">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
