import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [panel, board, aiApi, aiRoutes, reference] = await Promise.all([
  read("components/results/QuestionAssistantPanel.tsx"),
  read("components/results/SmartTeacherBoard.tsx"),
  read("services/apiGroups/aiApi.ts"),
  read("server/src/routes/ai.routes.ts"),
  read("docs/architecture/QUESTION_REVIEW_SMART_TUTOR_REFERENCE_AR.md"),
]);

assert.match(panel, /المعلم الصوتي/);
assert.match(panel, /افتح المعلم الذكي/);
assert.match(panel, /SmartTeacherBoard/);
assert.match(panel, /tutorSessionIdRef\.current/);

assert.match(board, /data-testid="smart-teacher-board"/);
assert.match(board, /السبورة الذكية/);
assert.match(board, /أبسط أكثر/);
assert.match(board, /مثال آخر/);
assert.match(board, /لماذا؟/);
assert.match(board, /أعد الشرح/);
assert.match(board, /aiQuestionAssistant/);
assert.match(board, /questionId/);
assert.match(board, /tutorSessionId/);
assert.match(board, /SpeechRecognition/);
assert.match(board, /speechSynthesis/);
assert.doesNotMatch(board, /correctOptionIndex/);

assert.match(aiApi, /\/ai\/question-assistant/);
assert.match(aiRoutes, /"\/question-assistant"/);
assert.match(reference, /Question Assistant/);

console.log("Smart Teacher interactive board contract: PASS");
