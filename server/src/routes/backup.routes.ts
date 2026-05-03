import mongoose from "mongoose";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { BackupSnapshotModel } from "../models/BackupSnapshot.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { assertLearningBackupPayload, createLearningBackup, restoreLearningBackup } from "../services/learningBackup.js";

export const backupRouter = Router();

const restoreSchema = z.object({
  backup: z.unknown(),
  apply: z.boolean().optional(),
  replace: z.boolean().optional(),
  confirmText: z.string().optional(),
});

const createSnapshotSchema = z.object({
  title: z.string().min(1).max(160).optional(),
});

const restoreSnapshotSchema = z.object({
  apply: z.boolean().optional(),
  replace: z.boolean().optional(),
  confirmText: z.string().optional(),
});

const totalDocumentsFromSummary = (summary: Record<string, number>) =>
  Object.values(summary).reduce((total, count) => total + Number(count || 0), 0);

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
  "/learning/snapshots",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const body = createSnapshotSchema.parse(req.body || {});
    const backup = await createLearningBackup(mongoose.connection.db?.databaseName || "unknown");
    const title = body.title?.trim() || `نسخة تعليمية ${new Date().toLocaleString("ar-SA")}`;
    const snapshot = await BackupSnapshotModel.create({
      kind: "learning-content",
      title,
      createdBy: req.authUser?.id || "",
      createdByEmail: req.authUser?.email || "",
      database: backup.database || "",
      summary: backup.summary,
      totalDocuments: totalDocumentsFromSummary(backup.summary),
      payload: backup,
    });

    res.status(201).json({
      snapshot: {
        id: String(snapshot._id),
        kind: snapshot.kind,
        title: snapshot.title,
        createdAt: snapshot.createdAt,
        createdByEmail: snapshot.createdByEmail,
        database: snapshot.database,
        summary: snapshot.summary,
        totalDocuments: snapshot.totalDocuments,
      },
    });
  }),
);

backupRouter.get(
  "/learning/snapshots",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (_req, res) => {
    const snapshots = await BackupSnapshotModel.find({ kind: "learning-content" })
      .select("kind title createdAt createdByEmail database summary totalDocuments")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.json({
      snapshots: snapshots.map((snapshot) => ({
        id: String(snapshot._id),
        kind: snapshot.kind,
        title: snapshot.title,
        createdAt: snapshot.createdAt,
        createdByEmail: snapshot.createdByEmail,
        database: snapshot.database,
        summary: snapshot.summary,
        totalDocuments: snapshot.totalDocuments,
      })),
    });
  }),
);

backupRouter.get(
  "/learning/snapshots/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const snapshot = await BackupSnapshotModel.findById(req.params.id).lean();
    if (!snapshot) {
      res.status(404).json({ message: "لم يتم العثور على النسخة الاحتياطية." });
      return;
    }

    res.json({
      snapshot: {
        id: String(snapshot._id),
        kind: snapshot.kind,
        title: snapshot.title,
        createdAt: snapshot.createdAt,
        createdByEmail: snapshot.createdByEmail,
        database: snapshot.database,
        summary: snapshot.summary,
        totalDocuments: snapshot.totalDocuments,
      },
      backup: snapshot.payload,
    });
  }),
);

backupRouter.post(
  "/learning/snapshots/:id/restore",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = restoreSnapshotSchema.parse(req.body || {});
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

    const snapshot = await BackupSnapshotModel.findById(req.params.id).lean();
    if (!snapshot) {
      res.status(404).json({ message: "لم يتم العثور على النسخة الاحتياطية." });
      return;
    }

    assertLearningBackupPayload(snapshot.payload);
    const summary = await restoreLearningBackup(snapshot.payload, {
      apply: isApply,
      replace: isReplace,
    });

    res.json({
      ok: true,
      applied: isApply,
      replaced: isReplace,
      summary,
      snapshot: {
        id: String(snapshot._id),
        title: snapshot.title,
        createdAt: snapshot.createdAt,
      },
    });
  }),
);

backupRouter.delete(
  "/learning/snapshots/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const deleted = await BackupSnapshotModel.findByIdAndDelete(req.params.id).lean();
    if (!deleted) {
      res.status(404).json({ message: "لم يتم العثور على النسخة الاحتياطية." });
      return;
    }

    res.json({ ok: true });
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
