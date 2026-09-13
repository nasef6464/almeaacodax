import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'server/src/routes/classroom/registerClassroomCompetitionRoutes.ts'), 'utf8');
assert.ok(source.includes('/sessions/:id/competition/end'));
assert.ok(source.includes('batch.timerEndsAt = now'));
assert.ok(source.includes('endedByTeacher: true'));
assert.ok(source.includes('podium: leaderboard.slice(0, 3)'));
console.log('Smart Classroom explicit challenge ending: PASS');
