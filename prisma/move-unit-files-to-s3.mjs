// Moves lesson files kept in the database (credential_units.file_data) to S3,
// where files uploaded in the admin already live. Learners' browsers load S3
// files directly; a file kept in the database is sent through Amplify, which
// cuts off any response above 5.72 MB, so big PDFs from imported courses
// couldn't be displayed.
//
// Each unit is updated in place (file_key set, file_data cleared), so learners
// keep their progress. Safe to run more than once: units already in S3 are skipped.
//
// Needs the database URL from .env plus the S3_* variables from the Amplify
// console (App settings → Environment variables):
//   S3_UPLOAD_BUCKET=… S3_REGION=… S3_ACCESS_KEY_ID=… S3_SECRET_ACCESS_KEY=… \
//     node --env-file=.env prisma/move-unit-files-to-s3.mjs
// Add --dry-run to only list what would be moved.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { RDS_CA } from "../src/lib/rds-ca.mjs";
import { newFileKey } from "../src/lib/file-key.mjs";

const dryRun = process.argv.includes("--dry-run");

const { S3_UPLOAD_BUCKET: bucket, S3_REGION: region, S3_ACCESS_KEY_ID: accessKeyId, S3_SECRET_ACCESS_KEY: secretAccessKey } =
  process.env;
if (!dryRun && !(bucket && region && accessKeyId && secretAccessKey)) {
  console.error("Set S3_UPLOAD_BUCKET, S3_REGION, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY (from Amplify's environment variables).");
  process.exit(1);
}
const s3 = dryRun ? null : new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });

const { Pool } = pg;

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
// Same rule as src/lib/prisma.ts: no TLS only for a database on this computer.
const isLocal = (() => {
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname); } catch { return false; }
})();
const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { ca: RDS_CA },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Sizes only: file_data can be many MB per unit, so each file is read on its own below.
  const units = await prisma.$queryRaw`
    SELECT u."id", u."title", u."file_name", u."file_mime", octet_length(u."file_data") AS "size", c."code", c."project"
    FROM "credential_units" u
    JOIN "credential_subsections" ss ON ss."id" = u."subsection_id"
    JOIN "credential_sections" s ON s."id" = ss."section_id"
    JOIN "micro_credentials" c ON c."id" = s."credential_id"
    WHERE u."file_data" IS NOT NULL AND u."file_key" IS NULL
    ORDER BY c."project", c."code"`;

  console.log(`${units.length} file(s) to move${dryRun ? " (dry run)" : ""}.`);

  for (const u of units) {
    const label = `${(Number(u.size) / 1024 / 1024).toFixed(1).padStart(6)} MB  ${u.project} ${u.code}  ${u.title}`;
    if (dryRun) {
      console.log(`  ${label}`);
      continue;
    }

    const { fileData } = await prisma.credentialUnit.findUniqueOrThrow({ where: { id: u.id }, select: { fileData: true } });
    const key = newFileKey("unit-files", u.file_name || "file");
    await s3.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: fileData, ContentType: u.file_mime || "application/octet-stream" })
    );
    await prisma.credentialUnit.update({ where: { id: u.id }, data: { fileKey: key, fileData: null } });
    console.log(`✓ ${label}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
