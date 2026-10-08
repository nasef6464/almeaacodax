/** Bounded, authenticated post-deploy audit. Never creates questions/results/review cards. */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { validateTeachingStoryboard } from '../server/src/modules/ai/contracts/teachingStoryboard';
const require = createRequire(new URL('../server/package.json', import.meta.url));
const argument = (name: string) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const credentialPath = argument('credentials');
const expected = argument('expected-sha');
const base = (argument('api-base') || 'https://almeaacodax.vercel.app/api').replace(/\/$/, '');
const out = argument('output') || 'scratch/teaching-board-live.json';
if (!credentialPath || !expected) throw new Error('--credentials and --expected-sha are required');
if (!base.startsWith('https://') && !/^http:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(base)) throw new Error('Use HTTPS or a local API');
const credentials = require('dotenv').parse(fs.readFileSync(credentialPath));
const email = credentials.ROLE_ADMIN_EMAIL || credentials.ADMIN_EMAIL;
const password = credentials.ROLE_ADMIN_PASSWORD || credentials.ADMIN_PASSWORD;
if (!email || !password) throw new Error('Configured audit credentials unavailable');
const run = `board-audit-${Date.now()}`;
const cookie = (response: Response) => response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
async function request(route: string, options: RequestInit = {}) {
  const response = await fetch(base + route, { ...options, signal: AbortSignal.timeout(45000) });
  return { status: response.status, body: await response.json(), cookie: cookie(response) };
}
const health = await request('/health/live');
const actual = String(health.body.commit || '');
if (health.status !== 200 || !actual || !(expected.startsWith(actual) || actual.startsWith(expected))) throw new Error('Exact release identity is not live');
const csrf = await request('/auth/csrf-token');
const login = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.body.csrfToken, cookie: csrf.cookie }, body: JSON.stringify({ email, password }) });
if (login.status !== 200 || login.body.user?.role !== 'admin') throw new Error('Audit admin login unavailable');
const headers = { 'Content-Type': 'application/json', 'x-csrf-token': csrf.body.csrfToken, cookie: [csrf.cookie, login.cookie].join('; ') };
const library = await request('/review/library?tab=all&limit=20', { headers });
const target = library.body.items?.find((item: any) => (item.reasons?.saved || item.reasons?.mistake) &&
  (item.question?.voiceExplanation?.text || item.question?.hint || item.question?.solvingStrategy || item.question?.explanation));
if (library.status !== 200 || !target) throw new Error('No existing owned review with a trusted explanation; no production record was created');
const context = target.reasons.saved ? 'saved_review' : 'mistake_review';
const report: any = { run, expected, actual, boundary: 'Existing owned review only; AI interaction/cache/usage writes are normal endpoint behavior. No grades, questions or review cards changed.', cases: [] };
let boardContext = '';
for (const [id, message] of [
  ['arabic-lesson', 'اشرح السؤال بالعربية بخطوات قصيرة مع تدريب قبل الحل.'],
  ['attempt-feedback', 'راجع محاولتي: استخدمت الجمع بدل العملية المطلوبة. وضح موضع الخطأ وأعطني تلميحاً دون كشف الحل النهائي.'],
  ['english-lesson', 'Explain this question in English using short steps and a practice checkpoint.'],
]) {
  const start = Date.now();
  const response = await request('/ai/question-assistant', { method: 'POST', headers, body: JSON.stringify({ context, questionId: target.questionId, helpLevel: id === 'attempt-feedback' ? 'follow_up' : 'steps', message, tutorSessionId: `${run}:${id}`, boardMode: 'storyboard_v1', ...(id === 'attempt-feedback' ? { boardContext } : {}) }) });
  const plan = validateTeachingStoryboard(response.body.storyboard);
  report.cases.push({ id, http: response.status, latencyMs: Date.now() - start, provider: response.body.provider, model: response.body.model, usedFallback: response.body.usedFallback, cached: response.body.cached, validPlan: !!plan, language: plan?.language, storyboard: plan, text: String(response.body.text || '').slice(0,4000) });
  console.log(JSON.stringify({ id, http: response.status, validPlan: !!plan, latencyMs: Date.now() - start, provider: response.body.provider, usedFallback: response.body.usedFallback }));
  if (response.status !== 200 || response.body.usedFallback || !plan) break;
  const scene = plan.scenes.find(value => value.checkpoint) || plan.scenes[0];
  boardContext = JSON.stringify({ scene: scene.id, narration: scene.narration, practice: scene.checkpoint?.prompt }).slice(0,1200);
}
const usage = await request('/ai/interactions?limit=20', { headers });
report.usage = (usage.body.items || []).filter((item: any) => String(item.metadata?.tutorSessionId || '').startsWith(run)).map((item: any) => ({ provider: item.provider, inputTokens: item.inputTokens, outputTokens: item.outputTokens, totalTokens: item.totalTokens, estimatedCostMicrosUsd: item.estimatedCostMicrosUsd, pricingKnown: item.pricingKnown, usageEstimated: item.usageEstimated, latencyMs: item.latencyMs, diagnostics: item.metadata?.teachingPlanDiagnostics }));
report.acceptance = {
  threeCompleteResponses: report.cases.length === 3 && report.cases.every((item: any) => item.validPlan && !item.usedFallback),
  english: report.cases[2]?.language === 'en-US',
  practiceBeforeSolution: [report.cases[0], report.cases[2]].every(item => item?.storyboard?.scenes.length === 2 && item.storyboard.scenes[0].checkpoint?.hints.length === 2 && !item.storyboard.scenes[1].checkpoint),
  feedbackWithoutNewPractice: report.cases[1]?.storyboard?.scenes.length === 1 && !report.cases[1].storyboard.scenes[0].checkpoint,
  actualUsageBounded: report.usage.length === 3 && report.usage.every((item: any) => !item.usageEstimated && item.outputTokens > 0 && item.outputTokens <= 450),
};
report.passed = Object.values(report.acceptance).every(Boolean);
report.manualReviewRequired = ['Reference correctness and hint leakage', 'Audible phone/tablet voice and microphone quality'];
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.passed, report: out, usageRecords: report.usage.length }));
if (!report.passed) process.exitCode = 1;
