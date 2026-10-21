import { createRequire } from 'node:module';
import { monitorEventLoopDelay } from 'node:perf_hooks';
const require = createRequire(new URL('../server/package.json', import.meta.url));
if (process.env.NODE_ENV !== 'test' || !/^mongodb:\/\/127\.0\.0\.1:\d+\/school_scale_/.test(process.env.MONGODB_URI || ''))
    throw Error('Only an owned disposable database may start this server');
const [{ connectToDatabase }, { createApp }] = await Promise.all([import('../server/dist/config/db.js'), import('../server/dist/app.js')]);
await connectToDatabase();
const app = createApp(), mongoose = require('mongoose');
const models = Object.values(mongoose.models), outcomes = await Promise.allSettled(models.map(m => m.init()));
const indexFailures = outcomes.flatMap((o, i) => o.status === 'rejected' ? [{ model: models[i].modelName, code: o.reason?.code, message: String(o.reason?.message).slice(0, 200) }] : []);
const required = new Set(['User', 'Group', 'Quiz', 'QuizResult', 'Question', 'TeachingAssignment', 'SchoolMembership', 'SchoolContract', 'SchoolSkillEvidence', 'SchoolSkillAggregate']);
if (indexFailures.some(f => required.has(f.model)))
    throw Error('Required scenario index failed: ' + JSON.stringify(indexFailures));
const server = app.listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const lag = monitorEventLoopDelay({ resolution: 20 });
lag.enable();
let baseline, peakRss = 0, peakHeap = 0;
const sample = () => { const m = process.memoryUsage(); peakRss = Math.max(peakRss, m.rss); peakHeap = Math.max(peakHeap, m.heapUsed); };
const timer = setInterval(sample, 100);
timer.unref();
process.on('message', async (m) => {
    if (m.type === 'measure-start') {
        peakRss = 0;
        peakHeap = 0;
        lag.reset();
        baseline = { cpu: process.cpuUsage(), at: performance.now() };
        sample();
        process.send?.({ type: 'measure-started' });
    }
    if (m.type === 'measure-end') {
        sample();
        const cpu = process.cpuUsage(baseline.cpu), wallMs = performance.now() - baseline.at;
        process.send?.({ type: 'metrics', wallMs, meanCpuCores: (cpu.user + cpu.system) / (wallMs * 1000), peakRssBytes: peakRss, peakHeapBytes: peakHeap, eventLoopP95Ms: lag.percentile(95) / 1e6 });
    }
    if (m.type === 'shutdown') {
        clearInterval(timer);
        lag.disable();
        await new Promise(r => server.close(r));
        await mongoose.disconnect();
        process.exit(0);
    }
});
process.send?.({ type: 'ready', base: 'http://127.0.0.1:' + server.address().port, indexFailures });
