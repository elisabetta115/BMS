// app/api/content/micro-programmes/route.ts
// The micro-programmes and their micro-credentials, for create's programmeId.

import { contentRoute, listProgrammes } from "@/lib/content-api";

export const dynamic = "force-dynamic";

export const GET = contentRoute(async () => listProgrammes());
