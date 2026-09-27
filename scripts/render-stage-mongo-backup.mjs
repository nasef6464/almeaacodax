import { createHash, createHmac } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  createReadStream,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const required = [
  "MONGODB_URI",
  "R2_ACCOUNT_ID",
  "R2_BUCKET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
];

for (const name of required) {
  if (!process.env[name]?.trim()) {
    throw new Error(`${name} is required`);
  }
}

const prefix = (process.env.DR_STAGE_PREFIX || "dr-staging/mongodb/current")
  .replace(/^\/+|\/+$/g, "");
const createdAt = new Date();
const createdAtUtc = createdAt.toISOString();
const workDir = mkdtempSync(join(tmpdir(), "almeaa-dr-stage-"));
const archiveName = "mongodb-staged.archive.gz";
const checksumName = `${archiveName}.sha256`;
const manifestName = `${archiveName}.manifest`;
const readyName = "ready.json";
const archivePath = join(workDir, archiveName);
const checksumPath = join(workDir, checksumName);
const manifestPath = join(workDir, manifestName);
const readyPath = join(workDir, readyName);

const encodeRfc3986 = (value) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );

const encodeKeyPath = (key) =>
  key
    .split("/")
    .filter(Boolean)
    .map(encodeRfc3986)
    .join("/");

const sha256Hex = (value) =>
  createHash("sha256").update(value, "utf8").digest("hex");

const hmac = (key, value) =>
  createHmac("sha256", key).update(value, "utf8").digest();

const canonicalQuery = (params) =>
  Object.entries(params)
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)])
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey
        ? leftValue.localeCompare(rightValue)
        : leftKey.localeCompare(rightKey)
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

const toAmzDate = (date) =>
  date.toISOString().replace(/[:-]|\.\d{3}/g, "");
const toDateStamp = (date) =>
  date.toISOString().slice(0, 10).replace(/-/g, "");

function createPresignedPutUrl({ key, contentType, now = new Date() }) {
  const accountId = process.env.R2_ACCOUNT_ID.trim();
  const bucket = process.env.R2_BUCKET.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY.trim();
  const expiresSeconds = 900;
  const normalizedContentType = contentType.trim().toLowerCase();
  const amzDate = toAmzDate(now);
  const dateStamp = toDateStamp(now);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodeRfc3986(bucket)}/${encodeKeyPath(key)}`;
  const signedHeaders = "content-type;host";
  const query = canonicalQuery({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": signedHeaders,
    "x-id": "PutObject",
  });
  const canonicalHeaders =
    `content-type:${normalizedContentType}\nhost:${host}\n`;
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    query,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, "auto");
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  return `https://${host}${canonicalUri}?${query}&X-Amz-Signature=${signature}`;
}

function sha256File(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function upload(path, key, contentType) {
  const url = createPresignedPutUrl({ key, contentType });
  const result = spawnSync(
    "curl",
    [
      "--fail",
      "--silent",
      "--show-error",
      "--request",
      "PUT",
      "--header",
      `Content-Type: ${contentType}`,
      "--upload-file",
      path,
      url,
    ],
    { stdio: ["ignore", "inherit", "inherit"] }
  );
  if (result.status !== 0) {
    throw new Error(`R2 upload failed for ${key}`);
  }
}

try {
  const dump = spawnSync(
    "mongodump",
    [
      `--uri=${process.env.MONGODB_URI}`,
      `--archive=${archivePath}`,
      "--gzip",
    ],
    { stdio: ["ignore", "inherit", "inherit"] }
  );

  if (dump.status !== 0) {
    throw new Error("mongodump failed");
  }

  const sha256 = await sha256File(archivePath);
  const bytes = statSync(archivePath).size;
  const sourceCommit = process.env.RENDER_GIT_COMMIT || "unknown";
  const archiveKey = `${prefix}/${archiveName}`;
  const checksumKey = `${prefix}/${checksumName}`;
  const manifestKey = `${prefix}/${manifestName}`;
  const readyKey = `${prefix}/${readyName}`;

  writeFileSync(checksumPath, `${sha256}  ${archiveName}\n`, "utf8");
  writeFileSync(
    manifestPath,
    [
      `created_at_utc=${createdAtUtc}`,
      "format=mongodump-archive-gzip",
      `bytes=${bytes}`,
      `sha256=${sha256}`,
      `source_commit=${sourceCommit}`,
      `checksum_file=${checksumName}`,
      "",
    ].join("\n"),
    "utf8"
  );

  writeFileSync(
    readyPath,
    JSON.stringify(
      {
        createdAtUtc,
        format: "mongodump-archive-gzip",
        bytes,
        sha256,
        sourceCommit,
        archiveKey,
        checksumKey,
        manifestKey,
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  upload(archivePath, archiveKey, "application/gzip");
  upload(checksumPath, checksumKey, "text/plain");
  upload(manifestPath, manifestKey, "text/plain");
  // Atomic readiness marker: upload only after all referenced objects succeeded.
  upload(readyPath, readyKey, "application/json");

  console.log(
    JSON.stringify({
      status: "staged",
      createdAtUtc,
      bytes,
      sha256,
      sourceCommit,
      prefix,
    })
  );
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
