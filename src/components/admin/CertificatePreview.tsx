"use client";

// Admin preview of a project certificate: stamps the template in the browser with the same
// code the download route uses, so what you see is what learners get. The dashed box is the
// content area; drag its edges (or use the sliders) to fit it between the template's artwork.

import { useEffect, useRef, useState } from "react";
import type { CertificateAssets } from "@/lib/certificate";
import type { CertificateLayout } from "@/lib/certificate-defaults";

type Box = Pick<CertificateLayout, "contentTop" | "contentBottom" | "contentWidth">;
type Edge = "top" | "bottom" | "width";

const SAMPLE_NAME = "Sample Learner Name";
const MIN_HEIGHT = 5;

let assetsPromise: Promise<CertificateAssets> | null = null;

function loadAssets(paths: Record<keyof CertificateAssets, string>) {
  if (!assetsPromise) {
    const entries = Object.entries(paths) as [keyof CertificateAssets, string][];
    assetsPromise = Promise.all(entries.map(async ([key, url]) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Failed to load ${url}`);
      return [key, new Uint8Array(await r.arrayBuffer())] as const;
    })).then((pairs) => Object.fromEntries(pairs) as unknown as CertificateAssets);
    assetsPromise.catch(() => { assetsPromise = null; });
  }
  return assetsPromise;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const half = (v: number) => Math.round(v * 2) / 2;

function PercentField({ label, hint, value, min, max, onChange }: {
  label: string; hint: [string, string]; value: number; min: number; max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-brand-dark">{label}</p>
      <div className="flex justify-between text-xs text-brand-muted mb-1"><span>{hint[0]}</span><span>{hint[1]}</span></div>
      <div className="flex items-center gap-2">
        <input type="range" min={min} max={max} step="0.5" value={value} onChange={e => onChange(parseFloat(e.target.value))} className="flex-1 accent-[var(--bms-green)]" aria-label={label} />
        <input type="number" min={min} max={max} step="any" value={value} onFocus={e => e.target.select()} onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }} onBlur={() => onChange(clamp(value, min, max))} onKeyDown={e => e.key === "Enter" && e.preventDefault()} className="auth-input no-spin text-sm text-right" style={{ width: "64px" }} aria-label={`${label} (%)`} />
        <span className="text-xs text-brand-muted">%</span>
      </div>
    </div>
  );
}

export default function CertificatePreview({ pdfSrc, layout, sampleTitle, onBoxChange }: {
  pdfSrc: string;
  layout: CertificateLayout;
  sampleTitle: string;
  onBoxChange: (box: Partial<Box>) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [template, setTemplate] = useState<Uint8Array | null>(null);
  const [aspect, setAspect] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState<Edge | null>(null);
  const { introText, closingText, contentTop, contentBottom, contentWidth } = layout;

  useEffect(() => {
    if (!pdfSrc) return;
    let cancelled = false;
    setTemplate(null); setAspect(null); setError("");
    fetch(pdfSrc)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
      .then(buf => { if (!cancelled) setTemplate(new Uint8Array(buf)); })
      .catch(e => { console.error("Certificate template load error:", e); if (!cancelled) setError("Could not load the template PDF."); });
    return () => { cancelled = true; };
  }, [pdfSrc]);

  // Re-stamp and re-render shortly after the last change; render off-screen so the old preview stays up meanwhile.
  useEffect(() => {
    if (!template) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const [{ stampCertificate, CERTIFICATE_ASSET_PATHS }, pdfjs] = await Promise.all([import("@/lib/certificate"), import("pdfjs-dist")]);
        const assets = await loadAssets(CERTIFICATE_ASSET_PATHS);
        const bytes = await stampCertificate(template, assets, { learnerName: SAMPLE_NAME, title: sampleTitle }, { introText, closingText, contentTop, contentBottom, contentWidth });
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({ data: bytes });
        const offscreen = document.createElement("canvas");
        let viewport;
        try {
          const page = await (await task.promise).getPage(1);
          viewport = page.getViewport({ scale: 2 });
          offscreen.width = viewport.width;
          offscreen.height = viewport.height;
          await page.render({ canvas: offscreen, viewport }).promise;
        } finally {
          void task.destroy();
        }
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        canvas.width = offscreen.width;
        canvas.height = offscreen.height;
        canvas.getContext("2d")?.drawImage(offscreen, 0, 0);
        setAspect(`${viewport.width} / ${viewport.height}`);
        setError("");
      } catch (e) {
        console.error("Certificate preview render error:", e);
        if (!cancelled) setError("Could not render the preview.");
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [template, sampleTitle, introText, closingText, contentTop, contentBottom, contentWidth]);

  function dragTo(edge: Edge, e: React.PointerEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (edge === "top") onBoxChange({ contentTop: half(clamp(y, 0, contentBottom - MIN_HEIGHT)) });
    else if (edge === "bottom") onBoxChange({ contentBottom: half(clamp(y, contentTop + MIN_HEIGHT, 100)) });
    else onBoxChange({ contentWidth: half(clamp(Math.abs(x - 50) * 2, 10, 100)) });
  }

  function handleProps(edge: Edge) {
    return {
      onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setDragging(edge); },
      onPointerMove: (e: React.PointerEvent) => { if (dragging === edge) dragTo(edge, e); },
      onPointerUp: () => setDragging(null),
      onPointerCancel: () => setDragging(null),
    };
  }

  const pill = "rounded-full bg-[var(--bms-green)] shadow ring-2 ring-white";

  return (
    <div className="space-y-4">
      {!aspect && (
        <div className="w-full rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center" style={{ aspectRatio: "1 / 1", maxHeight: "70vh" }}>
          {error ? <p className="text-sm text-red-600">{error}</p> : (
            <div className="flex flex-col items-center gap-3 text-brand-muted">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-[var(--bms-green)] rounded-full animate-spin" />
              <span className="text-xs">Loading certificate…</span>
            </div>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className="relative w-full border border-gray-200 rounded-xl overflow-hidden bg-gray-100 select-none touch-none"
        style={{ aspectRatio: aspect ?? undefined, display: aspect ? undefined : "none" }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <div
          className="absolute border-2 border-dashed border-[var(--bms-green)] bg-[var(--bms-green)]/5"
          style={{ top: `${contentTop}%`, bottom: `${100 - contentBottom}%`, left: `${(100 - contentWidth) / 2}%`, right: `${(100 - contentWidth) / 2}%` }}
        >
          <div className="absolute inset-x-0 -top-2 h-4 cursor-ns-resize flex justify-center items-center" {...handleProps("top")} title="Drag to move the top of the text area">
            <span className={`${pill} h-2 w-10`} />
          </div>
          <div className="absolute inset-x-0 -bottom-2 h-4 cursor-ns-resize flex justify-center items-center" {...handleProps("bottom")} title="Drag to move the bottom of the text area">
            <span className={`${pill} h-2 w-10`} />
          </div>
          <div className="absolute inset-y-0 -right-2 w-4 cursor-ew-resize flex justify-center items-center" {...handleProps("width")} title="Drag to change the width of the text area">
            <span className={`${pill} w-2 h-10`} />
          </div>
        </div>
      </div>
      {aspect && error && <p className="text-xs text-red-600">{error}</p>}
      <p className="bms-admin-help">
        Shown with a sample name and the longest course title in this project. The text is centred in the dashed box, sized to its
        width, and shrinks if it would not fit between the top and bottom edges.
      </p>

      <div className="grid md:grid-cols-3 gap-4">
        <PercentField label="Top" hint={["↑ Top", "Bottom ↓"]} value={contentTop} min={0} max={contentBottom - MIN_HEIGHT} onChange={v => onBoxChange({ contentTop: v })} />
        <PercentField label="Bottom" hint={["↑ Top", "Bottom ↓"]} value={contentBottom} min={contentTop + MIN_HEIGHT} max={100} onChange={v => onBoxChange({ contentBottom: v })} />
        <PercentField label="Width" hint={["Narrow", "Wide"]} value={contentWidth} min={10} max={100} onChange={v => onBoxChange({ contentWidth: v })} />
      </div>
    </div>
  );
}
