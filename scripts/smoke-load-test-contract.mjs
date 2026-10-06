import { readFile } from "node:fs/promises";

const k6Source = await readFile(new URL("../load-tests/k6-platform-journey.js", import.meta.url), "utf8");
const readmeSource = await readFile(new URL("../load-tests/README.md", import.meta.url), "utf8");
const reportSource = await readFile(new URL("../docs/archive_reports/LOAD_TEST_REPORT.md", import.meta.url), "utf8");
const autocannonSource = await readFile(new URL("./run-production-load-autocannon.mjs", import.meta.url), "utf8");

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", message: error.message });
  }
}

function assertIncludes(source, fragment) {
  if (!source.includes(fragment)) {
    throw new Error(`Missing fragment: ${fragment}`);
  }
}

function assertNotIncludes(source, fragment) {
  if (source.includes(fragment)) {
    throw new Error(`Unexpected fragment: ${fragment}`);
  }
}

check("k6 runs exactly one explicit load profile per invocation", () => {
  assertIncludes(k6Source, 'const LOAD_PROFILE = (__ENV.LOAD_PROFILE || "pilot").toLowerCase()');
  assertIncludes(k6Source, "pilot:");
  assertIncludes(k6Source, "scale500:");
  assertIncludes(k6Source, "scale1000:");
  assertIncludes(k6Source, "[LOAD_PROFILE]: PROFILES[LOAD_PROFILE]");
  assertIncludes(k6Source, "Unknown LOAD_PROFILE=");
  assertNotIncludes(k6Source, "pilot_100:");
  assertNotIncludes(k6Source, "scale_500:");
  assertNotIncludes(k6Source, "scale_1000:");
  assertNotIncludes(k6Source, "startTime:");
});

check("k6 script covers health, bootstrap, login, and quiz submit", () => {
  assertIncludes(k6Source, "/health");
  assertIncludes(k6Source, "/content/bootstrap");
  assertIncludes(k6Source, "/taxonomy/bootstrap");
  assertIncludes(k6Source, "/auth/login");
  assertIncludes(k6Source, "/quizzes/${QUIZ_ID}/submit");
});

check("k6 scale metrics are optional and use admin authorization", () => {
  assertIncludes(k6Source, "ADMIN_TOKEN");
  assertIncludes(k6Source, "/health/scale-metrics");
  assertIncludes(k6Source, "authHeaders(ADMIN_TOKEN)");
});

check("k6 records payload and bootstrap cache evidence", () => {
  assertIncludes(k6Source, "platform_response_body_bytes");
  assertIncludes(k6Source, "platform_response_body_bytes_by_endpoint");
  assertIncludes(k6Source, "platform_bootstrap_cache_hits");
  assertIncludes(k6Source, "platform_bootstrap_cache_shared");
  assertIncludes(k6Source, "platform_bootstrap_cache_misses");
  assertIncludes(k6Source, "X-Content-Cache");
  assertIncludes(k6Source, "markBootstrapCache");
});

check("k6 writes a profile-specific machine-readable summary", () => {
  assertIncludes(k6Source, "k6-platform-${LOAD_PROFILE}-summary.json");
  assertIncludes(k6Source, "handleSummary");
});

check("autocannon runner cannot escalate profiles implicitly", () => {
  assertIncludes(autocannonSource, "LOAD_PROFILE");
  assertIncludes(autocannonSource, "pilot: [20, 100]");
  assertIncludes(autocannonSource, "scale500: [500]");
  assertIncludes(autocannonSource, "scale1000: [1000]");
  assertIncludes(autocannonSource, 'prod_load_" + profileName + "_summary.json');
});

check("autocannon requires an explicit target and runtime credentials", () => {
  assertIncludes(autocannonSource, "LOAD_API_BASE is required");
  assertIncludes(autocannonSource, "LOAD_STUDENT_EMAIL and LOAD_STUDENT_PASSWORD are required");
  assertIncludes(autocannonSource, 'new URL(rawApiBase)');
  assertNotIncludes(autocannonSource, "Student@123");
  assertNotIncludes(autocannonSource, "almeaacodax-k2ux.onrender.com");
});

check("load testing README documents required environment values and safe escalation", () => {
  assertIncludes(readmeSource, "API_BASE");
  assertIncludes(readmeSource, "STUDENT_EMAIL");
  assertIncludes(readmeSource, "QUIZ_ID");
  assertIncludes(readmeSource, "LOAD_API_BASE");
  assertIncludes(readmeSource, "LOAD_STUDENT_EMAIL");
  assertIncludes(readmeSource, "LOAD_STUDENT_PASSWORD");
  assertIncludes(readmeSource, "Never escalate automatically");
});

check("load test report documents the execution contract", () => {
  assertIncludes(reportSource, "10k User Readiness Gate");
  assertIncludes(reportSource, "Load Test Scripts - 2026-05-12");
});

const failed = checks.filter((item) => item.status === "FAIL");
if (failed.length > 0) {
  console.error(JSON.stringify({ total: checks.length, failed }, null, 2));
  process.exit(1);
}

console.log(`Load test contract passed (${checks.length} checks).`);
