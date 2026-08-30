import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const utilitySource = await readFile(new URL('../utils/learningSpaceTabs.ts', import.meta.url), 'utf8');
const sectionSource = await readFile(new URL('../components/LearningSection.tsx', import.meta.url), 'utf8');

const checks = [
  ['learning tabs preserve their stable URL values', () => {
    assert.ok(utilitySource.includes("export type LearningTab = 'courses' | 'skills' | 'banks' | 'tests' | 'library';"));
    assert.ok(utilitySource.includes("foundation: 'skills'"));
    assert.ok(utilitySource.includes("practice: 'banks'"));
    assert.ok(utilitySource.includes("assessments: 'tests'"));
  }],
  ['canonical learning vocabulary adapts legacy tabs without a route rewrite', () => {
    assert.ok(utilitySource.includes("skills: 'foundation'"));
    assert.ok(utilitySource.includes("banks: 'practice'"));
    assert.ok(utilitySource.includes("tests: 'assessments'"));
  }],
  ['learning section consumes the shared tab contract', () => {
    assert.ok(sectionSource.includes("from '../utils/learningSpaceTabs'"));
    assert.ok(!sectionSource.includes('const learningTabAliases:'));
  }],
];

const failures = [];
for (const [name, run] of checks) {
  try {
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, message: error.message });
    console.log(`FAIL ${name}: ${error.message}`);
  }
}

if (failures.length) process.exitCode = 1;
