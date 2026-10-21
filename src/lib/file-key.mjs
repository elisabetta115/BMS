// Keys for files stored in S3, shared by the app (src/lib/s3.ts) and the
// one-off scripts in prisma/. The random part is a folder, so a key ends in the
// file's own name: browsers save the file under it and Microsoft's Office
// viewer shows it as the title. Characters that could upset a URL or a path
// become "_".

import { randomUUID } from "crypto";

/** A file's name as it appears at the end of its key: "Report (2021), part 1.pdf". */
export function keyFileName(filename) {
  const name = String(filename).replace(/[^\p{L}\p{N} ._\-(),]/gu, "_").replace(/\s+/g, " ").trim();
  return /^\.*$/.test(name) ? "file" : name;
}

/** A new, unique key under `prefix`: "unit-files/<uuid>/Report.pdf". */
export function newFileKey(prefix, filename) {
  return `${prefix}/${randomUUID()}/${keyFileName(filename)}`;
}
