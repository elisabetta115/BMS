import { readFile } from "fs/promises";
import path from "path";
import { CERTIFICATE_ASSET_PATHS, type CertificateAssets } from "@/lib/certificate";

let cached: Promise<CertificateAssets> | null = null;

/**
 * Reads the certificate fonts and logo from `public/` (traced into the server bundle by
 * `outputFileTracingIncludes` in next.config). Falls back to fetching them from the site.
 */
async function readAsset(url: string, origin: string): Promise<Uint8Array> {
  try {
    return new Uint8Array(await readFile(path.join(process.cwd(), "public", url)));
  } catch {
    const r = await fetch(new URL(url, origin));
    if (!r.ok) throw new Error(`Certificate asset ${url} unavailable (${r.status}).`);
    return new Uint8Array(await r.arrayBuffer());
  }
}

export function loadCertificateAssets(origin: string): Promise<CertificateAssets> {
  if (!cached) {
    const entries = Object.entries(CERTIFICATE_ASSET_PATHS) as [keyof CertificateAssets, string][];
    cached = Promise.all(entries.map(async ([key, url]) => [key, await readAsset(url, origin)] as const))
      .then((pairs) => Object.fromEntries(pairs) as unknown as CertificateAssets);
    cached.catch(() => { cached = null; });
  }
  return cached;
}
