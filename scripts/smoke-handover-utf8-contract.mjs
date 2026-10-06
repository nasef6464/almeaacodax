import fs from "node:fs";
import path from "node:path";

const files = [
  "docs/archive_reports/PROJECT_STATUS.md",
  "docs/archive_reports/CODEX_HANDOFF.md",
  "docs/SPARK_BATCH_LEDGER_AR.md",
  "docs/NEXT_SESSION_HANDOVER_AR.md",
];

const mojibakePatterns = [/Ø/g, /Ù/g, /\uFFFD/g, /\?\?\?\?/g];

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
    failures.push(`${rel}: لا يوجد مقطع BATCH حديث للفحص.`);
    continue;
  }

  for (const pattern of mojibakePatterns) {
    if (pattern.test(section)) {
      failures.push(
        `${rel}: يوجد نص مشوّه في آخر مقطع دفعة (pattern: ${pattern}).`
      );
      break;
    }
  }
}

if (failures.length) {
  console.error("UTF-8 handover guard: FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log("UTF-8 handover guard: PASS");
console.log("آخر مقطع دفعة في ملفات التسليم الأربعة خالٍ من مؤشرات التشوه.");
