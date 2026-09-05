import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const endpointPlan = [
  { id: "health", path: "/api/health" },
  { id: "taxonomy-compact", path: "/api/taxonomy/bootstrap?phase=compact" },
  { id: "learning-bootstrap", path: "/api/content/bootstrap?scope=learning&phase=core" },
];

const getArgument = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
};

const boundedInteger = (value, fallback, maximum) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
};

const percentile = (sorted, ratio) => {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
};

const rawBaseUrl = getArgument("--base-url");
if (!rawBaseUrl) {
  console.error("Missing --base-url. This validation accepts only an isolated loopback API.");
  process.exit(2);
}

const baseUrl = new URL(rawBaseUrl);
if (!new Set(["127.0.0.1", "localhost", "::1"]).has(baseUrl.hostname)) {
  console.error("Refusing a non-loopback target. Bounded scale validation must use an isolated API.");
  process.exit(2);
}

const concurrency = boundedInteger(getArgument("--concurrency"), 25, 50);
const durationMs = boundedInteger(getArgument("--duration-ms"), 30_000, 120_000);
const timeoutMs = boundedInteger(getArgument("--timeout-ms"), 5_000, 30_000);
const outputPath = getArgument("--output") || "audit-artifacts/isolated-scale/summary.json";

const measureEndpoint = async (endpoint) => {
  const deadline = Date.now() + durationMs;
  const samples = [];
  const worker = async () => {
    while (Date.now() < deadline) {
      const startedAt = performance.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(new URL(endpoint.path, baseUrl), { headers: { accept: "application/json" }, signal: controller.signal });
        await response.arrayBuffer();
        samples.push({ status: response.status, durationMs: performance.now() - startedAt });
      } catch (error) {
        samples.push({ status: 0, durationMs: performance.now() - startedAt, error: error instanceof Error ? error.name : "request_failed" });
      } finally {
        clearTimeout(timeout);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  const successful = samples.filter((sample) => sample.status >= 200 && sample.status < 400);
  const durations = successful.map((sample) => sample.durationMs).sort((left, right) => left - right);
  const failures = samples.length - successful.length;
  const summary = {
    ...endpoint,
    totalRequests: samples.length,
    successfulRequests: successful.length,
    failedRequests: failures,
    errorRate: samples.length ? failures / samples.length : 1,
    p50DurationMs: Number(percentile(durations, 0.5).toFixed(2)),
    p95DurationMs: Number(percentile(durations, 0.95).toFixed(2)),
    p99DurationMs: Number(percentile(durations, 0.99).toFixed(2)),
  };
  if (summary.successfulRequests === 0 || summary.errorRate >= 0.02 || summary.p95DurationMs >= 2_000) {
    throw new Error(`${endpoint.id} failed bounded scale threshold: ${JSON.stringify(summary)}`);
  }
  return summary;
};

try {
  const results = [];
  for (const endpoint of endpointPlan) results.push(await measureEndpoint(endpoint));
  const report = {
    kind: "bounded-isolated-read-scale-validation",
    measuredAt: new Date().toISOString(),
    baseUrl: baseUrl.origin,
    concurrency,
    durationMs,
    timeoutMs,
    thresholds: { maxErrorRateExclusive: 0.02, maxP95DurationMsExclusive: 2_000 },
    limits: "This is a loopback CI validation of read-only endpoints, not production capacity certification.",
    results,
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`, "utf8");
  throw error;
}
