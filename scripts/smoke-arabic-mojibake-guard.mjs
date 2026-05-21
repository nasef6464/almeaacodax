import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const checkedFiles = [
  'App.tsx',
  'pages/CourseView.tsx',
  'server/src/routes/seo.routes.ts',
];

const badPatterns = [
  { name: 'UTF-8 mojibake marker', pattern: /[ÃØÙ][^\n\r]*[ÃØÙ]/ },
  { name: 'placeholder question marks', pattern: /\?{4,}/ },
];

const expectedArabicSnippets = [
  { file: 'App.tsx', text: 'منصة المئة | قدرات وتحصيلي' },
  { file: 'App.tsx', text: 'منصة تعليمية عربية للقدرات والتحصيلي' },
  { file: 'pages/CourseView.tsx', text: 'لم نتمكن من فتح الدورة' },
  { file: 'pages/CourseView.tsx', text: 'إصدار الشهادة' },
  { file: 'server/src/routes/seo.routes.ts', text: 'الصفحة الرئيسية' },
  { file: 'server/src/routes/seo.routes.ts', text: 'منصة المئة' },
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

if (failures.length > 0) {
  console.error(JSON.stringify({ total: failures.length, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  total: checkedFiles.length,
  passed: checkedFiles.length,
  checkedFiles,
  expectedArabicSnippets: expectedArabicSnippets.length,
}, null, 2));
