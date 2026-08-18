import { readFile } from 'node:fs/promises';

const files = {
  packageJson: await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  dashboard: await readFile(new URL('../pages/Dashboard.tsx', import.meta.url), 'utf8'),
  studentNextAction: await readFile(new URL('../components/StudentNextActionStrip.tsx', import.meta.url), 'utf8'),
  emptyState: await readFile(new URL('../components/ui/EmptyState.tsx', import.meta.url), 'utf8'),
  subjectLearning: await readFile(new URL('../pages/SubjectLearningPage.tsx', import.meta.url), 'utf8'),
  quizzes: await readFile(new URL('../pages/Quizzes.tsx', import.meta.url), 'utf8'),
  reports: [
    await readFile(new URL('../pages/Reports.tsx', import.meta.url), 'utf8'),
    await readFile(new URL('../pages/Reports/reportDomain.ts', import.meta.url), 'utf8'),
    await readFile(new URL('../pages/Reports/recommendationViewModel.ts', import.meta.url), 'utf8'),
    await readFile(new URL('../pages/Reports/studentAnalyticsViewModel.ts', import.meta.url), 'utf8'),
    await readFile(new URL('../pages/Reports/scopedAnalyticsViewModel.ts', import.meta.url), 'utf8'),
    await readFile(new URL('../pages/Reports/scopedComparisonViewModel.ts', import.meta.url), 'utf8'),
    await readFile(new URL('../pages/Reports/directedQuizAnalyticsViewModel.ts', import.meta.url), 'utf8'),
    await readFile(new URL('../pages/Reports/institutionalReportViewModel.ts', import.meta.url), 'utf8'),
    await readFile(new URL('../pages/Reports/scopedStudentFocusViewModel.ts', import.meta.url), 'utf8'),
  ].join('\n'),
  plan: await readFile(new URL('../pages/Plan.tsx', import.meta.url), 'utf8'),
  pricing: await readFile(new URL('../pages/Pricing.tsx', import.meta.url), 'utf8'),
  paymentModal: await readFile(new URL('../components/PaymentModal.tsx', import.meta.url), 'utf8'),
  landing: await readFile(new URL('../pages/Landing.tsx', import.meta.url), 'utf8'),
  adminDashboard: await readFile(new URL('../dashboards/admin/AdminDashboard.tsx', import.meta.url), 'utf8'),
  notificationRoutes: await readFile(new URL('../server/src/routes/notification.routes.ts', import.meta.url), 'utf8'),
  roleAudit: await readFile(new URL('../scripts/live-role-pages-audit.mjs', import.meta.url), 'utf8'),
  liveStudentJourney: await readFile(new URL('../scripts/live-student-learning-deep-audit.mjs', import.meta.url), 'utf8'),
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

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) {
    throw new Error(message || `Unexpected fragment: ${fragment}`);
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

check('student dashboard keeps a clear continuation area and learner shortcuts', () => {
  assertIncludes(files.dashboard, "import { EmptyState } from '../components/ui/EmptyState'");
  assertIncludes(files.dashboard, 'const smartPathSkills = buildSmartPathSkillsFromResults(examResults);');
  assertIncludes(files.dashboard, '<SmartLearningPath skills={smartPathSkills} />');
  assertIncludes(files.dashboard, 'أكمل مساراتك');
  assertIncludes(files.dashboard, 'to={path.courses[0] ? `/course/${path.courses[0].id}` : `/category/${path.id}`}');
  assertIncludes(files.dashboard, 'data-testid="student-path-enroll"');
  assertIncludes(files.dashboard, 'data-testid="student-path-unenroll"');
  assertIncludes(files.dashboard, 'data-testid="student-paths-empty-state"');
  assertIncludes(files.dashboard, 'primaryAction={{ label:');
  assertIncludes(files.dashboard, 'secondaryAction={{ label:');
  assertIncludes(files.dashboard, 'id="available-paths"');
  assertIncludes(files.dashboard, 'هل تريد إلغاء التسجيل في مسار');
  assertIncludes(files.dashboard, "{ id: 'saher'");
  assertIncludes(files.dashboard, "{ id: 'flashcards'");
  assertIncludes(files.dashboard, "{ id: 'quizzes'");
  assertIncludes(files.dashboard, "{ id: 'reports'");
  assertIncludes(files.dashboard, 'onClick={() => setActiveTab(btn.id as any)}');
  assertIncludes(files.dashboard, 'آخر إنجازاتك');
});

check('student next action strip is compact, reusable, and has one primary action', () => {
  assertIncludes(files.studentNextAction, 'StudentNextActionStripProps');
  assertIncludes(files.studentNextAction, 'خطوتك التالية');
  assertIncludes(files.studentNextAction, 'data-testid="student-next-action-kicker"');
  assertIncludes(files.studentNextAction, 'data-testid="student-next-action-title"');
  assertIncludes(files.studentNextAction, 'data-testid="student-next-action-description"');
  assertIncludes(files.studentNextAction, 'aria-live="polite"');
  assertIncludes(files.studentNextAction, 'sm:p-4');
  assertIncludes(files.studentNextAction, 'primaryLabel');
  assertIncludes(files.studentNextAction, 'primaryHref');
  assertIncludes(files.studentNextAction, 'secondaryLabel');
  assertIncludes(files.studentNextAction, 'secondaryHref');
  assertIncludes(files.studentNextAction, 'aria-labelledby="student-next-action-title"');
  assertNotIncludes(files.studentNextAction, 'Ø®Ø·ÙˆØªÙƒ');
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
  assertIncludes(files.reports, 'studentTodayLearningLoop');
  assertIncludes(files.reports, 'studentReadinessDecision');
  assertIncludes(files.reports, 'data-testid="student-today-learning-loop"');
  assertIncludes(files.reports, 'data-testid="student-today-learning-loop-actions"');
  assertIncludes(files.reports, 'data-testid="student-readiness-decision"');
  assertIncludes(files.reports, 'data-testid="student-readiness-decision-action"');
  assertIncludes(files.reports, 'readyToAdvance');
  assertIncludes(files.reports, 'اتبع الترتيب فقط: شرح، تدريب، قياس');
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
  assertIncludes(files.plan, 'data-testid="student-plan-delete"');
  assertIncludes(files.plan, 'handleDeleteEditingPlan');
  assertIncludes(files.plan, 'window.confirm(`هل تريد حذف');
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

check('student membership and activation purchase path is explicit and live-audited', () => {
  assertIncludes(files.pricing, 'data-testid="pricing-memberships-page"');
  assertIncludes(files.pricing, 'data-testid="pricing-free-membership-start"');
  assertIncludes(files.pricing, 'data-testid="pricing-membership-request"');
  assertIncludes(files.paymentModal, 'data-testid="payment-modal-shell"');
  assertIncludes(files.paymentModal, 'data-testid="payment-continue-purchase"');
  assertIncludes(files.paymentModal, 'data-testid="payment-access-code-input"');
  assertIncludes(files.paymentModal, 'data-testid="payment-redeem-access-code"');
  assertIncludes(files.paymentModal, 'data-testid="payment-action-error"');
  assertIncludes(files.liveStudentJourney, 'student-memberships-pricing');
  assertIncludes(files.liveStudentJourney, 'paymentProbe');
  assertIncludes(files.liveStudentJourney, 'pricing-membership-request');
  assertIncludes(files.liveStudentJourney, 'payment-access-code-input');
});

check('release verification has live role and student journey coverage', () => {
  assertIncludes(files.roleAudit, 'role: "admin"');
  assertIncludes(files.roleAudit, 'ROLE_ADMIN_EMAIL');
  assertIncludes(files.roleAudit, 'PAGE_TIMEOUT_MS');
  assertIncludes(files.roleAudit, 'viewports');
  assertIncludes(files.roleAudit, 'name: "mobile"');
  assertIncludes(files.roleAudit, 'horizontalOverflow');
  assertIncludes(files.roleAudit, 'layoutFailure');
  assertIncludes(files.roleAudit, 'navigationError');
  assertPattern(files.roleAudit, /student[\s\S]*parent[\s\S]*teacher[\s\S]*supervisor/i, 'live role audit should cover student, parent, teacher, and supervisor');
  assertAnyIncludes(files.roleAudit, ['admin', 'Role.ADMIN']);
  assertIncludes(files.roleAudit, 'consoleErrors');
  assertIncludes(files.roleAudit, 'network5xx');
  assertIncludes(files.liveStudentJourney, 'VIEWPORTS');
  assertIncludes(files.liveStudentJourney, 'name: "mobile"');
  assertIncludes(files.liveStudentJourney, 'unenrollConfirmProbe');
  assertIncludes(files.liveStudentJourney, 'student-path-unenroll');
  assertIncludes(files.liveStudentJourney, 'missingNextAction');
  assertIncludes(files.liveStudentJourney, 'actionControlCount');
  assertIncludes(files.liveStudentJourney, 'actionGroupBudgets');
  assertIncludes(files.liveStudentJourney, 'today-learning-loop-actions');
  assertIncludes(files.liveStudentJourney, 'readiness-decision-action');
  assertIncludes(files.liveStudentJourney, 'actionGroupFailures');
  assertIncludes(files.liveStudentJourney, 'horizontalOverflow');
  assertIncludes(files.studentJourney, 'foundation journey has at least one playable lesson');
  assertIncludes(files.studentJourney, 'quiz retry and finish routes keep the learner inside the same topic');
  assertIncludes(files.reportsContract, 'supervisor can analyze and export a specific directed quiz by students and skills');
});

check('this global journey gate is wired into package scripts', () => {
  assertIncludes(files.packageJson, 'smoke:global-student-journey');
  assertIncludes(files.packageJson, 'smoke:student-learning-live');
  assertIncludes(files.packageJson, 'scripts/smoke-global-student-journey-contract.mjs');
  assertIncludes(files.packageJson, 'scripts/live-student-learning-deep-audit.mjs');
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
