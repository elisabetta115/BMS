"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

/* ─── Types ────────────────────────────────────────────── */

interface UnitQuestion { id?: string; question: string; options: string[]; correctIndex: number; }
interface CredentialUnit { id?: string; title: string; type: "VIDEO" | "QUIZ" | "PRESENTATION"; order: number; videoUrl?: string; pptxBase64?: string; pptxMime?: string; pptxName?: string; hasPptx?: boolean; questions?: UnitQuestion[]; }
interface CredentialSubsection { id?: string; title: string; order: number; units: CredentialUnit[]; }
interface CredentialSection { id?: string; title: string; order: number; subsections: CredentialSubsection[]; }

interface MicroCredential {
  id: string; title: string; slug: string; code: string; project: string;
  description: string | null; image: string | null; hasImage: boolean; developedBy: string | null;
  passGrade: number; sections?: CredentialSection[];
}

interface MicroProgramme {
  id: string; title: string; slug: string; code: string; project: string;
  description: string | null; image: string | null; hasImage: boolean; credentials?: MicroCredential[];
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

function ImageUploader({ value, onChange }: { value: string; onChange: (dataUrl: string) => void }) {
  const [error, setError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setError("Only PNG and JPG files are allowed."); e.target.value = ""; return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File must be under 20 MB."); e.target.value = ""; return;
    }

    const reader = new FileReader();
    reader.onload = () => { onChange(reader.result as string); };
    reader.onerror = () => { setError("Failed to read file."); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div>
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="Preview" className="h-24 w-auto rounded-lg border border-gray-200 object-cover" />
          <button type="button" onClick={() => onChange("")} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 shadow-sm">✕</button>
        </div>
      ) : (
        <>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium cursor-pointer transition-colors bg-white text-gray-700 hover:border-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            Upload image
            <input type="file" accept=".png,.jpg,.jpeg" onChange={handleFile} className="hidden" />
          </label>
          <p className="text-xs text-gray-400 mt-1">PNG or JPG, max 20 MB</p>
        </>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function UnitTypePicker({ onSelect }: { onSelect: (type: "VIDEO" | "QUIZ" | "PRESENTATION") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative mt-1" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--bms-green)] text-[var(--bms-green)] font-medium hover:bg-[var(--bms-green-light)] transition-colors">
        + Add Unit
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 min-w-[160px] z-10">
          <button type="button" onClick={() => { onSelect("VIDEO"); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Video
          </button>
          <button type="button" onClick={() => { onSelect("QUIZ"); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> Quiz
          </button>
          <button type="button" onClick={() => { onSelect("PRESENTATION"); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Presentation
          </button>
        </div>
      )}
    </div>
  );
}

function AddPicker({ onProg, onCred }: { onProg: () => void; onCred: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="px-5 py-2.5 rounded-full text-white text-sm font-medium flex items-center gap-1.5" style={{ background: "var(--bms-green)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        Add
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 min-w-[200px] z-10">
          <button onClick={() => { onProg(); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--bms-green)]" /> Micro-programme
          </button>
          <button onClick={() => { onCred(); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--bms-dark)" }} /> Micro-credential
          </button>
        </div>
      )}
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
  const [adminSearch, setAdminSearch] = useState("");

  const [editingProg, setEditingProg] = useState<MicroProgramme | null>(null);
  const [editingCred, setEditingCred] = useState<MicroCredential | null>(null);
  const [parentProgId, setParentProgId] = useState<string | null>(null);

  const [progForm, setProgForm] = useState({ title: "", slug: "", code: "", project: "", description: "", image: "" });
  const [credForm, setCredForm] = useState({ title: "", slug: "", code: "", project: "", description: "", image: "", developedBy: "", passGrade: "50" });
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

  const allProjects = Array.from(new Set([...programmes.map(p => p.project), ...credentials.map(c => c.project)].filter(Boolean))).sort();

  const filteredProgs = useMemo(() => {
    if (!adminSearch.trim()) return programmes;
    const q = adminSearch.toLowerCase();
    return programmes.filter(p => p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.project.toLowerCase().includes(q));
  }, [programmes, adminSearch]);

  const filteredCreds = useMemo(() => {
    if (!adminSearch.trim()) return credentials;
    const q = adminSearch.toLowerCase();
    return credentials.filter(c => c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.project.toLowerCase().includes(q) || (c.developedBy || "").toLowerCase().includes(q));
  }, [credentials, adminSearch]);

  function goList() { setView("list"); setEditingProg(null); setEditingCred(null); setParentProgId(null); setFormError(""); }

  async function refreshProg(id: string) {
    await loadData();
    const r = await fetch(`/api/micro-programmes/${id}`);
    if (r.ok) { const { programme } = await r.json(); setEditingProg(programme); setProgForm({ title: programme.title, slug: programme.slug, code: programme.code, project: programme.project, description: programme.description || "", image: programme.image || "" }); setView("edit-prog"); }
  }

  function progsUsingCred(credId: string) { return programmes.filter(p => (p.credentials || []).some(c => c.id === credId)).map(p => p.code); }

  /* ─── Programme handlers ─────────────────────────────── */

  function toSlug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  function newProg() { setProgForm({ title: "", slug: "", code: "", project: "", description: "", image: "" }); setEditingProg(null); setFormError(""); setView("new-prog"); }
  function editProg(p: MicroProgramme) {
    const imgUrl = p.hasImage ? `/api/images/programme/${p.id}` : p.image || "";
    setProgForm({ title: p.title, slug: p.slug, code: p.code, project: p.project, description: p.description || "", image: imgUrl });
    setEditingProg(p); setFormError(""); setView("edit-prog");
  }

  async function saveProg(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (!progForm.title || !progForm.code) { setFormError("Title and code required."); return; }
    setFormLoading(true);
    try {
      const payload: any = { ...progForm, slug: progForm.slug || toSlug(progForm.title) };
      // If image is a data URL (new upload), split into base64 + mime
      if (progForm.image && progForm.image.startsWith("data:")) {
        const [header, data] = progForm.image.split(",");
        payload.imageBase64 = data;
        payload.imageMime = header.match(/data:(.*?);/)?.[1] || "image/png";
        delete payload.image;
      } else if (!progForm.image) {
        payload.removeImage = true;
        delete payload.image;
      } else {
        delete payload.image; // existing URL, no change
      }
      const url = editingProg ? `/api/micro-programmes/${editingProg.id}` : "/api/micro-programmes";
      const r = await fetch(url, { method: editingProg ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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
    setCredForm({ title: "", slug: "", code: "", project: "", description: "", image: "", developedBy: "", passGrade: "50" });
    setSections([]); setEditingCred(null); setParentProgId(progId || null); setFormError(""); setView("new-cred");
  }

  function editCred(c: MicroCredential, progId?: string) {
    const imgUrl = c.hasImage ? `/api/images/credential/${c.id}` : c.image || "";
    setCredForm({ title: c.title, slug: c.slug, code: c.code, project: c.project, description: c.description || "", image: imgUrl, developedBy: c.developedBy || "", passGrade: String(c.passGrade) });
    setSections(c.sections || []); setEditingCred(c); setParentProgId(progId || null); setFormError(""); setView("edit-cred");
  }

  async function saveCred(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (!credForm.title || !credForm.code) { setFormError("Title and code required."); return; }
    setFormLoading(true);
    try {
      const url = editingCred ? `/api/micro-credentials/${editingCred.id}` : "/api/micro-credentials";
      const method = editingCred ? "PATCH" : "POST";
      const payload: any = { ...credForm, slug: credForm.slug || toSlug(credForm.title), passGrade: parseInt(credForm.passGrade) || 50, sections };
      if (credForm.image && credForm.image.startsWith("data:")) {
        const [header, data] = credForm.image.split(",");
        payload.imageBase64 = data;
        payload.imageMime = header.match(/data:(.*?);/)?.[1] || "image/png";
        delete payload.image;
      } else if (!credForm.image) {
        payload.removeImage = true;
        delete payload.image;
      } else {
        delete payload.image;
      }
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

  function addUnit(si: number, ssi: number, type: "VIDEO" | "QUIZ" | "PRESENTATION") {
    const s = [...sections]; const units = s[si].subsections[ssi].units;
    s[si].subsections[ssi] = { ...s[si].subsections[ssi], units: [...units, { title: "", type, order: units.length, videoUrl: "", pptxBase64: "", pptxMime: "", pptxName: "", questions: [] }] }; setSections(s);
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
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Code *</label><input className="auth-input" value={progForm.code} onChange={e => setProgForm({ ...progForm, code: e.target.value })} required placeholder="e.g. MP1" /></div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Project</label><input className="auth-input" list="project-options" value={progForm.project} onChange={e => setProgForm({ ...progForm, project: e.target.value })} placeholder="Select or type a project name" /><datalist id="project-options">{allProjects.map(p => <option key={p} value={p} />)}</datalist></div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="auth-input" rows={2} value={progForm.description} onChange={e => setProgForm({ ...progForm, description: e.target.value })} /></div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Image</label><ImageUploader value={progForm.image} onChange={url => setProgForm({ ...progForm, image: url })} /></div>
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
              <span className="text-sm font-bold text-[var(--bms-green)] min-w-[2rem]">{si + 1}</span>
              <input className="auth-input flex-1" placeholder="Section title" value={sec.title} onChange={e => updateSection(si, e.target.value)} />
              <button type="button" onClick={() => removeSection(si)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
            </div>

            {/* Subsections */}
            <div className="ml-6">
              {sec.subsections.map((sub, ssi) => (
                <div key={ssi} className="mb-3 border border-gray-200 rounded-lg p-3 bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-[var(--bms-dark)] min-w-[2.5rem]">{si + 1}.{ssi + 1}</span>
                    <input className="auth-input flex-1 text-sm" placeholder="Subsection title" value={sub.title} onChange={e => updateSubsection(si, ssi, e.target.value)} />
                    <button type="button" onClick={() => removeSubsection(si, ssi)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>

                  {/* Units */}
                  <div className="ml-8 space-y-2">
                    {sub.units.map((unit, ui) => (
                      <div key={ui} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-600 min-w-[3rem]">{si + 1}.{ssi + 1}.{ui + 1}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${unit.type === "VIDEO" ? "bg-blue-100 text-blue-700" : unit.type === "PRESENTATION" ? "bg-purple-100 text-purple-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {unit.type}
                          </span>
                          <input className="auth-input flex-1 text-sm" placeholder="Unit title" value={unit.title} onChange={e => updateUnit(si, ssi, ui, "title", e.target.value)} />
                          <button type="button" onClick={() => removeUnit(si, ssi, ui)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        </div>

                        {/* VIDEO: YouTube URL */}
                        {unit.type === "VIDEO" && (
                          <div className="ml-12">
                            <input className="auth-input text-sm" placeholder="YouTube URL" value={unit.videoUrl || ""} onChange={e => updateUnit(si, ssi, ui, "videoUrl", e.target.value)} />
                            {unit.videoUrl && unit.videoUrl.includes("youtu") && (
                              <div className="mt-2 aspect-video max-w-xs rounded-lg overflow-hidden bg-black">
                                <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${unit.videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1] || ""}`} allowFullScreen />
                              </div>
                            )}
                          </div>
                        )}

                        {/* PRESENTATION: PPTX upload */}
                        {unit.type === "PRESENTATION" && (
                          <div className="ml-12">
                            {(unit.pptxName || unit.hasPptx) ? (
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                  <span className="text-sm text-purple-700">{unit.pptxName || "presentation.pptx"}</span>
                                </div>
                                <button type="button" onClick={() => { updateUnit(si, ssi, ui, "pptxBase64", ""); updateUnit(si, ssi, ui, "pptxMime", ""); updateUnit(si, ssi, ui, "pptxName", ""); updateUnit(si, ssi, ui, "hasPptx", false); updateUnit(si, ssi, ui, "removePptx", true); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div>
                                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium cursor-pointer transition-colors bg-white text-gray-700 hover:border-gray-400">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                  Upload presentation
                                  <input type="file" accept=".pptx,.ppt,.pdf" className="hidden" onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (file.size > 1024 * 1024 * 1024) { alert("File must be under 1 GB."); e.target.value = ""; return; }
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      const dataUrl = reader.result as string;
                                      const [header, data] = dataUrl.split(",");
                                      const mime = header.match(/data:(.*?);/)?.[1] || "application/vnd.openxmlformats-officedocument.presentationml.presentation";
                                      updateUnit(si, ssi, ui, "pptxBase64", data);
                                      updateUnit(si, ssi, ui, "pptxMime", mime);
                                      updateUnit(si, ssi, ui, "pptxName", file.name);
                                    };
                                    reader.readAsDataURL(file);
                                    e.target.value = "";
                                  }} />
                                </label>
                                <p className="text-xs text-gray-400 mt-1">PPTX, PPT, or PDF, max 1 GB</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* QUIZ: questions */}
                        {unit.type === "QUIZ" && (
                          <div className="ml-12 mt-2">
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

                    {/* Add Unit — single button with type picker */}
                    <UnitTypePicker onSelect={(type) => addUnit(si, ssi, type)} />
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
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold" style={{ color: "var(--bms-dark)" }}>Admin Panel</h1>
                <AddPicker onProg={newProg} onCred={() => newCred()} />
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                <input
                  type="text"
                  className="w-full py-3 pl-10 pr-9 border border-gray-200 rounded-xl text-sm outline-none focus:border-[var(--bms-green)] transition-colors bg-white"
                  placeholder="Search programmes and credentials..."
                  value={adminSearch}
                  onChange={e => setAdminSearch(e.target.value)}
                />
                {adminSearch && <button onClick={() => setAdminSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-6 border-b border-gray-200">
                <button onClick={() => setTab("programmes")} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "programmes" ? "border-[var(--bms-green)] text-[var(--bms-green)]" : "border-transparent text-gray-500"}`}>
                  Micro-programmes ({filteredProgs.length})
                </button>
                <button onClick={() => setTab("credentials")} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "credentials" ? "border-[var(--bms-green)] text-[var(--bms-green)]" : "border-transparent text-gray-500"}`}>
                  Micro-credentials ({filteredCreds.length})
                </button>
              </div>

              {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" /></div> : tab === "programmes" ? (
                <>
                  {filteredProgs.length === 0 ? <p className="text-gray-400 text-sm py-6 text-center border border-dashed border-gray-300 rounded-xl">{adminSearch ? "No programmes match your search." : "No programmes yet."}</p> : (
                    <div className="space-y-3">{filteredProgs.map(p => (
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
                  {filteredCreds.length === 0 ? <p className="text-gray-400 text-sm py-6 text-center border border-dashed border-gray-300 rounded-xl">{adminSearch ? "No credentials match your search." : "No credentials yet."}</p> : (
                    <div className="space-y-3">{filteredCreds.map(c => {
                      const used = progsUsingCred(c.id);
                      return (
                        <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm cursor-pointer" onClick={() => editCred(c)}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold" style={{ color: "var(--bms-green)" }}>{c.code}</span>
                                <span className="text-xs text-gray-400">|</span>
                                <span className="text-xs text-gray-500">{c.project}</span>
                                <span className="text-xs text-gray-400">|</span>
                                <span className="text-xs text-gray-500">{(c.sections || []).length} sections</span>
                              </div>
                              <h4 className="font-semibold mb-2" style={{ color: "var(--bms-dark)" }}>{c.title}</h4>
                              <div className="flex flex-wrap gap-1">
                                {used.length > 0 ? used.map(code => <span key={code} className="text-xs bg-[var(--bms-green-light)] text-[var(--bms-green)] px-2 py-0.5 rounded-full">{code}</span>) : <span className="text-xs text-gray-400 italic">Not in any programme</span>}
                              </div>
                            </div>
                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                              <button onClick={() => editCred(c)} className="text-[var(--bms-green)] text-sm hover:underline">Edit</button>
                              <button onClick={() => delCred(c.id)} className="text-red-500 text-sm hover:underline">Delete</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}</div>
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
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Micro Credential Name *</label><input className="auth-input" value={credForm.title} onChange={e => setCredForm({ ...credForm, title: e.target.value })} required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Micro Credential Number *</label><input className="auth-input" value={credForm.code} onChange={e => setCredForm({ ...credForm, code: e.target.value })} required placeholder="e.g. MC1.1" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label><input className="auth-input" value={credForm.developedBy} onChange={e => setCredForm({ ...credForm, developedBy: e.target.value })} placeholder="e.g. TU Dublin" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label><input className="auth-input" list="project-options-cred" value={credForm.project} onChange={e => setCredForm({ ...credForm, project: e.target.value })} placeholder="Select or type a project name" /><datalist id="project-options-cred">{allProjects.map(p => <option key={p} value={p} />)}</datalist></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Pass Grade (%)</label><input className="auth-input" type="number" min="0" max="100" value={credForm.passGrade} onChange={e => setCredForm({ ...credForm, passGrade: e.target.value })} /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="auth-input" rows={2} value={credForm.description} onChange={e => setCredForm({ ...credForm, description: e.target.value })} /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Image</label><ImageUploader value={credForm.image} onChange={url => setCredForm({ ...credForm, image: url })} /></div>
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
