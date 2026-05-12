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

assertIncludes('index.html', 'window.tailwind = window.tailwind || {};');
assertIncludes('index.html', 'var tailwind = window.tailwind;');
assertIncludes('index.html', 'tailwind.config = {');
assertIncludes('index.html', '<script src="https://cdn.tailwindcss.com"></script>');

assertIncludes('pages/Reports.tsx', "const loadXlsx = async (): Promise<XlsxModule> => import('xlsx');");
assertNotIncludes('pages/Reports.tsx', "import * as XLSX from 'xlsx';");

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
assertIncludes('App.tsx', 'idleHandle = requestIdle(startBootstrap, { timeout: 1200 });');
assertIncludes('App.tsx', "window.addEventListener('hashchange', startIfRouteNeedsData);");
assertIncludes('App.tsx', "'/dashboard'");
assertIncludes('App.tsx', "'/category'");
assertIncludes('App.tsx', "'/quiz'");
assertIncludes('App.tsx', "'/results'");

console.log('Performance contract passed: public shell, video, reports, and admin-heavy modules are lazy-loaded.');
