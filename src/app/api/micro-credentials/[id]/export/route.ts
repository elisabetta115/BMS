// POST /api/micro-credentials/[id]/export — site admins only.
//
// Builds the micro-credential as an Open edX course file (.tar.gz, see
// src/lib/olx-export.ts), which "Import courses" can read back.
//
// The file is often bigger than the 5.72 MB Amplify lets our server send, so
// it's stored in S3 (one per micro-credential, replaced by the next export)
// and the response is a short-lived link the browser downloads it from:
// { url, fileName, warnings }. Without S3 (local development) the file itself
// is the response, with the warnings in the X-Export-Warnings header.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { createDownloadUrl, getObjectBuffer, isS3Configured, putObject } from "@/lib/s3";
import { buildOlxExport, exportKey, type ExportUnit } from "@/lib/olx-export";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  const db = prisma;
  const { id } = await params;

  try {
    const credential = await db.microCredential.findUnique({
      where: { id },
      select: {
        id: true, title: true, slug: true, code: true, project: true, description: true, overview: true, objectives: true,
        developedBy: true, organisation: true, topic: true, passGrade: true, image: true, imageData: true, imageMime: true,
        sections: {
          orderBy: { order: "asc" },
          select: {
            id: true, title: true,
            subsections: {
              orderBy: { order: "asc" },
              select: {
                id: true, title: true,
                units: {
                  orderBy: { order: "asc" },
                  // Files kept in the database are loaded one at a time below, not all at once here.
                  select: {
                    id: true, title: true, type: true, weight: true, videoUrl: true, fileKey: true, fileName: true, fileMime: true,
                    questions: { orderBy: { order: "asc" }, select: { id: true, title: true, question: true, options: true, correctIndex: true, maxAttempts: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!credential) return NextResponse.json({ error: "Micro-credential not found." }, { status: 404 });

    const loadFile = async (u: ExportUnit): Promise<Buffer | null> => {
      if (u.fileKey) return getObjectBuffer(u.fileKey);
      const row = await db.credentialUnit.findUnique({ where: { id: u.id }, select: { fileData: true } });
      return row?.fileData ? Buffer.from(row.fileData) : null;
    };
    const { archive, fileName, warnings } = await buildOlxExport(credential, loadFile);

    if (isS3Configured()) {
      const key = exportKey(id);
      await putObject(key, archive, "application/gzip");
      const url = await createDownloadUrl(key, { disposition: "attachment", filename: fileName, expiresIn: 600 });
      return NextResponse.json({ url, fileName, warnings });
    }
    return new NextResponse(new Uint8Array(archive), {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Export-Warnings": encodeURIComponent(JSON.stringify(warnings)),
      },
    });
  } catch (err) {
    console.error("Error exporting micro-credential:", err);
    return NextResponse.json({ error: "Could not export this micro-credential. Please try again." }, { status: 500 });
  }
}
