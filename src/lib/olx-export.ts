// BMS micro-credential → Open edX course export (OLX, a .tar.gz), the format
// "Import courses" reads (src/lib/olx-import.ts), so an exported course can be
// imported again here (as a copy, or over the original), or into Open edX.
//
//   course/course.xml                     – manifest (org, course number, run)
//   course/course/BMS.xml                 – course node: chapter refs
//   course/policies/BMS/policy.json       – name, number, project, topic, image
//   course/policies/BMS/grading_policy.json – pass grade, graded subsections
//   course/about/*.html                   – overview, objectives, description, authors
//   course/chapter|sequential|vertical/   – sections, subsections, units
//   course/video/<id>.xml                 – YouTube id, or the link as an html5 source
//   course/problem/<id>.xml               – one multiple-choice problem per question
//   course/html/<id>.html                 – a link to (and, for PDFs, a view of) the unit's file
//   course/static/                        – the course image and unit files
//   course/bms.json                       – what OLX can't hold exactly (see BmsManifest)
//
// Each BMS unit is one vertical, so its id names the vertical in bms.json.

import zlib from "zlib";
import * as tar from "tar-stream";
import { ORGANISATIONS } from "@/data/organisations";

/** File in the archive's course folder with the BMS details OLX can't carry exactly. */
export const BMS_MANIFEST = "bms.json";

/**
 * Open edX keeps only some of a micro-credential's details, and changes others
 * on the way (codes in capitals, unit weights per subsection, YouTube links
 * rewritten). The importer prefers these exact values when the file has them.
 */
export interface BmsManifest {
  format: "bms-credential";
  version: 1;
  exportedAt: string;
  credential: {
    title: string;
    code: string;
    project: string;
    organisation: string | null;
    developedBy: string | null;
    topic: string | null;
    description: string | null;
    overview: string | null;
    objectives: string | null;
    passGrade: number;
  };
  /** By vertical url_name (the unit's id). */
  units: Record<string, { weight: number; videoUrl?: string; fileName?: string }>;
}

type Bytes = Uint8Array | null;

export interface ExportUnit {
  id: string;
  title: string;
  /** VIDEO, QUIZ or PRESENTATION (the database's unused EXAM type isn't exported). */
  type: string;
  weight: number;
  videoUrl: string | null;
  fileKey: string | null;
  fileName: string | null;
  fileMime: string | null;
  questions: { id: string; title: string | null; question: string; options: string[]; correctIndex: number; maxAttempts: number | null }[];
}

export interface ExportCredential {
  id: string;
  title: string;
  slug: string;
  code: string;
  project: string;
  description: string | null;
  overview: string | null;
  objectives: string | null;
  developedBy: string | null;
  organisation: string | null;
  topic: string | null;
  passGrade: number;
  image: string | null;
  imageData: Bytes;
  imageMime: string | null;
  sections: { id: string; title: string; subsections: { id: string; title: string; units: ExportUnit[] }[] }[];
}

const RUN = "BMS";

/** Text for an XML attribute or element. */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Plain text as HTML paragraphs: blank lines separate paragraphs, single line breaks stay. */
function textToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

function youTubeId(url: string): string | null {
  return url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null;
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg",
};

/** Names for files in static/, unique ignoring case (the importer looks them up that way). */
function staticNames() {
  const used = new Set<string>();
  return (name: string): string => {
    const clean = name.replace(/[\/\\\x00-\x1f]/g, "_").trim() || "file";
    const dot = clean.lastIndexOf(".");
    const base = dot > 0 ? clean.slice(0, dot) : clean;
    const ext = dot > 0 ? clean.slice(dot) : "";
    let candidate = clean;
    for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${base} (${n})${ext}`;
    used.add(candidate.toLowerCase());
    return candidate;
  };
}

/** "/static/<name>" for an href or src: the importer decodes it, and must not stop at a quote. */
function staticUrl(name: string): string {
  return `/static/${encodeURIComponent(name).replace(/'/g, "%27")}`;
}

async function tarGz(entries: { name: string; data: Buffer }[]): Promise<Buffer> {
  const pack = tar.pack();
  const gzip = zlib.createGzip();
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    gzip.on("data", (c: Buffer) => chunks.push(c));
    gzip.on("end", () => resolve(Buffer.concat(chunks)));
    gzip.on("error", reject);
    pack.on("error", reject);
  });
  pack.pipe(gzip);
  const mtime = new Date();
  for (const e of entries) {
    await new Promise<void>((resolve, reject) => {
      pack.entry({ name: e.name, mtime }, e.data, (err) => (err ? reject(err) : resolve()));
    });
  }
  pack.finalize();
  return done;
}

/** Runs `fn` over `items`, `limit` at a time, keeping their order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

/** Where a micro-credential's latest export is kept in S3 (each export replaces it). */
export function exportKey(credentialId: string): string {
  return `olx-exports/${credentialId}.tar.gz`;
}

/** The archive's file name: "MC01-course-title.tar.gz". */
export function exportFileName(c: Pick<ExportCredential, "code" | "slug">): string {
  const safe = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return `${[safe(c.code), safe(c.slug)].filter(Boolean).join("-") || "micro-credential"}.tar.gz`;
}

/**
 * Builds the archive. `loadFile` returns a presentation unit's file (from S3 or
 * the database), or null if it's missing. `warnings` list what won't come back
 * as it is when the archive is imported.
 */
export async function buildOlxExport(
  c: ExportCredential,
  loadFile: (unit: ExportUnit) => Promise<Buffer | null>,
): Promise<{ archive: Buffer; fileName: string; warnings: string[] }> {
  const warnings: string[] = [];
  const entries: { name: string; data: Buffer }[] = [];
  const add = (path: string, content: string | Buffer) =>
    entries.push({ name: `course/${path}`, data: typeof content === "string" ? Buffer.from(content, "utf8") : content });
  const staticName = staticNames();

  const manifest: BmsManifest = {
    format: "bms-credential",
    version: 1,
    exportedAt: new Date().toISOString(),
    credential: {
      title: c.title, code: c.code, project: c.project, organisation: c.organisation, developedBy: c.developedBy,
      topic: c.topic, description: c.description, overview: c.overview, objectives: c.objectives, passGrade: c.passGrade,
    },
    units: {},
  };

  // Course image.
  let courseImage: string | null = null;
  if (c.imageData && c.imageData.length) {
    courseImage = staticName(`course_image.${IMAGE_EXTENSIONS[c.imageMime || ""] || "png"}`);
    add(`static/${courseImage}`, Buffer.from(c.imageData));
  } else if (c.image) {
    warnings.push("The course image is a link, not an uploaded image, so it isn't in the file.");
  }

  // Unit files, fetched a few at a time.
  const presentations = c.sections.flatMap((s) => s.subsections.flatMap((ss) => ss.units)).filter((u) => u.type === "PRESENTATION");
  const files = new Map<string, Buffer | null>();
  await mapLimit(presentations, 4, async (u) => {
    files.set(u.id, u.fileKey || u.fileName ? await loadFile(u).catch(() => null) : null);
  });

  // Sections → subsections → units. Every subsection holding weighted units
  // gets its own grading type, worth those units' total.
  const grader: { type: string; short_label: string; min_count: number; drop_count: number; weight: number }[] = [];
  const chapterRefs: string[] = [];

  for (const s of c.sections) {
    chapterRefs.push(s.id);
    if (s.subsections.length === 0) warnings.push(`Section “${s.title}” is empty. Empty sections are left out when the file is imported.`);
    const seqRefs: string[] = [];

    for (const ss of s.subsections) {
      seqRefs.push(ss.id);
      if (ss.units.length === 0) warnings.push(`Subsection “${ss.title}” is empty. Empty subsections are left out when the file is imported.`);
      const vertRefs: string[] = [];

      for (const u of ss.units) {
        vertRefs.push(u.id);
        const unitInfo: BmsManifest["units"][string] = { weight: Number(u.weight) || 0 };
        const children: string[] = [];

        if (u.type === "VIDEO") {
          const url = (u.videoUrl || "").trim();
          if (!url) {
            warnings.push(`Video unit “${u.title}” has no video link, so it won't be imported.`);
          } else {
            const yt = youTubeId(url);
            const source = yt ? `youtube="1.00:${yt}" youtube_id_1_0="${yt}"` : `html5_sources="${esc(JSON.stringify([url]))}"`;
            add(`video/${u.id}.xml`, `<video url_name="${u.id}" display_name="${esc(u.title)}" ${source}/>\n`);
            children.push(`<video url_name="${u.id}"/>`);
            unitInfo.videoUrl = url;
          }
        } else if (u.type === "QUIZ") {
          if (u.questions.length === 0) warnings.push(`Quiz “${u.title}” has no questions, so it won't be imported.`);
          for (const q of u.questions) {
            const attrs = [
              q.title ? `display_name="${esc(q.title)}"` : "",
              q.maxAttempts ? `max_attempts="${q.maxAttempts}"` : "",
            ].filter(Boolean).join(" ");
            const choices = q.options
              .map((o, i) => `      <choice correct="${i === q.correctIndex ? "true" : "false"}">${esc(o)}</choice>`)
              .join("\n");
            add(`problem/${q.id}.xml`, [
              `<problem${attrs ? ` ${attrs}` : ""}>`,
              `  <multiplechoiceresponse>`,
              `    <label>${esc(q.question).replace(/\n/g, "<br/>")}</label>`,
              `    <choicegroup type="MultipleChoice">`,
              choices,
              `    </choicegroup>`,
              `  </multiplechoiceresponse>`,
              `</problem>`,
              ``,
            ].join("\n"));
            children.push(`<problem url_name="${q.id}"/>`);
          }
        } else if (u.type === "PRESENTATION") {
          const data = files.get(u.id);
          if (!data) {
            warnings.push(`The file of unit “${u.title}” couldn't be found, so the unit won't be imported.`);
          } else {
            const original = u.fileName || "file";
            const name = staticName(original);
            add(`static/${name}`, data);
            const href = staticUrl(name);
            const isPdf = u.fileMime === "application/pdf" || /\.pdf$/i.test(name);
            add(`html/${u.id}.xml`, `<html filename="${u.id}" display_name="${esc(u.title)}"/>\n`);
            add(`html/${u.id}.html`,
              `<p><a href="${href}">${esc(original)}</a></p>\n` +
              (isPdf ? `<iframe src="${href}" title="${esc(u.title)}" width="100%" height="700"></iframe>\n` : ""));
            children.push(`<html url_name="${u.id}"/>`);
            unitInfo.fileName = original;
          }
        } else {
          warnings.push(`Unit “${u.title}” is of a type (${u.type}) that can't be exported, so it won't be imported.`);
        }

        manifest.units[u.id] = unitInfo;
        add(`vertical/${u.id}.xml`, [`<vertical display_name="${esc(u.title)}">`, ...children.map((x) => `  ${x}`), `</vertical>`, ``].join("\n"));
      }

      const weight = ss.units.reduce((sum, u) => sum + (Number(u.weight) || 0), 0);
      let grading = "";
      if (weight > 0) {
        const type = `Graded ${grader.length + 1}`;
        grader.push({ type, short_label: `G${grader.length + 1}`, min_count: 1, drop_count: 0, weight: weight / 100 });
        grading = ` graded="true" format="${type}"`;
      }
      add(`sequential/${ss.id}.xml`, [`<sequential display_name="${esc(ss.title)}"${grading}>`, ...vertRefs.map((r) => `  <vertical url_name="${r}"/>`), `</sequential>`, ``].join("\n"));
    }

    add(`chapter/${s.id}.xml`, [`<chapter display_name="${esc(s.title)}">`, ...seqRefs.map((r) => `  <sequential url_name="${r}"/>`), `</chapter>`, ``].join("\n"));
  }

  // Course, policies and about pages.
  const org = Object.entries(ORGANISATIONS).find(([, name]) => name.toLowerCase() === (c.organisation || "").trim().toLowerCase())?.[0] || "BMS";
  const number = c.code.replace(/[^A-Za-z0-9_.-]+/g, "_") || "MC";
  add("course.xml", `<course url_name="${RUN}" org="${esc(org)}" course="${esc(number)}"/>\n`);
  add(`course/${RUN}.xml`, [`<course display_name="${esc(c.title)}"${courseImage ? ` course_image="${esc(courseImage)}"` : ""}>`, ...chapterRefs.map((r) => `  <chapter url_name="${r}"/>`), `</course>`, ``].join("\n"));
  add(`policies/${RUN}/policy.json`, JSON.stringify({
    [`course/${RUN}`]: {
      display_name: c.title,
      display_coursenumber: c.code,
      ...(c.organisation ? { display_organization: c.organisation } : {}),
      ...(courseImage ? { course_image: courseImage } : {}),
      other_course_settings: { project: c.project, ...(c.topic ? { topic: c.topic } : {}) },
    },
  }, null, 2) + "\n");
  add(`policies/${RUN}/grading_policy.json`, JSON.stringify({ GRADER: grader, GRADE_CUTOFFS: { Pass: c.passGrade / 100 } }, null, 2) + "\n");

  const about = [
    c.overview?.trim() ? `<section class="about">\n<h2>Context and overview</h2>\n${textToHtml(c.overview)}\n</section>` : "",
    c.objectives?.trim() ? `<section class="about">\n<h2>Learning objectives</h2>\n${textToHtml(c.objectives)}\n</section>` : "",
  ].filter(Boolean).join("\n");
  if (about) add("about/overview.html", about + "\n");
  if (c.description?.trim()) add("about/short_description.html", textToHtml(c.description) + "\n");
  // An importer reads "authors, university" back from these two lines, so the
  // university goes on its own line only when "Developed by" ends with it.
  const developedBy = c.developedBy?.trim() || "";
  const university = c.organisation?.trim() || "";
  const endsWithUniversity = !!university && developedBy.toLowerCase().endsWith(`, ${university.toLowerCase()}`);
  const author = endsWithUniversity ? developedBy.slice(0, -(university.length + 2)).trim() : developedBy;
  const sidebar = [
    author ? `<p class="course_author">${esc(author)}</p>` : "",
    endsWithUniversity ? `<p class="university_info">${esc(university)}</p>` : "",
  ].filter(Boolean).join("\n");
  if (sidebar) add("about/about_sidebar_html.html", sidebar + "\n");

  add(BMS_MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

  const archive = await tarGz(entries);
  if (archive.length > 200 * 1024 * 1024) {
    warnings.push(`The file is ${Math.round(archive.length / 1024 / 1024)} MB. "Import courses" accepts files up to 200 MB.`);
  }
  return { archive, fileName: exportFileName(c), warnings };
}
