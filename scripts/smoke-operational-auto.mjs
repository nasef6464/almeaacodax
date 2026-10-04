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
      `Unable to resolve admin token for operational smoke: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (!String(env.SMOKE_ADMIN_TOKEN || "").trim() && !hasCreds) {
  console.error(
    [
      "Operational smoke requires admin auth context.",
      "Provide one of the following:",
      "1) SMOKE_ADMIN_TOKEN",
      "2) SMOKE_ADMIN_EMAIL + SMOKE_ADMIN_PASSWORD",
      "3) GOLIVE_ADMIN_EMAIL + GOLIVE_ADMIN_PASSWORD",
      "4) ADMIN_EMAIL + ADMIN_PASSWORD",
    ].join("\n"),
  );
  process.exit(1);
}

const operational = run("npm", ["--prefix", "server", "run", "smoke:operational:api"], { env });
if (operational.status !== 0) {
  process.exit(operational.status ?? 1);
}
