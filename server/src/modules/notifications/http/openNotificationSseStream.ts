import type { Request, Response } from "express";
import { NotificationDeliveryModel } from "../../../models/NotificationDelivery.js";
import { subscribeToNotificationEvents } from "../infrastructure/notificationRealtime.js";

/**
 * Transport adapter for the existing notification SSE contract.
 *
 * The stream keeps the public HTTP contract stable while receiving new events
 * through the shared realtime bridge. Mongo is used once for the initial unread
 * count; it is not polled per connection.
 */
export async function openNotificationSseStream(req: Request, res: Response) {
  const userId = String(req.authUser!.id);

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (event: string, data: unknown) => {
    if (res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const unsubscribe = subscribeToNotificationEvents(userId, (event) => sendEvent("notification", event));
  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(": keepalive\n\n");
  }, 30_000);

  req.on("close", () => {
    unsubscribe();
    clearInterval(keepAlive);
  });

  sendEvent("connected", { userId, ts: Date.now() });

  try {
    const unreadCount = await NotificationDeliveryModel.countDocuments({
      recipientUserId: userId,
      channel: "in_app",
      status: "sent",
      readAt: { $exists: false },
    });
    sendEvent("unread_count", { count: unreadCount });
  } catch {
    // A failed initial count must not terminate the best-effort stream.
  }

}
