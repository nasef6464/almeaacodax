import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [routes, auth, registry, draft, audit, plan, routeIndex, env, authoring, authoringRoutes, courseTools, courseRoutes] = await Promise.all([
  read("server/src/modules/command-center/http/commandCenterRoutes.ts"),
  read("server/src/modules/command-center/application/commandAuthorization.ts"),
  read("server/src/modules/command-center/application/commandToolRegistry.ts"),
  read("server/src/models/CommandCenterDraft.ts"),
  read("server/src/models/CommandCenterAudit.ts"),
  read("docs/architecture/ALMEAA_COMMAND_CENTER_EXECUTION_PLAN_AR.md"),
  read("server/src/routes/index.ts"),
  read("server/src/config/env.ts"),
  read("server/src/modules/command-center/application/questionQuizDraftTools.ts"),
  read("server/src/modules/command-center/http/questionQuizDraftRoutes.ts"),
  read("server/src/modules/command-center/application/courseReuseDraftTools.ts"),
  read("server/src/modules/command-center/http/courseDraftRoutes.ts"),
]);

assert.match(routes, /draftFirst/);
assert.match(routes, /liveWritesEnabled:\s*false/);
assert.match(routes, /human_approval_required/);
assert.match(routes, /idempotencyKey/);
assert.match(auth, /timingSafeEqual/);
assert.match(auth, /ALMEAA_COMMAND_API_KEY/);
assert.match(auth, /ALMEAA_COMMAND_API_SCOPES/);
assert.match(registry, /get_skill_tree/);
assert.match(registry, /create_course_draft/);
assert.match(registry, /create_school_setup_draft/);
assert.match(registry, /publish_approved_draft/);
assert.match(draft, /pending/);
assert.match(draft, /approved/);
assert.match(draft, /rejected/);
assert.match(audit, /actorType/);
assert.match(routeIndex, /command-center/);
assert.match(env, /ALMEAA_COMMAND_API_KEY/);
assert.match(plan, /One Command Center/);
assert.match(plan, /Plan → Execute → Verify/);
assert.match(authoring, /subSkillIds/);
assert.match(authoring, /exact_duplicate_live/);
assert.match(authoringRoutes, /questions\/draft/);
assert.match(authoringRoutes, /quizzes\/draft/);
assert.match(courseTools, /reuse_first/);
assert.match(courseTools, /existing_platform_content/);
assert.match(courseTools, /generateOnlyWhenMissing/);
assert.match(courseRoutes, /inventory/);
assert.match(courseRoutes, /course\.reuse\.draft\.create/);

console.log("Command Center foundation contract: PASS");
