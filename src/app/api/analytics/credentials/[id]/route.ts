// app/api/analytics/credentials/[id]/route.ts
// One micro-credential in depth: grades, units, quiz questions. ?from=&to=

import { NextRequest, NextResponse } from "next/server";
import { analyticsRoute, getCredentialDetail, parsePeriod } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export const GET = analyticsRoute(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const detail = await getCredentialDetail(id, parsePeriod(req.nextUrl.searchParams, 30, true));
    return detail ?? NextResponse.json({ error: "Micro-credential not found." }, { status: 404 });
  }
);
