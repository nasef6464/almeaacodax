import mongoose from "mongoose";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { BackupActivityModel } from "../models/BackupActivity.js";
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

const backupCountFromRestoreSummary = (summary: Record<string, { backup: number }>) =>
  Object.values(summary).reduce((total, row) => total + Number(row.backup || 0), 0);

const snapshotResponse = (snapshot: {
  _id: unknown;
  kind?: string;
  title?: string;
  createdAt?: unknown;
  createdByEmail?: string;
  database?: string;
  summary?: Record<string, number>;
  totalDocuments?: number;
}) => ({
  id: String(snapshot._id),
  kind: snapshot.kind,
  title: snapshot.title,
  createdAt: snapshot.createdAt,
  createdByEmail: snapshot.createdByEmail,
  database: snapshot.database,
  summary: snapshot.summary,
  totalDocuments: snapshot.totalDocuments,
});

async function saveLearningSnapshot(options: {
  title: string;
  actorId?: string;
  actorEmail?: string;
  activityAction?: "snapshot-created" | "restore-safety-snapshot";
}) {
  const backup = await createLearningBackup(mongoose.connection.db?.databaseName || "unknown");
  const totalDocuments = totalDocumentsFromSummary(backup.summary);
  const snapshot = await BackupSnapshotModel.create({
    kind: "learning-content",
    title: options.title,
    createdBy: options.actorId || "",
    createdByEmail: options.actorEmail || "",
    database: backup.database || "",
    summary: backup.summary,
    totalDocuments,
    payload: backup,
  });

  await BackupActivityModel.create({
    kind: "learning-content",
    action: options.activityAction || "snapshot-created",
    title: options.title,
    actorId: options.actorId || "",
    actorEmail: options.actorEmail || "",
    snapshotId: String(snapshot._id),
    source: "server-snapshot",
    summary: backup.summary,
    totalDocuments,
  });

  return snapshot;
}

async function createRestoreActivity(options: {
  action: "restore-preview" | "restore-applied";
  title: string;
  actorId?: string;
  actorEmail?: string;
  snapshotId?: string;
  safetySnapshotId?: string;
  source: "server-snapshot" | "uploaded-file";
  applied: boolean;
  replaced: boolean;
  summary: Record<string, { backup: number; current: number; action: string }>;
}) {
  await BackupActivityModel.create({
    kind: "learning-content",
    action: options.action,
    title: options.title,
    actorId: options.actorId || "",
    actorEmail: options.actorEmail || "",
    snapshotId: options.snapshotId || "",
    safetySnapshotId: options.safetySnapshotId || "",
    source: options.source,
    applied: options.applied,
    replaced: options.replaced,
    summary: options.summary,
    totalDocuments: backupCountFromRestoreSummary(options.summary),
  });
}

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
    const title = body.title?.trim() || `نسخة تعليمية ${new Date().toLocaleString("ar-SA")}`;
    const snapshot = await saveLearningSnapshot({
      title,
      actorId: req.authUser?.id || "",
      actorEmail: req.authUser?.email || "",
      activityAction: "snapshot-created",
    });

    res.status(201).json({
      snapshot: snapshotResponse(snapshot),
    });
  }),
);

backupRouter.get(
  "/learning/activity",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (_req, res) => {
    const activities = await BackupActivityModel.find({ kind: "learning-content" })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      activities: activities.map((activity) => ({
        id: String(activity._id),
        action: activity.action,
        title: activity.title,
        actorEmail: activity.actorEmail,
        snapshotId: activity.snapshotId,
        safetySnapshotId: activity.safetySnapshotId,
        source: activity.source,
        applied: activity.applied,
        replaced: activity.replaced,
        summary: activity.summary,
        totalDocuments: activity.totalDocuments,
        createdAt: activity.createdAt,
      })),
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
      snapshots: snapshots.map(snapshotResponse),
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
      snapshot: snapshotResponse(snapshot),
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
    let safetySnapshotId = "";
    if (isApply) {
      const safetySnapshot = await saveLearningSnapshot({
        title: `نسخة أمان قبل الاسترجاع - ${new Date().toLocaleString("ar-SA")}`,
        actorId: req.authUser?.id || "",
        actorEmail: req.authUser?.email || "",
        activityAction: "restore-safety-snapshot",
      });
      safetySnapshotId = String(safetySnapshot._id);
    }

    const summary = await restoreLearningBackup(snapshot.payload, {
      apply: isApply,
      replace: isReplace,
    });

    await createRestoreActivity({
      action: isApply ? "restore-applied" : "restore-preview",
      title: isApply ? "تطبيق استرجاع من Snapshot محفوظة" : "فحص استرجاع من Snapshot محفوظة",
      actorId: req.authUser?.id || "",
      actorEmail: req.authUser?.email || "",
      snapshotId: String(snapshot._id),
      safetySnapshotId,
      source: "server-snapshot",
      applied: isApply,
      replaced: isReplace,
      summary,
    });

    res.json({
      ok: true,
      applied: isApply,
      replaced: isReplace,
      summary,
      safetySnapshotId,
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

    await BackupActivityModel.create({
      kind: "learning-content",
      action: "snapshot-deleted",
      title: `حذف نسخة محفوظة: ${deleted.title || req.params.id}`,
      actorId: req.authUser?.id || "",
      actorEmail: req.authUser?.email || "",
      snapshotId: String(deleted._id),
      source: "server-snapshot",
      summary: deleted.summary || {},
      totalDocuments: deleted.totalDocuments || 0,
    });

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

    let safetySnapshotId = "";
    if (isApply) {
      const safetySnapshot = await saveLearningSnapshot({
        title: `نسخة أمان قبل استرجاع ملف خارجي - ${new Date().toLocaleString("ar-SA")}`,
        actorId: req.authUser?.id || "",
        actorEmail: req.authUser?.email || "",
        activityAction: "restore-safety-snapshot",
      });
      safetySnapshotId = String(safetySnapshot._id);
    }

    const summary = await restoreLearningBackup(payload.backup, {
      apply: isApply,
      replace: isReplace,
    });

    await createRestoreActivity({
      action: isApply ? "restore-applied" : "restore-preview",
      title: isApply ? "تطبيق استرجاع من ملف خارجي" : "فحص استرجاع من ملف خارجي",
      actorId: req.authUser?.id || "",
      actorEmail: req.authUser?.email || "",
      safetySnapshotId,
      source: "uploaded-file",
      applied: isApply,
      replaced: isReplace,
      summary,
    });

    res.json({
      ok: true,
      applied: isApply,
      replaced: isReplace,
      summary,
      safetySnapshotId,
      note:
        isApply
          ? "Restore completed."
          : "Dry run only. Send apply=true to write, and replace=true only when intentionally replacing managed learning collections.",
    });
  }),
);
