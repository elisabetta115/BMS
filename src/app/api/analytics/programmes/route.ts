// app/api/analytics/programmes/route.ts
// Every micro-programme with its learners' figures: ?project=&from=&to=

import { analyticsRoute, listProgrammes, parsePeriod } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export const GET = analyticsRoute(async (req) => {
  const params = req.nextUrl.searchParams;
  return listProgrammes(params.get("project") || undefined, parsePeriod(params, 30, true));
});
