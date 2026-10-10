import { env } from "../../../config/env.js";
import { createNotificationDeliveries, processNotificationDeliveryById } from "../../../services/notificationService.js";

export async function sendPasswordRecovery(userId: string, token: string) {
  const delivery = await createNotificationDeliveries({
    channels: ["email"],
    userIds: [userId],
    title: "استعادة كلمة المرور",
    subject: "استعادة كلمة المرور",
    body: `لاستعادة كلمة المرور افتح الرابط خلال 60 دقيقة: ${env.CLIENT_URL.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(token)}`,
    createdBy: "system",
  });
  // Attempt only this persisted recovery delivery, without a global scan,
  // polling, a new queue connection, or an unrelated admin action.
  for (const deliveryId of delivery.deliveryIds || []) await processNotificationDeliveryById(deliveryId);
}
