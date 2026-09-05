import { readFile } from "node:fs/promises";

const files = {
  packageJson: await readFile(new URL("../server/package.json", import.meta.url), "utf8"),
  env: await readFile(new URL("../server/src/config/env.ts", import.meta.url), "utf8"),
  envExample: await readFile(new URL("../server/.env.example", import.meta.url), "utf8"),
  redis: await readFile(new URL("../server/src/config/redis.ts", import.meta.url), "utf8"),
  rateLimiters: await readFile(new URL("../server/src/middleware/rateLimiters.ts", import.meta.url), "utf8"),
  app: await readFile(new URL("../server/src/app.ts", import.meta.url), "utf8"),
  clientApp: await readFile(new URL("../App.tsx", import.meta.url), "utf8"),
  aiRoutes: await readFile(new URL("../server/src/routes/ai.routes.ts", import.meta.url), "utf8"),
  aiService: await readFile(new URL("../services/geminiService.ts", import.meta.url), "utf8"),
  questionBank: await readFile(new URL("../dashboards/admin/QuestionBankManager.tsx", import.meta.url), "utf8"),
  questionBuilder: await readFile(new URL("../dashboards/admin/builders/UnifiedQuestionBuilder.tsx", import.meta.url), "utf8"),
  auth: await readFile(new URL("../server/src/middleware/auth.ts", import.meta.url), "utf8"),
  sockets: await readFile(new URL("../server/src/sockets/index.ts", import.meta.url), "utf8"),
  securityChecklist: await readFile(new URL("../docs/archive_reports/SECURITY_CHECKLIST.md", import.meta.url), "utf8"),
  rbacMatrix: await readFile(new URL("../docs/archive_reports/RBAC_MATRIX.md", import.meta.url), "utf8"),
  report: await readFile(new URL("../docs/archive_reports/06_07_SECURITY_RBAC_REPORT.md", import.meta.url), "utf8").catch(() => ""),
};

const checks = [];

function check(name, fn) {
  checks.push([name, fn]);
}

function assertIncludes(source, expected) {
  if (!source.includes(expected)) {
    throw new Error(`Expected to find: ${expected}`);
  }
}

function assertExcludes(source, unexpected) {
  if (source.includes(unexpected)) {
    throw new Error(`Expected not to find: ${unexpected}`);
  }
}

check("Redis security dependencies are installed and documented", () => {
  assertIncludes(files.packageJson, "ioredis");
  assertIncludes(files.packageJson, "rate-limit-redis");
  assertIncludes(files.packageJson, "@socket.io/redis-adapter");
  assertIncludes(files.env, "REDIS_URL");
  assertIncludes(files.envExample, "REDIS_URL=");
});

check("rate limits use RedisStore when Redis is configured", () => {
  assertIncludes(files.rateLimiters, "RedisStore");
  assertIncludes(files.rateLimiters, "createRedisClient");
  assertIncludes(files.rateLimiters, "globalRateLimiter");
  assertIncludes(files.rateLimiters, "authRateLimiter");
  assertIncludes(files.rateLimiters, "sensitiveActionRateLimiter");
  assertIncludes(files.rateLimiters, "passOnStoreError: true");
  assertIncludes(files.app, "globalRateLimiter");
  assertIncludes(files.app, "authRateLimiter");
  assertIncludes(files.app, "sensitiveActionRateLimiter");
});

check("Socket.IO can scale horizontally with Redis adapter", () => {
  assertIncludes(files.sockets, "createAdapter");
  assertIncludes(files.sockets, "createRedisDuplicate");
  assertIncludes(files.sockets, "Redis adapter enabled");
});

check("RBAC middleware verifies current user state from MongoDB", () => {
  assertIncludes(files.auth, "UserModel.findById");
  assertIncludes(files.auth, "currentUser.isActive === false");
  assertIncludes(files.auth, "role: currentUser.role");
  assertIncludes(files.auth, "!allowedRoles.includes(req.authUser.role)");
});

check("student AI planning endpoints require authentication", () => {
  for (const endpoint of ["/study-plan", "/learning-path", "/remediation-plan"]) {
    assertIncludes(files.aiRoutes, `aiRouter.post(\n  "${endpoint}",\n  requireAuth,`);
  }
});
check("AI question generation is staff-only and review-first", () => {
  assertIncludes(files.clientApp, `<Route path="/admin/quiz-gen" element={<RequireRole allowedRoles={['admin', 'teacher', 'supervisor']}><QuizGenerator /></RequireRole>} />`);
  assertIncludes(files.aiRoutes, 'aiRouter.post(\n  "/question",\n  requireAuth,\n  requireRole(["admin", "teacher", "supervisor"]),');
  assertIncludes(files.aiService, "api.aiQuestion({ topic })");
  assertIncludes(files.questionBank, "onClick={handleCreateAiDraft}");
  assertIncludes(files.questionBank, "resetEditorQuestion('draft')");
  assertIncludes(files.questionBank, "skillIds: selectedSkillId ? [selectedSkillId] : []");
  assertIncludes(files.questionBank, "generateOnOpen={generateAiDraftOnOpen}");
  assertIncludes(files.questionBuilder, "generateOnOpen?: boolean;");
  assertIncludes(files.questionBuilder, "void handleGenerateWithFeedback();");
  assertExcludes(files.questionBank, "توليد ذكي من ملف (AI)");
  assertExcludes(files.questionBank, "جاري استخراج الأسئلة وتصنيفها آلياً");
});
check("security documents cover phase six controls", () => {
  assertIncludes(files.securityChecklist, "Redis-backed distributed storage");
  assertIncludes(files.securityChecklist, "requireRole");
  assertIncludes(files.securityChecklist, "@socket.io/redis-adapter");
  assertIncludes(files.rbacMatrix, "Role Rules");
  assertIncludes(files.rbacMatrix, "Phase 6/7 Hardening Delivered");
  assertIncludes(files.report, "No UI/UX changes were made");
  assertIncludes(files.report, "STOP");
});

for (const [name, fn] of checks) {
  try {
    fn();
  } catch (error) {
    console.error(`Security/RBAC phase 6 contract failed: ${name}`);
    console.error(error);
    process.exit(1);
  }
}

console.log(`Security/RBAC phase 6 contract passed (${checks.length} checks).`);
