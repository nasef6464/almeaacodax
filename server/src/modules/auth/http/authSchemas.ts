import { z } from "zod";
import { DB_GROWTH_BUDGETS } from "../../database/dbGrowthBudgets.js";

export const passwordStrengthSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(160, "Password is too long")
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: "Password must include at least one letter and one number",
  });

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(160) });
export const whatsappStartSchema = z.object({ phone: z.string().min(8).max(24) });
export const whatsappVerifySchema = z.object({ phone: z.string().min(8).max(24), code: z.string().length(6) });
export const registerSchema = z.object({ name: z.string().min(2), email: z.string().email(), password: passwordStrengthSchema });

export const adminCreateUserSchema = z.object({
  name: z.string().min(2), email: z.string().email(), password: passwordStrengthSchema,
  role: z.enum(["student", "teacher", "admin", "supervisor", "school_admin", "parent"]),
  schoolId: z.string().nullable().optional(), groupIds: z.array(z.string()).optional(),
  linkedStudentIds: z.array(z.string()).optional(), managedPathIds: z.array(z.string()).optional(),
  managedSubjectIds: z.array(z.string()).optional(),
});

export const adminUpdateUserSchema = z.object({
  name: z.string().min(2).optional(), avatar: z.string().optional(),
  role: z.enum(["student", "teacher", "admin", "supervisor", "school_admin", "parent"]).optional(),
  isActive: z.boolean().optional(), schoolId: z.string().nullable().optional(),
  groupIds: z.array(z.string()).optional(), linkedStudentIds: z.array(z.string()).optional(),
  managedPathIds: z.array(z.string()).optional(), managedSubjectIds: z.array(z.string()).optional(),
});

const optionalBooleanQuery = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return value;
}, z.boolean().optional());

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(120).optional(),
  role: z.enum(["student", "teacher", "admin", "supervisor", "school_admin", "parent"]).optional(),
  isActive: optionalBooleanQuery, platformTrainer: optionalBooleanQuery,
});
export const adminBulkUserStatusSchema = z.object({ userIds: z.array(z.string().trim().min(1)).min(1).max(100), isActive: z.boolean() });
export const adminTrainersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(120).optional(), status: z.enum(["active", "inactive", "unconfigured"]).optional(),
  pathId: z.string().trim().optional(), subjectId: z.string().trim().optional(), persona: z.enum(["platform", "hybrid"]).optional(),
});

export const preferencesSchema = z.object({
  favorites: z.array(z.string()).optional(), reviewLater: z.array(z.string()).optional(),
  enrolledPaths: z.array(z.string()).optional(), completedLessons: z.array(z.string()).max(DB_GROWTH_BUDGETS.legacyCompletedLessons).optional(),
  interactiveVideoProgress: z.array(z.object({
    courseId: z.string().min(1).max(160), lessonId: z.string().min(1).max(160),
    positionSeconds: z.number().finite().min(0).max(86_400),
    answeredQuestionIds: z.array(z.string().min(1).max(160)).max(DB_GROWTH_BUDGETS.answeredQuestionIdsPerLesson),
    updatedAt: z.number().int().positive(),
  })).max(DB_GROWTH_BUDGETS.interactiveVideoProgressRows).optional(),
});
export const updateMyProfileSchema = z.object({ name: z.string().min(2).max(120).optional(), avatar: z.string().max(2_000_000).optional() });
export const redeemAccessCodeSchema = z.object({ code: z.string().min(4) });
export const forgotPasswordSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = z.object({ token: z.string().min(32).max(160), password: passwordStrengthSchema });
export const verifyEmailSchema = z.object({ token: z.string().min(32).max(160) });
export const nationalIdLoginSchema = z.object({ nationalId: z.string().regex(/^[12]\d{9}$/, "National ID must be 10 digits starting with 1 or 2"), password: z.string().min(1).max(160) });
export const identityUpdateSchema = z.object({ nationalId: z.string().regex(/^[12]\d{9}$/).optional().nullable(), phone: z.string().min(8).max(24).optional().nullable() });
export const linkStudentSchema = z.object({
  nationalId: z.string().regex(/^[12]\d{9}$/).optional(), phone: z.string().min(8).max(24).optional(),
}).refine((d) => d.nationalId || d.phone, { message: "يجب تقديم رقم الهوية أو رقم الجوال" });
export const phonePasswordLoginSchema = z.object({ phone: z.string().min(8).max(24), password: z.string().min(1).max(160) });
