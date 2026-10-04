"use client";

import Link from "next/link";
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Eye, EyeOff, Info, Mail, User } from "lucide-react";
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

// Same choices as the live registration form.
const GENDERS = [
  { value: "m", label: "Male" },
  { value: "f", label: "Female" },
  { value: "nb", label: "Non-binary / Third gender" },
  { value: "pn", label: "Prefer not to say" },
  { value: "o", label: "Other" },
];

/** Pre-select the visitor's country from their browser language (e.g. "it-IT" → Italy), like the live form does. */
function guessCountry(): string {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    const name = region ? new Intl.DisplayNames(["en"], { type: "region" }).of(region) : undefined;
    return name && COUNTRIES.includes(name) ? name : "";
  } catch {
    return "";
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "", country: "", gender: "" });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const country = guessCountry();
    if (country) setForm((prev) => (prev.country ? prev : { ...prev, country }));
  }, []);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const username = form.username.trim();
    if (form.name.trim().length < 2) errs.name = "Enter your full name";
    if (username.length < 2 || username.length > 30) errs.username = "Username must be between 2 and 30 characters";
    else if (!/^[A-Za-z0-9_-]+$/.test(username))
      errs.username = "Usernames can only contain letters (A-Z, a-z), numerals (0-9), underscores (_), and hyphens (-).";
    if (!form.email.trim()) errs.email = "Enter your email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email";
    if (form.password.length < 8) errs.password = "At least 8 characters.";
    else if (!/[A-Z]/.test(form.password)) errs.password = "Include an uppercase letter.";
    else if (!/[a-z]/.test(form.password)) errs.password = "Include a lowercase letter.";
    else if (!/[0-9]/.test(form.password)) errs.password = "Include a number.";
    if (!form.country) errs.country = "Select your country or region of residence";
    if (!termsAccepted) errs.terms = "You must agree to the Terms and Conditions";
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
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          country: form.country,
          gender: form.gender || undefined,
          termsAccepted,
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

  function clearError(field: string) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    }
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  }

  return (
    <AuthShell active="register">
      <form className="bms-auth-form-anim" onSubmit={handleSubmit} noValidate>
        <AuthField
          label="Full name"
          type="text"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          autoComplete="name"
          required
          error={fieldErrors.name}
          icon={<User aria-hidden="true" size={22} />}
        />
        <p className="bms-auth-help flex items-center gap-1.5">
          <Info aria-hidden="true" size={16} /> This is the name that will appear on your certificate!
        </p>

        <AuthField
          label="User name"
          type="text"
          value={form.username}
          onChange={(e) => update("username", e.target.value)}
          autoComplete="username"
          required
          error={fieldErrors.username}
          icon={<User aria-hidden="true" size={22} />}
        />

        <AuthField
          label="Email"
          type="email"
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

        <label className="bms-auth-label">
          Country of residence
          <span className="bms-auth-input-wrap">
            <select
              className="bms-auth-field"
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              required
            >
              <option value="">Select your country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </span>
          {fieldErrors.country ? <span className="bms-auth-error">{fieldErrors.country}</span> : null}
        </label>

        <label className="bms-auth-label">
          Gender
          <span className="bms-auth-input-wrap">
            <select className="bms-auth-field" value={form.gender} onChange={(e) => update("gender", e.target.value)}>
              <option value="">Select gender</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </span>
        </label>

        <label className="bms-auth-terms">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked);
              clearError("terms");
            }}
          />
          <span>
            I have read and agree to the{" "}
            <Link href="/tos" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
              Terms and Conditions <ExternalLink aria-hidden="true" size={14} />
              <span className="sr-only">(opens in a new tab)</span>
            </Link>
          </span>
        </label>
        {fieldErrors.terms ? <span className="bms-auth-error -mt-4 mb-4">{fieldErrors.terms}</span> : null}

        {error && <span className="bms-auth-error">{error}</span>}

        <button type="submit" className="bms-auth-submit" disabled={loading}>
          {loading ? "Creating account…" : "Create an account for free"}
        </button>
      </form>
    </AuthShell>
  );
}
