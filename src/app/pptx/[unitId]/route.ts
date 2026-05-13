import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    if (!prisma) return new NextResponse("Not configured", { status: 500 });

    const { unitId } = await params;

    const unit = await prisma.credentialUnit.findUnique({
      where: { id: unitId },
      select: { pptxData: true, pptxMime: true, pptxName: true },
    });

    if (!unit || !unit.pptxData) {
      return new NextResponse("No file", { status: 404 });
    }

    return new NextResponse(unit.pptxData, {
      headers: {
        "Content-Type": unit.pptxMime || "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${unit.pptxName || "presentation.pptx"}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("PPTX serve error:", err);
    return new NextResponse("Error", { status: 500 });
  }
}
