"use client";

import Header from "@/components/Header";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

/* ─── Types ────────────────────────────────────────────── */

interface UnitQuestion { id?: string; question: string; options: string[]; correctIndex: number; }
interface CredentialUnit {
  id?: string;
  title: string;
  type: "VIDEO" | "QUIZ" | "PRESENTATION";
  order: number;
  weight?: number;
  videoUrl?: string;
  fileBase64?: string;
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
  passGrade: number; sections?: CredentialSection[];
}

interface MicroProgramme {
  id: string; title: string; slug: string; code: string; project: string;
  description: string | null; image: string | null; hasImage: boolean; credentials?: MicroCredential[];
}

interface Certificate {
  id: string; project: string; pdfName: string;
  nameX: number; nameY: number; titleX: number; titleY: number;
  nameFontSize: number; titleFontSize: number;
  nameMaxWidth: number; titleMaxWidth: number;
  hasPdf?: boolean;
}

interface CertForm {
  project: string; pdfBase64: string; pdfMime: string; pdfName: string;
  nameX: number; nameY: number; titleX: number; titleY: number;
  nameFontSize: number; titleFontSize: number;
  nameMaxWidth: number; titleMaxWidth: number;
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
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium cursor-pointer transition-colors bg-white text-brand-dark hover:border-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            Upload image
            <input type="file" accept=".png,.jpg,.jpeg" onChange={handleFile} className="hidden" />
          </label>
          <p className="text-xs text-brand-muted mt-1">PNG or JPG, max 20 MB</p>
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
    if (file.size > 50 * 1024 * 1024) { setError("File must be under 50 MB."); e.target.value = ""; return; }
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
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium cursor-pointer bg-white text-brand-dark hover:border-gray-400 transition-colors">
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
      <p className="text-xs text-brand-muted mt-1">PDF only, max 50 MB</p>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {!value && !name && <p className="text-xs text-orange-500 mt-1">A PDF template is required.</p>}
    </div>
  );
}

function CertificatePositioner({ pdfSrc, nameX, nameY, titleX, titleY, nameFontSize, titleFontSize, nameMaxWidth, titleMaxWidth, onName, onTitle }: {
  pdfSrc: string;
  nameX: number; nameY: number;
  titleX: number; titleY: number;
  nameFontSize: number; titleFontSize: number;
  nameMaxWidth: number; titleMaxWidth: number;
  onName: (x: number, y: number) => void;
  onTitle: (x: number, y: number) => void;
}) {
  const [dragging, setDragging] = useState<"name" | "title" | null>(null);
  const [rendered, setRendered] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onNameRef = useRef(onName);
  const onTitleRef = useRef(onTitle);
  const [pdfPageWidth, setPdfPageWidth] = useState(595);
  const [pdfAspect, setPdfAspect] = useState("595 / 842");
  const [canvasDims, setCanvasDims] = useState({ w: 0, h: 0 });

  // Keep callback refs fresh so global listeners don't capture stale closures
  useEffect(() => { onNameRef.current = onName; }, [onName]);
  useEffect(() => { onTitleRef.current = onTitle; }, [onTitle]);

  useEffect(() => {
    if (!pdfSrc) return;
    setRendered(false);
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const pdf = await pdfjs.getDocument({ url: pdfSrc }).promise;
        if (cancelled) return;
        const page = await pdf.getPage(1);
        if (cancelled) return;
        const vp1 = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 2 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, viewport }).promise;
        if (!cancelled) {
          setPdfPageWidth(vp1.width);
          setPdfAspect(`${vp1.width} / ${vp1.height}`);
          setCanvasDims({ w: viewport.width, h: viewport.height });
          setRendered(true);
        }
      } catch (e) {
        console.error("PDF preview render error:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [pdfSrc]);

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || canvasDims.w === 0) return;
    canvas.width = canvasDims.w;
    canvas.height = canvasDims.h;
    const w = canvasDims.w;
    const h = canvasDims.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    const s = w / pdfPageWidth;
    const CAP = 0.72;

    function stampWithBox(text: string, xPct: number, yPct: number, fontPx: number, maxWidthPct: number, color: string) {
      const cx = (xPct / 100) * w;
      const ty = (yPct / 100) * h;
      const boxW = (maxWidthPct / 100) * w;
      const boxH = fontPx * 1.1;

      // Draw bounding box
      ctx!.save();
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 1.5;
      ctx!.setLineDash([5, 4]);
      ctx!.globalAlpha = 0.55;
      ctx!.strokeRect(cx - boxW / 2, ty, boxW, boxH);
      ctx!.fillStyle = color;
      ctx!.globalAlpha = 0.06;
      ctx!.fillRect(cx - boxW / 2, ty, boxW, boxH);
      ctx!.restore();

      // Auto-shrink font to fit box
      ctx!.font = `bold ${fontPx}px Helvetica, Arial, sans-serif`;
      let actualFont = fontPx;
      if (ctx!.measureText(text).width > boxW) {
        actualFont = fontPx * (boxW / ctx!.measureText(text).width);
        ctx!.font = `bold ${actualFont}px Helvetica, Arial, sans-serif`;
      }

      // Draw text centered in the box
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      ctx!.shadowColor = "rgba(255,255,255,0.9)";
      ctx!.shadowBlur = 4 * s;
      ctx!.fillStyle = color;
      ctx!.globalAlpha = 0.85;
      ctx!.fillText(text, cx, ty + boxH / 2);
      ctx!.shadowBlur = 0;
      ctx!.globalAlpha = 1;
      ctx!.textAlign = "left";
      ctx!.textBaseline = "alphabetic";
    }

    stampWithBox("Sample Name",      nameX,  nameY,  nameFontSize * s,  nameMaxWidth,  "rgba(37,99,235,1)");
    stampWithBox("Credential Title", titleX, titleY, titleFontSize * s, titleMaxWidth, "rgba(234,88,12,1)");
  }, [nameX, nameY, titleX, titleY, nameFontSize, titleFontSize, nameMaxWidth, titleMaxWidth, canvasDims, pdfPageWidth]);

  // Global mouse listeners so dragging works even when cursor leaves the PDF box
  useEffect(() => {
    if (!dragging) return;

    function onMove(e: MouseEvent) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10));
      const y = Math.min(100, Math.max(0, Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10));
      if (dragging === "name") onNameRef.current(x, y);
      else onTitleRef.current(x, y);
    }

    function onUp() { setDragging(null); }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Loading skeleton — same aspect ratio, hidden once rendered */}
      {!rendered && (
        <div
          className="w-full rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center"
          style={{ aspectRatio: pdfAspect }}
        >
          <div className="flex flex-col items-center gap-3 text-brand-muted">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-[var(--bms-green)] rounded-full animate-spin" />
            <span className="text-xs">Loading certificate…</span>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative w-full border border-gray-200 rounded-xl overflow-hidden bg-gray-100"
        style={{ aspectRatio: pdfAspect, cursor: dragging ? "grabbing" : "default", display: rendered ? undefined : "none" }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <canvas ref={overlayRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }} />

        {/* Draggable handle — Learner name */}
        <div
          style={{ position: "absolute", left: `${nameX}%`, top: `${nameY}%`, transform: "translate(-50%, -50%)", zIndex: 20, cursor: dragging === "name" ? "grabbing" : "grab", userSelect: "none" }}
          onMouseDown={e => { e.preventDefault(); setDragging("name"); }}
        >
          <div className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap" style={{ opacity: dragging === "name" ? 1 : 0.82 }}>
            <span className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
            Learner name
          </div>
        </div>

        {/* Draggable handle — Course title */}
        <div
          style={{ position: "absolute", left: `${titleX}%`, top: `${titleY}%`, transform: "translate(-50%, -50%)", zIndex: 20, cursor: dragging === "title" ? "grabbing" : "grab", userSelect: "none" }}
          onMouseDown={e => { e.preventDefault(); setDragging("title"); }}
        >
          <div className="flex items-center gap-1.5 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap" style={{ opacity: dragging === "title" ? 1 : 0.82 }}>
            <span className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
            Course title
          </div>
        </div>
      </div>
      {rendered && (
        <p className="text-xs text-brand-muted mt-1.5">
          Drag the coloured labels to reposition. The text preview shows the actual size and placement on the certificate.
        </p>
      )}
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
          <button onClick={() => { onCert(); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Certificate
          </button>
        </div>
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
type View = "list" | "new-prog" | "edit-prog" | "new-cred" | "edit-cred" | "new-cert" | "edit-cert";

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
  const [formLoading, setFormLoading] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [editingProg, setEditingProg] = useState<MicroProgramme | null>(null);
  const [editingCred, setEditingCred] = useState<MicroCredential | null>(null);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [parentProgId, setParentProgId] = useState<string | null>(null);
  const [certForm, setCertForm] = useState<CertForm>({ project: "", pdfBase64: "", pdfMime: "", pdfName: "", nameX: 50, nameY: 40, titleX: 50, titleY: 55, nameFontSize: 28, titleFontSize: 21, nameMaxWidth: 80, titleMaxWidth: 80 });

  const [returnTab, setReturnTab] = useState<Tab>("programmes");
  const [imageVersion, setImageVersion] = useState(1);

  const [credPickerOpen, setCredPickerOpen] = useState(false);
  const [credPickerSearch, setCredPickerSearch] = useState("");
  const [addCredDropOpen, setAddCredDropOpen] = useState(false);
  const addCredDropRef = useRef<HTMLDivElement>(null);

  const [progForm, setProgForm] = useState({ title: "", slug: "", code: "", project: "", description: "", image: "" });
  const [credForm, setCredForm] = useState({ title: "", slug: "", code: "", project: "", description: "", overview: "", objectives: "", image: "", developedBy: "", passGrade: "50" });
  const [sections, setSections] = useState<CredentialSection[]>([]);

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
    fetch("/api/auth/session").then(r => r.json())
      .then(d => { if (d?.user) { if (d.user.role !== "ADMIN") { router.push("/"); return; } setUser(d.user); } else { router.push("/"); } })
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

  const filteredCerts = useMemo(() => {
    if (!adminSearch.trim()) return certificates;
    const q = adminSearch.toLowerCase();
    return certificates.filter(c => c.project.toLowerCase().includes(q) || c.pdfName.toLowerCase().includes(q));
  }, [certificates, adminSearch]);

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

  async function refreshProg(id: string) {
    await loadData();
    const r = await fetch(`/api/micro-programmes/${id}`);
    if (r.ok) {
      const { programme } = await r.json();
      setEditingProg(programme);
      setImageVersion(v => v + 1);
      const imgUrl = programme.hasImage ? imageUrlFor("programme", programme.id, imageVersion + 1, null) : programme.image || "";
      setProgForm({ title: programme.title, slug: programme.slug, code: programme.code, project: programme.project, description: programme.description || "", image: imgUrl });
      // Already in an edit view, no new history push needed.
      setView("edit-prog");
    }
  }

  function progsUsingCred(credId: string) { return programmes.filter(p => (p.credentials || []).some(c => c.id === credId)).map(p => p.code); }

  function toSlug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  function newProg() {
    pushAdminHistory("new-prog");
    setProgForm({ title: "", slug: "", code: "", project: "", description: "", image: "" });
    setEditingProg(null); setFormError(""); setReturnTab("programmes"); setView("new-prog");
  }

  function editProg(p: MicroProgramme) {
    pushAdminHistory("edit-prog");
    const imgUrl = p.hasImage ? imageUrlFor("programme", p.id, imageVersion, null) : p.image || "";
    setProgForm({ title: p.title, slug: p.slug, code: p.code, project: p.project, description: p.description || "", image: imgUrl });
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

  function newCred(progId?: string) {
    pushAdminHistory("new-cred");
    setCredForm({ title: "", slug: "", code: "", project: "", description: "", overview: "", objectives: "", image: "", developedBy: "", passGrade: "50" });
    setSections([]); setEditingCred(null); setParentProgId(progId || null); setFormError("");
    if (!progId) setReturnTab("credentials");
    setView("new-cred");
  }

  function editCred(c: MicroCredential, progId?: string) {
    pushAdminHistory("edit-cred");
    const imgUrl = c.hasImage ? imageUrlFor("credential", c.id, imageVersion, null) : c.image || "";
    setCredForm({ title: c.title, slug: c.slug, code: c.code, project: c.project, description: c.description || "", overview: c.overview || "", objectives: c.objectives || "", image: imgUrl, developedBy: c.developedBy || "", passGrade: String(c.passGrade) });
    setSections(c.sections || []); setEditingCred(c); setParentProgId(progId || null); setFormError("");
    if (!progId) setReturnTab("credentials");
    setView("edit-cred");
  }

  async function saveCred(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (!credForm.title || !credForm.code) { setFormError("Title and code required."); return; }
    if (totalWeight > 100) { setFormError(`Total unit weight is ${totalWeight}%. It must not exceed 100%.`); return; }
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
      setImageVersion(v => v + 1);
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

  function newCert() {
    pushAdminHistory("new-cert");
    setCertForm({ project: "", pdfBase64: "", pdfMime: "", pdfName: "", nameX: 50, nameY: 40, titleX: 50, titleY: 55, nameFontSize: 28, titleFontSize: 21, nameMaxWidth: 80, titleMaxWidth: 80 });
    setEditingCert(null); setFormError(""); setReturnTab("certificates"); setView("new-cert");
  }

  function editCert(c: Certificate) {
    pushAdminHistory("edit-cert");
    setCertForm({ project: c.project, pdfBase64: "", pdfMime: "", pdfName: c.pdfName, nameX: c.nameX, nameY: c.nameY, titleX: c.titleX, titleY: c.titleY, nameFontSize: c.nameFontSize, titleFontSize: c.titleFontSize, nameMaxWidth: c.nameMaxWidth ?? 80, titleMaxWidth: c.titleMaxWidth ?? 80 });
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
        nameX: certForm.nameX,
        nameY: certForm.nameY,
        titleX: certForm.titleX,
        titleY: certForm.titleY,
        nameFontSize: certForm.nameFontSize,
        titleFontSize: certForm.titleFontSize,
        nameMaxWidth: certForm.nameMaxWidth,
        titleMaxWidth: certForm.titleMaxWidth,
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
    if (!confirm("Delete this certificate template?")) return;
    await fetch(`/api/certificates/${id}`, { method: "DELETE" });
    await loadData(); goList();
  }

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
    s[si].subsections[ssi] = { ...s[si].subsections[ssi], units: [...units, { title: "", type, order: units.length, weight: 0, videoUrl: "", fileBase64: "", fileMime: "", fileName: "", questions: [] }] }; setSections(s);
  }
  function removeUnit(si: number, ssi: number, ui: number) {
    const s = [...sections]; s[si].subsections[ssi].units = s[si].subsections[ssi].units.filter((_, x) => x !== ui); setSections(s);
  }
  function updateUnit(si: number, ssi: number, ui: number, field: string, value: any) {
    const s = [...sections]; (s[si].subsections[ssi].units[ui] as any)[field] = value; setSections(s);
  }

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

  function renderProgForm() {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-brand-dark mb-1">Title *</label><input className="auth-input" value={progForm.title} onChange={e => setProgForm({ ...progForm, title: e.target.value })} required /></div>
        <div><label className="block text-sm font-medium text-brand-dark mb-1">Code *</label><input className="auth-input" value={progForm.code} onChange={e => setProgForm({ ...progForm, code: e.target.value })} required placeholder="e.g. MP1" /></div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-brand-dark mb-1">Project</label><input className="auth-input" list="project-options" value={progForm.project} onChange={e => setProgForm({ ...progForm, project: e.target.value })} placeholder="Select or type a project name" /><datalist id="project-options">{allProjects.map(p => <option key={p} value={p} />)}</datalist></div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-brand-dark mb-1">Description</label><textarea className="auth-input" rows={2} value={progForm.description} onChange={e => setProgForm({ ...progForm, description: e.target.value })} /></div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-brand-dark mb-1">Image</label><ImageUploader value={progForm.image} onChange={url => setProgForm({ ...progForm, image: url })} /></div>
      </div>
    );
  }

  function renderSectionEditor() {
    const overWeight = totalWeight > 100;
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg" style={{ color: "var(--bms-green)" }}>Sections</h3>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${overWeight ? "bg-red-100 text-red-700" : totalWeight === 100 ? "bg-green-100 text-green-700" : "bg-gray-100 text-brand-muted"}`}>
              Total weight: {totalWeight}%
            </span>
            <button type="button" onClick={addSection} className="text-sm text-brand-green font-medium hover:underline">+ Add Section</button>
          </div>
        </div>
        {overWeight && (
          <p className="text-xs text-red-600 mb-3">Total weight exceeds 100%. Adjust individual unit weights before saving.</p>
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
                              inputMode="numeric"
                              className="auth-input text-sm"
                              style={{ width: "70px", textAlign: "right" }}
                              placeholder="0"
                              value={unit.weight ?? 0}
                              onFocus={e => e.target.select()}
                              onChange={e => {
                                const digits = e.target.value.replace(/[^0-9]/g, "");
                                const v = digits === "" ? 0 : Math.max(0, Math.min(100, parseInt(digits) || 0));
                                updateUnit(si, ssi, ui, "weight", v);
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
                            {unit.videoUrl && unit.videoUrl.includes("youtu") && (
                              <div className="mt-2 aspect-video max-w-xs rounded-lg overflow-hidden bg-black">
                                <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${unit.videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1] || ""}`} allowFullScreen />
                              </div>
                            )}
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
                                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium cursor-pointer transition-colors bg-white text-brand-dark hover:border-gray-400">
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
                                      updateUnit(si, ssi, ui, "fileBase64", data);
                                      updateUnit(si, ssi, ui, "fileMime", mime);
                                      updateUnit(si, ssi, ui, "fileName", file.name);
                                      updateUnit(si, ssi, ui, "removeFile", false);
                                    };
                                    reader.readAsDataURL(file);
                                    e.target.value = "";
                                  }} />
                                </label>
                                <p className="text-xs text-brand-muted mt-1">PPTX, PPT, or PDF, max 1 GB. PDFs preview inline.</p>
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
                                <input className="auth-input text-sm mb-2" placeholder="Question" value={q.question} onChange={e => updateUnitQ(si, ssi, ui, qi, "question", e.target.value)} />
                                {q.options.map((opt, oi) => (
                                  <div key={oi} className="flex items-center gap-2 mb-1">
                                    <input type="radio" name={`u${si}-${ssi}-${ui}-${qi}`} checked={q.correctIndex === oi} onChange={() => updateUnitQ(si, ssi, ui, qi, "correctIndex", oi)} className="w-3.5 h-3.5 accent-[var(--bms-green)]" />
                                    <input className="auth-input flex-1 text-sm" placeholder={`Option ${oi + 1}`} value={opt} onChange={e => updateUnitQOpt(si, ssi, ui, qi, oi, e.target.value)} />
                                    {q.options.length > 2 && <button type="button" onClick={() => removeUnitQOpt(si, ssi, ui, qi, oi)} className="text-red-400 text-xs">✕</button>}
                                  </div>
                                ))}
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

  return (
    <>
      <Header />
      <main id="main">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">

          {view === "list" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-brand-dark">Admin Panel</h1>
                <AddPicker onProg={newProg} onCred={() => newCred()} onCert={newCert} />
              </div>

              <div className="relative mb-6">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                <input
                  type="text"
                  className="w-full py-3 pl-10 pr-9 border border-gray-200 rounded-xl text-sm outline-none focus:border-[var(--bms-green)] transition-colors bg-white"
                  placeholder="Search programmes, credentials and certificates..."
                  value={adminSearch}
                  onChange={e => setAdminSearch(e.target.value)}
                />
                {adminSearch && <button onClick={() => setAdminSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-muted text-xs">✕</button>}
              </div>

              {!adminSearch.trim() && (
                <div className="flex gap-1 mb-6 border-b border-gray-200">
                  <button onClick={() => setTab("programmes")} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "programmes" ? "border-brand-green text-brand-green" : "border-transparent text-brand-muted"}`}>
                    Micro-programmes ({programmes.length})
                  </button>
                  <button onClick={() => setTab("credentials")} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "credentials" ? "border-brand-green text-brand-green" : "border-transparent text-brand-muted"}`}>
                    Micro-credentials ({credentials.length})
                  </button>
                  <button onClick={() => setTab("certificates")} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "certificates" ? "border-brand-green text-brand-green" : "border-transparent text-brand-muted"}`}>
                    Certificates ({certificates.length})
                  </button>
                </div>
              )}

              {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin" /></div> : adminSearch.trim() ? (
                /* ── Cross-category search results ── */
                <>
                  {filteredProgs.length === 0 && filteredCreds.length === 0 && filteredCerts.length === 0 ? (
                    <p className="text-brand-muted text-sm py-6 text-center rounded-2xl border border-dashed border-brand-line">No results match your search.</p>
                  ) : (
                    <div className="space-y-6">
                      {filteredProgs.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-2">Micro-programmes ({filteredProgs.length})</p>
                          <div className="space-y-3">{filteredProgs.map(p => (
                            <div key={p.id} className="rounded-2xl border border-brand-line bg-white p-5 transition-shadow hover:shadow-soft cursor-pointer" onClick={() => editProg(p)}>
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1"><span className="text-sm font-bold" style={{ color: "var(--bms-green)" }}>{p.code}</span><span className="text-xs text-brand-muted">|</span><span className="text-xs text-brand-muted">{p.project}</span></div>
                                  <h4 className="font-semibold mb-2 text-brand-dark">{p.title}</h4>
                                  <div className="flex flex-wrap gap-1">{(p.credentials || []).map(c => <span key={c.id} className="text-xs bg-[var(--bms-green-light)] text-brand-green px-2 py-0.5 rounded-full">{c.code}</span>)}{(p.credentials || []).length === 0 && <span className="text-xs text-brand-muted italic">No credentials</span>}</div>
                                </div>
                                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => editProg(p)} className="text-brand-green text-sm hover:underline">Edit</button>
                                  <button onClick={() => delProg(p.id)} className="text-red-500 text-sm hover:underline">Delete</button>
                                </div>
                              </div>
                            </div>
                          ))}</div>
                        </div>
                      )}
                      {filteredCreds.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-2">Micro-credentials ({filteredCreds.length})</p>
                          <div className="space-y-3">{filteredCreds.map(c => {
                            const used = progsUsingCred(c.id);
                            return (
                              <div key={c.id} className="rounded-2xl border border-brand-line bg-white p-5 transition-shadow hover:shadow-soft cursor-pointer" onClick={() => editCred(c)}>
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-bold" style={{ color: "var(--bms-green)" }}>{c.code}</span>
                                      <span className="text-xs text-brand-muted">|</span>
                                      <span className="text-xs text-brand-muted">{c.project}</span>
                                      <span className="text-xs text-brand-muted">|</span>
                                      <span className="text-xs text-brand-muted">{(c.sections || []).length} sections</span>
                                    </div>
                                    <h4 className="font-semibold mb-2 text-brand-dark">{c.title}</h4>
                                    <div className="flex flex-wrap gap-1">
                                      {used.length > 0 ? used.map(code => <span key={code} className="text-xs bg-[var(--bms-green-light)] text-brand-green px-2 py-0.5 rounded-full">{code}</span>) : <span className="text-xs text-brand-muted italic">Not in any programme</span>}
                                    </div>
                                  </div>
                                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => editCred(c)} className="text-brand-green text-sm hover:underline">Edit</button>
                                    <button onClick={() => delCred(c.id)} className="text-red-500 text-sm hover:underline">Delete</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}</div>
                        </div>
                      )}
                      {filteredCerts.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-2">Certificates ({filteredCerts.length})</p>
                          <div className="space-y-3">{filteredCerts.map(cert => (
                            <div key={cert.id} className="rounded-2xl border border-brand-line bg-white p-5 transition-shadow hover:shadow-soft cursor-pointer flex items-center justify-between" onClick={() => editCert(cert)}>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-sm font-bold text-brand-dark">{cert.project}</span>
                              </div>
                              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                <a href={`/api/certificates/${cert.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm hover:underline">Preview</a>
                                <button onClick={() => editCert(cert)} className="text-brand-green text-sm hover:underline">Edit</button>
                                <button onClick={() => delCert(cert.id)} className="text-red-500 text-sm hover:underline">Delete</button>
                              </div>
                            </div>
                          ))}</div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : tab === "programmes" ? (
                <>
                  {programmes.length === 0 ? <p className="text-brand-muted text-sm py-6 text-center rounded-2xl border border-dashed border-brand-line">No programmes yet.</p> : (
                    <div className="space-y-3">{programmes.map(p => (
                      <div key={p.id} className="rounded-2xl border border-brand-line bg-white p-5 transition-shadow hover:shadow-soft cursor-pointer" onClick={() => editProg(p)}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1"><span className="text-sm font-bold" style={{ color: "var(--bms-green)" }}>{p.code}</span><span className="text-xs text-brand-muted">|</span><span className="text-xs text-brand-muted">{p.project}</span></div>
                            <h4 className="font-semibold mb-2 text-brand-dark">{p.title}</h4>
                            <div className="flex flex-wrap gap-1">{(p.credentials || []).map(c => <span key={c.id} className="text-xs bg-[var(--bms-green-light)] text-brand-green px-2 py-0.5 rounded-full">{c.code}</span>)}{(p.credentials || []).length === 0 && <span className="text-xs text-brand-muted italic">No credentials</span>}</div>
                          </div>
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => editProg(p)} className="text-brand-green text-sm hover:underline">Edit</button>
                            <button onClick={() => delProg(p.id)} className="text-red-500 text-sm hover:underline">Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}</div>
                  )}
                </>
              ) : tab === "credentials" ? (
                <>
                  {credentials.length === 0 ? <p className="text-brand-muted text-sm py-6 text-center rounded-2xl border border-dashed border-brand-line">No credentials yet.</p> : (
                    <div className="space-y-3">{credentials.map(c => {
                      const used = progsUsingCred(c.id);
                      return (
                        <div key={c.id} className="rounded-2xl border border-brand-line bg-white p-5 transition-shadow hover:shadow-soft cursor-pointer" onClick={() => editCred(c)}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold" style={{ color: "var(--bms-green)" }}>{c.code}</span>
                                <span className="text-xs text-brand-muted">|</span>
                                <span className="text-xs text-brand-muted">{c.project}</span>
                                <span className="text-xs text-brand-muted">|</span>
                                <span className="text-xs text-brand-muted">{(c.sections || []).length} sections</span>
                              </div>
                              <h4 className="font-semibold mb-2 text-brand-dark">{c.title}</h4>
                              <div className="flex flex-wrap gap-1">
                                {used.length > 0 ? used.map(code => <span key={code} className="text-xs bg-[var(--bms-green-light)] text-brand-green px-2 py-0.5 rounded-full">{code}</span>) : <span className="text-xs text-brand-muted italic">Not in any programme</span>}
                              </div>
                            </div>
                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                              <button onClick={() => editCred(c)} className="text-brand-green text-sm hover:underline">Edit</button>
                              <button onClick={() => delCred(c.id)} className="text-red-500 text-sm hover:underline">Delete</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}</div>
                  )}
                </>
              ) : (
                /* Certificates tab */
                <>
                  {certificates.length === 0 ? (
                    <p className="text-brand-muted text-sm py-6 text-center rounded-2xl border border-dashed border-brand-line">No certificates yet. Use Add → Certificate to create one.</p>
                  ) : (
                    <div className="space-y-3">{certificates.map(cert => (
                      <div key={cert.id} className="rounded-2xl border border-brand-line bg-white p-5 transition-shadow hover:shadow-soft cursor-pointer flex items-center justify-between" onClick={() => editCert(cert)}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-sm font-bold text-brand-dark">{cert.project}</span>
                          </div>
                        </div>
                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                          <a href={`/api/certificates/${cert.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm hover:underline">Preview</a>
                          <button onClick={() => editCert(cert)} className="text-brand-green text-sm hover:underline">Edit</button>
                          <button onClick={() => delCert(cert.id)} className="text-red-500 text-sm hover:underline">Delete</button>
                        </div>
                      </div>
                    ))}</div>
                  )}
                </>
              )}
            </>
          )}

          {(view === "new-prog" || view === "edit-prog") && (
            <>
              <button onClick={goList} className="text-sm text-brand-muted hover:text-brand-dark mb-4">← Back</button>
              <h1 className="text-2xl font-bold mb-6 text-brand-dark">{editingProg ? editingProg.title : "New Micro-programme"}</h1>
              {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
              <form onSubmit={saveProg} autoComplete="off" className="rounded-2xl border border-brand-line bg-white p-6 mb-6">
                {renderProgForm()}
                <div className="mt-4 flex gap-3">
                  <button type="submit" className="auth-btn max-w-xs" disabled={formLoading}>{formLoading ? "Saving…" : editingProg ? "Save" : "Create & Add Credentials"}</button>
                  <button type="button" onClick={goList} className="px-5 py-2.5 rounded-lg text-sm font-medium text-brand-muted border border-gray-300 hover:bg-gray-50">Cancel</button>
                </div>
              </form>

              {editingProg && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold" style={{ color: "var(--bms-green)" }}>Sections (Credentials)</h2>
                    <div className="relative" ref={addCredDropRef}>
                      <button
                        onClick={() => setAddCredDropOpen(o => !o)}
                        className="px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-1.5"
                        style={{ background: "var(--bms-green)" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        Credential
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      {addCredDropOpen && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 min-w-[200px] z-10">
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

                  {(editingProg.credentials || []).length === 0 ? <p className="text-brand-muted text-sm py-4 text-center rounded-2xl border border-dashed border-brand-line">No credentials.</p> : (
                    <div className="space-y-3">{(editingProg.credentials || []).map(c => (
                      <div key={c.id} className="rounded-2xl border border-brand-line bg-white px-5 py-4 flex items-center justify-between">
                        <div className="flex-1 cursor-pointer" onClick={() => editCred(c, editingProg.id)}>
                          <p className="font-medium text-brand-dark">{c.title}</p>
                          <span className="text-xs text-brand-muted">{c.code} · {(c.sections || []).length} sections</span>
                          {progsUsingCred(c.id).length > 1 && <span className="text-xs text-blue-500 ml-2">Shared</span>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => editCred(c, editingProg.id)} className="text-brand-green text-sm hover:underline">Edit</button>
                          <button onClick={() => removeCredFromProg(c.id)} className="text-red-400 text-xs hover:underline">Remove</button>
                        </div>
                      </div>
                    ))}</div>
                  )}
                </div>
              )}
            </>
          )}

          {(view === "new-cred" || view === "edit-cred") && (
            <>
              <button onClick={() => { if (parentProgId) { const p = programmes.find(x => x.id === parentProgId); if (p) { editProg(p); return; } } goList(); }} className="text-sm text-brand-muted hover:text-brand-dark mb-4">← Back</button>
              <h1 className="text-2xl font-bold mb-6 text-brand-dark">{editingCred ? `Edit: ${editingCred.title}` : "New Micro-credential"}</h1>
              {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
              <form onSubmit={saveCred} autoComplete="off" className="rounded-2xl border border-brand-line bg-white p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-brand-dark mb-1">Micro Credential Name *</label><input className="auth-input" value={credForm.title} onChange={e => setCredForm({ ...credForm, title: e.target.value })} required /></div>
                  <div><label className="block text-sm font-medium text-brand-dark mb-1">Micro Credential Number *</label><input className="auth-input" value={credForm.code} onChange={e => setCredForm({ ...credForm, code: e.target.value })} required placeholder="e.g. MC1.1" /></div>
                  <div><label className="block text-sm font-medium text-brand-dark mb-1">Organisation</label><input className="auth-input" value={credForm.developedBy} onChange={e => setCredForm({ ...credForm, developedBy: e.target.value })} placeholder="e.g. TU Dublin" /></div>
                  <div><label className="block text-sm font-medium text-brand-dark mb-1">Project Name</label><input className="auth-input" list="project-options-cred" value={credForm.project} onChange={e => setCredForm({ ...credForm, project: e.target.value })} placeholder="Select or type a project name" /><datalist id="project-options-cred">{allProjects.map(p => <option key={p} value={p} />)}</datalist></div>
                  <div><label className="block text-sm font-medium text-brand-dark mb-1">Pass Grade (%)</label><input className="auth-input" type="number" min="0" max="100" value={credForm.passGrade} onChange={e => setCredForm({ ...credForm, passGrade: e.target.value.replace(/^0+(\d)/, "$1") })} onKeyDown={e => e.key === "Enter" && e.preventDefault()} /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-brand-dark mb-1">Short Description</label><textarea className="auth-input" rows={2} value={credForm.description} onChange={e => setCredForm({ ...credForm, description: e.target.value })} placeholder="Brief summary shown on catalogue cards" /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-brand-dark mb-1">Context and overview</label><textarea className="auth-input" rows={4} value={credForm.overview} onChange={e => setCredForm({ ...credForm, overview: e.target.value })} placeholder="Full context and overview shown on the credential page" /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-brand-dark mb-1">Learning objectives</label><textarea className="auth-input" rows={4} value={credForm.objectives} onChange={e => setCredForm({ ...credForm, objectives: e.target.value })} placeholder="What learners will be able to do after this credential" /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-brand-dark mb-1">Image</label><ImageUploader value={credForm.image} onChange={url => setCredForm({ ...credForm, image: url })} /></div>
                </div>

                {renderSectionEditor()}

                <div className="mt-6 flex gap-3">
                  <button
                    type="submit"
                    className="auth-btn max-w-xs"
                    disabled={formLoading || totalWeight > 100}
                  >
                    {formLoading ? "Saving…" : editingCred ? "Update" : "Create"}
                  </button>
                  <button type="button" onClick={() => { if (parentProgId) { const p = programmes.find(x => x.id === parentProgId); if (p) { editProg(p); return; } } goList(); }} className="px-5 py-2.5 rounded-lg text-sm font-medium text-brand-muted border border-gray-300 hover:bg-gray-50">Cancel</button>
                  {editingCred && <button type="button" onClick={() => delCred(editingCred.id)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50">Delete</button>}
                </div>
              </form>
            </>
          )}

          {(view === "new-cert" || view === "edit-cert") && (() => {
            const pdfSrc = certForm.pdfBase64
              ? `data:${certForm.pdfMime || "application/pdf"};base64,${certForm.pdfBase64}`
              : editingCert ? `/api/certificates/${editingCert.id}/pdf` : "";

            return (
              <>
                <button onClick={goList} className="text-sm text-brand-muted hover:text-brand-dark mb-4">← Back</button>
                <h1 className="text-2xl font-bold mb-6 text-brand-dark">
                  {editingCert ? `Edit Certificate: ${editingCert.project}` : "New Certificate"}
                </h1>
                {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
                <form onSubmit={saveCertificate} autoComplete="off" className="rounded-2xl border border-brand-line bg-white p-6 space-y-6">
                  {/* Project */}
                  <div>
                    <label className="block text-sm font-medium text-brand-dark mb-1">Project *</label>
                    <input
                      className="auth-input"
                      list="cert-project-options"
                      value={certForm.project}
                      onChange={e => setCertForm({ ...certForm, project: e.target.value })}
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
                  </div>

                  {certForm.pdfName && (<>
                    {/* Max text width */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-brand-dark mb-2 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                          Learner name — max width
                        </label>
                        <div className="flex items-center gap-2 mt-2">
                          <input type="range" min="10" max="100" step="1" value={certForm.nameMaxWidth} onChange={e => setCertForm(f => ({ ...f, nameMaxWidth: parseInt(e.target.value) }))} className="flex-1 accent-blue-500" />
                          <input type="number" min="10" max="100" value={certForm.nameMaxWidth} onFocus={e => e.target.select()} onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) setCertForm(f => ({ ...f, nameMaxWidth: v })); }} onBlur={() => setCertForm(f => ({ ...f, nameMaxWidth: Math.min(100, Math.max(10, f.nameMaxWidth || 10)) }))} onKeyDown={e => e.key === "Enter" && e.preventDefault()} className="auth-input no-spin text-sm text-right" style={{ width: "64px" }} />
                          <span className="text-sm text-brand-muted">%</span>
                        </div>
                        <p className="text-xs text-brand-muted mt-1">Text shrinks automatically if the name is too long for this width.</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-brand-dark mb-2 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
                          Course title — max width
                        </label>
                        <div className="flex items-center gap-2 mt-2">
                          <input type="range" min="10" max="100" step="1" value={certForm.titleMaxWidth} onChange={e => setCertForm(f => ({ ...f, titleMaxWidth: parseInt(e.target.value) }))} className="flex-1 accent-orange-500" />
                          <input type="number" min="10" max="100" value={certForm.titleMaxWidth} onFocus={e => e.target.select()} onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) setCertForm(f => ({ ...f, titleMaxWidth: v })); }} onBlur={() => setCertForm(f => ({ ...f, titleMaxWidth: Math.min(100, Math.max(10, f.titleMaxWidth || 10)) }))} onKeyDown={e => e.key === "Enter" && e.preventDefault()} className="auth-input no-spin text-sm text-right" style={{ width: "64px" }} />
                          <span className="text-sm text-brand-muted">%</span>
                        </div>
                        <p className="text-xs text-brand-muted mt-1">Text shrinks automatically if the title is too long for this width.</p>
                      </div>
                    </div>

                    {/* Independent font sizes */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-brand-dark mb-2 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                          Learner name — text size
                        </label>
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="range" min="10" max="100" step="1"
                            value={certForm.nameFontSize}
                            onChange={e => setCertForm(f => ({ ...f, nameFontSize: parseInt(e.target.value) }))}
                            className="flex-1 accent-blue-500"
                          />
                          <input
                            type="number" min="10" max="100"
                            value={certForm.nameFontSize}
                            onFocus={e => e.target.select()}
                            onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) setCertForm(f => ({ ...f, nameFontSize: v })); }}
                            onBlur={() => setCertForm(f => ({ ...f, nameFontSize: Math.min(100, Math.max(10, f.nameFontSize || 10)) }))}
                            onKeyDown={e => e.key === "Enter" && e.preventDefault()}
                            className="auth-input no-spin text-sm text-right"
                            style={{ width: "64px" }}
                          />
                          <span className="text-sm text-brand-muted">pt</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-brand-dark mb-2 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
                          Course title — text size
                        </label>
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="range" min="10" max="100" step="1"
                            value={certForm.titleFontSize}
                            onChange={e => setCertForm(f => ({ ...f, titleFontSize: parseInt(e.target.value) }))}
                            className="flex-1 accent-orange-500"
                          />
                          <input
                            type="number" min="10" max="100"
                            value={certForm.titleFontSize}
                            onFocus={e => e.target.select()}
                            onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) setCertForm(f => ({ ...f, titleFontSize: v })); }}
                            onBlur={() => setCertForm(f => ({ ...f, titleFontSize: Math.min(100, Math.max(10, f.titleFontSize || 10)) }))}
                            onKeyDown={e => e.key === "Enter" && e.preventDefault()}
                            className="auth-input no-spin text-sm text-right"
                            style={{ width: "64px" }}
                          />
                          <span className="text-sm text-brand-muted">pt</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual position picker */}
                    <div>
                      <label className="block text-sm font-medium text-brand-dark mb-2">Text Positions</label>
                      <CertificatePositioner
                        pdfSrc={pdfSrc}
                        nameX={certForm.nameX}
                        nameY={certForm.nameY}
                        titleX={certForm.titleX}
                        titleY={certForm.titleY}
                        nameFontSize={certForm.nameFontSize}
                        titleFontSize={certForm.titleFontSize}
                        nameMaxWidth={certForm.nameMaxWidth}
                        titleMaxWidth={certForm.titleMaxWidth}
                        onName={(x, y) => setCertForm(f => ({ ...f, nameX: x, nameY: y }))}
                        onTitle={(x, y) => setCertForm(f => ({ ...f, titleX: x, titleY: y }))}
                      />
                    </div>

                    {/* Fine-tuning sliders + number inputs */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                          Learner name position
                        </p>
                        <div>
                          <div className="flex justify-between text-xs text-brand-muted mb-1"><span>← Left</span><span>Right →</span></div>
                          <div className="flex items-center gap-2">
                            <input type="range" min="0" max="100" step="0.5" value={certForm.nameX} onChange={e => setCertForm(f => ({ ...f, nameX: parseFloat(e.target.value) }))} className="flex-1 accent-blue-500" />
                            <input type="number" min="0" max="100" step="any" value={certForm.nameX} onFocus={e => e.target.select()} onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setCertForm(f => ({ ...f, nameX: v })); }} onBlur={() => setCertForm(f => ({ ...f, nameX: Math.min(100, Math.max(0, f.nameX)) }))} onKeyDown={e => e.key === "Enter" && e.preventDefault()} className="auth-input no-spin text-sm text-right" style={{ width: "64px" }} />
                            <span className="text-xs text-brand-muted">%</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-brand-muted mb-1"><span>↑ Top</span><span>Bottom ↓</span></div>
                          <div className="flex items-center gap-2">
                            <input type="range" min="0" max="100" step="0.5" value={certForm.nameY} onChange={e => setCertForm(f => ({ ...f, nameY: parseFloat(e.target.value) }))} className="flex-1 accent-blue-500" />
                            <input type="number" min="0" max="100" step="any" value={certForm.nameY} onFocus={e => e.target.select()} onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setCertForm(f => ({ ...f, nameY: v })); }} onBlur={() => setCertForm(f => ({ ...f, nameY: Math.min(100, Math.max(0, f.nameY)) }))} onKeyDown={e => e.key === "Enter" && e.preventDefault()} className="auth-input no-spin text-sm text-right" style={{ width: "64px" }} />
                            <span className="text-xs text-brand-muted">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-orange-700 flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
                          Credential / programme title position
                        </p>
                        <div>
                          <div className="flex justify-between text-xs text-brand-muted mb-1"><span>← Left</span><span>Right →</span></div>
                          <div className="flex items-center gap-2">
                            <input type="range" min="0" max="100" step="0.5" value={certForm.titleX} onChange={e => setCertForm(f => ({ ...f, titleX: parseFloat(e.target.value) }))} className="flex-1 accent-orange-500" />
                            <input type="number" min="0" max="100" step="any" value={certForm.titleX} onFocus={e => e.target.select()} onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setCertForm(f => ({ ...f, titleX: v })); }} onBlur={() => setCertForm(f => ({ ...f, titleX: Math.min(100, Math.max(0, f.titleX)) }))} onKeyDown={e => e.key === "Enter" && e.preventDefault()} className="auth-input no-spin text-sm text-right" style={{ width: "64px" }} />
                            <span className="text-xs text-brand-muted">%</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-brand-muted mb-1"><span>↑ Top</span><span>Bottom ↓</span></div>
                          <div className="flex items-center gap-2">
                            <input type="range" min="0" max="100" step="0.5" value={certForm.titleY} onChange={e => setCertForm(f => ({ ...f, titleY: parseFloat(e.target.value) }))} className="flex-1 accent-orange-500" />
                            <input type="number" min="0" max="100" step="any" value={certForm.titleY} onFocus={e => e.target.select()} onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setCertForm(f => ({ ...f, titleY: v })); }} onBlur={() => setCertForm(f => ({ ...f, titleY: Math.min(100, Math.max(0, f.titleY)) }))} onKeyDown={e => e.key === "Enter" && e.preventDefault()} className="auth-input no-spin text-sm text-right" style={{ width: "64px" }} />
                            <span className="text-xs text-brand-muted">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>)}

                  <div className="flex gap-3">
                    <button type="submit" className="auth-btn max-w-xs" disabled={formLoading}>
                      {formLoading ? "Saving…" : editingCert ? "Update" : "Create"}
                    </button>
                    <button type="button" onClick={goList} className="px-5 py-2.5 rounded-lg text-sm font-medium text-brand-muted border border-gray-300 hover:bg-gray-50">Cancel</button>
                    {editingCert && <button type="button" onClick={() => delCert(editingCert.id)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50">Delete</button>}
                  </div>
                </form>
              </>
            );
          })()}
        </div>
      </main>
    </>
  );
}
