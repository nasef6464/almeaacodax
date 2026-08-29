const DEFAULT_REQUESTS = 3;
const MAX_REQUESTS = 20;
const DEFAULT_TIMEOUT_MS = 15_000;

const endpointPlan = [
  { id: "taxonomy-core", path: "/api/taxonomy/bootstrap?phase=core", purpose: "public navigation taxonomy" },
  { id: "taxonomy-compact", path: "/api/taxonomy/bootstrap?phase=compact", purpose: "learner skill classification" },
  { id: "content-learning-core", path: "/api/content/bootstrap?scope=learning&phase=core", purpose: "learner content shell" },
  { id: "courses-first-page", path: "/api/courses?page=1&limit=50", purpose: "public course catalog page" },
];

const asBoundedInteger = (value, fallback, max) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
};

const formatPlan = () => ({
  mode: "plan",
  requestsPerEndpoint: DEFAULT_REQUESTS,
  concurrency: 1,
  endpoints: endpointPlan,
  usage: "ALMEAA_MEASURE_BASE_URL=https://staging.example.com node scripts/measure-read-baseline.mjs",
});

if (process.argv.includes("--plan")) {
  console.log(JSON.stringify(formatPlan(), null, 2));
  process.exit(0);
}

const rawBaseUrl = String(process.env.ALMEAA_MEASURE_BASE_URL || "").trim();
if (!rawBaseUrl) {
  console.error("Missing ALMEAA_MEASURE_BASE_URL. Run with --plan to review the safe endpoint plan first.");
  process.exit(2);
}

const baseUrl = new URL(rawBaseUrl);
if (!["http:", "https:"].includes(baseUrl.protocol)) {
  throw new Error("ALMEAA_MEASURE_BASE_URL must use http or https.");
}

const requestsPerEndpoint = asBoundedInteger(process.env.ALMEAA_MEASURE_REQUESTS, DEFAULT_REQUESTS, MAX_REQUESTS);
const timeoutMs = asBoundedInteger(process.env.ALMEAA_MEASURE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 60_000);

const percentile = (sorted, ratio) => {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index];
};

const measure = async (endpoint) => {
  const samples = [];
  for (let attempt = 0; attempt < requestsPerEndpoint; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = performance.now();
    try {
      const response = await fetch(new URL(endpoint.path, baseUrl), {
        method: "GET",
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      const body = await response.arrayBuffer();
      samples.push({
        status: response.status,
        durationMs: Number((performance.now() - startedAt).toFixed(2)),
        bytes: body.byteLength,
        cache: response.headers.get("x-taxonomy-cache") || response.headers.get("x-content-cache") || response.headers.get("x-course-list-cache") || "none",
      });
    } catch (error) {
      samples.push({
        status: 0,
        durationMs: Number((performance.now() - startedAt).toFixed(2)),
        bytes: 0,
        cache: "error",
        error: error instanceof Error ? error.name : "request_failed",
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  const successful = samples.filter((sample) => sample.status >= 200 && sample.status < 400);
  const durations = successful.map((sample) => sample.durationMs).sort((left, right) => left - right);
  const bytes = successful.map((sample) => sample.bytes).sort((left, right) => left - right);
  return {
    ...endpoint,
    samples,
    summary: {
      successfulRequests: successful.length,
      failedRequests: samples.length - successful.length,
      p50DurationMs: percentile(durations, 0.5),
      p95DurationMs: percentile(durations, 0.95),
      medianBytes: percentile(bytes, 0.5),
      maxBytes: bytes.at(-1) || 0,
    },
  };
};

const results = [];
for (const endpoint of endpointPlan) {
  results.push(await measure(endpoint));
}

console.log(JSON.stringify({
  measuredAt: new Date().toISOString(),
  baseUrl: baseUrl.origin,
  requestsPerEndpoint,
  concurrency: 1,
  timeoutMs,
  results,
}, null, 2));
