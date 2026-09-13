import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'server/src/routes/classroom/registerClassroomTeacherRoutes.ts'), 'utf8');

assert.ok(source.includes('challengeDurationSeconds: z.number().int().min(10).max(600).optional()'));
assert.ok(source.includes('Timed challenge batches must be published immediately'));
assert.ok(source.includes('challengeQuestionIds: challengeDurationSeconds !== null ? newQuestionIds : []'));
assert.ok(source.includes('competitionEnabled: challengeDurationSeconds !== null'));
assert.ok(source.includes('timerStartedAt: challengeTimerStartedAt'));
assert.ok(source.includes('timerEndsAt: challengeTimerEndsAt'));
assert.ok(source.includes('emitClassroomEvent(classroomSessionId(session), "competition:updated"'));
assert.ok(source.includes('label: challengeDurationSeconds !== null ? `تحدي ${session.questionBatches.length + 1}`'));

console.log('Smart Classroom challenge-batch contract: PASS');
