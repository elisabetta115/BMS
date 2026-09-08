"use client";

import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
  "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
  "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Congo-Brazzaville)","Costa Rica",
  "Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt",
  "El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon",
  "Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana",
  "Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel",
  "Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos",
  "Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi",
  "Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova",
  "Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands",
  "New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau",
  "Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania",
  "Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal",
  "Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea",
  "South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan",
  "Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
  "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela",
  "Vietnam","Yemen","Zambia","Zimbabwe",
];

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(d => { if (!d?.user) router.push("/"); })
      .catch(() => router.push("/"));
  }, [router]);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setName(d.name || "");
          setEmail(d.email || "");
          setCountry(d.country || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword && newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, country, currentPassword: currentPassword || undefined, newPassword: newPassword || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setSuccess("Profile updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    border: "1.5px solid #e8e8e8",
    borderRadius: "12px",
    fontSize: "14px",
    outline: "none",
    background: "white",
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "#1a8a5c"; };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "#e8e8e8"; };

  const selectStyle = {
    width: "100%",
    padding: "12px 16px",
    border: "1.5px solid #e8e8e8",
    borderRadius: "12px",
    fontSize: "14px",
    outline: "none",
    background: "white",
    appearance: "auto" as const,
  };

  return (
    <>
      <Header />
      <main className="py-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-8" style={{ color: "var(--bms-dark)" }}>My Profile</h1>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-8">
              {/* Personal information */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-5" style={{ color: "var(--bms-dark)" }}>Personal information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country <span className="text-gray-400 font-normal">(optional)</span></label>
                    <select
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">— Select a country —</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current password <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                      style={inputStyle}
                      placeholder="Required to save any changes"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Change password */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--bms-dark)" }}>Change password</h2>
                <p className="text-sm text-gray-500 mb-5">Leave these fields empty if you don&apos;t want to change your password.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                      style={inputStyle}
                      placeholder="At least 8 characters, upper/lowercase and number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                      style={inputStyle}
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
              )}
              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-full text-white font-semibold text-sm transition-opacity"
                style={{ background: "var(--bms-green)", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
