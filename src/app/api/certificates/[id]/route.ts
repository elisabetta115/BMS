import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { PDFDocument } from "pdf-lib";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!prisma) return NextResponse.json({ error: "Not configured." }, { status: 500 });
    const { id } = await params;
    const certificate = await prisma.projectCertificate.findUnique({
      where: { id },
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
    if (!certificate) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ certificate });
  } catch (err) {
    console.error("Error fetching certificate:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    if (!prisma) return NextResponse.json({ error: "Not configured." }, { status: 500 });
    const { id } = await params;
    const { project, pdfBase64, pdfMime, pdfName, nameX, nameY, titleX, titleY, fontSize, nameFontSize, titleFontSize, nameMaxWidth, titleMaxWidth } = await req.json();

    const updateData: any = {};
    if (project !== undefined) updateData.project = project;
    if (nameX !== undefined) updateData.nameX = nameX;
    if (nameY !== undefined) updateData.nameY = nameY;
    if (titleX !== undefined) updateData.titleX = titleX;
    if (titleY !== undefined) updateData.titleY = titleY;
    if (fontSize !== undefined) updateData.fontSize = fontSize;
    if (nameFontSize !== undefined) updateData.nameFontSize = nameFontSize;
    if (titleFontSize !== undefined) updateData.titleFontSize = titleFontSize;
    if (nameMaxWidth !== undefined) updateData.nameMaxWidth = nameMaxWidth;
    if (titleMaxWidth !== undefined) updateData.titleMaxWidth = titleMaxWidth;
    if (pdfBase64) {
      const raw = Buffer.from(pdfBase64, "base64");
      const srcDoc = await PDFDocument.load(raw);
      const singleDoc = await PDFDocument.create();
      const [firstPage] = await singleDoc.copyPages(srcDoc, [0]);
      singleDoc.addPage(firstPage);
      updateData.pdfData = Buffer.from(await singleDoc.save());
      updateData.pdfMime = pdfMime || "application/pdf";
      updateData.pdfName = pdfName || "certificate.pdf";
    }

    const certificate = await prisma.projectCertificate.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ certificate });
  } catch (err: any) {
    console.error("Error updating certificate:", err);
    return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    if (!prisma) return NextResponse.json({ error: "Not configured." }, { status: 500 });
    const { id } = await params;
    await prisma.projectCertificate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error deleting certificate:", err);
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}
