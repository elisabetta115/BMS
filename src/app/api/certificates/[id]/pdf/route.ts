import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    if (!prisma) return NextResponse.json({ error: "Not configured." }, { status: 500 });
    const { id } = await params;
    const cert = await prisma.projectCertificate.findUnique({
      where: { id },
      select: { pdfData: true, pdfMime: true, pdfName: true },
    });
    if (!cert?.pdfData) return NextResponse.json({ error: "Not found." }, { status: 404 });

    return new NextResponse(cert.pdfData, {
      headers: {
        "Content-Type": cert.pdfMime || "application/pdf",
        "Content-Disposition": `inline; filename="${cert.pdfName || "certificate.pdf"}"`,
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "frame-ancestors 'self'",
      },
    });
  } catch (err) {
    console.error("Error serving certificate PDF:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
