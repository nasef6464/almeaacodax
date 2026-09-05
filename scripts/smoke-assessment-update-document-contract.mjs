import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizUpdateDocument.ts'), 'utf8').replace(/\r\n/g, '\n');
const integrationGateSource = fs.readFileSync(path.join(root, 'server/src/scripts/backendIntegrationGate.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('quiz update document builder is delegated', () => {
  assert.ok(routeSource.includes('import { buildQuizUpdateDocument } from "../modules/quizzes/application/quizUpdateDocument.js";'));
  assert.ok(routeSource.includes('buildQuizUpdateDocument(normalizedPayload as Record<string, unknown>, resolvedSkillIds)'));
  assert.ok(!routeSource.includes('...(resolvedSkillIds ? { skillIds: resolvedSkillIds } : {})'));
});

check('update document preserves payload and optional skill replacement', () => {
  for (const fragment of ['...normalizedPayload,', '...(resolvedSkillIds ? { skillIds: resolvedSkillIds } : {})']) {
    assert.ok(moduleSource.includes(fragment), `update document missing ${fragment}`);
  }
});

check('route retains sanitization, integrity, and persistence ownership', () => {
  for (const fragment of ['sanitizeWorkflowUpdate(', 'if (nextQuizState.isPublished === true)', 'validateQuizQuestionIntegrity(nextQuizState)', 'QuizModel.findOneAndUpdate(documentQuery, sanitizedPayload, { new: true })']) {
    assert.ok(routeSource.includes(fragment), `route lost ${fragment}`);
  }
});

check('update document builder stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'QuizModel', 'QuestionModel', 'requireRole', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `update document must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 20, 'quizUpdateDocument.ts exceeded 20 lines');
});

check('isolated HTTP gate preserves mock definitions on partial updates', () => {
  for (const fragment of [
    'admin partial update preserves existing mock assessment definition',
    'body: { title: "Platform V3 two-section mock assessment updated" }',
    'partialMockUpdate.body?.settings?.maxAttempts, 1',
    'partialMockUpdate.body?.mockExam?.enabled, true',
    'partialMockUpdate.body?.mockExam?.sections?.length, 2',
    'partialMockUpdate.body?.mockExam?.sections?.[1]?.questionIds?.[0], MOCK_ASSESSMENT_QUESTION_ID',
  ]) {
    assert.ok(integrationGateSource.includes(fragment), `isolated mock update gate missing ${fragment}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-update-document-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
