import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

const routes = read('server/src/routes/quiz.routes.ts');
const schemas = read('server/src/modules/quizzes/http/submissionSchemas.ts');
const resultModel = read('server/src/models/QuizResult.ts');
const documentQuery = read('server/src/modules/quizzes/infrastructure/quizDocumentQuery.ts');
const readModel = read('server/src/modules/quizzes/application/quizSubmissionReadModelContext.ts');
const telemetry = read('server/src/modules/quizzes/http/adaptiveTelemetryRoutes.ts');
const sideEffects = read('server/src/modules/quizzes/application/quizSubmissionSideEffects.ts');
const api = read('services/apiGroups/quizzesApi.ts');
const quizPage = read('pages/Quiz.tsx');
const reports = read('pages/Reports.tsx');

const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({
      name,
      status: 'FAIL',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

const includes = (source, fragment) =>
  assert.ok(source.includes(fragment), `Missing fragment: ${fragment}`);

check('self assessment has a bounded authenticated server submission contract', () => {
  includes(schemas, 'export const selfAssessmentSubmitSchema = z.object({');
  includes(schemas, 'questionIds: z.array(z.string().min(1)).min(1).max(20)');
  includes(schemas, 'evidenceType: quizEvidenceTypeSchema.default("assessment")');
  includes(routes, '"/self-assessment/submit"');
  includes(routes, 'requireAuth');
});

check('server reloads questions and refuses scope/content mismatches', () => {
  includes(routes, 'QuestionModel.find(buildDocumentsByIdsQuery(requestedQuestionIds)).lean()');
  includes(routes, 'resolveOrderedQuizQuestions(requestedQuestionIds, questions)');
  includes(routes, '!isQuestionContentUsable(question)');
  includes(routes, 'questionPathId !== payload.pathId');
  includes(routes, 'questionSubjectId !== payload.subjectId');
  includes(routes, '!matchesRequestedSkill');
  assert.ok(!routes.includes('score: payload.score'), 'server must not trust a client score');
});

check('server calculates authoritative evidence and persists an idempotent result', () => {
  includes(routes, 'buildQuizSubmissionAnswerReview({');
  includes(routes, 'buildQuizSubmissionSkillsAnalysis({');
  includes(routes, 'buildQuizSubmissionScoreSummary({');
  includes(routes, 'const submissionKey = `self-assessment:${userId}:${payload.submissionId}`');
  includes(routes, 'QuizResultModel.findOne({ submissionKey })');
  includes(routes, 'QuizResultModel.create(');
  includes(routes, 'evidenceType: payload.evidenceType');
  includes(routes, 'runQuizSubmissionSideEffects({');
});

check('embedded subskills resolve as first-class submission skill identities', () => {
  includes(documentQuery, 'export const buildSkillDocumentsByIdsQuery = (values: string[]) =>');
  includes(documentQuery, '{ "subSkills.id": { $in: ids } }');
  includes(readModel, 'const expandSkillRows = (skills: any[]) =>');
  includes(readModel, 'parentSkillId: parentId');
  includes(readModel, 'pathId: String(skill.pathId || "")');
  includes(routes, 'SkillModel.find(buildSkillDocumentsByIdsQuery(skillIds)).lean()');
});

check('standalone question-attempt fallback preserves embedded subskill identity', () => {
  includes(sideEffects, 'const buildSkillDocumentsByIdsQuery = (values: string[]) =>');
  includes(sideEffects, '{ "subSkills.id": { $in: ids } }');
  includes(sideEffects, 'const expandRequestedSkillRows = (skillDocuments: any[], requestedSkillIds: string[]) =>');
  includes(sideEffects, 'parentSkillId: parentId');
  includes(sideEffects, 'const skills = expandRequestedSkillRows(skillDocuments, skillIds)');
});

check('result model and summaries carry evidence type', () => {
  includes(resultModel, 'evidenceType:');
  includes(resultModel, '"assessment", "remediation", "recheck", "mastery_review"');
  includes(api, "evidenceType?: 'assessment' | 'remediation' | 'recheck' | 'mastery_review'");
  includes(api, 'submitSelfAssessment: (payload: {');
});

check('authenticated self quiz submits once at completion rather than per-answer mastery updates', () => {
  includes(quizPage, 'const hasAuthoritativeSession = Boolean(');
  includes(quizPage, 'if (!hasAuthoritativeSession) {');
  includes(quizPage, 'recordQuestionAttempt({');
  includes(quizPage, 'if (hasAuthoritativeSession) {');
  includes(quizPage, 'await api.submitSelfAssessment({');
  includes(quizPage, 'evidenceType: selfEvidenceType');
  includes(quizPage, 'saveExamResult(serverResult)');
});

check('self quiz keeps canonical/legacy subject compatibility', () => {
  includes(quizPage, '(question.subjectId || question.subject) === selectedSubjectId');
  includes(telemetry, '"id pathId subject subjectId sectionId skillIds correctOptionIndex"');
});

check('completed quiz evidence takes precedence over per-question fallback in reports', () => {
  includes(reports, 'studentEvidenceWindow.recentExamResults.length > 0');
  includes(reports, '? []');
  includes(reports, ': studentEvidenceWindow.pathScopedQuestionAttempts');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'adaptive-server-recheck',
  status: failed.length ? 'FAIL' : 'PASS',
  checks,
}, null, 2));

if (failed.length) process.exit(1);
