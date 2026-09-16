import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const bucket = process.env.S3_UPLOAD_BUCKET;
const region = process.env.S3_REGION;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

let _client: S3Client | null = null;

function getClient(): S3Client | null {
  if (!bucket || !region || !accessKeyId || !secretAccessKey) return null;
  if (_client) return _client;
  _client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
  return _client;
}

export function isS3Configured(): boolean {
  return getClient() !== null;
}

/**
 * A presigned URL the browser can PUT the file to directly, bypassing our
 * server entirely. Returns null if S3 isn't configured.
 */
export async function createUploadUrl(
  filename: string,
  contentType: string,
  prefix: string
): Promise<{ uploadUrl: string; key: string } | null> {
  const client = getClient();
  if (!client || !bucket) return null;

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${prefix}/${randomUUID()}-${safeName}`;

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: 300 }
  );

  return { uploadUrl, key };
}

/** Fetches an object's bytes server-side — not subject to any client request size limit. */
export async function getObjectBuffer(key: string): Promise<Buffer | null> {
  const client = getClient();
  if (!client || !bucket) return null;

  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const stream = res.Body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** A short-lived URL the browser can GET the file from directly (for serving unit files). */
export async function createDownloadUrl(key: string): Promise<string | null> {
  const client = getClient();
  if (!client || !bucket) return null;
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 300 });
}

export async function deleteObject(key: string): Promise<void> {
  const client = getClient();
  if (!client || !bucket) return;
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
