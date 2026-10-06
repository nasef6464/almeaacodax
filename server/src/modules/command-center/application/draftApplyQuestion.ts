import { QuestionModel } from "../../../models/Question.js";
import {
  questionDraftBatchSchema,
  validateQuestionDraftBatch,
} from "./questionQuizDraftTools.js";
import {
  stableObjectId,
  type ApplyResult,
  type CommandDraftLike,
} from "./draftApplyTypes.js";

const canonicalQuestionIdentity = (draftId: string, index: number) => {
  const objectId = stableObjectId(`command-center:question:${draftId}:${index}`);
  const objectIdText = objectId.toString();
  return {
    _id: objectId,
    id: `q_${objectIdText}`,
    questionCode: `Q-${objectIdText.slice(-10).toUpperCase()}`,
  };
};

const normalizeComparable = (value: unknown) =>
  JSON.stringify(value, (_key, nested) => {
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return Object.fromEntries(
        Object.entries(nested as Record<string, unknown>)
          .filter(([, entry]) => entry !== undefined)
          .sort(([left], [right]) => left.localeCompare(right)),
      );
    }
    return nested;
  });

const expectedComparable = (question: any) => ({
  text: String(question.text || ""),
  options: Array.isArray(question.options) ? question.options.map(String) : [],
  correctOptionIndex: Number(question.correctOptionIndex),
  pathId: String(question.pathId || ""),
  subjectId: String(question.subjectId || ""),
  sectionId: String(question.sectionId || ""),
  skillId: String(question.skillId || ""),
  subSkillId: String(question.subSkillIds?.[0] || ""),
  subSkillIds: Array.isArray(question.subSkillIds)
    ? question.subSkillIds.map(String)
    : [],
  skillIds: [
    ...new Set([
      String(question.skillId || ""),
      ...(Array.isArray(question.subSkillIds)
        ? question.subSkillIds.map(String)
        : []),
    ].filter(Boolean)),
  ],
});

const existingComparable = (question: any) => ({
  text: String(question.text || ""),
  options: Array.isArray(question.options) ? question.options.map(String) : [],
  correctOptionIndex: Number(question.correctOptionIndex),
  pathId: String(question.pathId || ""),
  subjectId: String(question.subjectId || ""),
  sectionId: String(question.sectionId || ""),
  skillId: String(question.skillId || ""),
  subSkillId: String(question.subSkillId || ""),
  subSkillIds: Array.isArray(question.subSkillIds)
    ? question.subSkillIds.map(String)
    : [],
  skillIds: Array.isArray(question.skillIds) ? question.skillIds.map(String) : [],
});

export async function applyQuestionBatchDraft(
  draft: CommandDraftLike,
  actorId: string,
): Promise<ApplyResult> {
  const draftId = String(draft._id);
  const rawQuestions = Array.isArray((draft.payload as any)?.questions)
    ? (draft.payload as any).questions
    : [];
  const input = questionDraftBatchSchema.parse({
    title: String(draft.title || "Command Center question batch"),
    questions: rawQuestions,
    requestId: String((draft as any).requestId || ""),
  });

  const identities = input.questions.map((_question, index) =>
    canonicalQuestionIdentity(draftId, index),
  );
  const deterministicIds = identities.map((identity) => identity._id);
  const existing = await QuestionModel.find({
    _id: { $in: deterministicIds },
  })
    .select(
      "_id id questionCode text options correctOptionIndex pathId subjectId sectionId skillId subSkillId subSkillIds skillIds approvalStatus",
    )
    .lean();

  const existingById = new Map(
    existing.map((question) => [String(question._id), question]),
  );

  const missingIndexes: number[] = [];
  for (let index = 0; index < input.questions.length; index += 1) {
    const identity = identities[index];
    const existingQuestion = existingById.get(String(identity._id));
    if (!existingQuestion) {
      missingIndexes.push(index);
      continue;
    }

    const expected = expectedComparable(input.questions[index]);
    const current = existingComparable(existingQuestion);
    if (normalizeComparable(expected) !== normalizeComparable(current)) {
      throw Object.assign(
        new Error(
          `Question batch retry found a deterministic identity with mismatched content at index ${index}`,
        ),
        { statusCode: 409 },
      );
    }
  }

  if (missingIndexes.length === 0) {
    return {
      resourceType: "question_batch",
      resourceId: draftId,
      summary: {
        idempotentReplay: true,
        total: input.questions.length,
        inserted: 0,
        existing: existing.length,
        questionIds: identities.map((identity) => identity.id),
      },
    };
  }

  const missingQuestions = missingIndexes.map((index) => input.questions[index]);
  const validation = await validateQuestionDraftBatch(
    questionDraftBatchSchema.parse({
      title: input.title,
      questions: missingQuestions,
      requestId: input.requestId,
    }),
  );
  if (!validation.ok) {
    throw Object.assign(
      new Error(
        `Question batch is no longer valid: ${validation.issues
          .map((issue) => issue.type)
          .join(", ")}`,
      ),
      { statusCode: 422, validation },
    );
  }

  const operations = missingIndexes.map((index) => {
    const question = input.questions[index];
    const identity = identities[index];
    const subSkillIds = [...new Set(question.subSkillIds.map(String))];
    const skillIds = [
      ...new Set([question.skillId, ...subSkillIds].map(String).filter(Boolean)),
    ];

    return {
      updateOne: {
        filter: { _id: identity._id },
        update: {
          $setOnInsert: {
            ...identity,
            text: question.text,
            options: question.options,
            correctOptionIndex: question.correctOptionIndex,
            explanation: question.explanation,
            hint: question.hint,
            solvingStrategy: question.solvingStrategy,
            imageUrl: question.imageUrl,
            videoUrl: question.videoUrl,
            pathId: question.pathId,
            subject: question.subjectId,
            subjectId: question.subjectId,
            sectionId: question.sectionId,
            skillId: question.skillId,
            subSkillId: subSkillIds[0] || null,
            subSkillIds,
            skillIds,
            difficulty: question.difficulty,
            type: question.type,
            source: "imported",
            sourceMeta: {
              ...(question.sourceMeta || {}),
              importBatchId:
                String((question.sourceMeta as any)?.importBatchId || "").trim() ||
                `command-center:${draftId}`,
            },
            ownerType: "platform",
            ownerId: actorId,
            createdBy: actorId,
            approvalStatus: "draft",
            reviewerNotes: `Created from approved Command Center draft ${draftId}; publication requires a separate review/publish action.`,
          },
        },
        upsert: true,
      },
    };
  });

  const writeResult = await QuestionModel.bulkWrite(operations, {
    ordered: true,
  });

  const allApplied = await QuestionModel.find({
    _id: { $in: deterministicIds },
  })
    .select("_id id questionCode approvalStatus")
    .lean();

  if (allApplied.length !== input.questions.length) {
    throw Object.assign(
      new Error(
        `Question batch apply verification failed: expected ${input.questions.length}, found ${allApplied.length}`,
      ),
      { statusCode: 500 },
    );
  }

  return {
    resourceType: "question_batch",
    resourceId: draftId,
    summary: {
      idempotentReplay: false,
      total: input.questions.length,
      inserted: Number(writeResult.upsertedCount || 0),
      existing: existing.length,
      approvalStatus: "draft",
      published: false,
      questionIds: identities.map((identity) => identity.id),
    },
  };
}
