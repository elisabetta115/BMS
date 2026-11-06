"use client";

// The "Programme admins" panel on a programme's edit page, for site admins:
// learners put in charge of this programme (see src/lib/admin.ts for what
// they may do).

import { useEffect, useState } from "react";

interface ProgrammeAdmin {
  id: string;
  name: string;
  username: string | null;
  email: string;
}

export default function ProgrammeAdmins({ programmeId }: { programmeId: string }) {
  const [admins, setAdmins] = useState<ProgrammeAdmin[] | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Learners matching what the site admin is typing, to pick from.
  const [suggestions, setSuggestions] = useState<ProgrammeAdmin[]>([]);
  const [suggestionsFor, setSuggestionsFor] = useState(""); // the text they match
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputId = `programme-admin-${programmeId}`;
  const listId = `${inputId}-suggestions`;
  const query = identifier.trim();
  const showList = listOpen && query.length >= 2 && suggestionsFor === query;
  const hasOptions = showList && suggestions.length > 0;

  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    // Wait until the admin pauses typing.
    const timer = setTimeout(() => {
      fetch(`/api/micro-programmes/${programmeId}/admins?search=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => { setSuggestions(d.candidates || []); setSuggestionsFor(query); setActive(-1); })
        .catch(() => {});
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, programmeId]);

  function pick(u: ProgrammeAdmin) {
    setIdentifier(u.email);
    setListOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setListOpen(true);
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && hasOptions) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === "Enter" && hasOptions && active >= 0) {
      e.preventDefault(); // pick the learner instead of submitting what was typed
      pick(suggestions[active]);
    } else if (e.key === "Escape" && showList) {
      e.preventDefault();
      setListOpen(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setAdmins(null);
    setError("");
    fetch(`/api/micro-programmes/${programmeId}/admins`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setAdmins(d.admins || []); })
      .catch(() => { if (!cancelled) { setAdmins([]); setError("Could not load this programme's admins."); } });
    return () => { cancelled = true; };
  }, [programmeId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/micro-programmes/${programmeId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const d = await r.json();
      if (!r.ok) setError(d.error || "Could not add this admin.");
      else { setAdmins((a) => [...(a || []), d.admin]); setIdentifier(""); }
    } catch {
      setError("Network error.");
    }
    setBusy(false);
  }

  async function remove(userId: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/micro-programmes/${programmeId}/admins?userId=${encodeURIComponent(userId)}`, { method: "DELETE" });
      if (!r.ok) setError("Could not remove this admin.");
      else setAdmins((a) => (a || []).filter((x) => x.id !== userId));
    } catch {
      setError("Network error.");
    }
    setBusy(false);
  }

  return (
    <section className="mt-10">
      <h2 className="bms-admin-section-title">Programme admins</h2>
      {/* .bms-admin-help sets its own margin, which a Tailwind class can't override. */}
      <p className="bms-admin-help" style={{ marginBottom: "1rem" }}>
        Learners who can edit this programme in the Admin Panel, create new micro-credentials in it, add
        existing ones to it, and edit every micro-credential in it. They can&apos;t delete anything, import
        courses, or change certificates or other programmes.
      </p>

      {error && <div className="bms-admin-alert mb-4">{error}</div>}

      <form onSubmit={add} autoComplete="off" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative min-w-0 flex-1" style={{ minWidth: "16rem" }}>
          <label className="bms-admin-label" htmlFor={inputId}>Learner&apos;s name, email or username</label>
          <input
            id={inputId}
            className="auth-input"
            value={identifier}
            onChange={(e) => { setIdentifier(e.target.value); setListOpen(true); setActive(-1); }}
            onKeyDown={onKeyDown}
            onBlur={() => setListOpen(false)}
            placeholder="Start typing, then pick the learner"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={hasOptions}
            aria-controls={listId}
            aria-activedescendant={hasOptions && active >= 0 ? `${listId}-${active}` : undefined}
          />
          {hasOptions && (
            <ul id={listId} role="listbox" aria-label="Matching learners" className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-soft border border-brand-line py-1 z-10 max-h-72 overflow-auto">
              {suggestions.map((u, i) => (
                <li
                  key={u.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // mousedown, not click: a click would come after the input's blur has closed the list.
                  onMouseDown={(e) => { e.preventDefault(); pick(u); }}
                  onMouseEnter={() => setActive(i)}
                  className={`px-4 py-2 cursor-pointer ${i === active ? "bg-gray-100" : ""}`}
                >
                  <span className="block text-sm font-medium text-brand-dark">{u.name}</span>
                  <span className="block text-xs text-brand-muted">{u.email}{u.username ? ` · ${u.username}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
          {showList && suggestions.length === 0 && (
            <div role="status" className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-soft border border-brand-line px-4 py-3 z-10 text-sm text-brand-muted">
              No learner matches. Site admins and this programme&apos;s admins aren&apos;t listed.
            </div>
          )}
        </div>
        <button type="submit" className="bms-admin-btn" disabled={busy || !identifier.trim()}>Add admin</button>
      </form>

      {admins === null ? (
        <p className="bms-admin-help">Loading…</p>
      ) : admins.length === 0 ? (
        <p className="bms-admin-empty">No programme admins yet.</p>
      ) : (
        <div className="space-y-3">
          {admins.map((a) => (
            <div key={a.id} className="bms-admin-subitem">
              <div className="min-w-0 flex-1">
                <p className="bms-admin-subitem-title">{a.name}</p>
                <p className="bms-admin-item-meta">{a.email}{a.username ? ` · ${a.username}` : ""}</p>
              </div>
              <button type="button" onClick={() => remove(a.id)} disabled={busy} className="bms-admin-link is-danger">Remove</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
