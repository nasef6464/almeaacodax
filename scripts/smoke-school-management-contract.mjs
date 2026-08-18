import { readFile } from "node:fs/promises";

const read = async (path) => (await readFile(new URL(`../${path}`, import.meta.url), "utf8")).replace(/\r\n/g, "\n");

const files = {
  routes: await read("server/src/routes/content.routes.ts"),
  authRoutes: await read("server/src/routes/auth.routes.ts"),
  api: await read("services/api.ts"),
  schools: [
  await read("dashboards/admin/SchoolsManager.tsx"),
  await read("dashboards/admin/SchoolsManager/SchoolPackagesPanel.tsx"),
  await read("dashboards/admin/SchoolsManager/readinessViewModel.ts"),
  await read("dashboards/admin/SchoolsManager/relationshipViewModel.ts"),
  await read("dashboards/admin/SchoolsManager/workspaceViewModel.ts"),
  await read("dashboards/admin/SchoolsManager/SchoolReportsPanel.tsx"),
  await read("dashboards/admin/SchoolsManager/SchoolHandoverReportSummary.tsx"),
  await read("dashboards/admin/SchoolsManager/SchoolPerformanceReportPanel.tsx"),
  await read("dashboards/admin/SchoolsManager/SchoolStudentRosterPanel.tsx"),
].join("\n"),
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
  assertIncludes(files.schools, "mergeSchoolGroups(response.groups)");
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
  assertIncludes(files.schools, 'data-testid="school-primary-actions"');
  assertIncludes(files.schools, "commercialDecisionCards");
  assertIncludes(files.schools, 'data-testid="school-commercial-summary-strip"');
  assertIncludes(files.schools, "school-commercial-decision-");
  assertIncludes(files.schools, "document.querySelector('[data-testid=\"school-students-panel\"]')");
  assertIncludes(files.schools, "document.querySelector('[data-testid=\"school-wide-supervisors-panel\"]')");
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
  assertIncludes(files.schools, "deleteGroupAsync(selectedSchool.id)");
  assertIncludes(files.store, "deleteGroupAsync: async");
  assertIncludes(files.schools, "setSelectedSchool(null)");
  assertIncludes(files.store, "deletedGroupIds");
  assertIncludes(files.store, "deletedPackageIds");
  assertIncludes(files.store, "state.b2bPackages.filter(pkg => pkg.schoolId !== groupId)");
  assertIncludes(files.routes, "GroupModel.deleteMany({ type: \"CLASS\", parentId: groupId })");
  assertIncludes(files.routes, "B2BPackageModel.deleteMany({ schoolId: { $in: deletedGroupIds } })");
  assertIncludes(files.routes, "AccessCodeModel.deleteMany({ schoolId: { $in: deletedGroupIds } })");
});

check("school workspace exposes all guided setup panels", () => {
  assertIncludes(files.schools, 'data-testid="school-classes-panel"');
  assertIncludes(files.schools, 'data-testid="school-students-panel"');
  assertIncludes(files.schools, 'data-testid="school-wide-supervisors-panel"');
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
  assertIncludes(files.schools, "quickSupervisor");
  assertIncludes(files.schools, "handleCreateQuickSupervisor");
  assertIncludes(files.schools, "api.createAdminUser");
  assertIncludes(files.schools, "existingSupervisor");
  assertIncludes(files.schools, 'data-testid="school-class-create-supervisor"');
  assertIncludes(files.store, "assignSupervisorToGroupAsync: async");
  assertIncludes(files.store, "removeSupervisorFromGroupAsync: async");
  assertIncludes(files.schools, "handleAssignSchoolSupervisor(value, selectedSchool.id)");
  assertIncludes(files.schools, "handleRemoveSchoolSupervisor(currentUser.id, selectedSchool.id)");
  assertIncludes(files.schools, "handleAssignSchoolSupervisor(value, classroom.id)");
  assertIncludes(files.schools, "handleRemoveSchoolSupervisor(currentUser.id, classroom.id)");
  assertIncludes(files.schools, "rosterActionPending");
  assertIncludes(files.schools, "setActiveTab('relations')");
});

check("school student roster exposes direct removal actions", () => {
  assertIncludes(files.store, "assignStudentToGroupAsync: async");
  assertIncludes(files.store, "removeStudentFromGroupAsync: async");
  assertIncludes(files.schools, "إخراج من الفصل");
  assertIncludes(files.schools, "إزالة من المدرسة");
  assertIncludes(files.schools, "handleAssignStudentToClass(student.id, value)");
  assertIncludes(files.schools, "handleRemoveStudentScope(student.id, currentClass.id)");
  assertIncludes(files.schools, "handleRemoveStudentScope(student.id, selectedSchoolId)");
  assertIncludes(files.schools, "rosterActionPending");
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
  assertIncludes(files.schoolFromScratchAudit, "school-wide supervisor scope is separate from class supervisor");
  assertIncludes(files.schoolFromScratchAudit, "create school package with path scope");
  assertIncludes(files.schoolFromScratchAudit, "create school access code");
  assertIncludes(files.schoolFromScratchAudit, "school report sees new commercial setup");
  assertIncludes(files.schoolFromScratchAudit, "school report preserves class supervisor count");
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

check("school student class assignment keeps one clear school/class relation", () => {
  assertIncludes(files.store, "const getSchoolClassIds = (schoolId?: string) =>");
  assertIncludes(files.store, "targetGroup.type === 'CLASS' && targetGroup.parentId");
  assertIncludes(files.store, ".filter(classId => classId !== targetGroup.id)");
  assertIncludes(files.store, "addUserToGroup(targetGroup.parentId, true)");
  assertIncludes(files.store, "nextGroupIds = nextGroupIds.filter(id => id !== groupId && !relatedClassIds.includes(id))");
});

check("school bulk import and relation uploads keep class membership singular", () => {
  assertIncludes(files.routes, "let currentSchoolClassIds = uniqueStrings(existingClasses.flatMap((item) => [item.id, String(item._id)]));");
  assertIncludes(files.routes, "currentSchoolClassIds = uniqueStrings([...currentSchoolClassIds, createdClassId, String(targetClass._id)]);");
  assertIncludes(files.routes, "...existingGroupIds.filter((id) => !currentSchoolClassIds.includes(id))");
  assertIncludes(files.routes, "GroupModel.updateMany(");
  assertIncludes(files.routes, '{ type: "CLASS", parentId: schoolId }');
  assertIncludes(files.routes, "$pull: { studentIds: { $in: studentIdAliases } }");
  assertIncludes(files.routes, "groupIds: [],");
  assertIncludes(files.routes, "UserModel.findByIdAndUpdate(student._id, { $set: { schoolId, groupIds: nextGroupIds } })");
  const relationsRouteIndex = files.routes.indexOf('"/schools/:id/relations"');
  const relationCleanupIndex = files.routes.indexOf('await GroupModel.updateMany(\n          { type: "CLASS", parentId: schoolId }', relationsRouteIndex);
  const relationAddIndex = files.routes.indexOf("GroupModel.findOneAndUpdate(buildDocumentQuery(classId), { $addToSet: { studentIds: studentId } })", relationsRouteIndex);
  if (relationsRouteIndex < 0 || relationCleanupIndex < 0 || relationAddIndex < 0 || relationCleanupIndex > relationAddIndex) {
    throw new Error("relations endpoint must clean old class memberships before adding the new class");
  }
});

check("school access codes attach students to the school roster", () => {
  assertIncludes(files.authRoutes, 'const schoolId = String(accessCode.schoolId || linkedPackage.schoolId || "").trim();');
  assertIncludes(files.authRoutes, 'if (schoolId && String(user.role || "") === "student") {');
  assertIncludes(files.authRoutes, 'UserModel.findByIdAndUpdate(user._id, {');
  assertIncludes(files.authRoutes, '$set: { schoolId },');
  assertIncludes(files.authRoutes, '$addToSet: { groupIds: schoolId },');
  assertIncludes(files.authRoutes, 'GroupModel.findOneAndUpdate(buildDocumentQuery(schoolId), {');
  assertIncludes(files.authRoutes, '$addToSet: { studentIds: String(user.id || user._id) },');
  assertIncludes(files.authRoutes, 'const schoolStudentCount = await UserModel.countDocuments({ schoolId, role: "student" });');
  assertIncludes(files.authRoutes, '$set: { totalStudents: schoolStudentCount },');
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));
if (failed.length) process.exit(1);
