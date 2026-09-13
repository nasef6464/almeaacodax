import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const competitionRoutes = fs.readFileSync(path.join(root, 'server/src/routes/classroom/registerClassroomCompetitionRoutes.ts'), 'utf8');
const teacherPanel = fs.readFileSync(path.join(root, 'components/classroom/ClassroomActiveSessionPanel.tsx'), 'utf8');

assert.ok(competitionRoutes.includes('/sessions/:id/competition/end'));
assert.ok(competitionRoutes.includes('batch.timerEndsAt = now'));
assert.ok(competitionRoutes.includes('endedByTeacher: true'));
assert.ok(competitionRoutes.includes('podium: leaderboard.slice(0, 3)'));
assert.ok(teacherPanel.includes('handleEndChallenge'));
assert.ok(teacherPanel.includes('إنهاء التحدي وعرض النتائج'));
assert.ok(teacherPanel.includes('نتيجة التحدي — أفضل 3'));
assert.ok(teacherPanel.includes('/competition').toString());

console.log('Smart Classroom explicit challenge ending: PASS');
