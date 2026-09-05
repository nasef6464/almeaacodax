import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const dashboard = await read("dashboards/admin/SupervisorDashboard.tsx");
const testsManager = await read("dashboards/admin/SupervisorTestsManager.tsx");
const assessmentScope = await read("dashboards/admin/supervisorTests/useSupervisorAssessmentScope.ts");
const detailPanel = await read("dashboards/admin/AssignedTestDetailPanel.tsx");
const notificationRoutes = await read("server/src/routes/notification.routes.ts");
const quizzesPage = await read("pages/Quizzes.tsx");
const quizPage = await read("pages/QuizPage.tsx");
const quizBuilder = await read("dashboards/admin/UnifiedQuizBuilder.tsx");
const quizModel = await read("server/src/models/Quiz.ts");
const quizzesApi = await read("services/apiGroups/quizzesApi.ts");
const quizRoutes = await read("server/src/routes/quiz.routes.ts");

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
  if (!source.includes(fragment)) {
    throw new Error(message || `Missing fragment: ${fragment}`);
  }
}

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) {
    throw new Error(message || `Unexpected fragment: ${fragment}`);
  }
}

check("supervisor overview has a compact command center", () => {
  assertIncludes(dashboard, "متوسط الدرجات");
  assertIncludes(dashboard, "متابعة الطلاب");
  assertIncludes(dashboard, "أضعف المهارات");
  assertIncludes(dashboard, "الفصول");
});

check("supervisor command center has quick workflow actions", () => {
  assertIncludes(dashboard, "reports");
  assertIncludes(dashboard, "sendWeeklyFollowUpAlert");
  assertIncludes(dashboard, "school-portal");
});

check("supervisor analytics are scoped and derived from owned groups/students", () => {
  assertIncludes(dashboard, "scopedStudentIdSet");
  assertIncludes(dashboard, "scopedResults");
  assertIncludes(dashboard, "studentsNeedingFollowUp");
  assertIncludes(dashboard, "weakestSkills");
  assertIncludes(dashboard, "groupSnapshots");
});

check("supervisor weak-student center has scoped filters and real actions", () => {
  assertIncludes(dashboard, "schoolFilter");
  assertIncludes(dashboard, "classFilter");
  assertIncludes(dashboard, "statusFilter");
  assertIncludes(dashboard, "visibleWeakStudents");
  assertIncludes(dashboard, "sendStudentFollowUpAlert");
  assertIncludes(dashboard, "api.sendStudentAlert");
  assertIncludes(dashboard, "apiService.sendStudentAlert");
  assertNotIncludes(dashboard, "apiService.sendNotifications");
  assertIncludes(dashboard, "openStudentReport");
});

check("supervisor quick decision board exposes weekly decision metrics and alert", () => {
  assertIncludes(dashboard, 'data-testid="supervisor-quick-decision-board"');
  assertIncludes(dashboard, "improvedStudentsCount");
  assertIncludes(dashboard, "pendingFollowUpCount");
  assertIncludes(dashboard, "sendWeeklyFollowUpAlert");
  assertIncludes(dashboard, "إرسال تنبيه أسبوعي");
});

check("directed assessment manager includes explicit student targets in scope and analytics", () => {
  assertIncludes(testsManager, "useSupervisorAssessmentScope");
  assertIncludes(assessmentScope, "explicitUserIds");
  assertIncludes(assessmentScope, "quiz.targetUserIds");
  assertIncludes(assessmentScope, "scopedStudents");
  assertIncludes(assessmentScope, "latestResultByStudent");
  assertIncludes(assessmentScope, "targetStudentIds");
});

check("supervisor assessment messages use scoped student alert rather than admin-only sender", () => {
  assertIncludes(testsManager, "api.sendStudentAlert");
  assertNotIncludes(testsManager, "api.sendNotifications");
  assertIncludes(notificationRoutes, 'notificationRouter.post("/student-alert"');
  assertIncludes(notificationRoutes, 'requireRole(["admin", "supervisor", "teacher"])');
  assertIncludes(notificationRoutes, 'channels: ["in_app"]');
  assertIncludes(quizModel, 'supervisorMessage: { type: String, default: null }');
});

check("directed assessment builder preserves an immediately selected audience on save", () => {
  assertIncludes(quizBuilder, "const targetGroupIdsRef = useRef<string[]>(initialTargetGroups);");
  assertIncludes(quizBuilder, "targetGroupIdsRef.current = next;");
  assertIncludes(quizBuilder, "targetGroupIds: targetGroupIdsRef.current");
});

check("post-test workflow supports weak and absent student follow-up", () => {
  assertIncludes(detailPanel, 'StudentFilter = "all" | "needs-support" | "absent"');
  assertIncludes(detailPanel, "needsSupportStudents");
  assertIncludes(detailPanel, "إعادة توجيه");
  assertIncludes(detailPanel, "لم يؤدوا");
  assertIncludes(testsManager, "onAssignToStudent");
});

check("student directed assessment entry delegates group membership authority to the protected detail API", () => {
  assertIncludes(quizzesPage, "directedQuizzes");
  assertIncludes(quizzesPage, "الاختبارات المدرسية");
  assertIncludes(quizzesApi, "getQuiz: (id: string, token?: string | null)");
  assertIncludes(quizzesApi, "encodeURIComponent(id)");
  assertIncludes(quizPage, "api.getQuiz(foundQuiz.id)");
  assertIncludes(quizPage, "status: 'checking'");
  assertIncludes(quizPage, "directedStatus === 'denied'");
  assertNotIncludes(quizPage, "targetGroupIds.length > 0 && targetGroupIds.some((id) => userGroups.includes(id))");
  assertIncludes(quizRoutes, "const resolveDirectedQuizReadAccess = async");
  assertIncludes(quizRoutes, "GroupModel.findOne");
  assertIncludes(quizRoutes, "const directedReadAccess = await resolveDirectedQuizReadAccess(legacyQuiz, req.authUser);");
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));

if (failed.length > 0) {
  process.exit(1);
}