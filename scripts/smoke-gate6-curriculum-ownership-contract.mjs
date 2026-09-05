import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const pathModel = read('server/src/models/Path.ts');
const levelModel = read('server/src/models/Level.ts');
const subjectModel = read('server/src/models/Subject.ts');
const sectionModel = read('server/src/models/Section.ts');
const skillModel = read('server/src/models/Skill.ts');
const skillProgressModel = read('server/src/models/SkillProgress.ts');
const taxonomyRoutes = read('server/src/routes/taxonomy.routes.ts');

const checks = [];

const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};

const includes = (source, fragment) => {
  if (!source.includes(fragment)) throw new Error(`Missing fragment: ${fragment}`);
};

const excludes = (source, fragment) => {
  if (source.includes(fragment)) throw new Error(`Unexpected fragment: ${fragment}`);
};

const taxonomyDefinitions = [pathModel, levelModel, subjectModel, sectionModel, skillModel];

check('taxonomy definitions do not persist learner progress state', () => {
  for (const source of taxonomyDefinitions) {
    for (const learnerField of ['userId:', 'mastery:', 'attempts:', 'lastQuizId:', 'lastAttemptAt:', 'recommendedAction:']) {
      excludes(source, learnerField);
    }
  }
});

check('learner skill progress is persisted in its own user-scoped model', () => {
  includes(skillProgressModel, 'userId: { type: String, required: true, index: true }');
  includes(skillProgressModel, 'skillId: { type: String, required: true, index: true }');
  includes(skillProgressModel, 'mastery: { type: Number, default: 0 }');
  includes(skillProgressModel, 'attempts: { type: Number, default: 0 }');
  includes(skillProgressModel, 'skillProgressSchema.index({ userId: 1, skillId: 1 }, { unique: true });');
  includes(skillProgressModel, 'mongoose.model("SkillProgress", skillProgressSchema)');
});

check('taxonomy hierarchy keeps definition ownership explicit', () => {
  includes(levelModel, 'pathId: { type: String, required: true, index: true }');
  includes(subjectModel, 'pathId: { type: String, required: true, index: true }');
  includes(subjectModel, 'levelId: { type: String, default: null, index: true }');
  includes(sectionModel, 'subjectId: { type: String, required: true, index: true }');
  includes(skillModel, 'pathId: { type: String, required: true, index: true }');
  includes(skillModel, 'subjectId: { type: String, required: true, index: true }');
  includes(skillModel, 'sectionId: { type: String, required: true, index: true }');
});

check('skill content associations remain references rather than learner progress', () => {
  includes(skillModel, 'lessonIds: { type: [String], default: [] }');
  includes(skillModel, 'questionIds: { type: [String], default: [] }');
  excludes(skillModel, 'lessons: {');
  excludes(skillModel, 'questions: {');
});

check('subject learning-space settings are presentation/access policy, not progress metrics', () => {
  for (const flag of [
    'showCourses:',
    'showSkills:',
    'showBanks:',
    'showTests:',
    'showLibrary:',
    'lockSkillsForNonSubscribers:',
    'lockBanksForNonSubscribers:',
    'lockTestsForNonSubscribers:',
    'lockLibraryForNonSubscribers:',
  ]) {
    includes(subjectModel, flag);
  }
  excludes(subjectModel, 'mastery:');
  excludes(subjectModel, 'progress:');
});

check('taxonomy bootstrap reads taxonomy definitions without importing learner progress', () => {
  includes(taxonomyRoutes, 'import { PathModel } from "../models/Path.js";');
  includes(taxonomyRoutes, 'import { LevelModel } from "../models/Level.js";');
  includes(taxonomyRoutes, 'import { SubjectModel } from "../models/Subject.js";');
  includes(taxonomyRoutes, 'import { SectionModel } from "../models/Section.js";');
  includes(taxonomyRoutes, 'import { SkillModel } from "../models/Skill.js";');
  excludes(taxonomyRoutes, 'SkillProgressModel');
  includes(taxonomyRoutes, 'taxonomyRouter.get(\n  "/bootstrap",');
});

check('taxonomy mutations stay admin-owned', () => {
  for (const route of ['/paths', '/levels', '/subjects', '/sections']) {
    includes(taxonomyRoutes, `taxonomyRouter.post(\n  "${route}",\n  requireAuth,\n  requireRole(["admin"]),`);
  }
  includes(taxonomyRoutes, 'taxonomyRouter.post(\n  "/skills",\n  requireAuth,\n  requireRole(["admin"]),');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'gate6-curriculum-ownership',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
