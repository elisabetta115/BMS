import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { execFile } from "child_process";

export const dynamic = "force-dynamic";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  let tmpDir: string | null = null;
  try {
    if (!prisma) return new NextResponse("Not configured", { status: 500 });

    const { unitId } = await params;

    const unit = await prisma.credentialUnit.findUnique({
      where: { id: unitId },
      select: { fileData: true, fileMime: true, fileName: true },
    });

    if (!unit || !unit.fileData) {
      return new NextResponse("No file", { status: 404 });
    }

    const mime = unit.fileMime || "";
    const fileBytes = Buffer.from(unit.fileData);

    // Already a PDF — serve inline directly.
    if (mime === "application/pdf") {
      return new NextResponse(fileBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${unit.fileName || "presentation.pdf"}"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // PPTX / PPT → PDF via LibreOffice.
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "bms-pptx-"));

    // Unique user installation dir avoids conflicts with other LO instances.
    const loUserDir = path.join(tmpDir, "lo-user");

    const ext = mime.includes("presentation") ? ".pptx" : ".ppt";
    const inputPath = path.join(tmpDir, `input${ext}`);
    await fs.writeFile(inputPath, fileBytes);

    const { stderr } = await execFileAsync(
      "libreoffice",
      [
        `-env:UserInstallation=file://${loUserDir}`,
        "--headless",
        "--norestore",
        "--nofirststartwizard",
        "--convert-to", "pdf:impress_pdf_Export",
        "--outdir", tmpDir,
        inputPath,
      ],
      { timeout: 60_000 }
    );

    if (stderr) console.warn("LibreOffice stderr:", stderr);

    const outputPath = path.join(tmpDir, "input.pdf");
    const pdfBuffer = await fs.readFile(outputPath);

    const baseName = (unit.fileName || "presentation").replace(/\.\w+$/, "");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${baseName}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("PDF conversion error:", err);
    return new NextResponse("Conversion failed", { status: 500 });
  } finally {
    if (tmpDir) fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
