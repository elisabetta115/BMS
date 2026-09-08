import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { PDFDocument } from "pdf-lib";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const certificates = await prisma.projectCertificate.findMany({
      orderBy: { project: "asc" },
      select: {
        id: true,
        project: true,
        pdfName: true,
        nameX: true,
        nameY: true,
        titleX: true,
        titleY: true,
        fontSize: true,
        nameFontSize: true,
        titleFontSize: true,
        nameMaxWidth: true,
        titleMaxWidth: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ certificates });
  } catch (err) {
    console.error("Error fetching certificates:", err);
    return NextResponse.json({ error: "Failed to fetch." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { project, pdfBase64, pdfMime, pdfName, nameX, nameY, titleX, titleY, fontSize, nameFontSize, titleFontSize, nameMaxWidth, titleMaxWidth } = await req.json();

    if (!project) return NextResponse.json({ error: "Project required." }, { status: 400 });
    if (!pdfBase64) return NextResponse.json({ error: "PDF required." }, { status: 400 });

    const raw = Buffer.from(pdfBase64, "base64");
    const srcDoc = await PDFDocument.load(raw);
    const singleDoc = await PDFDocument.create();
    const [firstPage] = await singleDoc.copyPages(srcDoc, [0]);
    singleDoc.addPage(firstPage);
    const pdfData = Buffer.from(await singleDoc.save());

    const certificate = await prisma.projectCertificate.upsert({
      where: { project },
      update: {
        pdfData,
        pdfMime: pdfMime || "application/pdf",
        pdfName: pdfName || "certificate.pdf",
        nameX: nameX ?? 50,
        nameY: nameY ?? 50,
        titleX: titleX ?? 50,
        titleY: titleY ?? 60,
        fontSize: fontSize ?? 24,
        nameFontSize: nameFontSize ?? 28,
        titleFontSize: titleFontSize ?? 21,
        nameMaxWidth: nameMaxWidth ?? 80,
        titleMaxWidth: titleMaxWidth ?? 80,
      },
      create: {
        project,
        pdfData,
        pdfMime: pdfMime || "application/pdf",
        pdfName: pdfName || "certificate.pdf",
        nameX: nameX ?? 50,
        nameY: nameY ?? 50,
        titleX: titleX ?? 50,
        titleY: titleY ?? 60,
        fontSize: fontSize ?? 24,
        nameFontSize: nameFontSize ?? 28,
        titleFontSize: titleFontSize ?? 21,
        nameMaxWidth: nameMaxWidth ?? 80,
        titleMaxWidth: titleMaxWidth ?? 80,
      },
      select: {
        id: true,
        project: true,
        pdfName: true,
        nameX: true,
        nameY: true,
        titleX: true,
        titleY: true,
        fontSize: true,
        nameFontSize: true,
        titleFontSize: true,
        nameMaxWidth: true,
        titleMaxWidth: true,
      },
    });

    return NextResponse.json({ certificate }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating certificate:", err);
    return NextResponse.json({ error: "Failed to save." }, { status: 500 });
  }
}
