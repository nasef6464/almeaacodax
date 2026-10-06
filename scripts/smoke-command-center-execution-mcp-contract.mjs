import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  draftModel,
  applyService,
  applyCourseQuiz,
  applyQuestion,
  applyQuizUpdate,
  applySchool,
  courseAudit,
  quizUpdateTools,
  questionModel,
  schoolImportPanel,
  schoolImportAdapter,
  developerTools,
  developerRoutes,
  workflowModel,
  workflowService,
  workflowExecutor,
  workflowRoutes,
  mcpOAuth,
  mcpTools,
  mcpToolCatalog,
  mcpToolExecution,
  mcpRoutes,
  commandRoutes,
  aiRoutes,
  csrf,
  mongoSanitize,
  app,
  env,
  adminPanel,
  naturalLanguagePanel,
  commandApi,
  aiApi,
  handoff,
] = await Promise.all([
  read("server/src/models/CommandCenterDraft.ts"),
  read("server/src/modules/command-center/application/draftApplyService.ts"),
  read("server/src/modules/command-center/application/draftApplyCourseQuiz.ts"),
  read("server/src/modules/command-center/application/draftApplyQuestion.ts"),
  read("server/src/modules/command-center/application/draftApplyQuizUpdate.ts"),
  read("server/src/modules/command-center/application/draftApplySchool.ts"),
  read("server/src/modules/command-center/application/courseAudit.ts"),
  read("server/src/modules/command-center/application/quizUpdateDraftTools.ts"),
  read("server/src/models/Question.ts"),
  read("dashboards/admin/command-center/CommandCenterSchoolImportPanel.tsx"),
  read("dashboards/admin/command-center/schoolImportDraftAdapter.ts"),
  read("server/src/modules/command-center/application/developerTaskTools.ts"),
  read("server/src/modules/command-center/http/developerDraftRoutes.ts"),
  read("server/src/models/CommandCenterWorkflow.ts"),
  read("server/src/modules/command-center/application/workflowService.ts"),
  read("server/src/modules/command-center/application/workflowExecutor.ts"),
  read("server/src/modules/command-center/http/workflowRoutes.ts"),
  read("server/src/modules/command-center/application/mcpOAuth.ts"),
  read("server/src/modules/command-center/application/mcpTools.ts"),
  read("server/src/modules/command-center/application/mcpToolCatalog.ts"),
  read("server/src/modules/command-center/application/mcpToolExecution.ts"),
  read("server/src/modules/command-center/http/mcpRoutes.ts"),
  read("server/src/modules/command-center/http/commandCenterRoutes.ts"),
  read("server/src/routes/ai.routes.ts"),
  read("server/src/middleware/csrf.ts"),
  read("server/src/middleware/mongoSanitize.ts"),
  read("server/src/app.ts"),
  read("server/src/config/env.ts"),
  read("dashboards/admin/command-center/CommandCenterOperationsPanel.tsx"),
  read("dashboards/admin/command-center/CommandCenterNaturalLanguagePanel.tsx"),
  read("services/apiGroups/commandCenterApi.ts"),
  read("services/apiGroups/aiApi.ts"),
  read("docs/architecture/ALMEAA_COMMAND_CENTER_HANDOFF_AR.md"),
]);

assert.match(draftModel, /applyStatus/);
assert.match(draftModel, /"applying"/);
assert.match(applyService, /applyApprovedCommandDraft/);
assert.match(applyCourseQuiz, /applyCourseDraft/);
assert.match(applyCourseQuiz, /applyQuizDraft/);
assert.match(applyQuestion, /applyQuestionBatchDraft/);
assert.match(applyQuestion, /bulkWrite/);
assert.match(applyQuestion, /approvalStatus:\s*"draft"/);
assert.match(applyQuizUpdate, /originalPublishedQuizUnchanged:\s*true/);
assert.match(applyQuizUpdate, /isPublished:\s*false/);
assert.match(applyQuizUpdate, /showOnPlatform:\s*false/);
assert.match(quizUpdateTools, /nearDuplicateMatches/);
assert.match(quizUpdateTools, /question_not_approved/);
assert.match(quizUpdateTools, /questionSimilarity/);
assert.match(questionModel, /subSkillIds/);
assert.match(schoolImportPanel, /parseRelationFile/);
assert.match(schoolImportPanel, /stablePayloadFingerprint/);
assert.match(schoolImportPanel, /idempotencyKey:\s*`school-import:\${fingerprint}`/);
assert.match(schoolImportAdapter, /teachers/);
assert.match(schoolImportAdapter, /supervisors/);
assert.match(applySchool, /applySchoolDraft/);
assert.match(applyCourseQuiz, /isPublished:\s*false/);
assert.match(applyCourseQuiz, /showOnPlatform:\s*false/);
assert.match(courseAudit, /lesson_training_gap/);
assert.match(courseAudit, /module_assessment_gap/);
assert.match(courseAudit, /referenced_quiz_not_found/);
assert.match(courseAudit, /course_skill_without_content_coverage/);
assert.match(courseAudit, /automaticGeneration:\s*false/);
assert.match(courseAudit, /automaticPublish:\s*false/);
assert.match(commandRoutes, /human_apply_required/);
assert.match(commandRoutes, /drafts\/:id\/apply/);
assert.match(draftModel, /"developer_task"/);
assert.match(developerTools, /nasef6464\/almeaacodax/);
assert.match(developerTools, /contentMutation:\s*false/);
assert.match(developerTools, /mergeAllowed:\s*false/);
assert.match(developerTools, /deployAllowed:\s*false/);
assert.match(developerTools, /requiresHumanMergeAuthority:\s*true/);
assert.match(developerTools, /developer_task\.draft\.create/);
assert.match(developerTools, /developer_task\.handoff\.read/);
assert.match(developerRoutes, /developer:write/);
assert.match(developerRoutes, /developer:read/);
assert.match(commandRoutes, /developer_task_is_not_content_apply/);
assert.match(commandRoutes, /use\("\/developer", developerDraftRouter\)/);

assert.match(workflowModel, /planned/);
assert.match(workflowModel, /completed/);
assert.match(workflowService, /Plan|planCommandWorkflow/);
assert.match(workflowService, /executeCommandWorkflow/);
assert.match(workflowExecutor, /SAFE_WORKFLOW_TOOL_IDS/);
assert.match(workflowExecutor, /executeSafeCommandTool/);
assert.match(workflowExecutor, /plan_quiz_question_update/);
assert.match(workflowExecutor, /audit_course/);
assert.match(workflowExecutor, /buildQuizUpdateDiff/);
assert.match(workflowRoutes, /workflows:execute/);

assert.match(mcpOAuth, /ALMEAA_MCP_OAUTH_ISSUER/);
assert.match(mcpOAuth, /ALMEAA_MCP_OAUTH_AUDIENCE/);
assert.match(mcpOAuth, /issuer:/);
assert.match(mcpOAuth, /audience:/);
assert.match(mcpOAuth, /createPublicKey/);
assert.match(mcpOAuth, /timingSafeEqual/);
assert.match(mcpTools, /mcpToolCatalog/);
assert.match(mcpTools, /mcpToolExecution/);
assert.match(mcpToolCatalog, /get_profile/);
assert.match(mcpToolCatalog, /audit_course/);
assert.match(mcpToolCatalog, /create_course_draft/);
assert.match(mcpToolCatalog, /plan_quiz_question_update/);
assert.match(mcpToolCatalog, /create_school_setup_draft/);
assert.match(mcpToolCatalog, /create_developer_task_draft/);
assert.match(mcpToolCatalog, /get_developer_task_handoff/);
assert.match(mcpToolCatalog, /developer:write/);
assert.match(mcpToolCatalog, /developer:read/);
assert.match(mcpToolExecution, /executeMcpTool/);
assert.match(mcpToolExecution, /plan_quiz_question_update/);
assert.match(mcpToolExecution, /audit_course/);
assert.match(mcpToolExecution, /getApprovedDeveloperTaskHandoff/);
assert.doesNotMatch(mcpToolCatalog, /name:\s*"publish_/);
assert.doesNotMatch(mcpToolCatalog, /name:\s*"apply_/);
assert.doesNotMatch(mcpToolCatalog, /name:\s*"delete_/);
assert.doesNotMatch(mcpToolCatalog, /name:\s*"merge_/);
assert.doesNotMatch(mcpToolCatalog, /name:\s*"deploy_/);
assert.match(mcpRoutes, /2026-07-28/);
assert.match(mcpRoutes, /2025-11-25/);
assert.match(mcpRoutes, /server\/discover/);
assert.match(mcpRoutes, /tools\/list/);
assert.match(mcpRoutes, /tools\/call/);
assert.match(mcpRoutes, /Mcp-Method header/);
assert.match(commandRoutes, /use\("\/mcp", mcpRouter\)/);

assert.match(csrf, /mcpPath/);
assert.match(csrf, /Bearer/);
assert.match(mongoSanitize, /body\.params\.arguments/);
assert.match(app, /oauth-protected-resource/);
assert.match(env, /ALMEAA_MCP_ENABLED/);
assert.match(env, /ALMEAA_MCP_OAUTH_REQUIRED_SCOPE/);

assert.match(aiRoutes, /\/admin-command-plan/);
assert.match(aiRoutes, /Reuse-first/);
assert.match(aiRoutes, /workflowPlanSchema/);
assert.match(aiRoutes, /plan_quiz_question_update/);
assert.match(aiRoutes, /audit_course/);
assert.match(naturalLanguagePanel, /أمر ذكي للمنصة/);
assert.match(adminPanel, /Plan → Execute → Verify/);
assert.match(commandApi, /executeCommandCenterWorkflow/);
assert.match(aiApi, /aiAdminCommandPlan/);
assert.match(handoff, /686763d09c40d279b0879ce93943503018c21571/);

console.log("Command Center execution + MCP contract: PASS");
