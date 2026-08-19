import { z } from "zod";

export const studyPlanSchema = z.object({
  id: z.string().min(1),
  userId: z.string().optional(),
  name: z.string().min(1),
  pathId: z.string().min(1),
  subjectIds: z.array(z.string()).default([]),
  courseIds: z.array(z.string()).default([]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  skipCompletedQuizzes: z.boolean().default(true),
  offDays: z.array(z.enum(["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"])).default([]),
  dailyMinutes: z.number().min(15).default(90),
  preferredStartTime: z.string().optional(),
  status: z.enum(["active", "archived"]).default("active"),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export const interventionStudyPlanSchema = z.object({
  studentId: z.string().min(1).max(120),
  studentName: z.string().max(160).optional().default(""),
  pathId: z.string().min(1),
  subjectId: z.string().optional().default(""),
  skillId: z.string().optional().default(""),
  skillName: z.string().max(180).optional().default(""),
  dailyMinutes: z.number().min(15).max(240).optional().default(90),
  preferredStartTime: z.string().optional().default("17:00"),
});
