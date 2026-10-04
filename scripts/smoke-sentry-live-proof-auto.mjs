import { spawnSync } from "node:child_process";
import { resolveSmokeAdminToken } from "./resolve-smoke-admin-token.mjs";

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
  try {
    const resolved = await resolveSmokeAdminToken({ env });
    env.SMOKE_ADMIN_TOKEN = resolved.token;
  } catch (error) {
    console.error(
      `Unable to resolve admin token for Sentry proof: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const sentryProof = run("node", ["scripts/smoke-sentry-live-proof.mjs"], { env });
if (sentryProof.status !== 0) {
  process.exit(sentryProof.status ?? 1);
}
