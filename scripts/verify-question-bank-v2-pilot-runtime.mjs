/**
 * Runtime verifier for the ALMEAA Question Bank V2 Pilot.
 *
 * Read-only. Confirms the imported batch is intact, still draft/unlinked,
 * visible to admin, and invisible through the unauthenticated learner list.
 */
import { writeFile } from "node:fs/promises";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

if (process.env.PILOT_ALLOW_EXTERNAL_RUN !== "YES") {
  throw new Error("External Pilot verification is fail-closed: set PILOT_ALLOW_EXTERNAL_RUN=YES only after owner authorization.");
}

const apiBase = required("PILOT_API_BASE").replace(/\/$/, "");
const adminToken = required("PILOT_ADMIN_TOKEN");
const batchId = String(process.env.QUESTION_PILOT_BATCH_ID || "QBANK-COL2627-PILOT40-20260922-V1")
  .trim()
  .toUpperCase();
const expectedCount = Number(process.env.QUESTION_PILOT_EXPECTED_COUNT || "5");
if (![5, 40].includes(expectedCount)) {
  throw new Error("QUESTION_PILOT_EXPECTED_COUNT must be 5 or 40");
}
const outputFile = required("QUESTION_PILOT_OUTPUT_FILE");

const request = async (requestPath, token = "") => {
  const response = await fetch(`${apiBase}${requestPath}`, {
    headers: {
      accept: "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 500) }; }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${requestPath}: ${JSON.stringify(body)}`);
  }
  return body;
};

const batch = await request(`/quizzes/questions/import-batch/${encodeURIComponent(batchId)}`, adminToken);
if (batch?.status !== "PASS") {
  throw new Error(`Batch integrity status is not PASS: ${JSON.stringify(batch?.integrityIssues || [])}`);
}
if (Number(batch?.count || 0) !== expectedCount) {
  throw new Error(`Expected ${expectedCount} Pilot questions, found ${batch?.count ?? "unknown"}`);
}
if (batch?.allDraft !== true || Number(batch?.drafts || 0) !== expectedCount) {
  throw new Error("Pilot batch is not entirely draft");
}
if (Number(batch?.linkedQuizCount || 0) !== 0) {
  throw new Error("Pilot batch is linked to a quiz before approval");
}
if (Array.isArray(batch?.integrityIssues) && batch.integrityIssues.length > 0) {
  throw new Error(`Pilot batch has integrity issues: ${JSON.stringify(batch.integrityIssues)}`);
}

const questionIds = Array.isArray(batch?.questions)
  ? batch.questions.map((question) => String(question?.id || "").trim()).filter(Boolean)
  : [];
if (questionIds.length !== expectedCount) {
  throw new Error(`Expected ${expectedCount} stable question IDs, found ${questionIds.length}`);
}

const query = new URLSearchParams({
  ids: questionIds.join(","),
  limit: "100",
  noTotal: "true",
}).toString();

const adminRows = await request(`/quizzes/questions?${query}`, adminToken);
if (!Array.isArray(adminRows) || adminRows.length !== expectedCount) {
  throw new Error(`Admin list did not return all Pilot drafts: expected ${expectedCount}, received ${Array.isArray(adminRows) ? adminRows.length : "non-array"}`);
}

const publicRows = await request(`/quizzes/questions?${query}`);
if (!Array.isArray(publicRows)) {
  throw new Error("Public question list returned a non-array payload");
}
if (publicRows.length !== 0) {
  throw new Error(`Draft isolation failed: unauthenticated learner list exposed ${publicRows.length} Pilot question(s)`);
}

const report = {
  status: "PASS",
  batchId,
  expectedCount,
  batchCount: batch.count,
  drafts: batch.drafts,
  linkedQuizCount: batch.linkedQuizCount,
  integrityIssues: batch.integrityIssues || [],
  adminVisible: adminRows.length,
  publicVisible: publicRows.length,
  verifiedAt: new Date().toISOString(),
};

await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
