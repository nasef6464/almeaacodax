import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync('server/src/modules/schools/application/classroomStudentReport.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { buildClassroomStudentReports: build } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const questions = Array.from({ length: 6 }, (_, index) => ({ questionId: `q${index}`, skillIds: index < 3 ? ['s1', 's1'] : ['s2'] }));
const publishedQuestionIds = questions.slice(0, 5).map(q => q.questionId);
const input = { studentIds: ['complete', 'partial', 'idle', 'absent'], joinedStudentIds: new Set(['complete', 'partial', 'idle']), names: new Map(), questions, publishedQuestionIds,
  responses: [...publishedQuestionIds.map((questionId, index) => ({ studentId: 'complete', questionId, isCorrect: index < 3 })),
    { studentId: 'partial', questionId: 'q0', isCorrect: true },
    { studentId: 'partial', questionId: 'q5', isCorrect: false },
    { studentId: 'unknown', questionId: 'q0', isCorrect: true }] };
const [complete, partial, idle, absent] = build(input);
assert.deepEqual([complete.answered, complete.correct, complete.wrong, complete.unanswered, complete.accuracy], [5, 3, 2, 0, 60]);
assert.deepEqual([partial.answered, partial.wrong, partial.unanswered, partial.accuracy], [1, 0, 4, 100]);
assert.deepEqual([idle.joined, idle.accuracy, idle.wrong], [true, null, 0]);
assert.deepEqual([absent.joined, absent.accuracy, absent.unanswered], [false, null, 5]);
assert.deepEqual(complete.skills.map(s => [s.skillId, s.answered, s.correct, s.wrong]), [['s1', 3, 3, 0], ['s2', 2, 0, 2]]);
assert.equal(partial.skills[1].accuracy, null, 'unattempted skills must not become zero-score failures');
assert.equal(build({ ...input, publishedQuestionIds: [] })[0].publishedQuestions, 0);
assert.equal(build({ ...input, publishedQuestionIds: [] })[0].accuracy, null);
const duplicate = build({ ...input, studentIds: ['partial', 'partial'], responses: [input.responses[5], input.responses[5]] });
assert.equal(duplicate.length, 1); assert.equal(duplicate[0].answered, 1);
const large = build({ ...input, studentIds: Array.from({ length: 50 }, (_, i) => `student${i}`), questions: Array.from({ length: 100 }, (_, i) => ({ questionId: `q${i}`, skillIds: [`skill${i}`] })), publishedQuestionIds: Array.from({ length: 100 }, (_, i) => `q${i}`), responses: [] });
assert.equal(large.length, 50);
assert.ok(Buffer.byteLength(JSON.stringify(large)) < 1_000_000, '50-student, 100-skill evidence must remain below 1MB without duplicating question text');
console.log('PASS student outcomes, missing participation, sent-only denominator, skill evidence, no-evidence nulls, deduplication and bounded snapshot size');
