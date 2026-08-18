import type { Request, Response } from "express";
import { NotificationDeliveryModel } from "../../../models/NotificationDelivery.js";

/**
 * Transport adapter for the existing notification SSE contract.
 *
 * This deliberately preserves the current Mongo polling behaviour while
 * removing it from the route-composition file. A later scalability change can
 * replace the data source with Redis/pub-sub behind this stable HTTP adapter
 * without changing /api/notifications/stream or the client event names.
 */
export function openNotificationSseStream(req: Request, res: Response) {
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

  sendEvent("connected", { userId, ts: Date.now() });

  let lastCheckedAt = Date.now();
  let lastUnreadCount = -1;

  const poll = async () => {
    if (res.writableEnded) return;
    try {
      const newNotifications = await NotificationDeliveryModel.find({
        recipientUserId: userId,
        channel: "in_app",
        status: "sent",
        createdAt: { $gt: new Date(lastCheckedAt) },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      if (newNotifications.length > 0) {
        for (const notification of newNotifications.reverse()) {
          sendEvent("notification", notification);
        }
        lastCheckedAt = Date.now();
      }

      const unreadCount = await NotificationDeliveryModel.countDocuments({
        recipientUserId: userId,
        channel: "in_app",
        status: "sent",
        readAt: { $exists: false },
      });
      if (unreadCount !== lastUnreadCount) {
        sendEvent("unread_count", { count: unreadCount });
        lastUnreadCount = unreadCount;
      }
    } catch {
      // Preserve the current best-effort stream behaviour: a polling failure
      // must not terminate an otherwise healthy SSE connection.
    }
  };

  const pollInterval = setInterval(poll, 10_000);
  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(": keepalive\n\n");
  }, 30_000);

  req.on("close", () => {
    clearInterval(pollInterval);
    clearInterval(keepAlive);
  });

  void poll();
}
