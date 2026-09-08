import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const programmes = await prisma.microProgramme.findMany({
      orderBy: { code: "asc" },
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
    const result = programmes.map((p: any) => ({
      ...p,
      imageData: undefined, // never send binary to client
      hasImage: !!p.imageData,
      credentials: p.credentials.map((pc: any) => ({
        ...pc.credential,
        imageData: undefined,
        hasImage: !!pc.credential.imageData,
      })),
    }));
    return NextResponse.json({ programmes: result });
  } catch (err) {
    console.error("Error fetching micro-programmes:", err);
    return NextResponse.json({ error: "Failed to fetch." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  try {
    if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
    const { title, slug, code, project, description, imageBase64, imageMime } = await req.json();
    if (!title || !code) return NextResponse.json({ error: "Title and code required." }, { status: 400 });

    const baseSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Find a unique slug by appending a counter if needed
    let finalSlug = baseSlug;
    let attempt = 1;
    while (await prisma.microProgramme.findUnique({ where: { slug: finalSlug } })) {
      attempt++;
      finalSlug = `${baseSlug}-${attempt}`;
    }

    const data: any = {
      title, slug: finalSlug, code,
      project: project || "",
      description: description || null,
    };

    if (imageBase64 && imageMime) {
      data.imageData = Buffer.from(imageBase64, "base64");
      data.imageMime = imageMime;
    }

    const programme = await prisma.microProgramme.create({ data });
    return NextResponse.json({
      programme: { ...programme, imageData: undefined, hasImage: !!programme.imageData },
    }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating micro-programme:", err);
    return NextResponse.json({ error: "Failed to create." }, { status: 500 });
  }
}
