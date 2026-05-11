import { Router } from "express";
import crypto from "node:crypto";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { CourseModel } from "../models/Course.js";
import { DiscountCodeModel } from "../models/DiscountCode.js";
import { PaymentRequestModel } from "../models/PaymentRequest.js";
import { PaymentSettingsModel } from "../models/PaymentSettings.js";
import { UserModel } from "../models/User.js";
import { applyPurchaseToUser } from "../services/applyPurchaseToUser.js";
import { recordAdminAuditLog } from "../services/adminAuditLog.js";

const paymentMethodSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  label: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  iban: z.string().optional(),
  bankName: z.string().optional(),
  instructions: z.string().optional(),
  phoneNumber: z.string().optional(),
  providerName: z.string().optional(),
  publishDetailsToStudents: z.boolean().optional(),
});

const paymentSettingsUpdateSchema = z.object({
  currency: z.string().optional(),
  manualReviewRequired: z.boolean().optional(),
  webhookEnabled: z.boolean().optional(),
  webhookSecret: z.string().max(240).optional(),
  card: paymentMethodSettingsSchema.optional(),
  transfer: paymentMethodSettingsSchema.optional(),
  wallet: paymentMethodSettingsSchema.optional(),
  notes: z.string().optional(),
});

const paymentRequestCreateSchema = z.object({
  itemType: z.enum(["course", "package", "skill", "test"]),
  itemId: z.string().min(1),
  itemName: z.string().min(1),
  packageId: z.string().optional(),
  includedCourseIds: z.array(z.string()).optional(),
  amount: z.number().min(0),
  currency: z.string().default("SAR"),
  paymentMethod: z.enum(["card", "transfer", "wallet"]),
  transferReference: z.string().optional(),
  walletNumber: z.string().optional(),
  receiptUrl: z.string().optional(),
  discountCode: z.string().max(80).optional(),
  notes: z.string().optional(),
});

const paymentRequestReviewSchema = z.object({
  status: z.enum(["approved", "rejected", "cancelled"]),
  reviewerNotes: z.string().optional(),
  approvalEvidence: z.string().max(500).optional(),
});

const paymentWebhookSchema = z.object({
  provider: z.string().min(1).max(40).default("gateway"),
  eventId: z.string().min(1).max(160),
  paymentRequestId: z.string().min(1).max(160),
  status: z.enum(["paid", "failed", "cancelled"]),
  paidAmount: z.number().min(0).optional(),
  currency: z.string().max(10).optional(),
  transactionId: z.string().max(180).optional(),
  occurredAt: z.number().optional(),
});

const discountCodePayloadSchema = z.object({
  code: z.string().min(2).max(40),
  label: z.string().max(120).optional(),
  type: z.enum(["percentage", "fixed"]).default("percentage"),
  value: z.number().min(0),
  status: z.enum(["active", "paused", "expired"]).default("active"),
  minAmount: z.number().min(0).optional(),
  maxRedemptions: z.number().min(0).optional(),
  startsAt: z.number().nullable().optional(),
  expiresAt: z.number().nullable().optional(),
  packageIds: z.array(z.string()).optional(),
  pathIds: z.array(z.string()).optional(),
  subjectIds: z.array(z.string()).optional(),
  contentTypes: z.array(z.string()).optional(),
});

const discountCodePreviewSchema = z.object({
  itemType: z.enum(["course", "package", "skill", "test"]).optional(),
  itemId: z.string().min(1),
  packageId: z.string().optional(),
  amount: z.number().min(0),
  discountCode: z.string().max(80),
});

const defaultSettings = {
  currency: "SAR",
  manualReviewRequired: true,
  webhookEnabled: false,
  webhookSecret: "",
  card: {
    enabled: false,
    label: "بطاقة بنكية",
    publishDetailsToStudents: true,
  },
  transfer: {
    enabled: true,
    label: "تحويل بنكي",
    bankName: "",
    accountName: "",
    accountNumber: "",
    iban: "",
    instructions: "",
    publishDetailsToStudents: true,
  },
  wallet: {
    enabled: true,
    label: "محفظة إلكترونية",
    providerName: "",
    phoneNumber: "",
    instructions: "",
    publishDetailsToStudents: true,
  },
  notes: "",
};

const sanitizeSettingsForPublic = (settings: any) => ({
  key: settings.key,
  currency: settings.currency,
  manualReviewRequired: settings.manualReviewRequired,
  card: {
    enabled: Boolean(settings.card?.enabled),
    label: settings.card?.label || "بطاقة بنكية",
    instructions: settings.card?.instructions || "",
  },
  transfer: {
    enabled: Boolean(settings.transfer?.enabled),
    label: settings.transfer?.label || "تحويل بنكي",
    bankName: settings.transfer?.publishDetailsToStudents === false ? "" : (settings.transfer?.bankName || ""),
    accountName: settings.transfer?.publishDetailsToStudents === false ? "" : (settings.transfer?.accountName || ""),
    accountNumber: settings.transfer?.publishDetailsToStudents === false ? "" : (settings.transfer?.accountNumber || ""),
    iban: settings.transfer?.publishDetailsToStudents === false ? "" : (settings.transfer?.iban || ""),
    instructions: settings.transfer?.instructions || "",
  },
  wallet: {
    enabled: Boolean(settings.wallet?.enabled),
    label: settings.wallet?.label || "محفظة إلكترونية",
    providerName: settings.wallet?.publishDetailsToStudents === false ? "" : (settings.wallet?.providerName || ""),
    phoneNumber: settings.wallet?.publishDetailsToStudents === false ? "" : (settings.wallet?.phoneNumber || ""),
    instructions: settings.wallet?.instructions || "",
  },
  notes: settings.notes || "",
});

const getPaymentWebhookSecret = (settings: any) =>
  String(process.env.PAYMENT_WEBHOOK_SECRET || settings.webhookSecret || "").trim();

const getOrCreateSettings = async () => {
  let settings = await PaymentSettingsModel.findOne({ key: "default" });
  if (!settings) {
    settings = await PaymentSettingsModel.create({ key: "default", ...defaultSettings });
  }
  return settings;
};

const isPaymentMethodEnabled = (settings: any, method: "card" | "transfer" | "wallet") =>
  Boolean(settings?.[method]?.enabled);

const hasManualPaymentEvidence = (request: {
  paymentMethod?: string;
  transferReference?: string;
  walletNumber?: string;
  receiptUrl?: string;
  notes?: string;
}, approvalEvidence = "") => {
  const hasReceipt = Boolean(String(request.receiptUrl || "").trim());
  const hasTransferReference = Boolean(String(request.transferReference || "").trim());
  const hasWalletNumber = Boolean(String(request.walletNumber || "").trim());
  const hasCardEvidence = String(request.notes || "").trim().length >= 4;
  const hasAdminEvidence = String(approvalEvidence || "").trim().length >= 6;

  if (request.paymentMethod === "transfer") return hasReceipt || hasTransferReference || hasAdminEvidence;
  if (request.paymentMethod === "wallet") return hasReceipt || hasWalletNumber || hasAdminEvidence;
  if (request.paymentMethod === "card") return hasReceipt || hasCardEvidence || hasAdminEvidence;
  return hasReceipt || hasTransferReference || hasWalletNumber || hasAdminEvidence;
};

const buildPaymentEvidenceSummary = (request: {
  paymentMethod?: string;
  transferReference?: string;
  walletNumber?: string;
  receiptUrl?: string;
  notes?: string;
}, approvalEvidence = "") => [
  request.paymentMethod ? `method:${request.paymentMethod}` : "",
  request.transferReference ? `transfer:${request.transferReference}` : "",
  request.walletNumber ? `wallet:${request.walletNumber}` : "",
  request.receiptUrl ? `receipt:${request.receiptUrl}` : "",
  approvalEvidence ? `admin:${approvalEvidence}` : "",
].filter(Boolean).join(" | ");

const verifyPaymentWebhookSignature = (secret: string, payload: unknown, signature?: string | string[]) => {
  const provided = String(Array.isArray(signature) ? signature[0] : signature || "").replace(/^sha256=/, "").trim();
  if (!secret || !provided) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  return expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
};

const userAlreadyOwnsPurchase = (
  user: any,
  payload: z.infer<typeof paymentRequestCreateSchema>,
) => {
  const purchasedCourses = new Set<string>([
    ...((user.subscription?.purchasedCourses || []).map(String)),
    ...((user.enrolledCourses || []).map(String)),
  ]);
  const purchasedPackages = new Set<string>((user.subscription?.purchasedPackages || []).map(String));
  const targetPackageId = payload.packageId || (payload.itemType === "package" ? payload.itemId : "");

  if (payload.itemType === "course" && purchasedCourses.has(payload.itemId)) {
    return true;
  }

  if (targetPackageId && purchasedPackages.has(targetPackageId)) {
    return true;
  }

  if (payload.includedCourseIds?.length && payload.includedCourseIds.every((courseId) => purchasedCourses.has(String(courseId)))) {
    return true;
  }

  return false;
};

const buildPaymentRequestLookup = (id: string) => ({
  $or: [
    { id },
    ...(Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
  ],
});

const normalizeDiscountCode = (code?: string) => String(code || "").trim().toUpperCase().replace(/\s+/g, "");

const isDiscountCodeActive = (discountCode: any, now = Date.now()) => {
  if (!discountCode || discountCode.status !== "active") return false;
  if (discountCode.startsAt && discountCode.startsAt > now) return false;
  if (discountCode.expiresAt && discountCode.expiresAt < now) return false;
  if (discountCode.maxRedemptions > 0 && discountCode.currentRedemptions >= discountCode.maxRedemptions) return false;
  return true;
};

const discountAppliesToPayload = (
  discountCode: any,
  payload: z.infer<typeof paymentRequestCreateSchema>,
  purchasableItem: any,
) => {
  const packageId = payload.packageId || (payload.itemType === "package" ? payload.itemId : "");
  const pathId = purchasableItem?.pathId || purchasableItem?.category || "";
  const subjectId = purchasableItem?.subjectId || purchasableItem?.subject || "";
  const contentTypes = purchasableItem?.packageContentTypes?.length ? purchasableItem.packageContentTypes : [];

  if (discountCode.minAmount > 0 && payload.amount < discountCode.minAmount) return false;
  if (discountCode.packageIds?.length && !discountCode.packageIds.includes(packageId || payload.itemId)) return false;
  if (discountCode.pathIds?.length && (!pathId || !discountCode.pathIds.includes(pathId))) return false;
  if (discountCode.subjectIds?.length && (!subjectId || !discountCode.subjectIds.includes(subjectId))) return false;
  if (discountCode.contentTypes?.length && contentTypes.length && !contentTypes.some((type: string) => discountCode.contentTypes.includes(type))) return false;
  return true;
};

const calculateDiscountAmount = (discountCode: any, amount: number) => {
  if (discountCode.type === "fixed") {
    return Math.min(amount, Math.max(0, discountCode.value));
  }
  return Math.min(amount, Math.round((amount * Math.min(Math.max(discountCode.value, 0), 100)) / 100));
};

const reserveDiscountRedemptionForRequest = async (requestDoc: any) => {
  if (!requestDoc.discountCode || !requestDoc.discountCodeId) return true;

  const redemption = await DiscountCodeModel.findOneAndUpdate(
    {
      _id: requestDoc.discountCodeId,
      status: "active",
      $or: [{ maxRedemptions: 0 }, { $expr: { $lt: ["$currentRedemptions", "$maxRedemptions"] } }],
    },
    { $inc: { currentRedemptions: 1 } },
    { new: true },
  );

  return Boolean(redemption);
};

const completeApprovedPaymentRequest = async (
  requestDoc: any,
  review: {
    reviewedBy: string;
    reviewerNotes?: string;
    approvalEvidence: string;
    gatewayProvider?: string;
    gatewayTransactionId?: string;
    gatewayEventId?: string;
    gatewayPaidAt?: number;
  },
) => {
  requestDoc.status = "approved";
  requestDoc.reviewerNotes = review.reviewerNotes || "";
  requestDoc.approvalEvidence = review.approvalEvidence;
  requestDoc.reviewedBy = review.reviewedBy;
  requestDoc.reviewedAt = Date.now();
  requestDoc.gatewayProvider = review.gatewayProvider || requestDoc.gatewayProvider || "";
  requestDoc.gatewayTransactionId = review.gatewayTransactionId || requestDoc.gatewayTransactionId || "";
  requestDoc.gatewayEventId = review.gatewayEventId || requestDoc.gatewayEventId || "";
  requestDoc.gatewayPaidAt = review.gatewayPaidAt || requestDoc.gatewayPaidAt || null;
  await requestDoc.save();

  return applyPurchaseToUser(requestDoc.userId, {
    courseId: requestDoc.itemType === "course" ? requestDoc.itemId : undefined,
    packageId: requestDoc.packageId || (requestDoc.itemType === "package" ? requestDoc.itemId : undefined),
    includedCourseIds: Array.isArray(requestDoc.includedCourseIds) ? requestDoc.includedCourseIds : [],
  });
};

export const paymentRouter = Router();

paymentRouter.get(
  "/settings",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const settings = await getOrCreateSettings();

    if (req.authUser?.role === "admin") {
      return res.json(settings);
    }

    return res.json(sanitizeSettingsForPublic(settings));
  }),
);

paymentRouter.patch(
  "/settings",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = paymentSettingsUpdateSchema.parse(req.body);
    const settings = await getOrCreateSettings();
    Object.assign(settings, payload);
    await settings.save();
    await recordAdminAuditLog(req, {
      action: "payment.settings.update",
      resourceType: "payment-settings",
      resourceId: "default",
      metadata: { changedKeys: Object.keys(payload) },
    });
    return res.json(settings);
  }),
);

paymentRouter.get(
  "/requests",
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = req.authUser?.role === "admin" ? {} : { userId: req.authUser?.id };
    const requests = await PaymentRequestModel.find(filter).sort({ createdAt: -1 });
    return res.json({ requests });
  }),
);

paymentRouter.get(
  "/discount-codes",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (_req, res) => {
    const codes = await DiscountCodeModel.find().sort({ createdAt: -1 });
    return res.json({ codes });
  }),
);

paymentRouter.post(
  "/discount-codes/preview",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = discountCodePreviewSchema.parse(req.body);
    const normalizedDiscountCode = normalizeDiscountCode(payload.discountCode);
    const originalAmount = Number.isFinite(payload.amount) ? Math.max(0, payload.amount) : 0;
    const targetItemId = payload.packageId || payload.itemId;
    const purchasableItem = await CourseModel.findById(targetItemId).lean();

    if (!normalizedDiscountCode) {
      return res.json({ valid: false, originalAmount, discountAmount: 0, finalAmount: originalAmount });
    }

    const discountCode = await DiscountCodeModel.findOne({ code: normalizedDiscountCode });
    if (!discountCode || !isDiscountCodeActive(discountCode) || !discountAppliesToPayload(discountCode, payload as any, purchasableItem)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        valid: false,
        message: "كود الخصم غير صالح لهذا الطلب",
        originalAmount,
        discountAmount: 0,
        finalAmount: originalAmount,
      });
    }

    const discountAmount = calculateDiscountAmount(discountCode, originalAmount);
    return res.json({
      valid: true,
      code: normalizedDiscountCode,
      label: discountCode.label || normalizedDiscountCode,
      originalAmount,
      discountAmount,
      finalAmount: Math.max(0, originalAmount - discountAmount),
    });
  }),
);

paymentRouter.post(
  "/discount-codes",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = discountCodePayloadSchema.parse(req.body);
    const code = normalizeDiscountCode(payload.code);
    const created = await DiscountCodeModel.findOneAndUpdate(
      { code },
      {
        ...payload,
        code,
        label: payload.label || code,
        minAmount: payload.minAmount || 0,
        maxRedemptions: payload.maxRedemptions || 0,
        packageIds: payload.packageIds || [],
        pathIds: payload.pathIds || [],
        subjectIds: payload.subjectIds || [],
        contentTypes: payload.contentTypes || [],
        createdBy: req.authUser?.id || "",
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    await recordAdminAuditLog(req, {
      action: "payment.discount-code.upsert",
      resourceType: "discount-code",
      resourceId: code,
      metadata: { status: created.status, type: created.type, value: created.value },
    });
    return res.status(StatusCodes.CREATED).json({ code: created });
  }),
);

paymentRouter.patch(
  "/discount-codes/:code",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = discountCodePayloadSchema.partial().parse(req.body);
    const code = normalizeDiscountCode(req.params.code);
    const updated = await DiscountCodeModel.findOneAndUpdate(
      { code },
      {
        ...payload,
        ...(payload.code ? { code: normalizeDiscountCode(payload.code) } : {}),
      },
      { new: true },
    );
    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Discount code not found" });
    }
    await recordAdminAuditLog(req, {
      action: "payment.discount-code.update",
      resourceType: "discount-code",
      resourceId: code,
      metadata: { changedKeys: Object.keys(payload) },
    });
    return res.json({ code: updated });
  }),
);

paymentRouter.post(
  "/requests",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = paymentRequestCreateSchema.parse(req.body);
    const settings = await getOrCreateSettings();
    const user = await UserModel.findById(req.authUser?.id);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
    }

    if (!isPaymentMethodEnabled(settings, payload.paymentMethod)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "وسيلة الدفع غير متاحة حاليًا" });
    }

    if (!hasManualPaymentEvidence(payload)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "أرسل مرجع دفع أو إيصالًا واضحًا حتى يمكن مراجعة الطلب يدويًا",
      });
    }

    if (userAlreadyOwnsPurchase(user, payload)) {
      return res.status(StatusCodes.CONFLICT).json({
        message: "هذا المحتوى مفعل بالفعل على حسابك",
      });
    }

    const pendingDuplicate = await PaymentRequestModel.findOne({
      userId: String(user._id),
      itemType: payload.itemType,
      itemId: payload.itemId,
      status: "pending",
    });

    if (pendingDuplicate) {
      return res.status(StatusCodes.CONFLICT).json({
        message: "يوجد طلب دفع قيد المراجعة لهذا المحتوى بالفعل",
        request: pendingDuplicate,
      });
    }

    const targetItemId = payload.packageId || payload.itemId;
    const purchasableItem = await CourseModel.findById(targetItemId).lean();
    const originalAmount = Number.isFinite(payload.amount) ? Math.max(0, payload.amount) : 0;
    let finalAmount = originalAmount;
    let discountAmount = 0;
    let discountCodeId = "";
    const normalizedDiscountCode = normalizeDiscountCode(payload.discountCode);

    if (normalizedDiscountCode) {
      const discountCode = await DiscountCodeModel.findOne({ code: normalizedDiscountCode });
      if (!discountCode || !isDiscountCodeActive(discountCode) || !discountAppliesToPayload(discountCode, payload, purchasableItem)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "كود الخصم غير صالح لهذا الطلب" });
      }
      discountAmount = calculateDiscountAmount(discountCode, originalAmount);
      finalAmount = Math.max(0, originalAmount - discountAmount);
      discountCodeId = String(discountCode._id);
    }

    const created = await PaymentRequestModel.create({
      id: `payreq_${Date.now()}`,
      userId: String(user._id),
      userName: user.name,
      userEmail: user.email,
      ...payload,
      packageId: payload.packageId || "",
      includedCourseIds: payload.includedCourseIds || [],
      originalAmount,
      discountAmount,
      discountCodeId,
      amount: finalAmount,
      discountCode: normalizedDiscountCode,
      status: "pending",
    });

    return res.status(StatusCodes.CREATED).json({ request: created });
  }),
);

paymentRouter.post(
  "/webhooks/payment",
  asyncHandler(async (req, res) => {
    const payload = paymentWebhookSchema.parse(req.body);
    const settings = await getOrCreateSettings();
    const webhookSecret = getPaymentWebhookSecret(settings);

    if (!settings.webhookEnabled && !process.env.PAYMENT_WEBHOOK_SECRET) {
      return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ message: "Payment webhook is disabled" });
    }

    if (!verifyPaymentWebhookSignature(webhookSecret, req.body, req.headers["x-payment-signature"])) {
      await recordAdminAuditLog(req, {
        action: "payment.webhook.rejected",
        resourceType: "payment-request",
        resourceId: payload.paymentRequestId,
        status: "blocked",
        metadata: { provider: payload.provider, eventId: payload.eventId, reason: "invalid-signature" },
      });
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid payment webhook signature" });
    }

    const requestDoc = await PaymentRequestModel.findOne(buildPaymentRequestLookup(payload.paymentRequestId));
    if (!requestDoc) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Payment request not found" });
    }

    if (requestDoc.gatewayEventId === payload.eventId || requestDoc.status === "approved") {
      return res.json({ ok: true, duplicate: true, request: requestDoc });
    }

    const duplicateGatewayEvent = await PaymentRequestModel.findOne({
      gatewayEventId: payload.eventId,
      _id: { $ne: requestDoc._id },
    });

    if (duplicateGatewayEvent) {
      return res.status(StatusCodes.CONFLICT).json({ message: "Payment gateway event was already used" });
    }

    if (requestDoc.status !== "pending") {
      return res.status(StatusCodes.CONFLICT).json({ message: "Payment request is not pending" });
    }

    if (payload.status !== "paid") {
      requestDoc.status = payload.status === "cancelled" ? "cancelled" : "rejected";
      requestDoc.reviewerNotes = `بوابة الدفع: ${payload.status}`;
      requestDoc.reviewedBy = `webhook:${payload.provider}`;
      requestDoc.reviewedAt = Date.now();
      requestDoc.gatewayProvider = payload.provider;
      requestDoc.gatewayTransactionId = payload.transactionId || "";
      requestDoc.gatewayEventId = payload.eventId;
      await requestDoc.save();
      return res.json({ ok: true, request: requestDoc });
    }

    if (payload.currency && payload.currency !== requestDoc.currency) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Payment currency mismatch" });
    }

    if (typeof payload.paidAmount === "number" && payload.paidAmount < requestDoc.amount) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Paid amount is lower than request amount" });
    }

    const discountReserved = await reserveDiscountRedemptionForRequest(requestDoc);
    if (!discountReserved) {
      return res.status(StatusCodes.CONFLICT).json({ message: "كود الخصم لم يعد متاحًا للاعتماد" });
    }

    const updatedUser = await completeApprovedPaymentRequest(requestDoc, {
      reviewedBy: `webhook:${payload.provider}`,
      reviewerNotes: "تم الاعتماد آليًا من بوابة الدفع",
      approvalEvidence: `webhook:${payload.provider}:${payload.transactionId || payload.eventId}`,
      gatewayProvider: payload.provider,
      gatewayTransactionId: payload.transactionId || "",
      gatewayEventId: payload.eventId,
      gatewayPaidAt: payload.occurredAt || Date.now(),
    });

    await recordAdminAuditLog(req, {
      action: "payment.webhook.approved",
      resourceType: "payment-request",
      resourceId: String(requestDoc.id || requestDoc._id),
      metadata: {
        provider: payload.provider,
        eventId: payload.eventId,
        transactionId: payload.transactionId || "",
        amount: payload.paidAmount ?? requestDoc.amount,
        userId: requestDoc.userId,
      },
    });

    return res.json({ ok: true, request: requestDoc, user: updatedUser });
  }),
);

paymentRouter.patch(
  "/requests/:id/review",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = paymentRequestReviewSchema.parse(req.body);
    const requestDoc = await PaymentRequestModel.findOne(buildPaymentRequestLookup(req.params.id));

    if (!requestDoc) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Payment request not found" });
    }

    if (requestDoc.status === "approved" && payload.status === "approved") {
      return res.status(StatusCodes.CONFLICT).json({
        message: "طلب الدفع معتمد بالفعل",
        request: requestDoc,
      });
    }

    if (payload.status === "approved") {
      const purchaseUser = await UserModel.findById(requestDoc.userId).select("_id");
      if (!purchaseUser) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "لا يمكن اعتماد طلب دفع لمستخدم غير موجود" });
      }

      if (!hasManualPaymentEvidence(requestDoc, payload.approvalEvidence)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "لا يمكن اعتماد طلب دفع بدون مرجع أو إيصال أو دليل مراجعة واضح",
        });
      }

      const discountReserved = await reserveDiscountRedemptionForRequest(requestDoc);
      if (!discountReserved) {
        return res.status(StatusCodes.CONFLICT).json({ message: "كود الخصم لم يعد متاحًا للاعتماد" });
      }
    }

    let updatedUser = null;
    if (payload.status === "approved") {
      updatedUser = await completeApprovedPaymentRequest(requestDoc, {
        reviewedBy: req.authUser?.id || "",
        reviewerNotes: payload.reviewerNotes || "",
        approvalEvidence: buildPaymentEvidenceSummary(requestDoc, payload.approvalEvidence),
      });
    } else {
      requestDoc.status = payload.status;
      requestDoc.reviewerNotes = payload.reviewerNotes || "";
      requestDoc.approvalEvidence = "";
      requestDoc.reviewedBy = req.authUser?.id || "";
      requestDoc.reviewedAt = Date.now();
      await requestDoc.save();
    }

    await recordAdminAuditLog(req, {
      action: "payment.request.review",
      resourceType: "payment-request",
      resourceId: String(requestDoc.id || requestDoc._id),
      metadata: {
        status: payload.status,
        itemType: requestDoc.itemType,
        itemId: requestDoc.itemId,
        userId: requestDoc.userId,
        discountCode: requestDoc.discountCode || "",
        discountAmount: requestDoc.discountAmount || 0,
        approvalEvidence: requestDoc.approvalEvidence || "",
      },
    });

    return res.json({
      request: requestDoc,
      user: updatedUser,
    });
  }),
);
