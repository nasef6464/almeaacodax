import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [];
const check = (name, fn) => checks.push({ name, fn });
const includes = (file, needle) => {
  const content = read(file);
  if (!content.includes(needle)) throw new Error(`${file} must include: ${needle}`);
};
const notIncludes = (file, needle) => {
  const content = read(file);
  if (content.includes(needle)) throw new Error(`${file} must not include: ${needle}`);
};
const mustExist = (file) => {
  if (!exists(file)) throw new Error(`${file} must exist`);
};

check('package routes stay inside package/path context', () => {
  notIncludes('pages/GenericPathPage.tsx', 'navigate(`/course/${pkg.id}`)');
  notIncludes('pages/GenericPathPage.tsx', 'to={`/course/${pkg.id}`}');
  includes('pages/GenericPathPage.tsx', 'navigate(`/category/${path.id}?tab=packages&package=${pkg.id}`)');
  includes('pages/GenericPathPage.tsx', 'navigate(`/category/${path.id}?tab=packages&subject=${packageSubjectId}&package=${pkg.id}`)');
});

check('real course routes still open real courses', () => {
  includes('components/LearningSection.tsx', 'to={`/course/${course.id}`}');
  includes('pages/CourseView.tsx', '<CoursePlayer');
  notIncludes('pages/GenericPathPage.tsx', '<CoursePlayer');
});

check('package payment and context fields are preserved', () => {
  includes('pages/GenericPathPage.tsx', "purchaseType: 'package'");
  includes('pages/GenericPathPage.tsx', 'packageId: pkg.id');
  includes('pages/GenericPathPage.tsx', 'packageContentTypes: contentTypes');
  includes('pages/GenericPathPage.tsx', 'pathIds: [path.id]');
  includes('pages/GenericPathPage.tsx', 'subjectIds: packageSubjectId ? [packageSubjectId] : []');
});

check('runtime URLs are migration-friendly', () => {
  includes('services/api.ts', 'runtimeEnv?.VITE_API_URL');
  includes('services/api.ts', '? "/api"');
  includes('App.tsx', 'VITE_PUBLIC_SITE_URL');
  notIncludes('services/api.ts', 'https://almeaacodax-k2ux.onrender.com/api');
  notIncludes('services/api.ts', 'runtimeHostname === "almeaacodax.vercel.app"');
  notIncludes('App.tsx', "const SEO_BASE_URL = 'https://almeaacodax.vercel.app'");
  notIncludes('index.html', 'https://almeaacodax-k2ux.onrender.com');
});

check('deployment and environment files exist', () => {
  [
    'deploy/hostinger/README.md',
    'deploy/hostinger/setup-server.sh',
    'deploy/hostinger/deploy.sh',
    'deploy/hostinger/nginx.conf',
    'deploy/hostinger/ecosystem.config.cjs',
    'deploy/hostinger/env.frontend.example',
    'deploy/hostinger/env.backend.example',
    'Dockerfile.frontend',
    'Dockerfile.backend',
    'docker-compose.yml',
    '.dockerignore',
    'deploy/docker/nginx.conf',
    '.env.example',
    '.env.production.example',
    'server/.env.production.example',
    'docs/ENVIRONMENT.md',
  ].forEach(mustExist);
});

check('key smoke scripts are wired', () => {
  const packageJson = read('package.json');
  includes('scripts/smoke-package-path-navigation-contract.mjs', 'active packages never fall back to course player route');
  includes('scripts/smoke-package-course-split-contract.mjs', 'package');
  if (!packageJson.includes('"smoke:package-path-navigation"')) throw new Error('smoke:package-path-navigation script missing');
  if (!packageJson.includes('"smoke:real-usage-readiness"')) throw new Error('smoke:real-usage-readiness script missing');
});

let failed = 0;
for (const item of checks) {
  try {
    item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item.name}`);
    console.error(error.message);
  }
}

if (failed) {
  console.error(`\n${failed}/${checks.length} real usage readiness checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} real usage readiness checks passed.`);
