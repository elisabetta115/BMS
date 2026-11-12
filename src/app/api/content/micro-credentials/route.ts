// app/api/content/micro-credentials/route.ts
// GET: the micro-credentials (?search=&project=). POST: create one (?dryRun=&allowDuplicate=).

import { NextResponse } from "next/server";
import { contentRoute, createCredential, flag, listCredentials, readJson } from "@/lib/content-api";

export const dynamic = "force-dynamic";

export const GET = contentRoute(async (req) => {
  const params = req.nextUrl.searchParams;
  return listCredentials({ search: params.get("search") || undefined, project: params.get("project") || undefined });
});

export const POST = contentRoute(async (req, _ctx, caller) => {
  const result = await createCredential(
    await readJson(req),
    { dryRun: flag(req, "dryRun"), allowDuplicate: flag(req, "allowDuplicate") },
    caller
  );
  return NextResponse.json(result, { status: "dryRun" in result ? 200 : 201, headers: { "Cache-Control": "no-store" } });
});
