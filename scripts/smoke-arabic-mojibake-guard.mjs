import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const checkedFiles = [
  'App.tsx',
  'index.tsx',
  'vite.config.ts',
  'components/QuestionDrawingPad.tsx',
  'components/RichTextEditor.tsx',
  'components/StudentNextActionStrip.tsx',
  'dashboards/admin/AdminDashboard.tsx',
  'dashboards/admin/SchoolsManager.tsx',
  'pages/CourseView.tsx',
  'pages/Reports.tsx',
  'server/src/routes/seo.routes.ts',
];

const badPatterns = [
  { name: 'UTF-8 mojibake marker', pattern: /[\u00c3\u00d8\u00d9][^\n\r]*[\u00c3\u00d8\u00d9]/ },
  { name: 'placeholder question marks', pattern: /\?{4,}/ },
];

const expectedArabicSnippets = [
  { file: 'App.tsx', text: 'منصة المئة | قدرات وتحصيلي' },
  { file: 'App.tsx', text: 'منصة تعليمية عربية للقدرات والتحصيلي' },
  { file: 'components/QuestionDrawingPad.tsx', text: 'إدراج الرسم' },
  { file: 'components/RichTextEditor.tsx', text: 'رياضيات' },
  { file: 'components/StudentNextActionStrip.tsx', text: 'خطوتك التالية' },
  { file: 'dashboards/admin/AdminDashboard.tsx', text: 'أنشئ تدخل علاجي' },
  { file: 'dashboards/admin/SchoolsManager.tsx', text: 'مدير/مشرف المدرسة كاملة' },
  { file: 'pages/CourseView.tsx', text: 'لم نتمكن من فتح الدورة' },
  { file: 'pages/CourseView.tsx', text: 'إصدار الشهادة' },
  { file: 'pages/Reports.tsx', text: 'تقارير الأداء' },
  { file: 'pages/Reports.tsx', text: 'ابدأ التدخل من أعلى نقطة تأثير' },
  { file: 'server/src/routes/seo.routes.ts', text: 'الصفحة الرئيسية' },
  { file: 'server/src/routes/seo.routes.ts', text: 'منصة المئة' },
];

const expectedPwaFreshnessSnippets = [
  { file: 'index.tsx', text: 'onNeedRefresh' },
  { file: 'index.tsx', text: 'registration.update()' },
  { file: 'vite.config.ts', text: 'cleanupOutdatedCaches: true' },
  { file: 'vite.config.ts', text: 'skipWaiting: true' },
  { file: 'vite.config.ts', text: 'clientsClaim: true' },
  { file: 'vite.config.ts', text: 'pages-cache-${appVersion}' },
];

const failures = [];

for (const relativePath of checkedFiles) {
  const absolutePath = path.join(root, relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');

  for (const { name, pattern } of badPatterns) {
    const match = source.match(pattern);
    if (match) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      failures.push(`${relativePath}:${line} contains ${name}: ${match[0].slice(0, 80)}`);
    }
  }
}

for (const { file, text } of expectedArabicSnippets) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(text)) {
    failures.push(`${file} is missing expected Arabic text: ${text}`);
  }
}

for (const { file, text } of expectedPwaFreshnessSnippets) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(text)) {
    failures.push(`${file} is missing expected PWA freshness guard: ${text}`);
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ total: failures.length, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  total: checkedFiles.length,
  passed: checkedFiles.length,
  checkedFiles,
  expectedArabicSnippets: expectedArabicSnippets.length,
  expectedPwaFreshnessSnippets: expectedPwaFreshnessSnippets.length,
}, null, 2));
