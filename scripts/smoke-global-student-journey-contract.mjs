import { readFile } from 'node:fs/promises';

const files = {
  packageJson: await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  dashboard: await readFile(new URL('../pages/Dashboard.tsx', import.meta.url), 'utf8'),
  studentNextAction: await readFile(new URL('../components/StudentNextActionStrip.tsx', import.meta.url), 'utf8'),
  emptyState: await readFile(new URL('../components/ui/EmptyState.tsx', import.meta.url), 'utf8'),
  subjectLearning: await readFile(new URL('../pages/SubjectLearningPage.tsx', import.meta.url), 'utf8'),
  quizzes: await readFile(new URL('../pages/Quizzes.tsx', import.meta.url), 'utf8'),
  reports: await readFile(new URL('../pages/Reports.tsx', import.meta.url), 'utf8'),
  plan: await readFile(new URL('../pages/Plan.tsx', import.meta.url), 'utf8'),
  landing: await readFile(new URL('../pages/Landing.tsx', import.meta.url), 'utf8'),
  adminDashboard: await readFile(new URL('../dashboards/admin/AdminDashboard.tsx', import.meta.url), 'utf8'),
  notificationRoutes: await readFile(new URL('../server/src/routes/notification.routes.ts', import.meta.url), 'utf8'),
  roleAudit: await readFile(new URL('../scripts/live-role-pages-audit.mjs', import.meta.url), 'utf8'),
  studentJourney: await readFile(new URL('../scripts/smoke-student-learning-journey.mjs', import.meta.url), 'utf8'),
  reportsContract: await readFile(new URL('../scripts/smoke-reports-role-contract.mjs', import.meta.url), 'utf8'),
};

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

function assertAnyIncludes(source, fragments, message) {
  if (!fragments.some((fragment) => source.includes(fragment))) {
    throw new Error(message || `Missing one of: ${fragments.join(' | ')}`);
  }
}

function assertPattern(source, pattern, message) {
  if (!pattern.test(source)) {
    throw new Error(message || `Missing pattern: ${pattern}`);
  }
}

check('student dashboard keeps one clear continuation area and learner shortcuts', () => {
  assertIncludes(files.dashboard, 'StudentNextActionStrip');
  assertIncludes(files.dashboard, 'smartAction.buttonText');
  assertIncludes(files.dashboard, 'smartAction.link');
  assertIncludes(files.dashboard, "setActiveTab('saher')");
  assertIncludes(files.dashboard, "setActiveTab('quizzes')");
  assertIncludes(files.dashboard, "setActiveTab('reports')");
  assertIncludes(files.dashboard, "setActiveTab('plan')");
  assertAnyIncludes(files.dashboard, ['آخر الأنشطة', 'Ø¢Ø®Ø± Ø§Ù„Ø£Ù†Ø´Ø·Ø©']);
});

check('student next action strip is compact, reusable, and has one primary action', () => {
  assertIncludes(files.studentNextAction, 'StudentNextActionStripProps');
  assertIncludes(files.studentNextAction, 'خطوتك التالية');
  assertIncludes(files.studentNextAction, 'primaryLabel');
  assertIncludes(files.studentNextAction, 'primaryHref');
  assertIncludes(files.studentNextAction, 'secondaryLabel');
  assertIncludes(files.studentNextAction, 'secondaryHref');
  assertIncludes(files.studentNextAction, 'aria-labelledby="student-next-action-title"');
});

check('student empty states use one compact design system pattern', () => {
  assertIncludes(files.emptyState, 'EmptyStateProps');
  assertIncludes(files.emptyState, 'primaryAction');
  assertIncludes(files.emptyState, 'secondaryAction');
  assertIncludes(files.emptyState, "tone?: 'indigo' | 'amber' | 'emerald' | 'slate'");
  assertIncludes(files.reports, "import { EmptyState } from '../components/ui/EmptyState'");
  assertIncludes(files.quizzes, "import { EmptyState } from '../components/ui/EmptyState'");
  assertIncludes(files.subjectLearning, "import { EmptyState } from '../components/ui/EmptyState'");
  assertIncludes(files.reports, 'تقريرك يبدأ بعد أول قياس');
  assertIncludes(files.quizzes, 'اختبار واحد يكفي للبداية');
  assertIncludes(files.subjectLearning, 'لا توجد موضوعات تأسيسية الآن');
});

check('subject learning page guides foundation, training, tests, and package recovery', () => {
  assertIncludes(files.subjectLearning, 'StudentNextActionStrip');
  assertIncludes(files.subjectLearning, 'subjectNextAction');
  assertIncludes(files.subjectLearning, "tab: 'skills'");
  assertIncludes(files.subjectLearning, "slot: 'training'");
  assertIncludes(files.subjectLearning, 'openPackageTab');
  assertIncludes(files.subjectLearning, 'buildQuizPathWithReturn');
  assertAnyIncludes(files.subjectLearning, ['تأسيس', 'ØªØ£Ø³ÙŠØ³']);
  assertAnyIncludes(files.subjectLearning, ['التدريب', 'Ø§Ù„ØªØ¯Ø±ÙŠØ¨']);
  assertAnyIncludes(files.subjectLearning, ['الاختبارات المحاكية', 'Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø­Ø§ÙƒÙŠØ©']);
  assertAnyIncludes(files.subjectLearning, ['عرض الباقات المناسبة', 'Ø¹Ø±Ø¶ Ø§Ù„Ø¨Ø§Ù‚Ø§Øª Ø§Ù„Ù…Ù†Ø§Ø³Ø¨Ø©']);
});

check('quiz center separates self Saher, directed tests, history, and weak-skill recommendations', () => {
  assertIncludes(files.quizzes, 'StudentNextActionStrip');
  assertIncludes(files.quizzes, 'quizCenterNextAction');
  assertIncludes(files.quizzes, 'directedQuizzes');
  assertIncludes(files.quizzes, 'saherQuizzes');
  assertIncludes(files.quizzes, 'weakSkillRecommendations');
  assertIncludes(files.quizzes, 'recommendedQuiz');
  assertIncludes(files.quizzes, 'ابدأ بمهارة:');
  assertIncludes(files.quizzes, 'افتح التحليل');
  assertIncludes(files.quizzes, '/dashboard?tab=quizzes');
  assertAnyIncludes(files.quizzes, ['اختبار ساهر الذاتي', 'Ø§Ø®ØªØ¨Ø§Ø± Ø³Ø§Ù‡Ø± Ø§Ù„Ø°Ø§ØªÙŠ']);
  assertAnyIncludes(files.quizzes, ['اختبارات موجهة لك', 'Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ù…ÙˆØ¬Ù‡Ø© Ù„Ùƒ']);
});

check('student report remains simple first and exposes retest/remediation actions', () => {
  assertIncludes(files.reports, "import { StudentNextActionStrip } from '../components/StudentNextActionStrip'");
  assertIncludes(files.reports, 'studentReportNextAction');
  assertIncludes(files.reports, 'فتح موضوع التأسيس');
  assertIncludes(files.reports, 'اختبار ساهر');
  assertIncludes(files.reports, "useState<'simple' | 'full'>('simple')");
  assertIncludes(files.reports, 'studentQuickActions');
  assertIncludes(files.reports, 'studentTodayFocus');
  assertIncludes(files.reports, 'studentAdaptiveLearningBridge');
  assertIncludes(files.reports, 'studentReportPeriod');
  assertIncludes(files.reports, 'compactStudentSkillRows');
  assertIncludes(files.reports, 'buildFoundationTopicLink');
  assertIncludes(files.reports, 'scoredFoundationTopics');
  assertIncludes(files.reports, 'foundationTopicLink');
  assertIncludes(files.reports, "const lessonLink = buildFoundationTopicLink('lessons')");
  assertIncludes(files.reports, "params.set('content', content)");
  assertIncludes(files.reports, 'retestLink');
  assertIncludes(files.reports, 'downloadStudentSkillsWorkbook');
  assertAnyIncludes(files.reports, ['خطوة واحدة واضحة اليوم', 'Ø®Ø·ÙˆØ© ÙˆØ§Ø­Ø¯Ø© ÙˆØ§Ø¶Ø­Ø© Ø§Ù„ÙŠÙˆÙ…']);
});

check('plan page can turn weak skills into a timed learning loop', () => {
  assertIncludes(files.plan, 'StudentNextActionStrip');
  assertIncludes(files.plan, 'planTodayNextAction');
  assertIncludes(files.plan, 'جلسة اليوم:');
  assertIncludes(files.plan, 'SmartSkillPlanItem');
  assertIncludes(files.plan, 'createDailySessionSlices');
  assertIncludes(files.plan, 'foundation');
  assertIncludes(files.plan, 'practice');
  assertIncludes(files.plan, 'review');
  assertIncludes(files.plan, 'createStudyPlan');
  assertIncludes(files.plan, 'updateStudyPlan');
});

check('supervisor and school dashboard exposes intervention intelligence', () => {
  assertIncludes(files.adminDashboard, 'supervisorScopeSummary');
  assertIncludes(files.adminDashboard, 'weakestSkills');
  assertIncludes(files.adminDashboard, 'strugglingStudents');
  assertIncludes(files.adminDashboard, 'actionLabel');
  assertIncludes(files.adminDashboard, 'tab=quizzes');
  assertIncludes(files.reports, 'scopedGroupPerformanceRows');
  assertIncludes(files.reports, 'weakestScopedGroup');
  assertIncludes(files.reports, 'strongestScopedGroup');
  assertIncludes(files.reports, 'buildScopedSmartRemediation');
  assertIncludes(files.reports, 'groupRows');
  assertAnyIncludes(files.adminDashboard, ['أضعف المهارات', 'Ø£Ø¶Ø¹Ù Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª']);
  assertAnyIncludes(files.reports, ['تحليل اختبار موجه', 'ØªØ­Ù„ÙŠÙ„ Ø§Ø®ØªØ¨Ø§Ø± Ù…ÙˆØ¬Ù‡']);
  assertIncludes(files.reports, 'downloadDirectedQuizAnalysisWorkbook');
  assertIncludes(files.reports, 'canSendInterventionAlert');
  assertIncludes(files.reports, 'sendInterventionAlert');
  assertIncludes(files.notificationRoutes, 'notificationRouter.post("/intervention-alert"');
});

check('landing page covers product value, reports, packages, schools/groups, and proof', () => {
  assertIncludes(files.landing, 'homepageSettings.hero');
  assertIncludes(files.landing, 'testimonials');
  assertAnyIncludes(files.landing, ['تحليل الأداء', 'ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø£Ø¯Ø§Ø¡']);
  assertAnyIncludes(files.landing, ['تقارير', 'ØªÙ‚Ø§Ø±ÙŠØ±', 'reports']);
  assertAnyIncludes(files.landing, ['باقات', 'Ø¨Ø§Ù‚Ø§Øª', 'packages']);
  assertAnyIncludes(files.landing, ['مدارس', 'Ø§Ù„Ù…Ø¯Ø§Ø±Ø³', 'schools', 'groups']);
});

check('release verification has live role and student journey coverage', () => {
  assertPattern(files.roleAudit, /student[\s\S]*parent[\s\S]*teacher[\s\S]*supervisor/i, 'live role audit should cover student, parent, teacher, and supervisor');
  assertAnyIncludes(files.roleAudit, ['admin', 'Role.ADMIN']);
  assertIncludes(files.roleAudit, 'consoleErrors');
  assertIncludes(files.roleAudit, 'network5xx');
  assertIncludes(files.studentJourney, 'foundation journey has at least one playable lesson');
  assertIncludes(files.studentJourney, 'quiz retry and finish routes keep the learner inside the same topic');
  assertIncludes(files.reportsContract, 'supervisor can analyze and export a specific directed quiz by students and skills');
});

check('this global journey gate is wired into package scripts', () => {
  assertIncludes(files.packageJson, 'smoke:global-student-journey');
  assertIncludes(files.packageJson, 'scripts/smoke-global-student-journey-contract.mjs');
});

for (const item of checks) {
  console.log(`${item.status} ${item.name}${item.details ? ` - ${item.details}` : ''}`);
}

const failed = checks.filter((item) => item.status === 'FAIL');
if (failed.length > 0) {
  console.error(`\n${failed.length} global student journey contract check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} global student journey contract checks passed.`);
