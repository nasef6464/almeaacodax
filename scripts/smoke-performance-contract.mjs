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
assertIncludes('index.html', 'window.tailwind.config = {');
assertIncludes('index.html', '<script src="https://cdn.tailwindcss.com"></script>');

console.log('Performance contract passed: heavy video player is lazy-loaded from student-facing entrypoints.');
