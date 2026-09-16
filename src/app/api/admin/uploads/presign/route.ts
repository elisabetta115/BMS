import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createUploadUrl, isS3Configured } from "@/lib/s3";

const PURPOSES = {
  "olx-import": { prefix: "olx-imports", check: requireAdmin },
  "unit-file": { prefix: "unit-files", check: requireAdmin },
} as const;

export async function POST(req: NextRequest) {
  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "File storage isn't configured yet (missing S3 environment variables)." },
      { status: 500 }
    );
  }

  const { filename, contentType, purpose } = await req.json();
  if (!filename || !contentType || !purpose || !(purpose in PURPOSES)) {
    return NextResponse.json({ error: "filename, contentType and a valid purpose are required." }, { status: 400 });
  }

  const { prefix, check } = PURPOSES[purpose as keyof typeof PURPOSES];
  const auth = await check();
  if (auth instanceof NextResponse) return auth;

  const result = await createUploadUrl(filename, contentType, prefix);
  if (!result) {
    return NextResponse.json({ error: "File storage isn't configured yet." }, { status: 500 });
  }

  return NextResponse.json(result);
}
