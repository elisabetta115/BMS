import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }
    if (!prisma) {
      return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    }

    const { type, id } = await params;

    if (type !== "programme" && type !== "credential") {
      return NextResponse.json({ error: "Invalid type." }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only PNG and JPG files are allowed." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 2MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (type === "programme") {
      await prisma.microProgramme.update({
        where: { id },
        data: { imageData: buffer, imageMime: file.type },
      });
    } else {
      await prisma.microCredential.update({
        where: { id },
        data: { imageData: buffer, imageMime: file.type },
      });
    }

    return NextResponse.json({ success: true, url: `/api/images/${type}/${id}` });
  } catch (err) {
    console.error("Image upload error:", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }
    if (!prisma) {
      return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    }

    const { type, id } = await params;

    if (type === "programme") {
      await prisma.microProgramme.update({
        where: { id },
        data: { imageData: null, imageMime: null },
      });
    } else if (type === "credential") {
      await prisma.microCredential.update({
        where: { id },
        data: { imageData: null, imageMime: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Image delete error:", err);
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
}
