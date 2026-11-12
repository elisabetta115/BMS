// app/api/analytics/learners/route.ts
// The learners in aggregate (countries, genders, enrolments): ?from=&to=

import { analyticsRoute, getLearners, parsePeriod } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export const GET = analyticsRoute(async (req) => getLearners(parsePeriod(req.nextUrl.searchParams, 30, true)));
