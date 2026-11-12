// The analytics endpoints, described so that an AI agent can use them as
// tools: each entry has a name, a description and a JSON Schema of its
// inputs (`input_schema`, the shape tool definitions take in the Claude API
// and, renamed, in MCP). Served by GET /api/analytics. Keep it in step with
// the routes in src/app/api/analytics/ and the queries in analytics.ts.

import { INTERVALS, METRICS } from "./analytics";

const date = (what: string) => ({
  type: "string",
  format: "date",
  description: `${what}, as YYYY-MM-DD (UTC). Included in the period.`,
});

const period = (defaults: string) => ({
  from: date(`First day of the period; ${defaults}`),
  to: date("Last day of the period; defaults to today"),
});

const optionalPeriod = {
  from: date("First day of an optional period. With from and/or to, each item also gets an inPeriod block"),
  to: date("Last day of the optional period; defaults to today when only from is given"),
};

const project = {
  type: "string",
  description: "Only items of this project (exact name, as in the project field of the results).",
};

export const ANALYTICS_DEFINITIONS = {
  learner: "An account with role USER. Site admins are left out of every figure; programme admins are learners and are counted.",
  grade: "A learner's grade in a micro-credential, 0-100, worked out as on the site: each unit earns its weight once completed; a quiz earns its weight in proportion to the questions answered right.",
  passed: "A learner enrolled in a micro-credential whose grade is at least the micro-credential's passGrade.",
  started: "Has completed at least one unit or submitted at least one quiz answer.",
  programmeCompleted: "A learner enrolled in a micro-programme who has passed every published micro-credential in it.",
  draft: "A micro-credential not yet published: only admins see it. Drafts don't count towards micro-programmes.",
  activeLearner: "A learner who enrolled, completed a unit, or saved or submitted a quiz answer in the period. An admin changing a quiz question's options also counts as activity for the learners who answered it.",
  rates: "Percentages from 0 to 100 with one decimal, or null when there is nothing to divide by.",
  privacy: "Every figure is an aggregate. No endpoint returns learners' names, email addresses or ids.",
};

export const ANALYTICS_ENDPOINTS = [
  {
    name: "get_overview",
    method: "GET",
    path: "/api/analytics/overview",
    description:
      "Headline figures for the whole site: all-time totals (learners, verified learners, admins, programmes, " +
      "micro-credentials, units, enrolments, completed units, micro-credentials passed, micro-programmes completed) " +
      "and what happened in a period (new learners, enrolments, completed units, active learners). Start here.",
    input_schema: {
      type: "object",
      properties: period("defaults to 30 days before to"),
      additionalProperties: false,
    },
  },
  {
    name: "get_timeseries",
    method: "GET",
    path: "/api/analytics/timeseries",
    description:
      "One metric counted per day, week (starting Monday) or month over a period, with zero for empty buckets, " +
      "for trends and comparisons between periods. The first and last week or month can be partial: only days " +
      "inside the period count. At most about 400 buckets per call.",
    input_schema: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: [...METRICS],
          description:
            "new_learners: accounts created. programme_enrolments / credential_enrolments: enrolments made. " +
            "unit_completions: units completed. active_learners: distinct learners active in each bucket.",
        },
        interval: { type: "string", enum: [...INTERVALS], description: "Bucket size; defaults to day." },
        ...period("defaults to 30 days before to"),
        credentialId: {
          type: "string",
          description: "Only this micro-credential (with credential_enrolments, unit_completions or active_learners).",
        },
        programmeId: { type: "string", description: "Only this micro-programme (with programme_enrolments)." },
      },
      required: ["metric"],
      additionalProperties: false,
    },
  },
  {
    name: "list_micro_credentials",
    method: "GET",
    path: "/api/analytics/credentials",
    description:
      "Every micro-credential with its learners: enrolled, started, passed, start and pass rates, average grade. " +
      "With a period, also the enrolments, completed units and active learners in it. Use it to rank or compare courses.",
    input_schema: {
      type: "object",
      properties: { project, ...optionalPeriod },
      additionalProperties: false,
    },
  },
  {
    name: "get_micro_credential",
    method: "GET",
    path: "/api/analytics/credentials/{id}",
    description:
      "One micro-credential in depth: its summary, how its enrolled learners' grades are spread (10 bands), and " +
      "each unit in course order with how many enrolled learners completed it (where learners drop off). Quiz units " +
      "also list their questions with how often they're answered right, right first time, and the average number of tries " +
      "(which questions are hard).",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The micro-credential's id (from list_micro_credentials). Goes in the path." },
        ...optionalPeriod,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "list_micro_programmes",
    method: "GET",
    path: "/api/analytics/programmes",
    description:
      "Every micro-programme with its learners: enrolled, started, completed (passed all its micro-credentials), " +
      "rates, and the average number of its micro-credentials passed. With a period, also the enrolments in it.",
    input_schema: {
      type: "object",
      properties: { project, ...optionalPeriod },
      additionalProperties: false,
    },
  },
  {
    name: "get_learners",
    method: "GET",
    path: "/api/analytics/learners",
    description:
      "Who the learners are, in aggregate: how many, verified email rate, number of programme admins, split by " +
      "country and by gender, and how many micro-credentials each is enrolled in. With a period, only learners who " +
      "registered in it.",
    input_schema: {
      type: "object",
      properties: {
        from: date("First day of an optional period: only learners who registered from then"),
        to: date("Last day of the optional period; defaults to today when only from is given"),
      },
      additionalProperties: false,
    },
  },
] as const;
