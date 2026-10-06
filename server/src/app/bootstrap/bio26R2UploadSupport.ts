import { env } from "../../config/env.js";
import { createR2PresignedPutUrl } from "../../modules/media/infrastructure/r2PresignedPut.js";
import { pool, sha256 } from "./questionPilotPackageImportSupport.js";

export type Bio26R2Entry = {
  code: string;
  hash: string;
  bytes: Buffer;
};

const requireR2 = () => {
  if (
    !env.R2_UPLOAD_ENABLED ||
    !env.R2_ACCOUNT_ID ||
    !env.R2_BUCKET ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_PUBLIC_BASE_URL
  ) throw new Error("BIO26 R2 upload is not fully configured");
};

export const publicBio26R2Url = (code: string, hash: string) =>
  `${env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "")}/questions/v2/${code}/${hash}.webp`;

export async function verifyBio26RemoteImage(
  entry: Bio26R2Entry,
  options: { required?: boolean; attempts?: number } = {},
) {
  const required = options.required !== false;
  const attempts = Math.max(1, options.attempts || 5);
  const url = publicBio26R2Url(entry.code, entry.hash);
  let lastFailure = "unknown";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const separator = url.includes("?") ? "&" : "?";
      const response = await fetch(`${url}${separator}bio26_verify=${attempt}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status === 404 && !required) return false;
      if (!response.ok) {
        lastFailure = `HTTP ${response.status}`;
      } else {
        const actual = sha256(Buffer.from(await response.arrayBuffer()));
        if (actual === entry.hash) return true;
        lastFailure = `HASH_MISMATCH expected=${entry.hash} actual=${actual}`;
      }
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
  }
  if (!required) {
    console.warn(`BIO26_R2_REMOTE_PRECHECK_MISS code=${entry.code} reason=${lastFailure}`);
    return false;
  }
  throw new Error(`BIO26 live R2 verification failed code=${entry.code} attempts=${attempts} reason=${lastFailure}`);
}

export async function syncBio26R2Assets(entries: Bio26R2Entry[]) {
  requireR2();
  let processed = 0;
  let alreadyPresent = 0;
  let uploaded = 0;

  await pool(entries, 8, async (entry) => {
    if (await verifyBio26RemoteImage(entry, { required: false, attempts: 2 })) {
      alreadyPresent += 1;
    } else {
      const key = `questions/v2/${entry.code}/${entry.hash}.webp`;
      const uploadUrl = createR2PresignedPutUrl({
        accountId: env.R2_ACCOUNT_ID,
        bucket: env.R2_BUCKET,
        key,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        contentType: "image/webp",
        expiresSeconds: env.R2_PRESIGN_EXPIRES_SECONDS,
      });
      let lastFailure = "unknown";
      let ok = false;
      for (let attempt = 1; attempt <= 4 && !ok; attempt += 1) {
        try {
          const put = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "image/webp" },
            body: Uint8Array.from(entry.bytes),
            signal: AbortSignal.timeout(60_000),
          });
          ok = put.ok;
          if (!ok) lastFailure = `HTTP ${put.status}`;
        } catch (error) {
          lastFailure = error instanceof Error ? error.message : String(error);
        }
        if (!ok && attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
      if (!ok) throw new Error(`BIO26 R2 PUT failed code=${entry.code} attempts=4 reason=${lastFailure}`);
      await verifyBio26RemoteImage(entry, { required: true, attempts: 5 });
      uploaded += 1;
    }

    processed += 1;
    if (processed % 100 === 0 || processed === entries.length) {
      console.log(`BIO26_R2_PROGRESS processed=${processed}/${entries.length} uploaded=${uploaded} alreadyPresent=${alreadyPresent}`);
    }
  });

  await pool(entries, 8, (entry) => verifyBio26RemoteImage(entry, { required: true, attempts: 5 }));
  return { uploaded, alreadyPresent };
}
