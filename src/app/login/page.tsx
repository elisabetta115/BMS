"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, User } from "lucide-react";
import { AuthShell, AuthField } from "@/components/auth/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <AuthShell active="login">
      <form className="bms-auth-form-anim" onSubmit={handleSubmit} noValidate>
        <AuthField
          label="Username or email"
          type="text"
          placeholder="you@example.com or your full name"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          icon={<User aria-hidden="true" size={22} />}
        />

        <AuthField
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          icon={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{ background: "none", border: 0, display: "inline-flex", color: "#666", cursor: "pointer" }}
            >
              {showPassword ? <EyeOff aria-hidden="true" size={22} /> : <Eye aria-hidden="true" size={22} />}
            </button>
          }
        />

        {error && <span className="bms-auth-error">{error}</span>}

        <button type="submit" className="bms-auth-submit bms-auth-submit-login" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <Link className="bms-auth-forgot" href="/register">
          Don&apos;t have an account? Register
        </Link>
      </form>
    </AuthShell>
  );
}
