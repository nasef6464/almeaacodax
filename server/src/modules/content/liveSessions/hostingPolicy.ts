import { z } from 'zod';
import { PlatformIntegrationSettingsModel } from '../../../models/PlatformIntegrationSettings.js';
import { fail } from './scheduling.js';
export const hostingPolicySchema = z.object({
  providers: z.array(z.enum(['zoom','google_meet','teams','live_youtube'])).min(1).max(4).default(['zoom','google_meet','teams','live_youtube']),
  hostingModes: z.array(z.enum(['teacher_account','platform_account','manual_link'])).min(1).max(3).default(['teacher_account','platform_account','manual_link']),
  defaultHostingMode: z.enum(['teacher_account','platform_account','manual_link']).default('teacher_account'),
  earlyJoinMinutes: z.number().int().min(0).max(60).default(15),
  lateJoinMinutes: z.number().int().min(0).max(60).default(30),
}).refine(policy => policy.hostingModes.includes(policy.defaultHostingMode), 'الاختيار الافتراضي يجب أن يكون متاحًا');
export async function loadHostingPolicy() {
  const settings = await PlatformIntegrationSettingsModel.findOne({ key: 'default' }).select('liveSessionPolicy').lean();
  return hostingPolicySchema.parse(settings?.liveSessionPolicy || {});
}
export async function assertHostingChoice(provider: string, hostingMode: string) {
  const policy = await loadHostingPolicy();
  if (!(policy.providers as string[]).includes(provider) || !(policy.hostingModes as string[]).includes(hostingMode)) fail('هذا المزود أو نوع الاستضافة معطل من الإدارة',409);
  return policy;
}
