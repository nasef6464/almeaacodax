import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const headerSource = read('components/Header.tsx');
const homepageManagerSource = read('dashboards/admin/HomepageManager.tsx');
const typesSource = read('types.ts');
const modelSource = read('server/src/models/HomepageSettings.ts');
const contentRoutesSource = read('server/src/routes/content.routes.ts');
const sanitizerSource = read('utils/sanitizeMojibakeArabic.ts');

const checks = [];
const check = (name, fn) => checks.push({ name, fn });
const includes = (source, needle) => {
  if (!source.includes(needle)) throw new Error(`Missing: ${needle}`);
};
const notIncludes = (source, needle) => {
  if (source.includes(needle)) throw new Error(`Must not include: ${needle}`);
};

check('homepage settings define admin-controlled navigation', () => {
  includes(typesSource, 'export interface HomepageNavigationItem');
  includes(typesSource, 'export interface HomepageNavigationSettings');
  includes(typesSource, 'showAutoPaths?: boolean');
  includes(typesSource, 'items?: HomepageNavigationItem[]');
  includes(modelSource, 'homepageNavigationSchema');
  includes(contentRoutesSource, 'navigation: z');
  includes(contentRoutesSource, 'showAutoPaths: true');
});

check('admin homepage manager can show/hide and label top navigation items', () => {
  includes(homepageManagerSource, 'الشريط العلوي');
  includes(homepageManagerSource, 'إظهار المسارات تلقائيًا');
  includes(homepageManagerSource, 'اسم قائمة العناصر الأخرى');
  includes(homepageManagerSource, 'updateNavigationItem');
  includes(homepageManagerSource, 'updateNavigationField');
  includes(homepageManagerSource, "navigation: { ...defaultHomepageSettings.navigation, ...settings.navigation }");
});

check('public header uses saved navigation settings without breaking auto paths', () => {
  includes(headerSource, 'homepageSettings?.navigation');
  includes(headerSource, 'navSettings.showAutoPaths !== false');
  includes(headerSource, "isNavVisible('mock-exams')");
  includes(headerSource, "isNavVisible('pricing')");
  includes(headerSource, "isNavVisible('blog')");
  includes(headerSource, "id: 'more'");
  includes(headerSource, "navSettings.moreLabel?.trim() || 'أخرى'");
  includes(headerSource, 'path.showInNavbar !== false');
});

check('navigation labels are sanitized with homepage settings', () => {
  includes(sanitizerSource, 'navigation');
  includes(sanitizerSource, 'moreLabel');
  includes(sanitizerSource, 'sanitizeArabicText(item.label)');
});

check('new Arabic navigation work did not add mojibake markers', () => {
  for (const source of [headerSource, homepageManagerSource, typesSource, modelSource, contentRoutesSource]) {
    notIncludes(source, 'Ø');
    notIncludes(source, 'Ù');
    notIncludes(source, 'Ã');
    notIncludes(source, 'Â');
  }
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
  console.error(`\n${failed}/${checks.length} header navigation contract checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} header navigation contract smoke checks passed.`);
