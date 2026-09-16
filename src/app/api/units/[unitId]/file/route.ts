// app/api/units/[unitId]/file/route.ts
// Serves the unit's attached file (PDF inline, PPTX as download).
// Replaces the old PPTX-specific route at app/api/units/[unitId]/pptx/route.ts.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDownloadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    if (!prisma) return new NextResponse("Not configured", { status: 500 });

    const { unitId } = await params;

    const unit = await prisma.credentialUnit.findUnique({
      where: { id: unitId },
      select: { fileData: true, fileKey: true, fileMime: true, fileName: true },
    });

    if (!unit || (!unit.fileData && !unit.fileKey)) {
      return new NextResponse("No file", { status: 404 });
    }

    // Files uploaded straight to S3 (bypassing our request-size limit) are
    // served by redirecting the browser there directly, rather than
    // streaming the bytes back through this route.
    if (unit.fileKey) {
      const url = await createDownloadUrl(unit.fileKey);
      if (!url) return new NextResponse("File storage isn't configured.", { status: 500 });
      return NextResponse.redirect(url);
    }

    const mime = unit.fileMime || "application/octet-stream";
    const name = unit.fileName || "file";

    // PDFs render inline (so <iframe>/<object> previews work).
    // Everything else (e.g. pptx) is delivered as an attachment.
    const disposition =
      mime === "application/pdf"
        ? `inline; filename="${name}"`
        : `attachment; filename="${name}"`;

    return new NextResponse(unit.fileData!, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": disposition,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Unit file serve error:", err);
    return new NextResponse("Error", { status: 500 });
  }
}