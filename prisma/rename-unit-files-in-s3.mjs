// Gives lesson files in S3 readable keys: "unit-files/<uuid>/Real name.xlsx"
// instead of "unit-files/<uuid>-Real_name.xlsx". Browsers save a file under the
// last part of its URL and Microsoft's Office viewer shows it as the title, so
// the random id used to show up in both.
//
// Each file is copied to its new key, its units are pointed at the copy, and
// only then is the old object deleted, so lessons keep working throughout.
// Safe to run more than once: files already on new-style keys are skipped.
//
//   node --env-file=.env prisma/rename-unit-files-in-s3.mjs
// Add --dry-run to only list the renames.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { S3Client, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { RDS_CA } from "../src/lib/rds-ca.mjs";
import { keyFileName } from "../src/lib/file-key.mjs";

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

// Old-style key: the random id and the file name joined by "-".
const OLD_KEY = /^unit-files\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(.+)$/;

async function main() {
  const units = await prisma.credentialUnit.findMany({
    where: { fileKey: { startsWith: "unit-files/" } },
    select: { fileKey: true, fileName: true },
  });

  // One rename per key: a key could be shared by more than one unit.
  const renames = new Map();
  for (const u of units) {
    const m = OLD_KEY.exec(u.fileKey);
    if (m && !renames.has(u.fileKey)) renames.set(u.fileKey, `unit-files/${m[1]}/${keyFileName(u.fileName || m[2])}`);
  }

  console.log(`${renames.size} file(s) to rename${dryRun ? " (dry run)" : ""}.`);

  for (const [oldKey, newKey] of renames) {
    if (dryRun) {
      console.log(`  ${oldKey}\n    → ${newKey}`);
      continue;
    }

    const copySource = `${bucket}/${oldKey.split("/").map(encodeURIComponent).join("/")}`;
    await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: copySource, Key: newKey }));
    await prisma.credentialUnit.updateMany({ where: { fileKey: oldKey }, data: { fileKey: newKey } });
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: oldKey }));
    console.log(`✓ ${newKey}`);
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
