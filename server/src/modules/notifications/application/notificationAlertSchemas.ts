import { z } from "zod";

export const interventionAlertSchema = z.object({
  studentId: z.string().min(1).max(120),
  studentName: z.string().min(1).max(160).optional().prefault(""),
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

// Keep legacy validation during the dependency upgrade; channel-specific relaxation is separate work.
export const integrationTestSchema = z.object({
  channel: z.enum(["email", "whatsapp"]),
  recipientEmail: z.string().email().optional().prefault(""),
  recipientPhone: z.string().min(8).max(30).optional().prefault(""),
  subject: z.string().max(220).optional().default("اختبار التكامل"),
  title: z.string().min(2).max(220).optional().default("اختبار التكامل"),
  body: z.string().min(2).max(1000).optional().default("هذه رسالة اختبار من منصة المئة."),
});
