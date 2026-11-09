"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Award, Download, Plus, Search, X } from "lucide-react";
import { ORGANISATIONS } from "@/data/organisations";
import OlxImport from "@/components/admin/OlxImport";
import CertificatePreview from "@/components/admin/CertificatePreview";
import ProgrammeAdmins from "@/components/admin/ProgrammeAdmins";
import { DEFAULT_CONTENT_BOX, defaultIntroText } from "@/lib/certificate-defaults";
import { exceedsFullWeight, formatWeight, isFullWeight } from "@/lib/weights";
import { hasValidAnswer, missingAnswerError } from "@/lib/questions";

/* ─── Types ────────────────────────────────────────────── */

interface UnitQuestion { id?: string; title?: string | null; question: string; options: string[]; correctIndex: number; maxAttempts?: number | null; }
interface CredentialUnit {
  id?: string;
  title: string;
  type: "VIDEO" | "QUIZ" | "PRESENTATION";
  order: number;
  /** % of the grade; can be a fraction. Held as the typed text while being edited ("5."). */
  weight?: number | string;
  videoUrl?: string;
  fileBase64?: string;
  fileKey?: string;
  fileMime?: string;
  fileName?: string;
  hasFile?: boolean;
  removeFile?: boolean;
  questions?: UnitQuestion[];
}
interface CredentialSubsection { id?: string; title: string; order: number; units: CredentialUnit[]; }
interface CredentialSection { id?: string; title: string; order: number; subsections: CredentialSubsection[]; }

interface MicroCredential {
  id: string; title: string; slug: string; code: string; project: string;
  description: string | null; overview: string | null; objectives: string | null;
  image: string | null; hasImage: boolean; developedBy: string | null;
  organisation: string | null; topic: string | null;
  passGrade: number; sections?: CredentialSection[]; sectionsCount?: number;
}

interface MicroProgramme {
  id: string; title: string; slug: string; code: string; project: string;
  image: string | null; hasImage: boolean; credentials?: MicroCredential[];
}

interface Certificate {
  id: string; project: string; pdfName: string;
  introText: string; closingText: string;
  contentTop: number; contentBottom: number; contentWidth: number;
  hasPdf?: boolean;
}

interface CertForm {
  project: string; pdfBase64: string; pdfMime: string; pdfName: string;
  introText: string; closingText: string;
  contentTop: number; contentBottom: number; contentWidth: number;
}

function ImageUploader({ value, onChange }: { value: string; onChange: (dataUrl: string) => void }) {
  const [error, setError] = useState("");
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);

  useEffect(() => { setImgError(false); setImgLoading(!!value && !value.startsWith("data:")); }, [value]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setImgError(false);

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setError("Only PNG and JPG files are allowed."); e.target.value = ""; return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("File must be under 4 MB."); e.target.value = ""; return;
    }

    const reader = new FileReader();
    reader.onload = () => { onChange(reader.result as string); };
    reader.onerror = () => { setError("Failed to read file."); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div>
      {value && !imgError ? (
        <div className="relative inline-block">
          {imgLoading && (
            <div className="h-24 w-24 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <img
            src={value}
            alt="Preview"
            className="h-24 w-auto rounded-lg border border-gray-200 object-cover"
            style={imgLoading ? { display: "none" } : {}}
            onLoad={() => setImgLoading(false)}
            onError={() => { setImgError(true); setImgLoading(false); }}
          />
          {!imgLoading && <button type="button" onClick={() => { onChange(""); setImgError(false); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 shadow-sm">✕</button>}
        </div>
      ) : (
        <>
          <label className="bms-admin-btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            Upload image
            <input type="file" accept=".png,.jpg,.jpeg" onChange={handleFile} className="hidden" />
          </label>
          <p className="bms-admin-help">PNG or JPG, max 4 MB</p>
          {value && imgError && <p className="text-xs text-orange-500 mt-1">Couldn&apos;t load existing image (it will be kept unless you upload a new one or remove it).</p>}
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
      <button type="button" onClick={() => setOpen(!open)} className="text-xs px-3 py-1.5 rounded-lg border border-brand-green text-brand-green font-medium hover:bg-[var(--bms-green-light)] transition-colors">
        + Add Unit
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-soft border border-brand-line py-1 min-w-[160px] z-10">
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

function CertificatePdfUploader({ value, name, onChange }: {
  value: string; name: string;
  onChange: (base64: string, mime: string, filename: string) => void;
}) {
  const [error, setError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.type !== "application/pdf") { setError("Only PDF files are allowed."); e.target.value = ""; return; }
    if (file.size > 4 * 1024 * 1024) { setError("File must be under 4 MB."); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, data] = dataUrl.split(",");
      const mime = header.match(/data:(.*?);/)?.[1] || "application/pdf";
      onChange(data, mime, file.name);
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        {name && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span className="text-sm text-red-700">{name}</span>
          </div>
        )}
        <label className="bms-admin-btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {name ? "Replace PDF" : "Upload PDF"}
          <input type="file" accept=".pdf" onChange={handleFile} className="hidden" />
        </label>
        {name && (
          <button type="button" onClick={() => onChange("", "", "")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            Remove
          </button>
        )}
      </div>
      <p className="bms-admin-help">PDF only, max 4 MB</p>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {!value && !name && <p className="text-xs text-orange-500 mt-1">A PDF template is required.</p>}
    </div>
  );
}

function AddPicker({ onProg, onCred, onCert }: { onProg: () => void; onCred: () => void; onCert: () => void }) {
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
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="bms-admin-btn">
        <Plus aria-hidden="true" size={18} strokeWidth={2.5} /> Add
      </button>
      {open && (
        <div className="bms-admin-menu">
          <button type="button" onClick={() => { onProg(); setOpen(false); }}>Micro-programme</button>
          <button type="button" onClick={() => { onCred(); setOpen(false); }}>Micro-credential</button>
          <button type="button" onClick={() => { onCert(); setOpen(false); }}>Certificate</button>
        </div>
      )}
    </div>
  );
}

/* ─── List rows — laid out like the catalogue / "My Micro-credentials" cards ─── */

function RowActions({ children }: { children: React.ReactNode }) {
  // Clicking the card opens it; the buttons inside must not trigger that too.
  return <div className="bms-admin-item-actions" onClick={e => e.stopPropagation()}>{children}</div>;
}

function RowThumb({ src, label }: { src: string; label: string }) {
  return <span className="bms-admin-item-thumb">{src ? <img src={src} alt="" /> : <span>{label}</span>}</span>;
}

/** Without onDelete (programme admins) there's no Delete button. */
function ProgrammeRow({ programme: p, imageVersion, onEdit, onDelete }: { programme: MicroProgramme; imageVersion: number; onEdit: () => void; onDelete?: () => void }) {
  const creds = p.credentials || [];
  return (
    <li className="bms-admin-item" onClick={onEdit}>
      <RowThumb src={p.hasImage ? `/api/images/programme/${p.id}?v=${imageVersion}` : p.image || ""} label={p.code} />
      <div className="bms-admin-item-body">
        <p className="bms-admin-item-meta">{p.code} | {p.project}</p>
        <h3 className="bms-admin-item-title">{p.title}</h3>
        <div className="bms-admin-chips">
          {creds.length > 0 ? creds.map(c => <span key={c.id} className="bms-admin-chip">{c.code}</span>) : <span className="bms-admin-chip is-empty">No credentials</span>}
        </div>
      </div>
      <RowActions>
        <button type="button" onClick={onEdit} className="bms-admin-link">Edit</button>
        {onDelete && <button type="button" onClick={onDelete} className="bms-admin-link is-danger">Delete</button>}
      </RowActions>
    </li>
  );
}

function CredentialRow({ credential: c, programmeCodes, imageVersion, onEdit, onDelete, onExport, exporting }: { credential: MicroCredential; programmeCodes: string[]; imageVersion: number; onEdit: () => void; onDelete?: () => void; onExport?: () => void; exporting?: boolean }) {
  const sections = c.sectionsCount ?? (c.sections || []).length;
  return (
    <li className="bms-admin-item" onClick={onEdit}>
      <RowThumb src={c.hasImage ? `/api/images/credential/${c.id}?v=${imageVersion}` : c.image || ""} label={c.code} />
      <div className="bms-admin-item-body">
        {c.organisation && <p className="bms-admin-item-meta">{c.organisation}</p>}
        <p className="bms-admin-item-meta">{c.code} | {c.project} · {sections} section{sections === 1 ? "" : "s"}{c.topic ? ` · ${c.topic}` : ""}</p>
        <h3 className="bms-admin-item-title">{c.title}</h3>
        <div className="bms-admin-chips">
          {programmeCodes.length > 0 ? programmeCodes.map(code => <span key={code} className="bms-admin-chip">{code}</span>) : <span className="bms-admin-chip is-empty">Not in any programme</span>}
        </div>
      </div>
      <RowActions>
        <button type="button" onClick={onEdit} className="bms-admin-link">Edit</button>
        {onExport && <button type="button" onClick={onExport} disabled={exporting} className="bms-admin-link">{exporting ? "Exporting…" : "Export"}</button>}
        {onDelete && <button type="button" onClick={onDelete} className="bms-admin-link is-danger">Delete</button>}
      </RowActions>
    </li>
  );
}

/** What an export left out, shown after the download starts. */
function ExportNotice({ notice, onClose }: { notice: { title: string; warnings: string[] }; onClose: () => void }) {
  return (
    <div className="bms-admin-note" role="status">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{notice.title}</p>
          {notice.warnings.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {notice.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="shrink-0"><X aria-hidden="true" size={18} /></button>
      </div>
    </div>
  );
}

function CertificateRow({ certificate: cert, onEdit, onDelete }: { certificate: Certificate; onEdit: () => void; onDelete: () => void }) {
  return (
    <li className="bms-admin-item is-compact" onClick={onEdit}>
      <span className="bms-admin-item-thumb is-icon"><Award aria-hidden="true" size={28} /></span>
      <div className="bms-admin-item-body">
        <p className="bms-admin-item-meta">Certificate template · {cert.pdfName}</p>
        <h3 className="bms-admin-item-title">{cert.project}</h3>
      </div>
      <RowActions>
        <a href={`/api/certificates/${cert.id}/pdf`} target="_blank" rel="noopener noreferrer" className="bms-admin-link">Preview</a>
        <button type="button" onClick={onEdit} className="bms-admin-link">Edit</button>
        <button type="button" onClick={onDelete} className="bms-admin-link is-danger">Delete</button>
      </RowActions>
    </li>
  );
}

function VideoUnitPreview({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1] || "";

  // Reset to the thumbnail if the URL is edited to point at a different video.
  useEffect(() => { setPlaying(false); }, [videoId]);

  if (!videoId) return null;

  return (
    <div className="mt-2 aspect-video max-w-xs rounded-lg overflow-hidden bg-black relative">
      {playing ? (
        <iframe
          className="w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="w-full h-full relative block group"
          aria-label="Play video preview"
        >
          <img src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} alt="" className="w-full h-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/45 transition-colors">
            <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#111"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

function PdfPreview({ unit }: { unit: CredentialUnit }) {
  const [open, setOpen] = useState(false);

  const src = useMemo(() => {
    if (unit.fileBase64 && unit.fileMime === "application/pdf") {
      return `data:application/pdf;base64,${unit.fileBase64}`;
    }
    if (unit.hasFile && unit.id) {
      return `/api/units/${unit.id}/file`;
    }
    return null;
  }, [unit.fileBase64, unit.fileMime, unit.hasFile, unit.id]);

  const isPdf =
    unit.fileMime === "application/pdf" ||
    (unit.fileName || "").toLowerCase().endsWith(".pdf");

  if (!src || !isPdf) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-xs text-brand-green font-medium hover:underline"
        >
          {open ? "Hide preview" : "Show PDF preview"}
        </button>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-muted hover:underline"
        >
          Open in new tab ↗
        </a>
      </div>
      {open && (
        <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <iframe
            src={src}
            className="w-full"
            style={{ height: "600px" }}
            title={unit.fileName || "PDF preview"}
          />
        </div>
      )}
    </div>
  );
}

type Tab = "programmes" | "credentials" | "certificates";

type View = "list" | "new-prog" | "edit-prog" | "new-cred" | "edit-cred" | "new-cert" | "edit-cert" | "import";

function imageUrlFor(type: "programme" | "credential", id: string, version: number, fallback: string | null) {
  if (version === 0) return fallback || "";
  return `/api/images/${type}/${id}?v=${version}`;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("programmes");
  const [view, setView] = useState<View>("list");
  const [programmes, setProgrammes] = useState<MicroProgramme[]>([]);
  const [credentials, setCredentials] = useState<MicroCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState("");
  // Set when a site admin takes away access this page was opened with (see recheckAccess).
  const [accessNotice, setAccessNotice] = useState("");
  const [accessRemoved, setAccessRemoved] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<{ title: string; warnings: string[] } | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [editingProg, setEditingProg] = useState<MicroProgramme | null>(null);
  const [editingCred, setEditingCred] = useState<MicroCredential | null>(null);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [parentProgId, setParentProgId] = useState<string | null>(null);
  const [certForm, setCertForm] = useState<CertForm>({ project: "", pdfBase64: "", pdfMime: "", pdfName: "", introText: defaultIntroText(""), closingText: "", ...DEFAULT_CONTENT_BOX });

  const [returnTab, setReturnTab] = useState<Tab>("programmes");
  const [imageVersion, setImageVersion] = useState(1);

  const [credPickerOpen, setCredPickerOpen] = useState(false);
  const [credPickerSearch, setCredPickerSearch] = useState("");
  const [addCredDropOpen, setAddCredDropOpen] = useState(false);
  const addCredDropRef = useRef<HTMLDivElement>(null);
  const [uploadingUnitKey, setUploadingUnitKey] = useState<string | null>(null);
  const [unitUploadPct, setUnitUploadPct] = useState<number | null>(null);
  const [unitUploadError, setUnitUploadError] = useState("");

  const [confirmDialog, setConfirmDialog] = useState<{ message: string; confirmLabel: string; resolve: (ok: boolean) => void } | null>(null);

  /** Site-styled replacement for window.confirm(). Resolves true/false. */
  function askConfirm(message: string, confirmLabel = "Delete"): Promise<boolean> {
    return new Promise((resolve) => setConfirmDialog({ message, confirmLabel, resolve }));
  }

  useEffect(() => {
    if (!confirmDialog) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { confirmDialog!.resolve(false); setConfirmDialog(null); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmDialog]);

  const [progForm, setProgForm] = useState({ title: "", slug: "", code: "", project: "", image: "" });
  const [credForm, setCredForm] = useState({ title: "", slug: "", code: "", project: "", description: "", overview: "", objectives: "", image: "", developedBy: "", organisation: "", topic: "", passGrade: "50" });
  const [sections, setSections] = useState<CredentialSection[]>([]);
  // The micro-credential as the editor last loaded or saved it, to tell whether it has unsaved changes.
  const [savedCredSnapshot, setSavedCredSnapshot] = useState("");
  const credSnapshot = useMemo(() => JSON.stringify({ credForm, sections }), [credForm, sections]);
  const credDirty = view === "edit-cred" && credSnapshot !== savedCredSnapshot;

  /* ─── Browser back-button → return to list view ──────────
     We push a history entry when entering an edit view, then listen
     for popstate (browser back). If the user backs out of an edit
     view, we intercept it and return to the list instead of leaving
     the page. Skipping this would dump the user on /dashboard. */
  const isHandlingPopRef = useRef(false);

  useEffect(() => {
    function onPop() {
      // The browser already went back one entry by the time we get here.
      // If we're in any edit view, treat back as "return to list".
      if (view !== "list") {
        isHandlingPopRef.current = true;
        // Push a fresh state so the user can press back again.
        window.history.pushState({ adminView: "list" }, "", window.location.href);
        setView("list");
        setEditingProg(null);
        setEditingCred(null);
        setEditingCert(null);
        setParentProgId(null);
        setFormError("");
        setTab(returnTab);
      }
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [view, returnTab]);

  // Push a new history entry whenever we enter an edit view (not when leaving).
  function pushAdminHistory(nextView: View) {
    setAccessNotice("");
    setExportNotice(null);
    if (nextView !== "list" && view === "list" && typeof window !== "undefined") {
      window.history.pushState({ adminView: nextView }, "", window.location.href);
    }
  }

  useEffect(() => {
    if (!addCredDropOpen) return;
    function handleClick(e: MouseEvent) {
      if (addCredDropRef.current && !addCredDropRef.current.contains(e.target as Node)) setAddCredDropOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [addCredDropOpen]);

  /* ─── Auth & data loading ────────────────────────────── */

  useEffect(() => {
    // Site admins, and programme admins (learners in charge of some programmes, who see only those).
    fetch("/api/auth/session?access=1").then(r => r.json())
      .then(d => { if (d?.user && (d.user.role === "ADMIN" || d.user.managedProgrammeIds?.length > 0)) setUser(d.user); else router.push("/"); })
      .catch(() => router.push("/"));
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [pR, cR, certR] = await Promise.all([
      fetch("/api/micro-programmes").then(r => r.ok ? r.json() : { programmes: [] }),
      fetch("/api/micro-credentials").then(r => r.ok ? r.json() : { credentials: [] }),
      fetch("/api/certificates").then(r => r.ok ? r.json() : { certificates: [] }),
    ]);
    setProgrammes(pR.programmes || []);
    setCredentials(cR.credentials || []);
    setCertificates(certR.certificates || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  // A site admin can take away a programme admin's access while this page is
  // open. The server refuses their saves from then on; check again when they
  // come back to the tab and whenever a save is refused, so the page stops
  // offering what they can no longer do.
  const userRef = useRef<any>(null);
  useEffect(() => { userRef.current = user; }, [user]);
  const recheckAccess = useCallback(async () => {
    const prev = userRef.current;
    if (!prev) return;
    try {
      const d = await fetch("/api/auth/session?access=1").then(r => r.json());
      const u = d?.user;
      if (!u) { router.push("/"); return; }
      // Signed in as someone else in another tab: start again as that account.
      if (u.userId !== prev.userId) { window.location.reload(); return; }
      if (u.role !== "ADMIN" && !(u.managedProgrammeIds?.length > 0)) { setAccessRemoved(true); return; }
      const ids = (x: any) => JSON.stringify([...(x.managedProgrammeIds || [])].sort());
      if (u.role !== prev.role || ids(u) !== ids(prev)) setUser(u);
    } catch { /* offline: checked again next time */ }
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const onVisible = () => { if (document.visibilityState === "visible") recheckAccess(); };
    window.addEventListener("focus", recheckAccess);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", recheckAccess);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, recheckAccess]);

  const allProjects = Array.from(new Set([...programmes.map(p => p.project), ...credentials.map(c => c.project)].filter(Boolean))).sort();
  const allOrganisations = Array.from(new Set([...Object.values(ORGANISATIONS), ...credentials.map(c => c.organisation)].filter((v): v is string => Boolean(v)))).sort();
  const allTopics = Array.from(new Set(credentials.map(c => c.topic).filter((v): v is string => Boolean(v)))).sort();

  // A programme admin sees only their programmes and the micro-credentials in
  // them. `programmes` and `credentials` keep everything, so a micro-credential
  // shared with another programme still shows as Shared.
  const isSiteAdmin = user?.role === "ADMIN";
  const myProgrammes = useMemo(() => {
    if (isSiteAdmin) return programmes;
    const managed = new Set<string>(user?.managedProgrammeIds || []);
    return programmes.filter(p => managed.has(p.id));
  }, [programmes, isSiteAdmin, user]);
  const myCredentials = useMemo(() => {
    if (isSiteAdmin) return credentials;
    const inMine = new Set(myProgrammes.flatMap(p => (p.credentials || []).map(c => c.id)));
    return credentials.filter(c => inMine.has(c.id));
  }, [credentials, myProgrammes, isSiteAdmin]);

  const filteredProgs = useMemo(() => {
    if (!adminSearch.trim()) return myProgrammes;
    const q = adminSearch.toLowerCase();
    return myProgrammes.filter(p => p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.project.toLowerCase().includes(q));
  }, [myProgrammes, adminSearch]);

  const filteredCreds = useMemo(() => {
    if (!adminSearch.trim()) return myCredentials;
    const q = adminSearch.toLowerCase();
    return myCredentials.filter(c => c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.project.toLowerCase().includes(q) || (c.organisation || "").toLowerCase().includes(q) || (c.developedBy || "").toLowerCase().includes(q));
  }, [myCredentials, adminSearch]);

  const filteredCerts = useMemo(() => {
    if (!isSiteAdmin) return [];
    if (!adminSearch.trim()) return certificates;
    const q = adminSearch.toLowerCase();
    return certificates.filter(c => c.project.toLowerCase().includes(q) || c.pdfName.toLowerCase().includes(q));
  }, [certificates, adminSearch, isSiteAdmin]);

  // When a programme admin loses a programme, close it if it's open here.
  useEffect(() => {
    if (!user || isSiteAdmin || view === "list") return;
    const managed = new Set<string>(user.managedProgrammeIds || []);
    const lost =
      (editingProg && !managed.has(editingProg.id)) ||
      (parentProgId && !managed.has(parentProgId)) ||
      (editingCred && !parentProgId && !myCredentials.some(c => c.id === editingCred.id));
    if (lost) {
      goList();
      setAccessNotice("A site admin removed you as admin of this programme, so it was closed. Your unsaved changes were not saved.");
    }
    // Only when the access changes, not on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const totalWeight = useMemo(() => {
    let total = 0;
    for (const s of sections) for (const ss of s.subsections) for (const u of ss.units) total += Number(u.weight) || 0;
    return total;
  }, [sections]);

  function goList() {
    // If we got here via the in-page back button, undo the history entry too.
    if (view !== "list" && !isHandlingPopRef.current && typeof window !== "undefined") {
      window.history.back();
      return; // popstate handler will reset state
    }
    isHandlingPopRef.current = false;
    setView("list");
    setEditingProg(null);
    setEditingCred(null);
    setEditingCert(null);
    setParentProgId(null);
    setFormError("");
    setCredPickerOpen(false);
    setAddCredDropOpen(false);
    setTab(returnTab);
  }

  /* ─── Import from Open edX (OLX .tar.gz) ─────────────────── */

  function openImport() {
    pushAdminHistory("import");
    setReturnTab("credentials"); setView("import");
  }

/** Uploads a file straight to S3 (bypassing our server's request-size limit) and returns its object key. */
  async function uploadToStorage(
    file: File,
    purpose: "olx-import" | "unit-file",
    onProgress?: (pct: number) => void
  ): Promise<string> {
    const presignRes = await fetch("/api/admin/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream", purpose }),
    });
    const presignData = await presignRes.json();
    if (!presignRes.ok) throw new Error(presignData.error || "Could not prepare the upload.");

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presignData.uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error("Upload to storage failed."));
      };
      xhr.onerror = () => reject(new Error("Upload to storage failed — check your connection."));
      xhr.send(file);
    });

    return presignData.key as string;
  }

  async function refreshProg(id: string) {
    await loadData();
    const r = await fetch(`/api/micro-programmes/${id}`);
    if (r.ok) {
      const { programme } = await r.json();
      setEditingProg(programme);
      setImageVersion(v => v + 1);
      const imgUrl = programme.hasImage ? imageUrlFor("programme", programme.id, imageVersion + 1, null) : programme.image || "";
      setProgForm({ title: programme.title, slug: programme.slug, code: programme.code, project: programme.project, image: imgUrl });
      // Already in an edit view, no new history push needed.
      setView("edit-prog");
    }
  }

  function progsUsingCred(credId: string) { return programmes.filter(p => (p.credentials || []).some(c => c.id === credId)).map(p => p.code); }

  function toSlug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  function newProg() {
    pushAdminHistory("new-prog");
    setProgForm({ title: "", slug: "", code: "", project: "", image: "" });
    setEditingProg(null); setFormError(""); setReturnTab("programmes"); setView("new-prog");
  }

  function editProg(p: MicroProgramme) {
    pushAdminHistory("edit-prog");
    const imgUrl = p.hasImage ? imageUrlFor("programme", p.id, imageVersion, null) : p.image || "";
    setProgForm({ title: p.title, slug: p.slug, code: p.code, project: p.project, image: imgUrl });
    setEditingProg(p); setFormError(""); setReturnTab("programmes");
    setCredPickerOpen(false); setAddCredDropOpen(false);
    setView("edit-prog");
  }

  async function saveProg(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (!progForm.title || !progForm.code) { setFormError("Title and code required."); return; }
    setFormLoading(true);
    try {
      const payload: any = { ...progForm, slug: progForm.slug || toSlug(progForm.title) };
      if (progForm.image && progForm.image.startsWith("data:")) {
        const [header, data] = progForm.image.split(",");
        payload.imageBase64 = data;
        payload.imageMime = header.match(/data:(.*?);/)?.[1] || "image/png";
        delete payload.image;
      } else if (!progForm.image) {
        payload.removeImage = true;
        delete payload.image;
      } else {
        delete payload.image;
      }
      const url = editingProg ? `/api/micro-programmes/${editingProg.id}` : "/api/micro-programmes";
      const r = await fetch(url, { method: editingProg ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json(); if (!r.ok) { setFormError(d.error || "Failed."); setFormLoading(false); if (r.status === 403) recheckAccess(); return; }
      if (!editingProg) { await refreshProg(d.programme.id); } else { await refreshProg(editingProg.id); }
    } catch { setFormError("Network error."); }
    setFormLoading(false);
  }

  async function delProg(id: string) { if (!(await askConfirm("Delete this programme?"))) return; await fetch(`/api/micro-programmes/${id}`, { method: "DELETE" }); await loadData(); goList(); }

  /** Saves the programme's list of credentials; on failure the server keeps the old list and the error is shown. */
  async function putProgCreds(progId: string, credentialIds: string[]) {
    setFormError("");
    try {
      const r = await fetch(`/api/micro-programmes/${progId}/credentials`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credentialIds }) });
      if (!r.ok) {
        setFormError((await r.json().catch(() => null))?.error || "Could not update the programme's credentials.");
        if (r.status === 403) recheckAccess();
      }
    } catch { setFormError("Network error."); }
    await refreshProg(progId);
  }

  async function addCredToProg(credId: string) {
    if (!editingProg) return;
    const ids = (editingProg.credentials || []).map(c => c.id);
    if (ids.includes(credId)) return;
    await putProgCreds(editingProg.id, [...ids, credId]);
  }

  async function removeCredFromProg(credId: string) {
    if (!editingProg || !(await askConfirm("Remove credential from programme?"))) return;
    const ids = (editingProg.credentials || []).filter(c => c.id !== credId).map(c => c.id);
    await putProgCreds(editingProg.id, ids);
  }

  function newCred(progId?: string) {
    pushAdminHistory("new-cred");
    setCredForm({ title: "", slug: "", code: "", project: "", description: "", overview: "", objectives: "", image: "", developedBy: "", organisation: "", topic: "", passGrade: "50" });
    setSections([]); setEditingCred(null); setParentProgId(progId || null); setFormError("");
    if (!progId) setReturnTab("credentials");
    setView("new-cred");
  }

  /**
   * List views only carry a section count, not full content, to stay fast —
   * so opening a credential always re-fetches the single, fully-detailed
   * record rather than trusting whatever partial object was clicked.
   */
  async function fetchFullCredential(id: string): Promise<MicroCredential | null> {
    try {
      const r = await fetch(`/api/micro-credentials/${id}`);
      if (!r.ok) return null;
      const d = await r.json();
      return d.credential as MicroCredential;
    } catch {
      return null;
    }
  }

  /** Puts a micro-credential, as the server has it, into the editor. */
  function loadCredIntoEditor(full: MicroCredential, version: number) {
    const imgUrl = full.hasImage ? imageUrlFor("credential", full.id, version, null) : full.image || "";
    const form = { title: full.title, slug: full.slug, code: full.code, project: full.project, description: full.description || "", overview: full.overview || "", objectives: full.objectives || "", image: imgUrl, developedBy: full.developedBy || "", organisation: full.organisation || "", topic: full.topic || "", passGrade: String(full.passGrade) };
    const secs = full.sections || [];
    setCredForm(form); setSections(secs); setEditingCred(full);
    setSavedCredSnapshot(JSON.stringify({ credForm: form, sections: secs }));
  }

  async function editCred(c: MicroCredential, progId?: string) {
    const full = await fetchFullCredential(c.id);
    if (!full) { alert("Could not load this credential. Please try again."); return; }
    pushAdminHistory("edit-cred");
    loadCredIntoEditor(full, imageVersion);
    setParentProgId(progId || null); setFormError("");
    if (!progId) setReturnTab("credentials");
    setView("edit-cred");
  }

  async function saveCred(e: React.FormEvent) {
    e.preventDefault();
    if (!(await persistCred())) return;
    if (parentProgId) { await refreshProg(parentProgId); }
    else { await loadData(); goList(); }
  }

  /** Saves the micro-credential in the editor. Returns its id, or null with the error shown next to the buttons. */
  async function persistCred(): Promise<string | null> {
    setFormError("");
    if (!credForm.title || !credForm.code) { setFormError("Title and code required."); return null; }
    if (exceedsFullWeight(totalWeight)) { setFormError(`Total unit weight is ${formatWeight(totalWeight)}%. It must not exceed 100%.`); return null; }
    const answerErr = missingAnswerError(sections);
    if (answerErr) { setFormError(answerErr); return null; }
    setFormLoading(true);
    try {
      const url = editingCred ? `/api/micro-credentials/${editingCred.id}` : "/api/micro-credentials";
      const method = editingCred ? "PATCH" : "POST";
      const payload: any = { ...credForm, slug: credForm.slug || toSlug(credForm.title), passGrade: parseInt(credForm.passGrade) || 50, sections };
      // A new credential made from a programme is put in it by the same request (programme admins may only create it that way).
      if (!editingCred && parentProgId) payload.programmeId = parentProgId;
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
      const d = await r.json();
      if (!r.ok) { setFormError(d.error || "Failed."); if (r.status === 403) recheckAccess(); return null; }
      setImageVersion(v => v + 1);
      return d.credential?.id ?? editingCred?.id ?? null;
    } catch { setFormError("Network error."); return null; }
    finally { setFormLoading(false); }
  }

  /** The editor's Export: unsaved changes are saved first, so the file has them. */
  async function saveAndExport() {
    if (!editingCred) return;
    const cred = { id: editingCred.id, title: credForm.title || editingCred.title };
    if (credDirty) {
      if (!(await persistCred())) return;
      // Reload what was saved: new sections, units and questions have ids now,
      // which a later Update needs so it doesn't add them a second time.
      const full = await fetchFullCredential(cred.id);
      if (full) { loadCredIntoEditor(full, imageVersion + 1); loadData(); }
      else if (parentProgId) await refreshProg(parentProgId);
      else { await loadData(); goList(); }
    }
    await exportCred(cred);
  }

  async function delCred(id: string) {
    if (!(await askConfirm("Delete credential permanently from all programmes?"))) return;
    await fetch(`/api/micro-credentials/${id}`, { method: "DELETE" }); await loadData();
    if (editingProg) await refreshProg(editingProg.id); else goList();
  }

  /**
   * Downloads the micro-credential as an Open edX course file. The server
   * stores it in S3 and answers with a link; a hidden frame downloads it, so
   * the page (and any unsaved changes) stays as it is even if the link fails.
   */
  async function exportCred(c: { id: string; title: string }) {
    if (exportingId) return;
    setExportingId(c.id);
    setExportNotice(null);
    try {
      const r = await fetch(`/api/micro-credentials/${c.id}/export`, { method: "POST" });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        setExportNotice({ title: d?.error || "Could not export this micro-credential.", warnings: [] });
        return;
      }
      let fileName = "micro-credential.tar.gz";
      let warnings: string[] = [];
      if ((r.headers.get("content-type") || "").includes("application/json")) {
        const d = await r.json();
        fileName = d.fileName || fileName;
        warnings = d.warnings || [];
        const frame = document.createElement("iframe");
        frame.hidden = true;
        frame.src = d.url;
        document.body.appendChild(frame);
        setTimeout(() => frame.remove(), 60_000);
      } else {
        // Without S3 (local development) the file is the response itself.
        fileName = r.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] || fileName;
        try { warnings = JSON.parse(decodeURIComponent(r.headers.get("x-export-warnings") || "%5B%5D")); } catch { /* none */ }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(await r.blob());
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
      }
      setExportNotice({
        title: warnings.length
          ? `“${c.title}” is downloading as ${fileName}. Some parts won't come back when it's imported:`
          : `“${c.title}” is downloading as ${fileName}. Import it with “Import courses”, here or on another site.`,
        warnings,
      });
    } catch {
      setExportNotice({ title: "Network error: the micro-credential wasn't exported.", warnings: [] });
    } finally {
      setExportingId(null);
    }
  }

  function newCert() {
    pushAdminHistory("new-cert");
    setCertForm({ project: "", pdfBase64: "", pdfMime: "", pdfName: "", introText: defaultIntroText(""), closingText: "", ...DEFAULT_CONTENT_BOX });
    setEditingCert(null); setFormError(""); setReturnTab("certificates"); setView("new-cert");
  }

  function editCert(c: Certificate) {
    pushAdminHistory("edit-cert");
    setCertForm({ project: c.project, pdfBase64: "", pdfMime: "", pdfName: c.pdfName, introText: c.introText, closingText: c.closingText, contentTop: c.contentTop, contentBottom: c.contentBottom, contentWidth: c.contentWidth });
    setEditingCert(c); setFormError(""); setReturnTab("certificates"); setView("edit-cert");
  }

  async function saveCertificate(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (!certForm.project) { setFormError("Project is required."); return; }
    if (!certForm.pdfBase64 && !editingCert) { setFormError("A PDF template is required."); return; }
    setFormLoading(true);
    try {
      const payload: any = {
        project: certForm.project,
        introText: certForm.introText,
        closingText: certForm.closingText,
        contentTop: certForm.contentTop,
        contentBottom: certForm.contentBottom,
        contentWidth: certForm.contentWidth,
      };
      if (certForm.pdfBase64) {
        payload.pdfBase64 = certForm.pdfBase64;
        payload.pdfMime = certForm.pdfMime;
        payload.pdfName = certForm.pdfName;
      }
      const url = editingCert ? `/api/certificates/${editingCert.id}` : "/api/certificates";
      const method = editingCert ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) { setFormError(d.error || "Failed."); setFormLoading(false); return; }
      await loadData();
      goList();
    } catch { setFormError("Network error."); }
    setFormLoading(false);
  }

  async function delCert(id: string) {
    if (!(await askConfirm("Delete this certificate template?"))) return;
    await fetch(`/api/certificates/${id}`, { method: "DELETE" });
    await loadData(); goList();
  }

  function addSection() { setSections([...sections, { title: "", order: sections.length, subsections: [] }]); }
  /*
   * Removing a part that was saved before deletes, on the next save, the
   * learners' completions and answers for it (src/lib/credential-sync.ts), so
   * ask first. Parts added since the course was opened have no learner data.
   * The updates are functional (the dialog is awaited) and immutable (React
   * may run an updater twice).
   */
  const savedUnitCount = (units: CredentialUnit[]) => units.filter(u => u.id).length;
  const unitsLabel = (n: number) => `${n} saved unit${n === 1 ? "" : "s"}`;

  async function removeSection(i: number) {
    const sec = sections[i];
    const n = savedUnitCount(sec.subsections.flatMap(ss => ss.units));
    if (n > 0 && !(await askConfirm(`Remove the section “${sec.title || "Untitled"}” and its ${unitsLabel(n)}? When you save, learners’ progress on them will be deleted.`, "Remove"))) return;
    setSections(prev => prev.filter((_, x) => x !== i));
  }
  function updateSection(i: number, title: string) { const s = [...sections]; s[i] = { ...s[i], title }; setSections(s); }

  function addSubsection(si: number) {
    const s = [...sections]; s[si] = { ...s[si], subsections: [...s[si].subsections, { title: "", order: s[si].subsections.length, units: [] }] }; setSections(s);
  }
  async function removeSubsection(si: number, ssi: number) {
    const sub = sections[si].subsections[ssi];
    const n = savedUnitCount(sub.units);
    if (n > 0 && !(await askConfirm(`Remove the subsection “${sub.title || "Untitled"}” and its ${unitsLabel(n)}? When you save, learners’ progress on them will be deleted.`, "Remove"))) return;
    setSections(prev => prev.map((sec, x) => x !== si ? sec : { ...sec, subsections: sec.subsections.filter((_, y) => y !== ssi) }));
  }
  function updateSubsection(si: number, ssi: number, title: string) {
    const s = [...sections]; s[si].subsections[ssi] = { ...s[si].subsections[ssi], title }; setSections(s);
  }

  function addUnit(si: number, ssi: number, type: "VIDEO" | "QUIZ" | "PRESENTATION") {
    const s = [...sections]; const units = s[si].subsections[ssi].units;
    s[si].subsections[ssi] = { ...s[si].subsections[ssi], units: [...units, { title: "", type, order: units.length, weight: 0, videoUrl: "", fileBase64: "", fileMime: "", fileName: "", questions: [] }] }; setSections(s);
  }
  async function removeUnit(si: number, ssi: number, ui: number) {
    const unit = sections[si].subsections[ssi].units[ui];
    const what = unit.type === "QUIZ" ? "completions and answers" : "completions";
    if (unit.id && !(await askConfirm(`Remove the unit “${unit.title || "Untitled"}”? When you save, learners’ ${what} for it will be deleted.`, "Remove"))) return;
    setSections(prev => prev.map((sec, x) => x !== si ? sec : {
      ...sec,
      subsections: sec.subsections.map((sub, y) => y !== ssi ? sub : { ...sub, units: sub.units.filter((_, z) => z !== ui) }),
    }));
  }
  function updateUnit(si: number, ssi: number, ui: number, field: string, value: any) {
    const s = [...sections]; (s[si].subsections[ssi].units[ui] as any)[field] = value; setSections(s);
  }

  function addUnitQ(si: number, ssi: number, ui: number) {
    const s = [...sections]; const qs = s[si].subsections[ssi].units[ui].questions || [];
    s[si].subsections[ssi].units[ui].questions = [...qs, { question: "", options: ["", ""], correctIndex: 0 }]; setSections(s);
  }
  async function removeUnitQ(si: number, ssi: number, ui: number, qi: number) {
    const question = (sections[si].subsections[ssi].units[ui].questions || [])[qi];
    if (question?.id && !(await askConfirm(`Remove question ${qi + 1}? When you save, learners’ answers to it will be deleted.`, "Remove"))) return;
    setSections(prev => prev.map((sec, x) => x !== si ? sec : {
      ...sec,
      subsections: sec.subsections.map((sub, y) => y !== ssi ? sub : {
        ...sub,
        units: sub.units.map((u, z) => z !== ui ? u : { ...u, questions: (u.questions || []).filter((_, w) => w !== qi) }),
      }),
    }));
  }
  function updateUnitQ(si: number, ssi: number, ui: number, qi: number, field: string, value: any) {
    const s = [...sections]; const qs = [...(s[si].subsections[ssi].units[ui].questions || [])]; (qs[qi] as any)[field] = value; s[si].subsections[ssi].units[ui].questions = qs; setSections(s);
  }
  function addUnitQOpt(si: number, ssi: number, ui: number, qi: number) {
    const s = [...sections]; const qs = [...(s[si].subsections[ssi].units[ui].questions || [])]; qs[qi].options = [...qs[qi].options, ""]; s[si].subsections[ssi].units[ui].questions = qs; setSections(s);
  }
  function removeUnitQOpt(si: number, ssi: number, ui: number, qi: number, oi: number) {
    // The right answer stays on the same option: the options after the removed
    // one move up a place, so it does too. If the right answer itself is
    // removed, none is chosen (-1): the question asks for one and the course
    // can't be saved until the admin picks it.
    setSections(prev => prev.map((sec, x) => x !== si ? sec : {
      ...sec,
      subsections: sec.subsections.map((sub, y) => y !== ssi ? sub : {
        ...sub,
        units: sub.units.map((u, z) => z !== ui ? u : {
          ...u,
          questions: (u.questions || []).map((q, w) => {
            if (w !== qi) return q;
            const correctIndex = q.correctIndex > oi ? q.correctIndex - 1 : q.correctIndex === oi ? -1 : q.correctIndex;
            return { ...q, options: q.options.filter((_, v) => v !== oi), correctIndex };
          }),
        }),
      }),
    }));
  }
  function updateUnitQOpt(si: number, ssi: number, ui: number, qi: number, oi: number, val: string) {
    const s = [...sections]; const qs = [...(s[si].subsections[ssi].units[ui].questions || [])]; qs[qi].options[oi] = val; s[si].subsections[ssi].units[ui].questions = qs; setSections(s);
  }

  function renderProgForm() {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="bms-admin-label">Title *</label><input className="auth-input" value={progForm.title} onChange={e => setProgForm({ ...progForm, title: e.target.value })} required /></div>
        <div><label className="bms-admin-label">Code *</label><input className="auth-input" value={progForm.code} onChange={e => setProgForm({ ...progForm, code: e.target.value })} required placeholder="e.g. MP1" /></div>
        <div className="md:col-span-2"><label className="bms-admin-label">Project</label><input className="auth-input" list="project-options" value={progForm.project} onChange={e => setProgForm({ ...progForm, project: e.target.value })} placeholder="Select or type a project name" /><datalist id="project-options">{allProjects.map(p => <option key={p} value={p} />)}</datalist></div>
        <div className="md:col-span-2"><label className="bms-admin-label">Image</label><ImageUploader value={progForm.image} onChange={url => setProgForm({ ...progForm, image: url })} /></div>
      </div>
    );
  }

  function renderSectionEditor() {
    const overWeight = exceedsFullWeight(totalWeight);
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="bms-admin-section-title">Sections</h3>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${overWeight ? "bg-red-100 text-red-700" : isFullWeight(totalWeight) ? "bg-green-100 text-green-700" : "bg-gray-100 text-brand-muted"}`}>
              Total weight: {formatWeight(totalWeight)}%
            </span>
            <button type="button" onClick={addSection} className="text-sm text-brand-green font-medium hover:underline">+ Add Section</button>
          </div>
        </div>
        {overWeight && (
          <p className="text-xs text-red-600 mb-3">Total weight exceeds 100%. Adjust individual unit weights before saving.</p>
        )}
        {unitUploadError && (
          <p className="text-xs text-red-600 mb-3">{unitUploadError}</p>
        )}

        {sections.length === 0 && <p className="text-brand-muted text-sm py-4 text-center rounded-2xl border border-dashed border-brand-line">No sections yet.</p>}

        {sections.map((sec, si) => (
          <div key={si} className="mb-4 border border-gray-200 rounded-xl p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-brand-green min-w-[2rem]">{si + 1}</span>
              <input className="auth-input flex-1" placeholder="Section title" value={sec.title} onChange={e => updateSection(si, e.target.value)} />
              <button type="button" onClick={() => removeSection(si)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
            </div>

            <div className="ml-6">
              {sec.subsections.map((sub, ssi) => (
                <div key={ssi} className="mb-3 border border-gray-200 rounded-lg p-3 bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-[var(--bms-dark)] min-w-[2.5rem]">{si + 1}.{ssi + 1}</span>
                    <input className="auth-input flex-1 text-sm" placeholder="Subsection title" value={sub.title} onChange={e => updateSubsection(si, ssi, e.target.value)} />
                    {(() => {
                      const subWeight = sub.units.reduce((n, u) => n + (Number(u.weight) || 0), 0);
                      return subWeight > 0 ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-brand-muted whitespace-nowrap" title="Sum of this subsection's unit weights">
                          {formatWeight(subWeight)}%
                        </span>
                      ) : null;
                    })()}
                    <button type="button" onClick={() => removeSubsection(si, ssi)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>

                  <div className="ml-8 space-y-2">
                    {sub.units.map((unit, ui) => (
                      <div key={ui} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-brand-muted min-w-[3rem]">{si + 1}.{ssi + 1}.{ui + 1}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${unit.type === "VIDEO" ? "bg-blue-100 text-blue-700" : unit.type === "PRESENTATION" ? "bg-purple-100 text-purple-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {unit.type}
                          </span>
                          <input className="auth-input flex-1 text-sm" placeholder="Unit title" value={unit.title} onChange={e => updateUnit(si, ssi, ui, "title", e.target.value)} />
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              className="auth-input text-sm"
                              style={{ width: "70px", textAlign: "right" }}
                              placeholder="0"
                              value={typeof unit.weight === "number" ? formatWeight(unit.weight) : unit.weight ?? 0}
                              onFocus={e => e.target.select()}
                              onChange={e => {
                                // Whole numbers or up to 4 decimals; kept as typed so "5." can be finished.
                                const v = e.target.value.replace(",", ".");
                                if (!/^\d{0,3}(\.\d{0,4})?$/.test(v)) return;
                                updateUnit(si, ssi, ui, "weight", v === "" ? 0 : Number(v) > 100 ? 100 : v);
                              }}
                              onKeyDown={e => e.key === "Enter" && e.preventDefault()}
                              title="Weight (% of total grade)"
                            />
                            <span className="text-xs text-brand-muted">%</span>
                          </div>
                          <button type="button" onClick={() => removeUnit(si, ssi, ui)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        </div>

                        {unit.type === "VIDEO" && (
                          <div className="ml-12">
                            <input className="auth-input text-sm" placeholder="YouTube URL" value={unit.videoUrl || ""} onChange={e => updateUnit(si, ssi, ui, "videoUrl", e.target.value)} />
                            {unit.videoUrl && unit.videoUrl.includes("youtu") && <VideoUnitPreview url={unit.videoUrl} />}
                          </div>
                        )}

                        {unit.type === "PRESENTATION" && (
                          <div className="ml-12">
                            {(unit.fileName || unit.hasFile) ? (
                              <>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                    <span className="text-sm text-purple-700">{unit.fileName || "presentation"}</span>
                                  </div>
                                  <button type="button" onClick={() => {
                                    updateUnit(si, ssi, ui, "fileBase64", "");
                                    updateUnit(si, ssi, ui, "fileKey", "");
                                    updateUnit(si, ssi, ui, "fileMime", "");
                                    updateUnit(si, ssi, ui, "fileName", "");
                                    updateUnit(si, ssi, ui, "hasFile", false);
                                    updateUnit(si, ssi, ui, "removeFile", true);
                                  }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                    Remove
                                  </button>
                                </div>
                                <PdfPreview unit={unit} />
                              </>
                            ) : (
                              <div>
                                {(() => {
                                  const unitKey = `${si}-${ssi}-${ui}`;
                                  const isUploading = uploadingUnitKey === unitKey;
                                  return (
                                    <>
                                      <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium cursor-pointer transition-colors bg-white text-brand-dark hover:border-gray-400 ${isUploading ? "opacity-60 pointer-events-none" : ""}`}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                        {isUploading ? `Uploading… ${unitUploadPct ?? 0}%` : "Upload presentation"}
                                        <input type="file" accept=".pptx,.ppt,.pdf,.xlsx,.xls" className="hidden" disabled={isUploading} onChange={async e => {
                                          const file = e.target.files?.[0];
                                          e.target.value = "";
                                          if (!file) return;
                                          if (file.size > 1024 * 1024 * 1024) { setUnitUploadError("File must be under 1 GB."); return; }
                                          setUnitUploadError("");
                                          setUploadingUnitKey(unitKey);
                                          setUnitUploadPct(0);
                                          try {
                                            const mime = file.type || "application/octet-stream";
                                            const key = await uploadToStorage(file, "unit-file", setUnitUploadPct);
                                            updateUnit(si, ssi, ui, "fileBase64", "");
                                            updateUnit(si, ssi, ui, "fileKey", key);
                                            updateUnit(si, ssi, ui, "fileMime", mime);
                                            updateUnit(si, ssi, ui, "fileName", file.name);
                                            updateUnit(si, ssi, ui, "removeFile", false);
                                          } catch (err: any) {
                                            setUnitUploadError(err?.message || "Upload failed.");
                                          }
                                          setUploadingUnitKey(null);
                                          setUnitUploadPct(null);
                                        }} />
                                      </label>
                                      {isUploading && (
                                        <div className="mt-2 h-1.5 w-full max-w-xs rounded-full bg-gray-200 overflow-hidden">
                                          <div className="h-full rounded-full transition-all" style={{ width: `${unitUploadPct ?? 0}%`, background: "var(--bms-green)" }} />
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                                <p className="bms-admin-help">PPTX, PPT, PDF, XLSX or XLS, max 1 GB. PDFs preview inline.</p>
                              </div>
                            )}
                          </div>
                        )}

                        {unit.type === "QUIZ" && (
                          <div className="ml-12 mt-2">
                            {(unit.questions || []).map((q, qi) => (
                              <div key={qi} className="mb-3 p-3 border border-gray-200 rounded-lg bg-white">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-brand-muted">Q{qi + 1}</span>
                                  <button type="button" onClick={() => removeUnitQ(si, ssi, ui, qi)} className="text-xs text-red-500 hover:underline">Remove</button>
                                </div>
                                {/* Widths go on the wrappers: .auth-input's width: 100% overrides Tailwind width classes. */}
                                <div className="flex gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <label className="bms-admin-label">Heading (optional)</label>
                                    <input className="auth-input text-sm" placeholder={qi === 0 ? "Empty = the unit name" : "Shown above the question"} value={q.title ?? ""} onChange={e => updateUnitQ(si, ssi, ui, qi, "title", e.target.value || null)} />
                                  </div>
                                  <div className="w-48 shrink-0">
                                    <label className="bms-admin-label">Tries allowed</label>
                                    <input className="auth-input text-sm" type="number" min={1} placeholder="Unlimited" value={q.maxAttempts ?? ""} onChange={e => updateUnitQ(si, ssi, ui, qi, "maxAttempts", e.target.value ? Math.max(1, parseInt(e.target.value, 10) || 1) : null)} />
                                  </div>
                                </div>
                                <input className="auth-input text-sm mb-2" placeholder="Question" value={q.question} onChange={e => updateUnitQ(si, ssi, ui, qi, "question", e.target.value)} />
                                {q.options.map((opt, oi) => (
                                  <div key={oi} className="flex items-center gap-2 mb-1">
                                    <input type="radio" name={`u${si}-${ssi}-${ui}-${qi}`} checked={q.correctIndex === oi} onChange={() => updateUnitQ(si, ssi, ui, qi, "correctIndex", oi)} className="w-3.5 h-3.5 accent-[var(--bms-green)]" />
                                    <input className="auth-input flex-1 text-sm" placeholder={`Option ${oi + 1}`} value={opt} onChange={e => updateUnitQOpt(si, ssi, ui, qi, oi, e.target.value)} />
                                    {q.options.length > 2 && <button type="button" onClick={() => removeUnitQOpt(si, ssi, ui, qi, oi)} className="text-red-400 text-xs">✕</button>}
                                  </div>
                                ))}
                                {!hasValidAnswer(q) && <p className="text-xs font-medium text-red-600 mb-1">Choose the correct answer: tick the circle next to it.</p>}
                                {q.options.length < 6 && <button type="button" onClick={() => addUnitQOpt(si, ssi, ui, qi)} className="text-xs text-brand-green hover:underline">+ Option</button>}
                              </div>
                            ))}
                            <button type="button" onClick={() => addUnitQ(si, ssi, ui)} className="text-xs text-brand-green font-medium hover:underline">+ Add Question</button>
                          </div>
                        )}
                      </div>
                    ))}

                    <UnitTypePicker onSelect={(type) => addUnit(si, ssi, type)} />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addSubsection(si)} className="text-xs text-brand-muted hover:text-brand-dark mt-1">+ Add Subsection</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!user) return null;

  if (accessRemoved) return (
    <>
      {/* A new key re-mounts the header, so it re-reads the access and drops its Admin Panel link. */}
      <Header key="access-removed" />
      <main id="main">
        <div className="bms-admin">
          <h1 className="bms-admin-title">Admin Panel</h1>
          <div className="bms-admin-alert mb-4" role="status">A site admin removed you as admin of your micro-programmes, so you can no longer use the Admin Panel. Your unsaved changes were not saved.</div>
          <Link href="/dashboard" className="bms-admin-btn">Go to my dashboard</Link>
        </div>
      </main>
    </>
  );

  return (
    <>
      <Header />
      <main id="main">
        <div className="bms-admin">

          {view === "list" && (
            <>
              <div className="bms-admin-head">
                <h1 className="bms-admin-title">Admin Panel</h1>
                {isSiteAdmin && (
                  <div className="bms-admin-head-actions">
                    <button type="button" onClick={openImport} className="bms-admin-btn-secondary">
                      <Download aria-hidden="true" size={18} /> Import courses
                    </button>
                    <AddPicker onProg={newProg} onCred={() => newCred()} onCert={newCert} />
                  </div>
                )}
              </div>

              {accessNotice && <div className="bms-admin-alert mb-4" role="status">{accessNotice}</div>}
              {exportNotice && <div className="mb-4"><ExportNotice notice={exportNotice} onClose={() => setExportNotice(null)} /></div>}

              <label className="bms-admin-search">
                <Search aria-hidden="true" size={20} strokeWidth={3} />
                <input
                  type="text"
                  aria-label={isSiteAdmin ? "Search programmes, credentials and certificates" : "Search programmes and credentials"}
                  placeholder={isSiteAdmin ? "Search programmes, credentials and certificates" : "Search programmes and credentials"}
                  value={adminSearch}
                  onChange={e => setAdminSearch(e.target.value)}
                />
                {adminSearch && (
                  <button type="button" onClick={() => setAdminSearch("")} aria-label="Clear search" className="bms-admin-search-clear">
                    <X aria-hidden="true" size={18} />
                  </button>
                )}
              </label>

              {!adminSearch.trim() && (
                <div className="bms-admin-tabs">
                  {([["programmes", "Micro-programmes", myProgrammes.length], ["credentials", "Micro-credentials", myCredentials.length], ["certificates", "Certificates", certificates.length]] as const).filter(([key]) => isSiteAdmin || key !== "certificates").map(([key, label, count]) => (
                    <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)} className={tab === key ? "is-active" : undefined}>
                      {label} <span className="bms-admin-tab-count">{count}</span>
                    </button>
                  ))}
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" /></div>
              ) : adminSearch.trim() ? (
                /* ── Cross-category search results ── */
                filteredProgs.length === 0 && filteredCreds.length === 0 && filteredCerts.length === 0 ? (
                  <p className="bms-admin-empty">No results match your search.</p>
                ) : (
                  <div className="bms-admin-results">
                    {filteredProgs.length > 0 && (
                      <section>
                        <h2 className="bms-admin-group">Micro-programmes ({filteredProgs.length})</h2>
                        <ul className="bms-admin-list">
                          {filteredProgs.map(p => <ProgrammeRow key={p.id} programme={p} imageVersion={imageVersion} onEdit={() => editProg(p)} onDelete={isSiteAdmin ? () => delProg(p.id) : undefined} />)}
                        </ul>
                      </section>
                    )}
                    {filteredCreds.length > 0 && (
                      <section>
                        <h2 className="bms-admin-group">Micro-credentials ({filteredCreds.length})</h2>
                        <ul className="bms-admin-list">
                          {filteredCreds.map(c => <CredentialRow key={c.id} credential={c} programmeCodes={progsUsingCred(c.id)} imageVersion={imageVersion} onEdit={() => editCred(c)} onDelete={isSiteAdmin ? () => delCred(c.id) : undefined} onExport={isSiteAdmin ? () => exportCred(c) : undefined} exporting={exportingId === c.id} />)}
                        </ul>
                      </section>
                    )}
                    {filteredCerts.length > 0 && (
                      <section>
                        <h2 className="bms-admin-group">Certificates ({filteredCerts.length})</h2>
                        <ul className="bms-admin-list">
                          {filteredCerts.map(cert => <CertificateRow key={cert.id} certificate={cert} onEdit={() => editCert(cert)} onDelete={() => delCert(cert.id)} />)}
                        </ul>
                      </section>
                    )}
                  </div>
                )
              ) : tab === "programmes" ? (
                myProgrammes.length === 0 ? <p className="bms-admin-empty">No programmes yet.</p> : (
                  <ul className="bms-admin-list">
                    {myProgrammes.map(p => <ProgrammeRow key={p.id} programme={p} imageVersion={imageVersion} onEdit={() => editProg(p)} onDelete={isSiteAdmin ? () => delProg(p.id) : undefined} />)}
                  </ul>
                )
              ) : tab === "credentials" ? (
                myCredentials.length === 0 ? <p className="bms-admin-empty">No credentials yet.</p> : (
                  <ul className="bms-admin-list">
                    {myCredentials.map(c => <CredentialRow key={c.id} credential={c} programmeCodes={progsUsingCred(c.id)} imageVersion={imageVersion} onEdit={() => editCred(c)} onDelete={isSiteAdmin ? () => delCred(c.id) : undefined} onExport={isSiteAdmin ? () => exportCred(c) : undefined} exporting={exportingId === c.id} />)}
                  </ul>
                )
              ) : (
                certificates.length === 0 ? <p className="bms-admin-empty">No certificates yet. Use Add → Certificate to create one.</p> : (
                  <ul className="bms-admin-list">
                    {certificates.map(cert => <CertificateRow key={cert.id} certificate={cert} onEdit={() => editCert(cert)} onDelete={() => delCert(cert.id)} />)}
                  </ul>
                )
              )}
            </>
          )}

          {(view === "new-prog" || view === "edit-prog") && (
            <>
              <button onClick={goList} className="bms-admin-back">← Back</button>
              <h1 className="bms-admin-title is-sub">{editingProg ? editingProg.title : "New Micro-programme"}</h1>
              {formError && <div className="bms-admin-alert mb-4">{formError}</div>}
              <form onSubmit={saveProg} autoComplete="off" className="bms-admin-panel mb-6">
                {renderProgForm()}
                <div className="mt-4 flex gap-3">
                  <button type="submit" className="bms-admin-btn" disabled={formLoading}>{formLoading ? "Saving…" : editingProg ? "Save" : "Create & Add Credentials"}</button>
                  <button type="button" onClick={goList} className="bms-admin-btn-secondary">Cancel</button>
                </div>
              </form>

              {editingProg && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="bms-admin-section-title">Sections (Credentials)</h2>
                    <div className="relative" ref={addCredDropRef}>
                      <button
                        onClick={() => setAddCredDropOpen(o => !o)}
                        className="bms-admin-btn"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        Credential
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      {addCredDropOpen && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-soft border border-brand-line py-1 min-w-[200px] z-10">
                          <button
                            onClick={() => { setAddCredDropOpen(false); setCredPickerOpen(true); setCredPickerSearch(""); }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                            Add existing
                          </button>
                          <button
                            onClick={() => { setAddCredDropOpen(false); newCred(editingProg.id); }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                            Create new
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {credPickerOpen && (() => {
                    const attachedIds = new Set((editingProg.credentials || []).map(c => c.id));
                    const available = credentials.filter(c => !attachedIds.has(c.id));
                    const q = credPickerSearch.toLowerCase();
                    const filtered = q ? available.filter(c => c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) : available;
                    return (
                      <div className="mb-4 border border-[var(--bms-green)] rounded-xl p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-brand-dark">Add existing credential</p>
                          <button onClick={() => setCredPickerOpen(false)} className="text-brand-muted hover:text-brand-muted text-xs">✕ Close</button>
                        </div>
                        <input
                          autoFocus
                          className="auth-input mb-3"
                          placeholder="Search by name or code…"
                          value={credPickerSearch}
                          onChange={e => setCredPickerSearch(e.target.value)}
                        />
                        {filtered.length === 0 ? (
                          <p className="text-brand-muted text-sm text-center py-4">{available.length === 0 ? "All credentials are already in this programme." : "No credentials match your search."}</p>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {filtered.map(c => (
                              <button
                                key={c.id}
                                onClick={async () => { await addCredToProg(c.id); setCredPickerOpen(false); }}
                                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-[var(--bms-green)] hover:bg-[var(--bms-green-light)] transition-colors"
                              >
                                <span className="text-xs font-bold" style={{ color: "var(--bms-green)" }}>{c.code}</span>
                                <span className="text-xs text-brand-muted mx-1">·</span>
                                <span className="text-sm font-medium text-brand-dark">{c.title}</span>
                                {c.project && <span className="text-xs text-brand-muted ml-2">({c.project})</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {(editingProg.credentials || []).length === 0 ? <p className="bms-admin-empty">No credentials.</p> : (
                    <div className="space-y-3">{(editingProg.credentials || []).map(c => (
                      <div key={c.id} className="bms-admin-subitem">
                        <div className="flex-1 cursor-pointer" onClick={() => editCred(c, editingProg.id)}>
                          <p className="bms-admin-item-meta">{c.code} · {c.sectionsCount ?? (c.sections || []).length} sections{progsUsingCred(c.id).length > 1 && <span className="bms-admin-chip ml-2">Shared</span>}</p>
                          <p className="bms-admin-subitem-title">{c.title}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => editCred(c, editingProg.id)} className="bms-admin-link">Edit</button>
                          <button onClick={() => removeCredFromProg(c.id)} className="bms-admin-link is-danger">Remove</button>
                        </div>
                      </div>
                    ))}</div>
                  )}
                </div>
              )}

              {editingProg && isSiteAdmin && <ProgrammeAdmins programmeId={editingProg.id} />}
            </>
          )}

          {(view === "new-cred" || view === "edit-cred") && (
            <>
              <button onClick={() => { if (parentProgId) { const p = programmes.find(x => x.id === parentProgId); if (p) { editProg(p); return; } } goList(); }} className="bms-admin-back">← Back</button>
              <h1 className="bms-admin-title is-sub">{editingCred ? `Edit: ${editingCred.title}` : "New Micro-credential"}</h1>
              <form onSubmit={saveCred} autoComplete="off" className="bms-admin-panel">
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="bms-admin-label">Micro Credential Name *</label><input className="auth-input" value={credForm.title} onChange={e => setCredForm({ ...credForm, title: e.target.value })} required /></div>
                  <div><label className="bms-admin-label">Micro Credential Number *</label><input className="auth-input" value={credForm.code} onChange={e => setCredForm({ ...credForm, code: e.target.value })} required placeholder="e.g. MC1.1" /></div>
                  <div><label className="bms-admin-label">University / organisation</label><input className="auth-input" list="organisation-options-cred" value={credForm.organisation} onChange={e => setCredForm({ ...credForm, organisation: e.target.value })} placeholder="e.g. Universitat Politècnica de València" /><datalist id="organisation-options-cred">{allOrganisations.map(o => <option key={o} value={o} />)}</datalist><p className="bms-admin-help">Shown at the top of the catalogue card and course page.</p></div>
                  <div><label className="bms-admin-label">Created and delivered by</label><input className="auth-input" value={credForm.developedBy} onChange={e => setCredForm({ ...credForm, developedBy: e.target.value })} placeholder="e.g. Prof. Tomás Gómez, Universitat Politècnica de València" /><p className="bms-admin-help">Authors, then a comma and their university. Shown in the course page sidebar, with the university on its own line.</p></div>
                  <div><label className="bms-admin-label">Topic</label><input className="auth-input" list="topic-options-cred" value={credForm.topic} onChange={e => setCredForm({ ...credForm, topic: e.target.value })} placeholder="e.g. Renewable Energy" /><datalist id="topic-options-cred">{allTopics.map(t => <option key={t} value={t} />)}</datalist></div>
                  <div><label className="bms-admin-label">Project Name</label><input className="auth-input" list="project-options-cred" value={credForm.project} onChange={e => setCredForm({ ...credForm, project: e.target.value })} placeholder="Select or type a project name" /><datalist id="project-options-cred">{allProjects.map(p => <option key={p} value={p} />)}</datalist></div>
                  <div><label className="bms-admin-label">Pass Grade (%)</label><input className="auth-input" type="number" min="0" max="100" value={credForm.passGrade} onChange={e => setCredForm({ ...credForm, passGrade: e.target.value.replace(/^0+(\d)/, "$1") })} onKeyDown={e => e.key === "Enter" && e.preventDefault()} /></div>
                  <div className="md:col-span-2"><label className="bms-admin-label">Short Description</label><textarea className="auth-input" rows={2} value={credForm.description} onChange={e => setCredForm({ ...credForm, description: e.target.value })} placeholder="Brief summary shown on catalogue cards" /></div>
                  <div className="md:col-span-2"><label className="bms-admin-label">Context and overview</label><textarea className="auth-input" rows={4} value={credForm.overview} onChange={e => setCredForm({ ...credForm, overview: e.target.value })} placeholder="Full context and overview shown on the credential page" /></div>
                  <div className="md:col-span-2"><label className="bms-admin-label">Learning objectives</label><textarea className="auth-input" rows={4} value={credForm.objectives} onChange={e => setCredForm({ ...credForm, objectives: e.target.value })} placeholder="What learners will be able to do after this credential" /></div>
                  <div className="md:col-span-2"><label className="bms-admin-label">Image</label><ImageUploader value={credForm.image} onChange={url => setCredForm({ ...credForm, image: url })} /></div>
                </div>

                {renderSectionEditor()}

                {/* Next to the buttons, where the admin is looking after clicking Update: at the top of this long form it was out of sight. */}
                {formError && <div className="bms-admin-alert mt-6" role="alert">{formError}</div>}
                {exportNotice && <div className="mt-6"><ExportNotice notice={exportNotice} onClose={() => setExportNotice(null)} /></div>}

                <div className="mt-6 flex gap-3">
                  <button
                    type="submit"
                    className="bms-admin-btn"
                    disabled={formLoading || totalWeight > 100}
                  >
                    {formLoading ? "Saving…" : editingCred ? "Update" : "Create"}
                  </button>
                  <button type="button" onClick={() => { if (parentProgId) { const p = programmes.find(x => x.id === parentProgId); if (p) { editProg(p); return; } } goList(); }} className="bms-admin-btn-secondary">Cancel</button>
                  {editingCred && isSiteAdmin && (
                    <button type="button" onClick={saveAndExport} disabled={!!exportingId || formLoading} className="bms-admin-btn-secondary" title={credDirty ? "Saves your changes, then downloads the course file" : "Downloads the course file"}>
                      {exportingId === editingCred.id ? "Exporting…" : credDirty ? "Save & export" : "Export"}
                    </button>
                  )}
                  {editingCred && isSiteAdmin && <button type="button" onClick={() => delCred(editingCred.id)} className="bms-admin-btn-danger">Delete</button>}
                </div>
              </form>
            </>
          )}

          {(view === "new-cert" || view === "edit-cert") && (() => {
            const pdfSrc = certForm.pdfBase64
              ? `data:${certForm.pdfMime || "application/pdf"};base64,${certForm.pdfBase64}`
              : editingCert ? `/api/certificates/${editingCert.id}/pdf` : "";
            const projectTitles = [...credentials, ...programmes].filter(x => x.project === certForm.project).map(x => x.title);
            const sampleTitle = projectTitles.reduce((a, b) => (b.length > a.length ? b : a), "") || "Sample Micro-credential Title";

            return (
              <>
                <button onClick={goList} className="bms-admin-back">← Back</button>
                <h1 className="bms-admin-title is-sub">
                  {editingCert ? `Edit Certificate: ${editingCert.project}` : "New Certificate"}
                </h1>
                {formError && <div className="bms-admin-alert mb-4">{formError}</div>}
                <form onSubmit={saveCertificate} autoComplete="off" className="bms-admin-panel space-y-6">
                  {/* Project */}
                  <div>
                    <label className="bms-admin-label">Project *</label>
                    <input
                      className="auth-input"
                      list="cert-project-options"
                      value={certForm.project}
                      onChange={e => {
                        const project = e.target.value;
                        setCertForm(f => ({ ...f, project, introText: f.introText === defaultIntroText(f.project) ? defaultIntroText(project) : f.introText }));
                      }}
                      placeholder="Select or type a project name"
                      required
                    />
                    <datalist id="cert-project-options">{allProjects.map(p => <option key={p} value={p} />)}</datalist>
                  </div>

                  {/* PDF upload */}
                  <div>
                    <label className="block text-sm font-medium text-brand-dark mb-2">Certificate Template (PDF) *</label>
                    <CertificatePdfUploader
                      value={certForm.pdfBase64}
                      name={certForm.pdfName}
                      onChange={(base64, mime, filename) => setCertForm({ ...certForm, pdfBase64: base64, pdfMime: mime, pdfName: filename })}
                    />
                    <p className="bms-admin-help">
                      The template holds this project&apos;s frame, badge, signature and partner logos. Leave the area above the
                      signature blank: the BoostMySkills logo and the certificate text are added there.
                    </p>
                  </div>

                  {/* Project texts */}
                  <div>
                    <label className="bms-admin-label" htmlFor="cert-intro-text">Text above the course title</label>
                    <textarea id="cert-intro-text" className="auth-input" rows={3} value={certForm.introText} onChange={e => setCertForm({ ...certForm, introText: e.target.value })} />
                    <p className="bms-admin-help">Shown under the learner&apos;s name. Line breaks are kept; long lines wrap.</p>
                  </div>
                  <div>
                    <label className="bms-admin-label" htmlFor="cert-closing-text">Text below the course title</label>
                    <textarea id="cert-closing-text" className="auth-input" rows={3} value={certForm.closingText} onChange={e => setCertForm({ ...certForm, closingText: e.target.value })} placeholder="a course of study offered by …, an online learning initiative funded by …" />
                    <p className="bms-admin-help">Who offers and funds the course. Line breaks are kept; long lines wrap.</p>
                  </div>

                  {pdfSrc && (
                    <div>
                      <label className="block text-sm font-medium text-brand-dark mb-2">Preview and text area</label>
                      <CertificatePreview
                        pdfSrc={pdfSrc}
                        layout={certForm}
                        sampleTitle={sampleTitle}
                        onBoxChange={box => setCertForm(f => ({ ...f, ...box }))}
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button type="submit" className="bms-admin-btn" disabled={formLoading}>
                      {formLoading ? "Saving…" : editingCert ? "Update" : "Create"}
                    </button>
                    <button type="button" onClick={goList} className="bms-admin-btn-secondary">Cancel</button>
                    {editingCert && <button type="button" onClick={() => delCert(editingCert.id)} className="bms-admin-btn-danger">Delete</button>}
                  </div>
                </form>
              </>
            );
          })()}

          {view === "import" && (
            <OlxImport
              programmes={programmes}
              progsUsingCred={progsUsingCred}
              uploadToStorage={uploadToStorage}
              onImported={loadData}
              onOpenCredential={id => { const c = credentials.find(x => x.id === id); if (c) editCred(c); else { setTab("credentials"); goList(); } }}
              onClose={() => { setTab("credentials"); goList(); }}
            />
          )}
        </div>
      </main>

      {confirmDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onClick={() => { confirmDialog.resolve(false); setConfirmDialog(null); }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="bms-admin-dialog"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-5">
              <span className="w-9 h-9 flex-shrink-0 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
              </span>
              <p className="text-[1.05rem] leading-snug text-brand-dark pt-1.5">{confirmDialog.message}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => { confirmDialog.resolve(false); setConfirmDialog(null); }}
                className="bms-admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { confirmDialog.resolve(true); setConfirmDialog(null); }}
                className="bms-admin-btn is-danger"
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
