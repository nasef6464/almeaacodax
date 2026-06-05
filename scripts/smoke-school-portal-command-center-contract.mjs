import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const schoolPortal = read("dashboards/admin/SchoolPortalManager.tsx");
const adminDashboard = read("dashboards/admin/AdminDashboard.tsx");
const packageJson = JSON.parse(read("package.json"));
const liveSupervisorSchoolAudit = read("scripts/live-supervisor-school-command-audit.mjs");
const liveExecutiveSnapshotAudit = read("scripts/live-supervisor-executive-snapshot-audit.mjs");

const checks = [
  {
    name: "school portal has a supervisor decision center",
    ok:
      schoolPortal.includes("مركز قرارات المشرف") &&
      schoolPortal.includes("ماذا أفعل الآن؟") &&
      schoolPortal.includes("أدوات سريعة للمتابعة اليومية"),
  },
  {
    name: "school portal supports daily operational actions",
    ok:
      schoolPortal.includes("openTargetedQuiz") &&
      schoolPortal.includes("openFollowUpEmail") &&
      schoolPortal.includes("copyFollowUpMessage") &&
      schoolPortal.includes("copySupervisorBrief") &&
      schoolPortal.includes("exportWatchList") &&
      schoolPortal.includes("actionFeedback"),
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
      schoolPortal.includes("createDecisionIntervention") &&
      schoolPortal.includes('data-testid="supervisor-executive-decision-snapshot"') &&
      schoolPortal.includes("لقطة قرار الإدارة") &&
      schoolPortal.includes("أفضل فصل") &&
      schoolPortal.includes("أضعف فصل") &&
      schoolPortal.includes("مهارة ضعيفة مشتركة") &&
      schoolPortal.includes("أنشئ تدخل علاجي"),
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
      liveSupervisorSchoolAudit.includes("/reports") &&
      liveSupervisorSchoolAudit.includes("/admin-dashboard?tab=quizzes&source=school-portal&mode=central") &&
      liveSupervisorSchoolAudit.includes("actionControlCount") &&
      liveSupervisorSchoolAudit.includes("missingTextGroups"),
  },
  {
    name: "executive snapshot has a dedicated live action audit",
    ok:
      packageJson.scripts["smoke:supervisor-executive-snapshot-live"] === "node scripts/live-supervisor-executive-snapshot-audit.mjs" &&
      packageJson.scripts["smoke:goal-live-core"].includes("smoke:supervisor-executive-snapshot-live") &&
      liveExecutiveSnapshotAudit.includes('[data-testid="supervisor-executive-decision-snapshot"]') &&
      liveExecutiveSnapshotAudit.includes('[data-testid="supervisor-best-class"]') &&
      liveExecutiveSnapshotAudit.includes('[data-testid="supervisor-weakest-class"]') &&
      liveExecutiveSnapshotAudit.includes('[data-testid="supervisor-shared-weak-skill"]') &&
      liveExecutiveSnapshotAudit.includes("intent=intervention") &&
      liveExecutiveSnapshotAudit.includes("horizontalOverflow"),
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
