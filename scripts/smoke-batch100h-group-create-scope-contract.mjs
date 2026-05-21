import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), "utf8");

const sources = {
  contentRoutes: read("server/src/routes/content.routes.ts"),
  groupModel: read("server/src/models/Group.ts"),
  authMiddleware: read("server/src/middleware/auth.ts"),
};

const checks = [];

function check(name, assertion) {
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
}

function assertIncludes(source, fragment, message) {
  if (!source.includes(fragment)) {
    throw new Error(message || `Missing fragment: ${fragment}`);
  }
}

function assertPattern(source, pattern, message) {
  if (!pattern.test(source)) {
    throw new Error(message || `Missing pattern: ${pattern}`);
  }
}

check("Group model keeps the school/class/private hierarchy fields required for scoped creation", () => {
  assertIncludes(sources.groupModel, 'enum: ["SCHOOL", "CLASS", "PRIVATE_GROUP"]');
  assertIncludes(sources.groupModel, "parentId");
  assertIncludes(sources.groupModel, "ownerId");
  assertIncludes(sources.groupModel, "supervisorIds");
  assertIncludes(sources.groupModel, "studentIds");
  assertIncludes(sources.groupModel, "courseIds");
});

check("Auth middleware refreshes role and school relationship fields before protected group creation", () => {
  assertIncludes(sources.authMiddleware, "schoolId");
  assertIncludes(sources.authMiddleware, "groupIds");
  assertIncludes(sources.authMiddleware, "requireRole");
});

check("POST /content/groups is protected by auth and role middleware", () => {
  assertPattern(
    sources.contentRoutes,
    /contentRouter\.post\(\s*"\/groups"[\s\S]*requireAuth[\s\S]*requireRole\(\["admin", "teacher", "supervisor"\]\)/,
  );
});

check("Group creation no longer writes the raw frontend payload directly", () => {
  if (sources.contentRoutes.includes("GroupModel.create(payload)")) {
    throw new Error("POST /groups still calls GroupModel.create(payload) directly");
  }
  assertIncludes(sources.contentRoutes, "buildScopedGroupCreatePayload(req.authUser!, payload)");
  assertIncludes(sources.contentRoutes, "GroupModel.create(createScope.payload)");
});

check("Non-admin users cannot create top-level SCHOOL groups", () => {
  assertPattern(
    sources.contentRoutes,
    /payload\.type === "SCHOOL"[\s\S]*Only admins can create schools/,
    "Missing explicit non-admin SCHOOL creation denial",
  );
});

check("Scoped creation resolves and validates the parent school from server data", () => {
  assertIncludes(sources.contentRoutes, "GroupModel.findOne(buildDocumentQuery(parentId))");
  assertIncludes(sources.contentRoutes, "parentGroup.type === \"SCHOOL\"");
  assertIncludes(sources.contentRoutes, "parentGroup.parentId");
  assertIncludes(sources.contentRoutes, "hasSchoolIdManagementScope(authUser, parentSchoolId)");
});

check("Non-admin group creation ignores frontend relationship escalation fields", () => {
  assertPattern(sources.contentRoutes, /ownerId:\s*String\(authUser\.id\)/);
  assertPattern(sources.contentRoutes, /studentIds:\s*\[\]/);
  assertPattern(sources.contentRoutes, /courseIds:\s*\[\]/);
  assertPattern(sources.contentRoutes, /supervisorIds:\s*uniqueStrings\(\[String\(authUser\.id\)\]\)/);
});

check("Out-of-scope users receive a safe forbidden response", () => {
  assertIncludes(sources.contentRoutes, "You cannot create a group under this school");
  assertIncludes(sources.contentRoutes, "createScope.statusCode");
});

const failed = checks.filter((item) => item.status === "FAIL");
const result = {
  batch: "BATCH_100H_GROUP_CREATE_SCOPE_HARDENING_E2E_2026-05-21_AR",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};

console.log(JSON.stringify(result, null, 2));

if (failed.length > 0) {
  process.exit(1);
}
