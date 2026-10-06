import { spawnSync } from "node:child_process";

const run = (command, args, options = {}) =>
  spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });

const env = { ...process.env };
const hasToken = String(env.SMOKE_ADMIN_TOKEN || "").trim().length > 0;
const hasCreds =
  String(env.SMOKE_ADMIN_EMAIL || env.GOLIVE_ADMIN_EMAIL || env.ADMIN_EMAIL || "").trim().length > 0 &&
  String(env.SMOKE_ADMIN_PASSWORD || env.GOLIVE_ADMIN_PASSWORD || env.ADMIN_PASSWORD || "").trim().length > 0;

if (!hasToken && hasCreds) {
  const resolved = spawnSync("node", ["scripts/resolve-smoke-admin-token.mjs"], {
    env,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (resolved.status === 0) {
    try {
      const parsed = JSON.parse(String(resolved.stdout || "{}"));
      const token = String(parsed?.token || "").trim();
      if (token) {
        env.SMOKE_ADMIN_TOKEN = token;
      }
    } catch {
      // no-op
    }
  }
}

const sentryProof = run("node", ["scripts/smoke-sentry-live-proof.mjs"], { env });
if (sentryProof.status !== 0) {
  process.exit(sentryProof.status ?? 1);
}
