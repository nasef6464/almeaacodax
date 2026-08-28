import type { Redis as RedisClient } from "ioredis";
import { createRedisClient, createRedisDuplicate, isRedisConfigured } from "../../../config/redis.js";

const NOTIFICATION_EVENTS_CHANNEL = "in-app-notification-events";

export type NotificationRealtimeEvent = {
  recipientUserId: string;
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: null;
};

type NotificationListener = (event: NotificationRealtimeEvent) => void;

const listenersByUser = new Map<string, Set<NotificationListener>>();
let publisher: RedisClient | null = null;
let subscriber: RedisClient | null = null;
let started = false;

function dispatch(event: NotificationRealtimeEvent) {
  const listeners = listenersByUser.get(event.recipientUserId);
  if (!listeners) return;
  listeners.forEach((listener) => listener(event));
}

function dispatchMessage(message: string) {
  try {
    const payload = JSON.parse(message) as { events?: NotificationRealtimeEvent[] };
    (payload.events || []).forEach((event) => {
      if (event?.recipientUserId && event.id) dispatch(event);
    });
  } catch {
    console.warn("[notifications] ignored malformed realtime event");
  }
}

export function startNotificationRealtime() {
  if (started) return;
  started = true;

  if (!isRedisConfigured()) {
    console.info("[notifications] realtime Redis bridge disabled; using local fan-out fallback");
    return;
  }

  publisher = createRedisClient("notification-realtime-pub");
  subscriber = createRedisDuplicate("notification-realtime-sub");
  if (!publisher || !subscriber) {
    console.warn("[notifications] realtime Redis bridge unavailable; using local fan-out fallback");
    return;
  }

  subscriber.on("message", (channel, message) => {
    if (channel === NOTIFICATION_EVENTS_CHANNEL) dispatchMessage(message);
  });
  void subscriber.subscribe(NOTIFICATION_EVENTS_CHANNEL).catch((error: unknown) => {
    console.warn("[notifications] realtime Redis subscription failed", error);
  });
}

export function subscribeToNotificationEvents(userId: string, listener: NotificationListener) {
  startNotificationRealtime();
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) return () => undefined;

  const listeners = listenersByUser.get(normalizedUserId) || new Set<NotificationListener>();
  listeners.add(listener);
  listenersByUser.set(normalizedUserId, listeners);

  return () => {
    listeners.delete(listener);
    if (!listeners.size) listenersByUser.delete(normalizedUserId);
  };
}

export async function publishInAppNotificationEvents(events: NotificationRealtimeEvent[]) {
  if (!events.length) return;
  startNotificationRealtime();

  if (!publisher) {
    events.forEach(dispatch);
    return;
  }

  try {
    await publisher.publish(NOTIFICATION_EVENTS_CHANNEL, JSON.stringify({ events }));
  } catch (error: unknown) {
    console.warn("[notifications] realtime publish failed; using local fan-out fallback", error);
    events.forEach(dispatch);
  }
}

export async function closeNotificationRealtime() {
  const activeSubscriber = subscriber;
  subscriber = null;
  publisher = null;
  started = false;

  if (activeSubscriber) {
    try {
      await activeSubscriber.quit();
    } catch {
      activeSubscriber.disconnect();
    }
  }
}
