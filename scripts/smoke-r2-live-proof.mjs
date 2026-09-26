import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const API_BASE_URL = String(
  process.env.API_BASE_URL || process.env.SMOKE_API_BASE_URL || process.env.SMOKE_API_URL || "https://almeaacodax.vercel.app/api",
).replace(/\/$/, "");

const env = { ...process.env };
let token = String(env.SMOKE_ADMIN_TOKEN || "").trim();
if (!token) {
  const resolved = spawnSync("node", ["scripts/resolve-smoke-admin-token.mjs"], {
    env,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (resolved.status === 0) {
    try { token = String(JSON.parse(String(resolved.stdout || "{}"))?.token || "").trim(); } catch {}
  }
}
if (!token) { console.error("Missing live admin auth for R2 proof"); process.exit(1); }

const csrfResponse = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
  headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
});
const csrfText = await csrfResponse.text();
let csrfPayload = {};
try { csrfPayload = JSON.parse(csrfText); } catch {}
const setCookie = String(csrfResponse.headers.get("set-cookie") || "");
const cookieMatch = setCookie.match(/almeaa_csrf_token=([^;]+)/);
const csrfCookie = String(cookieMatch?.[1] || "").trim();
const csrfToken = String(csrfPayload?.csrfToken || csrfCookie).trim();
if (!csrfResponse.ok || !csrfToken || !csrfCookie) {
  console.error(JSON.stringify({ ok:false, step:"csrf", status:csrfResponse.status }, null, 2));
  process.exit(1);
}

const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl3sAAAAASUVORK5CYII=", "base64");
const expectedHash = createHash("sha256").update(bytes).digest("hex");

const presignResponse = await fetch(`${API_BASE_URL}/media/question-images/presign`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-csrf-token": csrfToken,
    Cookie: `almeaa_csrf_token=${csrfCookie}`,
  },
  body: JSON.stringify({ contentType: "image/png", sizeBytes: bytes.length }),
});
const presignText = await presignResponse.text();
let intent = {};
try { intent = JSON.parse(presignText); } catch {}
if (!presignResponse.ok || !intent?.uploadUrl || !intent?.publicUrl || !intent?.key) {
  console.error(JSON.stringify({ ok:false, step:"presign", status:presignResponse.status, payload:presignText.slice(0,300) }, null, 2));
  process.exit(1);
}

const uploadResponse = await fetch(intent.uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": "image/png" },
  body: bytes,
});
if (!uploadResponse.ok) {
  console.error(JSON.stringify({ ok:false, step:"put", status:uploadResponse.status }, null, 2));
  process.exit(1);
}

let readResponse = null;
for (let attempt = 1; attempt <= 5; attempt += 1) {
  readResponse = await fetch(`${intent.publicUrl}?ops-proof=${Date.now()}`, { headers: { "cache-control": "no-cache" } });
  if (readResponse.ok) break;
  await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
}
if (!readResponse?.ok) {
  console.error(JSON.stringify({ ok:false, step:"get", status:readResponse?.status || 0 }, null, 2));
  process.exit(1);
}
const readBytes = Buffer.from(await readResponse.arrayBuffer());
const actualHash = createHash("sha256").update(readBytes).digest("hex");
if (actualHash !== expectedHash) {
  console.error(JSON.stringify({ ok:false, step:"hash", expectedHash, actualHash }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  status: "presign_put_public_get_verified",
  key: intent.key,
  publicUrl: intent.publicUrl,
  sizeBytes: bytes.length,
  sha256: expectedHash,
  contentType: readResponse.headers.get("content-type") || "",
}, null, 2));
