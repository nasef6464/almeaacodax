import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [
  panel,
  board,
  aiApi,
  aiRoutes,
  reference,
  commandRoutes,
  smartTeacherRoutes,
  smartTeacherTools,
  workflowExecutor,
  mcpCatalog,
  classroomTeacherRoutes,
  scheduler,
] = await Promise.all([
  read("components/results/QuestionAssistantPanel.tsx"),
  read("components/results/SmartTeacherBoard.tsx"),
  read("services/apiGroups/aiApi.ts"),
  read("server/src/routes/ai.routes.ts"),
  read("docs/architecture/QUESTION_REVIEW_SMART_TUTOR_REFERENCE_AR.md"),
  read("server/src/modules/command-center/http/commandCenterRoutes.ts"),
  read("server/src/modules/command-center/http/smartTeacherDraftRoutes.ts"),
  read("server/src/modules/command-center/application/smartTeacherSessionDraftTools.ts"),
  read("server/src/modules/command-center/application/workflowExecutor.ts"),
  read("server/src/modules/command-center/application/mcpToolCatalog.ts"),
  read("server/src/routes/classroom/registerClassroomTeacherRoutes.ts"),
  read("components/classroom/SmartClassroomSessionSchedulerModal.tsx"),
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

assert.match(commandRoutes, /smart-teacher/);
assert.match(smartTeacherRoutes, /session\/draft/);
assert.match(smartTeacherRoutes, /session\/validate/);
assert.match(smartTeacherTools, /agentCanStartLive:\s*false/);
assert.match(smartTeacherTools, /teacherLaunchRequired:\s*true/);
assert.match(smartTeacherTools, /loadApprovedVisibleQuestions/);
assert.match(workflowExecutor, /prepare_smart_classroom_session/);
assert.match(mcpCatalog, /prepare_smart_classroom_session/);
assert.doesNotMatch(mcpCatalog, /start_smart_classroom/);
assert.match(classroomTeacherRoutes, /teacher\/prepared-plans/);
assert.match(classroomTeacherRoutes, /teacherLaunchRequired/);
assert.match(scheduler, /استخدام خطة Agent/);
assert.match(scheduler, /createClassroomSession/);
assert.match(scheduler, /autoStart:\s*true/);

console.log("Smart Teacher interactive board contract: PASS");
