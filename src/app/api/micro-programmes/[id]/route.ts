import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    const programme = await prisma.microProgramme.findUnique({
      where: { id },
      include: {
        credentials: {
          orderBy: { order: "asc" },
          include: {
            credential: {
              include: {
                sections: {
                  orderBy: { order: "asc" },
                  include: { subsections: { orderBy: { order: "asc" }, include: { units: { orderBy: { order: "asc" }, include: { questions: { orderBy: { order: "asc" } } } } } } },
                },
              },
            },
          },
        },
      },
    });
    if (!programme) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const result = {
      ...programme,
      imageData: undefined,
      hasImage: !!programme.imageData,
      credentials: programme.credentials.map((pc: any) => ({
        ...pc.credential,
        imageData: undefined,
        hasImage: !!pc.credential.imageData,
      })),
    };
    return NextResponse.json({ programme: result });
  } catch (err) {
    console.error("Error fetching programme:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    const { title, slug, code, project, description, imageBase64, imageMime, removeImage } = await req.json();

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (slug !== undefined) data.slug = slug;
    if (code !== undefined) data.code = code;
    if (project !== undefined) data.project = project;
    if (description !== undefined) data.description = description || null;

    if (imageBase64 && imageMime) {
      data.imageData = Buffer.from(imageBase64, "base64");
      data.imageMime = imageMime;
    } else if (removeImage) {
      data.imageData = null;
      data.imageMime = null;
    }

    const programme = await prisma.microProgramme.update({ where: { id }, data });
    return NextResponse.json({
      programme: { ...programme, imageData: undefined, hasImage: !!programme.imageData },
    });
  } catch (err: any) {
    console.error("Error updating programme:", err);
    if (err?.code === "P2002") return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    await prisma.microProgramme.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting programme:", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
