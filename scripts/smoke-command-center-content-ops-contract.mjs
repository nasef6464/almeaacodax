import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  similarity,
  authoring,
  updateTools,
  updateApply,
  applyFacade,
  draftModel,
  registry,
  routes,
  commandApi,
  panel,
  schoolImportPanel,
  schoolReader,
  approved,
] = await Promise.all([
  read("server/src/modules/command-center/application/questionSimilarity.ts"),
  read("server/src/modules/command-center/application/questionQuizDraftTools.ts"),
  read("server/src/modules/command-center/application/quizUpdateDraftTools.ts"),
  read("server/src/modules/command-center/application/draftApplyQuizUpdate.ts"),
  read("server/src/modules/command-center/application/draftApplyService.ts"),
  read("server/src/models/CommandCenterDraft.ts"),
  read("server/src/modules/command-center/application/commandToolRegistry.ts"),
  read("server/src/modules/command-center/http/questionQuizDraftRoutes.ts"),
  read("services/apiGroups/commandCenterApi.ts"),
  read("dashboards/admin/command-center/CommandCenterOperationsPanel.tsx"),
  read("dashboards/admin/command-center/CommandCenterSchoolImportPanel.tsx"),
  read("dashboards/admin/SchoolsManager/importFileReaders.ts"),
  read("docs/architecture/APPROVED_CONTRACT_EXTENSIONS.json"),
]);

assert.match(similarity, /0\.92/);
assert.match(similarity, /trigrams/);
assert.match(authoring, /near_duplicate_live/);
assert.match(authoring, /nearDuplicateCount/);
assert.match(authoring, /excludeQuestionIds/);
assert.match(updateTools, /baselineQuestionIdsHash/);
assert.match(updateTools, /addedQuestionIds/);
assert.match(updateTools, /removedQuestionIds/);
assert.match(updateTools, /quiz\.skillIds/);
assert.match(updateApply, /Target quiz changed after draft creation/);
assert.match(updateApply, /originalPublishedQuizUnchanged/);
assert.match(updateApply, /quiz_replacement/);
assert.match(updateApply, /showOnPlatform:\s*false/);
assert.match(updateApply, /targetGroupIds:\s*\[\]/);
assert.match(applyFacade, /quiz_update/);
assert.match(draftModel, /"quiz_update"/);
assert.match(registry, /plan_quiz_question_update/);
assert.match(registry, /availability: "active"/);
assert.match(routes, /quizzes\/:id\/diff/);
assert.match(routes, /quizzes\/:id\/update-draft/);
assert.match(commandApi, /getQuizQuestionDiff/);
assert.match(commandApi, /createQuizUpdateCommandDraft/);

assert.match(panel, /CommandCenterSchoolImportPanel/);
assert.ok(panel.split(/\r?\n/).length < 400, "Command Center operations panel must stay below runtime hotspot budget.");
assert.match(schoolImportPanel, /parseImportFile/);
assert.match(schoolImportPanel, /parseRelationFile/);
assert.match(schoolImportPanel, /استيراد مدرسة إلى مسودة آمنة/);
assert.match(schoolImportPanel, /createSchoolSetupCommandDraft/);
assert.match(schoolImportPanel, /validateSchoolSetupCommandDraft/);
assert.match(schoolReader, /safe lazy XLSX|loadXlsx/);
assert.match(schoolReader, /readWorkbookFromBuffer/);

const approvedJson = JSON.parse(approved);
assert.ok(
  approvedJson.backendRouteSignatures.includes("questionQuizDraftRouter|POST|/quizzes/:id/diff"),
  "Quiz diff route must be explicitly approved.",
);
assert.ok(
  approvedJson.backendRouteSignatures.includes("questionQuizDraftRouter|POST|/quizzes/:id/update-draft"),
  "Quiz update-draft route must be explicitly approved.",
);

console.log("Command Center content operations contract: PASS");
