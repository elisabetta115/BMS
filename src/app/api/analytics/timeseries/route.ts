// app/api/analytics/timeseries/route.ts
// One metric per day, week or month: ?metric=&interval=&from=&to=&credentialId=&programmeId=

import {
  AnalyticsInputError,
  analyticsRoute,
  getTimeseries,
  INTERVALS,
  METRICS,
  parsePeriod,
  type Interval,
  type Metric,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";

export const GET = analyticsRoute(async (req) => {
  const params = req.nextUrl.searchParams;
  const metric = params.get("metric") ?? "";
  const interval = params.get("interval") ?? "day";
  if (!(METRICS as readonly string[]).includes(metric)) {
    throw new AnalyticsInputError(`metric must be one of: ${METRICS.join(", ")}.`);
  }
  if (!(INTERVALS as readonly string[]).includes(interval)) {
    throw new AnalyticsInputError(`interval must be one of: ${INTERVALS.join(", ")}.`);
  }
  return getTimeseries(metric as Metric, interval as Interval, parsePeriod(params, 30)!, {
    credentialId: params.get("credentialId") || undefined,
    programmeId: params.get("programmeId") || undefined,
  });
});
