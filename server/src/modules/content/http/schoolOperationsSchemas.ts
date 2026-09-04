import { z } from "zod";

export const groupSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["SCHOOL", "CLASS", "PRIVATE_GROUP"]),
  parentId: z.string().nullable().optional(),
  ownerId: z.string().min(1),
  supervisorIds: z.array(z.string()).default([]),
  studentIds: z.array(z.string()).default([]),
  courseIds: z.array(z.string()).default([]),
  totalStudents: z.number().optional(),
  totalSupervisors: z.number().optional(),
  totalCourses: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

export const b2bPackageSchema = z.object({
  id: z.string().optional(),
  schoolId: z.string().min(1),
  name: z.string().min(1),
  assignedTeacherId: z.string().optional(),
  revenueSharePercentage: z.number().nullable().optional(),
  courseIds: z.array(z.string()).default([]),
  contentTypes: z.array(z.enum(["courses", "foundation", "banks", "tests", "mockExams", "library", "all"])).default(["all"]),
  pathIds: z.array(z.string()).default([]),
  subjectIds: z.array(z.string()).default([]),
  type: z.enum(["free_access", "discounted"]).default("free_access"),
  discountPercentage: z.number().nullable().optional(),
  maxStudents: z.number().min(0).default(0),
  status: z.enum(["active", "expired"]).default("active"),
  createdAt: z.number().optional(),
});

export const accessCodeSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1),
  schoolId: z.string().min(1),
  packageId: z.string().min(1),
  maxUses: z.number().min(1).default(1),
  currentUses: z.number().min(0).default(0),
  expiresAt: z.number(),
  createdAt: z.number().optional(),
});

export const accessCodesListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  search: z.string().trim().optional(),
  schoolId: z.string().trim().optional(),
  packageId: z.string().trim().optional(),
  status: z.enum(["active", "expired", "exhausted"]).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  sortBy: z.enum(["createdAt", "expiresAt", "currentUses", "maxUses", "code"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const accessCodeRedemptionsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
  accessCodeId: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  schoolId: z.string().trim().optional(),
  status: z.enum(["active", "revoked", "expired"]).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  sortBy: z.enum(["grantedAt", "expiresAt", "createdAt"]).default("grantedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const schoolImportRowSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  classId: z.string().optional(),
  className: z.string().optional(),
  password: z.string().min(6).optional(),
});

export const schoolImportSchema = z.object({
  rows: z.array(schoolImportRowSchema).min(1),
});

const schoolRelationRowSchema = z.object({
  studentEmail: z.string().email(),
  parentEmail: z.string().email().optional().or(z.literal("")),
  parentName: z.string().optional(),
  supervisorEmail: z.string().email().optional().or(z.literal("")),
  supervisorName: z.string().optional(),
  teacherEmail: z.string().email().optional().or(z.literal("")),
  teacherName: z.string().optional(),
  className: z.string().optional(),
});

export const schoolRelationSchema = z.object({
  rows: z.array(schoolRelationRowSchema).min(1),
  createMissingUsers: z.boolean().default(true),
});
