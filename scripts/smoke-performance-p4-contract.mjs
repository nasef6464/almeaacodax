import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (file) => readFileSync(join(process.cwd(), file), 'utf8');
const studentRoutes = read('server/src/routes/classroom/registerClassroomStudentRoutes.ts');
const teacherRoutes = read('server/src/routes/classroom/registerClassroomTeacherRoutes.ts');
const api = read('services/api.ts');
const teacher = read('pages/ClassroomTeacherConsole.tsx');
assert.equal(studentRoutes.includes('countDocuments({ sessionId: classroomSessionId(session), questionId: question.questionId })'), false, 'answer hot path must not count responses');
assert.ok(teacherRoutes.includes('.skip((page - 1) * limit).limit(limit + 1)'), 'question bank needs bounded pagination');
assert.equal(teacherRoutes.includes('explanation ownerType ownerId'), false, 'bank list must not ship explanation and ownership fields');
assert.ok(api.includes('hasMore: boolean'), 'client contract must expose the next-page signal');
assert.ok(teacher.includes('loadQuestions(questionPage + 1)'), 'teacher UI must allow loading the next page');
console.log('Performance P4 contract: PASS');
