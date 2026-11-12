// app/api/content/uploads/route.ts
// A link to upload one lesson file to S3 for a presentation unit: body { filename, contentType? }.

import { contentRoute, createLessonUpload, readJson } from "@/lib/content-api";

export const dynamic = "force-dynamic";

export const POST = contentRoute(async (req) => createLessonUpload(await readJson(req)));
