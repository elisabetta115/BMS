// Access to the APIs an agent or a script can call (/api/analytics,
// /api/content). Each API has its own key, so a key that can only read
// figures can't change courses.

import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/** Shorter keys are ignored, so a placeholder value can't turn key access on. */
const MIN_KEY_LENGTH = 32;

export type ApiCaller = { via: "key" } | { via: "session"; userId: string };

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/**
 * A caller sending `Authorization: Bearer <key>`, or else a site admin signed
 * in to the site. `key` is the API's own key: pass it written out as
 * `process.env.NAME`, which next.config.ts can inline at build time
 * (Amplify doesn't give the server its environment variables at run time).
 */
export async function checkApiAccess(req: NextRequest, key: string | undefined): Promise<ApiCaller | NextResponse> {
  const header = req.headers.get("authorization");
  if (header) {
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    const expected = key ?? "";
    if (match && expected.length >= MIN_KEY_LENGTH && timingSafeEqual(sha256(match[1]), sha256(expected))) {
      return { via: "key" };
    }
    return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
  }
  const auth = await requireAdmin();
  return auth instanceof NextResponse ? auth : { via: "session", userId: auth.userId };
}
