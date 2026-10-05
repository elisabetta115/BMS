"use client";

// Admin → "Import from Open edX": drop one or more OLX exports (.tar.gz).
// Each file is uploaded to S3 and previewed by /api/admin/import-olx one at a
// time, then gets its own card where clashes are resolved (rename / renumber,
// or replace / discard a re-import) before everything is imported in one go.

import { useEffect, useRef, useState } from "react";

interface ImportMatch { id: string; title: string; code: string; }
interface Existing { credential: ImportMatch | null; nameClash: ImportMatch | null; codeClash: ImportMatch | null; }

type Status = "queued" | "uploading" | "reading" | "ready" | "importing" | "done" | "failed";

interface Item {
  id: number;
  file: File;
  status: Status;
  uploadPct: number;
  key: string;
  preview: any | null;
  /** Name / number the credential will be imported with — editable to resolve clashes. */
  title: string;
  code: string;
  /** Matches among credentials of the same project: `credential` = same name and number (re-import). */
  existing: Existing | null;
  checking: boolean;
  conflictChoice: "replace" | "skip";
  programmeId: string;
  error: string;
  result: any | null;
}

const ARCHIVE_RE = /\.(tar\.gz|tgz|tar|gz)$/i;

const checkKey = (title: string, code: string) => `${title.trim()}\n${code.trim().toUpperCase()}`;
const hasClash = (it: Item) => !!(it.existing?.nameClash || it.existing?.codeClash);
const canImport = (it: Item) => it.status === "ready" && !it.checking && !!it.title.trim() && !!it.code.trim() && !hasClash(it);

/** Another file in the same drop that would collide with this one once both are imported. */
interface BatchClash { file: string; title: string; code: string; kind: "both" | "name" | "code" }

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * The server only checks each file against credentials already in the database,
 * so two files in the same drop (e.g. a course and its re-export) would both look
 * fine until the second one is refused on import. Compare them with each other
 * using the server's rules: same project, name / number ignoring case and spacing.
 */
function findBatchClashes(items: Item[]): Map<number, BatchClash[]> {
  const live = items.filter((it) => it.preview && (it.status === "ready" || it.status === "importing"));
  const out = new Map<number, BatchClash[]>();
  for (const a of live) {
    for (const b of live) {
      if (a.id === b.id || norm(a.preview.project || "") !== norm(b.preview.project || "")) continue;
      const sameName = !!norm(a.title) && norm(a.title) === norm(b.title);
      const sameCode = !!norm(a.code) && norm(a.code) === norm(b.code);
      if (!sameName && !sameCode) continue;
      const clash: BatchClash = { file: b.file.name, title: b.title, code: b.code, kind: sameName && sameCode ? "both" : sameName ? "name" : "code" };
      out.set(a.id, [...(out.get(a.id) ?? []), clash]);
    }
  }
  return out;
}

async function postImport(body: Record<string, unknown>) {
  const r = await fetch("/api/admin/import-olx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { r, d: await r.json() };
}

export default function OlxImport({
  programmes,
  progsUsingCred,
  uploadToStorage,
  onImported,
  onOpenCredential,
  onClose,
}: {
  programmes: { id: string; title: string; code: string }[];
  progsUsingCred: (credId: string) => string[];
  uploadToStorage: (file: File, purpose: "olx-import", onProgress?: (pct: number) => void) => Promise<string>;
  onImported: () => Promise<void>;
  onOpenCredential: (id: string) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const nextId = useRef(1);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState<string[]>([]);
  const [defaultProgrammeId, setDefaultProgrammeId] = useState("");
  const [running, setRunning] = useState(false);

  // Per-file debounce timers / sequence numbers for the name-number re-check, and
  // the last name+number the server confirmed.
  const checkTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const checkSeq = useRef(new Map<number, number>());
  const lastChecked = useRef(new Map<number, string>());

  const update = (id: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  /* ── Queue: upload + preview one file at a time ── */

  const analysing = useRef(false);
  const [queueTick, setQueueTick] = useState(0);

  useEffect(() => {
    if (analysing.current) return;
    const next = items.find((it) => it.status === "queued");
    if (!next) return;
    analysing.current = true;
    analyse(next).finally(() => {
      analysing.current = false;
      setQueueTick((t) => t + 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, queueTick]);

  async function analyse(item: Item) {
    update(item.id, { status: "uploading", uploadPct: 0, error: "" });
    try {
      const key = await uploadToStorage(item.file, "olx-import", (pct) => update(item.id, { uploadPct: pct }));
      update(item.id, { status: "reading", key });
      const { r, d } = await postImport({ key, mode: "preview" });
      if (!r.ok) {
        update(item.id, { status: "failed", error: d.error || "Could not read the archive." });
        return;
      }
      lastChecked.current.set(item.id, checkKey(d.summary.title, d.summary.code));
      update(item.id, {
        status: "ready",
        preview: d.summary,
        title: d.summary.title,
        code: d.summary.code,
        existing: d.existing,
        conflictChoice: "skip",
      });
    } catch (err: any) {
      update(item.id, { status: "failed", error: err?.message || "Upload failed." });
    }
  }

  function addFiles(list: FileList | File[]) {
    const files = Array.from(list);
    const bad = files.filter((f) => !ARCHIVE_RE.test(f.name)).map((f) => f.name);
    const current = itemsRef.current;
    const fresh = files.filter(
      (f) =>
        ARCHIVE_RE.test(f.name) &&
        !current.some((it) => it.file.name === f.name && it.file.size === f.size && it.file.lastModified === f.lastModified)
    );
    setRejected(bad);
    if (!fresh.length) return;
    setItems((prev) => [
      ...prev,
      ...fresh.map<Item>((file) => ({
        id: nextId.current++,
        file,
        status: "queued",
        uploadPct: 0,
        key: "",
        preview: null,
        title: "",
        code: "",
        existing: null,
        checking: false,
        conflictChoice: "skip",
        programmeId: defaultProgrammeId,
        error: "",
        result: null,
      })),
    ]);
  }

  // A file dropped next to the drop zone would otherwise make the browser open it
  // and leave the admin page.
  useEffect(() => {
    const block = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  /* ── Name / number re-check (debounced per file; stale answers dropped) ── */

  useEffect(() => {
    const timers = checkTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  function editNameNumber(item: Item, patch: { title?: string; code?: string }) {
    const title = patch.title ?? item.title;
    const code = patch.code ?? item.code;
    const seq = (checkSeq.current.get(item.id) ?? 0) + 1;
    checkSeq.current.set(item.id, seq);
    clearTimeout(checkTimers.current.get(item.id));
    const key = checkKey(title, code);
    if (!title.trim() || !code.trim() || key === lastChecked.current.get(item.id)) {
      update(item.id, { ...patch, checking: false });
      return;
    }
    update(item.id, { ...patch, checking: true });
    checkTimers.current.set(
      item.id,
      setTimeout(async () => {
        try {
          const { r, d } = await postImport({ mode: "check", title, code, project: item.preview.project });
          if (checkSeq.current.get(item.id) !== seq) return;
          if (r.ok) {
            lastChecked.current.set(item.id, key);
            update(item.id, { existing: d.existing, conflictChoice: "skip", error: "", checking: false });
          } else {
            update(item.id, { error: d.error || "Could not check the name and number.", checking: false });
          }
        } catch {
          if (checkSeq.current.get(item.id) === seq) update(item.id, { error: "Could not check the name and number.", checking: false });
        }
      }, 400)
    );
  }

  /* ── Import ── */

  async function commit(id: number) {
    const it = itemsRef.current.find((x) => x.id === id);
    if (!it || !canImport(it)) return;
    update(id, { status: "importing", error: "" });
    try {
      const { r, d } = await postImport({
        key: it.key,
        mode: "commit",
        // Programme attachment is opt-in — the importer never creates or auto-links one.
        programmeId: it.programmeId || undefined,
        title: it.title,
        code: it.code,
        onExistingCredential: it.existing?.credential ? it.conflictChoice : undefined,
      });
      if (!r.ok) {
        // A 409 carries up-to-date matches (e.g. an earlier file in this batch has the same name and number).
        if (r.status === 409 && d.existing) {
          lastChecked.current.set(id, checkKey(it.title, it.code));
          update(id, { status: "ready", existing: d.existing, conflictChoice: "skip", error: d.message || "Import failed." });
        } else {
          update(id, { status: "ready", error: d.error || d.message || "Import failed." });
        }
        return;
      }
      update(id, { status: "done", result: d });
    } catch {
      update(id, { status: "ready", error: "Import failed." });
    }
  }

  async function importAll() {
    setRunning(true);
    const clashes = findBatchClashes(itemsRef.current);
    for (const it of itemsRef.current.filter((x) => canImport(x) && !clashes.get(x.id)?.length)) {
      await commit(it.id);
    }
    await onImported();
    setRunning(false);
  }

  const batchClashes = findBatchClashes(items);
  const importable = (it: Item) => canImport(it) && !batchClashes.get(it.id)?.length;
  const ready = items.filter(importable);
  const processing = items.some((it) => ["queued", "uploading", "reading", "importing"].includes(it.status));
  const needAttention = items.filter((it) => it.status === "failed" || (it.status === "ready" && !importable(it) && !it.checking)).length;
  const doneCount = items.filter((it) => it.status === "done").length;

  return (
    <>
      <button onClick={onClose} disabled={running} className="bms-admin-back">← Back</button>
      <h1 className="bms-admin-title is-sub mb-2">Import courses from Open edX</h1>
      <p className="bms-admin-intro">
        Drop one or more Open edX course exports (<code className="text-xs bg-gray-100 px-1 py-0.5 rounded">.tar.gz</code>). Each one&apos;s sections,
        subsections, videos, quizzes and PDF units become a micro-credential. No micro-programme is created or touched unless you pick one.
      </p>

      <div className="bms-admin-panel space-y-6">
        <div
          onDragEnter={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            dragDepth.current++;
            setDragging(true);
          }}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = running ? "none" : "copy";
          }}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            if (!running) addFiles(e.dataTransfer.files);
          }}
          className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragging ? "border-[var(--bms-green)] bg-green-50" : "border-gray-300 bg-gray-50"
          }`}
        >
          <svg className="mx-auto mb-3 text-brand-muted" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-lg font-medium text-brand-dark">
            {dragging ? "Drop the files to add them" : "Drag and drop .tar.gz course exports here"}
          </p>
          <p className="text-[0.95rem] text-brand-muted mt-1 mb-5">You can add several at once, and keep adding more while others are being read.</p>
          <button
            type="button"
            disabled={running}
            onClick={() => fileInput.current?.click()}
            className="bms-admin-btn-secondary"
          >
            Choose files
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept=".tar.gz,.tgz,.gz,.tar,application/gzip,application/x-gzip"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {rejected.length > 0 && (
          <div className="bms-admin-alert">
            Not added (not a .tar.gz export): {rejected.join(", ")}
          </div>
        )}

        {items.length > 1 && (
          <div>
            <label className="bms-admin-label">Add every course to a micro-programme</label>
            <select
              className="auth-input"
              value={defaultProgrammeId}
              disabled={running}
              onChange={(e) => {
                const v = e.target.value;
                setDefaultProgrammeId(v);
                setItems((prev) => prev.map((it) => (it.status === "done" ? it : { ...it, programmeId: v })));
              }}
            >
              <option value="">— Don&apos;t attach to any programme —</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>{p.title} ({p.code})</option>
              ))}
            </select>
            <p className="bms-admin-help">Sets the programme on every course below; you can still change it for a single course.</p>
          </div>
        )}

        {items.map((it) => (
          <ImportCard
            key={it.id}
            item={it}
            batchClashes={batchClashes.get(it.id) ?? []}
            programmes={programmes}
            progsUsingCred={progsUsingCred}
            locked={running}
            onRemove={() => setItems((prev) => prev.filter((x) => x.id !== it.id))}
            onChange={(patch) => update(it.id, patch)}
            onEditNameNumber={(patch) => editNameNumber(it, patch)}
            onOpenCredential={onOpenCredential}
          />
        ))}

        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={importAll} disabled={running || ready.length === 0} className="bms-admin-btn">
              {running ? "Importing…" : ready.length > 1 ? `Import ${ready.length} courses` : "Import"}
            </button>
            <button
              onClick={onClose}
              disabled={running}
              className="bms-admin-btn-secondary"
            >
              {doneCount > 0 && !processing && ready.length === 0 ? "Done" : "Cancel"}
            </button>
            {needAttention > 0 && !running && (
              <span className="text-sm text-red-700">
                {needAttention} file{needAttention === 1 ? " needs" : "s need"} attention before {needAttention === 1 ? "it" : "they"} can be imported.
              </span>
            )}
          </div>
        )}

        {running && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-3 text-sm text-brand-dark mb-2">
              <div className="w-5 h-5 border-2 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              Saving your courses — creating sections, units and quizzes. This can take a little while for larger courses, please don&apos;t close this tab.
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-1/3 rounded-full animate-[indeterminate_1.2s_ease-in-out_infinite]" style={{ background: "var(--bms-green)" }} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ImportCard({
  item: it,
  batchClashes,
  programmes,
  progsUsingCred,
  locked,
  onRemove,
  onChange,
  onEditNameNumber,
  onOpenCredential,
}: {
  item: Item;
  batchClashes: BatchClash[];
  programmes: { id: string; title: string; code: string }[];
  progsUsingCred: (credId: string) => string[];
  locked: boolean;
  onRemove: () => void;
  onChange: (patch: Partial<Item>) => void;
  onEditNameNumber: (patch: { title?: string; code?: string }) => void;
  onOpenCredential: (id: string) => void;
}) {
  const p = it.preview;
  const project = p?.project || "(no project)";
  const clash = hasClash(it);
  const inBatch = batchClashes.length > 0;
  const blocked = clash || inBatch;
  const renamed = !!p && (it.title !== p.title || it.code !== p.code);
  const busy = ["uploading", "reading", "importing"].includes(it.status);

  const statusLabel: Record<Status, string> = {
    queued: "Waiting…",
    uploading: `Uploading… ${it.uploadPct}%`,
    reading: "Reading archive…",
    ready: it.checking ? "Checking…" : clash ? "Name or number clash" : inBatch ? "Clashes with another file" : it.existing?.credential ? (it.conflictChoice === "replace" ? "Will re-import" : "Will be discarded") : "Ready to import",
    importing: "Importing…",
    done: "Imported",
    failed: "Failed",
  };
  const statusTone =
    it.status === "done" ? "bg-green-100 text-green-800"
    : it.status === "failed" || (it.status === "ready" && blocked) ? "bg-red-100 text-red-800"
    : it.status === "ready" && it.existing?.credential ? "bg-amber-100 text-amber-900"
    : "bg-gray-100 text-brand-dark";

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        {busy && <div className="w-4 h-4 border-2 border-[var(--bms-green)] border-t-transparent rounded-full animate-spin flex-shrink-0" />}
        <span className="text-sm text-brand-dark truncate">{it.file.name}</span>
        <span className="text-xs text-brand-muted flex-shrink-0">{(it.file.size / 1024 / 1024).toFixed(1)} MB</span>
        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusTone}`}>{statusLabel[it.status]}</span>
        {!busy && it.status !== "done" && (
          <button type="button" onClick={onRemove} disabled={locked} aria-label={`Remove ${it.file.name}`} className="text-brand-muted hover:text-brand-dark disabled:opacity-50 text-lg leading-none px-1">
            ×
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {it.status === "uploading" && (
          <div className="h-1.5 w-full max-w-xs rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${it.uploadPct}%`, background: "var(--bms-green)" }} />
          </div>
        )}

        {it.error && <div className="bms-admin-alert">{it.error}</div>}

        {it.status === "done" && it.result && (
          <div className="flex items-start gap-3 text-sm text-brand-dark">
            <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">✓</span>
            <span className="flex-1 pt-0.5">
              {it.result.credentialAction === "skipped" ? (
                <>Upload discarded — <strong>{it.result.summary?.title}</strong> was left unchanged.</>
              ) : (
                <>
                  <strong>{it.result.summary?.code} · {it.result.summary?.title}</strong>{" "}
                  {it.result.credentialAction === "replaced" ? "re-imported (the previous version was deleted)" : "created"}.
                </>
              )}
              {it.result.programmeId && <> Added to <strong>{programmes.find((x) => x.id === it.result.programmeId)?.title || "—"}</strong>.</>}
            </span>
            {!locked && (
              <button type="button" onClick={() => onOpenCredential(it.result.credentialId)} className="flex-shrink-0 pt-0.5 text-sm font-semibold text-brand-green hover:underline">
                Open micro-credential
              </button>
            )}
          </div>
        )}

        {p && it.status !== "done" && (
          <>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              {p.organisation && <p className="bms-admin-item-meta">{p.organisation}</p>}
              <p className="bms-admin-item-meta">{it.code || p.code} | {p.project}{p.topic ? ` · ${p.topic}` : ""}</p>
              <h3 className="bms-admin-item-title">{it.title || p.title}</h3>
              <p className="text-sm text-brand-dark mt-3">
                {p.counts.sections} sections · {p.counts.subsections} subsections · <strong>{p.counts.units} units</strong> ({p.counts.videos} videos,{" "}
                {p.counts.quizzes} quizzes / {p.counts.questions} questions, {p.counts.presentations} PDFs)
              </p>
              <p className="bms-admin-help">
                Pass grade {p.passGrade}% · {p.hasImage ? `image ${p.imageName}` : "no image"}
                {p.developedBy && <> · Created and delivered by {p.developedBy}</>}
              </p>
            </div>

            <div>
              <label className="bms-admin-label">Add to a micro-programme</label>
              <select className="auth-input" value={it.programmeId} disabled={locked} onChange={(e) => onChange({ programmeId: e.target.value })}>
                <option value="">— Don&apos;t attach to any programme —</option>
                {programmes.map((x) => (
                  <option key={x.id} value={x.id}>{x.title} ({x.code})</option>
                ))}
              </select>
            </div>

            <details className="rounded-xl border border-gray-200 bg-white">
              <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-brand-dark">Outline</summary>
              <div className="px-4 pb-4 space-y-3">
                {p.outline.map((s: any, si: number) => (
                  <div key={si}>
                    <p className="text-sm font-semibold text-brand-green">{s.title}</p>
                    {s.subsections.map((ss: any, ssi: number) => {
                      const ssWeight = ss.units.reduce((n: number, u: any) => n + (Number(u.weight) || 0), 0);
                      return (
                        <div key={ssi} className="ml-4 mt-1">
                          <p className="text-sm text-brand-dark">
                            {ss.title}
                            {ssWeight > 0 && <span className="text-xs font-semibold text-brand-green ml-1.5">· {ssWeight}%</span>}
                          </p>
                          <ul className="ml-4">
                            {ss.units.map((u: any, ui: number) => (
                              <li key={ui} className="text-xs text-brand-muted">
                                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${u.type === "VIDEO" ? "bg-blue-500" : u.type === "QUIZ" ? "bg-yellow-500" : "bg-purple-500"}`} />
                                {u.title} — <span className="text-brand-muted">{u.type.toLowerCase()}{u.type !== "VIDEO" ? ` · ${u.detail}` : ""}{u.weight > 0 ? ` · ${u.weight}%` : ""}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </details>

            {p.warnings?.length > 0 && (
              <details className="rounded-xl border border-amber-200 bg-amber-50">
                <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-amber-800">
                  {p.warnings.length} warning{p.warnings.length === 1 ? "" : "s"}
                </summary>
                <ul className="list-disc ml-9 mr-4 mb-3 text-xs text-amber-800 space-y-0.5">
                  {p.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                </ul>
              </details>
            )}

            {(blocked || renamed) && (
              <div className={`rounded-xl border p-4 ${blocked ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}>
                {clash && (
                  <>
                    <p className="text-sm font-semibold text-red-800 mb-1">This name or number is already used in {project}.</p>
                    <ul className="list-disc ml-5 text-sm text-red-800 space-y-0.5 mb-2">
                      {it.existing?.nameClash && <li>The name “{it.existing.nameClash.title}” is already used by <strong>{it.existing.nameClash.code}</strong>.</li>}
                      {it.existing?.codeClash && <li>The number <strong>{it.existing.codeClash.code}</strong> is already used by “{it.existing.codeClash.title}”.</li>}
                    </ul>
                    <p className="text-xs text-red-800 mb-3">Change the name or number of the course you&apos;re uploading before importing it.</p>
                  </>
                )}
                {inBatch && (
                  <>
                    <p className="text-sm font-semibold text-red-800 mb-1">Another file in this import uses the same name or number in {project}.</p>
                    <ul className="list-disc ml-5 text-sm text-red-800 space-y-0.5 mb-2">
                      {batchClashes.map((b, i) => (
                        <li key={i}>
                          {b.kind === "both" ? <>Same name and number as <strong>{b.file}</strong> ({b.code} · “{b.title}”).</>
                            : b.kind === "name" ? <>Same name as <strong>{b.file}</strong> ({b.code}).</>
                            : <>Same number <strong>{b.code}</strong> as <strong>{b.file}</strong> (“{b.title}”).</>}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-red-800 mb-3">Remove one of the files, or change the name or number below.</p>
                  </>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-3">
                  <div>
                    <label className="bms-admin-label">Number</label>
                    <input className="auth-input" value={it.code} disabled={locked} onChange={(e) => onEditNameNumber({ code: e.target.value.toUpperCase() })} />
                  </div>
                  <div>
                    <label className="bms-admin-label">Name</label>
                    <input className="auth-input" value={it.title} disabled={locked} onChange={(e) => onEditNameNumber({ title: e.target.value })} />
                  </div>
                </div>
                <p className="text-xs mt-2 text-brand-muted">
                  {!it.title.trim() || !it.code.trim()
                    ? "Name and number can't be empty."
                    : it.checking
                      ? "Checking…"
                      : !blocked && !it.existing?.credential && <span className="text-green-700">✓ No clash in {project}. Ready to import.</span>}
                </p>
              </div>
            )}

            {it.existing?.credential && (() => {
              const inProgs = progsUsingCred(it.existing.credential.id);
              const name = `credConflict-${it.id}`;
              return (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900 mb-2">
                    “{it.existing.credential.title}” ({it.existing.credential.code}) has already been imported in {p.project || "this project"}.
                  </p>
                  <label className="flex items-start gap-2 text-sm text-amber-900 mb-1.5">
                    <input type="radio" name={name} checked={it.conflictChoice === "skip"} disabled={locked} onChange={() => onChange({ conflictChoice: "skip" })} className="mt-0.5" />
                    <span>
                      <strong>Discard this upload</strong> and keep the existing micro-credential unchanged.
                      {it.programmeId && " It will still be added to the selected programme."}
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-sm text-amber-900">
                    <input type="radio" name={name} checked={it.conflictChoice === "replace"} disabled={locked} onChange={() => onChange({ conflictChoice: "replace" })} className="mt-0.5" />
                    <span>
                      <strong>Re-import</strong> and replace the existing one with this file. This permanently deletes the current micro-credential, its units and every learner’s enrolment and progress for it
                      {inProgs.length > 0 ? `, and removes it from ${inProgs.join(", ")}.` : "."}
                    </span>
                  </label>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
