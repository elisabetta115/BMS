// app/api/images/[type]/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    if (!prisma) return new NextResponse("Not configured", { status: 500 });

    const { type, id } = await params;

    if (type !== "programme" && type !== "credential") {
      return new NextResponse("Invalid type", { status: 400 });
    }

    const record =
      type === "programme"
        ? await prisma.microProgramme.findUnique({
            where: { id },
            select: { imageData: true, imageMime: true },
          })
        : await prisma.microCredential.findUnique({
            where: { id },
            select: { imageData: true, imageMime: true },
          });

    if (!record || !record.imageData) {
      return new NextResponse("No image", { status: 404 });
    }

    return new NextResponse(record.imageData, {
      headers: {
        "Content-Type": record.imageMime || "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Image serve error:", err);
    return new NextResponse("Error", { status: 500 });
  }
}