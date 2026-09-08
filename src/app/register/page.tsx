"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, User } from "lucide-react";
import { AuthShell, AuthField } from "@/components/auth/AuthShell";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Chad", "Chile", "China",
  "Colombia", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark",
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Estonia", "Ethiopia", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Guatemala", "Guinea", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Kyrgyzstan", "Laos", "Latvia",
  "Lebanon", "Libya", "Lithuania", "Luxembourg", "Madagascar", "Malaysia", "Mali", "Malta", "Mexico",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway",
  "Oman", "Pakistan", "Panama", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Rwanda", "Saudi Arabia", "Senegal", "Serbia", "Singapore", "Slovakia",
  "Slovenia", "Somalia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sudan", "Sweden",
  "Switzerland", "Syria", "Taiwan", "Tanzania", "Thailand", "Tunisia", "Turkey", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Venezuela",
  "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", country: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Name must be at least 2 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email.";
    if (form.password.length < 8) errs.password = "At least 8 characters.";
    else if (!/[A-Z]/.test(form.password)) errs.password = "Include an uppercase letter.";
    else if (!/[a-z]/.test(form.password)) errs.password = "Include a lowercase letter.";
    else if (!/[0-9]/.test(form.password)) errs.password = "Include a number.";
    if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          country: form.country || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    }
  }

  return (
    <AuthShell active="register">
      <form className="bms-auth-form-anim" onSubmit={handleSubmit} noValidate>
        <AuthField
          label="Full name"
          type="text"
          placeholder="Your full name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          autoComplete="name"
          required
          error={fieldErrors.name}
          icon={<User aria-hidden="true" size={22} />}
        />
        <p className="bms-auth-help">This is the name that will appear on your certificate.</p>

        <AuthField
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          autoComplete="email"
          required
          error={fieldErrors.email}
          icon={<Mail aria-hidden="true" size={22} />}
        />

        <AuthField
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="Min 8 chars, upper, lower, number"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          autoComplete="new-password"
          required
          error={fieldErrors.password}
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

        <AuthField
          label="Confirm password"
          type="password"
          placeholder="Repeat your password"
          value={form.confirmPassword}
          onChange={(e) => update("confirmPassword", e.target.value)}
          autoComplete="new-password"
          required
          error={fieldErrors.confirmPassword}
        />

        <label className="bms-auth-label">
          Country / Region (optional)
          <span className="bms-auth-input-wrap">
            <select
              className="bms-auth-field"
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
            >
              <option value="">Select your country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </span>
        </label>

        <label className="bms-auth-terms">
          <span>
            By creating an account you agree to our{" "}
            <Link href="/tos">Terms and Conditions</Link> and <Link href="/privacy">Privacy Policy</Link>.
          </span>
        </label>

        {error && <span className="bms-auth-error">{error}</span>}

        <button type="submit" className="bms-auth-submit" disabled={loading}>
          {loading ? "Creating account…" : "Create an account for free"}
        </button>

        <Link className="bms-auth-forgot" href="/login">
          Already have an account? Sign in
        </Link>
      </form>
    </AuthShell>
  );
}
