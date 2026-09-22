import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const importRoutes = read("server/src/modules/quizzes/http/questionImportRoutes.ts");
const importSchemas = read("server/src/modules/quizzes/http/questionImportSchemas.ts");
const questionRoutes = read("server/src/modules/quizzes/http/questionBankRoutes.ts");
const questionModel = read("server/src/models/Question.ts");
const questionSchemas = read("server/src/modules/quizzes/http/questionQuerySchemas.ts");
const mediaRoutes = read("server/src/routes/media.routes.ts");
const importImageUpload = read("server/src/modules/media/application/questionImportImageUpload.ts");
const pilotRunner = read("scripts/run-question-bank-v2-pilot.mjs");

const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({
      name,
      status: "FAIL",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

const includes = (source, fragment) => {
  assert.ok(source.includes(fragment), `Missing fragment: ${fragment}`);
};

check("pilot batch routes are isolated from the bounded question bank router", () => {
  includes(questionRoutes, 'import { questionImportRouter } from "./questionImportRoutes.js";');
  includes(questionRoutes, "questionBankRouter.use(questionImportRouter);");
  assert.ok(questionRoutes.split(/\r?\n/).length <= 400);
});

check("pilot import is admin-only, bounded and dry-run by default", () => {
  includes(importRoutes, '"/questions/import-batch"');
  includes(importRoutes, 'requireRole(["admin"])');
  includes(importSchemas, "dryRun: z.boolean().optional().default(true)");
  includes(importSchemas, "items: z.array(importItemSchema).min(1).max(100)");
});

check("pilot import prevents duplicate codes and duplicate source identities", () => {
  includes(importRoutes, "DUPLICATE_QUESTION_CODE");
  includes(importRoutes, "DUPLICATE_SOURCE_ITEM_ID");
  includes(importRoutes, '"sourceMeta.sourceItemId": { $in: sourceItemIds }');
  includes(importRoutes, "StatusCodes.CONFLICT");
});

check("pilot import forces imported draft workflow and canonical taxonomy", () => {
  includes(importRoutes, "resolveCanonicalQuestionSkillIds(item)");
  includes(importRoutes, 'source: "imported"');
  includes(importRoutes, 'approvalStatus: "draft"');
  includes(importRoutes, "skillIds: canonicalSkills.skillIds");
  includes(importRoutes, "importBatchId: batchId");
});

check("dry-run validates without writing; write mode uses one bounded insert", () => {
  const dryRunIndex = importRoutes.indexOf("if (input.dryRun)");
  const insertIndex = importRoutes.indexOf("QuestionModel.insertMany");
  assert.ok(dryRunIndex >= 0 && insertIndex > dryRunIndex);
  includes(importRoutes, 'mode: "DRY_RUN"');
  includes(importRoutes, 'status: "IMPORTED"');
});

check("batch rollback is limited to unlinked drafts", () => {
  includes(importRoutes, 'approvalStatus !== "draft"');
  includes(importRoutes, '"mockExam.sections.questionIds"');
  includes(importRoutes, "Only an entirely draft import batch can be rolled back");
  includes(importRoutes, "Import batch is linked to a quiz and cannot be rolled back");
  includes(importRoutes, "QuestionModel.deleteMany");
});

check("canonical provenance survives the production question contract", () => {
  for (const fragment of [
    "sourceItemId: { type: String",
    "pdfPageIndex: { type: Number",
    "printedPageNumber: { type: Number",
    "printedQuestionNumber: { type: Number",
  ]) includes(questionModel, fragment);
  for (const fragment of [
    "sourceItemId: z.string().max(200)",
    "pdfPageIndex: z.number().int().min(1)",
    "printedPageNumber: z.number().int().min(1)",
    "printedQuestionNumber: z.number().int().min(0)",
  ]) includes(questionSchemas, fragment);
});

check("pilot runner fails closed and separates dry-run from write modes", () => {
  includes(pilotRunner, 'QUESTION_PILOT_MODE');
  includes(pilotRunner, 'PILOT_ALLOW_EXTERNAL_RUN !== "YES"');
  includes(pilotRunner, 'PILOT_WRITE_AUTHORIZATION !== "YES"');
  includes(pilotRunner, 'mode === "canary"');
  includes(pilotRunner, 'mode === "full"');
  includes(pilotRunner, 'dryRun: true');
  includes(pilotRunner, 'dryRun: false');
  includes(pilotRunner, 'verified.slice(0, 5)');
  includes(pilotRunner, 'verified.slice(5)');
});

check("pilot R2 image upload is admin-only, WebP-only and content-addressed", () => {
  includes(mediaRoutes, '"/question-import-images/presign"');
  includes(mediaRoutes, 'requireRole(["admin"])');
  includes(importImageUpload, "questions/v2/");
  includes(importImageUpload, "normalizedHash}.webp");
  includes(importImageUpload, '"Content-Type": "image/webp"');
  includes(importImageUpload, "/^[a-f0-9]{64}$/");
  assert.ok(!/data:image/i.test(importImageUpload), "Pilot image uploader must not create Base64 payloads");
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({
  phase: "question-pilot-import-contract",
  status: failed.length ? "FAIL" : "PASS",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
}, null, 2));

if (failed.length) process.exit(1);
