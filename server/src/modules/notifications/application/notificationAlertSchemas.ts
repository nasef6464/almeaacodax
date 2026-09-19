import { z } from "zod";

export const interventionAlertSchema = z.object({
  studentId: z.string().min(1).max(120),
  studentName: z.string().min(1).max(160).optional().default(""),
  skillName: z.string().max(180).optional().default(""),
  mastery: z.number().min(0).max(100).optional(),
  title: z.string().min(2).max(220),
  body: z.string().min(2).max(1200),
  channels: z.array(z.literal("in_app")).optional().default(["in_app"]),
});

export const studentAlertSchema = z.object({
  studentIds: z.array(z.string().min(1).max(120)).min(1).max(50),
  title: z.string().min(2).max(220),
  body: z.string().min(2).max(1200),
  channels: z.array(z.literal("in_app")).optional().default(["in_app"]),
});
