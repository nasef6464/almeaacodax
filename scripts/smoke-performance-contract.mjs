import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function assertIncludes(file, needle) {
  const content = read(file);
  if (!content.includes(needle)) {
    throw new Error(`${file} must include: ${needle}`);
  }
}

function assertNotIncludes(file, needle) {
  const content = read(file);
  if (content.includes(needle)) {
    throw new Error(`${file} must not include: ${needle}`);
  }
}

function assertAnyIncludes(file, needles) {
  const content = read(file);
  const matched = needles.some((needle) => content.includes(needle));
  if (!matched) {
    throw new Error(`${file} must include one of: ${needles.join(' | ')}`);
  }
}

const videoEntrypoints = [
  'components/VideoModal.tsx',
  'components/CoursePlayer.tsx',
  'components/CourseLanding.tsx',
];

for (const file of videoEntrypoints) {
  assertIncludes(file, "React.lazy(() =>");
  assertIncludes(file, "import('./CustomVideoPlayer')");
  assertIncludes(file, '<React.Suspense');
  assertIncludes(file, 'جاري تجهيز المشغل...');
  assertNotIncludes(file, "import { CustomVideoPlayer } from './CustomVideoPlayer';");
}

assertNotIncludes('components/CustomVideoPlayer.tsx', "import ReactPlayer from 'react-player';");
assertNotIncludes('components/CustomVideoPlayer.tsx', "import('react-player')");
assertNotIncludes('components/CustomVideoPlayer.tsx', '<ReactPlayerFallback');
assertIncludes('components/CustomVideoPlayer.tsx', '<video');
assertIncludes('components/CustomVideoPlayer.tsx', 'onTimeUpdate={(event) =>');
assertIncludes('components/CustomVideoPlayer.tsx', "provider: 'vimeo'");
assertIncludes('components/CustomVideoPlayer.tsx', "provider: 'drive'");
assertIncludes('components/CustomVideoPlayer.tsx', "provider: 'file'");

assertNotIncludes('index.html', 'cdn.tailwindcss.com');
assertNotIncludes('index.html', '<script type="importmap">');
assertNotIncludes('index.html', 'rel="preconnect" href="https://almeaacodax-k2ux.onrender.com"');
assertNotIncludes('index.html', 'rel="dns-prefetch" href="https://almeaacodax-k2ux.onrender.com"');
assertIncludes('index.tsx', "import './styles/main.css';");
assertIncludes('styles/main.css', '@tailwind base;');
assertIncludes('tailwind.config.cjs', './components/**/*.{ts,tsx}');
assertIncludes('postcss.config.cjs', 'tailwindcss');

assertIncludes('pages/Reports.tsx', "import { loadXlsx } from '../utils/xlsxLoader';");
assertNotIncludes('pages/Reports.tsx', "import * as XLSX from 'xlsx';");
assertIncludes('pages/Results.tsx', "const ResultDonutChart = React.lazy(() =>");
assertIncludes('pages/Results.tsx', "import('../components/results/ResultDonutChart')");
assertIncludes('pages/Results.tsx', '<React.Suspense fallback={<ResultChartFallback />}>');
assertNotIncludes('pages/Results.tsx', "from 'recharts';");
assertIncludes('components/results/ResultDonutChart.tsx', "from 'recharts';");
assertIncludes('pages/Reports.tsx', 'const MIN_SKILL_EVIDENCE_COUNT = 3;');
assertIncludes('pages/Reports.tsx', 'isReliable: data.count >= MIN_SKILL_EVIDENCE_COUNT');
assertIncludes('pages/Reports.tsx', 'const reliableWeakSkills = reliableAggregatedSkills.filter((skill) => skill.mastery < 50);');
assertIncludes('pages/Reports.tsx', 'weaknessLabel = weakest?.isReliable');
assertIncludes('pages/Reports.tsx', 'evidenceLabel: skill.isReliable');
assertIncludes('pages/Reports.tsx', 'القياس مبني على {studentEvidenceSummary.totalQuestions} سؤال');
assertIncludes('pages/Reports.tsx', 'studentEnrolledPathIds');
assertIncludes('pages/Reports.tsx', 'studentPathScopedSkills');
assertIncludes('pages/Reports.tsx', 'تقاريرك مرتبة حسب مسارك');
assertIncludes('pages/Reports.tsx', 'اختر مسارك أولًا');
assertIncludes('pages/Reports.tsx', 'مسار مسجل');
assertIncludes('pages/Reports.tsx', 'مركز متابعة مؤسسي');
assertIncludes('pages/Reports.tsx', 'توجيه اختبار');
assertIncludes('pages/Reports.tsx', 'نسخ تنبيه');
assertIncludes('pages/Reports.tsx', 'buildDirectedQuizManagerLink');
assertIncludes('dashboards/admin/QuizzesManager.tsx', 'openedFromReports');
assertIncludes('dashboards/admin/QuizzesManager.tsx', 'source') ;
assertIncludes('dashboards/admin/QuizzesManager.tsx', 'initialSkillIds={selectedSkillId ? [selectedSkillId] : []}');
assertIncludes('dashboards/admin/QuizzesManager.tsx', 'initialTargetUserIds={initialTargetUserId ? [initialTargetUserId] : []}');
assertIncludes('dashboards/admin/QuizzesManager.tsx', 'initialTargetGroupIds={initialTargetGroupId ? [initialTargetGroupId] : []}');
assertIncludes('dashboards/admin/UnifiedQuizBuilder.tsx', 'skillIds: editingQuiz?.skillIds ?? initialSkillIds ?? []');
assertIncludes('dashboards/admin/UnifiedQuizBuilder.tsx', 'targetUserIds,');
assertIncludes('dashboards/admin/UnifiedQuizBuilder.tsx', 'mode: editingQuiz?.mode ?? initialMode');
assertIncludes('pages/Reports.tsx', 'targetUserId: scopedLeadStudent?.id');
assertIncludes('pages/Reports.tsx', 'targetUserId: student.id');
assertIncludes('pages/Reports.tsx', 'targetGroupId: student.groupIds?.[0]');
assertIncludes('pages/Reports.tsx', 'to={student.followUpLink}');
assertIncludes('pages/Reports.tsx', 'subjectId: subject.subjectId');
assertIncludes('pages/Reports.tsx', 'const attemptFollowUpLink = buildDirectedQuizManagerLink');
assertIncludes('pages/Reports.tsx', 'const targetUserCount = quiz.targetUserIds?.length || 0');
assertIncludes('dashboards/admin/QuizzesManager.tsx', 'initialTargetUserId ? [initialTargetUserId] : []');
assertIncludes('dashboards/admin/QuizzesManager.tsx', 'reportContextStudent');

assertIncludes('utils/xlsxLoader.ts', "export const loadXlsx = async (): Promise<XlsxModule> => import('@e965/xlsx');");
for (const file of [
  'dashboards/admin/UsersManager.tsx',
  'dashboards/admin/SchoolPortalManager.tsx',
  'dashboards/admin/QuizzesManager.tsx',
  'dashboards/admin/QuestionBankManager.tsx',
  'dashboards/admin/LibraryManager.tsx',
  'dashboards/admin/LessonsManager.tsx',
  'dashboards/admin/GroupsManager.tsx',
]) {
  assertIncludes(file, "from '../../utils/xlsxLoader';");
  assertIncludes(file, 'loadXlsx');
  assertNotIncludes(file, "import * as XLSX from 'xlsx';");
}
assertIncludes('dashboards/admin/SchoolsManager.tsx', "from './SchoolsManager/importFileReaders';");
assertIncludes('dashboards/admin/SchoolsManager/importFileReaders.ts', "from '../../../utils/xlsxLoader';");
assertIncludes('dashboards/admin/SchoolsManager/importFileReaders.ts', 'loadXlsx');
assertNotIncludes('dashboards/admin/SchoolsManager/importFileReaders.ts', "import * as XLSX from 'xlsx';");

assertIncludes('dashboards/admin/AdminDashboard.tsx', "const lazyNamed = <TProps extends object>(");
assertIncludes('dashboards/admin/AdminDashboard.tsx', '<React.Suspense fallback={<AdminTabLoading />}>');
assertNotIncludes('dashboards/admin/AdminDashboard.tsx', "import { UsersManager } from './UsersManager';");
assertNotIncludes('dashboards/admin/AdminDashboard.tsx', "import { QuestionBankManager } from './QuestionBankManager';");
assertNotIncludes('dashboards/admin/AdminDashboard.tsx', "import { LessonsManager } from './LessonsManager';");

assertIncludes('App.tsx', 'const DATA_BOOTSTRAP_BLOCKING_PREFIXES = [');
const dataBootstrapBlockingPrefixesBlock = read('App.tsx').match(
  /const DATA_BOOTSTRAP_BLOCKING_PREFIXES = \[([\s\S]*?)\];/,
)?.[1] ?? '';
if (dataBootstrapBlockingPrefixesBlock.includes("'/category'")) {
  throw new Error('App.tsx must not block initial data bootstrap for /category routes');
}
assertIncludes('App.tsx', 'const DATA_BOOTSTRAP_START_PREFIXES = [');
assertIncludes('App.tsx', 'const QUESTION_BOOTSTRAP_DEFER_PREFIXES = [');
assertIncludes('App.tsx', 'const shouldDeferQuestionBootstrap = (path: string) =>');
assertIncludes('App.tsx', 'const SKILL_PROGRESS_BOOTSTRAP_DEFER_PREFIXES = [');
assertIncludes('App.tsx', 'const shouldDeferSkillProgressBootstrap = (path: string) =>');
assertIncludes('App.tsx', 'const BootstrapRouteGate: React.FC<{ bootstrapReady: boolean; children: React.ReactNode }>');
assertIncludes('App.tsx', 'const CategoryRouteShellGate: React.FC<{ children: React.ReactNode }>');
assertIncludes('App.tsx', 'if (isDataBootstrapBlockingPath(path))');
assertIncludes('App.tsx', 'shouldStartBootstrapForPath(path)');
assertIncludes('App.tsx', "const [bootstrapReady, setBootstrapReady] = useState(false);");
assertAnyIncludes('App.tsx', [
  'const questionsPromise = options.deferQuestions ? null : adapter.getQuestions({ page: 1, limit: 100 });',
  'const questionsPromise = shouldLoadQuestions ? adapter.getQuestions({ page: 1, limit: 100 }) : null;',
]);
assertAnyIncludes('App.tsx', [
  'const taxonomyPromise = adapter.getTaxonomyBootstrap();',
  'const taxonomyPromise = profile.loadTaxonomy ? adapter.getTaxonomyBootstrap() : null;',
]);
assertIncludes('App.tsx', 'taxonomyPromise');
assertIncludes('App.tsx', 'hydrateTaxonomy({');
assertIncludes('App.tsx', 'window.setTimeout(() => {');
assertIncludes('App.tsx', "console.warn('API health check failed; continuing data bootstrap.', error);");
assertNotIncludes('App.tsx', "API health check failed; skipping remote hydration to preserve local state.");
assertIncludes('App.tsx', 'const hasItems = (value: unknown) => Array.isArray(value) && value.length > 0;');
assertIncludes('App.tsx', "console.warn('Course bootstrap unavailable:', error)");
assertIncludes('App.tsx', '].some(hasItems)');
assertIncludes('services/api.ts', 'ids?: string;');
assertIncludes('services/api.ts', 'runtimeEnv?.VITE_API_URL');
assertIncludes('services/api.ts', '? "/api"');
assertNotIncludes('services/api.ts', 'const productionApiBaseUrl = "https://almeaacodax-k2ux.onrender.com/api";');
assertNotIncludes('services/api.ts', 'runtimeHostname === "almeaacodax.vercel.app" || runtimeHostname.endsWith(".vercel.app")');
assertIncludes('services/api.ts', 'summary?: boolean');
assertIncludes('services/api.ts', 'noTotal?: boolean');
assertIncludes('server/src/routes/quiz.routes.ts', 'limit: z.coerce.number().int().min(1).max(100).default(80)');
assertIncludes('server/src/routes/quiz.routes.ts', 'res.setHeader("X-Total-Count", String(total));');
assertIncludes('server/src/routes/quiz.routes.ts', 'if (query.summary) {');
assertIncludes('server/src/routes/quiz.routes.ts', 'toQuestionSummaryText(item.text)');
assertIncludes('server/src/routes/quiz.routes.ts', 'query.noTotal ? Promise.resolve(null) : QuestionModel.countDocuments(filter)');
assertIncludes('server/src/routes/quiz.routes.ts', 'PUBLIC_QUIZ_LIST_CACHE_TTL_MS');
assertIncludes('server/src/routes/quiz.routes.ts', 'X-Quiz-List-Cache');
assertIncludes('server/src/routes/quiz.routes.ts', 'QUESTION_SUMMARY_CACHE_TTL_MS');
assertIncludes('server/src/routes/quiz.routes.ts', 'X-Question-Summary-Cache');
assertIncludes('server/src/routes/course.routes.ts', 'PUBLIC_COURSE_LIST_CACHE_TTL_MS');
assertIncludes('server/src/routes/course.routes.ts', 'X-Course-List-Cache');
assertIncludes('server/src/routes/course.routes.ts', 'CourseModel.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean()');
assertIncludes('server/src/services/visibility.ts', 'ACTIVE_PATH_CACHE_TTL_MS');
assertIncludes('server/src/services/visibility.ts', 'clearActivePathIdsCache');
assertIncludes('server/src/routes/taxonomy.routes.ts', 'clearActivePathIdsCache();');
assertIncludes('server/src/routes/taxonomy.routes.ts', 'TAXONOMY_BOOTSTRAP_CACHE_TTL_MS');
assertIncludes('server/src/routes/taxonomy.routes.ts', 'Deferred taxonomy seed check failed');
assertIncludes('server/src/routes/taxonomy.routes.ts', 'X-Taxonomy-Cache');
assertIncludes('server/src/routes/taxonomy.routes.ts', 'publicTaxonomyBootstrapPromise');
assertIncludes('server/src/routes/taxonomy.routes.ts', 'buildPublicTaxonomyBootstrapPayload');
assertIncludes('server/src/routes/taxonomy.routes.ts', 'Cache-Control", "public, max-age=60, stale-while-revalidate=120"');
assertIncludes('server/src/routes/taxonomy.routes.ts', 'clearTaxonomyBootstrapCache');
assertIncludes('server/src/routes/taxonomy.routes.ts', 'PathModel.find({ isActive: { $ne: false } })');
assertIncludes('server/src/routes/taxonomy.routes.ts', 'SubjectModel.find({ pathId: { $in: visiblePathIds } })');
assertIncludes('server/src/routes/taxonomy.routes.ts', 'SkillModel.find({');
assertIncludes('server/src/routes/content.routes.ts', 'CONTENT_BOOTSTRAP_CACHE_TTL_MS');
assertIncludes('server/src/routes/content.routes.ts', 'X-Content-Cache');
assertIncludes('server/src/routes/content.routes.ts', 'scopeFilterToActivePaths');
assertIncludes('server/src/routes/content.routes.ts', 'PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT');
assertIncludes('server/src/routes/content.routes.ts', 'publicContentBootstrapPromise');
assertIncludes('server/src/routes/content.routes.ts', 'X-Content-Cache", "shared"');
assertIncludes('server/src/services/operationsAudit.ts', 'OPERATIONS_AUDIT_CACHE_TTL_MS');
assertIncludes('server/src/services/operationsAudit.ts', 'cachedOperationsAudit');
assertIncludes('server/src/services/operationsAudit.ts', 'pendingOperationsAudit');
assertIncludes('server/src/services/operationsAudit.ts', 'LessonModel.aggregate');
assertIncludes('server/src/services/operationsAudit.ts', 'contentPresent');
assertIncludes('server/src/services/operationsAudit.ts', '$strLenCP');
assertIncludes('server/src/routes/operations.routes.ts', 'OPERATIONS_STATUS_CACHE_TTL_MS');
assertIncludes('server/src/routes/operations.routes.ts', 'cachedOperationsStatus');
assertIncludes('server/src/routes/operations.routes.ts', 'X-Operations-Status-Cache');
assertIncludes('server/src/routes/operations.routes.ts', 'OPERATIONS_STATUS_LESSON_SELECT');
assertIncludes('server/src/routes/operations.routes.ts', 'select(OPERATIONS_STATUS_LESSON_SELECT)');
assertIncludes('components/LearningSection.tsx', "React.lazy(() => import('./PaymentModal')");
assertIncludes('components/LearningSection.tsx', "React.lazy(() => import('./SkillDetailsModal')");
assertIncludes('components/LearningSection.tsx', "React.lazy(() => import('./SimulatedTestExperience')");
assertIncludes('components/LearningSection.tsx', "React.lazy(() => import('./FileModal')");
assertNotIncludes('components/LearningSection.tsx', "import { PaymentModal } from './PaymentModal';");
assertNotIncludes('components/LearningSection.tsx', "import { SkillDetailsModal } from './SkillDetailsModal';");
assertNotIncludes('components/LearningSection.tsx', "import { SimulatedTestExperience } from './SimulatedTestExperience';");
assertNotIncludes('components/LearningSection.tsx', "import { FileModal } from './FileModal';");
assertIncludes('pages/GenericPathPage.tsx', "React.lazy(() => import('../components/PaymentModal')");
assertNotIncludes('pages/GenericPathPage.tsx', "import { PaymentModal } from '../components/PaymentModal';");
assertIncludes('components/MainLayout.tsx', "React.lazy(() => import('./ChatWidget')");
assertNotIncludes('components/MainLayout.tsx', "import { ChatWidget } from './ChatWidget';");
assertIncludes('contexts/AuthContext.tsx', 'const restoreInitialSession = (): SessionUser | null => {');
assertIncludes('contexts/AuthContext.tsx', 'const [user, setUser] = useState<SessionUser | null>(() => restoreInitialSession());');
assertIncludes('contexts/AuthContext.tsx', 'const loading = false;');
assertNotIncludes('contexts/AuthContext.tsx', 'const [loading, setLoading] = useState(true);');
assertNotIncludes('contexts/AuthContext.tsx', '<Loader2 className="w-10 h-10 animate-spin" />');
assertIncludes('App.tsx', "console.warn('Deferred question bootstrap unavailable:', error);");
assertIncludes('App.tsx', "console.warn('Deferred skill-progress bootstrap unavailable:', error);");
assertIncludes('App.tsx', 'deferQuestions: shouldDeferQuestionBootstrap(path)');
assertIncludes('App.tsx', 'deferSkillProgress: shouldDeferSkillProgressBootstrap(path)');
assertIncludes('App.tsx', 'const requestIdle = window.requestIdleCallback?.bind(window);');
assertIncludes('App.tsx', 'window.__ALMEAA_PERF_DEBUG__');
assertIncludes('services/api.ts', '[almeaa:api]');
assertIncludes('services/api.ts', 'const requestCached = async');
assertIncludes('services/api.ts', 'const getPublicCacheStorage = ()');
assertIncludes('services/api.ts', 'globalThis.sessionStorage');
assertIncludes('services/api.ts', 'taxonomy-bootstrap');
assertIncludes('services/api.ts', 'content-bootstrap');
assertIncludes('services/api.ts', 'canUsePublicLearningCache');
assertIncludes('services/api.ts', 'const cacheKey = [');
assertIncludes('services/api.ts', '"courses",');
assertIncludes('services/api.ts', 'query.pathId || "all-paths"');
assertIncludes('services/api.ts', 'query.subjectId || "all-subjects"');
assertIncludes('services/api.ts', '].join(":");');
assertIncludes('services/api.ts', 'homepage-settings');
assertIncludes('services/api.ts', 'announcement-ads');
assertIncludes('components/PlatformFontBootstrap.tsx', 'requestIdle(() =>');
assertIncludes('App.tsx', 'const loadPublicAnnouncementAds = async () => {');
assertIncludes('App.tsx', 'api.getPublicAnnouncementAds()');
assertIncludes('App.tsx', 'publicAdsIdleHandle = requestIdle(() => {');
assertIncludes('App.tsx', 'void loadPublicAnnouncementAds();');
assertIncludes('App.tsx', 'publicAdsTimer = globalThis.setTimeout(() => {');
assertNotIncludes('App.tsx', 'requestIdle(startBootstrap, { timeout: 1200 });');
assertIncludes('App.tsx', "window.addEventListener('hashchange', startIfRouteNeedsData);");
assertIncludes('App.tsx', "'/dashboard'");
assertIncludes('App.tsx', "'/category'");
assertIncludes('App.tsx', "'/quiz'");
assertIncludes('App.tsx', "'/results'");
assertIncludes('services/api.ts', 'getPublicAnnouncementAds: () =>');
assertIncludes('server/src/routes/content.routes.ts', '"/announcement-ads"');
assertIncludes('server/src/routes/content.routes.ts', '.limit(8)');
assertIncludes('server/src/server.ts', 'bootstrapServer().catch((error) => {');
assertIncludes('server/src/app/bootstrap/bootstrapServer.ts', 'await connectToDatabase();');
assertIncludes('server/src/app/bootstrap/bootstrapServer.ts', 'server.listen(env.PORT');
assertIncludes('server/src/app/bootstrap/bootstrapServer.ts', 'void runStartupMaintenance();');
assertIncludes('server/src/app/bootstrap/runStartupMaintenance.ts', 'export async function runStartupMaintenance()');
assertIncludes('server/src/app/bootstrap/runStartupMaintenance.ts', '["skill taxonomy", ensureSkillTaxonomy]');
assertIncludes('server/src/app/bootstrap/runStartupMaintenance.ts', '["admin account", ensureAdminAccount]');
assertNotIncludes('server/src/app/bootstrap/bootstrapServer.ts', 'await runStartupMaintenance();');
const apiBootstrapSource = read('server/src/app/bootstrap/bootstrapServer.ts');
const apiListenIndex = apiBootstrapSource.indexOf('server.listen(env.PORT');
const maintenanceStartIndex = apiBootstrapSource.indexOf('void runStartupMaintenance();');
if (apiListenIndex === -1 || maintenanceStartIndex === -1 || maintenanceStartIndex < apiListenIndex) {
  throw new Error('API startup maintenance must remain best-effort and start only after server.listen is initiated');
}
const startupMaintenanceSource = read('server/src/app/bootstrap/runStartupMaintenance.ts');
const taxonomyMaintenanceIndex = startupMaintenanceSource.indexOf('["skill taxonomy", ensureSkillTaxonomy]');
const adminMaintenanceIndex = startupMaintenanceSource.indexOf('["admin account", ensureAdminAccount]');
if (taxonomyMaintenanceIndex === -1 || adminMaintenanceIndex === -1 || adminMaintenanceIndex < taxonomyMaintenanceIndex) {
  throw new Error('Startup maintenance must preserve taxonomy-before-admin task ordering');
}

assertIncludes('store/useStore.ts', "runtimeEnv?.PROD === true || runtimeEnv?.VITE_USE_REAL_API !== 'false'");
assertIncludes('store/useStore.ts', 'const shouldSyncUserToApi = (user?: User | null) => Boolean(USE_REAL_API');
assertNotIncludes('vite.config.ts', "return 'firebase';");
assertNotIncludes('vite.config.ts', "return 'video-dash';");
assertNotIncludes('vite.config.ts', "return 'video-hls';");
assertNotIncludes('package.json', '"react-player"');

console.log('Performance contract passed: public shell, video, reports, results charts, and admin-heavy modules are lazy-loaded.');
