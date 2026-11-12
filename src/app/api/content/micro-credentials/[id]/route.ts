// app/api/content/micro-credentials/[id]/route.ts
// GET: one micro-credential with all its content. PATCH: change it (?dryRun=&allowProgressLoss=).

import { NextRequest, NextResponse } from "next/server";
import { contentRoute, flag, getCredential, readJson, updateCredential } from "@/lib/content-api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = contentRoute(async (_req: NextRequest, { params }: Ctx) => {
  const credential = await getCredential((await params).id);
  return credential ?? NextResponse.json({ error: "Micro-credential not found." }, { status: 404 });
});

export const PATCH = contentRoute(async (req: NextRequest, { params }: Ctx, caller) =>
  updateCredential(
    (await params).id,
    await readJson(req),
    { dryRun: flag(req, "dryRun"), allowProgressLoss: flag(req, "allowProgressLoss") },
    caller
  )
);
