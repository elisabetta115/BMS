// app/api/units/[unitId]/slides/route.ts
// Shows a PowerPoint unit in Microsoft's Office Online viewer, which draws the
// slides as PowerPoint does. (They used to be converted to PDF with
// LibreOffice, which Amplify doesn't have.) The viewer downloads the file
// itself from Microsoft's servers, so it gets a link anyone can open: a
// presigned S3 URL, or for a file still kept in the database, /pptx/:unitId.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDownloadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

const OFFICE_VIEWER = "https://view.officeapps.live.com/op/embed.aspx?src=";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    if (!prisma) return new NextResponse("Not configured", { status: 500 });

    const { unitId } = await params;

    const unit = await prisma.credentialUnit.findUnique({
      where: { id: unitId },
      select: { fileKey: true },
    });
    if (!unit) return new NextResponse("No file", { status: 404 });

    // An hour, so the viewer can still fetch the file if it retries or the
    // learner leaves the page open before it loads.
    const fileUrl = unit.fileKey
      ? await createDownloadUrl(unit.fileKey, { expiresIn: 3600 })
      : `${process.env.APP_URL || req.nextUrl.origin}/pptx/${unitId}`;
    if (!fileUrl) return new NextResponse("File storage isn't configured.", { status: 500 });

    return NextResponse.redirect(OFFICE_VIEWER + encodeURIComponent(fileUrl));
  } catch (err) {
    console.error("Slides viewer error:", err);
    return new NextResponse("Error", { status: 500 });
  }
}
