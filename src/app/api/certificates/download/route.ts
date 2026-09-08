import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    if (!prisma) return NextResponse.json({ error: "Not configured." }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const credentialId = searchParams.get("credentialId");
    const programmeId = searchParams.get("programmeId");

    let project = "";
    let contentTitle = "";
    let hasPassed = false;

    if (credentialId) {
      const credential = await prisma.microCredential.findUnique({
        where: { id: credentialId },
        select: { title: true, project: true, passGrade: true },
      });
      if (!credential) return NextResponse.json({ error: "Credential not found." }, { status: 404 });

      const completions = await prisma.unitCompletion.findMany({
        where: {
          userId: session.userId,
          unit: { subsection: { section: { credentialId } } },
        },
        select: { unit: { select: { weight: true } } },
      });

      const grade = completions.reduce((sum, c) => sum + c.unit.weight, 0);
      hasPassed = grade >= credential.passGrade;
      project = credential.project;
      contentTitle = credential.title;
    } else if (programmeId) {
      const programme = await prisma.microProgramme.findUnique({
        where: { id: programmeId },
        select: {
          title: true,
          project: true,
          credentials: {
            select: {
              credential: { select: { id: true, passGrade: true } },
            },
          },
        },
      });
      if (!programme) return NextResponse.json({ error: "Programme not found." }, { status: 404 });

      const credIds = programme.credentials.map(pc => pc.credential.id);
      const allPassed = await Promise.all(
        programme.credentials.map(async pc => {
          const completions = await prisma!.unitCompletion.findMany({
            where: {
              userId: session.userId,
              unit: { subsection: { section: { credentialId: pc.credential.id } } },
            },
            select: { unit: { select: { weight: true } } },
          });
          const grade = completions.reduce((sum, c) => sum + c.unit.weight, 0);
          return grade >= pc.credential.passGrade;
        })
      );

      hasPassed = credIds.length > 0 && allPassed.every(Boolean);
      project = programme.project;
      contentTitle = programme.title;
    } else {
      return NextResponse.json({ error: "credentialId or programmeId required." }, { status: 400 });
    }

    if (!hasPassed) {
      return NextResponse.json({ error: "You have not passed this course yet." }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const cert = await prisma.projectCertificate.findUnique({
      where: { project },
      select: { pdfData: true, nameX: true, nameY: true, titleX: true, titleY: true, fontSize: true, nameFontSize: true, titleFontSize: true, nameMaxWidth: true, titleMaxWidth: true },
    });
    if (!cert?.pdfData) {
      return NextResponse.json({ error: "No certificate template configured for this project." }, { status: 404 });
    }

    const pdfDoc = await PDFDocument.load(cert.pdfData);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const CAP_HEIGHT_RATIO = 0.72;

    const nameMaxWidthPt = ((cert.nameMaxWidth ?? 80) / 100) * width;
    let nameFontSize = cert.nameFontSize || cert.fontSize || 28;
    const nameRawWidth = font.widthOfTextAtSize(user.name, nameFontSize);
    if (nameRawWidth > nameMaxWidthPt) {
      nameFontSize = nameFontSize * (nameMaxWidthPt / nameRawWidth);
    }
    const nameTextWidth = font.widthOfTextAtSize(user.name, nameFontSize);
    const nameXpt = (cert.nameX / 100) * width - nameTextWidth / 2;
    const nameYpt = height - (cert.nameY / 100) * height - nameFontSize * CAP_HEIGHT_RATIO;

    firstPage.drawText(user.name, {
      x: nameXpt,
      y: nameYpt,
      size: nameFontSize,
      font,
      color: rgb(0, 0, 0),
    });

    const titleMaxWidthPt = ((cert.titleMaxWidth ?? 80) / 100) * width;
    let titleFontSize = cert.titleFontSize || Math.round((cert.nameFontSize || 28) * 0.75);
    const titleRawWidth = font.widthOfTextAtSize(contentTitle, titleFontSize);
    if (titleRawWidth > titleMaxWidthPt) {
      titleFontSize = titleFontSize * (titleMaxWidthPt / titleRawWidth);
    }
    const titleTextWidth = font.widthOfTextAtSize(contentTitle, titleFontSize);
    const titleXpt = (cert.titleX / 100) * width - titleTextWidth / 2;
    const titleYpt = height - (cert.titleY / 100) * height - titleFontSize * CAP_HEIGHT_RATIO;

    firstPage.drawText(contentTitle, {
      x: titleXpt,
      y: titleYpt,
      size: titleFontSize,
      font,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    const safeName = user.name.replace(/[^a-zA-Z0-9]/g, "_");
    const safeTitle = contentTitle.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificate_${safeName}_${safeTitle}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Error generating certificate:", err);
    return NextResponse.json({ error: "Failed to generate certificate." }, { status: 500 });
  }
}
