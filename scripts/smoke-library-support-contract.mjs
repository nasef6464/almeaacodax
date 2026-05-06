import { readFile } from 'node:fs/promises';

const libraryManagerSource = await readFile(new URL('../dashboards/admin/LibraryManager.tsx', import.meta.url), 'utf8');
const learningSectionSource = await readFile(new URL('../components/LearningSection.tsx', import.meta.url), 'utf8');
const skillModalSource = await readFile(new URL('../components/SkillDetailsModal.tsx', import.meta.url), 'utf8');

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

function assertPattern(source, pattern, message) {
  if (!pattern.test(source)) {
    throw new Error(message || `Missing pattern: ${pattern}`);
  }
}

check('admin library item saves path, subject, main skill, sub-skills, and url', () => {
  assertIncludes(libraryManagerSource, 'pathId: currentSubject.pathId');
  assertIncludes(libraryManagerSource, 'subjectId');
  assertIncludes(libraryManagerSource, 'sectionId: editingItem.sectionId');
  assertIncludes(libraryManagerSource, 'skillIds: editingItem.skillIds || []');
  assertIncludes(libraryManagerSource, "url: editingItem?.url || ''");
});

check('admin library readiness requires visible approved skill-linked file', () => {
  assertIncludes(libraryManagerSource, 'getLibraryReadinessMeta');
  assertIncludes(libraryManagerSource, 'item.approvalStatus === \'approved\'');
  assertIncludes(libraryManagerSource, 'Boolean(item.url?.trim())');
  assertIncludes(libraryManagerSource, 'Boolean(item.sectionId)');
  assertIncludes(libraryManagerSource, 'Boolean((item.skillIds || []).length)');
});

check('student library only shows approved platform-visible files in the selected material', () => {
  assertIncludes(learningSectionSource, 'canStudentSeeLibraryItem');
  assertIncludes(learningSectionSource, 'item.showOnPlatform !== false');
  assertIncludes(learningSectionSource, "item.approvalStatus === 'approved'");
  assertIncludes(learningSectionSource, 'matchesScopedContent(item.pathId, item.subjectId)');
  assertPattern(
    learningSectionSource,
    /sectionLibraryItems = sectionLibraryItems\.filter\(\(item\) => \{/,
    'library items must be scoped again before rendering',
  );
});

check('learning support file details stay behind admin debug for learners', () => {
  assertIncludes(learningSectionSource, "const showPublicAdminDiagnostics = isAdminViewer && searchParams.get('adminDebug') === '1'");
  assertIncludes(learningSectionSource, 'showPublicAdminDiagnostics ? (');
  assertIncludes(learningSectionSource, 'lockedLibraryMessage');
});

check('foundation topic modal has support as a third action, not a noisy summary card', () => {
  assertIncludes(skillModalSource, "useState<'lessons' | 'quizzes' | 'support'>('lessons')");
  assertIncludes(skillModalSource, "setTopicModalTab('support')");
  assertIncludes(skillModalSource, "topicModalTab === 'support'");
  assertIncludes(skillModalSource, 'relatedLibrarySuggestions');
});

check('support file suggestions prefer the exact skill before broader section files', () => {
  assertIncludes(skillModalSource, 'const exactSkillItems =');
  assertIncludes(skillModalSource, '(item.skillIds || []).some((skillId) => activeTopicSkillIds.has(skillId))');
  assertIncludes(skillModalSource, 'exactSkillItems.length > 0 ? exactSkillItems : scopedItems');
});

for (const item of checks) {
  console.log(`${item.status} ${item.name}${item.details ? ` - ${item.details}` : ''}`);
}

const failed = checks.filter((item) => item.status === 'FAIL');
if (failed.length > 0) {
  console.error(`\n${failed.length} library support contract smoke check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} library support contract smoke checks passed.`);
