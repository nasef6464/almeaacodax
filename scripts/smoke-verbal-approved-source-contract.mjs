/**
 * VERBAL26 approved-source contract.
 *
 * This gate is intentionally read-only. It validates a prepared canonical bank before
 * any production migration can be considered.
 */
import fs from "node:fs";
import path from "node:path";

const bankPath = process.argv[2] || path.join(process.cwd(), "server", "data", "verbal_approved_bank_v2.json");
const APPROVED = new Set(["abdelbaset", "anas"]);

if (!fs.existsSync(bankPath)) {
  throw new Error(`Approved bank not found: ${bankPath}`);
}

const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
if (!Array.isArray(bank) || bank.length === 0) throw new Error("Approved verbal bank is empty");

const ids = new Set();
const fingerprints = new Set();
const failures = [];

const norm = (v) => String(v ?? "").normalize("NFKC").replace(/[\u064B-\u065F\u0670]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

for (const [i, q] of bank.entries()) {
  const at = `row ${i + 1} (${q?.id || "missing-id"})`;
  if (!q?.id || !q?.canonicalId) failures.push(`${at}: missing id/canonicalId`);
  if (q?.id && ids.has(q.id)) failures.push(`${at}: duplicate id`);
  if (q?.id) ids.add(q.id);
  if (!APPROVED.has(q?.sourceBook)) failures.push(`${at}: unapproved sourceBook=${q?.sourceBook}`);
  if (!Number.isInteger(q?.sourcePage) || q.sourcePage < 1) failures.push(`${at}: invalid sourcePage`);
  if (q?.sourceQuestionNumber === undefined || q.sourceQuestionNumber === null || String(q.sourceQuestionNumber).trim() === "") failures.push(`${at}: missing sourceQuestionNumber`);
  if (!q?.mainSkillId || !q?.subSkillId) failures.push(`${at}: missing 22/76 classification`);
  if (!Array.isArray(q?.options) || q.options.length !== 4) failures.push(`${at}: expected exactly four options`);
  if (!Number.isInteger(q?.correctOptionIndex) || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) failures.push(`${at}: invalid answer key`);
  const fp = [norm(q?.text), ...(q?.options || []).map(norm)].join("|");
  if (fp && fingerprints.has(fp)) failures.push(`${at}: exact normalized duplicate`);
  if (fp) fingerprints.add(fp);
}

if (failures.length) {
  console.error(failures.join("\n"));
  throw new Error(`VERBAL26 source contract failed with ${failures.length} issue(s)`);
}

const bySource = bank.reduce((m, q) => ((m[q.sourceBook] = (m[q.sourceBook] || 0) + 1), m), {});
const byMain = bank.reduce((m, q) => ((m[q.mainSkillId] = (m[q.mainSkillId] || 0) + 1), m), {});
console.log(JSON.stringify({status:"PASS",total:bank.length,bySource,mainSkills:Object.keys(byMain).length,byMain}, null, 2));
