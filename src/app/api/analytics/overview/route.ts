// app/api/analytics/overview/route.ts
// Headline figures: all-time totals and what happened in a period.

import { analyticsRoute, getOverview, parsePeriod } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export const GET = analyticsRoute(async (req) => getOverview(parsePeriod(req.nextUrl.searchParams, 30)!));
