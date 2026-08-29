import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const script = await read("scripts/measure-read-baseline.mjs");
const runbook = await read("docs/architecture/RUNTIME_READ_BASELINE.md");

const checks = [
  ["baseline requires an explicit target URL", script.includes('getArgument("--base-url")') && script.includes("Missing --base-url")],
  ["baseline defaults to a small bounded request count", script.includes("const DEFAULT_REQUESTS = 3") && script.includes("const MAX_REQUESTS = 20")],
  ["baseline measures latency and payload bytes", script.includes("p95DurationMs") && script.includes("maxBytes")],
  ["baseline covers learner bootstrap and catalog reads", script.includes("taxonomy-compact") && script.includes("content-learning-core") && script.includes("courses-first-page")],
  ["runbook refuses unsupported scale claims", runbook.includes("NOT PROVEN") && runbook.includes("لا تشغّل الأداة ضد الإنتاج")],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (failed.length) process.exit(1);
console.log(`Read baseline contract passed (${checks.length} checks).`);
