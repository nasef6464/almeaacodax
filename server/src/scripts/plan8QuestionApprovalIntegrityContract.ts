import assert from "node:assert/strict";
import {
  touchesQuestionVisualIdentity,
  validateQuestionApprovalIntegrity,
} from "../modules/quizzes/application/questionApprovalIntegrity.js";

const valid = {
  questionCode: "TAH-MATH-YLM26-P005-Q01",
  source: "imported",
  approvalStatus: "approved",
  imageUrl: "https://cdn.example.test/questions/v2/TAH-MATH-YLM26-P005-Q01/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp",
  optionsEmbeddedInImage: true,
  options: ["A", "B", "C", "D"],
  correctOptionIndex: 2,
  sourceMeta: {
    sourceItemId: "YLM26-PDF004-P005-N01",
    page: 5,
    imageHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
};

assert.deepEqual(validateQuestionApprovalIntegrity(valid), { ok: true });
assert.equal(validateQuestionApprovalIntegrity({ ...valid, approvalStatus: "draft" }).ok, true);
assert.equal(validateQuestionApprovalIntegrity({ ...valid, sourceMeta: { ...valid.sourceMeta, imageHash: "" } }).ok, false);
assert.equal(validateQuestionApprovalIntegrity({ ...valid, sourceMeta: { ...valid.sourceMeta, sourceItemId: "" } }).ok, false);
assert.equal(validateQuestionApprovalIntegrity({ ...valid, sourceMeta: { ...valid.sourceMeta, page: null } }).ok, false);
assert.equal(validateQuestionApprovalIntegrity({ ...valid, imageUrl: "data:image/webp;base64,AA==" }).ok, false);
assert.equal(validateQuestionApprovalIntegrity({ ...valid, imageUrl: "https://cdn.example.test/wrong.webp" }).ok, false);
assert.equal(validateQuestionApprovalIntegrity({ ...valid, options: ["A", "B", "C"] }).ok, false);
assert.equal(validateQuestionApprovalIntegrity({ ...valid, correctOptionIndex: 4 }).ok, false);

assert.equal(touchesQuestionVisualIdentity({ explanation: "safe edit" }), false);
assert.equal(touchesQuestionVisualIdentity({ imageUrl: valid.imageUrl }), true);
assert.equal(touchesQuestionVisualIdentity({ correctOptionIndex: 1 }), true);
assert.equal(touchesQuestionVisualIdentity({ sourceMeta: valid.sourceMeta }), true);

console.log(JSON.stringify({
  phase: "PLAN8",
  status: "PASS",
  checks: [
    "approved canonical imported image question requires source identity",
    "approved canonical imported image question requires SHA-256",
    "approved canonical imported image question rejects Base64/non-content-addressed media",
    "approved image MCQ requires four options and A/B/C/D index",
    "non-visual edits do not retroactively block grandfathered approved records",
  ],
}, null, 2));
