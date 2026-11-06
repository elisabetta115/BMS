// app/api/micro-credentials/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkUnitFileKeys, requireAdmin, requireCredentialAccess } from "@/lib/admin";
import { exceedsFullWeight, formatWeight } from "@/lib/weights";
import { deleteObject } from "@/lib/s3";
import { syncCredentialContent } from "@/lib/credential-sync";
import { exportKey } from "@/lib/olx-export";
import { missingAnswerError } from "@/lib/questions";

function stripBinaryFromCredential(c: any, includeAnswers = true) {
  return {
    ...c,
    imageData: undefined,
    hasImage: !!(c.imageData || c.imageMime),
    sections: (c.sections || []).map((s: any) => ({
      ...s,
      subsections: (s.subsections || []).map((ss: any) => ({
        ...ss,
        units: (ss.units || []).map((u: any) => ({
          ...u,
          fileData: undefined,
          hasFile: !!(u.fileData || u.fileKey || u.fileMime),
          // Learners get the right answer only after submitting (see /api/questions/[id]/answer).
          questions: includeAnswers
            ? u.questions
            : (u.questions || []).map((q: any) => ({ ...q, correctIndex: undefined })),
        })),
      })),
    })),
  };
}

function validateWeights(sections: any[]): string | null {
  let total = 0;
  for (const s of sections || []) {
    for (const ss of s.subsections || []) {
      for (const u of ss.units || []) {
        const w = Number(u.weight) || 0;
        if (w < 0 || w > 100) return `Unit "${u.title || "(untitled)"}" weight must be between 0 and 100.`;
        total += w;
      }
    }
  }
  if (exceedsFullWeight(total)) return `Total unit weight is ${formatWeight(total)}%. It must not exceed 100%.`;
  return null;
}

const INCLUDE_FULL = {
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
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    const credential = await prisma.microCredential.findUnique({
      where: { id },
      omit: { imageData: true },
      include: INCLUDE_FULL,
    });
    if (!credential) return NextResponse.json({ error: "Not found." }, { status: 404 });
    // Whoever may edit the course sees the right answers; learners don't.
    const canEdit = !((await requireCredentialAccess(id)) instanceof NextResponse);
    return NextResponse.json({ credential: stripBinaryFromCredential(credential, canEdit) });
  } catch (err) {
    console.error("Error fetching credential:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireCredentialAccess(id);
  if (auth instanceof NextResponse) return auth;
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { title, slug, code, project, description, overview, objectives, developedBy, organisation, topic, passGrade, sections, imageBase64, imageMime, removeImage } = await req.json();

    // Content is only touched when the request has it: a save of just the
    // details must not empty the course.
    if (sections !== undefined && !Array.isArray(sections)) {
      return NextResponse.json({ error: "sections must be an array." }, { status: 400 });
    }
    if (sections) {
      const weightErr = validateWeights(sections);
      if (weightErr) return NextResponse.json({ error: weightErr }, { status: 400 });
      const answerErr = missingAnswerError(sections);
      if (answerErr) return NextResponse.json({ error: answerErr }, { status: 400 });
      if (!auth.isAdmin) {
        const fileErr = await checkUnitFileKeys(sections, id);
        if (fileErr) return NextResponse.json({ error: fileErr }, { status: 400 });
      }
    }

    // The S3 files the units point at now, to delete the ones the save drops.
    const existingUnits = await prisma.credentialUnit.findMany({
      where: { subsection: { section: { credentialId: id } } },
      select: { fileKey: true },
    });
    const staleKeys = existingUnits.map((u) => u.fileKey).filter((k): k is string => !!k);

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (slug !== undefined) data.slug = slug;
    if (code !== undefined) data.code = code;
    if (project !== undefined) data.project = project;
    if (description !== undefined) data.description = description || null;
    if (overview !== undefined) data.overview = overview || null;
    if (objectives !== undefined) data.objectives = objectives || null;
    if (developedBy !== undefined) data.developedBy = developedBy || null;
    if (organisation !== undefined) data.organisation = organisation || null;
    if (topic !== undefined) data.topic = topic || null;
    if (passGrade !== undefined) data.passGrade = passGrade;

    if (imageBase64 && imageMime) {
      data.imageData = Buffer.from(imageBase64, "base64");
      data.imageMime = imageMime;
    } else if (removeImage) {
      data.imageData = null;
      data.imageMime = null;
    }

    // Sections, units and questions are updated in place (src/lib/credential-sync.ts),
    // so learners keep their completions and answers. One transaction: a save
    // that fails part-way changes nothing. Only `tx` may be used inside: the
    // pool has a single connection (src/lib/prisma.ts), which `tx` holds.
    const credential = await prisma.$transaction(
      async (tx) => {
        await tx.microCredential.update({ where: { id }, data, select: { id: true } });
        if (sections) await syncCredentialContent(tx, id, sections);
        return tx.microCredential.findUniqueOrThrow({ where: { id }, omit: { imageData: true }, include: INCLUDE_FULL });
      },
      { maxWait: 15_000, timeout: 60_000 }
    );

    // Clean up any S3 files that were replaced or explicitly removed —
    // anything still referenced by the freshly-saved credential stays.
    const keptKeys = new Set(
      credential.sections.flatMap((s) => s.subsections.flatMap((ss) => ss.units.map((u) => u.fileKey))).filter(Boolean)
    );
    await Promise.all(staleKeys.filter((k) => !keptKeys.has(k)).map((k) => deleteObject(k).catch(() => {})));

    return NextResponse.json({ credential: stripBinaryFromCredential(credential) });
  } catch (err: any) {
    console.error("Error updating credential:", err);
    if (err?.code === "P2002") return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
    if (err?.code === "P2025") return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    const units = await prisma.credentialUnit.findMany({
      where: { subsection: { section: { credentialId: id } } },
      select: { fileKey: true },
    });
    await prisma.microCredential.delete({ where: { id } });
    await Promise.all(units.filter((u) => u.fileKey).map((u) => deleteObject(u.fileKey!).catch(() => {})));
    await deleteObject(exportKey(id)).catch(() => {}); // its latest export, if any
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting credential:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
