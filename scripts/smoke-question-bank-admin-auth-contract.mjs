import { readFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");
const [
  resolver,
  pilot,
  operational,
  sentry,
  r2,
  packageJson,
] = await Promise.all([
  read("scripts/resolve-smoke-admin-token.mjs"),
  read("scripts/run-question-bank-v2-pilot.mjs"),
  read("scripts/smoke-operational-auto.mjs"),
  read("scripts/smoke-sentry-live-proof-auto.mjs"),
  read("scripts/smoke-r2-live-proof.mjs"),
  read("package.json"),
]);

const checks = [];
const check = (name, condition) => {
  checks.push({ name, pass: Boolean(condition) });
};

check("resolver exports reusable smoke token helper", resolver.includes("export async function resolveSmokeAdminToken"));
check("resolver exports reusable pilot token helper", resolver.includes("export async function resolvePilotAdminToken"));
check("resolver CLI never prints raw token field", !resolver.includes("token: bodyToken") && !resolver.includes("token: cookieToken"));
check("resolver CLI never prints setx/export command", !resolver.includes("setx SMOKE_ADMIN_TOKEN") && !resolver.includes("exportCommand"));
check("resolver uses bounded fetch timeouts", resolver.includes("AbortSignal.timeout(timeoutMs)"));
check("pilot imports secure token helper", pilot.includes('resolvePilotAdminToken } from "./resolve-smoke-admin-token.mjs"'));
check("pilot no longer hard-requires PILOT_ADMIN_TOKEN", !pilot.includes('required("PILOT_ADMIN_TOKEN")'));
check("operational smoke does not scrape token from child stdout", !operational.includes("JSON.parse(String(resolved.stdout"));
check("sentry smoke does not scrape token from child stdout", !sentry.includes("JSON.parse(String(resolved.stdout"));
check("r2 smoke does not scrape token from child stdout", !r2.includes("JSON.parse(String(resolved.stdout"));
check("package exposes admin-auth contract smoke", packageJson.includes('"smoke:question-bank-admin-auth"'));

const failed = checks.filter((entry) => !entry.pass);
for (const entry of checks) {
  console.log(`${entry.pass ? "PASS" : "FAIL"}: ${entry.name}`);
}

if (failed.length) {
  console.error(`Admin auth contract failed: ${failed.length} check(s).`);
  process.exit(1);
}

console.log(`PASS: admin auth token handling contract (${checks.length}/${checks.length}).`);
