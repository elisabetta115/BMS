// app/api/content/route.ts
// The list of content API endpoints, written for an AI agent to read and turn
// into tools (see src/lib/content-catalogue.ts).

import { contentRoute } from "@/lib/content-api";
import { CONTENT_ENDPOINTS, CONTENT_RULES } from "@/lib/content-catalogue";

export const dynamic = "force-dynamic";

export const GET = contentRoute(async () => ({
  name: "BoostMySkills content API",
  description:
    "Enter micro-credentials on BoostMySkills: read them, create them as drafts with all their content, update drafts, and upload lesson files. " +
    "Send the API key as 'Authorization: Bearer <key>'. For each endpoint, put path_params in the path ({id}), query_params in " +
    "the query string, and every other input in a JSON body. Typical flow: list_micro_credentials (does it exist?), " +
    "list_micro_programmes, get_upload_url for each lesson file, create_micro_credential with dryRun=true, then without.",
  rules: CONTENT_RULES,
  endpoints: CONTENT_ENDPOINTS,
}));
