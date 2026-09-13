import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const teacherRoutes = fs.readFileSync(path.join(root, 'server/src/routes/classroom/registerClassroomTeacherRoutes.ts'), 'utf8');
const teacherPanel = fs.readFileSync(path.join(root, 'components/classroom/ClassroomActiveSessionPanel.tsx'), 'utf8');

assert.ok(teacherRoutes.includes('challengeDurationSeconds: z.number().int().min(10).max(600).optional()'));
assert.ok(teacherRoutes.includes('Timed challenge batches must be published immediately'));
assert.ok(teacherRoutes.includes('challengeQuestionIds: challengeDurationSeconds !== null ? newQuestionIds : []'));
assert.ok(teacherRoutes.includes('competitionEnabled: challengeDurationSeconds !== null'));
assert.ok(teacherRoutes.includes('timerStartedAt: challengeTimerStartedAt'));
assert.ok(teacherRoutes.includes('timerEndsAt: challengeTimerEndsAt'));
assert.ok(teacherRoutes.includes('emitClassroomEvent(classroomSessionId(session), "competition:updated"'));
assert.ok(teacherRoutes.includes('label: challengeDurationSeconds !== null ? `تحدي ${session.questionBatches.length + 1}`'));

assert.ok(teacherPanel.includes("type PushMode = 'normal' | 'challenge'"));
assert.ok(teacherPanel.includes("openPushModal('challenge')"));
assert.ok(teacherPanel.includes('challengeDurationSeconds: pushChallengeSeconds'));
assert.ok(teacherPanel.includes('إنشاء دفعة تحدي مستقلة'));
assert.ok(teacherPanel.includes('<option value={30}>30 ث</option>'));
assert.ok(teacherPanel.includes('<option value={90}>90 ث</option>'));
assert.ok(!teacherPanel.includes('handleInstantChallenge'));

console.log('Smart Classroom challenge-batch contract: PASS');
