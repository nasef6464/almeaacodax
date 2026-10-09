import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// Pure isolated handler execution: no server, network, database, credentials or user data.
// This exercises the *actual handler extracted from QuizPage.tsx*, rather than a fake copy.
const path = new URL("../pages/QuizPage.tsx", import.meta.url);
const code = readFileSync(path, "utf8");
const begin = "const handleOptionSelect = (displayIndex: number) => {";
const finish = "const toggleQuestionSavedForReview =";
const s = code.indexOf(begin);
const e = code.indexOf(finish, s);
assert.ok(s >= 0 && e > s, "QuizPage answer-change handler boundaries missing");
const raw = code.slice(s, e).trim();
assert.match(raw, /;\s*$/, "handler should end as a standalone statement");
const functionText = raw
  .replace(begin, "(displayIndex) => {")
  .replace(/;\s*$/, "");
const calls = { drafts: [], attempts: [] };
let answers = {};
let finished = false;
const question = { id: "fixture-question", correctOptionIndex: 1 };
const sandbox = {
  isFinished: false,
  currentQuestion: question,
  currentDisplayOptions: [{ originalIndex: 0 }, { originalIndex: 1 }],
  quiz: { id: "fixture-quiz" },
  quizQuestions: [question],
  setSelectedOptions: (setState) => { answers = setState(answers); },
  api: { updateLiveExamProgress: (payload) => {
    calls.drafts.push(payload);
    return Promise.resolve();
  }},
  recordQuestionAttempt: (payload) => { calls.attempts.push(payload); },
  console,
};
const select = runInNewContext("(" + functionText + ")", sandbox, { timeout: 1000 });
assert.equal(typeof select, "function");
select(0);
select(1);
select(0);
assert.equal(JSON.stringify(answers), '{"fixture-question":0}', "final draft should use last selected option");
assert.equal(calls.drafts.length, 3, "draft autosave should remain functional on every choice");
assert.equal(calls.drafts[2].answers["fixture-question"], 0, "last draft should be up-to-date");
const baseline = process.argv.includes("--confirm-existing-risk");
if (baseline) {
  assert.equal(calls.attempts.length, 3,
    "expected existing triple-evidence risk; code was changed, review the baseline contract");
} else {
  assert.equal(calls.attempts.length, 0,
    "draft changes MUST NOT create finalized question evidence; see issue #492");
}
finished = true;
sandbox.isFinished = finished;
select(1);
assert.equal(calls.drafts.length, 3, "a finished quiz must not autosave an answer");
assert.equal(calls.attempts.length, baseline ? 3 : 0, "a finished quiz must not record evidence");
console.log(JSON.stringify({
  status: "PASS",
  mode: baseline ? "confirmed-old-risk" : "protected",
  simulatedChanges: 3,
  draftWrites: calls.drafts.length,
  prematureQuestionAttempts: calls.attempts.length,
  source: "pages/QuizPage.tsx",
  noProductionAccess: true,
}, null, 2));
