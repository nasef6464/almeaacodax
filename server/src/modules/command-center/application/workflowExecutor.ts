import { CommandCenterDraftModel } from "../../../models/CommandCenterDraft.js";
import { SkillModel } from "../../../models/Skill.js";
import type { CommandPrincipal } from "./commandAuthorization.js";
import {
  courseInventoryQuerySchema,
  courseReuseDraftSchema,
  getReusableCourseInventory,
  validateCourseReuseDraft,
} from "./courseReuseDraftTools.js";
import {
  questionDraftBatchSchema,
  quizDraftSchema,
  quizQuestionUpdateDraftSchema,
  planQuizQuestionUpdate,
  validateQuestionDraftBatch,
  validateQuizDraft,
} from "./questionQuizDraftTools.js";
import {
  schoolSetupDraftSchema,
  validateSchoolSetupDraft,
} from "./schoolSetupDraftTools.js";

export const SAFE_WORKFLOW_TOOL_IDS = [
  "get_skill_tree",
  "get_course_inventory",
  "create_question_drafts",
  "create_quiz_draft",
  "plan_quiz_question_update",
  "create_course_draft",
  "create_school_setup_draft",
] as const;

type SafeWorkflowToolId = (typeof SAFE_WORKFLOW_TOOL_IDS)[number];

const asError = (message: string, statusCode = 422) =>
  Object.assign(new Error(message), { statusCode });

const scopedStepKey = (workflowId: string, stepId: string) =>
  `workflow:${workflowId}:step:${stepId}`;

const getExistingDraftByStepKey = async (idempotencyKey: string) =>
  CommandCenterDraftModel.findOne({ idempotencyKey }).lean();

const createQuestionDraftStep = async (
  rawInput: unknown,
  principal: CommandPrincipal,
  idempotencyKey: string,
) => {
  const input = questionDraftBatchSchema.parse({
    ...(rawInput as Record<string, unknown>),
    idempotencyKey,
  });
  const existing = await getExistingDraftByStepKey(idempotencyKey);
  if (existing) {
    return { draftId: String(existing._id), idempotentReplay: true };
  }

  const validation = await validateQuestionDraftBatch(input);
  if (!validation.ok) {
    throw asError(
      `Question draft validation failed: ${validation.issues.map((issue) => issue.type).join(", ")}`,
    );
  }

  const draft = await CommandCenterDraftModel.create({
    kind: "question_batch",
    title: input.title,
    payload: {
      questions: input.questions.map((question) => ({
        ...question,
        subSkillId: question.subSkillIds[0],
        skillIds: [question.skillId, ...question.subSkillIds],
        approvalStatus: "draft",
        aiGenerated: true,
      })),
      validation,
    },
    source: principal.source,
    requiredScopes: ["questions:write"],
    createdBy: principal.id,
    createdByType: principal.type,
    requestId: input.requestId,
    idempotencyKey,
    status: "pending",
  });

  return {
    draftId: String(draft._id),
    validation: validation.stats,
    idempotentReplay: false,
  };
};

const createQuizDraftStep = async (
  rawInput: unknown,
  principal: CommandPrincipal,
  idempotencyKey: string,
) => {
  const input = quizDraftSchema.parse({
    ...(rawInput as Record<string, unknown>),
    idempotencyKey,
  });
  const existing = await getExistingDraftByStepKey(idempotencyKey);
  if (existing) return { draftId: String(existing._id), idempotentReplay: true };

  const validation = await validateQuizDraft(input);
  if (!validation.ok) {
    throw asError(
      `Quiz draft validation failed; missing questions: ${validation.missingQuestionIds.join(", ")}`,
    );
  }

  const draft = await CommandCenterDraftModel.create({
    kind: "quiz",
    title: input.title,
    payload: {
      ...input,
      skillIds: input.skillIds.length ? input.skillIds : validation.skillIds,
      approvalStatus: "draft",
    },
    source: principal.source,
    requiredScopes: ["quizzes:write"],
    createdBy: principal.id,
    createdByType: principal.type,
    requestId: input.requestId,
    idempotencyKey,
    status: "pending",
  });

  return {
    draftId: String(draft._id),
    questionCount: validation.questionCount,
    idempotentReplay: false,
  };
};

const createQuizUpdateDraftStep = async (
  rawInput: unknown,
  principal: CommandPrincipal,
  idempotencyKey: string,
) => {
  const input = quizQuestionUpdateDraftSchema.parse({
    ...(rawInput as Record<string, unknown>),
    idempotencyKey,
  });
  const existing = await getExistingDraftByStepKey(idempotencyKey);
  if (existing) return { draftId: String(existing._id), idempotentReplay: true };

  const plan = await planQuizQuestionUpdate(input);
  if (!plan.ok || !plan.quiz || !plan.diff) {
    throw asError(
      `Quiz update planning failed: ${plan.issues.map((issue) => issue.type).join(", ")}`,
    );
  }
  if (plan.diff.acceptedAdditionCount === 0 && input.mode === "add") {
    throw asError("No new non-duplicate approved questions remain after validation");
  }

  const draft = await CommandCenterDraftModel.create({
    kind: "quiz",
    title: input.title || `تحديث أسئلة: ${plan.quiz.title}`,
    payload: {
      operation: "update_existing_questions",
      targetQuizId: plan.quiz.id,
      targetQuizMongoId: plan.quiz.mongoId,
      mode: input.mode,
      candidateQuestionIds: input.candidateQuestionIds,
      finalQuestionIds: plan.diff.finalQuestionIds,
      diffSnapshot: plan.diff,
      targetSnapshot: plan.targetSnapshot,
      approvalStatus: "draft",
    },
    source: principal.source,
    requiredScopes: ["quizzes:write"],
    createdBy: principal.id,
    createdByType: principal.type,
    requestId: input.requestId,
    idempotencyKey,
    status: "pending",
  });

  return {
    draftId: String(draft._id),
    targetQuizId: plan.quiz.id,
    diff: plan.diff,
    idempotentReplay: false,
  };
};

const createCourseDraftStep = async (
  rawInput: unknown,
  principal: CommandPrincipal,
  idempotencyKey: string,
) => {
  const input = courseReuseDraftSchema.parse({
    ...(rawInput as Record<string, unknown>),
    idempotencyKey,
  });
  const existing = await getExistingDraftByStepKey(idempotencyKey);
  if (existing) return { draftId: String(existing._id), idempotentReplay: true };

  const validation = await validateCourseReuseDraft(input);
  if (!validation.ok) {
    throw asError(
      `Course draft validation failed: ${validation.issues.map((issue) => issue.type).join(", ")}`,
    );
  }

  const draft = await CommandCenterDraftModel.create({
    kind: "course",
    title: input.title,
    payload: {
      ...input,
      skillIds: validation.derivedSkillIds,
      strategy: "reuse_first",
      sourceOfTruth: "existing_platform_content",
      generationPolicy: "generate_only_when_missing",
      approvalStatus: "draft",
      isPublished: false,
      resolvedSummary: validation.stats,
    },
    source: principal.source,
    requiredScopes: ["courses:write"],
    createdBy: principal.id,
    createdByType: principal.type,
    requestId: input.requestId,
    idempotencyKey,
    status: "pending",
  });

  return {
    draftId: String(draft._id),
    validation: validation.stats,
    idempotentReplay: false,
  };
};

const createSchoolDraftStep = async (
  rawInput: unknown,
  principal: CommandPrincipal,
  idempotencyKey: string,
) => {
  const input = schoolSetupDraftSchema.parse({
    ...(rawInput as Record<string, unknown>),
    idempotencyKey,
  });
  const existing = await getExistingDraftByStepKey(idempotencyKey);
  if (existing) return { draftId: String(existing._id), idempotentReplay: true };

  const validation = await validateSchoolSetupDraft(input);
  if (!validation.ok) {
    throw asError(
      `School setup validation failed: ${validation.issues.map((issue) => issue.type).join(", ")}`,
    );
  }

  const draft = await CommandCenterDraftModel.create({
    kind: "school_setup",
    title: input.schoolName,
    payload: {
      ...validation.normalizedPlan,
      strategy: "validated_plan_first",
      applyPolicy: "reuse_existing_accounts",
      accountCreationPolicy: "explicit_only",
    },
    source: principal.source,
    requiredScopes: ["schools:write"],
    createdBy: principal.id,
    createdByType: principal.type,
    requestId: input.requestId,
    idempotencyKey,
    status: "pending",
  });

  return {
    draftId: String(draft._id),
    validation: validation.stats,
    idempotentReplay: false,
  };
};

export async function executeSafeCommandTool(input: {
  toolId: SafeWorkflowToolId;
  toolInput: unknown;
  principal: CommandPrincipal;
  idempotencyKey: string;
}) {
  const idempotencyKey = input.idempotencyKey;

  if (input.toolId === "get_skill_tree") {
    const query = (input.toolInput || {}) as Record<string, unknown>;
    const skills = await SkillModel.find({
      ...(query.pathId ? { pathId: String(query.pathId) } : {}),
      ...(query.subjectId ? { subjectId: String(query.subjectId) } : {}),
      ...(query.sectionId ? { sectionId: String(query.sectionId) } : {}),
    })
      .select("id pathId subjectId sectionId name description order subSkills")
      .sort({ pathId: 1, subjectId: 1, sectionId: 1, order: 1 })
      .lean();

    return {
      count: skills.length,
      skills,
    };
  }

  if (input.toolId === "get_course_inventory") {
    const inventoryInput = courseInventoryQuerySchema.parse(input.toolInput || {});
    const inventory = await getReusableCourseInventory(inventoryInput);
    return inventory;
  }

  if (input.toolId === "create_question_drafts") {
    return createQuestionDraftStep(input.toolInput, input.principal, idempotencyKey);
  }
  if (input.toolId === "create_quiz_draft") {
    return createQuizDraftStep(input.toolInput, input.principal, idempotencyKey);
  }
  if (input.toolId === "plan_quiz_question_update") {
    return createQuizUpdateDraftStep(input.toolInput, input.principal, idempotencyKey);
  }
  if (input.toolId === "create_course_draft") {
    return createCourseDraftStep(input.toolInput, input.principal, idempotencyKey);
  }
  if (input.toolId === "create_school_setup_draft") {
    return createSchoolDraftStep(input.toolInput, input.principal, idempotencyKey);
  }

  throw asError(`Unsupported workflow tool: ${String(input.toolId)}`);
}

export async function executeSafeWorkflowTool(input: {
  workflowId: string;
  stepId: string;
  toolId: SafeWorkflowToolId;
  toolInput: unknown;
  principal: CommandPrincipal;
}) {
  return executeSafeCommandTool({
    toolId: input.toolId,
    toolInput: input.toolInput,
    principal: input.principal,
    idempotencyKey: scopedStepKey(input.workflowId, input.stepId),
  });
}

export async function verifyWorkflowStepOutputs(outputs: Array<Record<string, unknown>>) {
  const draftIds = outputs
    .map((output) => String(output?.draftId || "").trim())
    .filter(Boolean);
  const existingDrafts = draftIds.length
    ? await CommandCenterDraftModel.find({ _id: { $in: draftIds } }).select("_id").lean()
    : [];
  const existingIds = new Set(existingDrafts.map((draft) => String(draft._id)));
  const missingDraftIds = draftIds.filter((id) => !existingIds.has(id));

  return {
    ok: missingDraftIds.length === 0,
    missingDraftIds,
  };
}
