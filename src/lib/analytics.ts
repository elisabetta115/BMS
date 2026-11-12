// Analytics over learners' activity, served by /api/analytics/* for site
// admins and for an AI agent later on (see analytics-catalogue.ts for the
// list of endpoints the agent can call).
//
// Everything here is read-only and aggregate: counts, rates and averages.
// No learner's name, email address or id leaves this module, so the answers
// can be handed to an external AI service without sharing personal data.
//
// Conventions:
//  - "Learners" are accounts with role USER. Site admins are left out of every
//    figure, so their testing doesn't skew the numbers (programme admins are
//    learners and are counted).
//  - Dates are UTC days. A period's `from` and `to` days are both included.

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkApiAccess } from "@/lib/api-key";

// ─── Access ─────────────────────────────────────────────────

/** A wrong query parameter; answered with a 400 and the message. */
export class AnalyticsInputError extends Error {}

/**
 * Wraps an analytics GET handler: access (a signed-in site admin, or
 * `Authorization: Bearer <ANALYTICS_API_KEY>`), errors, and no caching.
 */
export function analyticsRoute<C>(handler: (req: NextRequest, ctx: C) => Promise<unknown>) {
  return async (req: NextRequest, ctx: C) => {
    const caller = await checkApiAccess(req, process.env.ANALYTICS_API_KEY);
    if (caller instanceof NextResponse) return caller;
    try {
      if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 500 });
      const body = await handler(req, ctx);
      if (body instanceof NextResponse) return body;
      return NextResponse.json(
        { ...(body as object), generatedAt: new Date().toISOString() },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch (err) {
      if (err instanceof AnalyticsInputError) return NextResponse.json({ error: err.message }, { status: 400 });
      console.error("Analytics error:", err);
      return NextResponse.json({ error: "Failed." }, { status: 500 });
    }
  };
}

// ─── Periods ────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Period {
  /** First day included, YYYY-MM-DD. */
  from: string;
  /** Last day included, YYYY-MM-DD. */
  to: string;
  /** Start of `from` (UTC). */
  start: Date;
  /** Start of the day after `to` (UTC), excluded. */
  end: Date;
}

function day(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDay(value: string, name: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || isNaN(date.getTime()) || day(date) !== value) {
    throw new AnalyticsInputError(`${name} must be a date written as YYYY-MM-DD, like 2026-10-31.`);
  }
  return date;
}

/**
 * The period asked for with ?from=&to= (both optional). A missing `to` is
 * today; a missing `from` is `defaultDays` days before `to`. With
 * `optional`, no period at all (null) when neither is given.
 */
export function parsePeriod(params: URLSearchParams, defaultDays: number, optional = false): Period | null {
  const fromParam = params.get("from");
  const toParam = params.get("to");
  if (optional && !fromParam && !toParam) return null;

  const toDate = toParam ? parseDay(toParam, "to") : parseDay(day(new Date()), "to");
  const fromDate = fromParam ? parseDay(fromParam, "from") : new Date(toDate.getTime() - (defaultDays - 1) * DAY_MS);
  if (fromDate > toDate) throw new AnalyticsInputError("from must be on or before to.");
  return { from: day(fromDate), to: day(toDate), start: fromDate, end: new Date(toDate.getTime() + DAY_MS) };
}

/** A UTC instant as an SQL timestamp: the columns are `timestamp without time zone`, holding UTC. */
function ts(date: Date): Prisma.Sql {
  return Prisma.sql`${date.toISOString().slice(0, 23).replace("T", " ")}::timestamp`;
}

/** `column` falls in the period. */
function inPeriod(column: string, period: Period): Prisma.Sql {
  const col = Prisma.raw(column);
  return Prisma.sql`${col} >= ${ts(period.start)} AND ${col} < ${ts(period.end)}`;
}

export function periodJson(period: Period) {
  return { from: period.from, to: period.to };
}

// ─── Helpers ────────────────────────────────────────────────

function rate(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

function round1(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

const LEARNER = Prisma.sql`SELECT id FROM users WHERE role = 'USER'`;

/**
 * Activity rows (learner, time): enrolments, completed units and quiz
 * answers. An answer's time is its last change, which is usually the
 * learner's last save or submit; an admin changing a quiz question's options
 * also touches the answers to it.
 */
function activitySql(credentialId?: string): Prisma.Sql {
  if (credentialId) {
    return Prisma.sql`
      SELECT user_id, enrolled_at AS at FROM credential_enrollments WHERE credential_id = ${credentialId}
      UNION ALL
      SELECT uc.user_id, uc.completed_at FROM unit_completions uc
        JOIN credential_units u ON u.id = uc.unit_id
        JOIN credential_subsections ss ON ss.id = u.subsection_id
        JOIN credential_sections s ON s.id = ss.section_id
        WHERE s.credential_id = ${credentialId}
      UNION ALL
      SELECT a.user_id, a.updated_at FROM question_answers a
        JOIN unit_questions q ON q.id = a.question_id
        JOIN credential_units u ON u.id = q.unit_id
        JOIN credential_subsections ss ON ss.id = u.subsection_id
        JOIN credential_sections s ON s.id = ss.section_id
        WHERE s.credential_id = ${credentialId}`;
  }
  return Prisma.sql`
    SELECT user_id, enrolled_at AS at FROM credential_enrollments
    UNION ALL SELECT user_id, enrolled_at FROM programme_enrollments
    UNION ALL SELECT user_id, completed_at FROM unit_completions
    UNION ALL SELECT user_id, updated_at FROM question_answers`;
}

// ─── Grades ─────────────────────────────────────────────────

/**
 * Grades of (learner, micro-credential) pairs, worked out in SQL the same way
 * as getCredentialProgress in grading.ts (keep the two in step): each unit
 * earns its weight once completed, except a quiz with questions, which earns
 * its weight in proportion to the questions answered right once any are
 * submitted. The grade is rounded to a whole percent and passes at the
 * micro-credential's pass grade.
 *
 * `pairs` must select (user_id, credential_id). Defines the CTEs `units` and
 * `grades` (user_id, credential_id, grade, started).
 */
function gradesCte(pairs: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`
    units AS (
      SELECT u.id, u.type::text AS type, u.weight, s.credential_id,
             (SELECT count(*) FROM unit_questions q WHERE q.unit_id = u.id)::int AS questions
      FROM credential_units u
      JOIN credential_subsections ss ON ss.id = u.subsection_id
      JOIN credential_sections s ON s.id = ss.section_id
    ),
    quiz AS (
      SELECT a.user_id, q.unit_id, count(*)::int AS submitted, count(*) FILTER (WHERE a.correct)::int AS correct
      FROM question_answers a JOIN unit_questions q ON q.id = a.question_id
      WHERE a.attempts > 0
      GROUP BY a.user_id, q.unit_id
    ),
    pairs AS (${pairs}),
    grades AS (
      SELECT p.user_id, p.credential_id,
        round(coalesce(sum(CASE
          WHEN un.type = 'QUIZ' AND un.questions > 0 AND qz.submitted > 0 THEN un.weight * qz.correct / un.questions
          WHEN uc.unit_id IS NOT NULL THEN un.weight
          ELSE 0
        END), 0)::numeric)::int AS grade,
        (count(uc.unit_id) > 0 OR coalesce(sum(qz.submitted), 0) > 0) AS started
      FROM pairs p
      LEFT JOIN units un ON un.credential_id = p.credential_id
      LEFT JOIN unit_completions uc ON uc.user_id = p.user_id AND uc.unit_id = un.id
      LEFT JOIN quiz qz ON qz.user_id = p.user_id AND qz.unit_id = un.id
      GROUP BY p.user_id, p.credential_id
    )`;
}

/** Learners enrolled in micro-credentials (all, or one). */
function credentialEnrolmentPairs(credentialId?: string): Prisma.Sql {
  return Prisma.sql`
    SELECT e.user_id, e.credential_id FROM credential_enrollments e
    WHERE e.user_id IN (${LEARNER})
    ${credentialId ? Prisma.sql`AND e.credential_id = ${credentialId}` : Prisma.empty}`;
}

// ─── Overview ───────────────────────────────────────────────

export async function getOverview(period: Period) {
  const [row] = await prisma.$queryRaw<Record<string, number>[]>`
    SELECT
      (SELECT count(*) FROM users WHERE role = 'USER')::int AS learners,
      (SELECT count(*) FROM users WHERE role = 'USER' AND email_verified_at IS NOT NULL)::int AS verified_learners,
      (SELECT count(*) FROM users WHERE role = 'ADMIN')::int AS site_admins,
      (SELECT count(DISTINCT user_id) FROM programme_admins)::int AS programme_admins,
      (SELECT count(*) FROM micro_programmes)::int AS micro_programmes,
      (SELECT count(*) FROM micro_credentials)::int AS micro_credentials,
      (SELECT count(*) FROM micro_credentials WHERE NOT published)::int AS draft_micro_credentials,
      (SELECT count(*) FROM credential_units)::int AS units,
      (SELECT count(*) FROM unit_questions)::int AS quiz_questions,
      (SELECT count(*) FROM programme_enrollments WHERE user_id IN (${LEARNER}))::int AS programme_enrolments,
      (SELECT count(*) FROM credential_enrollments WHERE user_id IN (${LEARNER}))::int AS credential_enrolments,
      (SELECT count(*) FROM unit_completions WHERE user_id IN (${LEARNER}))::int AS unit_completions,

      (SELECT count(*) FROM users WHERE role = 'USER' AND ${inPeriod("created_at", period)})::int AS p_new_learners,
      (SELECT count(*) FROM programme_enrollments WHERE user_id IN (${LEARNER}) AND ${inPeriod("enrolled_at", period)})::int AS p_programme_enrolments,
      (SELECT count(*) FROM credential_enrollments WHERE user_id IN (${LEARNER}) AND ${inPeriod("enrolled_at", period)})::int AS p_credential_enrolments,
      (SELECT count(*) FROM unit_completions WHERE user_id IN (${LEARNER}) AND ${inPeriod("completed_at", period)})::int AS p_unit_completions,
      (SELECT count(DISTINCT user_id) FROM (${activitySql()}) a
        WHERE user_id IN (${LEARNER}) AND ${inPeriod("at", period)})::int AS p_active_learners
  `;

  const [credentials, programmes] = await Promise.all([getCredentialStats(), getProgrammeStats()]);
  const passed = credentials.reduce((n, c) => n + c.learners.passed, 0);
  const completed = programmes.reduce((n, p) => n + p.learners.completed, 0);

  return {
    period: periodJson(period),
    totals: {
      learners: row.learners,
      verifiedLearners: row.verified_learners,
      siteAdmins: row.site_admins,
      programmeAdmins: row.programme_admins,
      microProgrammes: row.micro_programmes,
      microCredentials: row.micro_credentials,
      draftMicroCredentials: row.draft_micro_credentials,
      units: row.units,
      quizQuestions: row.quiz_questions,
      programmeEnrolments: row.programme_enrolments,
      credentialEnrolments: row.credential_enrolments,
      unitCompletions: row.unit_completions,
      microCredentialsPassed: passed,
      microProgrammesCompleted: completed,
    },
    inPeriod: {
      newLearners: row.p_new_learners,
      programmeEnrolments: row.p_programme_enrolments,
      credentialEnrolments: row.p_credential_enrolments,
      unitCompletions: row.p_unit_completions,
      activeLearners: row.p_active_learners,
    },
  };
}

// ─── Time series ────────────────────────────────────────────

export const METRICS = [
  "new_learners",
  "programme_enrolments",
  "credential_enrolments",
  "unit_completions",
  "active_learners",
] as const;
export type Metric = (typeof METRICS)[number];

export const INTERVALS = ["day", "week", "month"] as const;
export type Interval = (typeof INTERVALS)[number];

/** Most buckets one call returns, so a typo in a date can't ask for decades of days. */
const MAX_BUCKETS = 400;

export async function getTimeseries(
  metric: Metric,
  interval: Interval,
  period: Period,
  filter: { credentialId?: string; programmeId?: string }
) {
  if (filter.credentialId && !["credential_enrolments", "unit_completions", "active_learners"].includes(metric)) {
    throw new AnalyticsInputError("credentialId only works with credential_enrolments, unit_completions and active_learners.");
  }
  if (filter.programmeId && metric !== "programme_enrolments") {
    throw new AnalyticsInputError("programmeId only works with programme_enrolments.");
  }

  const days = Math.round((period.end.getTime() - period.start.getTime()) / DAY_MS);
  const approxBuckets = interval === "day" ? days : interval === "week" ? days / 7 : days / 30;
  if (approxBuckets > MAX_BUCKETS) {
    throw new AnalyticsInputError(`That is too many ${interval}s; ask for a shorter period or a longer interval.`);
  }

  const { credentialId, programmeId } = filter;
  let source: Prisma.Sql; // rows with a time column "at" (and a user_id for active_learners)
  switch (metric) {
    case "new_learners":
      source = Prisma.sql`SELECT created_at AS at FROM users WHERE role = 'USER'`;
      break;
    case "programme_enrolments":
      source = Prisma.sql`SELECT enrolled_at AS at FROM programme_enrollments WHERE user_id IN (${LEARNER})
        ${programmeId ? Prisma.sql`AND programme_id = ${programmeId}` : Prisma.empty}`;
      break;
    case "credential_enrolments":
      source = Prisma.sql`SELECT enrolled_at AS at FROM credential_enrollments WHERE user_id IN (${LEARNER})
        ${credentialId ? Prisma.sql`AND credential_id = ${credentialId}` : Prisma.empty}`;
      break;
    case "unit_completions":
      source = credentialId
        ? Prisma.sql`SELECT uc.completed_at AS at FROM unit_completions uc
            JOIN credential_units u ON u.id = uc.unit_id
            JOIN credential_subsections ss ON ss.id = u.subsection_id
            JOIN credential_sections s ON s.id = ss.section_id
            WHERE s.credential_id = ${credentialId} AND uc.user_id IN (${LEARNER})`
        : Prisma.sql`SELECT completed_at AS at FROM unit_completions WHERE user_id IN (${LEARNER})`;
      break;
    case "active_learners":
      source = Prisma.sql`SELECT user_id, at FROM (${activitySql(credentialId)}) a WHERE user_id IN (${LEARNER})`;
      break;
  }
  const value = metric === "active_learners" ? Prisma.sql`count(DISTINCT src.user_id)` : Prisma.sql`count(src.at)`;
  const unit = Prisma.raw(`'${interval}'`); // from INTERVALS, never user text

  const rows = await prisma.$queryRaw<{ bucket: Date; value: number }[]>`
    WITH buckets AS (
      SELECT generate_series(
        date_trunc(${unit}, ${ts(period.start)}),
        date_trunc(${unit}, ${ts(new Date(period.end.getTime() - 1))}),
        ${Prisma.raw(`'1 ${interval}'`)}::interval
      ) AS bucket
    ),
    src AS (
      SELECT * FROM (${source}) s WHERE ${inPeriod("at", period)}
    )
    SELECT b.bucket, ${value}::int AS value
    FROM buckets b
    LEFT JOIN src ON date_trunc(${unit}, src.at) = b.bucket
    GROUP BY b.bucket
    ORDER BY b.bucket
  `;

  const points = rows.map((r) => ({ start: day(r.bucket), value: r.value }));
  return {
    metric,
    interval,
    period: periodJson(period),
    ...(credentialId ? { credentialId } : {}),
    ...(programmeId ? { programmeId } : {}),
    total: metric === "active_learners" ? null : points.reduce((n, p) => n + p.value, 0),
    points,
  };
}

// ─── Micro-credentials ──────────────────────────────────────

interface CredentialRow {
  id: string;
  title: string;
  code: string;
  project: string;
  organisation: string | null;
  topic: string | null;
  pass_grade: number;
  published: boolean;
  units: number;
  enrolled: number;
  started: number;
  passed: number;
  average_grade: number | null;
}

function credentialJson(r: CredentialRow) {
  return {
    id: r.id,
    title: r.title,
    code: r.code,
    project: r.project,
    organisation: r.organisation,
    topic: r.topic,
    passGrade: r.pass_grade,
    status: r.published ? "published" : "draft",
    units: r.units,
    learners: {
      enrolled: r.enrolled,
      started: r.started,
      passed: r.passed,
      startRate: rate(r.started, r.enrolled),
      passRate: rate(r.passed, r.enrolled),
      averageGrade: round1(r.average_grade),
    },
  };
}

/** Per micro-credential: its enrolled learners, how many started and passed, their average grade. */
export async function getCredentialStats(filter: { project?: string; credentialId?: string } = {}) {
  const rows = await prisma.$queryRaw<CredentialRow[]>`
    WITH ${gradesCte(credentialEnrolmentPairs(filter.credentialId))}
    SELECT c.id, c.title, c.code, c.project, c.organisation, c.topic, c.pass_grade, c.published,
      (SELECT count(*) FROM units un WHERE un.credential_id = c.id)::int AS units,
      count(g.user_id)::int AS enrolled,
      count(*) FILTER (WHERE g.started)::int AS started,
      count(*) FILTER (WHERE g.grade >= c.pass_grade)::int AS passed,
      avg(g.grade)::float8 AS average_grade
    FROM micro_credentials c
    LEFT JOIN grades g ON g.credential_id = c.id
    WHERE TRUE
      ${filter.project ? Prisma.sql`AND c.project = ${filter.project}` : Prisma.empty}
      ${filter.credentialId ? Prisma.sql`AND c.id = ${filter.credentialId}` : Prisma.empty}
    GROUP BY c.id
    ORDER BY c.project, c.title
  `;
  return rows.map(credentialJson);
}

/** Per micro-credential, what happened in the period: enrolments, unit completions, active learners. */
async function getCredentialPeriodStats(period: Period, credentialId?: string) {
  const rows = await prisma.$queryRaw<{ id: string; enrolments: number; completions: number; active: number }[]>`
    WITH learner_activity AS (
      SELECT e.credential_id, e.user_id, e.enrolled_at AS at, 'enrol' AS kind FROM credential_enrollments e
      UNION ALL
      SELECT s.credential_id, uc.user_id, uc.completed_at, 'complete' FROM unit_completions uc
        JOIN credential_units u ON u.id = uc.unit_id
        JOIN credential_subsections ss ON ss.id = u.subsection_id
        JOIN credential_sections s ON s.id = ss.section_id
      UNION ALL
      SELECT s.credential_id, a.user_id, a.updated_at, 'answer' FROM question_answers a
        JOIN unit_questions q ON q.id = a.question_id
        JOIN credential_units u ON u.id = q.unit_id
        JOIN credential_subsections ss ON ss.id = u.subsection_id
        JOIN credential_sections s ON s.id = ss.section_id
    )
    SELECT credential_id AS id,
      count(*) FILTER (WHERE kind = 'enrol')::int AS enrolments,
      count(*) FILTER (WHERE kind = 'complete')::int AS completions,
      count(DISTINCT user_id)::int AS active
    FROM learner_activity
    WHERE user_id IN (${LEARNER}) AND ${inPeriod("at", period)}
      ${credentialId ? Prisma.sql`AND credential_id = ${credentialId}` : Prisma.empty}
    GROUP BY credential_id
  `;
  return new Map(rows.map((r) => [r.id, { enrolments: r.enrolments, unitCompletions: r.completions, activeLearners: r.active }]));
}

const EMPTY_PERIOD_STATS = { enrolments: 0, unitCompletions: 0, activeLearners: 0 };

export async function listCredentials(project: string | undefined, period: Period | null) {
  const [stats, inPeriod] = await Promise.all([
    getCredentialStats({ project }),
    period ? getCredentialPeriodStats(period) : null,
  ]);
  return {
    ...(period ? { period: periodJson(period) } : {}),
    microCredentials: stats.map((c) => ({
      ...c,
      ...(inPeriod ? { inPeriod: inPeriod.get(c.id) ?? EMPTY_PERIOD_STATS } : {}),
    })),
  };
}

/**
 * One micro-credential in depth: the grades of its enrolled learners, how
 * many of them completed each unit, and how hard each quiz question is.
 */
export async function getCredentialDetail(id: string, period: Period | null) {
  const [summary] = await getCredentialStats({ credentialId: id });
  if (!summary) return null;

  const enrolled = Prisma.sql`SELECT user_id FROM credential_enrollments WHERE credential_id = ${id} AND user_id IN (${LEARNER})`;

  const [distribution, units, questions, inPeriod] = await Promise.all([
    prisma.$queryRaw<{ bucket: number; learners: number }[]>`
      WITH ${gradesCte(credentialEnrolmentPairs(id))}
      SELECT least(grade / 10, 9) AS bucket, count(*)::int AS learners FROM grades GROUP BY 1
    `,
    prisma.$queryRaw<{
      section: string; subsection: string; id: string; title: string; type: string; weight: number;
      questions: number; completed: number; attempted: number; average_score: number | null;
    }[]>`
      WITH quiz AS (
        SELECT a.user_id, q.unit_id, count(*) FILTER (WHERE a.correct)::float8 AS correct
        FROM question_answers a JOIN unit_questions q ON q.id = a.question_id
        WHERE a.attempts > 0 AND a.user_id IN (${enrolled})
        GROUP BY a.user_id, q.unit_id
      )
      SELECT s.title AS section, ss.title AS subsection, u.id, u.title, u.type::text AS type, u.weight,
        (SELECT count(*) FROM unit_questions q WHERE q.unit_id = u.id)::int AS questions,
        (SELECT count(*) FROM unit_completions uc WHERE uc.unit_id = u.id AND uc.user_id IN (${enrolled}))::int AS completed,
        (SELECT count(*) FROM quiz WHERE quiz.unit_id = u.id)::int AS attempted,
        (SELECT avg(quiz.correct) FROM quiz WHERE quiz.unit_id = u.id)::float8
          / nullif((SELECT count(*) FROM unit_questions q WHERE q.unit_id = u.id), 0) * 100 AS average_score
      FROM credential_units u
      JOIN credential_subsections ss ON ss.id = u.subsection_id
      JOIN credential_sections s ON s.id = ss.section_id
      WHERE s.credential_id = ${id}
      ORDER BY s."order", ss."order", u."order"
    `,
    prisma.$queryRaw<{
      unit_id: string; id: string; title: string | null; question: string; options: number; max_attempts: number | null;
      answered: number; correct: number; average_attempts: number | null; first_try: number;
    }[]>`
      SELECT q.unit_id, q.id, q.title, q.question, cardinality(q.options)::int AS options, q.max_attempts,
        count(a.id)::int AS answered,
        count(a.id) FILTER (WHERE a.correct)::int AS correct,
        avg(a.attempts)::float8 AS average_attempts,
        count(a.id) FILTER (WHERE a.correct AND a.attempts = 1)::int AS first_try
      FROM unit_questions q
      JOIN credential_units u ON u.id = q.unit_id
      JOIN credential_subsections ss ON ss.id = u.subsection_id
      JOIN credential_sections s ON s.id = ss.section_id
      LEFT JOIN question_answers a ON a.question_id = q.id AND a.attempts > 0 AND a.user_id IN (${enrolled})
      WHERE s.credential_id = ${id}
      GROUP BY q.id, s."order", ss."order", u."order"
      ORDER BY s."order", ss."order", u."order", q."order"
    `,
    period ? getCredentialPeriodStats(period, id) : null,
  ]);

  const byBucket = new Map(distribution.map((d) => [d.bucket, d.learners]));
  const questionsByUnit = new Map<string, typeof questions>();
  for (const q of questions) {
    if (!questionsByUnit.has(q.unit_id)) questionsByUnit.set(q.unit_id, []);
    questionsByUnit.get(q.unit_id)!.push(q);
  }
  const enrolledCount = summary.learners.enrolled;

  return {
    ...(period ? { period: periodJson(period) } : {}),
    microCredential: {
      ...summary,
      ...(inPeriod ? { inPeriod: inPeriod.get(id) ?? EMPTY_PERIOD_STATS } : {}),
    },
    gradeDistribution: Array.from({ length: 10 }, (_, i) => ({
      grades: i === 9 ? "90-100" : `${i * 10}-${i * 10 + 9}`,
      learners: byBucket.get(i) ?? 0,
    })),
    units: units.map((u) => ({
      section: u.section,
      subsection: u.subsection,
      id: u.id,
      title: u.title,
      type: u.type,
      weight: Math.round(u.weight * 100) / 100,
      completedBy: u.completed,
      completionRate: rate(u.completed, enrolledCount),
      ...(u.type === "QUIZ"
        ? {
            attemptedBy: u.attempted,
            averageScore: round1(u.average_score),
            questions: (questionsByUnit.get(u.id) ?? []).map((q) => ({
              id: q.id,
              title: q.title,
              question: q.question.length > 300 ? `${q.question.slice(0, 300)}…` : q.question,
              options: q.options,
              maxAttempts: q.max_attempts,
              answeredBy: q.answered,
              correctRate: rate(q.correct, q.answered),
              rightFirstTimeRate: rate(q.first_try, q.answered),
              averageAttempts: round1(q.average_attempts),
            })),
          }
        : {}),
    })),
  };
}

// ─── Micro-programmes ───────────────────────────────────────

export async function getProgrammeStats(filter: { project?: string } = {}, period: Period | null = null) {
  // A learner has completed a programme once they've passed every one of its
  // published micro-credentials (as on the programme page and its certificate),
  // whether or not they enrolled in each micro-credential on its own. Drafts
  // aren't part of a programme for learners yet.
  const rows = await prisma.$queryRaw<{
    id: string; title: string; code: string; project: string; credentials: number;
    enrolled: number; started: number; completed: number; average_passed: number | null; in_period: number | null;
  }[]>`
    WITH ${gradesCte(Prisma.sql`
      SELECT DISTINCT pe.user_id, pc.credential_id
      FROM programme_enrollments pe JOIN programme_credentials pc ON pc.programme_id = pe.programme_id
      JOIN micro_credentials c ON c.id = pc.credential_id AND c.published
      WHERE pe.user_id IN (${LEARNER})`)},
    published_links AS (
      SELECT pc.programme_id, pc.credential_id FROM programme_credentials pc
      JOIN micro_credentials c ON c.id = pc.credential_id AND c.published
    ),
    per_learner AS (
      SELECT pe.programme_id, pe.user_id,
        count(pc.credential_id) FILTER (WHERE g.grade >= c.pass_grade) AS passed,
        bool_or(g.started) AS started
      FROM programme_enrollments pe
      JOIN published_links pc ON pc.programme_id = pe.programme_id
      JOIN micro_credentials c ON c.id = pc.credential_id
      JOIN grades g ON g.user_id = pe.user_id AND g.credential_id = pc.credential_id
      WHERE pe.user_id IN (${LEARNER})
      GROUP BY pe.programme_id, pe.user_id
    )
    SELECT p.id, p.title, p.code, p.project,
      (SELECT count(*) FROM published_links pc WHERE pc.programme_id = p.id)::int AS credentials,
      (SELECT count(*) FROM programme_enrollments pe WHERE pe.programme_id = p.id AND pe.user_id IN (${LEARNER}))::int AS enrolled,
      count(*) FILTER (WHERE pl.started)::int AS started,
      count(*) FILTER (WHERE pl.passed = (SELECT count(*) FROM published_links pc WHERE pc.programme_id = p.id))::int AS completed,
      avg(pl.passed)::float8 AS average_passed,
      ${period
        ? Prisma.sql`(SELECT count(*) FROM programme_enrollments pe WHERE pe.programme_id = p.id AND pe.user_id IN (${LEARNER}) AND ${inPeriod("pe.enrolled_at", period)})::int`
        : Prisma.sql`NULL::int`} AS in_period
    FROM micro_programmes p
    LEFT JOIN per_learner pl ON pl.programme_id = p.id
    WHERE TRUE ${filter.project ? Prisma.sql`AND p.project = ${filter.project}` : Prisma.empty}
    GROUP BY p.id
    ORDER BY p.project, p.title
  `;

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    code: r.code,
    project: r.project,
    microCredentials: r.credentials,
    learners: {
      enrolled: r.enrolled,
      started: r.started,
      completed: r.completed,
      startRate: rate(r.started, r.enrolled),
      completionRate: rate(r.completed, r.enrolled),
      // Over learners enrolled in a programme that has micro-credentials.
      averageMicroCredentialsPassed: round1(r.average_passed),
    },
    ...(period ? { inPeriod: { enrolments: r.in_period ?? 0 } } : {}),
  }));
}

export async function listProgrammes(project: string | undefined, period: Period | null) {
  const programmes = await getProgrammeStats({ project }, period);
  return { ...(period ? { period: periodJson(period) } : {}), microProgrammes: programmes };
}

// ─── Learners ───────────────────────────────────────────────

/** Who the learners are, in aggregate. With a period, only learners who registered in it. */
export async function getLearners(period: Period | null) {
  const who = period
    ? Prisma.sql`SELECT id, country, gender, email_verified_at FROM users WHERE role = 'USER' AND ${inPeriod("created_at", period)}`
    : Prisma.sql`SELECT id, country, gender, email_verified_at FROM users WHERE role = 'USER'`;

  const [totals, countries, genders, enrolments] = await Promise.all([
    prisma.$queryRaw<{ learners: number; verified: number; programme_admins: number }[]>`
      SELECT count(*)::int AS learners,
        count(*) FILTER (WHERE email_verified_at IS NOT NULL)::int AS verified,
        count(*) FILTER (WHERE id IN (SELECT user_id FROM programme_admins))::int AS programme_admins
      FROM (${who}) l
    `,
    prisma.$queryRaw<{ value: string | null; learners: number }[]>`
      SELECT nullif(trim(country), '') AS value, count(*)::int AS learners FROM (${who}) l GROUP BY 1 ORDER BY 2 DESC, 1
    `,
    prisma.$queryRaw<{ value: string | null; learners: number }[]>`
      SELECT nullif(trim(gender), '') AS value, count(*)::int AS learners FROM (${who}) l GROUP BY 1 ORDER BY 2 DESC, 1
    `,
    prisma.$queryRaw<{ bucket: string; learners: number }[]>`
      SELECT CASE WHEN n = 0 THEN '0' WHEN n = 1 THEN '1' WHEN n <= 3 THEN '2-3' ELSE '4+' END AS bucket, count(*)::int AS learners
      FROM (
        SELECT l.id, (SELECT count(*) FROM credential_enrollments e WHERE e.user_id = l.id) AS n FROM (${who}) l
      ) x
      GROUP BY 1
    `,
  ]);

  const t = totals[0];
  const byBucket = new Map(enrolments.map((e) => [e.bucket, e.learners]));
  const named = (rows: { value: string | null; learners: number }[]) =>
    rows.map((r) => ({ value: r.value ?? "Not given", learners: r.learners, share: rate(r.learners, t.learners) }));

  return {
    ...(period ? { period: periodJson(period) } : {}),
    learners: t.learners,
    verifiedEmail: t.verified,
    verifiedRate: rate(t.verified, t.learners),
    programmeAdmins: t.programme_admins,
    byCountry: named(countries),
    byGender: named(genders),
    microCredentialEnrolmentsPerLearner: ["0", "1", "2-3", "4+"].map((b) => ({
      enrolments: b,
      learners: byBucket.get(b) ?? 0,
    })),
  };
}
