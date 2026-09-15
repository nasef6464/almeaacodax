import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (file) => readFileSync(join(process.cwd(), file), 'utf8');
const simulation = read('server/src/scripts/simulateSmartClassroomHardeningE2E.ts');
const runbook = read('docs/architecture/SMART_CLASSROOM_LOAD_RUNBOOK_AR.md');
assert.ok(simulation.includes('SMART_CLASSROOM_LOAD_STUDENTS'));
assert.ok(simulation.includes('smart-classroom-load-metrics'));
assert.ok(simulation.includes('p95Ms'));
assert.ok(simulation.includes('p99Ms'));
assert.ok(simulation.includes('responseBytes'));
assert.ok(runbook.includes('30-students'));
assert.ok(runbook.includes('4 فصول/120'));
console.log('Performance P5 harness contract: PASS');
