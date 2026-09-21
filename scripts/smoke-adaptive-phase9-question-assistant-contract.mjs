import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const route = read('server/src/routes/ai.routes.ts');
const cache = read('server/src/models/AiQuestionAssistCache.ts');
const assistant = read('server/src/modules/ai/application/questionAssistant.ts');
const circuit = read('server/src/modules/ai/application/providerCircuitBreaker.ts');
const env = read('server/src/config/env.ts');
const api = read('services/apiGroups/aiApi.ts');
const panel = read('components/results/QuestionAssistantPanel.tsx');
const results = read('pages/Results.tsx');

assert.ok(route.includes('"/question-assistant"'));
assert.ok(route.includes('requireAuth'));
assert.ok(route.includes('QuizResultModel.findOne({ ...resultFilter, userId })'));
assert.ok(route.includes('Question is not part of this result review'));
assert.ok(route.includes('buildQuestionAssistantPrompt'));
assert.ok(route.includes('buildQuestionAssistantFallback'));
assert.ok(route.includes('AiQuestionAssistCacheModel.findOne'));
assert.ok(route.includes('withQuestionAssistantInflight'));
assert.ok(route.includes('withinQuestionAssistantMinuteLimit'));
assert.ok(route.includes('withinAiBudget(userId, schoolId || undefined)'));
assert.ok(route.includes('AI_QUESTION_ASSISTANT_MAX_OUTPUT_TOKENS'));
const questionAssistantRoute = route.slice(
  route.indexOf('"/question-assistant"'),
  route.indexOf('"/admin-assistant"', route.indexOf('"/question-assistant"')),
);
assert.ok(questionAssistantRoute.includes('imageSentToProvider: false'));
assert.ok(questionAssistantRoute.includes('callAiWithMeta(prompt, undefined, undefined'));
assert.ok(
  !questionAssistantRoute.includes('callAiWithMeta(prompt, undefined, image'),
  'question assistant must not send image bytes by default',
);
assert.ok(route.includes('getAiProviderCircuitSnapshot()'));
assert.ok(route.includes('isAiProviderCircuitOpen(provider)'));
assert.ok(route.includes('recordAiProviderFailure(provider)'));
assert.ok(route.includes('recordAiProviderSuccess(provider)'));

assert.ok(cache.includes('cacheKey: { type: String, required: true, unique: true'));
assert.ok(cache.includes('expiresAt: 1'));
assert.ok(cache.includes('expireAfterSeconds: 0'));

for (const level of ['hint','stronger_hint','concept','steps','follow_up']) {
  assert.ok(assistant.includes(level), `question assistant lost help level ${level}`);
}
assert.ok(assistant.includes('contextVersion'));
assert.ok(assistant.includes('sanitizeQuestionAssistantText'));
assert.ok(assistant.includes('[رابط صورة محجوب]'));
assert.ok(assistant.includes('createHash("sha256")'));
assert.ok(assistant.includes('const inFlight = new Map'));

assert.ok(circuit.includes('FAILURE_THRESHOLD = 3'));
assert.ok(circuit.includes('OPEN_MS = 60_000'));

for (const setting of [
  'AI_PER_SCHOOL_DAILY_LIMIT',
  'AI_QUESTION_ASSISTANT_PER_MINUTE',
  'AI_QUESTION_ASSISTANT_MAX_OUTPUT_TOKENS',
  'AI_QUESTION_ASSISTANT_CACHE_MINUTES',
]) {
  assert.ok(env.includes(setting), `missing AI setting ${setting}`);
}

assert.ok(api.includes('aiQuestionAssistant'));
assert.ok(panel.includes('ناقص هذا السؤال') === false);
assert.ok(panel.includes('ناقش هذا السؤال'));
assert.ok(panel.includes("api.aiQuestionAssistant"));
assert.ok(panel.includes("helpLevel: level"));
assert.ok(panel.includes('الصورة نفسها لا تُرسل للمساعد افتراضيًا'));
assert.ok(!panel.includes('useEffect('), 'question assistant must be explicit-click only');
assert.ok(results.includes('QuestionAssistantPanel'));
assert.ok(results.includes('hasImage={Boolean(q.imageUrl || questionHasInlineMedia)}'));

console.log(JSON.stringify({
  phase: 'adaptive-phase9-question-assistant-gateway',
  status: 'PASS',
}, null, 2));
