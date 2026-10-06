import { createHash, createHmac } from "node:crypto";

type PresignedPutInput = {
  accountId: string;
  bucket: string;
  key: string;
  accessKeyId: string;
  secretAccessKey: string;
  contentType: string;
  expiresSeconds?: number;
  now?: Date;
};

const encodeRfc3986 = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

const encodeKeyPath = (key: string) =>
  key
    .split("/")
    .filter(Boolean)
    .map(encodeRfc3986)
    .join("/");

const sha256Hex = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

const hmac = (key: Buffer | string, value: string) => createHmac("sha256", key).update(value, "utf8").digest();

const canonicalQuery = (params: Record<string, string>) =>
  Object.entries(params)
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

const toAmzDate = (date: Date) => date.toISOString().replace(/[:-]|\.\d{3}/g, "");
const toDateStamp = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, "");

export function createR2PresignedPutUrl({
  accountId,
  bucket,
  key,
  accessKeyId,
  secretAccessKey,
  contentType,
  expiresSeconds = 300,
  now = new Date(),
}: PresignedPutInput) {
  if (!accountId.trim() || !bucket.trim() || !key.trim() || !accessKeyId.trim() || !secretAccessKey.trim()) {
    throw new Error("R2 presign configuration is incomplete");
  }
  if (!Number.isInteger(expiresSeconds) || expiresSeconds < 30 || expiresSeconds > 900) {
    throw new Error("R2 presign expiry must be between 30 and 900 seconds");
  }

  const normalizedContentType = contentType.trim().toLowerCase();
  const amzDate = toAmzDate(now);
  const dateStamp = toDateStamp(now);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const host = `${accountId.trim()}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodeRfc3986(bucket.trim())}/${encodeKeyPath(key)}`;
  const signedHeaders = "content-type;host";
  const query = canonicalQuery({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
    "X-Amz-Credential": `${accessKeyId.trim()}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": signedHeaders,
    "x-id": "PutObject",
  });
  const canonicalHeaders = `content-type:${normalizedContentType}\nhost:${host}\n`;
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
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  return `https://${host}${canonicalUri}?${query}&X-Amz-Signature=${signature}`;
}
