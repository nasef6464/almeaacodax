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
    const summary = await restoreLearningBackup(payload.backup, {
      apply: payload.apply,
      replace: payload.replace,
    });

    res.json({
      ok: true,
      applied: payload.apply === true,
      replaced: payload.apply === true && payload.replace === true,
      summary,
      note:
        payload.apply === true
          ? "Restore completed."
          : "Dry run only. Send apply=true to write, and replace=true only when intentionally replacing managed learning collections.",
    });
  }),
);
