import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../server/src/scripts/auditLearnerReferenceIntegrity.ts", import.meta.url),
  "utf8",
);

const required = [
  'mode: "READ_ONLY_AUDIT"',
  'QuizModel.find({',
  'QuestionModel.find(buildDocumentsByIdsQuery(referencedQuestionIds))',
  'TopicModel.find({ showOnPlatform: { $ne: false } })',
  'reason: "quiz_has_zero_usable_questions"',
  'brokenTopicQuizRefs',
  'process.exitCode = 2',
];

for (const fragment of required) {
  if (!source.includes(fragment)) {
    throw new Error(`Learner reference audit lost required fragment: ${fragment}`);
  }
}

for (const forbidden of [
  ".updateOne(",
  ".updateMany(",
  ".deleteOne(",
  ".deleteMany(",
  ".findOneAndUpdate(",
  ".findOneAndDelete(",
  ".insertMany(",
  ".create(",
]) {
  if (source.includes(forbidden)) {
    throw new Error(`Learner reference audit must remain read-only: ${forbidden}`);
  }
}

console.log("Learner reference integrity audit contract passed.");
