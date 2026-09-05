import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [model, querySchemas, routes, bank, builder, aiContract, analyticsContract] = await Promise.all([
  read("server/src/models/Question.ts"),
  read("server/src/modules/quizzes/http/questionQuerySchemas.ts"),
  read("server/src/routes/quiz.routes.ts"),
  read("dashboards/admin/QuestionBankManager.tsx"),
  read("dashboards/admin/builders/UnifiedQuestionBuilder.tsx"),
  read("scripts/smoke-gate6-question-ai-authoring-contract.mjs"),
  read("scripts/smoke-gate6-question-usage-analytics-contract.mjs"),
]);

const check = (name, fn) => {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

check("question persistence owns supported sellable types and classification metadata", () => {
  assert.ok(model.includes('enum: ["mcq", "true_false", "essay"]'));
  for (const field of ["pathId:", "subject:", "sectionId:", "skillIds:", "difficulty:", "examType:", "source:", "year:"]) {
    assert.ok(model.includes(field), `missing classification field ${field}`);
  }
  assert.ok(model.includes('approvalStatus: { type: String, enum: ["draft", "pending_review", "approved", "rejected"]'));
});

check("question API accepts bounded classification and search filters", () => {
  assert.ok(querySchemas.includes('limit: z.coerce.number().int().min(1).max(100)'));
  for (const field of ["pathId", "subject", "sectionId", "skillId", "difficulty", "type", "examType", "source", "year", "approvalStatus", "search"]) {
    assert.ok(querySchemas.includes(`${field}:`), `missing query filter ${field}`);
  }
  assert.ok(routes.includes("questionListQuerySchema.parse(req.query)"));
});

check("unified builder provides explicit review-first authoring for all supported types", () => {
  for (const option of ['<option value="mcq">', '<option value="true_false">', '<option value="essay">']) {
    assert.ok(builder.includes(option), `missing builder type ${option}`);
  }
  for (const label of ["المسار", "المادة", "المهارة الرئيسة", "ربط بالمهارات الفرعية"]) {
    assert.ok(builder.includes(label), `missing builder classification UI ${label}`);
  }
  assert.ok(builder.includes("onSave({"));
  assert.ok(builder.includes("handleValidatedSave"));
});

check("question bank supports bounded browse, search, preview, duplicate, edit, delete and review", () => {
  assert.ok(bank.includes("api.getQuestionsPaginated"));
  assert.ok(bank.includes("limit: 100"));
  assert.ok(bank.includes("search: searchTerm || undefined"));
  for (const handler of ["handlePreviewQuestion", "handleDuplicate", "handleEdit", "handleDelete", "handleApprove", "handleReject"]) {
    assert.ok(bank.includes(handler), `missing bank operation ${handler}`);
  }
});

check("spreadsheet import remains preview-before-apply with row-level validation evidence", () => {
  for (const fragment of ["PendingImportBatch", "pendingImportBatch", "previewRows", "rowErrors", "readWorkbookFromBuffer", "sheetToSafeObjects"]) {
    assert.ok(bank.includes(fragment), `missing import evidence ${fragment}`);
  }
  for (const label of ["نموذج Excel", "رفع Excel", "معاينة قبل الاعتماد", "اعتماد الاستيراد"]) {
    assert.ok(bank.includes(label), `missing import UI ${label}`);
  }
});

check("AI authoring and usage analytics are retained as dedicated guarded contracts", () => {
  assert.ok(aiContract.includes("review"));
  assert.ok(aiContract.includes("api.aiQuestion"));
  assert.ok(analyticsContract.includes("QuestionAttemptModel.aggregate"));
  assert.ok(analyticsContract.includes("accuracyPercent"));
  assert.ok(analyticsContract.includes("averageTimeSeconds"));
});

check("commercial closure does not require fake PDF extraction or synthetic quality thresholds", () => {
  assert.ok(!bank.includes("QUESTION_QUALITY_THRESHOLD"));
  assert.ok(!bank.includes("accuracyPercent >="));
  assert.ok(!bank.includes("توليد ذكي من ملف (AI)"));
});

console.log("Gate 6 Questions commercial closure contract passed.");
