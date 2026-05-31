import fs from "node:fs";
import path from "node:path";

const files = [
  "PROJECT_STATUS.md",
  "CODEX_HANDOFF.md",
  "docs/SPARK_BATCH_LEDGER_AR.md",
  "docs/NEXT_SESSION_HANDOVER_AR.md",
];

const requiredOrder = [
  "Status:",
  "Scope:",
  "Gate Results:",
  "Deploy/Commit Evidence:",
  "Blockers:",
  "Next exact task:",
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
  if (nextHeader === -1) return rest;
  return rest.slice(0, nextHeader + 1);
}

const failures = [];

for (const rel of files) {
  const filePath = path.resolve(rel);
  const content = fs.readFileSync(filePath, "utf8");
  const section = getLastBatchSection(content);
  if (!section) {
    failures.push(`${rel}: latest batch section is missing.`);
    continue;
  }

  let lastPos = -1;
  const positions = {};
  for (const key of requiredOrder) {
    const pos = section.indexOf(key);
    if (pos === -1) {
      failures.push(`${rel}: missing required field "${key}" in latest batch section.`);
      break;
    }
    if (pos < lastPos) {
      failures.push(`${rel}: wrong field order in latest batch section (around "${key}").`);
      break;
    }
    positions[key] = pos;
    lastPos = pos;
  }

  if (failures.length === 0 && positions["Next exact task:"] !== undefined) {
    const fromNextTask = section.slice(positions["Next exact task:"]);
    const hasNumberedStep = /\n\s*1\.\s+\S+/.test(fromNextTask);
    if (!hasNumberedStep) {
      failures.push(
        `${rel}: "Next exact task:" exists but does not include at least one numbered step.`
      );
    }
  }
}

if (failures.length) {
  console.error("Handover structure guard: FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log("Handover structure guard: PASS");
console.log("Latest batch section in all delivery files has required fields in order.");
