import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCredentialProgress } from "@/lib/grading";
import { stampCertificate } from "@/lib/certificate";
import { loadCertificateAssets } from "@/lib/certificate-assets";

export const dynamic = "force-dynamic";

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
        select: { title: true, project: true },
      });
      if (!credential) return NextResponse.json({ error: "Credential not found." }, { status: 404 });

      hasPassed = (await getCredentialProgress(session.userId, credentialId)).hasPassed;
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
              credential: { select: { id: true } },
            },
          },
        },
      });
      if (!programme) return NextResponse.json({ error: "Programme not found." }, { status: 404 });

      const credIds = programme.credentials.map(pc => pc.credential.id);
      const allPassed = await Promise.all(
        credIds.map(async (id) => (await getCredentialProgress(session.userId, id)).hasPassed)
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
      select: { pdfData: true, introText: true, closingText: true, contentTop: true, contentBottom: true, contentWidth: true },
    });
    if (!cert?.pdfData) {
      return NextResponse.json({ error: "No certificate template configured for this project." }, { status: 404 });
    }

    const { pdfData, ...layout } = cert;
    const assets = await loadCertificateAssets(process.env.APP_URL || req.nextUrl.origin);
    const pdfBytes = await stampCertificate(pdfData, assets, { learnerName: user.name, title: contentTitle }, layout);
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
