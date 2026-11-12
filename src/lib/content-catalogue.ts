// The content API's endpoints, described so that an AI agent can use them as
// tools (name, description, JSON Schema of the inputs). Served by GET
// /api/content. Keep it in step with src/app/api/content/ and content-api.ts.

import { FILE_TYPES, IMAGE_TYPES, UNIT_TYPES } from "./content-api";

const text = (description: string, maxLength?: number) => ({ type: ["string", "null"], description, ...(maxLength ? { maxLength } : {}) });
const id = (what: string) => ({ type: "string", description: `The ${what}'s id from get_micro_credential, to keep it (and learners' progress on it). Leave out for a new ${what}.` });

const questionSchema = {
  type: "object",
  properties: {
    id: id("question"),
    title: text("Short name of the question (optional)."),
    question: { type: "string", description: "The question text." },
    options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 10, description: "The answers to choose from, all different." },
    correctIndex: { type: "integer", minimum: 0, description: "Position of the right answer in options, from 0." },
    maxAttempts: { type: ["integer", "null"], minimum: 1, maximum: 100, description: "Tries allowed; null or left out for unlimited." },
  },
  required: ["question", "options", "correctIndex"],
  additionalProperties: false,
};

const unitSchema = {
  type: "object",
  properties: {
    id: id("unit"),
    title: { type: "string" },
    type: {
      type: "string",
      enum: [...UNIT_TYPES],
      description: "VIDEO: a video to watch. PRESENTATION: a lesson file (PDF, slides or spreadsheet). QUIZ: multiple-choice questions.",
    },
    weight: {
      type: "number", minimum: 0, maximum: 100,
      description: "The unit's % of the grade (decimals allowed). Videos and presentations earn it when the learner marks them done; a quiz earns it in proportion to the questions answered right.",
    },
    videoUrl: text("VIDEO only: a YouTube link or a direct link to a video file."),
    fileKey: text("PRESENTATION only: the fileKey from get_upload_url, after uploading the file. Send back the one you got from get_micro_credential to keep the file."),
    fileName: text("PRESENTATION only: the file's name, shown to learners."),
    fileMime: text("PRESENTATION only: the file's type; worked out from fileName if left out."),
    removeFile: { type: "boolean", description: "PRESENTATION only, when updating: true to remove the unit's file." },
    hasFile: { type: "boolean", description: "Read-only (from get_micro_credential); ignored." },
    questions: { type: "array", items: questionSchema, description: "QUIZ only, in order." },
  },
  required: ["title", "type"],
  additionalProperties: false,
};

const sectionsSchema = {
  type: "array",
  description:
    "The whole content, in order: sections contain subsections, which contain units. When updating, this replaces " +
    "the content: parts sent with their id are kept, parts without an id are new, and parts left out are deleted.",
  items: {
    type: "object",
    properties: {
      id: id("section"),
      title: { type: "string" },
      subsections: {
        type: "array",
        items: {
          type: "object",
          properties: { id: id("subsection"), title: { type: "string" }, units: { type: "array", items: unitSchema } },
          required: ["title"],
          additionalProperties: false,
        },
      },
    },
    required: ["title"],
    additionalProperties: false,
  },
};

const detailProperties = {
  title: { type: "string", maxLength: 200, description: "The micro-credential's name." },
  code: { type: "string", maxLength: 50, description: "Its course code, e.g. RES4CITY-MC05." },
  slug: text("Lowercase name for links, like circular-economy. Made from the title if left out.", 100),
  project: text("The project it belongs to, written exactly like existing ones (see list_micro_credentials: projects). Picks the certificate template.", 100),
  description: text("One or two sentences for course cards.", 2000),
  overview: text("About the course: plain text, one paragraph per line, lines starting with '• ' are bullets. A line 'Background' starts a Background part.", 20000),
  objectives: text("Learning objectives: plain text, one per line, lines starting with '• ' are bullets.", 20000),
  developedBy: text("Authors, then ', ' and the organisation, e.g. 'Jane Doe, John Roe, Maynooth University'.", 500),
  organisation: text("University or organisation shown on cards; the end of developedBy.", 200),
  topic: text("Subject area, e.g. Energy.", 100),
  passGrade: { type: "integer", minimum: 1, maximum: 100, description: "The % grade needed to pass; 50 if left out." },
  sections: sectionsSchema,
  image: {
    type: "object",
    description: "Cover image, at most 2 MB.",
    properties: {
      base64: { type: "string", description: "The image file in base64 (a data: URL works too)." },
      mime: { type: "string", enum: [...IMAGE_TYPES] },
    },
    required: ["base64"],
    additionalProperties: false,
  },
};

const flagSchema = (description: string) => ({ type: "boolean", description });

export const CONTENT_RULES = {
  grading: "Unit weights are % of the grade and must add up to at most 100 (normally exactly 100). A learner passes at passGrade.",
  ids: "Every part (section, subsection, unit, question) has an id. Learners' progress is stored against unit and question ids, so keep them when updating.",
  progress:
    "An update that would delete parts learners have worked on is refused (409) unless allowProgressLoss=true. " +
    "Changing a question's answers can also reset learners' answers to it.",
  visibility:
    "create_micro_credential makes a draft: learners don't see it until an admin publishes it in the admin panel. " +
    "This API can't publish, and it can only change drafts: update_micro_credential on a published one is refused (409).",
  deleting: "This API can't delete micro-credentials; a site admin does that in the admin panel.",
  errors: "Errors come back as { error, problems } with status 400 (fix the listed problems), 401/403 (key), 404 or 409.",
  warnings: "Successful calls can return warnings: things that work but are probably not intended (no video URL, weights not adding up to 100…).",
};

export const CONTENT_ENDPOINTS = [
  {
    name: "list_micro_credentials",
    method: "GET",
    path: "/api/content/micro-credentials",
    description:
      "The micro-credentials on the site (id, title, code, project, status draft or published, size, programmes), and without filters the project names in use " +
      "and whether each has a certificate template. Check here first that a course doesn't exist already.",
    query_params: ["search", "project"],
    input_schema: {
      type: "object",
      properties: {
        search: { type: "string", description: "Part of a title, code or slug." },
        project: { type: "string", description: "Only this project (exact name)." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_micro_credential",
    method: "GET",
    path: "/api/content/micro-credentials/{id}",
    description:
      "One micro-credential with all its content and ids, including the right answers. Its microCredential object has exactly the " +
      "fields update_micro_credential takes: change it and send it back. readOnly has the rest (status draft or published, " +
      "programmes, enrolled learners, page link).",
    path_params: ["id"],
    input_schema: {
      type: "object",
      properties: { id: { type: "string", description: "The micro-credential's id." } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "create_micro_credential",
    method: "POST",
    path: "/api/content/micro-credentials",
    description:
      "Creates a micro-credential as a draft, with its details and all its content, optionally inside a micro-programme. An admin " +
      "reviews and publishes it in the admin panel. Upload lesson files " +
      "first with get_upload_url. Use dryRun=true to check everything without saving. Refused (409) if one with the same title and " +
      "code exists, unless allowDuplicate=true.",
    query_params: ["dryRun", "allowDuplicate"],
    input_schema: {
      type: "object",
      properties: {
        ...detailProperties,
        programmeId: { type: "string", description: "Put it in this micro-programme, at the end (ids from list_micro_programmes)." },
        dryRun: flagSchema("Only check the input and report what would be created."),
        allowDuplicate: flagSchema("Create it even if one with the same title and code exists."),
      },
      required: ["title", "code"],
      additionalProperties: false,
    },
  },
  {
    name: "update_micro_credential",
    method: "PATCH",
    path: "/api/content/micro-credentials/{id}",
    description:
      "Changes a draft micro-credential (a published one is refused with 409: admins change those). Only the fields sent change. " +
      "If sections is sent, it replaces the whole content (keep ids to keep " +
      "parts). Use dryRun=true to see what would change, including any learner progress that would be lost.",
    path_params: ["id"],
    query_params: ["dryRun", "allowProgressLoss"],
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The micro-credential's id." },
        ...detailProperties,
        removeImage: { type: "boolean", description: "true to remove the cover image." },
        dryRun: flagSchema("Only check the input and report what would change."),
        allowProgressLoss: flagSchema("Save even though it deletes parts learners have worked on."),
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "list_micro_programmes",
    method: "GET",
    path: "/api/content/micro-programmes",
    description: "The micro-programmes (id, title, code, project) and the micro-credentials in each, for create_micro_credential's programmeId.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_upload_url",
    method: "POST",
    path: "/api/content/uploads",
    description:
      `A link to upload one lesson file for a PRESENTATION unit (${Object.keys(FILE_TYPES).join(", ")}). PUT the file's bytes to ` +
      "uploadUrl with the headers given, within 5 minutes, then use the returned fileKey, fileName and fileMime in the unit.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "The file's name with its extension, e.g. 'Week 1 slides.pdf'." },
        contentType: { type: "string", description: "The file's type; worked out from the extension if left out." },
      },
      required: ["filename"],
      additionalProperties: false,
    },
  },
] as const;
