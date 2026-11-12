import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminAccess, requireAdmin, requireProgrammeAccess, seesProgrammeDrafts } from "@/lib/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { id } = await params;
    // Public: the programme pages and the admin only need each micro-credential's
    // details and section count. Course content stays out, above all the quiz
    // questions with their right answers (those come, without the answers,
    // from /api/micro-credentials/[id]).
    const programme = await prisma.microProgramme.findUnique({
      where: { id },
      omit: { imageData: true },
      include: {
        credentials: {
          orderBy: { order: "asc" },
          include: {
            credential: {
              omit: { imageData: true },
              include: { _count: { select: { sections: true } } },
            },
          },
        },
      },
    });
    if (!programme) return NextResponse.json({ error: "Not found." }, { status: 404 });
    // Drafts only for the people who can edit them; for learners the programme
    // is just its published micro-credentials (its progress and certificate too).
    const showDrafts = seesProgrammeDrafts(await getAdminAccess(), id);
    const result = {
      ...programme,
      hasImage: !!programme.imageMime,
      credentials: programme.credentials.filter((pc) => pc.credential.published || showDrafts).map(({ credential: { _count, ...credential } }) => ({
        ...credential,
        hasImage: !!credential.imageMime,
        sectionsCount: _count.sections,
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
  const { id } = await params;
  const auth = await requireProgrammeAccess(id);
  if (auth instanceof NextResponse) return auth;
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { title, slug, code, project, imageBase64, imageMime, removeImage } = await req.json();

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (slug !== undefined) data.slug = slug;
    if (code !== undefined) data.code = code;
    if (project !== undefined) data.project = project;

    if (imageBase64 && imageMime) {
      data.imageData = Buffer.from(imageBase64, "base64");
      data.imageMime = imageMime;
    } else if (removeImage) {
      data.imageData = null;
      data.imageMime = null;
    }

    const programme = await prisma.microProgramme.update({ where: { id }, data, omit: { imageData: true } });
    return NextResponse.json({
      programme: { ...programme, hasImage: !!programme.imageMime },
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
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
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
