import { Router } from "express";
import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserModel } from "../models/User.js";
import { AccessCodeModel } from "../models/AccessCode.js";
import { B2BPackageModel } from "../models/B2BPackage.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { signAccessToken } from "../utils/jwt.js";
import { applyPurchaseToUser } from "../services/applyPurchaseToUser.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const adminCreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["student", "teacher", "admin", "supervisor", "parent"]),
  schoolId: z.string().nullable().optional(),
  groupIds: z.array(z.string()).optional(),
  linkedStudentIds: z.array(z.string()).optional(),
  managedPathIds: z.array(z.string()).optional(),
  managedSubjectIds: z.array(z.string()).optional(),
});

const adminUpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().optional(),
  role: z.enum(["student", "teacher", "admin", "supervisor", "parent"]).optional(),
  isActive: z.boolean().optional(),
  schoolId: z.string().nullable().optional(),
  groupIds: z.array(z.string()).optional(),
  linkedStudentIds: z.array(z.string()).optional(),
  managedPathIds: z.array(z.string()).optional(),
  managedSubjectIds: z.array(z.string()).optional(),
});

const preferencesSchema = z.object({
  favorites: z.array(z.string()).optional(),
  reviewLater: z.array(z.string()).optional(),
  enrolledPaths: z.array(z.string()).optional(),
});

const purchaseSchema = z.object({
  courseId: z.string().min(1).optional(),
  packageId: z.string().min(1).optional(),
  includedCourseIds: z.array(z.string()).optional(),
}).refine((payload) => payload.courseId || payload.packageId, {
  message: "Purchase payload is incomplete",
});

const redeemAccessCodeSchema = z.object({
  code: z.string().min(4),
});

const serializeUser = (user: any) => {
  const plain = typeof user?.toJSON === "function" ? user.toJSON() : user?.toObject?.() || user;
  const { passwordHash, __v, ...safeUser } = plain;
  return safeUser;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const buildDocumentQuery = (value: string) =>
  mongoose.Types.ObjectId.isValid(value) ? { $or: [{ id: value }, { _id: value }] } : { id: value };

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const payload = registerSchema.parse(req.body);
    const exists = await UserModel.findOne({ email: payload.email.toLowerCase() });

    if (exists) {
      return res.status(StatusCodes.CONFLICT).json({
        message: "Email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await UserModel.create({
      name: payload.name,
      email: payload.email.toLowerCase(),
      passwordHash,
      role: "student",
    });

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.status(StatusCodes.CREATED).json({
      token,
      user: serializeUser(user),
    });
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const user = await UserModel.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Invalid email or password",
      });
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Invalid email or password",
      });
    }

    if (user.isActive === false) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: "Account is disabled",
      });
    }

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.json({
      token,
      user: serializeUser(user),
    });
  }),
);

authRouter.post(
  "/admin/users",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = adminCreateUserSchema.parse(req.body);
    const email = payload.email.toLowerCase();
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await UserModel.findOneAndUpdate(
      { email },
      {
        name: payload.name,
        email,
        passwordHash,
        role: payload.role,
        isActive: true,
        schoolId: payload.schoolId || null,
        groupIds: payload.groupIds || [],
        linkedStudentIds: payload.linkedStudentIds || [],
        managedPathIds: payload.managedPathIds || [],
        managedSubjectIds: payload.managedSubjectIds || [],
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(StatusCodes.CREATED).json({
      user: serializeUser(user),
    });
  }),
);

authRouter.get(
  "/admin/users",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (_req, res) => {
    const users = await UserModel.find().sort({ createdAt: -1 });

    return res.json({
      users: users.map(serializeUser),
    });
  }),
);

authRouter.patch(
  "/admin/users/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = adminUpdateUserSchema.parse(req.body);
    const updated = await UserModel.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true },
    );

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }

    return res.json({
      user: serializeUser(updated),
    });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.authUser?.id);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }

    return res.json({
      user: serializeUser(user),
    });
  }),
);

authRouter.patch(
  "/me/preferences",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = preferencesSchema.parse(req.body);
    const update: Record<string, string[]> = {};

    if (payload.favorites) {
      update.favorites = Array.from(new Set(payload.favorites));
    }

    if (payload.reviewLater) {
      update.reviewLater = Array.from(new Set(payload.reviewLater));
    }

    if (payload.enrolledPaths) {
      update.enrolledPaths = Array.from(new Set(payload.enrolledPaths));
    }

    const user = await UserModel.findByIdAndUpdate(
      req.authUser?.id,
      update,
      { new: true },
    );

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }

    return res.json({
      user: serializeUser(user),
    });
  }),
);

authRouter.post(
  "/me/purchase",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = purchaseSchema.parse(req.body);
    const user = await applyPurchaseToUser(req.authUser?.id || "", payload);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }

    return res.json({
      user: serializeUser(user),
    });
  }),
);

authRouter.post(
  "/me/redeem-access-code",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = redeemAccessCodeSchema.parse(req.body);
    const normalizedCode = payload.code.trim().toUpperCase();

    const user = await UserModel.findById(req.authUser?.id);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }

    const accessCode = await AccessCodeModel.findOne({
      code: { $regex: new RegExp(`^${escapeRegExp(normalizedCode)}$`, "i") },
    });

    if (!accessCode) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "كود التفعيل غير موجود",
      });
    }

    if (accessCode.expiresAt <= Date.now()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "انتهت صلاحية كود التفعيل",
      });
    }

    if ((accessCode.currentUses || 0) >= (accessCode.maxUses || 0)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "تم استهلاك عدد التفعيلات المتاح لهذا الكود",
      });
    }

      const linkedPackage = await B2BPackageModel.findOne(buildDocumentQuery(accessCode.packageId));

    if (!linkedPackage || linkedPackage.status !== "active") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "الباقة المرتبطة بهذا الكود غير متاحة الآن",
      });
    }

    if ((user.subscription?.purchasedPackages || []).includes(String(linkedPackage.id || linkedPackage._id))) {
      return res.status(StatusCodes.CONFLICT).json({
        message: "تم تفعيل هذه الباقة على الحساب بالفعل",
      });
    }

    const updatedUser = await applyPurchaseToUser(String(user._id), {
      packageId: String(linkedPackage.id || linkedPackage._id),
      includedCourseIds: Array.isArray(linkedPackage.courseIds) ? linkedPackage.courseIds.map(String) : [],
    });

    accessCode.currentUses = (accessCode.currentUses || 0) + 1;
    await accessCode.save();

    return res.json({
      user: serializeUser(updatedUser),
      accessCode,
      package: linkedPackage,
    });
  }),
);
