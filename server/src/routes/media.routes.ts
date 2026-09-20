import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createQuestionImageUploadIntent } from "../modules/media/application/questionImageUpload.js";
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
    const payload = questionImageIntentSchema.parse(req.body || {});
    const intent = createQuestionImageUploadIntent(payload);
    res.json(intent);
  }),
);
