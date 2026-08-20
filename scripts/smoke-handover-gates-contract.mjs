import fs from "node:fs";
import path from "node:path";

const files = [
  "docs/archive_reports/PROJECT_STATUS.md",
  "docs/archive_reports/CODEX_HANDOFF.md",
  "docs/SPARK_BATCH_LEDGER_AR.md",
  "docs/NEXT_SESSION_HANDOVER_AR.md",
];

function getLastBatchSection(content) {
  const markers = [];
  const reBatch = /^##\s+BATCH\s+\d+.*$/gm;
  const reUpdateBatch = /^##\s+Update\s+BATCH\s+\d+.*$/gm;
  for (const m of content.matchAll(reBatch)) markers.push(m.index ?? -1);
  for (const m of content.matchAll(reUpdateBatch)) markers.push(m.index ?? -1);
  if (!markers.length) return "";
  const start = Math.max(...markers);
  const rest = content.slice(start);
  const nextHeader = rest.slice(1).search(/\n##\s+/);
  return nextHeader === -1 ? rest : rest.slice(0, nextHeader + 1);
}

const failures = [];

for (const rel of files) {
  const filePath = path.resolve(rel);
  const content = fs.readFileSync(filePath, "utf8");
  const section = getLastBatchSection(content);
  if (!section) {
    failures.push(`${rel}: latest batch section missing.`);
    continue;
  }

  const gateIdx = section.indexOf("Gate Results:");
  if (gateIdx === -1) {
    failures.push(`${rel}: Gate Results field missing.`);
    continue;
  }

  const tail = section.slice(gateIdx);
  const hasGateSignal = /\b(PASS|FAIL)\b/i.test(tail);
  if (!hasGateSignal) {
    failures.push(`${rel}: Gate Results has no PASS/FAIL signal.`);
  }
}

if (failures.length) {
  console.error("Handover gates guard: FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log("Handover gates guard: PASS");
console.log("Latest batch Gate Results includes PASS/FAIL signal in all delivery files.");
