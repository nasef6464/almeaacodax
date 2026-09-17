import { spawnSync } from "node:child_process";

const run = (command, args, options = {}) =>
  spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });

const env = { ...process.env };
const apiBase = String(env.SMOKE_API_BASE_URL || "").replace(/\/$/, "");
const isProductionRemote =
  /https:\/\/[^/]*vercel\.app\/api$/i.test(apiBase) ||
  /https:\/\/[^/]*onrender\.com\/api$/i.test(apiBase) ||
  String(env.SMOKE_PRODUCTION_TARGET || "").toLowerCase() === "true";

const hasToken = String(env.SMOKE_ADMIN_TOKEN || "").trim().length > 0;
const hasCreds =
  String(env.SMOKE_ADMIN_EMAIL || env.GOLIVE_ADMIN_EMAIL || env.ADMIN_EMAIL || "").trim().length > 0 &&
  String(env.SMOKE_ADMIN_PASSWORD || env.GOLIVE_ADMIN_PASSWORD || env.ADMIN_PASSWORD || "").trim().length > 0;

if (!hasToken && !hasCreds) {
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

// Never run the fixture-heavy operational journey against a live production URL.
// It contains POST operations intended for isolated seeded environments. Production
// verification is deliberately limited to health + CSRF + login + authenticated GET.
if (isProductionRemote) {
  const safeProductionSmoke = run("node", ["scripts/smoke-production-auth-readonly.mjs"], { env });
  process.exit(safeProductionSmoke.status ?? 1);
}

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
      // Keep the existing credential fallback for isolated environments.
    }
  }
}

const operational = run("npm", ["--prefix", "server", "run", "smoke:operational:api"], { env });
if (operational.status !== 0) {
  process.exit(operational.status ?? 1);
}
