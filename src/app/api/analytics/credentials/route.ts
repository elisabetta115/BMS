// app/api/analytics/credentials/route.ts
// Every micro-credential with its learners' figures: ?project=&from=&to=

import { analyticsRoute, listCredentials, parsePeriod } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export const GET = analyticsRoute(async (req) => {
  const params = req.nextUrl.searchParams;
  return listCredentials(params.get("project") || undefined, parsePeriod(params, 30, true));
});
