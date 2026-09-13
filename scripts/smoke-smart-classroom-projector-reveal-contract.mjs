import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const projector = fs.readFileSync(path.join(root, 'pages/ClassroomProjectorView.tsx'), 'utf8');
const aggregate = fs.readFileSync(path.join(root, 'server/src/routes/classroom/registerClassroomAggregateRoutes.ts'), 'utf8');

assert.ok(aggregate.includes('Classroom analytics are staff-only'));
assert.ok(aggregate.includes('submissionSummary'));
assert.ok(aggregate.includes('finalizedSubmissionKeys'));
assert.ok(projector.includes("type RevealMode = 'submissions' | 'responses' | 'solution'"));
assert.ok(projector.includes("useState<RevealMode>('submissions')"));
assert.ok(projector.includes('عرض الاستجابات'));
assert.ok(projector.includes('عرض الإجابة والحل'));
assert.ok(projector.includes('إخفاء النتائج'));
assert.ok(projector.includes('الطلاب الذين سلّموا'));
assert.ok(projector.includes('بدون كشف الإجابة الصحيحة'));
assert.ok(projector.includes("revealMode === 'solution' && currentQ.correctOptionIndex === index"));

console.log('Smart Classroom projector reveal privacy contract: PASS');
