import fs from "node:fs";
import path from "node:path";

const files = [
  "PROJECT_STATUS.md",
  "CODEX_HANDOFF.md",
  "docs/SPARK_BATCH_LEDGER_AR.md",
  "docs/NEXT_SESSION_HANDOVER_AR.md",
];

function getLastBatchInfo(content) {
  const lines = content.split(/\r?\n/);
  let last = null;

  for (const line of lines) {
    const m = line.match(/^##\s+(?:Update\s+)?BATCH\s+(\d+)\s*-\s*(\d{4}-\d{2}-\d{2})/i);
    if (m) {
      last = { batch: Number(m[1]), date: m[2], header: line.trim() };
    }
  }
  return last;
}

const failures = [];
const infos = [];

for (const rel of files) {
  const filePath = path.resolve(rel);
  const content = fs.readFileSync(filePath, "utf8");
  const info = getLastBatchInfo(content);
  if (!info) {
    failures.push(`${rel}: no batch header found.`);
    continue;
  }
  infos.push({ rel, ...info });
}

if (!failures.length && infos.length) {
  const canonicalBatch = infos[0].batch;
  const canonicalDate = infos[0].date;
  for (const info of infos) {
    if (info.batch !== canonicalBatch) {
      failures.push(
        `${info.rel}: latest batch id (${info.batch}) differs from canonical (${canonicalBatch}).`
      );
    }
    if (info.date !== canonicalDate) {
      failures.push(
        `${info.rel}: latest batch date (${info.date}) differs from canonical (${canonicalDate}).`
      );
    }
  }
}

if (failures.length) {
  console.error("Handover consistency guard: FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log("Handover consistency guard: PASS");
console.log(`Latest batch is consistent across all delivery files: BATCH ${infos[0].batch} - ${infos[0].date}`);
