// POST /api/admin/import-olx
//
// Turns an Open edX course export (.tar.gz), already uploaded to S3 via
// /api/admin/uploads/presign, into a MicroCredential (with sections /
// subsections / units / questions). A micro-programme is never created
// automatically — the archive's "project" (e.g. "RESSKILL") is just an
// initiative label, not a specific programme, and several distinct
// programmes can share one project name (see the RES4CITY seed data:
// MP1–MP8 all have project "RES4CITY" but different credential rosters).
// The admin optionally attaches the imported credential to one *existing*
// programme they pick explicitly; if they pick none, only the credential is
// created and programme placement is left to them afterwards.
//
// The archive itself never passes through this route's request body — course
// exports routinely exceed the ~6MB payload limit our hosting platform
// enforces on a single request, so the client uploads the file straight to
// S3 first and only sends us the resulting object key.
//
//   body "key"                   – the S3 object key of the uploaded archive
//   body "mode"                  – "preview" (default) or "commit"
//   body "programmeId"           – optional: link the credential into this
//                                  existing micro-programme
//   body "onExistingCredential"  – "replace" | "skip"
//
// "preview" parses the archive and reports what would be created plus any
// conflicts. "commit" performs the writes; if it hits an unresolved conflict it
// responds 409 with { conflict, ... } so the UI can ask the admin what to do.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getObjectBuffer, deleteObject } from "@/lib/s3";
import { extractTarGz, parseOlx, type ParsedCourse } from "@/lib/olx-import";

export const runtime = "nodejs";
export const maxDuration = 60;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function uniqueSlug(model: "microCredential" | "microProgramme", base: string, exceptId?: string) {
  const b = base || "item";
  let slug = b;
  let n = 1;
  for (;;) {
    // @ts-expect-error dynamic model access
    const hit = await prisma[model].findUnique({ where: { slug } });
    if (!hit || hit.id === exceptId) break;
    n++;
    slug = `${b}-${n}`;
  }
  return slug;
}

function courseSummary(c: ParsedCourse) {
  return {
    title: c.title,
    code: c.code,
    project: c.project,
    developedBy: c.developedBy,
    description: c.description,
    overview: c.overview,
    objectives: c.objectives,
    passGrade: c.passGrade,
    hasImage: !!c.image,
    imageName: c.image?.name ?? null,
    programme: c.programme,
    counts: c.counts,
    warnings: c.warnings,
    outline: c.sections.map((s) => ({
      title: s.title,
      subsections: s.subsections.map((ss) => ({
        title: ss.title,
        units: ss.units.map((u) => ({
          title: u.title,
          type: u.type,
          weight: u.weight || 0,
          detail:
            u.type === "VIDEO" ? u.videoUrl :
            u.type === "QUIZ" ? `${u.questions?.length ?? 0} questions` :
            u.file?.name ?? "",
        })),
      })),
    })),
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });

  const { key, mode: rawMode, programmeId: rawProgrammeId, onExistingCredential: rawOnExisting } = await req.json();
  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "No uploaded archive reference provided." }, { status: 400 });
  }

  const mode = String(rawMode || "preview");
  const programmeId = rawProgrammeId ? String(rawProgrammeId) : null;
  const onExistingCredential = String(rawOnExisting || "");

  // Fetch the archive from S3 — it was uploaded there directly by the
  // browser, so its size was never constrained by our own request limits.
  let archive: Buffer;
  try {
    const buf = await getObjectBuffer(key);
    if (!buf) return NextResponse.json({ error: "File storage isn't configured." }, { status: 500 });
    archive = buf;
  } catch (err) {
    console.error("Error fetching uploaded archive from S3:", err);
    return NextResponse.json({ error: "Could not find the uploaded archive. Please re-upload it." }, { status: 400 });
  }
  if (archive.length > 200 * 1024 * 1024) {
    return NextResponse.json({ error: "Archive is larger than 200 MB." }, { status: 400 });
  }

  // Parse the archive.
  let course: ParsedCourse;
  try {
    const files = await extractTarGz(archive);
    course = parseOlx(files);
  } catch (err: any) {
    console.error("OLX parse error:", err);
    return NextResponse.json({ error: err?.message || "Could not read the archive." }, { status: 400 });
  }

  if (course.sections.length === 0) {
    return NextResponse.json({ error: "No importable content found in the archive.", summary: courseSummary(course) }, { status: 400 });
  }

  // A credential is "the same one" if it shares a code, a title, or the slug
  // this import would produce — titles matter most: the app deliberately
  // reuses one credential by name across several programmes (see e.g.
  // "Introduction to Renewable Energies" in the RES4CITY seed data), so two
  // courses that land on the same title are almost certainly meant to be the
  // same credential, not an accidental duplicate.
  const existingCredential = await prisma.microCredential.findFirst({
    where: {
      OR: [
        { code: { equals: course.code, mode: "insensitive" } },
        { title: { equals: course.title, mode: "insensitive" } },
        { slug: slugify(course.title) },
      ],
    },
  });

  const summary = courseSummary(course);
  const conflictInfo = {
    credential: existingCredential ? { id: existingCredential.id, title: existingCredential.title, code: existingCredential.code } : null,
  };

  if (mode !== "commit") {
    return NextResponse.json({ mode: "preview", summary, existing: conflictInfo });
  }

  /* ── commit ── */

  if (programmeId) {
    const programme = await prisma.microProgramme.findUnique({ where: { id: programmeId } });
    if (!programme) return NextResponse.json({ error: "The selected micro-programme no longer exists." }, { status: 400 });
  }
  if (existingCredential && !["replace", "skip"].includes(onExistingCredential)) {
    return NextResponse.json(
      { conflict: "credential", message: `A micro-credential "${existingCredential.title}" (${existingCredential.code}) already exists.`, existing: conflictInfo, summary },
      { status: 409 },
    );
  }

  // The writes are done as individual calls rather than one interactive
  // $transaction: the deployed DATABASE_URL points at Supabase's transaction
  // pooler, over which interactive transactions are unreliable. Each nested
  // `create` is still atomic on its own; we clean up by hand if a later step
  // fails so a half-finished import doesn't linger.
  let credentialId = "";
  let credentialAction: "created" | "replaced" | "skipped" = "created";

  try {
    // 1. Credential.
    if (existingCredential && onExistingCredential === "skip") {
      credentialId = existingCredential.id;
      credentialAction = "skipped";
    } else {
      const sectionsCreate = course.sections.map((s, si) => ({
        title: s.title,
        order: si,
        subsections: {
          create: s.subsections.map((ss, ssi) => ({
            title: ss.title,
            order: ssi,
            units: {
              create: ss.units.map((u, ui) => {
                const unit: any = { title: u.title, type: u.type, order: ui, weight: Number(u.weight) || 0 };
                if (u.type === "VIDEO") unit.videoUrl = u.videoUrl || null;
                if (u.type === "PRESENTATION" && u.file) {
                  unit.fileData = Buffer.from(u.file.base64, "base64");
                  unit.fileMime = u.file.mime;
                  unit.fileName = u.file.name;
                }
                if (u.type === "QUIZ" && u.questions?.length) {
                  unit.questions = {
                    create: u.questions.map((q, qi) => ({
                      question: q.question,
                      options: q.options,
                      correctIndex: q.correctIndex,
                      order: qi,
                    })),
                  };
                }
                return unit;
              }),
            },
          })),
        },
      }));

      if (existingCredential && onExistingCredential === "replace") {
        await prisma.microCredential.delete({ where: { id: existingCredential.id } });
      }

      const cred = await prisma.microCredential.create({
        data: {
          title: course.title,
          slug: await uniqueSlug("microCredential", slugify(course.title)),
          code: course.code,
          project: course.project,
          description: course.description,
          overview: course.overview,
          objectives: course.objectives,
          developedBy: course.developedBy,
          passGrade: course.passGrade,
          ...(course.image
            ? { imageData: Buffer.from(course.image.base64, "base64"), imageMime: course.image.mime }
            : {}),
          sections: { create: sectionsCreate },
        },
      });
      credentialId = cred.id;
      credentialAction = existingCredential ? "replaced" : "created";
    }

    // 2. Link credential ↔ programme — only if the admin explicitly picked one.
    let linkedProgrammeId: string | null = null;
    if (programmeId) {
      const link = await prisma.programmeCredential.findUnique({
        where: { programmeId_credentialId: { programmeId, credentialId } },
      });
      if (!link) {
        const count = await prisma.programmeCredential.count({ where: { programmeId } });
        await prisma.programmeCredential.create({ data: { programmeId, credentialId, order: count } });
      }
      linkedProgrammeId = programmeId;
    }

    await deleteObject(key).catch(() => {});
    return NextResponse.json({ mode: "commit", programmeId: linkedProgrammeId, credentialId, credentialAction, summary });
  } catch (err: any) {
    console.error("OLX import error:", err);
    // Best-effort rollback of anything this request created.
    if (credentialId && credentialAction !== "skipped") {
      await prisma.microCredential.delete({ where: { id: credentialId } }).catch(() => {});
    }
    return NextResponse.json({ error: err?.message || "Import failed." }, { status: 500 });
  }
}
