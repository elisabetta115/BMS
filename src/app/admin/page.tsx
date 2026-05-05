"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correctIndex: number;
}

interface MicroCredential {
  id: string;
  title: string;
  slug: string;
  code: string;
  project: string;
  description: string | null;
  image: string | null;
  developedBy: string | null;
  passGrade: number;
  videoUrl: string | null;
  pptUrl: string | null;
  questions?: QuizQuestion[];
}

interface MicroProgramme {
  id: string;
  title: string;
  slug: string;
  code: string;
  project: string;
  description: string | null;
  image: string | null;
  credentials?: MicroCredential[];
}

type Tab = "programmes" | "credentials";

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("programmes");
  const [credentials, setCredentials] = useState<MicroCredential[]>([]);
  const [programmes, setProgrammes] = useState<MicroProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Programme form
  const [showProgForm, setShowProgForm] = useState(false);
  const [editingProg, setEditingProg] = useState<MicroProgramme | null>(null);
  const [progForm, setProgForm] = useState({ title: "", slug: "", code: "", project: "RES4CITY", description: "", image: "" });

  // Credential form
  const [showCredForm, setShowCredForm] = useState(false);
  const [editingCred, setEditingCred] = useState<MicroCredential | null>(null);
  const [credForm, setCredForm] = useState({
    title: "", slug: "", code: "", project: "RES4CITY", description: "", image: "",
    developedBy: "", passGrade: "50", videoUrl: "", pptUrl: "",
  });
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  // Linking credentials to programme
  const [linkingProgramme, setLinkingProgramme] = useState<MicroProgramme | null>(null);
  const [selectedCredIds, setSelectedCredIds] = useState<string[]>([]);

  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => { if (!r.ok) { router.push("/login"); return null; } return r.json(); })
      .then((data) => {
        if (data?.user) {
          if (data.user.role !== "ADMIN") { router.push("/"); return; }
          setUser(data.user);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      const [credRes, progRes] = await Promise.all([
        fetch("/api/micro-credentials"),
        fetch("/api/micro-programmes"),
      ]);
      const credData = await credRes.json();
      const progData = await progRes.json();
      setCredentials(credData.credentials || []);
      setProgrammes(progData.programmes || []);
    } catch (err) {
      console.error("Failed to load data:", err);
    }
    setLoading(false);
  }

  // ─── Programme handlers ───────────────────────────────────

  function resetProgForm() {
    setProgForm({ title: "", slug: "", code: "", project: "RES4CITY", description: "", image: "" });
    setEditingProg(null);
    setShowProgForm(false);
    setFormError("");
  }

  function startEditProg(prog: MicroProgramme) {
    setProgForm({
      title: prog.title, slug: prog.slug, code: prog.code, project: prog.project,
      description: prog.description || "", image: prog.image || "",
    });
    setEditingProg(prog);
    setShowProgForm(true);
    setFormError("");
  }

  async function handleProgSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!progForm.title || !progForm.slug || !progForm.code || !progForm.project) {
      setFormError("Title, slug, code, and project are required.");
      return;
    }
    setFormLoading(true);
    try {
      const url = editingProg ? `/api/micro-programmes/${editingProg.id}` : "/api/micro-programmes";
      const method = editingProg ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: progForm.title.trim(),
          slug: progForm.slug.trim(),
          code: progForm.code.trim(),
          project: progForm.project.trim(),
          description: progForm.description.trim() || undefined,
          image: progForm.image.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Failed to save."); setFormLoading(false); return; }
      resetProgForm();
      await loadData();
    } catch {
      setFormError("Network error. Check your connection and try again.");
    }
    setFormLoading(false);
  }

  async function deleteProg(id: string) {
    if (!confirm("Delete this micro-programme and all its credential links?")) return;
    await fetch(`/api/micro-programmes/${id}`, { method: "DELETE" });
    await loadData();
  }

  // ─── Credential handlers ──────────────────────────────────

  function resetCredForm() {
    setCredForm({ title: "", slug: "", code: "", project: "RES4CITY", description: "", image: "", developedBy: "", passGrade: "50", videoUrl: "", pptUrl: "" });
    setQuizQuestions([]);
    setEditingCred(null);
    setShowCredForm(false);
    setFormError("");
  }

  function startEditCred(cred: MicroCredential) {
    setCredForm({
      title: cred.title, slug: cred.slug, code: cred.code, project: cred.project,
      description: cred.description || "", image: cred.image || "",
      developedBy: cred.developedBy || "", passGrade: String(cred.passGrade),
      videoUrl: cred.videoUrl || "", pptUrl: cred.pptUrl || "",
    });
    setQuizQuestions(cred.questions || []);
    setEditingCred(cred);
    setShowCredForm(true);
    setFormError("");
  }

  async function handleCredSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!credForm.title || !credForm.slug || !credForm.code || !credForm.project) {
      setFormError("Title, slug, code, and project are required.");
      return;
    }
    setFormLoading(true);
    try {
      const url = editingCred ? `/api/micro-credentials/${editingCred.id}` : "/api/micro-credentials";
      const method = editingCred ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: credForm.title.trim(),
          slug: credForm.slug.trim(),
          code: credForm.code.trim(),
          project: credForm.project.trim(),
          description: credForm.description.trim() || undefined,
          image: credForm.image.trim() || undefined,
          developedBy: credForm.developedBy.trim() || undefined,
          passGrade: parseInt(credForm.passGrade) || 50,
          videoUrl: credForm.videoUrl.trim() || undefined,
          pptUrl: credForm.pptUrl.trim() || undefined,
          questions: quizQuestions,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Failed to save."); setFormLoading(false); return; }
      resetCredForm();
      await loadData();
    } catch {
      setFormError("Network error. Check your connection and try again.");
    }
    setFormLoading(false);
  }

  async function deleteCred(id: string) {
    if (!confirm("Delete this micro-credential?")) return;
    await fetch(`/api/micro-credentials/${id}`, { method: "DELETE" });
    await loadData();
  }

  // ─── Quiz question helpers ────────────────────────────────

  function addQuestion() {
    setQuizQuestions([...quizQuestions, { question: "", options: ["", ""], correctIndex: 0 }]);
  }

  function removeQuestion(idx: number) {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== idx));
  }

  function updateQuestion(idx: number, field: string, value: any) {
    const updated = [...quizQuestions];
    (updated[idx] as any)[field] = value;
    setQuizQuestions(updated);
  }

  function addOption(qIdx: number) {
    const updated = [...quizQuestions];
    updated[qIdx].options.push("");
    setQuizQuestions(updated);
  }

  function removeOption(qIdx: number, oIdx: number) {
    const updated = [...quizQuestions];
    updated[qIdx].options = updated[qIdx].options.filter((_, i) => i !== oIdx);
    if (updated[qIdx].correctIndex >= updated[qIdx].options.length) {
      updated[qIdx].correctIndex = 0;
    }
    setQuizQuestions(updated);
  }

  function updateOption(qIdx: number, oIdx: number, value: string) {
    const updated = [...quizQuestions];
    updated[qIdx].options[oIdx] = value;
    setQuizQuestions(updated);
  }

  // ─── Link credentials to programme ────────────────────────

  function startLinking(prog: MicroProgramme) {
    setLinkingProgramme(prog);
    setSelectedCredIds((prog.credentials || []).map((c) => c.id));
  }

  async function saveLinking() {
    if (!linkingProgramme) return;
    setFormLoading(true);
    try {
      const res = await fetch(`/api/micro-programmes/${linkingProgramme.id}/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialIds: selectedCredIds }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Failed to update credentials.");
        setFormLoading(false);
        return;
      }
      setLinkingProgramme(null);
      await loadData();
    } catch {
      setFormError("Network error.");
    }
    setFormLoading(false);
  }

  function toggleCredSelection(id: string) {
    setSelectedCredIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  if (!user) return null;

  return (
    <>
      <Header />
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-8" style={{ color: "var(--bms-dark)" }}>Admin Panel</h1>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 border-b border-gray-200">
            <button
              onClick={() => { setTab("programmes"); resetCredForm(); setLinkingProgramme(null); }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "programmes" ? "border-[var(--bms-green)] text-[var(--bms-green)]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Micro-programmes ({programmes.length})
            </button>
            <button
              onClick={() => { setTab("credentials"); resetProgForm(); setLinkingProgramme(null); }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "credentials" ? "border-[var(--bms-green)] text-[var(--bms-green)]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Micro-credentials ({credentials.length})
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tab === "programmes" ? (
            /* ═══ PROGRAMMES TAB ═══ */
            <div>
              {/* Linking modal */}
              {linkingProgramme && (
                <div className="mb-8 bg-white border-2 border-[var(--bms-green)] rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--bms-dark)" }}>
                    Add credentials to: {linkingProgramme.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">Select the micro-credentials that belong to this programme.</p>
                  {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}

                  {credentials.length === 0 ? (
                    <p className="text-gray-500 py-4">No micro-credentials exist yet. Create some in the Micro-credentials tab first.</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto space-y-2 mb-4">
                      {credentials.map((c) => (
                        <label key={c.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedCredIds.includes(c.id) ? "border-[var(--bms-green)] bg-[var(--bms-green-light)]" : "border-gray-200 hover:bg-gray-50"}`}>
                          <input
                            type="checkbox"
                            checked={selectedCredIds.includes(c.id)}
                            onChange={() => toggleCredSelection(c.id)}
                            className="w-4 h-4 accent-[var(--bms-green)]"
                          />
                          <div>
                            <span className="text-sm font-medium">{c.code}</span>
                            <span className="text-sm text-gray-600 ml-2">{c.title}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={saveLinking} disabled={formLoading} className="px-5 py-2.5 rounded-full text-white text-sm font-medium" style={{ background: "var(--bms-green)" }}>
                      {formLoading ? "Saving…" : `Save (${selectedCredIds.length} selected)`}
                    </button>
                    <button onClick={() => { setLinkingProgramme(null); setFormError(""); }} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => { resetProgForm(); setShowProgForm(true); setLinkingProgramme(null); }}
                className="mb-6 px-5 py-2.5 rounded-full text-white text-sm font-medium"
                style={{ background: "var(--bms-green)" }}
              >
                + New Micro-programme
              </button>

              {showProgForm && (
                <div className="mb-8 bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--bms-dark)" }}>
                    {editingProg ? "Edit Micro-programme" : "New Micro-programme"}
                  </h3>
                  {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
                  <form onSubmit={handleProgSubmit} className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                      <input className="auth-input" value={progForm.title} onChange={(e) => setProgForm({ ...progForm, title: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                      <input className="auth-input" value={progForm.slug} onChange={(e) => setProgForm({ ...progForm, slug: e.target.value })} required placeholder="e.g. mp1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                      <input className="auth-input" value={progForm.code} onChange={(e) => setProgForm({ ...progForm, code: e.target.value })} required placeholder="e.g. MP1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                      <select className="auth-input" value={progForm.project} onChange={(e) => setProgForm({ ...progForm, project: e.target.value })}>
                        <option value="RES4CITY">RES4CITY</option>
                        <option value="SHERLOCK">SHERLOCK</option>
                        <option value="COSS">COSS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                      <input className="auth-input" value={progForm.image} onChange={(e) => setProgForm({ ...progForm, image: e.target.value })} placeholder="/images/mp1.jpg" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea className="auth-input" rows={3} value={progForm.description} onChange={(e) => setProgForm({ ...progForm, description: e.target.value })} />
                    </div>
                    <div className="md:col-span-2 flex gap-3">
                      <button type="submit" className="auth-btn max-w-xs" disabled={formLoading}>
                        {formLoading ? "Saving…" : editingProg ? "Update" : "Create"}
                      </button>
                      <button type="button" onClick={resetProgForm} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Programmes list */}
              {programmes.length === 0 ? (
                <p className="text-gray-500 py-10 text-center">No micro-programmes yet. Create one above.</p>
              ) : (
                <div className="space-y-4">
                  {programmes.map((p) => (
                    <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold" style={{ color: "var(--bms-green)" }}>{p.code}</span>
                            <span className="text-xs text-gray-400">|</span>
                            <span className="text-xs text-gray-500">{p.project}</span>
                          </div>
                          <h4 className="font-semibold text-base mb-2" style={{ color: "var(--bms-dark)" }}>{p.title}</h4>
                          {p.credentials && p.credentials.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {p.credentials.map((c) => (
                                <span key={c.id} className="text-xs bg-[var(--bms-green-light)] text-[var(--bms-green)] px-2 py-0.5 rounded-full">{c.code}</span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">No credentials linked yet</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => startLinking(p)} className="text-xs px-3 py-1.5 rounded-full border border-[var(--bms-green)] text-[var(--bms-green)] hover:bg-[var(--bms-green-light)]">
                            + Credentials
                          </button>
                          <button onClick={() => startEditProg(p)} className="text-[var(--bms-green)] hover:underline text-sm">Edit</button>
                          <button onClick={() => deleteProg(p.id)} className="text-red-500 hover:underline text-sm">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ═══ CREDENTIALS TAB ═══ */
            <div>
              <button
                onClick={() => { resetCredForm(); setShowCredForm(true); }}
                className="mb-6 px-5 py-2.5 rounded-full text-white text-sm font-medium"
                style={{ background: "var(--bms-green)" }}
              >
                + New Micro-credential
              </button>

              {showCredForm && (
                <div className="mb-8 bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--bms-dark)" }}>
                    {editingCred ? "Edit Micro-credential" : "New Micro-credential"}
                  </h3>
                  {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
                  <form onSubmit={handleCredSubmit}>
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                        <input className="auth-input" value={credForm.title} onChange={(e) => setCredForm({ ...credForm, title: e.target.value })} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                        <input className="auth-input" value={credForm.slug} onChange={(e) => setCredForm({ ...credForm, slug: e.target.value })} required placeholder="e.g. carbon-neutrality-esg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                        <input className="auth-input" value={credForm.code} onChange={(e) => setCredForm({ ...credForm, code: e.target.value })} required placeholder="e.g. MC01" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                        <select className="auth-input" value={credForm.project} onChange={(e) => setCredForm({ ...credForm, project: e.target.value })}>
                          <option value="RES4CITY">RES4CITY</option>
                          <option value="SHERLOCK">SHERLOCK</option>
                          <option value="COSS">COSS</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Developed by</label>
                        <input className="auth-input" value={credForm.developedBy} onChange={(e) => setCredForm({ ...credForm, developedBy: e.target.value })} placeholder="e.g. Maynooth University" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pass Grade (%)</label>
                        <input className="auth-input" type="number" min="0" max="100" value={credForm.passGrade} onChange={(e) => setCredForm({ ...credForm, passGrade: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Video URL (YouTube/Vimeo)</label>
                        <input className="auth-input" value={credForm.videoUrl} onChange={(e) => setCredForm({ ...credForm, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PowerPoint URL</label>
                        <input className="auth-input" value={credForm.pptUrl} onChange={(e) => setCredForm({ ...credForm, pptUrl: e.target.value })} placeholder="https://docs.google.com/presentation/..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                        <input className="auth-input" value={credForm.image} onChange={(e) => setCredForm({ ...credForm, image: e.target.value })} placeholder="/images/mc01.jpg" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea className="auth-input" rows={3} value={credForm.description} onChange={(e) => setCredForm({ ...credForm, description: e.target.value })} />
                      </div>
                    </div>

                    {/* Quiz Questions */}
                    <div className="border-t border-gray-200 pt-5 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-sm" style={{ color: "var(--bms-dark)" }}>Quiz Questions ({quizQuestions.length})</h4>
                        <button type="button" onClick={addQuestion} className="text-sm text-[var(--bms-green)] font-medium hover:underline">+ Add question</button>
                      </div>

                      {quizQuestions.map((q, qIdx) => (
                        <div key={qIdx} className="mb-5 p-4 border border-gray-200 rounded-xl bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">Question {qIdx + 1}</span>
                            <button type="button" onClick={() => removeQuestion(qIdx)} className="text-xs text-red-500 hover:underline">Remove</button>
                          </div>
                          <input
                            className="auth-input mb-3"
                            placeholder="Enter the question"
                            value={q.question}
                            onChange={(e) => updateQuestion(qIdx, "question", e.target.value)}
                          />
                          <p className="text-xs text-gray-500 mb-2">Options (select the correct answer):</p>
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2 mb-2">
                              <input
                                type="radio"
                                name={`correct-${qIdx}`}
                                checked={q.correctIndex === oIdx}
                                onChange={() => updateQuestion(qIdx, "correctIndex", oIdx)}
                                className="w-4 h-4 accent-[var(--bms-green)]"
                              />
                              <input
                                className="auth-input flex-1"
                                placeholder={`Option ${oIdx + 1}`}
                                value={opt}
                                onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                              />
                              {q.options.length > 2 && (
                                <button type="button" onClick={() => removeOption(qIdx, oIdx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                              )}
                            </div>
                          ))}
                          {q.options.length < 6 && (
                            <button type="button" onClick={() => addOption(qIdx)} className="text-xs text-[var(--bms-green)] hover:underline mt-1">+ Add option</button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button type="submit" className="auth-btn max-w-xs" disabled={formLoading}>
                        {formLoading ? "Saving…" : editingCred ? "Update" : "Create"}
                      </button>
                      <button type="button" onClick={resetCredForm} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Credentials list */}
              {credentials.length === 0 ? (
                <p className="text-gray-500 py-10 text-center">No micro-credentials yet. Create one above.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Code</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Project</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Video</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">PPT</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Quiz</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {credentials.map((c) => (
                        <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{c.code}</td>
                          <td className="py-3 px-4">{c.title}</td>
                          <td className="py-3 px-4">{c.project}</td>
                          <td className="py-3 px-4">{c.videoUrl ? <span className="text-[var(--bms-green)]">✓</span> : <span className="text-gray-300">—</span>}</td>
                          <td className="py-3 px-4">{c.pptUrl ? <span className="text-[var(--bms-green)]">✓</span> : <span className="text-gray-300">—</span>}</td>
                          <td className="py-3 px-4">{c.questions && c.questions.length > 0 ? <span className="text-[var(--bms-green)]">{c.questions.length}q</span> : <span className="text-gray-300">—</span>}</td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => startEditCred(c)} className="text-[var(--bms-green)] hover:underline text-sm mr-3">Edit</button>
                            <button onClick={() => deleteCred(c.id)} className="text-red-500 hover:underline text-sm">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
