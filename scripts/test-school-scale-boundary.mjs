import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const run = args => spawnSync(process.execPath, ['--import', './server/node_modules/tsx/dist/loader.mjs', 'scripts/run-school-scale-validation.ts', ...args], { encoding: 'utf8', timeout: 15000 });
for (const args of [['--base-url', 'https://example.invalid'], ['--quick', '--full'], ['--full', '--full']]) {
    const r = run(args);
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes('Only --quick or --full'), 'Invalid targets/profiles must fail before creating a database or issuing HTTP');
}
const badDb = spawnSync(process.execPath, ['--import', './server/node_modules/tsx/dist/loader.mjs', 'scripts/run-school-scale-validation.ts', '--quick'], { encoding: 'utf8', timeout: 15000, env: { ...process.env, ASSESSMENT_TEST_MONGODB_URI: 'mongodb://example.invalid/existing_database' } });
assert.equal(badDb.status, 1);
assert.ok(badDb.stderr.includes('Only disposable loopback Mongo service allowed'));
console.log('PASS school scale boundary: external HTTP/DB and ambiguous profiles refused before workload');
