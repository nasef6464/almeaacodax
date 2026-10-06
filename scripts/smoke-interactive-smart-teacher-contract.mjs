import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [panel, teacher, aiApi, policy] = await Promise.all([
  read("components/results/QuestionAssistantPanel.tsx"),
  read("components/results/InteractiveSmartTeacher.tsx"),
  read("services/apiGroups/aiApi.ts"),
  read("server/src/modules/ai/application/questionAssistant.ts"),
]);

assert.match(panel, /المعلم الصوتي/);
assert.match(panel, /افتح المعلم الذكي/);
assert.match(panel, /InteractiveSmartTeacher/);
assert.match(panel, /tutorSessionIdRef\.current/);

assert.match(teacher, /السبورة الذكية/);
assert.match(teacher, /أبسط أكثر/);
assert.match(teacher, /مثال آخر/);
assert.match(teacher, /لماذا؟/);
assert.match(teacher, /أعد الشرح/);
assert.match(teacher, /اسأل المعلم/);
assert.match(teacher, /aiQuestionAssistant/);
assert.match(teacher, /helpLevel/);
assert.match(teacher, /SpeechSynthesisUtterance/);
assert.match(teacher, /SpeechRecognition/);
assert.match(teacher, /ar-SA/);
assert.match(teacher, /toggleListening/);
assert.match(teacher, /الدرجة والإتقان يحسبهما النظام/);
assert.ok(teacher.split(/\r?\n/).length < 400, "Interactive Smart Teacher must stay below runtime hotspot budget.");

assert.match(aiApi, /aiQuestionAssistant/);
assert.match(policy, /ممنوع تعديل الدرجة أو الإتقان/);
assert.match(policy, /follow_up/);
assert.doesNotMatch(teacher, /correctOptionIndex/);
assert.doesNotMatch(teacher, /mastery\s*=/i);
assert.doesNotMatch(teacher, /score\s*=/i);

console.log("Interactive Smart Teacher contract: PASS");
