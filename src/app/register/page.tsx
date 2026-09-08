"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const COUNTRIES = [
  "", "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
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
    if (fieldErrors[field]) setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg, #f0faf5 0%, #e6f5ee 50%, #dff0e8 100%)" }}
    >
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <img
            src="/images/logo.png"
            alt="BoostMySkills"
            className="h-10"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              if (target.parentElement) {
                target.parentElement.innerHTML =
                  '<span style="color:#1a8a5c;font-weight:700;font-size:1.5rem;">BoostMySkills</span>';
              }
            }}
          />
        </Link>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 sm:p-10">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--bms-dark)" }}>Register</h1>
        <p className="text-gray-500 text-sm mb-6">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold" style={{ color: "var(--bms-green)" }}>Sign in</Link>
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
            <input id="name" type="text" className={`auth-input ${fieldErrors.name ? "error" : ""}`} placeholder="Your full name" value={form.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" required />
            {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input id="reg-email" type="email" className={`auth-input ${fieldErrors.email ? "error" : ""}`} placeholder="you@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" required />
            {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input id="reg-password" type={showPassword ? "text" : "password"} className={`auth-input pr-12 ${fieldErrors.password ? "error" : ""}`} placeholder="Min 8 chars, upper, lower, number" value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete="new-password" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium">{showPassword ? "Hide" : "Show"}</button>
            </div>
            {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
            <input id="confirm-password" type="password" className={`auth-input ${fieldErrors.confirmPassword ? "error" : ""}`} placeholder="Repeat your password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} autoComplete="new-password" required />
            {fieldErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>}
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1.5">Country / Region <span className="text-gray-400">(optional)</span></label>
            <select id="country" className="auth-input" value={form.country} onChange={(e) => update("country", e.target.value)}>
              <option value="">Select your country</option>
              {COUNTRIES.filter(Boolean).map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          By registering, you agree to our{" "}
          <Link href="/tos" className="underline">Terms</Link> and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
