import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const schoolPortal = read("dashboards/admin/SchoolPortalManager.tsx");
const adminDashboard = read("dashboards/admin/AdminDashboard.tsx");
const authContext = read("contexts/AuthContext.tsx");
const apiService = read("services/api.ts");
const notificationRoutes = read("server/src/routes/notification.routes.ts");
const packageJson = JSON.parse(read("package.json"));
const liveSupervisorSchoolAudit = read("scripts/live-supervisor-school-command-audit.mjs");
const liveExecutiveSnapshotAudit = read("scripts/live-supervisor-executive-snapshot-audit.mjs");
const supervisorScopeRepair = read("scripts/repair-live-supervisor-school-scope.mjs");

const checks = [
  {
    name: "school portal has a supervisor decision center",
    ok:
      schoolPortal.includes("مركز قرارات المشرف") &&
      schoolPortal.includes("ماذا أفعل الآن؟") &&
      schoolPortal.includes("أدوات سريعة للمتابعة اليومية"),
  },
  {
    name: "auth hydration preserves school and class scope for supervisors",
    ok:
      authContext.includes("schoolId: backendUser?.schoolId ?? existing.schoolId") &&
      authContext.includes("groupIds: backendUser?.groupIds ?? existing.groupIds") &&
      authContext.includes("isActive: backendUser?.isActive ?? existing.isActive"),
  },
  {
    name: "school portal supports daily operational actions",
    ok:
      schoolPortal.includes("openTargetedQuiz") &&
      schoolPortal.includes("openFollowUpEmail") &&
      schoolPortal.includes("copyFollowUpMessage") &&
      schoolPortal.includes("copySupervisorBrief") &&
      schoolPortal.includes("sendPriorityStudentAlerts") &&
      schoolPortal.includes("sendStudentFollowUpAlert") &&
      schoolPortal.includes("supervisor-send-priority-alerts") &&
      schoolPortal.includes("supervisor-send-student-alert") &&
      schoolPortal.includes("exportWatchList") &&
      schoolPortal.includes("actionFeedback"),
  },
  {
    name: "school portal opens school operations through dashboard state instead of manual history events",
    ok:
      schoolPortal.includes("onOpenSchoolOperations") &&
      schoolPortal.includes("openSchoolOperations") &&
      adminDashboard.includes("onOpenSchoolOperations={() => setActiveAdminTab('schools')}") &&
      !schoolPortal.includes("window.history.pushState(null, '', `${url.pathname}${url.search}`)") &&
      !schoolPortal.includes("new HashChangeEvent('hashchange')"),
  },
  {
    name: "student alerts are scoped from frontend api to backend rbac",
    ok:
      apiService.includes("sendStudentAlert") &&
      apiService.includes("/notifications/student-alert") &&
      notificationRoutes.includes("studentAlertSchema") &&
      notificationRoutes.includes('notificationRouter.post("/student-alert"') &&
      notificationRoutes.includes('requireRole(["admin", "supervisor", "teacher"])') &&
      notificationRoutes.includes("You do not have access to one or more students") &&
      notificationRoutes.includes("Student alert created for scoped student recipients."),
  },
  {
    name: "targeted quiz opens the quiz center with a scoped target group",
    ok:
      schoolPortal.includes("tab: 'quizzes'") &&
      schoolPortal.includes("mode: 'central'") &&
      schoolPortal.includes("targetGroupId") &&
      schoolPortal.includes("school-portal"),
  },
  {
    name: "admin dashboard syncs requested tab when hash changes",
    ok:
      adminDashboard.includes("syncRequestedTab") &&
      adminDashboard.includes("hashchange") &&
      adminDashboard.includes("getRequestedAdminTab") &&
      adminDashboard.includes("tabRequestVersion") &&
      adminDashboard.includes("key={`quizzes-${tabRequestVersion}`}"),
  },
  {
    name: "school portal report includes supervisor weekly plan",
    ok:
      schoolPortal.includes("supervisorWeeklyPlan") &&
      schoolPortal.includes("supervisorBrief") &&
      schoolPortal.includes("weekly-plan") &&
      schoolPortal.includes("supervisor-brief"),
  },
  {
    name: "school portal includes class action planning",
    ok:
      schoolPortal.includes("classActionPlan") &&
      schoolPortal.includes("exportClassActionPlan") &&
      schoolPortal.includes("class-action-plan") &&
      schoolPortal.includes("خطة متابعة الفصول") &&
      schoolPortal.includes("تصدير خطة الفصول"),
  },
  {
    name: "school portal includes weekly intervention planning",
    ok:
      schoolPortal.includes("interventionPlan") &&
      schoolPortal.includes("priorityIntervention") &&
      schoolPortal.includes("exportInterventionPlan") &&
      schoolPortal.includes("school-weekly-intervention-plan.xlsx") &&
      schoolPortal.includes("خطة التدخل الأسبوعية") &&
      schoolPortal.includes("تصدير خطة التدخل") &&
      schoolPortal.includes("intervention-summary"),
  },
  {
    name: "school portal gives an executive decision snapshot",
    ok:
      schoolPortal.includes("bestClassSnapshot") &&
      schoolPortal.includes("weakestClassSnapshot") &&
      schoolPortal.includes("sharedWeakSkillSnapshot") &&
      schoolPortal.includes("directedQuizSnapshots") &&
      schoolPortal.includes("createDecisionIntervention") &&
      schoolPortal.includes('data-testid="supervisor-executive-decision-snapshot"') &&
      schoolPortal.includes('data-testid="supervisor-issued-tests-panel"') &&
      schoolPortal.includes("لقطة قرار الإدارة") &&
      schoolPortal.includes("اختباراتي الموجهة ونتائجها") &&
      schoolPortal.includes("أفضل فصل") &&
      schoolPortal.includes("أضعف فصل") &&
      schoolPortal.includes("مهارة ضعيفة مشتركة") &&
      schoolPortal.includes("أنشئ تدخل علاجي"),
  },
  {
    name: "supervisor scope separates school managers from class-only supervisors",
    ok:
      schoolPortal.includes("schoolWideIds") &&
      schoolPortal.includes("classScopedIds") &&
      schoolPortal.includes("isSchoolWideSupervisor") &&
      schoolPortal.includes("isClassSupervisor") &&
      schoolPortal.includes("supervisorAccess") &&
      schoolPortal.includes('data-testid="supervisor-school-scope-card"') &&
      schoolPortal.includes('data-testid="supervisor-scope-action-guide"') &&
      schoolPortal.includes("مدير/مشرف مدرسة كاملة") &&
      schoolPortal.includes("مشرف فصل أو فصول محددة") &&
      schoolPortal.includes("فصول غير مسندة") &&
      !schoolPortal.includes("if (user.schoolId) {\n            schoolIds.add(user.schoolId);"),
  },
  {
    name: "school portal exposes package content scope for contracts",
    ok:
      schoolPortal.includes("packageContentTypeLabels") &&
      schoolPortal.includes("describePackageScope") &&
      schoolPortal.includes("المسارات:") &&
      schoolPortal.includes("المواد:") &&
      schoolPortal.includes("نطاق الوصول"),
  },
  {
    name: "supervisor school command center has a live visual audit",
    ok:
      packageJson.scripts["smoke:supervisor-school-live"] === "node scripts/live-supervisor-school-command-audit.mjs" &&
      liveSupervisorSchoolAudit.includes("VIEWPORTS") &&
      liveSupervisorSchoolAudit.includes('name: "mobile"') &&
      liveSupervisorSchoolAudit.includes("horizontalOverflow") &&
      liveSupervisorSchoolAudit.includes("/admin-dashboard?tab=school-portal") &&
      liveSupervisorSchoolAudit.includes("requireSupervisorScopeCard") &&
      liveSupervisorSchoolAudit.includes("hasSupervisorScopeCard") &&
      liveSupervisorSchoolAudit.includes("hasSupervisorScopeActionGuide") &&
      liveSupervisorSchoolAudit.includes("/reports") &&
      liveSupervisorSchoolAudit.includes("/admin-dashboard?tab=quizzes&source=school-portal&mode=central") &&
      liveSupervisorSchoolAudit.includes("actionControlCount") &&
      liveSupervisorSchoolAudit.includes("missingTextGroups"),
  },
  {
    name: "executive snapshot has a dedicated live action audit",
    ok:
      packageJson.scripts["smoke:supervisor-executive-snapshot-live"] === "node scripts/live-supervisor-executive-snapshot-audit.mjs" &&
      packageJson.scripts["repair:supervisor-school-scope"] === "node scripts/repair-live-supervisor-school-scope.mjs" &&
      packageJson.scripts["smoke:goal-live-core"].includes("smoke:supervisor-executive-snapshot-live") &&
      liveExecutiveSnapshotAudit.includes("ALLOW_ADMIN_FALLBACK") &&
      liveExecutiveSnapshotAudit.includes('candidate.role === "admin" && !ALLOW_ADMIN_FALLBACK') &&
      liveExecutiveSnapshotAudit.includes('[data-testid="supervisor-executive-decision-snapshot"]') &&
      liveExecutiveSnapshotAudit.includes('[data-testid="supervisor-best-class"]') &&
      liveExecutiveSnapshotAudit.includes('[data-testid="supervisor-weakest-class"]') &&
      liveExecutiveSnapshotAudit.includes('[data-testid="supervisor-shared-weak-skill"]') &&
      liveExecutiveSnapshotAudit.includes("intent=intervention") &&
      liveExecutiveSnapshotAudit.includes("horizontalOverflow") &&
      supervisorScopeRepair.includes("supervisor.school@almeaa.local") &&
      supervisorScopeRepair.includes("supervisor.group@almeaa.local") &&
      supervisorScopeRepair.includes("repair:supervisor-school-scope") === false &&
      supervisorScopeRepair.includes("/content/groups") &&
      supervisorScopeRepair.includes("/auth/admin/users/"),
  },
  {
    name: "announcement ads have a live preview path",
    ok:
      read("components/AnnouncementAdsOverlay.tsx").includes("ANNOUNCEMENT_AD_PREVIEW_EVENT") &&
      read("components/AnnouncementAdsOverlay.tsx").includes("previewAdId") &&
      read("dashboards/admin/AnnouncementAdsManager.tsx").includes("معاينة على الموقع الآن"),
  },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length) {
  console.error("School portal command center contract failed:");
  failures.forEach((failure) => console.error(`- ${failure.name}`));
  process.exit(1);
}

console.log(`School portal command center contract passed (${checks.length} checks).`);
