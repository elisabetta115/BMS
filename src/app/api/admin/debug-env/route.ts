import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

// TEMPORARY diagnostic route — reports only whether each S3 env var is
// present (never its value), to debug why the deployed server can't see
// them. Remove this route once the issue is resolved.
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const keys = ["S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_REGION", "S3_UPLOAD_BUCKET"];
  const status: Record<string, { present: boolean; length: number }> = {};
  for (const key of keys) {
    const value = process.env[key];
    status[key] = { present: !!value, length: value?.length || 0 };
  }

  return NextResponse.json({ env: status, nodeEnv: process.env.NODE_ENV });
}
