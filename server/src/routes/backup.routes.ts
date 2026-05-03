import mongoose from "mongoose";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createLearningBackup, restoreLearningBackup } from "../services/learningBackup.js";

export const backupRouter = Router();

const restoreSchema = z.object({
  backup: z.unknown(),
  apply: z.boolean().optional(),
  replace: z.boolean().optional(),
  confirmText: z.string().optional(),
});

backupRouter.get(
  "/learning",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (_req, res) => {
    const backup = await createLearningBackup(mongoose.connection.db?.databaseName || "unknown");

    res.setHeader("Content-Disposition", `attachment; filename="learning-content-${backup.createdAt.replace(/[:.]/g, "-")}.json"`);
    res.json(backup);
  }),
);

backupRouter.post(
  "/learning/restore",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = restoreSchema.parse(req.body);
    const isApply = payload.apply === true;
    const isReplace = isApply && payload.replace === true;
    const expectedConfirmation = isReplace ? "استبدال" : "استرجاع";

    if (isApply && payload.confirmText !== expectedConfirmation) {
      res.status(400).json({
        message: isReplace
          ? 'اكتب كلمة "استبدال" لتأكيد الاسترجاع مع حذف محتوى التعلم الحالي أولا.'
          : 'اكتب كلمة "استرجاع" لتأكيد تطبيق النسخة على قاعدة البيانات.',
      });
      return;
    }

    const summary = await restoreLearningBackup(payload.backup, {
      apply: isApply,
      replace: isReplace,
    });

    res.json({
      ok: true,
      applied: isApply,
      replaced: isReplace,
      summary,
      note:
        isApply
          ? "Restore completed."
          : "Dry run only. Send apply=true to write, and replace=true only when intentionally replacing managed learning collections.",
    });
  }),
);
