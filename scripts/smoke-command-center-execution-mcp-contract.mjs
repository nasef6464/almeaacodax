import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  draftModel,
  applyService,
  workflowModel,
  workflowService,
  workflowExecutor,
  workflowRoutes,
  mcpOAuth,
  mcpTools,
  mcpRoutes,
  commandRoutes,
  aiRoutes,
  csrf,
  mongoSanitize,
  app,
  env,
  adminPanel,
  commandApi,
  aiApi,
  handoff,
] = await Promise.all([
  read("server/src/models/CommandCenterDraft.ts"),
  read("server/src/modules/command-center/application/draftApplyService.ts"),
  read("server/src/models/CommandCenterWorkflow.ts"),
  read("server/src/modules/command-center/application/workflowService.ts"),
  read("server/src/modules/command-center/application/workflowExecutor.ts"),
  read("server/src/modules/command-center/http/workflowRoutes.ts"),
  read("server/src/modules/command-center/application/mcpOAuth.ts"),
  read("server/src/modules/command-center/application/mcpTools.ts"),
  read("server/src/modules/command-center/http/mcpRoutes.ts"),
  read("server/src/modules/command-center/http/commandCenterRoutes.ts"),
  read("server/src/routes/ai.routes.ts"),
  read("server/src/middleware/csrf.ts"),
  read("server/src/middleware/mongoSanitize.ts"),
  read("server/src/app.ts"),
  read("server/src/config/env.ts"),
  read("dashboards/admin/command-center/CommandCenterOperationsPanel.tsx"),
  read("services/apiGroups/commandCenterApi.ts"),
  read("services/apiGroups/aiApi.ts"),
  read("docs/architecture/ALMEAA_COMMAND_CENTER_HANDOFF_AR.md"),
]);

assert.match(draftModel, /applyStatus/);
assert.match(draftModel, /"applying"/);
assert.match(applyService, /applyCourseDraft/);
assert.match(applyService, /applyQuizDraft/);
assert.match(applyService, /applySchoolDraft/);
assert.match(applyService, /isPublished:\s*false/);
assert.match(applyService, /showOnPlatform:\s*false/);
assert.match(commandRoutes, /human_apply_required/);
assert.match(commandRoutes, /drafts\/:id\/apply/);

assert.match(workflowModel, /planned/);
assert.match(workflowModel, /completed/);
assert.match(workflowService, /Plan|planCommandWorkflow/);
assert.match(workflowService, /executeCommandWorkflow/);
assert.match(workflowExecutor, /SAFE_WORKFLOW_TOOL_IDS/);
assert.match(workflowExecutor, /executeSafeCommandTool/);
assert.match(workflowRoutes, /workflows:execute/);

assert.match(mcpOAuth, /ALMEAA_MCP_OAUTH_ISSUER/);
assert.match(mcpOAuth, /ALMEAA_MCP_OAUTH_AUDIENCE/);
assert.match(mcpOAuth, /issuer:/);
assert.match(mcpOAuth, /audience:/);
assert.match(mcpOAuth, /createPublicKey/);
assert.match(mcpOAuth, /timingSafeEqual/);
assert.match(mcpTools, /get_profile/);
assert.match(mcpTools, /create_course_draft/);
assert.match(mcpTools, /create_school_setup_draft/);
assert.doesNotMatch(mcpTools, /name:\s*"publish_/);
assert.doesNotMatch(mcpTools, /name:\s*"apply_/);
assert.doesNotMatch(mcpTools, /name:\s*"delete_/);
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
assert.match(adminPanel, /أمر ذكي للمنصة/);
assert.match(adminPanel, /Plan → Execute → Verify/);
assert.match(commandApi, /executeCommandCenterWorkflow/);
assert.match(aiApi, /aiAdminCommandPlan/);
assert.match(handoff, /686763d09c40d279b0879ce93943503018c21571/);

console.log("Command Center execution + MCP contract: PASS");
