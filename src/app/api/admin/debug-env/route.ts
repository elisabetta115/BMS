import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

// TEMPORARY diagnostic route — reports only whether each S3 env var is
// present (never its value), to debug why the deployed server can't see
// them. Remove this route once the issue is resolved.
//
// IMPORTANT: each reference below must be a literal `process.env.X` — a
// dynamic process.env[key] lookup bypasses Next.js's build-time env
// substitution (from next.config.ts) and would always read as unset.
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const status = {
    S3_ACCESS_KEY_ID: { present: !!process.env.S3_ACCESS_KEY_ID, length: process.env.S3_ACCESS_KEY_ID?.length || 0 },
    S3_SECRET_ACCESS_KEY: { present: !!process.env.S3_SECRET_ACCESS_KEY, length: process.env.S3_SECRET_ACCESS_KEY?.length || 0 },
    S3_REGION: { present: !!process.env.S3_REGION, length: process.env.S3_REGION?.length || 0 },
    S3_UPLOAD_BUCKET: { present: !!process.env.S3_UPLOAD_BUCKET, length: process.env.S3_UPLOAD_BUCKET?.length || 0 },
  };

  return NextResponse.json({ env: status, nodeEnv: process.env.NODE_ENV });
}
