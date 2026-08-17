import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), "utf8");

const sources = {
  groupModel: read("server/src/models/Group.ts"),
  userModel: read("server/src/models/User.ts"),
  contentRoutes: read("server/src/routes/content.routes.ts"),
  api: read("services/api.ts"),
  store: read("store/useStore.ts"),
  schoolsManager: [
    read("dashboards/admin/SchoolsManager.tsx"),
    read("dashboards/admin/SchoolsManager/SchoolRelationsPanel.tsx"),
  ].join("\n"),
  schoolPortal: read("dashboards/admin/SchoolPortalManager.tsx"),
  usersManager: read("dashboards/admin/UsersManager.tsx"),
  supervisorSmoke: read("scripts/smoke-supervisor-dashboard-contract.mjs"),
  schoolManagementSmoke: read("scripts/smoke-school-management-contract.mjs"),
  reportsSmoke: read("scripts/smoke-reports-role-contract.mjs"),
};

const checks = [];
const warnings = [];

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

function warn(name, assertion, impact) {
  try {
    assertion();
  } catch (error) {
    warnings.push({
      name,
      impact,
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

check("Group model supports school/class/private group relationships and query indexes", () => {
  assertIncludes(sources.groupModel, 'enum: ["SCHOOL", "CLASS", "PRIVATE_GROUP"]');
  assertIncludes(sources.groupModel, "parentId");
  assertIncludes(sources.groupModel, "ownerId");
  assertIncludes(sources.groupModel, "supervisorIds");
  assertIncludes(sources.groupModel, "studentIds");
  assertIncludes(sources.groupModel, "courseIds");
  assertIncludes(sources.groupModel, "groupSchema.index({ type: 1, parentId: 1");
  assertIncludes(sources.groupModel, "groupSchema.index({ supervisorIds: 1, type: 1 })");
  assertIncludes(sources.groupModel, "groupSchema.index({ studentIds: 1, type: 1 })");
});

check("User model stores role relationship fields with indexes", () => {
  assertIncludes(sources.userModel, "schoolId");
  assertIncludes(sources.userModel, "groupIds");
  assertIncludes(sources.userModel, "linkedStudentIds");
  assertIncludes(sources.userModel, "managedPathIds");
  assertIncludes(sources.userModel, "managedSubjectIds");
  assertIncludes(sources.userModel, "userSchema.index({ schoolId: 1, role: 1");
  assertIncludes(sources.userModel, "userSchema.index({ groupIds: 1, role: 1 })");
  assertIncludes(sources.userModel, "userSchema.index({ linkedStudentIds: 1 })");
});

check("Backend school relation endpoint is protected and updates parent/supervisor/student links server-side", () => {
  assertIncludes(sources.contentRoutes, '"/schools/:id/relations"');
  assertIncludes(sources.contentRoutes, 'requireRole(["admin", "supervisor"])');
  assertIncludes(sources.contentRoutes, "schoolRelationSchema.parse(req.body)");
  assertIncludes(sources.contentRoutes, "assertSchoolManagementScope(req.authUser!, school as any)");
  assertIncludes(sources.contentRoutes, "You cannot manage this school");
  assertIncludes(sources.contentRoutes, "groupIds: nextGroupIds");
  assertIncludes(sources.contentRoutes, "$addToSet: { linkedStudentIds: student.id");
  assertIncludes(sources.contentRoutes, "$addToSet: { supervisorIds: supervisor.id");
  assertIncludes(sources.contentRoutes, "groups: updatedGroups");
  assertIncludes(sources.contentRoutes, "users: updatedUsers");
});

check("School report and import-students routes reuse the same school scope guard", () => {
  assertPattern(
    sources.contentRoutes,
    /"\/schools\/:id\/report"[\s\S]*assertSchoolManagementScope\(req\.authUser!, school as any\)[\s\S]*"You cannot manage this school"/,
  );
  assertPattern(
    sources.contentRoutes,
    /"\/schools\/:id\/import-students"[\s\S]*assertSchoolManagementScope\(req\.authUser!, school as any\)[\s\S]*"You cannot manage this school"/,
  );
});

check("Group CRUD requires auth, role, and group-scope validation before mutating existing groups", () => {
  assertPattern(sources.contentRoutes, /"\/groups\/:id"[\s\S]*requireAuth[\s\S]*requireRole\(\["admin", "teacher", "supervisor"\]\)/);
  assertIncludes(sources.contentRoutes, "hasGroupManagementScope(req.authUser!, existing as any)");
  assertIncludes(sources.contentRoutes, "You cannot manage this group");
});

check("Frontend uses the server relations endpoint and refreshes users/groups from authoritative response", () => {
  assertIncludes(sources.api, "applySchoolRelations");
  assertIncludes(sources.schoolsManager, "api.applySchoolRelations(selectedSchool.id");
  assertIncludes(sources.schoolsManager, "mergeSchoolUsers(response.users)");
  assertIncludes(sources.schoolsManager, "mergeSchoolGroups(response.groups)");
  assertIncludes(sources.schoolsManager, "loadSchoolReport(selectedSchool.id)");
});

check("Admin UI exposes school/class supervisor assignment, class movement, and parent linking flows", () => {
  assertIncludes(sources.schoolsManager, "handleAssignSchoolSupervisor(value, selectedSchool.id)");
  assertIncludes(sources.schoolsManager, "handleAssignSchoolSupervisor(value, classroom.id)");
  assertIncludes(sources.schoolsManager, "handleAssignStudentToClass(student.id, value)");
  assertIncludes(sources.schoolsManager, "handleApplyRelationImport");
  assertIncludes(sources.schoolsManager, "بريد ولي الأمر");
  assertIncludes(sources.schoolsManager, "createMissingRelationUsers");
  assertIncludes(sources.usersManager, "handleSupervisorGroupsChange");
  assertIncludes(sources.usersManager, "handleParentLinkedStudentsChange");
  assertIncludes(sources.usersManager, "linkedStudentIds");
});

check("Local store persists both user-side and group-side relationship changes", () => {
  assertIncludes(sources.store, "assignStudentToGroup");
  assertIncludes(sources.store, "api.updateAdminUser(userId");
  assertIncludes(sources.store, "api.updateGroup(persistedGroup.id");
  assertIncludes(sources.store, "removeStudentFromGroup");
  assertIncludes(sources.store, "assignSupervisorToGroup");
  assertIncludes(sources.store, "removeSupervisorFromGroup");
  assertIncludes(sources.store, "assignCourseToGroup");
  assertIncludes(sources.store, "removeCourseFromGroup");
});

check("Supervisor portal scopes students, groups, quiz results, and targeted quizzes by relationship", () => {
  assertIncludes(sources.schoolPortal, "const userGroupIds = new Set(user.groupIds || [])");
  assertIncludes(sources.schoolPortal, "const studentIds = new Set(students.map((student) => student.id))");
  assertIncludes(sources.schoolPortal, "const results = examResults.filter");
  assertIncludes(sources.schoolPortal, "targetGroupIds");
  assertIncludes(sources.schoolPortal, "targetUserIds");
  assertIncludes(sources.supervisorSmoke, "scopedStudentIdSet");
  assertIncludes(sources.supervisorSmoke, "groupSnapshots");
});

check("Existing smoke contracts cover school management, supervisor dashboard, and role reports", () => {
  assertIncludes(sources.schoolManagementSmoke, "backend has one real school relations endpoint");
  assertIncludes(sources.schoolManagementSmoke, "school relations endpoint is scoped for supervisors");
  assertIncludes(sources.supervisorSmoke, "supervisor analytics are scoped");
  assertIncludes(sources.reportsSmoke, "server analytics scopes reports by role");
});

warn(
  "School students table is capped at 80 rows in the UI",
  () => {
    if (sources.schoolsManager.includes("visibleSchoolStudents.slice(0, 80)")) {
      throw new Error("Found visibleSchoolStudents.slice(0, 80)");
    }
  },
  "High-volume schools may hide students beyond the first 80 unless search/filter finds them; needs a dedicated pagination or virtual-list batch.",
);

warn(
  "School relation fallback code after server workflow is unreachable",
  () => {
    if (sources.schoolsManager.includes("await loadSchoolReport(selectedSchool.id);\n                return;\n\n                if (createMissingRelationUsers)")) {
      throw new Error("Found legacy fallback after return");
    }
  },
  "Not currently breaking the server-backed workflow, but the stale branch increases maintenance risk and should be cleaned in a focused cleanup batch.",
);

const failed = checks.filter((item) => item.status === "FAIL");
const result = {
  batch: "BATCH_100F_GROUPS_SCHOOLS_RELATIONSHIPS_DEEP_FUNCTIONAL_AUDIT_2026-05-21_AR",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  warnings: warnings.length,
  checks,
  warningDetails: warnings,
};

console.log(JSON.stringify(result, null, 2));

if (failed.length > 0) {
  process.exit(1);
}
