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

  const idx = section.indexOf("Blockers:");
  if (idx === -1) {
    failures.push(`${rel}: Blockers field missing.`);
    continue;
  }

  const tail = section.slice(idx);
  const firstLine = (tail.split(/\r?\n/)[1] || "").trim();
  const hasMeaningfulText = firstLine.length > 0 || /\n\s*\d+\.\s+\S+/.test(tail);
  if (!hasMeaningfulText) {
    failures.push(`${rel}: Blockers field exists but appears empty.`);
    continue;
  }

  const hasAllowedSignal =
    /\bnone\b/i.test(tail) ||
    /لا يوجد/.test(tail) ||
    /external blocker/i.test(tail);

  if (!hasAllowedSignal) {
    failures.push(
      `${rel}: Blockers section should include one of: None / لا يوجد / external blocker.`
    );
  }
}

if (failures.length) {
  console.error("Handover blockers guard: FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log("Handover blockers guard: PASS");
console.log("Latest batch Blockers section is present and explicit in all delivery files.");
