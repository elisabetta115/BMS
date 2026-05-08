"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ─── Types ────────────────────────────────────────────── */

interface UnitQuestion { id?: string; question: string; options: string[]; correctIndex: number; }
interface CredentialUnit { id?: string; title: string; type: "VIDEO" | "QUIZ"; order: number; videoUrl?: string; questions?: UnitQuestion[]; }
interface CredentialSubsection { id?: string; title: string; order: number; units: CredentialUnit[]; }
interface CredentialSection { id?: string; title: string; order: number; subsections: CredentialSubsection[]; }

interface MicroCredential {
  id: string; title: string; slug: string; code: string; project: string;
  description: string | null; image: string | null; developedBy: string | null;
  passGrade: number; sections?: CredentialSection[];
}

interface MicroProgramme {
  id: string; title: string; slug: string; code: string; project: string;
  description: string | null; image: string | null; credentials?: MicroCredential[];
}

function SearchableCredentialPicker({ credentials, onSelect }: { credentials: MicroCredential[]; onSelect: (id: string) => void }) {
  const [q, setQ] = useState("");
  const filtered = credentials.filter(c =>
    !q.trim() || c.title.toLowerCase().includes(q.toLowerCase()) || c.code.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="max-w-md">
      <div className="relative mb-2">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
        <input className="auth-input pl-9 text-sm" placeholder="Search credentials..." value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 p-3 text-center">No matches</p>
        ) : filtered.map(c => (
          <button key={c.id} type="button" onClick={() => { onSelect(c.id); setQ(""); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bms-green-light)] border-b border-gray-100 last:border-0 transition-colors">
            <span className="font-medium text-[var(--bms-green)]">{c.code}</span> <span className="text-gray-700">{c.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type Tab = "programmes" | "credentials";
type View = "list" | "new-prog" | "edit-prog" | "new-cred" | "edit-cred";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("programmes");
  const [view, setView] = useState<View>("list");
  const [programmes, setProgrammes] = useState<MicroProgramme[]>([]);
  const [credentials, setCredentials] = useState<MicroCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [editingProg, setEditingProg] = useState<MicroProgramme | null>(null);
  const [editingCred, setEditingCred] = useState<MicroCredential | null>(null);
  const [parentProgId, setParentProgId] = useState<string | null>(null);

  const [progForm, setProgForm] = useState({ title: "", slug: "", code: "", project: "RES4CITY", description: "", image: "" });
  const [credForm, setCredForm] = useState({ title: "", slug: "", code: "", project: "RES4CITY", description: "", image: "", developedBy: "", passGrade: "50" });
  const [sections, setSections] = useState<CredentialSection[]>([]);

  /* ─── Auth & data loading ────────────────────────────── */

  useEffect(() => {
    fetch("/api/auth/session").then(r => { if (!r.ok) { router.push("/login"); return null; } return r.json(); })
      .then(d => { if (d?.user) { if (d.user.role !== "ADMIN") { router.push("/"); return; } setUser(d.user); } })
      .catch(() => router.push("/login"));
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [pR, cR] = await Promise.all([
      fetch("/api/micro-programmes").then(r => r.ok ? r.json() : { programmes: [] }),
      fetch("/api/micro-credentials").then(r => r.ok ? r.json() : { credentials: [] }),
    ]);
    setProgrammes(pR.programmes || []); setCredentials(cR.credentials || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  function goList() { setView("list"); setEditingProg(null); setEditingCred(null); setParentProgId(null); setFormError(""); }

  async function refreshProg(id: string) {
    await loadData();
    const r = await fetch(`/api/micro-programmes/${id}`);
    if (r.ok) { const { programme } = await r.json(); setEditingProg(programme); setProgForm({ title: programme.title, slug: programme.slug, code: programme.code, project: programme.project, description: programme.description || "", image: programme.image || "" }); setView("edit-prog"); }
  }

  function progsUsingCred(credId: string) { return programmes.filter(p => (p.credentials || []).some(c => c.id === credId)).map(p => p.code); }

  /* ─── Programme handlers ─────────────────────────────── */

  function newProg() { setProgForm({ title: "", slug: "", code: "", project: "RES4CITY", description: "", image: "" }); setEditingProg(null); setFormError(""); setView("new-prog"); }
  function editProg(p: MicroProgramme) { setProgForm({ title: p.title, slug: p.slug, code: p.code, project: p.project, description: p.description || "", image: p.image || "" }); setEditingProg(p); setFormError(""); setView("edit-prog"); }

  async function saveProg(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (!progForm.title || !progForm.slug || !progForm.code) { setFormError("Title, slug, and code required."); return; }
    setFormLoading(true);
    try {
      const url = editingProg ? `/api/micro-programmes/${editingProg.id}` : "/api/micro-programmes";
      const r = await fetch(url, { method: editingProg ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(progForm) });
      const d = await r.json(); if (!r.ok) { setFormError(d.error || "Failed."); setFormLoading(false); return; }
      if (!editingProg) { await refreshProg(d.programme.id); } else { await refreshProg(editingProg.id); }
    } catch { setFormError("Network error."); }
    setFormLoading(false);
  }

  async function delProg(id: string) { if (!confirm("Delete this programme?")) return; await fetch(`/api/micro-programmes/${id}`, { method: "DELETE" }); await loadData(); goList(); }

  async function addCredToProg(credId: string) {
    if (!editingProg) return;
    const ids = (editingProg.credentials || []).map(c => c.id);
    if (ids.includes(credId)) return;
    await fetch(`/api/micro-programmes/${editingProg.id}/credentials`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credentialIds: [...ids, credId] }) });
    await refreshProg(editingProg.id);
  }

  async function removeCredFromProg(credId: string) {
    if (!editingProg || !confirm("Remove credential from programme?")) return;
    const ids = (editingProg.credentials || []).filter(c => c.id !== credId).map(c => c.id);
    await fetch(`/api/micro-programmes/${editingProg.id}/credentials`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credentialIds: ids }) });
    await refreshProg(editingProg.id);
  }

  /* ─── Credential handlers ────────────────────────────── */

  function newCred(progId?: string) {
    setCredForm({ title: "", slug: "", code: "", project: "RES4CITY", description: "", image: "", developedBy: "", passGrade: "50" });
    setSections([]); setEditingCred(null); setParentProgId(progId || null); setFormError(""); setView("new-cred");
  }

  function editCred(c: MicroCredential, progId?: string) {
    setCredForm({ title: c.title, slug: c.slug, code: c.code, project: c.project, description: c.description || "", image: c.image || "", developedBy: c.developedBy || "", passGrade: String(c.passGrade) });
    setSections(c.sections || []); setEditingCred(c); setParentProgId(progId || null); setFormError(""); setView("edit-cred");
  }

  async function saveCred(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (!credForm.title || !credForm.slug || !credForm.code) { setFormError("Title, slug, and code required."); return; }
    setFormLoading(true);
    try {
      const url = editingCred ? `/api/micro-credentials/${editingCred.id}` : "/api/micro-credentials";
      const method = editingCred ? "PATCH" : "POST";
      const payload = { ...credForm, passGrade: parseInt(credForm.passGrade) || 50, sections };
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json(); if (!r.ok) { setFormError(d.error || "Failed."); setFormLoading(false); return; }
      if (!editingCred && parentProgId) {
        const prog = programmes.find(p => p.id === parentProgId);
        const ids = (prog?.credentials || []).map(c => c.id);
        await fetch(`/api/micro-programmes/${parentProgId}/credentials`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credentialIds: [...ids, d.credential.id] }) });
        await refreshProg(parentProgId);
      } else if (parentProgId) { await refreshProg(parentProgId); }
      else { await loadData(); goList(); }
    } catch { setFormError("Network error."); }
    setFormLoading(false);
  }

  async function delCred(id: string) {
    if (!confirm("Delete credential permanently from all programmes?")) return;
    await fetch(`/api/micro-credentials/${id}`, { method: "DELETE" }); await loadData();
    if (editingProg) await refreshProg(editingProg.id); else goList();
  }

  /* ─── Section / Subsection / Unit builders ───────────── */

  function addSection() { setSections([...sections, { title: "", order: sections.length, subsections: [] }]); }
  function removeSection(i: number) { setSections(sections.filter((_, x) => x !== i)); }
  function updateSection(i: number, title: string) { const s = [...sections]; s[i] = { ...s[i], title }; setSections(s); }

  function addSubsection(si: number) {
    const s = [...sections]; s[si] = { ...s[si], subsections: [...s[si].subsections, { title: "", order: s[si].subsections.length, units: [] }] }; setSections(s);
  }
  function removeSubsection(si: number, ssi: number) {
    const s = [...sections]; s[si] = { ...s[si], subsections: s[si].subsections.filter((_, x) => x !== ssi) }; setSections(s);
  }
  function updateSubsection(si: number, ssi: number, title: string) {
    const s = [...sections]; s[si].subsections[ssi] = { ...s[si].subsections[ssi], title }; setSections(s);
  }

  function addUnit(si: number, ssi: number, type: "VIDEO" | "QUIZ") {
    const s = [...sections]; const units = s[si].subsections[ssi].units;
    s[si].subsections[ssi] = { ...s[si].subsections[ssi], units: [...units, { title: "", type, order: units.length, videoUrl: "", questions: [] }] }; setSections(s);
  }
  function removeUnit(si: number, ssi: number, ui: number) {
    const s = [...sections]; s[si].subsections[ssi].units = s[si].subsections[ssi].units.filter((_, x) => x !== ui); setSections(s);
  }
  function updateUnit(si: number, ssi: number, ui: number, field: string, value: any) {
    const s = [...sections]; (s[si].subsections[ssi].units[ui] as any)[field] = value; setSections(s);
  }

  // Quiz question helpers for units
  function addUnitQ(si: number, ssi: number, ui: number) {
    const s = [...sections]; const qs = s[si].subsections[ssi].units[ui].questions || [];
    s[si].subsections[ssi].units[ui].questions = [...qs, { question: "", options: ["", ""], correctIndex: 0 }]; setSections(s);
  }
  function removeUnitQ(si: number, ssi: number, ui: number, qi: number) {
    const s = [...sections]; s[si].subsections[ssi].units[ui].questions = (s[si].subsections[ssi].units[ui].questions || []).filter((_, x) => x !== qi); setSections(s);
  }
  function updateUnitQ(si: number, ssi: number, ui: number, qi: number, field: string, value: any) {
    const s = [...sections]; const qs = [...(s[si].subsections[ssi].units[ui].questions || [])]; (qs[qi] as any)[field] = value; s[si].subsections[ssi].units[ui].questions = qs; setSections(s);
  }
  function addUnitQOpt(si: number, ssi: number, ui: number, qi: number) {
    const s = [...sections]; const qs = [...(s[si].subsections[ssi].units[ui].questions || [])]; qs[qi].options = [...qs[qi].options, ""]; s[si].subsections[ssi].units[ui].questions = qs; setSections(s);
  }
  function removeUnitQOpt(si: number, ssi: number, ui: number, qi: number, oi: number) {
    const s = [...sections]; const qs = [...(s[si].subsections[ssi].units[ui].questions || [])];
    qs[qi].options = qs[qi].options.filter((_, x) => x !== oi);
    if (qs[qi].correctIndex >= qs[qi].options.length) qs[qi].correctIndex = 0;
    s[si].subsections[ssi].units[ui].questions = qs; setSections(s);
  }
  function updateUnitQOpt(si: number, ssi: number, ui: number, qi: number, oi: number, val: string) {
    const s = [...sections]; const qs = [...(s[si].subsections[ssi].units[ui].questions || [])]; qs[qi].options[oi] = val; s[si].subsections[ssi].units[ui].questions = qs; setSections(s);
  }

  /* ─── Render helpers ─────────────────────────────────── */

  function renderProgForm() {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input className="auth-input" value={progForm.title} onChange={e => setProgForm({ ...progForm, title: e.target.value })} required /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label><input className="auth-input" value={progForm.slug} onChange={e => setProgForm({ ...progForm, slug: e.target.value })} required placeholder="e.g. mp1" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Code *</label><input className="auth-input" value={progForm.code} onChange={e => setProgForm({ ...progForm, code: e.target.value })} required placeholder="e.g. MP1" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Project</label><select className="auth-input" value={progForm.project} onChange={e => setProgForm({ ...progForm, project: e.target.value })}><option>RES4CITY</option><option>SHERLOCK</option><option>COSS</option></select></div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="auth-input" rows={2} value={progForm.description} onChange={e => setProgForm({ ...progForm, description: e.target.value })} /></div>
      </div>
    );
  }

  function renderSectionEditor() {
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg" style={{ color: "var(--bms-green)" }}>Sections</h3>
          <button type="button" onClick={addSection} className="text-sm text-[var(--bms-green)] font-medium hover:underline">+ Add Section</button>
        </div>

        {sections.length === 0 && <p className="text-gray-400 text-sm py-4 text-center border border-dashed border-gray-300 rounded-xl">No sections yet.</p>}

        {sections.map((sec, si) => (
          <div key={si} className="mb-4 border border-gray-200 rounded-xl p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-gray-400">S{si + 1}</span>
              <input className="auth-input flex-1" placeholder="Section title" value={sec.title} onChange={e => updateSection(si, e.target.value)} />
              <button type="button" onClick={() => removeSection(si)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
            </div>

            {/* Subsections */}
            <div className="ml-4">
              {sec.subsections.map((sub, ssi) => (
                <div key={ssi} className="mb-3 border border-gray-200 rounded-lg p-3 bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-400">{si + 1}.{ssi + 1}</span>
                    <input className="auth-input flex-1 text-sm" placeholder="Subsection title" value={sub.title} onChange={e => updateSubsection(si, ssi, e.target.value)} />
                    <button type="button" onClick={() => removeSubsection(si, ssi)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>

                  {/* Units */}
                  <div className="ml-4 space-y-2">
                    {sub.units.map((unit, ui) => (
                      <div key={ui} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${unit.type === "VIDEO" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {unit.type}
                          </span>
                          <input className="auth-input flex-1 text-sm" placeholder="Unit title" value={unit.title} onChange={e => updateUnit(si, ssi, ui, "title", e.target.value)} />
                          <button type="button" onClick={() => removeUnit(si, ssi, ui)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        </div>

                        {/* VIDEO: YouTube URL */}
                        {unit.type === "VIDEO" && (
                          <div className="ml-6">
                            <input className="auth-input text-sm" placeholder="YouTube URL" value={unit.videoUrl || ""} onChange={e => updateUnit(si, ssi, ui, "videoUrl", e.target.value)} />
                            {unit.videoUrl && unit.videoUrl.includes("youtu") && (
                              <div className="mt-2 aspect-video max-w-xs rounded-lg overflow-hidden bg-black">
                                <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${unit.videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1] || ""}`} allowFullScreen />
                              </div>
                            )}
                          </div>
                        )}

                        {/* QUIZ: questions */}
                        {unit.type === "QUIZ" && (
                          <div className="ml-6 mt-2">
                            {(unit.questions || []).map((q, qi) => (
                              <div key={qi} className="mb-3 p-3 border border-gray-200 rounded-lg bg-white">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-gray-500">Q{qi + 1}</span>
                                  <button type="button" onClick={() => removeUnitQ(si, ssi, ui, qi)} className="text-xs text-red-500 hover:underline">Remove</button>
                                </div>
                                <input className="auth-input text-sm mb-2" placeholder="Question" value={q.question} onChange={e => updateUnitQ(si, ssi, ui, qi, "question", e.target.value)} />
                                {q.options.map((opt, oi) => (
                                  <div key={oi} className="flex items-center gap-2 mb-1">
                                    <input type="radio" name={`u${si}-${ssi}-${ui}-${qi}`} checked={q.correctIndex === oi} onChange={() => updateUnitQ(si, ssi, ui, qi, "correctIndex", oi)} className="w-3.5 h-3.5 accent-[var(--bms-green)]" />
                                    <input className="auth-input flex-1 text-sm" placeholder={`Option ${oi + 1}`} value={opt} onChange={e => updateUnitQOpt(si, ssi, ui, qi, oi, e.target.value)} />
                                    {q.options.length > 2 && <button type="button" onClick={() => removeUnitQOpt(si, ssi, ui, qi, oi)} className="text-red-400 text-xs">✕</button>}
                                  </div>
                                ))}
                                {q.options.length < 6 && <button type="button" onClick={() => addUnitQOpt(si, ssi, ui, qi)} className="text-xs text-[var(--bms-green)] hover:underline">+ Option</button>}
                              </div>
                            ))}
                            <button type="button" onClick={() => addUnitQ(si, ssi, ui)} className="text-xs text-[var(--bms-green)] font-medium hover:underline">+ Add Question</button>
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="flex gap-2 mt-1">
                      <button type="button" onClick={() => addUnit(si, ssi, "VIDEO")} className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-50">+ Video</button>
                      <button type="button" onClick={() => addUnit(si, ssi, "QUIZ")} className="text-xs px-2 py-1 rounded border border-yellow-300 text-yellow-700 hover:bg-yellow-50">+ Quiz</button>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addSubsection(si)} className="text-xs text-gray-500 hover:text-gray-700 mt-1">+ Add Subsection</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!user) return null;

  /* ═══ RENDER ═══════════════════════════════════════════ */

  return (
    <>
      <Header />
      <main className="py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {view === "list" && (
            <>
              <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--bms-dark)" }}>Admin Panel</h1>

              {/* Tabs */}
              <div className="flex gap-1 mb-6 border-b border-gray-200">
                <button onClick={() => setTab("programmes")} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "programmes" ? "border-[var(--bms-green)] text-[var(--bms-green)]" : "border-transparent text-gray-500"}`}>
                  Micro-programmes ({programmes.length})
                </button>
                <button onClick={() => setTab("credentials")} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "credentials" ? "border-[var(--bms-green)] text-[var(--bms-green)]" : "border-transparent text-gray-500"}`}>
                  Micro-credentials ({credentials.length})
                </button>
              </div>

              {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" /></div> : tab === "programmes" ? (
                <>
                  <div className="flex justify-end mb-4"><button onClick={newProg} className="px-5 py-2 rounded-full text-white text-sm font-medium" style={{ background: "var(--bms-green)" }}>+ New Programme</button></div>
                  {programmes.length === 0 ? <p className="text-gray-400 text-sm py-6 text-center border border-dashed border-gray-300 rounded-xl">No programmes yet.</p> : (
                    <div className="space-y-3">{programmes.map(p => (
                      <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm cursor-pointer" onClick={() => editProg(p)}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1"><span className="text-sm font-bold" style={{ color: "var(--bms-green)" }}>{p.code}</span><span className="text-xs text-gray-400">|</span><span className="text-xs text-gray-500">{p.project}</span></div>
                            <h4 className="font-semibold mb-2" style={{ color: "var(--bms-dark)" }}>{p.title}</h4>
                            <div className="flex flex-wrap gap-1">{(p.credentials || []).map(c => <span key={c.id} className="text-xs bg-[var(--bms-green-light)] text-[var(--bms-green)] px-2 py-0.5 rounded-full">{c.code}</span>)}{(p.credentials || []).length === 0 && <span className="text-xs text-gray-400 italic">No credentials</span>}</div>
                          </div>
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => editProg(p)} className="text-[var(--bms-green)] text-sm hover:underline">Edit</button>
                            <button onClick={() => delProg(p.id)} className="text-red-500 text-sm hover:underline">Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}</div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-end mb-4"><button onClick={() => newCred()} className="px-5 py-2 rounded-full text-white text-sm font-medium" style={{ background: "var(--bms-dark)" }}>+ New Credential</button></div>
                  {credentials.length === 0 ? <p className="text-gray-400 text-sm py-6 text-center border border-dashed border-gray-300 rounded-xl">No credentials yet.</p> : (
                    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Code</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Title</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Used in</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Sections</th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-700">Actions</th>
                    </tr></thead><tbody>{credentials.map(c => {
                      const used = progsUsingCred(c.id);
                      return (<tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium">{c.code}</td>
                        <td className="py-3 px-3">{c.title}</td>
                        <td className="py-3 px-3">{used.length > 0 ? used.map(code => <span key={code} className="text-xs bg-[var(--bms-green-light)] text-[var(--bms-green)] px-2 py-0.5 rounded-full mr-1">{code}</span>) : <span className="text-xs text-gray-400">—</span>}</td>
                        <td className="py-3 px-3 text-gray-500">{(c.sections || []).length}</td>
                        <td className="py-3 px-3 text-right">
                          <button onClick={() => editCred(c)} className="text-[var(--bms-green)] text-sm hover:underline mr-3">Edit</button>
                          <button onClick={() => delCred(c.id)} className="text-red-500 text-sm hover:underline">Delete</button>
                        </td>
                      </tr>);
                    })}</tbody></table></div>
                  )}
                </>
              )}
            </>
          )}

          {/* NEW / EDIT PROGRAMME */}
          {(view === "new-prog" || view === "edit-prog") && (
            <>
              <button onClick={goList} className="text-sm text-gray-500 hover:text-gray-700 mb-4">← Back</button>
              <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--bms-dark)" }}>{editingProg ? editingProg.title : "New Micro-programme"}</h1>
              {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
              <form onSubmit={saveProg} className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
                {renderProgForm()}
                <div className="mt-4 flex gap-3">
                  <button type="submit" className="auth-btn max-w-xs" disabled={formLoading}>{formLoading ? "Saving…" : editingProg ? "Save" : "Create & Add Credentials"}</button>
                  <button type="button" onClick={goList} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50">Cancel</button>
                </div>
              </form>

              {/* Credential list inside programme */}
              {editingProg && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold" style={{ color: "var(--bms-green)" }}>Sections (Credentials)</h2>
                    <button onClick={() => newCred(editingProg.id)} className="px-4 py-2 rounded-full text-white text-sm font-medium" style={{ background: "var(--bms-green)" }}>+ New Credential</button>
                  </div>
                  {(editingProg.credentials || []).length === 0 ? <p className="text-gray-400 text-sm py-4 text-center border border-dashed border-gray-300 rounded-xl">No credentials.</p> : (
                    <div className="space-y-3">{(editingProg.credentials || []).map(c => (
                      <div key={c.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between">
                        <div className="flex-1 cursor-pointer" onClick={() => editCred(c, editingProg.id)}>
                          <p className="font-medium" style={{ color: "var(--bms-dark)" }}>{c.title}</p>
                          <span className="text-xs text-gray-500">{c.code} · {(c.sections || []).length} sections</span>
                          {progsUsingCred(c.id).length > 1 && <span className="text-xs text-blue-500 ml-2">Shared</span>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => editCred(c, editingProg.id)} className="text-[var(--bms-green)] text-sm hover:underline">Edit</button>
                          <button onClick={() => removeCredFromProg(c.id)} className="text-red-400 text-xs hover:underline">Remove</button>
                        </div>
                      </div>
                    ))}</div>
                  )}
                  {(() => {
                    const available = credentials.filter(c => !(editingProg.credentials || []).some(ec => ec.id === c.id));
                    if (available.length === 0) return null;
                    return (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-1">Add existing credential:</p>
                        <SearchableCredentialPicker credentials={available} onSelect={addCredToProg} />
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}

          {/* NEW / EDIT CREDENTIAL */}
          {(view === "new-cred" || view === "edit-cred") && (
            <>
              <button onClick={() => { if (parentProgId) { const p = programmes.find(x => x.id === parentProgId); if (p) { editProg(p); return; } } goList(); }} className="text-sm text-gray-500 hover:text-gray-700 mb-4">← Back</button>
              <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--bms-dark)" }}>{editingCred ? `Edit: ${editingCred.title}` : "New Micro-credential"}</h1>
              {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
              <form onSubmit={saveCred} className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input className="auth-input" value={credForm.title} onChange={e => setCredForm({ ...credForm, title: e.target.value })} required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label><input className="auth-input" value={credForm.slug} onChange={e => setCredForm({ ...credForm, slug: e.target.value })} required placeholder="e.g. carbon-neutrality" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Code *</label><input className="auth-input" value={credForm.code} onChange={e => setCredForm({ ...credForm, code: e.target.value })} required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Project</label><select className="auth-input" value={credForm.project} onChange={e => setCredForm({ ...credForm, project: e.target.value })}><option>RES4CITY</option><option>SHERLOCK</option><option>COSS</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Developed by</label><input className="auth-input" value={credForm.developedBy} onChange={e => setCredForm({ ...credForm, developedBy: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Pass Grade (%)</label><input className="auth-input" type="number" min="0" max="100" value={credForm.passGrade} onChange={e => setCredForm({ ...credForm, passGrade: e.target.value })} /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="auth-input" rows={2} value={credForm.description} onChange={e => setCredForm({ ...credForm, description: e.target.value })} /></div>
                </div>

                {renderSectionEditor()}

                <div className="mt-6 flex gap-3">
                  <button type="submit" className="auth-btn max-w-xs" disabled={formLoading}>{formLoading ? "Saving…" : editingCred ? "Update" : "Create"}</button>
                  <button type="button" onClick={() => { if (parentProgId) { const p = programmes.find(x => x.id === parentProgId); if (p) { editProg(p); return; } } goList(); }} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50">Cancel</button>
                  {editingCred && <button type="button" onClick={() => delCred(editingCred.id)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50">Delete</button>}
                </div>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
