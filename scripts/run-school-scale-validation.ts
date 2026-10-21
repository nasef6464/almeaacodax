import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fork, execFileSync } from 'node:child_process';
import { schoolScaleFixture, mongoose, validateScaleMongoService } from './school-scale-fixture.js';
const args = process.argv.slice(2);
if (args.some(a => !['--quick', '--full'].includes(a)) || args.length > 1)
    throw Error('Only --quick or --full; external targets are never accepted');
validateScaleMongoService(process.env.ASSESSMENT_TEST_MONGODB_URI);
const full = args.includes('--full'), file = 'scratch/school-scale-' + (full ? 'full' : 'quick') + '.json';
fs.mkdirSync('scratch', { recursive: true });
const receipt: any = { status: 'RUNNING', kind: 'isolated-school-scale', startedAt: new Date().toISOString(), baseline: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), productionRequests: 0, providerCalls: 0, hardware: { cpuCount: os.cpus().length, totalMemoryBytes: os.totalmem(), freeMemoryBytes: os.freemem() }, limits: 'Loopback synthetic data on this workstation; not Render capacity,10k concurrent students,login load,CDN/media bandwidth or a real school pilot.', profiles: [], thresholds: { readP95Ms: 2000, submitP95Ms: 3000, maxErrorRate: 0.02 }, configuration: { apiHeapMB: 384, mongoCacheGB: 0.25, apiMongoPool: 30, globalRateLimitPerMinute: 600, redis: false } };
const digest = (directory: string): string => {
    const hash = createHash('sha256');
    const walk = (dir: string) => {
        for (const item of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const name = path.join(dir, item.name);
            if (item.isDirectory())
                walk(name);
            else {
                hash.update(path.relative(directory, name));
                hash.update(fs.readFileSync(name));
            }
        }
    };
    walk(directory);
    return hash.digest('hex');
};
const save = () => fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n');
save();
let fixture: any, child: any;
async function wait(type: string) {
    return new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => { child.off('message', on); reject(Error('Child timeout ' + type)); }, 180000);
        const on = (m: any) => {
            if (m.type === type) {
                clearTimeout(timer);
                child.off('message', on);
                child.off('exit', exit);
                resolve(m);
            }
        };
        const exit = (code: any) => { clearTimeout(timer); child.off('message', on); reject(Error('Child exited ' + code)); };
        child.on('message', on);
        child.once('exit', exit);
    });
}
try {
    const harnessHash = () => Object.fromEntries(['run-school-scale-validation.ts', 'school-scale-fixture.ts', 'school-scale-server.mjs'].map(name => [name, createHash('sha256').update(fs.readFileSync('scripts/' + name)).digest('hex')]));
    const loadedHarness = harnessHash();
    const sourceHash = digest('server/src'), buildFile = 'scratch/school-scale-build-receipt.json';
    const cached = fs.existsSync(buildFile) ? JSON.parse(fs.readFileSync(buildFile, 'utf8')) : null;
    if (cached?.sourceSha256 === sourceHash && fs.existsSync('server/dist') && cached.compiledSha256 === digest('server/dist'))
        receipt.build = { ...cached, reusedVerifiedBuild: true };
    else {
        const buildStarted = Date.now(), output = fs.openSync('scratch/school-scale-build.log', 'w'), errors = fs.openSync('scratch/school-scale-build-errors.log', 'w');
        try {
            execFileSync(process.execPath, ['server/node_modules/typescript/bin/tsc', '-p', 'server/tsconfig.json'], { stdio: ['ignore', output, errors] });
        }
        finally {
            fs.closeSync(output);
            fs.closeSync(errors);
        }
        assert.equal(digest('server/src'), sourceHash, 'Backend source changed during build');
        receipt.build = { command: 'tsc -p server/tsconfig.json', exitCode: 0, durationMs: Date.now() - buildStarted, sourceSha256: sourceHash, compiledSha256: digest('server/dist') };
        fs.writeFileSync(buildFile, JSON.stringify(receipt.build));
    }
    assert.deepEqual(harnessHash(), loadedHarness, 'Harness changed during build');
    receipt.build.harness = loadedHarness;
    save();
    fixture = await schoolScaleFixture();
    receipt.configuration.mongoCacheGB = fixture.mongoCacheGB;
    const { signAccessToken } = await import('../server/src/utils/jwt.js');
    const token = (actor: any) => signAccessToken({ id: String(actor._id || actor), role: actor.role || 'student' } as any);
    const first = await fixture.addSchool(full ? 1000 : 200);
    console.log('Seeded stage1: ' + first.size + ' learners, ' + first.size * 10 + ' historical results');
    child = fork(path.resolve('scripts/school-scale-server.mjs'), { execArgv: ['--max-old-space-size=384'], env: { ...process.env, MONGODB_MAX_POOL_SIZE: '30', MONGODB_MIN_POOL_SIZE: '2', GIT_COMMIT_SHA: receipt.baseline }, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
    const logs = fs.createWriteStream('scratch/school-scale-' + (full ? 'full' : 'quick') + '-server.log');
    child.stdout.pipe(logs);
    child.stderr.pipe(logs);
    const ready = await wait('ready');
    receipt.startupIndexFailures = ready.indexFailures;
    assert.match(ready.base, /^http:\/\/127\.0\.0\.1:\d+$/);
    const base = ready.base;
    const request = async (route: string, actor: any, body?: any) => {
        const started = performance.now();
        try {
            const r = await fetch(base + '/api' + route, { method: body ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + token(actor), ...(body ? { 'content-type': 'application/json', cookie: 'almeaa_csrf_token=scale-only', 'x-csrf-token': 'scale-only' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
            const text = await r.text();
            let data: any;
            try {
                data = JSON.parse(text);
            }
            catch {
                data = { error: 'non-json' };
            }
            return { status: r.status, ms: performance.now() - started, bytes: Buffer.byteLength(text), data };
        }
        catch (e: any) {
            return { status: 0, ms: performance.now() - started, bytes: 0, data: { error: e.name } };
        }
    };
    const routes = (school: any) => [
        { kind: 'report', route: `/school-assessments/${school.quizId}/report`, actor: school.supervisor, check: (b: any) => { assert.equal(b.audience.targeted, school.size); assert.equal(b.participation.completed, school.size); assert.equal(b.scores.average, 56); assert.equal(b.subjectBreakdowns.length, 2); } },
        { kind: 'learners', route: `/school-assessments/${school.quizId}/learners?limit=12`, actor: school.supervisor, check: (b: any) => { assert.equal(b.pagination.total, school.size); assert.equal(b.learners.length, 12); assert.equal(b.learners[0].result.attemptNumber, 2); } },
        { kind: 'support', route: `/school-assessments/${school.quizId}/learners?limit=12&status=needs_support`, actor: school.supervisor, check: (b: any) => assert.equal(b.pagination.total, school.size * 0.4) },
        { kind: 'readiness', route: '/quizzes/results/learning-evidence?source=school_assessment&subjectId=scale-math&days=30&limit=12', actor: school.supervisor, check: (b: any) => { assert.equal(b.total, school.size); assert.equal(b.summary.support, school.size * 0.4); assert.equal(b.summary.ready, school.size * 0.4); assert.equal(b.students.length, 12); } },
        { kind: 'history', route: '/quiz-results/my?limit=12', actor: school.ids[school.size - 1], check: (b: any) => { assert.equal(b.pagination.total, 10); assert.equal(b.data.length, 10); assert.ok(b.data.every((r: any) => r.userId === school.ids[school.size - 1])); } },
    ];
    async function profile(concurrency: number, writes: number) {
        const count = full ? 100 : 25, reads = Array.from({ length: count }, (_, i) => routes(fixture.schools[Math.floor(i / 5) % fixture.schools.length])[i % 5]);
        const submissions: any[] = [];
        for (let i = 0; i < writes; i++)
            submissions.push({ kind: 'submit', route: '/quizzes/scale-live/submit', actor: first.ids[i], body: { answers: Object.fromEntries(Array.from({ length: 10 }, (_, j) => ['scale-q' + j, 0])), source: 'school', timeSpentSeconds: 10 }, check: (b: any) => { assert.equal(b.score, 100); assert.equal(b.learningContext, 'school_assessment'); } } as any);
        const jobs: any[] = [];
        for (let i = 0; i < reads.length; i++) {
            jobs.push(reads[i]);
            if (i % 2 === 0 && submissions.length)
                jobs.push(submissions.shift());
        }
        jobs.push(...submissions);
        let activeReads = 0, activeWrites = 0, overlappingWrites = 0;
        let next = 0;
        const samples: any[] = [];
        const started = wait('measure-started');
        child.send({ type: 'measure-start' });
        await started;
        await Promise.all(Array.from({ length: concurrency }, async () => {
            while (next < jobs.length) {
                const job: any = jobs[next++];
                if (job.kind === 'submit') {
                    activeWrites++;
                    if (activeReads)
                        overlappingWrites++;
                }
                else
                    activeReads++;
                const r = await request(job.route, job.actor, job.body);
                if (job.kind === 'submit')
                    activeWrites--;
                else
                    activeReads--;
                let error;
                try {
                    assert.equal(r.status, job.kind === 'submit' ? 201 : 200, JSON.stringify(r.data));
                    job.check(r.data);
                }
                catch (e: any) {
                    error = e.message.slice(0, 240);
                }
                samples.push({ kind: job.kind, status: r.status, ms: Math.round(r.ms), bytes: r.bytes, ...(error ? { error } : {}) });
            }
        }));
        const ended = wait('metrics');
        child.send({ type: 'measure-end' });
        const metrics = await ended;
        const kinds = [...new Set(samples.map(s => s.kind))].map(kind => { const rows = samples.filter(s => s.kind === kind), times = rows.map(r => r.ms).sort((a, b) => a - b), percent = (p: number) => times[Math.ceil(times.length * p) - 1]; return { kind, requests: rows.length, failures: rows.filter(r => r.error).length, p50Ms: percent(.5), p95Ms: percent(.95), p99Ms: percent(.99), responseBytes: rows.reduce((n, r) => n + r.bytes, 0) }; });
        const p = { learners: fixture.schools.reduce((n: number, s: any) => n + s.size, 0), historicalResults: await fixture.models.QuizResultModel.countDocuments({ quizId: { $ne: 'scale-live' } }), schools: fixture.schools.length, schoolSkillEvidence: await fixture.models.SchoolSkillEvidenceModel.countDocuments({ source: 'school' }), schoolSkillAggregates: await fixture.models.SchoolSkillAggregateModel.countDocuments(), concurrency, overlappingWrites, requests: samples.length, kinds, metrics, failures: samples.filter(s => s.error) };
        receipt.profiles.push(p);
        save();
        console.log(JSON.stringify(p));
    }
    // Warm reads are verified, counted separately and excluded from latency profiles.
    for (const route of routes(first)) {
        const r = await request(route.route, route.actor);
        assert.equal(r.status, 200, JSON.stringify(r.data));
        route.check(r.data);
    }
    receipt.verifiedWarmReads = 5;
    await profile(full ? 5 : 2, 0);
    if (full) {
        for (let i = 1; i < 10; i++) {
            await fixture.addSchool(1000);
            console.log('Seeded schools ' + fixture.schools.length);
        }
        await profile(5, 0);
    }
    await fixture.enableLive();
    await profile(full ? 20 : 5, full ? 50 : 10);
    // Diagnose one real readiness pipeline after timing; profiling stays in this disposable DB.
    await mongoose.connection.db.command({ profile: 2 });
    try {
        await request(routes(first)[3].route, first.supervisor);
    }
    finally {
        await mongoose.connection.db.command({ profile: 0 });
    }
    const diagnostics: any[] = [];
    for (const collection of [fixture.models.UserModel.collection.name, fixture.models.QuizResultModel.collection.name]) {
        const filter = { 'command.aggregate': collection };
        const traced = await mongoose.connection.db.collection('system.profile').find(filter).sort({ ts: -1 }).limit(1).next();
        if (!traced)
            continue;
        const explanation = await mongoose.connection.db.command({ explain: { aggregate: traced.command.aggregate, pipeline: traced.command.pipeline, cursor: {}, allowDiskUse: true, maxTimeMS: 20000 }, verbosity: 'executionStats' });
        const stages: any[] = [];
        const collect = (v: any) => { if (!v || typeof v !== 'object')
            return; if (v.executionStats)
            stages.push({ type: 'cursor', ...Object.fromEntries(['nReturned', 'executionTimeMillis', 'totalDocsExamined', 'totalKeysExamined'].map(k => [k, v.executionStats[k]])) }); if (v.$lookup && v.indexesUsed)
            stages.push({ type: 'lookup', from: v.$lookup.from, totalDocsExamined: v.totalDocsExamined, totalKeysExamined: v.totalKeysExamined, collectionScans: v.collectionScans, indexesUsed: v.indexesUsed }); for (const [k, child] of Object.entries(v))
            if (k !== 'executionStats')
                collect(child); };
        collect(explanation);
        diagnostics.push({ collection, aggregateCommands: await mongoose.connection.db.collection('system.profile').countDocuments(filter), profileMillis: traced.millis, stages });
    }
    receipt.readinessDiagnostic = { queries: diagnostics };
    save();
    const expected = full ? 50 : 10, stored = await fixture.models.QuizResultModel.find({ quizId: 'scale-live' }).select('userId score learningContext').lean();
    assert.equal(stored.length, expected);
    assert.equal(new Set(stored.map((r: any) => r.userId)).size, expected);
    assert.ok(stored.every((r: any) => r.score === 100 && r.learningContext === 'school_assessment'));
    const after = await request('/school-assessments/scale-live/report', first.supervisor);
    assert.equal(after.status, 200);
    assert.equal(after.data.participation.completed, expected);
    assert.equal(after.data.audience.targeted, first.size);
    const teacher = await request(`/school-assessments/${first.quizId}/report`, first.teacher);
    assert.equal(teacher.status, 200);
    assert.equal(teacher.data.audience.targeted, 25);
    const director = await request(`/school-assessments/${first.quizId}/report?schoolId=${first.schoolId}`, first.director);
    assert.equal(director.status, 200);
    assert.equal(director.data.audience.targeted, first.size);
    if (full) {
        const foreign = await request(`/school-assessments/${first.quizId}/report`, fixture.schools[1].supervisor);
        assert.equal(foreign.status, 404);
    }
    const evidenceCount = await fixture.models.SchoolSkillEvidenceModel.countDocuments();
    assert.equal(evidenceCount, first.size * (full ? 10 : 1) * 40 + expected * 2);
    for (let i = 0; i < expected; i++) {
        const userId = first.ids[i], historicalCorrect = 25 + 5 * [0, 2, 3, 4, 5][i % 5];
        for (const subject of ['math', 'science'])
            for (let k = 0; k < 2; k++) {
                const scope = { userId, pathId: 'scale-path', subjectId: 'scale-' + subject, skillId: `scale-${subject}-${k}` }, isMath = subject === 'math';
                const a = await fixture.models.SchoolSkillAggregateModel.findOne({ ...scope, schoolId: first.schoolId, classId: '' }).lean();
                assert.ok(a, 'Missing persisted school aggregate');
                assert.equal(a.attemptCount, isMath ? 11 : 10);
                assert.equal(a.totalEvidence, isMath ? 55 : 50);
                assert.equal(a.totalCorrect, historicalCorrect + (isMath ? 5 : 0));
                const p = await fixture.models.SkillProgressModel.findOne(scope).lean();
                assert.ok(p, 'Missing persisted skill progress');
                assert.equal(p.attempts, isMath ? 11 : 10);
                assert.equal(p.evidenceCount, isMath ? 55 : 50);
            }
    }
    assert.deepEqual(harnessHash(), loadedHarness, 'Harness changed while measured');
    assert.equal(digest('server/src'), sourceHash, 'Backend changed while measured');
    assert.equal(digest('server/dist'), receipt.build.compiledSha256, 'Compiled backend changed while measured');
    receipt.integrity = { verifiedAggregateAndProgressRows: expected * 4, schoolSkillEvidence: evidenceCount, newGradedResults: expected, uniqueSubmittingStudents: expected, allNewScores: 100, schoolReportCompleted: expected, teacherAudience: 25, directorAudience: first.size, foreignSchoolDenied: full };
    receipt.database = await mongoose.connection.db.stats();
    delete receipt.database.db;
    receipt.thresholdFailures = receipt.profiles.flatMap((p: any) => p.kinds.filter((k: any) => k.failures / k.requests >= .02 || k.p95Ms > (k.kind === 'submit' ? 3000 : 2000)).map((k: any) => ({ learners: p.learners, concurrency: p.concurrency, ...k })));
    receipt.status = receipt.thresholdFailures.length ? 'THRESHOLD_FAIL' : 'ISOLATED_SCENARIO_PASS';
    receipt.finishedAt = new Date().toISOString();
    save();
    assert.equal(receipt.thresholdFailures.length, 0, 'See preserved per-kind latency/error evidence in ' + file);
    console.log('PASS scoped correctness and bounded school workload; not production capacity certification');
}
catch (error: any) {
    receipt.status = receipt.thresholdFailures?.length ? 'THRESHOLD_FAIL' : 'FAIL';
    receipt.error = String(error.message).slice(0, 500);
    save();
    throw error;
}
finally {
    if (child?.connected) {
        child.send({ type: 'shutdown' });
        await new Promise<void>(resolve => { const timer = setTimeout(() => { child.kill(); resolve(); }, 5000); child.once('exit', () => { clearTimeout(timer); resolve(); }); });
    }
    if (fixture)
        await fixture.close();
}
