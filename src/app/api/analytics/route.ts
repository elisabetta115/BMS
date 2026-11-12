// app/api/analytics/route.ts
// The list of analytics endpoints, written for an AI agent to read and turn
// into tools (see src/lib/analytics-catalogue.ts).

import { analyticsRoute } from "@/lib/analytics";
import { ANALYTICS_DEFINITIONS, ANALYTICS_ENDPOINTS } from "@/lib/analytics-catalogue";

export const dynamic = "force-dynamic";

export const GET = analyticsRoute(async () => ({
  name: "BoostMySkills analytics API",
  description:
    "Read-only, aggregate figures about the learners, micro-programmes and micro-credentials of BoostMySkills. " +
    "Call an endpoint with GET, putting path parameters ({id}) in the path and the other inputs in the query string. " +
    "Send the API key as 'Authorization: Bearer <key>'. Errors come back as { error } with status 400, 401, 403 or 404.",
  definitions: ANALYTICS_DEFINITIONS,
  endpoints: ANALYTICS_ENDPOINTS,
}));
