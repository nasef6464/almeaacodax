import assert from "node:assert/strict";
import { QuestionModel } from "../models/Question.js";
import { processInlineQuestions } from "../modules/quizzes/application/quizInlineQuestions.js";

const docs: any[] = [];
const fakeCreate = async (document: Record<string, unknown>) => {
  const instance = new QuestionModel(document);
  await instance.validate();
  docs.push(instance.toObject());
  return { id: instance.id, _id: instance._id };
};

async function expectRejected(question: any, label: string) {
  let rejected = false;
  const before = docs.length;
  try {
    await processInlineQuestions([question], "p_qudrat", "sub_quant", { id: "teacher-test", role: "teacher" }, fakeCreate);
  } catch {
    rejected = true;
  }
  assert.ok(rejected, label);
  assert.equal(docs.length, before, label + " must not save any question");
}

const createdIds = await processInlineQuestions([
  {
    text: "2 + 3 = ?",
    type: "multiple_choice",
    options: [
      { id: "a", text: "4", isCorrect: false },
      { id: "b", text: "5", isCorrect: true },
      { id: "c", text: "6", isCorrect: false },
    ],
    explanation: "5",
  },
  {
    text: "1 + 1 = ?",
    options: ["2", "3"],
    correctOptionIndex: 0,
  },
  { id: "existing-question-only" },
  "existing-question-string",
], "p_qudrat", "sub_quant", { id: "teacher-test", role: "teacher" }, fakeCreate);

assert.equal(createdIds.length, 4, "Inline + references should return four IDs");
assert.equal(docs.length, 2, "References should not duplicate question records");
assert.deepEqual(docs[0].options, ["4", "5", "6"]);
assert.equal(docs[0].type, "mcq");
assert.equal(docs[0].correctOptionIndex, 1);
assert.equal(docs[0].subject, "sub_quant");
assert.equal(docs[0].ownerType, "teacher");
assert.ok(docs[0]._id, "Mongo creates the canonical _id");
assert.deepEqual(docs[1].options, ["2", "3"]);
assert.equal(docs[1].correctOptionIndex, 0);
assert.equal(createdIds[2], "existing-question-only");
assert.equal(createdIds[3], "existing-question-string");

await expectRejected({ text: "No answer", options: ["A", "B"] }, "Missing answer must reject");
await expectRejected({ text: "Two answers", options: [{ text: "A", isCorrect: true }, { text: "B", isCorrect: true }] }, "Multiple correct answers must reject");
await expectRejected({ text: "Conflicting", options: [{ text: "A", isCorrect: true }, { text: "B" }], correctOptionIndex: 1 }, "Conflicting answer keys must reject");
await expectRejected({ text: "Index out", options: ["A", "B"], correctOptionIndex: 3 }, "Out-of-bounds answer must reject");
await expectRejected({ text: "Wrong type", options: ["A", "B"], correctOptionIndex: 1, type: "unknown" }, "Unexpected type must reject");

console.log("PASS: inline quiz questions conform to persisted QuestionModel and preserve answer keys (9 assertions/groups).");
