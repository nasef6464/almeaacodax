import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const files = {
  routes: await read("server/src/routes/content.routes.ts"),
  authRoutes: await read("server/src/routes/auth.routes.ts"),
  api: await read("services/api.ts"),
  schools: await read("dashboards/admin/SchoolsManager.tsx"),
  store: await read("store/useStore.ts"),
};

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
  assertIncludes(files.schools, "launchActionCards");
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
  assertIncludes(files.schools, "commercialOperatingSteps");
  assertIncludes(files.schools, 'data-testid="school-commercial-operating-flow"');
  assertIncludes(files.schools, "school-commercial-step-");
  assertIncludes(files.schools, "خط تشغيل التعاقد المدرسي");
  assertIncludes(files.schools, "ابدأ من هنا ولا تترك المدرسة ناقصة");
  assertIncludes(files.schools, "إضافة الطلاب");
  assertIncludes(files.schools, "ربط المشرفين");
  assertIncludes(files.schools, "إدارة الباقات");
  assertIncludes(files.schools, "فتح التقارير");
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
