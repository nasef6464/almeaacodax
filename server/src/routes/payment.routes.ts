import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { PaymentRequestModel } from "../models/PaymentRequest.js";
import { PaymentSettingsModel } from "../models/PaymentSettings.js";
import { UserModel } from "../models/User.js";
import { applyPurchaseToUser } from "../services/applyPurchaseToUser.js";

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
  notes: z.string().optional(),
});

const paymentRequestReviewSchema = z.object({
  status: z.enum(["approved", "rejected", "cancelled"]),
  reviewerNotes: z.string().optional(),
});

const defaultSettings = {
  currency: "SAR",
  manualReviewRequired: true,
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

const getOrCreateSettings = async () => {
  let settings = await PaymentSettingsModel.findOne({ key: "default" });
  if (!settings) {
    settings = await PaymentSettingsModel.create({ key: "default", ...defaultSettings });
  }
  return settings;
};

const isPaymentMethodEnabled = (settings: any, method: "card" | "transfer" | "wallet") =>
  Boolean(settings?.[method]?.enabled);

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
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Payment method is not available now" });
    }

    const pendingDuplicate = await PaymentRequestModel.findOne({
      userId: String(user._id),
      itemType: payload.itemType,
      itemId: payload.itemId,
      status: "pending",
    });

    if (pendingDuplicate) {
      return res.status(StatusCodes.CONFLICT).json({
        message: "There is already a pending payment request for this item",
        request: pendingDuplicate,
      });
    }

    const created = await PaymentRequestModel.create({
      id: `payreq_${Date.now()}`,
      userId: String(user._id),
      userName: user.name,
      userEmail: user.email,
      ...payload,
      packageId: payload.packageId || "",
      includedCourseIds: payload.includedCourseIds || [],
      status: "pending",
    });

    return res.status(StatusCodes.CREATED).json({ request: created });
  }),
);

paymentRouter.patch(
  "/requests/:id/review",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = paymentRequestReviewSchema.parse(req.body);
    const requestDoc = await PaymentRequestModel.findOne({
      $or: [{ id: req.params.id }, { _id: req.params.id }],
    });

    if (!requestDoc) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Payment request not found" });
    }

    requestDoc.status = payload.status;
    requestDoc.reviewerNotes = payload.reviewerNotes || "";
    requestDoc.reviewedBy = req.authUser?.id || "";
    requestDoc.reviewedAt = Date.now();
    await requestDoc.save();

    let updatedUser = null;
    if (payload.status === "approved") {
      updatedUser = await applyPurchaseToUser(requestDoc.userId, {
        courseId: requestDoc.itemType === "course" ? requestDoc.itemId : undefined,
        packageId: requestDoc.packageId || (requestDoc.itemType === "package" ? requestDoc.itemId : undefined),
        includedCourseIds: Array.isArray(requestDoc.includedCourseIds) ? requestDoc.includedCourseIds : [],
      });
    }

    return res.json({
      request: requestDoc,
      user: updatedUser,
    });
  }),
);
