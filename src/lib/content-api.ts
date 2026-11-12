// The content API: lets an AI agent (or a script) enter micro-credentials on
// the site. It can read what exists, create micro-credentials with all their
// content, update drafts, and upload lesson files. Served by /api/content/*;
// content-catalogue.ts describes the endpoints for the agent. What it creates
// is a draft, which learners don't see until an admin publishes it in the
// admin panel. It can only change drafts: once published, a micro-credential
// is changed by admins only. Publishing and deleting are left to admins too.
//
// It saves through the same code as the admin editor (credential-sync.ts), so
// learners keep their progress when a micro-credential they're taking changes.
// Its input is checked more strictly than the editor's, and every problem is
// reported at once with where it is, so an agent can fix them all in one go.
// Saves that would delete learners' progress are refused unless asked for.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkApiAccess, type ApiCaller } from "@/lib/api-key";
import { checkUnitFileKeys } from "@/lib/admin";
import { syncCredentialContent } from "@/lib/credential-sync";
import { exceedsFullWeight, formatWeight, isFullWeight } from "@/lib/weights";
import { createUploadUrl, deleteObject, isS3Configured } from "@/lib/s3";

// ─── Access and errors ──────────────────────────────────────

/** Input the API can't accept: a 400 (or `status`) listing every problem. */
export class ContentInputError extends Error {
  constructor(public problems: string[], public status = 400, message?: string) {
    super(message ?? (problems.length === 1 ? problems[0] : `There are ${problems.length} problems.`));
  }
}

/**
 * Wraps a content API handler: access (a signed-in site admin, or
 * `Authorization: Bearer <CONTENT_API_KEY>`), errors, and no caching.
 */
export function contentRoute<C>(handler: (req: NextRequest, ctx: C, caller: ApiCaller) => Promise<unknown>) {
  return async (req: NextRequest, ctx: C) => {
    const caller = await checkApiAccess(req, process.env.CONTENT_API_KEY);
    if (caller instanceof NextResponse) return caller;
    try {
      if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
      const body = await handler(req, ctx, caller);
      if (body instanceof NextResponse) return body;
      return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
    } catch (err: any) {
      if (err instanceof ContentInputError) {
        return NextResponse.json({ error: err.message, problems: err.problems }, { status: err.status });
      }
      if (err?.code === "P2002") {
        return NextResponse.json({ error: "Another micro-credential already uses that slug." }, { status: 409 });
      }
      console.error("Content API error:", err);
      return NextResponse.json({ error: "Failed." }, { status: 500 });
    }
  };
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ContentInputError(["The request body must be JSON."]);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ContentInputError(["The request body must be a JSON object."]);
  }
  return body as Record<string, unknown>;
}

/** ?name=true */
export function flag(req: NextRequest, name: string): boolean {
  return ["true", "1", "yes"].includes((req.nextUrl.searchParams.get(name) ?? "").toLowerCase());
}

function who(caller: ApiCaller): string {
  return caller.via === "key" ? "API key" : `admin ${caller.userId}`;
}

// ─── Input ──────────────────────────────────────────────────

export const UNIT_TYPES = ["VIDEO", "QUIZ", "PRESENTATION"] as const;
export const IMAGE_TYPES = ["image/png", "image/jpeg"] as const;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Lesson files a presentation unit can have, as in the admin editor. */
export const FILE_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
};

function fileExtension(name: string): string {
  return (/\.[A-Za-z0-9]+$/.exec(name)?.[0] ?? "").toLowerCase();
}

/** Limits on text fields (characters). */
const MAX = {
  title: 200, code: 50, slug: 100, project: 100, description: 2000, overview: 20000, objectives: 20000,
  developedBy: 500, organisation: 200, topic: 100, partTitle: 300, url: 1000, fileKey: 500, fileName: 255,
  question: 5000, option: 1000,
};
const MAX_SECTIONS = 100;
const MAX_UNITS = 500;
const MAX_OPTIONS = 10;

interface QuestionIn { id?: string; title: string | null; question: string; options: string[]; correctIndex: number; maxAttempts: number | null }
interface UnitIn {
  id?: string; title: string; type: (typeof UNIT_TYPES)[number]; weight: number; videoUrl: string | null;
  fileKey?: string; fileName?: string; fileMime?: string; removeFile?: boolean; questions?: QuestionIn[];
}
interface SubsectionIn { id?: string; title: string; units: UnitIn[] }
interface SectionIn { id?: string; title: string; subsections: SubsectionIn[] }

/** Collects every problem with where it is, e.g. `sections[0].subsections[1].units[2].weight: …`. */
class Checker {
  problems: string[] = [];
  warnings: string[] = [];

  problem(path: string, message: string) {
    if (this.problems.length < 50) this.problems.push(path ? `${path}: ${message}` : message);
  }

  warn(path: string, message: string) {
    if (this.warnings.length < 50) this.warnings.push(path ? `${path}: ${message}` : message);
  }

  /** A plain object; reports keys it doesn't know (typos), skipping `ignored` ones (read-only fields sent back). */
  object(value: unknown, path: string, allowed: readonly string[], ignored: readonly string[] = []): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      this.problem(path, "must be an object.");
      return null;
    }
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key) && !ignored.includes(key)) {
        this.problem(path ? `${path}.${key}` : key, `isn't a field here. Allowed: ${allowed.join(", ")}.`);
      }
    }
    return value as Record<string, unknown>;
  }

  /** Text: undefined when missing, null when null or blank (and not required), else trimmed. */
  text(obj: Record<string, unknown>, key: string, path: string, max: number, required = false): string | null | undefined {
    const value = obj[key];
    const where = path ? `${path}.${key}` : key;
    if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
      if (required) this.problem(where, "is required.");
      return value === undefined ? undefined : null;
    }
    if (typeof value !== "string") {
      this.problem(where, "must be text.");
      return undefined;
    }
    const text = value.trim();
    if (text.length > max) this.problem(where, `is too long (${text.length} characters, at most ${max}).`);
    return text;
  }

  id(obj: Record<string, unknown>, path: string): string | undefined {
    const value = obj.id;
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string" || !value) {
      this.problem(`${path}.id`, "must be an id from get_micro_credential, or left out for a new part.");
      return undefined;
    }
    return value;
  }

  list(obj: Record<string, unknown>, key: string, path: string, max: number): unknown[] {
    const value = obj[key];
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
      this.problem(`${path}.${key}`, "must be a list.");
      return [];
    }
    if (value.length > max) this.problem(`${path}.${key}`, `has ${value.length} items, at most ${max}.`);
    return value.slice(0, max);
  }
}

function parseQuestion(value: unknown, path: string, c: Checker): QuestionIn | null {
  const q = c.object(value, path, ["id", "title", "question", "options", "correctIndex", "maxAttempts"]);
  if (!q) return null;
  const question = c.text(q, "question", path, MAX.question, true) ?? "";
  const title = c.text(q, "title", path, MAX.partTitle) ?? null;

  let options: string[] = [];
  if (!Array.isArray(q.options)) {
    c.problem(`${path}.options`, "must be a list of the answers to choose from.");
  } else {
    if (q.options.length < 2 || q.options.length > MAX_OPTIONS) {
      c.problem(`${path}.options`, `must have 2 to ${MAX_OPTIONS} answers (it has ${q.options.length}).`);
    }
    options = q.options.map((o, i) => {
      if (typeof o !== "string" || !o.trim()) {
        c.problem(`${path}.options[${i}]`, "must be non-empty text.");
        return "";
      }
      if (o.trim().length > MAX.option) c.problem(`${path}.options[${i}]`, `is too long (at most ${MAX.option} characters).`);
      return o.trim();
    });
    const seen = new Set<string>();
    options.forEach((o, i) => {
      const key = o.replace(/\s+/g, " ").toLowerCase();
      if (o && seen.has(key)) c.problem(`${path}.options[${i}]`, "is the same as another answer.");
      seen.add(key);
    });
  }

  const correctIndex = q.correctIndex;
  if (!Number.isInteger(correctIndex) || (correctIndex as number) < 0 || (correctIndex as number) >= Math.max(options.length, 1)) {
    c.problem(`${path}.correctIndex`, `must be the position of the right answer in options, from 0 to ${Math.max(options.length - 1, 0)}.`);
  }

  let maxAttempts: number | null = null;
  if (q.maxAttempts !== undefined && q.maxAttempts !== null) {
    if (!Number.isInteger(q.maxAttempts) || (q.maxAttempts as number) < 1 || (q.maxAttempts as number) > 100) {
      c.problem(`${path}.maxAttempts`, "must be a whole number from 1 to 100, or null for unlimited tries.");
    } else {
      maxAttempts = q.maxAttempts as number;
    }
  }
  return { id: c.id(q, path), title, question, options, correctIndex: correctIndex as number, maxAttempts };
}

function parseUnit(value: unknown, path: string, c: Checker): UnitIn | null {
  const u = c.object(
    value, path,
    ["id", "title", "type", "weight", "videoUrl", "fileKey", "fileName", "fileMime", "removeFile", "questions"],
    ["hasFile"]
  );
  if (!u) return null;
  const title = c.text(u, "title", path, MAX.partTitle, true) ?? "";

  const type = u.type as UnitIn["type"];
  if (!UNIT_TYPES.includes(type)) {
    c.problem(`${path}.type`, `must be one of ${UNIT_TYPES.join(", ")}.`);
    return null;
  }

  let weight = 0;
  if (u.weight !== undefined && u.weight !== null) {
    if (typeof u.weight !== "number" || !Number.isFinite(u.weight) || u.weight < 0 || u.weight > 100) {
      c.problem(`${path}.weight`, "must be a number from 0 to 100 (the unit's % of the grade).");
    } else {
      weight = u.weight;
    }
  }

  const unit: UnitIn = { id: c.id(u, path), title, type, weight, videoUrl: null };

  const videoUrl = c.text(u, "videoUrl", path, MAX.url);
  if (type === "VIDEO") {
    if (videoUrl && !/^https?:\/\/\S+$/i.test(videoUrl)) c.problem(`${path}.videoUrl`, "must be a web address starting with https://.");
    unit.videoUrl = videoUrl ?? null;
    if (!videoUrl) c.warn(path, "this video unit has no videoUrl yet.");
  } else if (videoUrl) {
    c.problem(`${path}.videoUrl`, "only VIDEO units have a videoUrl.");
  }

  const fileKey = c.text(u, "fileKey", path, MAX.fileKey);
  const fileName = c.text(u, "fileName", path, MAX.fileName);
  const fileMime = c.text(u, "fileMime", path, 200);
  if (type === "PRESENTATION") {
    if (fileKey) {
      if (!fileKey.startsWith("unit-files/")) c.problem(`${path}.fileKey`, "must be a key from get_upload_url (it starts with unit-files/).");
      unit.fileKey = fileKey;
      unit.fileName = fileName || fileKey.split("/").pop() || "file";
      unit.fileMime = fileMime || FILE_TYPES[fileExtension(unit.fileName)] || "application/octet-stream";
    } else if (fileName || fileMime) {
      c.problem(`${path}.fileKey`, "is required with fileName or fileMime: upload the file with get_upload_url first.");
    }
    if (u.removeFile !== undefined) {
      if (typeof u.removeFile !== "boolean") c.problem(`${path}.removeFile`, "must be true or false.");
      else unit.removeFile = u.removeFile;
    }
  } else if (fileKey || fileName || fileMime || u.removeFile !== undefined) {
    c.problem(path, "only PRESENTATION units have a file.");
  }

  if (type === "QUIZ") {
    unit.questions = c.list(u, "questions", path, 200)
      .map((q, i) => parseQuestion(q, `${path}.questions[${i}]`, c))
      .filter((q): q is QuestionIn => !!q);
    if (unit.questions.length === 0) c.warn(path, "this quiz has no questions, so learners can't complete it.");
  } else if (Array.isArray(u.questions) ? u.questions.length > 0 : u.questions !== undefined && u.questions !== null) {
    c.problem(`${path}.questions`, "only QUIZ units have questions.");
  }
  return unit;
}

function parseSections(value: unknown, c: Checker): SectionIn[] {
  if (!Array.isArray(value)) {
    c.problem("sections", "must be a list of sections.");
    return [];
  }
  if (value.length > MAX_SECTIONS) c.problem("sections", `has ${value.length} sections, at most ${MAX_SECTIONS}.`);
  let units = 0;
  const sections = value.slice(0, MAX_SECTIONS).map((sv, si) => {
    const path = `sections[${si}]`;
    const s = c.object(sv, path, ["id", "title", "subsections"]);
    if (!s) return null;
    const section: SectionIn = { id: c.id(s, path), title: c.text(s, "title", path, MAX.partTitle, true) ?? "", subsections: [] };
    section.subsections = c.list(s, "subsections", path, 100).map((ssv, ssi): SubsectionIn | null => {
      const ssPath = `${path}.subsections[${ssi}]`;
      const ss = c.object(ssv, ssPath, ["id", "title", "units"]);
      if (!ss) return null;
      const unitValues = c.list(ss, "units", ssPath, MAX_UNITS);
      units += unitValues.length;
      return {
        id: c.id(ss, ssPath),
        title: c.text(ss, "title", ssPath, MAX.partTitle, true) ?? "",
        units: unitValues.map((uv, ui) => parseUnit(uv, `${ssPath}.units[${ui}]`, c)).filter((u): u is UnitIn => !!u),
      };
    }).filter((ss): ss is SubsectionIn => !!ss);
    return section;
  }).filter((s): s is SectionIn => !!s);

  if (units > MAX_UNITS) c.problem("sections", `has ${units} units in all, at most ${MAX_UNITS}.`);
  if (sections.length === 0) c.warn("sections", "the micro-credential has no content yet.");
  return sections;
}

function allUnits(sections: SectionIn[]): UnitIn[] {
  return sections.flatMap((s) => s.subsections.flatMap((ss) => ss.units));
}

/** Weights are % of the grade: at most 100 in all, and normally exactly 100. */
function checkWeights(sections: SectionIn[], passGrade: number, c: Checker) {
  const total = allUnits(sections).reduce((n, u) => n + u.weight, 0);
  if (exceedsFullWeight(total)) {
    c.problem("sections", `unit weights add up to ${formatWeight(total)}%; they must not exceed 100%.`);
  } else if (sections.length > 0 && !isFullWeight(total)) {
    c.warn("sections", `unit weights add up to ${formatWeight(total)}%, not 100%.` +
      (total < passGrade ? ` That is below the pass grade (${passGrade}%), so nobody can pass.` : ""));
  }
}

const DETAIL_FIELDS = [
  "title", "slug", "code", "project", "description", "overview", "objectives",
  "developedBy", "organisation", "topic", "passGrade",
] as const;

interface Parsed {
  details: Record<string, unknown>;
  sections?: SectionIn[];
  image?: { data: Uint8Array<ArrayBuffer>; mime: string } | null; // null: remove it
  programmeId?: string;
}

function parseImage(value: unknown, c: Checker): { data: Uint8Array<ArrayBuffer>; mime: string } | undefined {
  const img = c.object(value, "image", ["base64", "mime"]);
  if (!img) return undefined;
  let base64 = typeof img.base64 === "string" ? img.base64.trim() : "";
  let mime = typeof img.mime === "string" ? img.mime.trim().toLowerCase() : "";
  const dataUrl = /^data:([^;,]+);base64,/i.exec(base64);
  if (dataUrl) {
    mime = mime || dataUrl[1].toLowerCase();
    base64 = base64.slice(dataUrl[0].length);
  }
  base64 = base64.replace(/\s+/g, "");
  if (mime === "image/jpg") mime = "image/jpeg";
  if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    c.problem("image.base64", "must be the image file encoded in base64.");
    return undefined;
  }
  if (!(IMAGE_TYPES as readonly string[]).includes(mime)) {
    c.problem("image.mime", `must be ${IMAGE_TYPES.join(" or ")}.`);
    return undefined;
  }
  const data = Buffer.from(base64, "base64");
  if (data.length > MAX_IMAGE_BYTES) c.problem("image", `is ${(data.length / 1024 / 1024).toFixed(1)} MB; at most 2 MB.`);
  const isPng = data.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const isJpeg = data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mime === "image/png" ? !isPng : !isJpeg) c.problem("image", `isn't a ${mime === "image/png" ? "PNG" : "JPEG"} file.`);
  return { data: new Uint8Array(data), mime };
}

/** Checks a create (all fields) or update (only the fields sent) body. */
function parseBody(body: Record<string, unknown>, mode: "create" | "update", c: Checker, currentPassGrade = 50): Parsed {
  const extra = mode === "create" ? ["sections", "image", "programmeId"] : ["sections", "image", "removeImage"];
  c.object(body, "", [...DETAIL_FIELDS, ...extra]);

  const required = mode === "create";
  const details: Record<string, unknown> = {};
  const set = (key: string, value: unknown) => {
    if (value !== undefined) details[key] = value;
  };
  set("title", c.text(body, "title", "", MAX.title, required || body.title !== undefined));
  set("code", c.text(body, "code", "", MAX.code, required || body.code !== undefined));
  const slug = c.text(body, "slug", "", MAX.slug, body.slug !== undefined && mode === "update");
  if (slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) c.problem("slug", "must be lowercase letters, digits and single hyphens, like circular-economy-2.");
  set("slug", slug);
  const project = c.text(body, "project", "", MAX.project);
  set("project", project === null ? "" : project); // the column isn't nullable: no project is ""
  for (const key of ["description", "overview", "objectives", "developedBy", "organisation", "topic"] as const) {
    set(key, c.text(body, key, "", MAX[key]));
  }

  let passGrade = currentPassGrade;
  if (body.passGrade !== undefined) {
    if (!Number.isInteger(body.passGrade) || (body.passGrade as number) < 1 || (body.passGrade as number) > 100) {
      c.problem("passGrade", "must be a whole number from 1 to 100 (the % needed to pass).");
    } else {
      passGrade = body.passGrade as number;
      details.passGrade = passGrade;
    }
  }

  const parsed: Parsed = { details };
  if (body.sections !== undefined) {
    parsed.sections = parseSections(body.sections, c);
    checkWeights(parsed.sections, passGrade, c);
  } else if (mode === "create") {
    c.warn("sections", "the micro-credential has no content yet.");
  }

  if (body.image !== undefined && body.image !== null) parsed.image = parseImage(body.image, c);
  if (mode === "update" && body.removeImage !== undefined) {
    if (typeof body.removeImage !== "boolean") c.problem("removeImage", "must be true or false.");
    else if (body.removeImage) {
      if (parsed.image) c.problem("removeImage", "can't be used together with image.");
      else parsed.image = null;
    }
  }

  if (mode === "create" && body.programmeId !== undefined && body.programmeId !== null) {
    if (typeof body.programmeId !== "string" || !body.programmeId) c.problem("programmeId", "must be a micro-programme id from list_micro_programmes.");
    else parsed.programmeId = body.programmeId;
  }
  return parsed;
}

/** The project has no certificate template, so learners who pass get no certificate. */
async function checkProject(project: unknown, c: Checker) {
  if (typeof project !== "string") return;
  if (!project) {
    c.warn("project", "no project is set, so no certificate template applies.");
    return;
  }
  const template = await prisma.projectCertificate.findUnique({ where: { project }, select: { id: true } });
  if (!template) c.warn("project", `there is no certificate template for the project "${project}" yet.`);
}

/** Problems with the S3 file keys (another course's file, not a lesson file). */
async function checkFiles(sections: SectionIn[] | undefined, credentialId: string | null, c: Checker) {
  if (!sections) return;
  const error = await checkUnitFileKeys(sections, credentialId);
  if (error) c.problem("sections", error);
}

function stop(c: Checker) {
  if (c.problems.length) throw new ContentInputError(c.problems);
}

// ─── Output ─────────────────────────────────────────────────

const FULL = {
  omit: { imageData: true },
  include: {
    sections: {
      orderBy: { order: "asc" as const },
      include: {
        subsections: {
          orderBy: { order: "asc" as const },
          include: {
            units: {
              orderBy: { order: "asc" as const },
              omit: { fileData: true },
              include: { questions: { orderBy: { order: "asc" as const } } },
            },
          },
        },
      },
    },
    programmes: { select: { programme: { select: { id: true, title: true } } } },
    _count: { select: { enrollments: true } },
  },
};

/**
 * One micro-credential. `microCredential` has exactly the fields create and
 * update take, so it can be edited and sent back; `readOnly` has the rest.
 */
export async function getCredential(id: string) {
  const c = await prisma.microCredential.findUnique({ where: { id }, ...FULL });
  if (!c) return null;
  return {
    id: c.id,
    microCredential: {
      title: c.title,
      slug: c.slug,
      code: c.code,
      project: c.project,
      description: c.description,
      overview: c.overview,
      objectives: c.objectives,
      developedBy: c.developedBy,
      organisation: c.organisation,
      topic: c.topic,
      passGrade: c.passGrade,
      sections: c.sections.map((s) => ({
        id: s.id,
        title: s.title,
        subsections: s.subsections.map((ss) => ({
          id: ss.id,
          title: ss.title,
          units: ss.units.map((u) => ({
            id: u.id,
            title: u.title,
            type: u.type,
            weight: u.weight,
            ...(u.type === "VIDEO" ? { videoUrl: u.videoUrl } : {}),
            ...(u.type === "PRESENTATION"
              ? { hasFile: !!(u.fileKey || u.fileMime), ...(u.fileKey ? { fileKey: u.fileKey, fileName: u.fileName, fileMime: u.fileMime } : {}) }
              : {}),
            ...(u.type === "QUIZ"
              ? {
                  questions: u.questions.map((q) => ({
                    id: q.id, title: q.title, question: q.question, options: q.options,
                    correctIndex: q.correctIndex, maxAttempts: q.maxAttempts,
                  })),
                }
              : {}),
          })),
        })),
      })),
    },
    readOnly: {
      status: c.published ? "published" : "draft",
      publicPage: `/credentials/${c.id}`,
      hasImage: !!c.imageMime,
      imageUrl: c.imageMime ? `/api/images/credential/${c.id}` : null,
      microProgrammes: c.programmes.map((p) => p.programme),
      enrolledLearners: c._count.enrollments,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    },
  };
}

export async function listCredentials(filter: { search?: string; project?: string }) {
  const q = filter.search?.trim();
  const [credentials, certificates] = await Promise.all([
    prisma.microCredential.findMany({
      where: {
        ...(filter.project ? { project: filter.project } : {}),
        ...(q
          ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }
          : {}),
      },
      orderBy: [{ project: "asc" }, { title: "asc" }],
      select: {
        id: true, title: true, slug: true, code: true, project: true, organisation: true, topic: true, passGrade: true, published: true, updatedAt: true,
        programmes: { select: { programme: { select: { id: true, title: true } } } },
        sections: { select: { subsections: { select: { _count: { select: { units: true } } } } } },
      },
    }),
    prisma.projectCertificate.findMany({ select: { project: true } }),
  ]);
  const projects = new Set([...credentials.map((c) => c.project).filter(Boolean)]);
  const withTemplate = new Set(certificates.map((c) => c.project));
  return {
    microCredentials: credentials.map(({ programmes, sections, published, ...c }) => ({
      ...c,
      status: published ? "published" : "draft",
      sections: sections.length,
      units: sections.reduce((n, s) => n + s.subsections.reduce((m, ss) => m + ss._count.units, 0), 0),
      microProgrammes: programmes.map((p) => p.programme),
    })),
    // Without a filter: every project name in use, and whether it has a certificate template.
    ...(filter.project || q
      ? {}
      : { projects: [...new Set([...projects, ...withTemplate])].sort().map((name) => ({ name, hasCertificateTemplate: withTemplate.has(name) })) }),
  };
}

export async function listProgrammes() {
  const programmes = await prisma.microProgramme.findMany({
    orderBy: [{ project: "asc" }, { title: "asc" }],
    select: {
      id: true, title: true, code: true, project: true,
      credentials: { orderBy: { order: "asc" }, select: { credential: { select: { id: true, title: true, published: true } } } },
    },
  });
  return {
    microProgrammes: programmes.map(({ credentials, ...p }) => ({
      ...p,
      microCredentials: credentials.map(({ credential: { published, ...c } }) => ({ ...c, status: published ? "published" : "draft" })),
    })),
  };
}

function summary(sections: SectionIn[] | undefined) {
  const units = allUnits(sections ?? []);
  return {
    sections: sections?.length ?? 0,
    units: units.length,
    quizQuestions: units.reduce((n, u) => n + (u.questions?.length ?? 0), 0),
    totalWeight: Number(formatWeight(units.reduce((n, u) => n + u.weight, 0))),
  };
}

// ─── Create ─────────────────────────────────────────────────

function slugify(title: string): string {
  return title.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "micro-credential";
}

export async function createCredential(
  body: Record<string, unknown>,
  options: { dryRun: boolean; allowDuplicate: boolean },
  caller: ApiCaller
) {
  const c = new Checker();
  const parsed = parseBody(body, "create", c);
  const { details, sections, image, programmeId } = parsed;
  const title = details.title as string;
  const code = details.code as string;

  if (programmeId) {
    const programme = await prisma.microProgramme.findUnique({ where: { id: programmeId }, select: { id: true } });
    if (!programme) c.problem("programmeId", "no micro-programme has this id (see list_micro_programmes).");
  }
  if (details.slug) {
    const taken = await prisma.microCredential.findUnique({ where: { slug: details.slug as string }, select: { id: true } });
    if (taken) c.problem("slug", `is already used by micro-credential ${taken.id}. Choose another or leave it out.`);
  }
  await checkFiles(sections, null, c);
  stop(c);
  allUnits(sections ?? []).forEach((u) => {
    if (u.type === "PRESENTATION" && !u.fileKey) c.warn(`unit "${u.title}"`, "this presentation unit has no file yet.");
  });

  // An agent retrying a request mustn't enter the same course twice.
  if (!options.allowDuplicate) {
    const same = await prisma.microCredential.findFirst({
      where: { title: { equals: title, mode: "insensitive" }, code: { equals: code, mode: "insensitive" } },
      select: { id: true },
    });
    if (same) {
      throw new ContentInputError(
        [`A micro-credential with this title and code already exists (id ${same.id}). Update it with update_micro_credential, or add ?allowDuplicate=true to create another one.`],
        409
      );
    }
  }
  await checkProject(details.project ?? "", c);

  if (options.dryRun) return { dryRun: true, valid: true, wouldCreate: summary(sections), warnings: c.warnings };

  // A free slug from the title, like the admin panel: "title", "title-2", …
  let slug = details.slug as string | undefined;
  if (!slug) {
    const base = slugify(title);
    slug = base;
    for (let n = 2; await prisma.microCredential.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;
  }
  const order = programmeId
    ? ((await prisma.programmeCredential.aggregate({ where: { programmeId }, _max: { order: true } }))._max.order ?? -1) + 1
    : 0;

  // One transaction: a create that fails part-way leaves nothing behind. Only
  // `tx` may be used inside: the pool has a single connection (src/lib/prisma.ts).
  const id = await prisma.$transaction(
    async (tx) => {
      const created = await tx.microCredential.create({
        data: {
          title, code, slug,
          project: (details.project as string | undefined) ?? "",
          description: (details.description as string | null | undefined) ?? null,
          overview: (details.overview as string | null | undefined) ?? null,
          objectives: (details.objectives as string | null | undefined) ?? null,
          developedBy: (details.developedBy as string | null | undefined) ?? null,
          organisation: (details.organisation as string | null | undefined) ?? null,
          topic: (details.topic as string | null | undefined) ?? null,
          passGrade: (details.passGrade as number | undefined) ?? 50,
          published: false, // a draft until an admin publishes it
          ...(image ? { imageData: image.data, imageMime: image.mime } : {}),
          ...(programmeId ? { programmes: { create: { programme: { connect: { id: programmeId } }, order } } } : {}),
        },
        select: { id: true },
      });
      // New parts only: ids sent for a create are ignored.
      if (sections) await syncCredentialContent(tx, created.id, stripIds(sections));
      return created.id;
    },
    { maxWait: 15_000, timeout: 60_000 }
  );

  console.info(`Content API: draft micro-credential ${id} "${title}" created by ${who(caller)}.`);
  return { ...(await getCredential(id))!, warnings: c.warnings };
}

function stripIds(sections: SectionIn[]): SectionIn[] {
  return sections.map((s) => ({
    ...s, id: undefined,
    subsections: s.subsections.map((ss) => ({
      ...ss, id: undefined,
      units: ss.units.map((u) => ({ ...u, id: undefined, questions: u.questions?.map((q) => ({ ...q, id: undefined })) })),
    })),
  }));
}

// ─── Update ─────────────────────────────────────────────────

export async function updateCredential(
  id: string,
  body: Record<string, unknown>,
  options: { dryRun: boolean; allowProgressLoss: boolean },
  caller: ApiCaller
) {
  const current = await prisma.microCredential.findUnique({
    where: { id },
    select: {
      published: true,
      passGrade: true,
      sections: {
        select: {
          id: true,
          subsections: {
            select: {
              id: true,
              units: {
                select: {
                  id: true, type: true, fileKey: true, fileMime: true,
                  questions: { select: { id: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!current) throw new ContentInputError(["No micro-credential has this id."], 404, "Micro-credential not found.");
  // Learners see a published micro-credential, so only admins change it, in
  // the admin panel. An admin can make it a draft again to let the API edit it.
  if (current.published) {
    throw new ContentInputError(
      [
        "This micro-credential is published, and the content API can only change drafts. Ask an admin to make the change in " +
          "the admin panel, or to untick Published there (which hides it from the catalogue) so that it can be edited here.",
      ],
      409,
      "Published micro-credentials can't be changed through the content API."
    );
  }

  const c = new Checker();
  const parsed = parseBody(body, "update", c, current.passGrade);
  const { details, sections, image } = parsed;

  const oldSubsections = current.sections.flatMap((s) => s.subsections);
  const oldUnits = oldSubsections.flatMap((ss) => ss.units);
  const oldQuestions = oldUnits.flatMap((u) => u.questions);

  let changes: Record<string, number> | undefined;
  if (sections) {
    // Ids must be this micro-credential's own, each used once; parts without an id are new.
    const known = {
      section: new Set(current.sections.map((s) => s.id)),
      subsection: new Set(oldSubsections.map((ss) => ss.id)),
      unit: new Set(oldUnits.map((u) => u.id)),
      question: new Set(oldQuestions.map((q) => q.id)),
    };
    const used = new Set<string>();
    const checkId = (kind: keyof typeof known, partId: string | undefined, path: string) => {
      if (!partId) return;
      if (!known[kind].has(partId)) c.problem(`${path}.id`, `isn't one of this micro-credential's ${kind}s. Leave the id out to add a new ${kind}.`);
      else if (used.has(partId)) c.problem(`${path}.id`, `is used twice.`);
      used.add(partId);
    };
    sections.forEach((s, si) => {
      checkId("section", s.id, `sections[${si}]`);
      s.subsections.forEach((ss, ssi) => {
        checkId("subsection", ss.id, `sections[${si}].subsections[${ssi}]`);
        ss.units.forEach((u, ui) => {
          const path = `sections[${si}].subsections[${ssi}].units[${ui}]`;
          checkId("unit", u.id, path);
          u.questions?.forEach((q, qi) => checkId("question", q.id, `${path}.questions[${qi}]`));
          const old = u.id ? oldUnits.find((o) => o.id === u.id) : undefined;
          if (u.type === "PRESENTATION" && !u.fileKey && (!old || !(old.fileKey || old.fileMime) || u.removeFile)) {
            c.warn(path, "this presentation unit has no file yet.");
          }
        });
      });
    });
    await checkFiles(sections, id, c);
    stop(c);

    // What the save deletes: units and questions left out, and the questions
    // of a quiz that becomes another type. Learners lose their progress on them.
    const keptUnits = new Set(allUnits(sections).map((u) => u.id).filter(Boolean));
    const keptQuestions = new Set(allUnits(sections).filter((u) => u.type === "QUIZ").flatMap((u) => u.questions ?? []).map((q) => q.id).filter(Boolean));
    const removedUnits = oldUnits.filter((u) => !keptUnits.has(u.id)).map((u) => u.id);
    const removedQuestions = oldQuestions.filter((q) => !keptQuestions.has(q.id)).map((q) => q.id);
    const [completionsLost, answersLost] = await Promise.all([
      removedUnits.length ? prisma.unitCompletion.count({ where: { unitId: { in: removedUnits } } }) : 0,
      removedQuestions.length ? prisma.questionAnswer.count({ where: { questionId: { in: removedQuestions } } }) : 0,
    ]);
    changes = {
      unitsRemoved: removedUnits.length,
      questionsRemoved: removedQuestions.length,
      learnerCompletionsLost: completionsLost,
      learnerAnswersLost: answersLost,
    };
    if ((completionsLost || answersLost) && !options.allowProgressLoss) {
      throw new ContentInputError(
        [
          `This save would delete ${removedUnits.length} unit(s) and ${removedQuestions.length} question(s), and with them ` +
            `${completionsLost} unit completion(s) and ${answersLost} quiz answer(s) of learners. To keep a part, send it with its id ` +
            `(from get_micro_credential). To delete them anyway, add ?allowProgressLoss=true.`,
        ],
        409
      );
    }
  }
  if (details.project !== undefined) await checkProject(details.project, c);
  if (details.slug) {
    const taken = await prisma.microCredential.findFirst({ where: { slug: details.slug as string, id: { not: id } }, select: { id: true } });
    if (taken) c.problem("slug", `is already used by micro-credential ${taken.id}.`);
  }
  stop(c);

  if (options.dryRun) return { dryRun: true, valid: true, ...(changes ? { changes } : {}), warnings: c.warnings };

  const data: Record<string, unknown> = { ...details };
  if (image) Object.assign(data, { imageData: image.data, imageMime: image.mime });
  else if (image === null) Object.assign(data, { imageData: null, imageMime: null });

  const staleKeys = oldUnits.map((u) => u.fileKey).filter((k): k is string => !!k);
  await prisma.$transaction(
    async (tx) => {
      if (Object.keys(data).length) await tx.microCredential.update({ where: { id }, data, select: { id: true } });
      if (sections) await syncCredentialContent(tx, id, sections);
    },
    { maxWait: 15_000, timeout: 60_000 }
  );

  const saved = (await getCredential(id))!;
  // Delete the S3 files no unit uses any more, as the admin editor does.
  if (sections) {
    const kept = new Set(saved.microCredential.sections.flatMap((s) => s.subsections.flatMap((ss) => ss.units.map((u) => ("fileKey" in u ? u.fileKey : null)))));
    await Promise.all(staleKeys.filter((k) => !kept.has(k)).map((k) => deleteObject(k).catch(() => {})));
  }

  console.info(`Content API: micro-credential ${id} updated by ${who(caller)}.`);
  return { ...saved, ...(changes ? { changes } : {}), warnings: c.warnings };
}

// ─── Uploads ────────────────────────────────────────────────

/** A link to upload one lesson file to S3, for a presentation unit's fileKey. */
export async function createLessonUpload(body: Record<string, unknown>) {
  const c = new Checker();
  c.object(body, "", ["filename", "contentType"]);
  const filename = c.text(body, "filename", "", MAX.fileName, true) ?? "";
  const ext = fileExtension(filename);
  if (filename && !FILE_TYPES[ext]) c.problem("filename", `must end in ${Object.keys(FILE_TYPES).join(", ")}.`);
  const contentType = c.text(body, "contentType", "", 200) || FILE_TYPES[ext];
  stop(c);
  if (!isS3Configured()) throw new ContentInputError(["File storage isn't configured on the server."], 503);

  const upload = await createUploadUrl(filename, contentType, "unit-files");
  if (!upload) throw new ContentInputError(["File storage isn't configured on the server."], 503);
  return {
    uploadUrl: upload.uploadUrl,
    method: "PUT",
    headers: { "Content-Type": contentType },
    expiresInSeconds: 300,
    fileKey: upload.key,
    fileName: filename,
    fileMime: contentType,
    next:
      "PUT the file's bytes to uploadUrl with exactly these headers, within 5 minutes. Then give the presentation unit " +
      "fileKey, fileName and fileMime from here, in create_micro_credential or update_micro_credential.",
  };
}
