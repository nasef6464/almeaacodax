import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import mongoose from "mongoose";
import { roles } from "../constants/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { NotificationDeliveryModel } from "../models/NotificationDelivery.js";
import { NotificationTemplateModel } from "../models/NotificationTemplate.js";
import { UserModel } from "../models/User.js";
import {
  getAuthorizedParentIdsForStudent,
  getAuthorizedStudentIdsForParent,
} from "../services/parentAuthorityService.js";
import { enqueueNotificationDeliveries, enqueuePendingNotifications } from "../queues/notificationQueue.js";
import {
  createNotificationDeliveries,
  getNotificationBatchLimit,
  processPendingNotifications,
} from "../services/notificationService.js";
import { buildPaginatedResponse, resolvePagination } from "../utils/pagination.js";
import { sendExternalNotification } from "../services/notificationProviders.js";
import { openNotificationSseStream } from "../modules/notifications/http/openNotificationSseStream.js";
import { interventionAlertSchema, studentAlertSchema } from "../modules/notifications/application/notificationAlertSchemas.js";
import {
  getAuthorizedStudentIdsForNotificationActor,
  getAuthorizedSupervisorRecipientIdsForStudent,
} from "../modules/notifications/application/notificationAudienceAuthority.js";
import {
  createNotificationCampaignDeliveries,
  MAX_NOTIFICATION_CAMPAIGN_RECIPIENTS,
  NotificationCampaignTooLargeError,
} from "../modules/notifications/application/createNotificationCampaign.js";
import { sendParentWeeklyPerformanceReport } from "../modules/reports/application/sendParentWeeklyPerformanceReport.js";

export const notificationRouter = Router();

const channelSchema = z.enum(["in_app", "email", "whatsapp"]);

const templateSchema = z.object({
  key: z.string().min(2).max(80).regex(/^[a-z0-9_.-]+$/i),
  name: z.string().min(2).max(160),
  channel: channelSchema.default("in_app"),
  subject: z.string().max(220).optional().default(""),
  title: z.string().min(2).max(220),
  body: z.string().min(2).max(4000),
  variables: z.array(z.string().min(1).max(80)).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

const sendNotificationSchema = z.object({
  templateKey: z.string().min(2).max(80).optional(),
  title: z.string().min(2).max(220).optional(),
  subject: z.string().max(220).optional(),
  body: z.string().min(2).max(4000).optional(),
  channels: z.array(channelSchema).min(1).max(3),
  userIds: z.array(z.string().min(1).max(120)).optional().default([]),
  roles: z.array(z.enum(roles)).optional().default([]),
  variables: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().default({}),
});

const processPendingSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(25),
});

const integrationTestSchema = z.object({
  channel: z.enum(["email", "whatsapp"]),
  recipientEmail: z.string().email().optional().default(""),
  recipientPhone: z.string().min(8).max(30).optional().default(""),
  subject: z.string().max(220).optional().default("اختبار التكامل"),
  title: z.string().min(2).max(220).optional().default("اختبار التكامل"),
  body: z.string().min(2).max(1000).optional().default("هذه رسالة اختبار من منصة المئة."),
});

const adminListSchema = z.object({
  status: z.enum(["pending", "sent", "failed", "retrying"]).optional(),
  channel: channelSchema.optional(),
});

notificationRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const pagination = resolvePagination(req.query, { limit: 50 });
    const filter = {
      recipientUserId: req.authUser!.id,
      channel: "in_app",
      status: "sent",
    };
    const [items, total] = await Promise.all([
      NotificationDeliveryModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      NotificationDeliveryModel.countDocuments(filter),
    ]);

    res.json({ notifications: items, pagination: buildPaginatedResponse([], pagination, total) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/notifications/me/unread-count
 * عدد الإشعارات غير المقروءة للمستخدم الحالي
 */
notificationRouter.get("/me/unread-count", requireAuth, async (req, res, next) => {
  try {
    const count = await NotificationDeliveryModel.countDocuments({
      recipientUserId: req.authUser!.id,
      channel: "in_app",
      status: "sent",
      readAt: { $exists: false },
    });
    res.json({ unreadCount: count });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/notifications/me/read-all
 * تعليم جميع الإشعارات كمقروءة
 */
notificationRouter.patch("/me/read-all", requireAuth, async (req, res, next) => {
  try {
    const result = await NotificationDeliveryModel.updateMany(
      { recipientUserId: req.authUser!.id, channel: "in_app", readAt: { $exists: false } },
      { $set: { readAt: Date.now() } },
    );
    res.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/notifications/stream
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-Sent Events (SSE) — إرسال فوري عند وصول إشعار جديد.
 * يعتمد على Redis Pub/Sub (أو local fan-out fallback) ولا يعمل polling دوري على Mongo.
 * الـ Client يستمع بـ EventSource('/api/notifications/stream').
 * يُرسل حدثين: 'notification' (إشعار جديد) و'unread_count' (عدد غير المقروء).
 */
notificationRouter.get("/stream", requireAuth, openNotificationSseStream);

notificationRouter.patch("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const updated = await NotificationDeliveryModel.findOneAndUpdate(
      { id: req.params.id, recipientUserId: req.authUser!.id, channel: "in_app" },
      { $set: { readAt: Date.now() } },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Notification not found" });
    }

    res.json({ notification: updated });
  } catch (error) {
    next(error);
  }
});

notificationRouter.get("/admin/templates", requireAuth, requireRole(["admin"]), async (_req, res, next) => {
  try {
    const pagination = resolvePagination(_req.query, { limit: 50 });
    const [templates, total] = await Promise.all([
      NotificationTemplateModel.find().sort({ updatedAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
      NotificationTemplateModel.countDocuments(),
    ]);
    res.json({ templates, pagination: buildPaginatedResponse([], pagination, total) });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/admin/templates", requireAuth, requireRole(["admin"]), async (req, res, next) => {
  try {
    const payload = templateSchema.parse(req.body);
    const template = await NotificationTemplateModel.findOneAndUpdate(
      { key: payload.key },
      {
        $set: {
          ...payload,
          updatedBy: req.authUser!.id,
        },
        $setOnInsert: {
          createdBy: req.authUser!.id,
        },
      },
      { new: true, upsert: true },
    ).lean();

    res.status(StatusCodes.CREATED).json({ template });
  } catch (error) {
    next(error);
  }
});

notificationRouter.get("/admin/deliveries", requireAuth, requireRole(["admin"]), async (req, res, next) => {
  try {
    const query = adminListSchema.parse(req.query);
    const pagination = resolvePagination(req.query, { limit: 50 });
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.channel) filter.channel = query.channel;

    const [deliveries, total, pendingCount, failedCount] = await Promise.all([
      NotificationDeliveryModel.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
      NotificationDeliveryModel.countDocuments(filter),
      NotificationDeliveryModel.countDocuments({ status: { $in: ["pending", "retrying"] } }),
      NotificationDeliveryModel.countDocuments({ status: "failed" }),
    ]);

    res.json({ deliveries, pagination: buildPaginatedResponse([], pagination, total), summary: { pendingCount, failedCount } });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/admin/send", requireAuth, requireRole(["admin"]), async (req, res, next) => {
  try {
    const payload = sendNotificationSchema.parse(req.body);
    if (!payload.userIds.length && !payload.roles.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Select users or roles before sending" });
    }

    const result = await createNotificationCampaignDeliveries({
      templateKey: payload.templateKey,
      title: payload.title,
      subject: payload.subject,
      body: payload.body,
      channels: payload.channels,
      userIds: payload.userIds,
      roles: payload.roles,
      variables: payload.variables,
      createdBy: req.authUser!.id,
    });

    res.status(StatusCodes.ACCEPTED).json({
      ...result,
      maxRecipientsPerBatch: getNotificationBatchLimit(),
      maxRecipientsPerCampaign: MAX_NOTIFICATION_CAMPAIGN_RECIPIENTS,
      message: result.queue.queued
        ? "Notification campaign delivery records created in bounded batches and external deliveries queued."
        : "Notification campaign delivery records created in bounded batches. External channels stay pending until Redis/BullMQ is configured or processed manually.",
    });
  } catch (error) {
    if (error instanceof NotificationCampaignTooLargeError) {
      return res.status(StatusCodes.REQUEST_TOO_LONG).json({
        message: "Notification campaign audience exceeds the configured safety limit.",
        maxRecipientsPerCampaign: error.maxRecipients,
        resolvedRecipients: error.resolvedRecipients,
      });
    }
    next(error);
  }
});

notificationRouter.post("/intervention-alert", requireAuth, requireRole(["admin", "supervisor", "teacher"]), async (req, res, next) => {
  try {
    const payload = interventionAlertSchema.parse(req.body || {});
    const authUser = req.authUser!;
    const studentLookup = mongoose.isValidObjectId(payload.studentId)
      ? { $or: [{ _id: payload.studentId }, { id: payload.studentId }] }
      : { id: payload.studentId };
    const student = await UserModel.findOne({
      role: "student",
      ...studentLookup,
    })
      .select("_id id name email role schoolId groupIds")
      .lean();

    if (!student) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Student not found" });
    }

    const studentId = String((student as any).id || (student as any)._id);
    const authorizedStudentIds = await getAuthorizedStudentIdsForNotificationActor(authUser, [student as any]);
    if (!authorizedStudentIds.has(studentId)) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this student" });
    }

    const [authorizedParentIds, supervisorIds] = await Promise.all([
      getAuthorizedParentIdsForStudent(studentId),
      getAuthorizedSupervisorRecipientIdsForStudent(student as any),
    ]);
    const recipientIds = Array.from(
      new Set([
        ...authorizedParentIds,
        ...supervisorIds,
      ]),
    ).filter((id) => id && id !== String(authUser.id));

    if (!recipientIds.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "No linked parent or supervisor recipients found" });
    }

    const result = await createNotificationDeliveries({
      title: payload.title,
      subject: payload.title,
      body: payload.body,
      channels: ["in_app"],
      userIds: recipientIds,
      variables: {
        studentName: payload.studentName || String((student as any).name || ""),
        skillName: payload.skillName || "",
        mastery: payload.mastery ?? "",
      },
      createdBy: authUser.id,
    });

    res.status(StatusCodes.ACCEPTED).json({
      ...result,
      message: "Intervention alert created for linked parent and supervisor recipients.",
    });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/student-alert", requireAuth, requireRole(["admin", "supervisor", "teacher"]), async (req, res, next) => {
  try {
    const payload = studentAlertSchema.parse(req.body || {});
    const authUser = req.authUser!;
    const requestedIds = Array.from(new Set(payload.studentIds.map(String)));
    const requestedObjectIds = requestedIds.filter((id) => mongoose.isValidObjectId(id));
    const students = await UserModel.find({
      role: "student",
      $or: [
        { id: { $in: requestedIds } },
        ...(requestedObjectIds.length ? [{ _id: { $in: requestedObjectIds } }] : []),
      ],
    })
      .select("_id id name role schoolId groupIds")
      .lean();

    if (!students.length) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "No students found for alert recipients" });
    }

    const recipientIds = students.map((student: any) => String(student.id || student._id));
    const authorizedStudentIds = await getAuthorizedStudentIdsForNotificationActor(
      authUser,
      students as any[],
    );
    if (recipientIds.some((studentId) => !authorizedStudentIds.has(studentId))) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to one or more students" });
    }

    const result = await createNotificationDeliveries({
      title: payload.title,
      subject: payload.title,
      body: payload.body,
      channels: ["in_app"],
      userIds: recipientIds,
      variables: {
        recipientCount: recipientIds.length,
      },
      createdBy: authUser.id,
    });

    res.status(StatusCodes.ACCEPTED).json({
      ...result,
      message: "Student alert created for scoped student recipients.",
    });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/admin/process-pending", requireAuth, requireRole(["admin"]), async (req, res, next) => {
  try {
    const payload = processPendingSchema.parse(req.body || {});
    const queueResult = await enqueuePendingNotifications(payload.limit);
    if (queueResult.queued) {
      return res.json({ mode: "queued", ...queueResult });
    }

    const result = await processPendingNotifications(payload.limit);
    res.json({ mode: "inline-fallback", ...result });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post("/admin/test-delivery", requireAuth, requireRole(["admin"]), async (req, res, next) => {
  try {
    const payload = integrationTestSchema.parse(req.body || {});
    if (payload.channel === "email" && !payload.recipientEmail) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "recipientEmail is required for email test." });
    }
    if (payload.channel === "whatsapp" && !payload.recipientPhone) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "recipientPhone is required for whatsapp test." });
    }

    const result = await sendExternalNotification({
      channel: payload.channel,
      id: `integration-test-${Date.now()}`,
      recipientEmail: payload.recipientEmail,
      recipientPhone: payload.recipientPhone,
      subject: payload.subject,
      title: payload.title,
      body: payload.body,
    });

    if (!result.ok) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        ok: false,
        provider: result.provider,
        failureReason: result.failureReason || "provider_error",
      });
    }

    return res.json({
      ok: true,
      provider: result.provider,
      providerMessageId: result.providerMessageId || "",
    });
  } catch (error) {
    return next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notifications/parent-weekly-report
// Compatibility HTTP path. Report generation belongs to the reports application module.
// ─────────────────────────────────────────────────────────────────────────────
notificationRouter.post(
  "/parent-weekly-report",
  requireAuth,
  requireRole(["parent"]),
  async (req, res, next) => {
    try {
      const result = await sendParentWeeklyPerformanceReport(String(req.authUser!.id));
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  },
);
