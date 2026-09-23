import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createQuestionImageUploadIntent } from "../modules/media/application/questionImageUpload.js";
import { createQuestionImportImageUploadIntent } from "../modules/media/application/questionImportImageUpload.js";
import { createQuestionExplanationAudioUploadIntent } from "../modules/media/application/questionExplanationAudioUpload.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const mediaRouter = Router();

const questionImageIntentSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.coerce.number().int().positive(),
});

mediaRouter.post(
  "/question-images/presign",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = questionImageIntentSchema.parse(req.body || {}) as {
      contentType: "image/jpeg" | "image/png" | "image/webp";
      sizeBytes: number;
    };
    const intent = createQuestionImageUploadIntent(payload);
    res.json(intent);
  }),
);

const questionImportImageIntentSchema = z.object({
  questionCode: z.string().trim().min(3).max(120),
  imageHash: z.string().trim().regex(/^[a-fA-F0-9]{64}$/),
  sizeBytes: z.coerce.number().int().positive(),
});

mediaRouter.post(
  "/question-import-images/presign",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = questionImportImageIntentSchema.parse(req.body || {}) as {
      questionCode: string;
      imageHash: string;
      sizeBytes: number;
    };
    const intent = createQuestionImportImageUploadIntent(payload);
    res.json(intent);
  }),
);

const questionExplanationAudioIntentSchema = z.object({
  contentType: z.enum(["audio/mpeg", "audio/webm", "audio/mp4", "audio/x-m4a", "audio/ogg", "audio/wav", "audio/x-wav"]),
  sizeBytes: z.coerce.number().int().positive(),
});

mediaRouter.post(
  "/question-explanations/presign",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = questionExplanationAudioIntentSchema.parse(req.body || {}) as {
      contentType:
        | "audio/mpeg"
        | "audio/webm"
        | "audio/mp4"
        | "audio/x-m4a"
        | "audio/ogg"
        | "audio/wav"
        | "audio/x-wav";
      sizeBytes: number;
    };
    const intent = createQuestionExplanationAudioUploadIntent(payload);
    res.json(intent);
  }),
);
