import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const files = {
  routes: await read("server/src/routes/content.routes.ts"),
  authRoutes: await read("server/src/routes/auth.routes.ts"),
  api: await read("services/api.ts"),
  schools: await read("dashboards/admin/SchoolsManager.tsx"),
  store: await read("store/useStore.ts"),
  packageJson: await read("package.json"),
  schoolFromScratchAudit: await read("scripts/live-school-from-scratch-audit.mjs"),
};
const packageJson = JSON.parse(files.packageJson);

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(source, fragment, message) {
  if (!source.includes(fragment)) throw new Error(message || `Missing fragment: ${fragment}`);
}

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) throw new Error(message || `Unexpected fragment: ${fragment}`);
}

check("backend has one real school relations endpoint", () => {
  assertIncludes(files.routes, '"/schools/:id/relations"');
  assertIncludes(files.routes, "schoolRelationSchema");
  assertIncludes(files.routes, "createMissingUsers");
  assertIncludes(files.routes, "linkedParents");
  assertIncludes(files.routes, "linkedSupervisors");
  assertIncludes(files.routes, "assignedClasses");
});

check("school relations endpoint is scoped for supervisors", () => {
  assertIncludes(files.routes, "canManageSchool");
  assertIncludes(files.routes, "You cannot manage this school");
  assertIncludes(files.routes, "school.supervisorIds");
});

check("frontend uses server relation workflow and supports one student add", () => {
  assertIncludes(files.api, "applySchoolRelations");
  assertIncludes(files.schools, "api.applySchoolRelations");
  assertIncludes(files.schools, "hydrateContentBootstrap({ groups: response.groups })");
  assertIncludes(files.schools, "إضافة طالب منفرد");
  assertIncludes(files.schools, "handleAddSingleStudent");
});

check("school management has launch readiness command center", () => {
  assertIncludes(files.schools, "readinessStatusLabel");
  assertIncludes(files.schools, "readinessNextStep");
  assertIncludes(files.schools, 'data-testid="school-command-center"');
  assertIncludes(files.schools, "downloadSchoolGapReport");
  assertIncludes(files.schools, "readiness-gaps.xlsx");
});

check("school handover workbook includes operational launch plan", () => {
  assertIncludes(files.schools, "schoolLaunchPlan");
  assertIncludes(files.schools, "supervisorHandoverChecklist");
  assertIncludes(files.schools, "schoolHandoverMessage");
  assertIncludes(files.schools, "launch-plan");
  assertIncludes(files.schools, "supervisor-checklist");
  assertIncludes(files.schools, "handover-message");
});

check("school list cards expose next readiness action", () => {
  assertIncludes(files.schools, "cardReadinessActions");
  assertIncludes(files.schools, "nextCardAction");
  assertIncludes(files.schools, "الخطوة التالية");
  assertIncludes(files.schools, "setActiveTab(action.tab)");
});

check("school management can copy handover message", () => {
  assertIncludes(files.schools, "copySchoolHandoverMessage");
  assertIncludes(files.schools, "navigator.clipboard.writeText(schoolHandoverMessage)");
  assertIncludes(files.schools, "managementNotice");
  assertIncludes(files.schools, "نسخ رسالة التسليم");
});

check("school list has portfolio readiness command center", () => {
  assertIncludes(files.schools, "schoolPortfolioRows");
  assertIncludes(files.schools, "schoolPortfolioSummary");
  assertIncludes(files.schools, "exportSchoolPortfolioReadiness");
  assertIncludes(files.schools, "schools-portfolio-readiness.xlsx");
  assertIncludes(files.schools, "مركز جاهزية التعاقدات المدرسية");
  assertIncludes(files.schools, "تصدير جاهزية المدارس");
  assertIncludes(files.schools, "أولوية المتابعة");
});

check("selected school has a clear commercial operating flow", () => {
  assertIncludes(files.schools, 'data-testid="school-workspace-shell"');
  assertIncludes(files.schools, 'data-testid="school-command-center"');
  assertIncludes(files.schools, 'data-testid="school-setup-progress"');
  assertIncludes(files.schools, 'data-testid="school-next-action"');
  assertIncludes(files.schools, "commercialOperatingSteps");
  assertIncludes(files.schools, "school-commercial-step-");
  assertIncludes(files.schools, "إضافة الطلاب");
  assertIncludes(files.schools, "ربط المشرفين");
  assertIncludes(files.schools, "إدارة الباقات");
  assertIncludes(files.schools, "فتح التقارير");
});

check("selected school has a real delete action", () => {
  assertIncludes(files.schools, "handleDeleteSelectedSchool");
  assertIncludes(files.schools, 'data-testid="school-delete-button"');
  assertIncludes(files.schools, "window.confirm");
  assertIncludes(files.schools, "deleteGroup(selectedSchool.id)");
  assertIncludes(files.schools, "setSelectedSchool(null)");
});

check("school workspace exposes all guided setup panels", () => {
  assertIncludes(files.schools, 'data-testid="school-classes-panel"');
  assertIncludes(files.schools, 'data-testid="school-students-panel"');
  assertIncludes(files.schools, 'data-testid="school-supervisors-panel"');
  assertIncludes(files.schools, 'data-testid="school-packages-panel"');
  assertIncludes(files.schools, 'data-testid="school-reports-panel"');
  assertIncludes(files.schools, 'data-testid="school-roster-panel"');
  assertIncludes(files.schools, "طلاب مسجلون");
  assertIncludes(files.schools, "أضف الطلاب أو ارفع ملف Excel");
  assertIncludes(files.schools, "طالب يحتاج فصل واضح");
});

check("each class card works as an operating unit", () => {
  assertIncludes(files.schools, 'data-testid="school-class-card"');
  assertIncludes(files.schools, 'data-testid="school-class-operating-actions"');
  assertIncludes(files.schools, 'data-testid="school-class-add-students"');
  assertIncludes(files.schools, 'data-testid="school-class-roster"');
  assertIncludes(files.schools, 'data-testid="school-class-import-students"');
  assertIncludes(files.schools, 'data-testid="school-class-access"');
  assertIncludes(files.schools, "focusClassStudentForm");
  assertIncludes(files.schools, "focusClassRoster");
  assertIncludes(files.schools, "setActiveTab('import')");
  assertIncludes(files.schools, "setActiveTab('packages')");
});

check("school supervisor scope is explicit and not mixed with platform admin", () => {
  assertIncludes(files.schools, "schoolLevelSupervisors");
  assertIncludes(files.schools, "classScopedSupervisors");
  assertIncludes(files.schools, "supervisorScopeRows");
  assertIncludes(files.schools, 'data-testid="school-wide-supervisors-panel"');
  assertIncludes(files.schools, 'data-testid="school-supervisor-scope-summary"');
  assertIncludes(files.schools, "مدير/مشرف المدرسة كاملة");
  assertIncludes(files.schools, "مشرف فصول محددة");
  assertIncludes(files.schools, "يرى المدرسة كاملة");
});

check("school supervisor management actions are wired", () => {
  assertIncludes(files.schools, "assignSupervisorToGroup(value, selectedSchool.id)");
  assertIncludes(files.schools, "removeSupervisorFromGroup(currentUser.id, selectedSchool.id)");
  assertIncludes(files.schools, "assignSupervisorToGroup(value, classroom.id)");
  assertIncludes(files.schools, "removeSupervisorFromGroup(currentUser.id, classroom.id)");
  assertIncludes(files.schools, "setActiveTab('relations')");
});

check("school workspace avoids duplicate operating blocks", () => {
  assertNotIncludes(files.schools, "launchActionCards");
  assertNotIncludes(files.schools, "schoolOperatingBlueprint");
  assertNotIncludes(files.schools, 'data-testid="school-commercial-operating-flow"');
  assertNotIncludes(files.schools, 'data-testid="school-operating-blueprint"');
  assertIncludes(files.schools, "schoolLevelSupervisors");
  assertIncludes(files.schools, "classScopedSupervisors");
  assertIncludes(files.schools, 'data-testid="school-wide-supervisors-panel"');
  assertIncludes(files.schools, 'data-testid="school-supervisor-scope-summary"');
});

check("school from scratch live audit is wired and cleans up", () => {
  if (packageJson.scripts["smoke:school-from-scratch-live"] !== "node scripts/live-school-from-scratch-audit.mjs") {
    throw new Error("Missing smoke:school-from-scratch-live package script");
  }
  assertIncludes(files.schoolFromScratchAudit, "create temporary school");
  assertIncludes(files.schoolFromScratchAudit, "import one student into class");
  assertIncludes(files.schoolFromScratchAudit, "apply parent and class supervisor relations");
  assertIncludes(files.schoolFromScratchAudit, "create school package with path scope");
  assertIncludes(files.schoolFromScratchAudit, "create school access code");
  assertIncludes(files.schoolFromScratchAudit, "school report sees new commercial setup");
  assertIncludes(files.schoolFromScratchAudit, "cleanupRequest");
});

check("school reports count students only", () => {
  assertIncludes(files.routes, 'const studentFilter = { schoolId, role: "student" };');
  assertIncludes(files.routes, "UserModel.find(studentFilter)");
  assertIncludes(files.routes, "UserModel.countDocuments(studentFilter)");
  assertIncludes(files.routes, 'UserModel.countDocuments({ schoolId, role: "student" })');
  assertIncludes(files.routes, 'UserModel.countDocuments({ role: "student", groupIds: classId })');
  assertIncludes(files.schoolFromScratchAudit, "metrics.totalStudents === 1");
  assertIncludes(files.schoolFromScratchAudit, "metrics.activeStudents === 1");
});

check("school supervisor links preserve school scope", () => {
  assertIncludes(files.store, "const nextSchoolId = targetGroup.type === 'SCHOOL'");
  assertIncludes(files.store, "schoolId: nextSchoolId || null");
  assertIncludes(files.store, "getUserSchoolIds(state.groups, state.user.groupIds || [], state.user.schoolId)");
  assertIncludes(files.store, "remainingSchoolIds");
});

check("school access codes attach students to the school roster", () => {
  assertIncludes(files.authRoutes, '"/me/redeem-access-code"');
  assertIncludes(files.authRoutes, "$set: { schoolId }");
  assertIncludes(files.authRoutes, "$addToSet: { groupIds: schoolId }");
  assertIncludes(files.authRoutes, "$addToSet: { studentIds: String(user.id || user._id) }");
  assertIncludes(files.authRoutes, "totalStudents: schoolStudentCount");
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));

if (failed.length > 0) process.exit(1);
