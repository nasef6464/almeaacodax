import { readFile } from 'node:fs/promises';

const reportsSource = [
  await readFile(new URL('../pages/Reports.tsx', import.meta.url), 'utf8'),
  await readFile(new URL('../pages/Reports/reportDomain.ts', import.meta.url), 'utf8'),
  await readFile(new URL('../pages/Reports/recommendationViewModel.ts', import.meta.url), 'utf8'),
  await readFile(new URL('../pages/Reports/reportTypes.ts', import.meta.url), 'utf8'),
].join('\n');
const dashboardSource = await readFile(new URL('../pages/Dashboard.tsx', import.meta.url), 'utf8');
const quizRoutesSource = await readFile(new URL('../server/src/routes/quiz.routes.ts', import.meta.url), 'utf8');
const notificationRoutesSource = await readFile(new URL('../server/src/routes/notification.routes.ts', import.meta.url), 'utf8');
const contentRoutesSource = await readFile(new URL('../server/src/routes/content.routes.ts', import.meta.url), 'utf8');
const apiSource = await readFile(new URL('../services/api.ts', import.meta.url), 'utf8');

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
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

check('reports load scoped analytics and scoped quiz results for non-student roles', () => {
  assertIncludes(reportsSource, 'api.getQuizAnalyticsOverview()');
  assertIncludes(reportsSource, 'api.getScopedQuizResults()');
  assertIncludes(apiSource, 'getQuizAnalyticsOverview');
  assertIncludes(apiSource, 'getScopedQuizResults');
  assertIncludes(quizRoutesSource, '"/analytics/overview"');
  assertIncludes(quizRoutesSource, '"/results/scoped"');
});

check('student report starts simple and keeps details opt-in', () => {
  assertIncludes(reportsSource, "import { StudentNextActionStrip } from '../components/StudentNextActionStrip'");
  assertIncludes(reportsSource, 'studentReportNextAction');
  assertIncludes(reportsSource, 'فتح موضوع التأسيس');
  assertIncludes(reportsSource, 'اختبار ساهر');
  assertIncludes(reportsSource, "const [studentReportDepth, setStudentReportDepth] = useState<'simple' | 'full'>('simple')");
  assertIncludes(reportsSource, "const isStudentReportFull = studentReportDepth === 'full'");
  assertIncludes(reportsSource, "onClick={() => setStudentReportDepth('full')}");
  assertIncludes(reportsSource, "{!isStudentReportFull ? (");
  assertIncludes(reportsSource, "isStudentReportFull ? (");
  assertIncludes(reportsSource, 'تقرير مبسط للطالب');
  assertIncludes(reportsSource, 'خطوة واحدة واضحة اليوم');
});

check('student report shows the quick decision card instead of hiding it behind staff-only scope', () => {
  assertIncludes(reportsSource, '(isStudentView ? hasStudentAnalytics : true) ? (');
  assertIncludes(reportsSource, 'studentFollowUpSummary ||');
  assertIncludes(reportsSource, 'copyStudentSummary');
  assertIncludes(reportsSource, 'shareStudentSummary');
});

check('student skill performance report is explicitly driven by quiz answers and evidence', () => {
  assertIncludes(reportsSource, 'تقرير أداء المهارات من الاختبارات');
  assertIncludes(reportsSource, 'القياس مبني على {studentEvidenceSummary.totalQuestions} سؤال');
  assertIncludes(reportsSource, 'نرتب المهارات من الأضعف للأقوى بناءً على الأسئلة التي حللتها في كل اختبار');
  assertIncludes(reportsSource, 'skill.totalEvidence');
  assertIncludes(reportsSource, 'skill.correctAttempts');
});

check('student skill report bridges weak quiz skills into relearning, adaptive training, and smart path', () => {
  assertIncludes(reportsSource, 'const studentAdaptiveLearningBridge = useMemo');
  assertIncludes(reportsSource, 'إعادة التعلم والتعلم التكيفي');
  assertIncludes(reportsSource, 'إعادة تعلم قصيرة، تدريب تكيفي، ثم قياس جديد داخل المسار الذكي.');
  assertIncludes(reportsSource, 'studentAdaptiveLearningBridge.adaptiveTrainingLink');
  assertIncludes(reportsSource, 'studentAdaptiveLearningBridge.smartPathLink');
  assertIncludes(reportsSource, 'studentAdaptiveLearningBridge.retestLink');
  assertIncludes(reportsSource, 'قياس جديد');
});

check('student report links weak skills to lesson, quiz, plan, and exports', () => {
  assertIncludes(reportsSource, 'getSkillRecommendation(selectedReportSkill');
  assertIncludes(reportsSource, 'lessonLink');
  assertIncludes(reportsSource, 'quizLink');
  assertIncludes(reportsSource, 'downloadStudentSkillsWorkbook');
  assertIncludes(reportsSource, 'downloadStudentAttemptsWorkbook');
  assertIncludes(reportsSource, 'to="/plan"');
});

check('report action buttons have stable live-audit selectors', () => {
  for (const testId of [
    'student-report-export-pdf',
    'student-report-export-excel',
    'student-report-depth-toggle',
    'parent-report-copy',
    'parent-report-share',
    'parent-report-pdf',
    'staff-intervention-create',
    'staff-management-export',
    'staff-intervention-alert-send',
    'staff-students-export',
    'directed-quiz-analysis-export',
  ]) {
    assertIncludes(reportsSource, `data-testid="${testId}"`);
  }
});

check('student therapeutic report keeps a short weekly loop with direct actions', () => {
  assertIncludes(reportsSource, 'const studentWeeklyPlan = useMemo');
  assertIncludes(reportsSource, 'const studentTodayFocus = studentWeeklyPlan[0] || null');
  assertIncludes(reportsSource, 'const studentQuickActions = useMemo');
  assertIncludes(reportsSource, 'راجع الشرح');
  assertIncludes(reportsSource, 'حل تدريب قصير');
  assertIncludes(reportsSource, 'أعد القياس');
  assertIncludes(reportsSource, 'studentFollowUpSummary');
  assertIncludes(reportsSource, 'copyStudentSummary');
  assertIncludes(reportsSource, 'shareStudentSummary');
});

check('student compact report is period-based and prints the simple skill rows', () => {
  assertIncludes(reportsSource, "const [studentReportPeriod, setStudentReportPeriod] = useState<StudentReportPeriod>('month')");
  assertIncludes(reportsSource, 'studentPeriodExamResults');
  assertIncludes(reportsSource, 'compactStudentSkillRows');
  assertIncludes(reportsSource, 'studentPrintableSkillRows');
});

check('student weak-skill actions open the linked foundation topic first', () => {
  assertIncludes(reportsSource, "const buildFoundationTopicLink = (content: 'lessons' | 'quizzes')");
  assertIncludes(reportsSource, 'scoredFoundationTopics');
  assertIncludes(reportsSource, 'foundationTopicLink');
  assertIncludes(reportsSource, "const lessonLink = buildFoundationTopicLink('lessons')");
  assertIncludes(reportsSource, "params.set('tab', 'skills')");
  assertIncludes(reportsSource, "params.set('content', content)");
  assertIncludes(reportsSource, 'const foundationTrainingLink = recommendedTopic');
  assertIncludes(reportsSource, "relearnLink: studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink || '/courses'");
  assertIncludes(reportsSource, "quizLink: foundationTrainingLink || (recommendedQuiz?.id ? `/quiz/${recommendedQuiz.id}` : undefined)");
});

check('student smart remediation uses AI with a local fallback plan', () => {
  assertIncludes(reportsSource, 'const buildSmartRemediation = async () =>');
  assertIncludes(reportsSource, 'api.aiRemediationPlan');
  assertIncludes(reportsSource, 'skills: focusedReportSkills.slice(0, 5)');
  assertIncludes(reportsSource, 'setSmartRemediation({');
  assertIncludes(reportsSource, 'خطة علاجية قصيرة');
  assertIncludes(reportsSource, 'parentNote');
});

check('parent report stays brief with copied/shared/PDF summary and practical actions', () => {
  assertIncludes(reportsSource, 'if (user?.role === Role.PARENT)');
  assertIncludes(reportsSource, 'parentBriefSummary');
  assertIncludes(reportsSource, 'const copyParentBriefSummary = async () =>');
  assertIncludes(reportsSource, 'await navigator.clipboard.writeText(parentBriefSummary)');
  assertIncludes(reportsSource, 'const shareParentBriefSummary = async () =>');
  assertIncludes(reportsSource, "await shareTextSummary('ملخص ولي الأمر', parentBriefSummary)");
  assertIncludes(reportsSource, 'parentActionItems');
  assertIncludes(reportsSource, 'parentSkillActions');
  assertIncludes(reportsSource, "printElementAsPdf('reports-print-area',");
  assertIncludes(reportsSource, 'copyScopedSummary');
  assertIncludes(reportsSource, 'shareScopedSummary');
});

check('parent report links the weakest skill to lesson, training, and measurement', () => {
  assertIncludes(reportsSource, 'const parentWeakSkillRecommendation = getSkillRecommendation');
  assertIncludes(reportsSource, 'فتح الشرح');
  assertIncludes(reportsSource, 'بدء تدريب');
  assertIncludes(reportsSource, 'حصة علاجية');
  assertIncludes(reportsSource, 'الخطوة العملية: شرح قصير، تدريب بسيط، ثم إعادة قياس هادئة.');
});

check('parent and staff reports explain skill weakness as quiz evidence inside the allowed scope', () => {
  assertIncludes(reportsSource, 'تقرير مهارة من الاختبارات');
  assertIncludes(reportsSource, 'ظهر الضعف من ${weakSkill.attempts} إجابات');
  assertIncludes(reportsSource, 'تقرير مهارات الاختبارات');
  assertIncludes(reportsSource, 'مرتبة من نتائج الاختبارات داخل نطاق دورك فقط.');
  assertIncludes(reportsSource, 'دليل الاختبار: الحكم يظهر بعد');
});

check('admin, supervisor, and teacher reports expose separate skills and students reports with export', () => {
  assertIncludes(reportsSource, '!isStudentView && (');
  assertIncludes(reportsSource, 'scopedSkillReportCards');
  assertIncludes(reportsSource, 'scopedStudentFocusCards');
  assertIncludes(reportsSource, 'scopedGroupPerformanceRows');
  assertIncludes(reportsSource, 'scopedTeacherPerformanceRows');
  assertIncludes(reportsSource, 'data-testid="staff-comparison-report"');
  assertIncludes(reportsSource, 'مقارنة الفصول');
  assertIncludes(reportsSource, 'مقارنة المعلمين');
  assertIncludes(reportsSource, 'weakestScopedGroup');
  assertIncludes(reportsSource, 'strongestScopedGroup');
  assertIncludes(reportsSource, 'buildScopedSmartRemediation');
  assertIncludes(reportsSource, 'groupRows');
  assertIncludes(reportsSource, "XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(groupRows), 'groups')");
  assertIncludes(reportsSource, "XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(teacherRows), 'teachers')");
  assertIncludes(reportsSource, 'minSkillEvidence?: number');
  assertIncludes(reportsSource, 'earlyWeakSkillSignalCount?: number');
  assertIncludes(reportsSource, 'يتم عرض المهارات الضعيفة المؤكدة فقط بعد');
  assertIncludes(reportsSource, 'downloadScopedSkillsWorkbook');
  assertIncludes(reportsSource, 'downloadScopedStudentsWorkbook');
  assertIncludes(reportsSource, 'scopedInterventionPlan');
  assertIncludes(reportsSource, 'followUpLink: buildDirectedQuizManagerLink');
  assertIncludes(reportsSource, 'targetUserId: student.id');
  assertIncludes(reportsSource, 'targetGroupId: student.groupIds?.[0]');
  assertIncludes(reportsSource, 'student.groupNames?.length');
  assertIncludes(reportsSource, 'to={student.followUpLink}');
  assertIncludes(reportsSource, 'subjectId: subject.subjectId');
  assertIncludes(reportsSource, 'targetGroupId: scopedLeadStudent?.groupIds?.[0]');
  assertIncludes(reportsSource, 'const attemptFollowUpLink = buildDirectedQuizManagerLink');
  assertIncludes(reportsSource, 'targetUserId: result.userId || attemptStudent?.id');
  assertIncludes(reportsSource, 'اختبار متابعة');
  assertIncludes(reportsSource, 'const targetUserCount = quiz.targetUserIds?.length || 0');
  assertIncludes(reportsSource, 'const targetGroupCount = quiz.targetGroupIds?.length || 0');
  assertIncludes(reportsSource, 'موجه إلى: {targetLabel}');
});

check('supervisor can analyze and export a specific directed quiz by students and skills', () => {
  assertIncludes(reportsSource, "const [selectedFollowUpQuizId, setSelectedFollowUpQuizId] = useState<string>('all')");
  assertIncludes(reportsSource, 'const directedFollowUpOptions = useMemo');
  assertIncludes(reportsSource, "return mode === 'central' || hasTargets");
  assertIncludes(reportsSource, 'const directedQuizAnalysisResults = useMemo');
  assertIncludes(reportsSource, 'const directedQuizSkillAnalysis = useMemo');
  assertIncludes(reportsSource, 'const directedQuizStudentAnalysis = useMemo');
  assertIncludes(reportsSource, 'const downloadDirectedQuizAnalysisWorkbook = async () =>');
  assertIncludes(reportsSource, 'تحليل اختبار موجه');
  assertIncludes(reportsSource, 'نتائج الطلاب والمهارات لنفس الاختبار');
  assertIncludes(reportsSource, 'تصدير تحليل الاختبار');
  assertIncludes(reportsSource, 'directed-quiz-analysis-');
});

check('staff reports can send a real intervention alert to linked parent and supervisor recipients', () => {
  assertIncludes(reportsSource, 'sendInterventionAlert');
  assertIncludes(reportsSource, 'canSendInterventionAlert');
  assertIncludes(reportsSource, 'إرسال تنبيه');
  assertIncludes(apiSource, 'sendInterventionAlert');
  assertIncludes(apiSource, '"/notifications/intervention-alert"');
  assertIncludes(notificationRoutesSource, 'notificationRouter.post("/intervention-alert"');
  assertIncludes(notificationRoutesSource, 'requireRole(["admin", "supervisor", "teacher"])');
  assertIncludes(notificationRoutesSource, 'linkedStudentIds: studentId');
  assertIncludes(notificationRoutesSource, 'supervisorIds');
  assertIncludes(notificationRoutesSource, 'createNotificationDeliveries');
});

check('staff scoped reports keep intervention plan, summary, and smart remediation', () => {
  assertIncludes(reportsSource, 'const scopedInterventionPlan = useMemo');
  assertIncludes(reportsSource, 'ابدأ بالمهارة الأكثر احتياجًا');
  assertIncludes(reportsSource, 'تابع الطالب الأكثر احتياجًا');
  assertIncludes(reportsSource, 'حوّلها لمسار تعلم تكيفي');
  assertIncludes(reportsSource, 'تدريبًا تكيفيًا');
  assertIncludes(reportsSource, 'const scopedFollowUpSummary = useMemo');
  assertIncludes(reportsSource, 'const buildScopedSmartRemediation = async () =>');
  assertIncludes(reportsSource, 'const skillPayload = scopedAnalytics.weakestSkills.slice(0, 5)');
  assertIncludes(reportsSource, 'api.createInterventionStudyPlan');
  assertIncludes(reportsSource, 'تم إنشاء خطة علاج داخل حساب الطالب المحدد');
  assertIncludes(apiSource, 'createInterventionStudyPlan');
  assertIncludes(apiSource, '"/content/study-plans/intervention"');
  assertIncludes(contentRoutesSource, '"/study-plans/intervention"');
  assertIncludes(contentRoutesSource, 'requireRole(["admin", "supervisor", "teacher"])');
  assertIncludes(contentRoutesSource, 'userId: studentId');
  assertIncludes(reportsSource, 'خطة تدخل للنطاق الحالي');
});

check('server analytics scopes reports by role before returning weak skills and students', () => {
  assertIncludes(quizRoutesSource, 'authUser.role === "admin"');
  assertIncludes(quizRoutesSource, 'authUser.role === "teacher" || authUser.role === "supervisor"');
  assertIncludes(quizRoutesSource, 'const resolveSupervisorSchoolReportScope = async');
  assertIncludes(quizRoutesSource, 'GroupModel.find({ type: "SCHOOL", supervisorIds: String(authUser.id || authUser._id || "") })');
  assertIncludes(quizRoutesSource, 'const childScopedGroups = scopedSchoolIds.length');
  assertIncludes(quizRoutesSource, 'scopeFilters.push({ schoolId: { $in: scopedSchoolIds } })');
  assertIncludes(quizRoutesSource, 'authUser.role === "parent"');
  assertIncludes(quizRoutesSource, 'linkedStudentIds');
  assertIncludes(quizRoutesSource, 'matchesManagedScope');
  assertIncludes(quizRoutesSource, 'const MIN_ANALYTICS_SKILL_EVIDENCE_COUNT = 3;');
  assertIncludes(quizRoutesSource, '.filter((item) => item.attempts >= MIN_ANALYTICS_SKILL_EVIDENCE_COUNT)');
  assertIncludes(quizRoutesSource, 'earlyWeakSkillSignalCount');
  assertIncludes(quizRoutesSource, 'minSkillEvidence: MIN_ANALYTICS_SKILL_EVIDENCE_COUNT');
  assertPattern(quizRoutesSource, /weakestStudents[\s\S]*weakestSkills[\s\S]*subjectSummaries/, 'analytics response should include students, skills, and subjects');
});

check('dashboard keeps parent report tabs separate from student report tabs', () => {
  assertIncludes(dashboardSource, "const isParentDashboard = user.role === Role.PARENT");
  assertIncludes(dashboardSource, "parent-results");
  assertIncludes(dashboardSource, "parent-skills");
  assertIncludes(dashboardSource, "case 'reports': return <Suspense fallback={<TabLoading />}><Reports /></Suspense>;");
});

for (const item of checks) {
  console.log(`${item.status} ${item.name}${item.details ? ` - ${item.details}` : ''}`);
}

const failed = checks.filter((item) => item.status === 'FAIL');
if (failed.length > 0) {
  console.error(`\n${failed.length} reports role contract smoke check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} reports role contract smoke checks passed.`);
