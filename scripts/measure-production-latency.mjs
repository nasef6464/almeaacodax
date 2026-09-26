import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API_BASE = String(process.env.PRODUCTION_API_BASE || "https://almeaacodax.vercel.app/api").replace(/\/$/, "");
const SAMPLE_COUNT = Math.min(Math.max(Number(process.env.PRODUCTION_LATENCY_SAMPLES || 7) || 7, 3), 25);
const TIMEOUT_MS = Math.min(Math.max(Number(process.env.PRODUCTION_LATENCY_TIMEOUT_MS || 15_000) || 15_000, 2_000), 30_000);
const MAX_ERROR_RATE = Math.min(Math.max(Number(process.env.PRODUCTION_LATENCY_MAX_ERROR_RATE || 0.02) || 0.02, 0), 1);
const MAX_P95_MS = Math.min(Math.max(Number(process.env.PRODUCTION_LATENCY_MAX_P95_MS || 2_500) || 2_500, 250), 30_000);
const ENFORCE = process.argv.includes("--enforce") || ["1","true","yes","on"].includes(String(process.env.PRODUCTION_LATENCY_ENFORCE || "").toLowerCase());
const OUTPUT = process.env.PRODUCTION_LATENCY_OUTPUT || "audit-artifacts/production-latency/summary.json";

const endpoints = [
  { id: "ready", path: "/health/ready" },
  { id: "courses", path: "/courses?limit=100" },
  { id: "quizzes", path: "/quizzes?limit=100" },
  { id: "learning-bootstrap", path: "/content/bootstrap?scope=learning&phase=core" },
];

const percentile = (sorted, ratio) => {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))];
};

const measureOne = async (endpoint) => {
  const samples = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const startedAt = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const url = new URL(API_BASE + endpoint.path);
      url.searchParams.set("_perf", `${Date.now()}-${index}`);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          "cache-control": "no-cache",
          pragma: "no-cache",
        },
        signal: controller.signal,
      });
      const body = await response.arrayBuffer();
      samples.push({
        status: response.status,
        durationMs: performance.now() - startedAt,
        bytes: body.byteLength,
        renderOrigin: response.headers.get("x-render-origin-server") || "",
      });
    } catch (error) {
      samples.push({
        status: 0,
        durationMs: performance.now() - startedAt,
        bytes: 0,
        error: error instanceof Error ? error.name : "request_failed",
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  const successful = samples.filter((sample) => sample.status >= 200 && sample.status < 400);
  const durations = successful.map((sample) => sample.durationMs).sort((a, b) => a - b);
  const bytes = successful.map((sample) => sample.bytes).sort((a, b) => a - b);
  const failedRequests = samples.length - successful.length;
  const errorRate = samples.length ? failedRequests / samples.length : 1;

  return {
    ...endpoint,
    totalRequests: samples.length,
    successfulRequests: successful.length,
    failedRequests,
    errorRate: Number(errorRate.toFixed(4)),
    p50DurationMs: Number(percentile(durations, 0.5).toFixed(2)),
    p95DurationMs: Number(percentile(durations, 0.95).toFixed(2)),
    p99DurationMs: Number(percentile(durations, 0.99).toFixed(2)),
    p50ResponseBytes: percentile(bytes, 0.5),
    statuses: [...new Set(samples.map((sample) => sample.status))],
    renderOriginSeen: samples.some((sample) => sample.renderOrigin === "Render"),
  };
};

const results = [];
for (const endpoint of endpoints) results.push(await measureOne(endpoint));

const report = {
  kind: "production-read-latency-evidence",
  measuredAt: new Date().toISOString(),
  apiBase: API_BASE,
  sampleCount: SAMPLE_COUNT,
  timeoutMs: TIMEOUT_MS,
  thresholds: {
    enforce: ENFORCE,
    maxErrorRate: MAX_ERROR_RATE,
    maxP95DurationMs: MAX_P95_MS,
  },
  limits: "Read-only bounded evidence. This does not certify 500/1000 concurrent-user capacity by itself.",
  results,
};

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

if (ENFORCE) {
  const failed = results.filter((item) =>
    item.successfulRequests === 0 ||
    item.errorRate > MAX_ERROR_RATE ||
    item.p95DurationMs > MAX_P95_MS
  );
  if (failed.length) {
    console.error(`Production latency certification failed for: ${failed.map((item) => item.id).join(", ")}`);
    process.exit(1);
  }
}
