// Open edX course export (OLX) → BMS micro-credential importer.
//
// An OLX export is a gzip-compressed tarball with this shape:
//
//   course/course.xml                     – manifest (org, course, run)
//   course/course/<run>.xml               – course node: attributes + chapter refs
//   course/policies/<run>/policy.json     – display_name, project, course_image …
//   course/policies/<run>/grading_policy.json
//   course/about/overview.html            – context + learning objectives
//   course/chapter/<id>.xml               – section: display_name + sequential refs
//   course/sequential/<id>.xml            – subsection: display_name + vertical refs
//   course/vertical/<id>.xml              – unit: video / problem / html children
//   course/video/<id>.xml                 – youtube id / html5 sources
//   course/problem/<id>.xml               – multiple-choice question
//   course/html/<id>.html                 – raw HTML (here: an <iframe> to a PDF)
//   course/static/<file>                  – images and PDFs
//
// We flatten that into the MicroCredential → Section → Subsection → Unit tree.

import zlib from "zlib";
import { Readable } from "stream";
import * as tar from "tar-stream";

/* ─── Output shape ─────────────────────────────────────────── */

export interface ParsedQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface ParsedUnit {
  title: string;
  type: "VIDEO" | "QUIZ" | "PRESENTATION";
  videoUrl?: string;
  file?: { base64: string; mime: string; name: string };
  questions?: ParsedQuestion[];
  /** % of the credential's overall grade this unit is worth (0 if ungraded). */
  weight?: number;
}

export interface ParsedSubsection {
  title: string;
  units: ParsedUnit[];
}

export interface ParsedSection {
  title: string;
  subsections: ParsedSubsection[];
}

export interface ParsedCourse {
  title: string;
  code: string;
  project: string;
  developedBy: string | null;
  description: string | null;
  overview: string | null;
  objectives: string | null;
  passGrade: number;
  image?: { base64: string; mime: string; name: string };
  sections: ParsedSection[];
  warnings: string[];
  /** Suggested micro-programme to place the credential in. */
  programme: { code: string; title: string; project: string };
  counts: { sections: number; subsections: number; units: number; videos: number; quizzes: number; presentations: number; questions: number };
}

/* ─── Tar extraction ───────────────────────────────────────── */

export async function extractTarGz(buf: Buffer): Promise<Map<string, Buffer>> {
  let input: Buffer;
  // Gzip magic bytes 1f 8b. Accept a plain .tar too.
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    input = zlib.gunzipSync(buf);
  } else {
    input = buf;
  }

  const files = new Map<string, Buffer>();
  const extract = tar.extract();

  await new Promise<void>((resolve, reject) => {
    extract.on("entry", (header, stream, next) => {
      if (header.type !== "file") {
        stream.resume();
        stream.on("end", next);
        return;
      }
      const chunks: Buffer[] = [];
      stream.on("data", (c: unknown) => chunks.push(c as Buffer));
      stream.on("end", () => {
        files.set(normalizeEntryName(header.name), Buffer.concat(chunks));
        next();
      });
      stream.on("error", reject);
    });
    extract.on("finish", resolve);
    extract.on("error", reject);
    Readable.from(input).pipe(extract);
  });

  return files;
}

function normalizeEntryName(name: string): string {
  return name.replace(/^\.\//, "").replace(/\\/g, "/");
}

/* ─── Small XML / HTML helpers ─────────────────────────────── */

function attr(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`));
  return m ? m[1] : null;
}

/** All `url_name` values for a given child tag, in document order. */
function childRefs(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*\\burl_name\\s*=\\s*"([^"]+)"`, "g");
  return [...xml.matchAll(re)].map((m) => m[1]);
}

/** The child elements of a vertical, in order, with their tag + url_name. */
function verticalChildren(xml: string): { tag: string; ref: string }[] {
  const re = /<(video|problem|html|discussion|openassessment|drag-and-drop-v2|lti_consumer)\b[^>]*\burl_name\s*=\s*"([^"]+)"/g;
  return [...xml.matchAll(re)].map((m) => ({ tag: m[1], ref: m[2] }));
}

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#39;": "'", "&apos;": "'", "&rsquo;": "’", "&lsquo;": "‘",
  "&ldquo;": "“", "&rdquo;": "”", "&mdash;": "—", "&ndash;": "–",
  "&hellip;": "…", "&deg;": "°",
};

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<\/(p|li|div|section|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mimeForFile(name: string): string {
  const ext = name.toLowerCase().split(".").pop() || "";
  return (
    { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml" } as Record<string, string>
  )[ext] || "application/octet-stream";
}

/* ─── Main parser ──────────────────────────────────────────── */

export function parseOlx(files: Map<string, Buffer>): ParsedCourse {
  const warnings: string[] = [];
  const text = (key: string): string | null => {
    const b = files.get(key);
    return b ? b.toString("utf8") : null;
  };

  // Locate the archive root: the folder containing `course.xml`.
  const manifestKey = [...files.keys()].find((k) => /(^|\/)course\.xml$/.test(k));
  if (!manifestKey) throw new Error("Not an Open edX export: course.xml not found.");
  const prefix = manifestKey.slice(0, manifestKey.length - "course.xml".length); // e.g. "course/"

  const manifest = text(manifestKey) || "";
  const run = attr(manifest, "url_name") || "course";
  const org = attr(manifest, "org") || "";
  const courseId = attr(manifest, "course") || "";

  // Course node + policy.
  const courseNode = text(`${prefix}course/${run}.xml`) || manifest;
  const policyRaw = text(`${prefix}policies/${run}/policy.json`);
  let policy: any = {};
  if (policyRaw) {
    try {
      const parsed = JSON.parse(policyRaw);
      policy = parsed[`course/${run}`] || Object.values(parsed)[0] || {};
    } catch {
      warnings.push("Could not parse policy.json — course metadata may be incomplete.");
    }
  }

  const title =
    policy.display_name ||
    attr(courseNode, "display_name") ||
    courseId ||
    "Imported course";

  const project =
    policy.other_course_settings?.project ||
    (() => {
      const m = attr(courseNode, "other_course_settings");
      if (m) {
        try { return JSON.parse(m.replace(/&quot;/g, '"')).project; } catch { /* ignore */ }
      }
      return "";
    })() ||
    "";

  // Code: "MC09_RESSKILL" → "MC09"; else the whole course id.
  const code = (courseId.split(/[_\-]/)[0] || courseId || "MC").toUpperCase();

  // Pass grade from grading_policy GRADE_CUTOFFS.Pass (fraction → %).
  let passGrade = 50;
  const gradingRaw = text(`${prefix}policies/${run}/grading_policy.json`);
  if (gradingRaw) {
    try {
      const g = JSON.parse(gradingRaw);
      const cut = g?.GRADE_CUTOFFS;
      const lowest = cut ? Math.min(...(Object.values(cut) as number[])) : null;
      if (lowest && lowest > 0 && lowest < 1) passGrade = Math.round(lowest * 100);
    } catch { /* keep default */ }
  }

  // About: overview / objectives / description / author.
  let overview: string | null = null;
  let objectives: string | null = null;
  let description: string | null = null;

  const overviewHtml = text(`${prefix}about/overview.html`);
  if (overviewHtml) {
    const segments = overviewHtml
      .split(/<h2\b[^>]*>/i)
      .map((s) => htmlToText(s))
      .filter(Boolean);
    let background: string | null = null;
    for (const seg of segments) {
      if (/^context and overview/i.test(seg)) overview = seg.replace(/^context and overview\s*/i, "").trim();
      else if (/^learning objectives/i.test(seg)) objectives = seg.replace(/^learning objectives\s*/i, "").trim();
      else if (/^background/i.test(seg)) background = seg.replace(/^background\s*/i, "").trim();
    }
    if (!overview && segments.length) overview = segments.join("\n\n");
    if (background) overview = `${overview || ""}\n\nBackground\n${background}`.trim();
  }

  const shortDesc = text(`${prefix}about/short_description.html`);
  if (shortDesc && htmlToText(shortDesc)) description = htmlToText(shortDesc);
  else if (overview) {
    const firstSentence = overview.split(/(?<=[.!?])\s/)[0];
    description = firstSentence.length > 280 ? firstSentence.slice(0, 277) + "…" : firstSentence;
  }

  let developedBy: string | null = null;
  const sidebar = text(`${prefix}about/about_sidebar_html.html`);
  if (sidebar) {
    const author = sidebar.match(/class="course_author">([^<]+)</)?.[1]?.trim();
    const uni = sidebar.match(/class="university_info">([^<]+)</)?.[1]?.trim();
    developedBy = [author, uni].filter(Boolean).join(", ") || null;
  }
  if (!developedBy && org) developedBy = org;

  // Course image.
  let image: ParsedCourse["image"];
  const imageName = policy.course_image || attr(courseNode, "course_image");
  if (imageName) {
    const imgKey = findStatic(files, prefix, imageName);
    if (imgKey) {
      image = { base64: files.get(imgKey)!.toString("base64"), mime: mimeForFile(imgKey), name: imageName };
    } else {
      warnings.push(`Course image "${imageName}" was referenced but not found in static/.`);
    }
  }

  /* ── Walk chapters → sequentials → verticals ── */

  const sections: ParsedSection[] = [];
  const counts = { sections: 0, subsections: 0, units: 0, videos: 0, quizzes: 0, presentations: 0, questions: 0 };
  // Sequential `format` (e.g. "TEST 10") ties a subsection to a grading_policy
  // GRADER entry — collected here so weights can be assigned in one pass below,
  // once every subsection sharing a format is known.
  const subsectionFormats: { sub: ParsedSubsection; format: string | null }[] = [];

  for (const chapRef of childRefs(courseNode, "chapter")) {
    const chapXml = text(`${prefix}chapter/${chapRef}.xml`);
    if (!chapXml) { warnings.push(`Missing chapter/${chapRef}.xml`); continue; }

    const section: ParsedSection = {
      title: attr(chapXml, "display_name") || `Section ${sections.length + 1}`,
      subsections: [],
    };

    for (const seqRef of childRefs(chapXml, "sequential")) {
      const seqXml = text(`${prefix}sequential/${seqRef}.xml`);
      if (!seqXml) { warnings.push(`Missing sequential/${seqRef}.xml`); continue; }

      const subsection: ParsedSubsection = {
        title: attr(seqXml, "display_name") || `Subsection ${section.subsections.length + 1}`,
        units: [],
      };

      for (const vertRef of childRefs(seqXml, "vertical")) {
        const vertXml = text(`${prefix}vertical/${vertRef}.xml`);
        if (!vertXml) { warnings.push(`Missing vertical/${vertRef}.xml`); continue; }

        const vertTitle = attr(vertXml, "display_name") || `Unit ${subsection.units.length + 1}`;
        const children = verticalChildren(vertXml);
        if (children.length === 0) { warnings.push(`Unit "${vertTitle}" has no recognised content — skipped.`); continue; }

        const problemRefs = children.filter((c) => c.tag === "problem").map((c) => c.ref);
        const videoRefs = children.filter((c) => c.tag === "video").map((c) => c.ref);
        const htmlRefs = children.filter((c) => c.tag === "html").map((c) => c.ref);
        const unknown = children.filter((c) => !["problem", "video", "html"].includes(c.tag));
        for (const u of unknown) warnings.push(`Unit "${vertTitle}" contains an unsupported "${u.tag}" component — skipped.`);

        // Quiz: all problems in the vertical become one QUIZ unit.
        if (problemRefs.length) {
          const questions: ParsedQuestion[] = [];
          for (const pRef of problemRefs) {
            const pXml = text(`${prefix}problem/${pRef}.xml`);
            if (!pXml) { warnings.push(`Missing problem/${pRef}.xml`); continue; }
            const q = parseProblem(pXml);
            if (q) questions.push(q);
            else warnings.push(`Question in "${vertTitle}" is not multiple-choice — skipped.`);
          }
          if (questions.length) {
            subsection.units.push({ title: vertTitle, type: "QUIZ", questions });
            counts.quizzes++;
            counts.questions += questions.length;
            counts.units++;
          }
        }

        // Videos: one VIDEO unit per video component.
        videoRefs.forEach((vRef, i) => {
          const vXml = text(`${prefix}video/${vRef}.xml`);
          if (!vXml) { warnings.push(`Missing video/${vRef}.xml`); return; }
          const url = videoUrlFrom(vXml);
          if (!url) { warnings.push(`Video in "${vertTitle}" has no usable URL — skipped.`); return; }
          const t = videoRefs.length > 1 ? `${vertTitle} (${i + 1})` : vertTitle;
          subsection.units.push({ title: t, type: "VIDEO", videoUrl: url });
          counts.videos++;
          counts.units++;
        });

        // HTML: only supported when it embeds a static PDF.
        htmlRefs.forEach((hRef) => {
          const body = text(`${prefix}html/${hRef}.html`) ?? "";
          const src = body.match(/(?:src|href)\s*=\s*["']([^"']*\/static\/[^"']+|\/static\/[^"']+)["']/i)?.[1]
            || body.match(/\/static\/([^\s"'<>]+\.pdf)/i)?.[0];
          if (!src) {
            const asText = htmlToText(body);
            warnings.push(
              asText
                ? `Unit "${vertTitle}" is an HTML page with no PDF — skipped (content: "${asText.slice(0, 60)}…").`
                : `Unit "${vertTitle}" is an empty HTML page — skipped.`
            );
            return;
          }
          const fileRef = decodeURIComponent(src.split("/static/").pop() || "");
          const key = findStatic(files, prefix, fileRef);
          if (!key) { warnings.push(`Unit "${vertTitle}" references "${fileRef}" which is missing from static/.`); return; }
          subsection.units.push({
            title: vertTitle,
            type: "PRESENTATION",
            file: { base64: files.get(key)!.toString("base64"), mime: mimeForFile(key), name: fileRef },
          });
          counts.presentations++;
          counts.units++;
        });
      }

      if (subsection.units.length) {
        section.subsections.push(subsection);
        counts.subsections++;
        subsectionFormats.push({ sub: subsection, format: attr(seqXml, "format") });
      } else {
        warnings.push(`Subsection "${subsection.title}" has no importable units — skipped.`);
      }
    }

    if (section.subsections.length) {
      sections.push(section);
      counts.sections++;
    } else {
      warnings.push(`Section "${section.title}" has no importable subsections — skipped.`);
    }
  }

  assignGradedWeights(subsectionFormats, gradingRaw, warnings);

  return {
    title,
    code,
    project,
    developedBy,
    description,
    overview,
    objectives,
    passGrade,
    image,
    sections,
    warnings,
    programme: { code: project || code, title: project || title, project },
    counts,
  };
}

/* ─── Component parsers ────────────────────────────────────── */

function videoUrlFrom(xml: string): string | null {
  const yt =
    attr(xml, "youtube_id_1_0") ||
    (attr(xml, "youtube") || "").split(":").pop() ||
    "";
  if (yt) return `https://www.youtube.com/watch?v=${yt}`;

  const sources = attr(xml, "html5_sources");
  if (sources) {
    try {
      const arr = JSON.parse(sources.replace(/&quot;/g, '"'));
      if (Array.isArray(arr) && arr[0]) return arr[0];
    } catch { /* ignore */ }
  }
  const encoded = xml.match(/<encoded_video\b[^>]*\burl\s*=\s*"([^"]+)"/)?.[1];
  return encoded || null;
}

/** Parse a `<problem>` with a single-answer multiple-choice response. */
function parseProblem(xml: string): ParsedQuestion | null {
  const isMC = /<multiplechoiceresponse\b/.test(xml);
  const isChoice = /<choiceresponse\b/.test(xml);
  if (!isMC && !isChoice) return null;

  const stem = xml.split(/<(?:multiplechoiceresponse|choiceresponse)\b/i)[0];
  let question = htmlToText(stem);
  // Drop a leading generic display name if that's all the stem had.
  if (!question) {
    question = htmlToText(attr(xml, "display_name") || "") || "Question";
  }

  const options: string[] = [];
  let correctIndex = -1;
  const choiceRe = /<choice\b([^>]*)>([\s\S]*?)<\/choice>/gi;
  let m: RegExpExecArray | null;
  while ((m = choiceRe.exec(xml))) {
    const isCorrect = /\bcorrect\s*=\s*"true"/i.test(m[1]);
    const label = htmlToText(m[2]);
    if (isCorrect && correctIndex === -1) correctIndex = options.length;
    options.push(label);
  }

  if (options.length < 2) return null;
  if (correctIndex === -1) correctIndex = 0;
  return { question, options, correctIndex };
}

/**
 * Turn the OLX grading policy (`GRADER: [{ type: "TEST 10", weight: 0.2, ... }]`)
 * into per-unit weights. Each subsection's `format` names a GRADER type; edX
 * splits that type's overall weight evenly across every subsection sharing it,
 * so we do the same, then hand the whole subsection's share to its quiz —
 * videos/PDFs aren't graded in edX either. Mutates the parsed units in place.
 */
function assignGradedWeights(
  subsectionFormats: { sub: ParsedSubsection; format: string | null }[],
  gradingRaw: string | null,
  warnings: string[],
): void {
  if (!gradingRaw) return;
  const graderPct = new Map<string, number>();
  try {
    const g = JSON.parse(gradingRaw);
    for (const entry of g?.GRADER || []) {
      if (entry?.type && typeof entry.weight === "number") graderPct.set(entry.type, entry.weight * 100);
    }
  } catch {
    warnings.push("Could not parse grading_policy.json — unit weights were left at 0.");
    return;
  }
  if (!graderPct.size) return;

  const formatCounts = new Map<string, number>();
  for (const { format } of subsectionFormats) {
    if (format && graderPct.has(format)) formatCounts.set(format, (formatCounts.get(format) || 0) + 1);
  }

  let totalAssigned = 0;
  for (const { sub, format } of subsectionFormats) {
    if (!format) continue;
    if (!graderPct.has(format)) {
      warnings.push(`Subsection "${sub.title}" has grading format "${format}" with no matching entry in grading_policy.json — its weight was left at 0%.`);
      continue;
    }
    const subPct = graderPct.get(format)! / (formatCounts.get(format) || 1);
    const quizUnits = sub.units.filter((u) => u.type === "QUIZ");
    if (quizUnits.length === 0) {
      if (subPct > 0) warnings.push(`Subsection "${sub.title}" is worth ${Math.round(subPct)}% of the grade in the source course but has no quiz to carry that weight — it was left at 0%.`);
      continue;
    }
    const each = Math.round(subPct / quizUnits.length);
    for (const u of quizUnits) { u.weight = each; totalAssigned += each; }
  }

  if (totalAssigned > 100) {
    const scale = 100 / totalAssigned;
    for (const { sub } of subsectionFormats) {
      for (const u of sub.units) if (u.weight) u.weight = Math.round(u.weight * scale);
    }
    warnings.push(`Imported unit weights summed to ${totalAssigned}% and were scaled down to fit 100%.`);
  }
}

/** Case-insensitive lookup inside `<prefix>static/`. */
function findStatic(files: Map<string, Buffer>, prefix: string, name: string): string | null {
  const want = `${prefix}static/${name}`.toLowerCase();
  const bare = name.toLowerCase();
  for (const key of files.keys()) {
    if (key.toLowerCase() === want) return key;
  }
  for (const key of files.keys()) {
    if (key.toLowerCase().startsWith(`${prefix}static/`.toLowerCase()) && key.toLowerCase().endsWith(`/${bare}`)) return key;
  }
  return null;
}
