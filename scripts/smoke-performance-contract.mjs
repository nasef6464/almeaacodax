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

assertIncludes('index.html', 'window.tailwind = window.tailwind || {};');
assertIncludes('index.html', 'window.tailwind.config = {');
assertIncludes('index.html', '<script src="https://cdn.tailwindcss.com"></script>');

assertIncludes('pages/Reports.tsx', "const loadXlsx = async (): Promise<XlsxModule> => import('xlsx');");
assertNotIncludes('pages/Reports.tsx', "import * as XLSX from 'xlsx';");
assertIncludes('pages/Results.tsx', "const ResultDonutChart = React.lazy(() =>");
assertIncludes('pages/Results.tsx', "import('../components/results/ResultDonutChart')");
assertIncludes('pages/Results.tsx', '<React.Suspense fallback={<ResultChartFallback />}>');
assertNotIncludes('pages/Results.tsx', "from 'recharts';");
assertIncludes('components/results/ResultDonutChart.tsx', "from 'recharts';");
assertIncludes('pages/Reports.tsx', 'const MIN_SKILL_EVIDENCE_COUNT = 2;');
assertIncludes('pages/Reports.tsx', 'isReliable: data.count >= MIN_SKILL_EVIDENCE_COUNT');
assertIncludes('pages/Reports.tsx', "skill.isReliable ? 'ابدأ هنا' : 'قراءة أولية'");
assertIncludes('pages/Reports.tsx', 'القياس: {skill.totalEvidence} سؤال عبر المحاولات');
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
assertIncludes('dashboards/admin/QuizzesManager.tsx', 'skillIds: selectedSkillId ? [selectedSkillId] : []');
assertIncludes('pages/Reports.tsx', 'targetUserId: scopedLeadStudent?.id');
assertIncludes('pages/Reports.tsx', 'targetUserId: student.id');
assertIncludes('pages/Reports.tsx', 'targetGroupId: student.groupIds?.[0]');
assertIncludes('pages/Reports.tsx', 'to={student.followUpLink}');
assertIncludes('dashboards/admin/QuizzesManager.tsx', 'initialTargetUserId ? [initialTargetUserId] : []');
assertIncludes('dashboards/admin/QuizzesManager.tsx', 'reportContextStudent');

assertIncludes('utils/xlsxLoader.ts', "export const loadXlsx = async (): Promise<XlsxModule> => import('xlsx');");
for (const file of [
  'dashboards/admin/UsersManager.tsx',
  'dashboards/admin/SchoolsManager.tsx',
  'dashboards/admin/SchoolPortalManager.tsx',
  'dashboards/admin/QuizzesManager.tsx',
  'dashboards/admin/QuestionBankManager.tsx',
  'dashboards/admin/LibraryManager.tsx',
  'dashboards/admin/LessonsManager.tsx',
  'dashboards/admin/GroupsManager.tsx',
]) {
  assertIncludes(file, "import { loadXlsx } from '../../utils/xlsxLoader';");
  assertNotIncludes(file, "import * as XLSX from 'xlsx';");
}

assertIncludes('dashboards/admin/AdminDashboard.tsx', "const lazyNamed = <TProps extends object>(");
assertIncludes('dashboards/admin/AdminDashboard.tsx', '<React.Suspense fallback={<AdminTabLoading />}>');
assertNotIncludes('dashboards/admin/AdminDashboard.tsx', "import { UsersManager } from './UsersManager';");
assertNotIncludes('dashboards/admin/AdminDashboard.tsx', "import { QuestionBankManager } from './QuestionBankManager';");
assertNotIncludes('dashboards/admin/AdminDashboard.tsx', "import { LessonsManager } from './LessonsManager';");

assertIncludes('App.tsx', 'const DATA_BOOTSTRAP_BLOCKING_PREFIXES = [');
assertIncludes('App.tsx', 'const BootstrapRouteGate: React.FC<{ bootstrapReady: boolean; children: React.ReactNode }>');
assertIncludes('App.tsx', 'isDataBootstrapBlockingPath(location.pathname ||');
assertIncludes('App.tsx', "const [bootstrapReady, setBootstrapReady] = useState(false);");
assertIncludes('App.tsx', 'const requestIdle = window.requestIdleCallback?.bind(window);');
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

assertIncludes('store/useStore.ts', "runtimeEnv?.PROD === true || runtimeEnv?.VITE_USE_REAL_API !== 'false'");
assertIncludes('store/useStore.ts', "runtimeEnv?.DEV === true && runtimeEnv?.VITE_USE_REAL_API === 'false'");
assertNotIncludes('vite.config.ts', "return 'firebase';");
assertNotIncludes('vite.config.ts', "return 'video-dash';");
assertNotIncludes('vite.config.ts', "return 'video-hls';");
assertNotIncludes('package.json', '"react-player"');

console.log('Performance contract passed: public shell, video, reports, results charts, and admin-heavy modules are lazy-loaded.');
