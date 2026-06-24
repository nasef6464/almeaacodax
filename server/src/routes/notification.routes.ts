import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import mongoose from "mongoose";
import { roles } from "../constants/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { NotificationDeliveryModel } from "../models/NotificationDelivery.js";
import { NotificationTemplateModel } from "../models/NotificationTemplate.js";
import { GroupModel } from "../models/Group.js";
import { UserModel } from "../models/User.js";
import { enqueueNotificationDeliveries, enqueuePendingNotifications } from "../queues/notificationQueue.js";
import {
  createNotificationDeliveries,
  getNotificationBatchLimit,
  processPendingNotifications,
} from "../services/notificationService.js";
import { buildPaginatedResponse, resolvePagination } from "../utils/pagination.js";
import { sendExternalNotification } from "../services/notificationProviders.js";

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

const interventionAlertSchema = z.object({
  studentId: z.string().min(1).max(120),
  studentName: z.string().min(1).max(160).optional().default(""),
  skillName: z.string().max(180).optional().default(""),
  mastery: z.number().min(0).max(100).optional(),
  title: z.string().min(2).max(220),
  body: z.string().min(2).max(1200),
  channels: z.array(z.literal("in_app")).optional().default(["in_app"]),
});

const studentAlertSchema = z.object({
  studentIds: z.array(z.string().min(1).max(120)).min(1).max(50),
  title: z.string().min(2).max(220),
  body: z.string().min(2).max(1200),
  channels: z.array(z.literal("in_app")).optional().default(["in_app"]),
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

    const result = await createNotificationDeliveries({
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
    const queueResult = await enqueueNotificationDeliveries(result.deliveryIds || []);

    res.status(StatusCodes.ACCEPTED).json({
      ...result,
      queue: queueResult,
      maxRecipientsPerRequest: getNotificationBatchLimit(),
      message: queueResult.queued
        ? "Notification delivery records created and external deliveries queued."
        : "Notification delivery records created. External channels stay pending until Redis/BullMQ is configured or processed manually.",
    });
  } catch (error) {
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
    const studentGroupIds = Array.isArray((student as any).groupIds) ? (student as any).groupIds.map(String) : [];
    const groupObjectIds = studentGroupIds.filter((id: string) => mongoose.isValidObjectId(id));
    const scopedGroups = await GroupModel.find({
      $or: [
        { studentIds: studentId },
        ...(groupObjectIds.length ? [{ _id: { $in: groupObjectIds } }] : []),
        { id: { $in: studentGroupIds } },
      ],
    })
      .select("_id id supervisorIds studentIds")
      .lean();

    if (authUser.role !== "admin") {
      const authGroupIds = Array.isArray((authUser as any).groupIds) ? (authUser as any).groupIds.map(String) : [];
      const canReachStudent =
        authGroupIds.some((groupId: string) => studentGroupIds.includes(groupId)) ||
        scopedGroups.some((group: any) => (group.supervisorIds || []).map(String).includes(String(authUser.id))) ||
        (Array.isArray((authUser as any).linkedStudentIds) && (authUser as any).linkedStudentIds.map(String).includes(studentId));

      if (!canReachStudent) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this student" });
      }
    }

    const supervisorIds = new Set<string>();
    scopedGroups.forEach((group: any) => (group.supervisorIds || []).forEach((id: unknown) => supervisorIds.add(String(id))));
    const parentUsers = await UserModel.find({ role: "parent", linkedStudentIds: studentId }).select("_id id").lean();
    const recipientIds = Array.from(
      new Set([
        ...parentUsers.map((user: any) => String(user.id || user._id)),
        ...Array.from(supervisorIds),
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
    const studentGroupIds = Array.from(
      new Set(students.flatMap((student: any) => (Array.isArray(student.groupIds) ? student.groupIds.map(String) : []))),
    );
    const groupObjectIds = studentGroupIds.filter((id) => mongoose.isValidObjectId(id));
    const scopedGroups = await GroupModel.find({
      $or: [
        { studentIds: { $in: recipientIds } },
        { id: { $in: studentGroupIds } },
        ...(groupObjectIds.length ? [{ _id: { $in: groupObjectIds } }] : []),
      ],
    })
      .select("_id id supervisorIds studentIds")
      .lean();

    if (authUser.role !== "admin") {
      const authGroupIds = Array.isArray((authUser as any).groupIds) ? (authUser as any).groupIds.map(String) : [];
      const authSchoolId = String((authUser as any).schoolId || "");
      const scopedGroupIds = new Set(scopedGroups.map((group: any) => String(group.id || group._id)));
      const supervisedGroups = scopedGroups.filter((group: any) =>
        (group.supervisorIds || []).map(String).includes(String(authUser.id)),
      );

      const forbiddenStudent = students.find((student: any) => {
        const studentId = String(student.id || student._id);
        const groupsForStudent = Array.isArray(student.groupIds) ? student.groupIds.map(String) : [];
        const sharesSchool = authSchoolId && String(student.schoolId || "") === authSchoolId;
        const sharesAssignedGroup = authGroupIds.some((groupId: string) => groupsForStudent.includes(groupId) || scopedGroupIds.has(groupId));
        const supervisedGroupContainsStudent = supervisedGroups.some((group: any) => {
          const groupId = String(group.id || group._id);
          return groupsForStudent.includes(groupId) || (group.studentIds || []).map(String).includes(studentId);
        });
        return !sharesSchool && !sharesAssignedGroup && !supervisedGroupContainsStudent;
      });

      if (forbiddenStudent) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to one or more students" });
      }
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
