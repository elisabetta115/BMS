"use client";

import MfeHeader from "@/components/MfeHeader";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

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

type Profile = { name: string; email: string; country: string };
type EditableKey = keyof Profile | "password";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>({ name: "", email: "", country: "" });

  const [editing, setEditing] = useState<EditableKey | null>(null);
  const [draft, setDraft] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) setUserName(d.user.username || d.user.name);
        else router.push("/");
      })
      .catch(() => router.push("/"));
  }, [router]);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setProfile({ name: d.name || "", email: d.email || "", country: d.country || "" });
          setUsername(d.username || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function startEdit(key: EditableKey) {
    setEditing(key);
    setDraft(key === "password" ? "" : profile[key]);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    if (editing === "password" && newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    const next: Profile = editing === "password" ? profile : { ...profile, [editing]: draft.trim() };
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...next,
          currentPassword,
          newPassword: editing === "password" ? newPassword : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setProfile({ ...next, email: next.email.toLowerCase() });
      if (editing === "name" && !username) setUserName(next.name);
      setSuccess(editing === "password" ? "Your password has been changed." : "Your changes have been saved.");
      setEditing(null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function editForm(input: React.ReactNode, currentPasswordFirst = false) {
    const current = (
      <label className="bms-modal-label">
        Current password
        <input
          className="bms-modal-input"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </label>
    );
    return (
      <form className="bms-account-form" onSubmit={save} autoComplete="off">
        {currentPasswordFirst && current}
        {input}
        {!currentPasswordFirst && current}
        {error && <p className="bms-modal-error">{error}</p>}
        <div className="bms-account-form-actions">
          <button type="submit" className="bms-account-save" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className="bms-account-cancel" onClick={() => setEditing(null)} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  function field(key: keyof Profile, label: string, help: string | null, input: React.ReactNode) {
    return (
      <div className="bms-account-field">
        <p className="bms-account-label">
          {label}
          {editing !== key && (
            <button type="button" className="bms-account-edit" onClick={() => startEdit(key)}>
              <Pencil aria-hidden="true" size={16} fill="currentColor" /> Edit
            </button>
          )}
        </p>
        {editing === key ? (
          editForm(input)
        ) : (
          <>
            {profile[key] ? (
              <p className="bms-account-value">{profile[key]}</p>
            ) : (
              <button type="button" className="bms-account-add" onClick={() => startEdit(key)}>
                Add {label.toLowerCase()}
              </button>
            )}
            {help && <p className="bms-account-helper">{help}</p>}
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <header className="bms-acct-header">
        <MfeHeader
          userName={userName}
          showAvatar
          menuItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Logout", logout: true },
          ]}
        >
          <Link href="/dashboard" className="bms-acct-header-link">
            Courses
          </Link>
        </MfeHeader>
      </header>
      <main id="main" className="bms-account">
        <h1 className="bms-account-title">Account Settings</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-green border-t-transparent" />
          </div>
        ) : (
          <div className="bms-account-grid">
            <nav className="bms-account-nav" aria-label="Account settings">
              <a href="#account-information" className="is-active">
                Account Information
              </a>
            </nav>

            <section id="account-information" className="bms-account-section">
              <h2 className="bms-account-heading">Account Information</h2>
              <p className="bms-account-desc">These settings include basic information about your account.</p>
              {success && <p className="bms-account-status">{success}</p>}

              {username && (
                <div className="bms-account-field">
                  <p className="bms-account-label">Username</p>
                  <p className="bms-account-value">{username}</p>
                  <p className="bms-account-helper">
                    The name that identifies you on BoostMySkills. You cannot change your username.
                  </p>
                </div>
              )}

              {field(
                "name",
                "Full name",
                "The name that is used for ID verification and that appears on your certificates.",
                <input className="bms-modal-input" type="text" value={draft} onChange={(e) => setDraft(e.target.value)} required aria-label="Full name" />
              )}

              {field(
                "email",
                "Email address (Sign in)",
                "You receive messages from BoostMySkills and course teams at this address.",
                <input className="bms-modal-input" type="email" value={draft} onChange={(e) => setDraft(e.target.value)} required aria-label="Email address" />
              )}

              <div className="bms-account-field">
                <p className="bms-account-label">Password</p>
                {editing === "password" ? (
                  editForm(
                    <>
                      <label className="bms-modal-label">
                        New password
                        <input
                          className="bms-modal-input"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters, upper/lowercase and number"
                          required
                        />
                      </label>
                      <label className="bms-modal-label">
                        Confirm new password
                        <input
                          className="bms-modal-input"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </label>
                    </>,
                    true
                  )
                ) : (
                  <button type="button" className="bms-account-add" onClick={() => startEdit("password")}>
                    Change Password
                  </button>
                )}
              </div>

              {field(
                "country",
                "Country",
                null,
                <select className="bms-modal-input" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Country">
                  <option value="">— Select a country —</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
