import { Router } from "express";
import { env } from "../../../config/env.js";
import { StatusCodes } from "http-status-codes";
import { QuestionModel } from "../../../models/Question.js";
import { QuizModel } from "../../../models/Quiz.js";
import { requireAuth, requireRole } from "../../../middleware/auth.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { assertManagedContentScope } from "../../../services/managedContentScope.js";
import { resolveCanonicalQuestionSkillIds } from "../application/questionSkillTaxonomy.js";
import { questionSchema } from "./questionQuerySchemas.js";
import { questionImportBatchParamsSchema, questionImportBatchSchema } from "./questionImportSchemas.js";

export const questionImportRouter = Router();

const normalizeCode = (value: unknown) => String(value || "").trim().toUpperCase();
const normalizeText = (value: unknown) => String(value || "").trim();

const findDuplicates = (values: string[]) => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

const padSourceNumber = (value: number, width: number) => String(value).padStart(width, "0");

const validateImportIdentity = (item: any, questionCode: string) => {
  const sourceMeta = item?.sourceMeta || {};
  const documentCode = normalizeText(sourceMeta.documentCode).toUpperCase();
  const pdfPageIndex = Number(sourceMeta.pdfPageIndex);
  const printedPageNumber = Number(sourceMeta.printedPageNumber);
  const printedQuestionNumber = Number(sourceMeta.printedQuestionNumber);
  const sourceItemId = normalizeText(sourceMeta.sourceItemId).toUpperCase();
  const imageHash = normalizeText(sourceMeta.imageHash).toLowerCase();
  const imageUrl = normalizeText(item?.imageUrl);

  if (!documentCode || !Number.isInteger(pdfPageIndex) || !Number.isInteger(printedPageNumber) || !Number.isInteger(printedQuestionNumber)) {
    return "Canonical source coordinates are required for Pilot import";
  }

  const expectedQuestionCode =
    `QDR-QNT-${documentCode}-P${padSourceNumber(printedPageNumber, 3)}-Q${padSourceNumber(printedQuestionNumber, 2)}`;
  if (questionCode !== expectedQuestionCode) {
    return `questionCode must match canonical source identity: ${expectedQuestionCode}`;
  }

  const expectedSourceItemId =
    `${documentCode}-PDF${padSourceNumber(pdfPageIndex, 3)}-P${padSourceNumber(printedPageNumber, 3)}-N${padSourceNumber(printedQuestionNumber, 2)}`;
  if (sourceItemId !== expectedSourceItemId) {
    return `sourceItemId must match canonical source identity: ${expectedSourceItemId}`;
  }

  if (!/^[a-f0-9]{64}$/.test(imageHash)) {
    return "sourceMeta.imageHash must be the SHA-256 hash of the uploaded WebP";
  }

  const expectedImagePath = `/questions/v2/${questionCode}/${imageHash}.webp`;
  const expectedPublicUrl = `${env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "")}${expectedImagePath}`;
  if (imageUrl !== expectedPublicUrl) {
    return `imageUrl must be the exact R2 V2 object URL returned by the presign flow: ${expectedImagePath}`;
  }

  return "";
};

questionImportRouter.post(
  "/questions/import-batch",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const input = questionImportBatchSchema.parse(req.body || {});
    const batchId = input.batchId.trim().toUpperCase();
    const requestedCodes = input.items.map((item) => normalizeCode(item.questionCode));
    const sourceItemIds = input.items.map((item) => normalizeText(item.sourceMeta.sourceItemId).toUpperCase());
    const duplicateCodes = findDuplicates(requestedCodes);
    const duplicateSourceItemIds = findDuplicates(sourceItemIds);

    if (duplicateCodes.length || duplicateSourceItemIds.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: "INVALID",
        batchId,
        errors: [
          ...duplicateCodes.map((questionCode) => ({ type: "DUPLICATE_QUESTION_CODE", questionCode })),
          ...duplicateSourceItemIds.map((sourceItemId) => ({ type: "DUPLICATE_SOURCE_ITEM_ID", sourceItemId })),
        ],
      });
    }

    const existing = await QuestionModel.find({
      $or: [
        { questionCode: { $in: requestedCodes } },
        { "sourceMeta.sourceItemId": { $in: sourceItemIds } },
      ],
    })
      .select("id questionCode sourceMeta.sourceItemId sourceMeta.importBatchId approvalStatus")
      .lean();

    if (existing.length > 0) {
      return res.status(StatusCodes.CONFLICT).json({
        status: "CONFLICT",
        batchId,
        conflicts: existing.map((question: any) => ({
          id: String(question.id || question._id || ""),
          questionCode: normalizeCode(question.questionCode),
          sourceItemId: normalizeText(question?.sourceMeta?.sourceItemId),
          importBatchId: normalizeText(question?.sourceMeta?.importBatchId),
          approvalStatus: normalizeText(question.approvalStatus),
        })),
      });
    }

    const prepared = [];
    const validationErrors: Array<{
      index: number;
      questionCode: string;
      message: string;
    }> = [];

    for (let index = 0; index < input.items.length; index += 1) {
      const item = input.items[index];
      const questionCode = requestedCodes[index];
      try {
        const identityError = validateImportIdentity(item, questionCode);
        if (identityError) {
          validationErrors.push({ index, questionCode, message: identityError });
          continue;
        }

        const canonicalSkills = await resolveCanonicalQuestionSkillIds(item);
        if (!canonicalSkills.ok) {
          validationErrors.push({ index, questionCode, message: canonicalSkills.message });
          continue;
        }

        const draft = questionSchema.parse({
          ...item,
          questionCode,
          skillIds: canonicalSkills.skillIds,
          source: "imported",
          approvalStatus: "draft",
          ownerType: "platform",
          ownerId: req.authUser!.id,
          createdBy: req.authUser!.id,
          approvedBy: "",
          approvedAt: null,
          sourceMeta: {
            ...item.sourceMeta,
            documentCode: normalizeText(item.sourceMeta.documentCode).toUpperCase(),
            sourceItemId: normalizeText(item.sourceMeta.sourceItemId).toUpperCase(),
            imageHash: normalizeText(item.sourceMeta.imageHash).toLowerCase(),
            importBatchId: batchId,
          },
        });

        await assertManagedContentScope(req.authUser!, draft);
        prepared.push(draft);
      } catch (error) {
        validationErrors.push({
          index,
          questionCode,
          message: error instanceof Error ? error.message : "Question validation failed",
        });
      }
    }

    if (validationErrors.length > 0 || prepared.length !== input.items.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: "INVALID",
        batchId,
        requested: input.items.length,
        prepared: prepared.length,
        errors: validationErrors,
      });
    }

    if (input.dryRun) {
      return res.json({
        status: "PASS",
        mode: "DRY_RUN",
        batchId,
        requested: input.items.length,
        prepared: prepared.length,
        questionCodes: requestedCodes,
      });
    }

    const created = await QuestionModel.insertMany(prepared, { ordered: true });
    return res.status(StatusCodes.CREATED).json({
      status: "IMPORTED",
      mode: "WRITE",
      batchId,
      requested: input.items.length,
      inserted: created.length,
      questions: created.map((question: any) => ({
        id: String(question.id || question._id || ""),
        questionCode: normalizeCode(question.questionCode),
        approvalStatus: normalizeText(question.approvalStatus),
      })),
    });
  }),
);

questionImportRouter.get(
  "/questions/import-batch/:batchId",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { batchId } = questionImportBatchParamsSchema.parse(req.params);
    const normalizedBatchId = batchId.toUpperCase();
    const questions = await QuestionModel.find({ "sourceMeta.importBatchId": normalizedBatchId })
      .select("id questionCode approvalStatus imageUrl sourceMeta")
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      batchId: normalizedBatchId,
      count: questions.length,
      drafts: questions.filter((question: any) => question.approvalStatus === "draft").length,
      questionCodes: questions.map((question: any) => normalizeCode(question.questionCode)),
      questions,
    });
  }),
);

questionImportRouter.delete(
  "/questions/import-batch/:batchId",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const { batchId } = questionImportBatchParamsSchema.parse(req.params);
    const normalizedBatchId = batchId.toUpperCase();
    const questions = await QuestionModel.find({ "sourceMeta.importBatchId": normalizedBatchId })
      .select("id questionCode approvalStatus")
      .lean();

    if (questions.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Import batch not found", batchId: normalizedBatchId });
    }

    const nonDraft = questions.filter((question: any) => question.approvalStatus !== "draft");
    if (nonDraft.length > 0) {
      return res.status(StatusCodes.CONFLICT).json({
        message: "Only an entirely draft import batch can be rolled back",
        batchId: normalizedBatchId,
        nonDraftQuestionCodes: nonDraft.map((question: any) => normalizeCode(question.questionCode)),
      });
    }

    const questionIds = questions.map((question: any) => String(question.id || "")).filter(Boolean);
    const linkedQuiz = questionIds.length > 0
      ? await QuizModel.findOne({
          $or: [
            { questionIds: { $in: questionIds } },
            { "mockExam.sections.questionIds": { $in: questionIds } },
          ],
        })
          .select("id title")
          .lean()
      : null;

    if (linkedQuiz) {
      return res.status(StatusCodes.CONFLICT).json({
        message: "Import batch is linked to a quiz and cannot be rolled back",
        batchId: normalizedBatchId,
        quizId: String((linkedQuiz as any).id || (linkedQuiz as any)._id || ""),
        quizTitle: String((linkedQuiz as any).title || ""),
      });
    }

    const result = await QuestionModel.deleteMany({
      "sourceMeta.importBatchId": normalizedBatchId,
      approvalStatus: "draft",
    });

    return res.json({
      status: "ROLLED_BACK",
      batchId: normalizedBatchId,
      deleted: Number(result.deletedCount || 0),
    });
  }),
);
