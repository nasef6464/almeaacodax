import { randomUUID } from "node:crypto";
import type { AppRole } from "../constants/roles.js";
import { NotificationDeliveryModel } from "../models/NotificationDelivery.js";
import { NotificationTemplateModel } from "../models/NotificationTemplate.js";
import { UserModel } from "../models/User.js";

export type NotificationChannel = "in_app" | "email" | "whatsapp";

type NotificationRecipient = {
  id: string;
  email?: string;
  role?: string;
  name?: string;
};

type CreateNotificationInput = {
  templateKey?: string;
  title?: string;
  subject?: string;
  body?: string;
  channels: NotificationChannel[];
  userIds?: string[];
  roles?: AppRole[];
  variables?: Record<string, string | number | boolean | null | undefined>;
  createdBy: string;
};

const MAX_RECIPIENTS_PER_REQUEST = 500;

function renderTemplate(source: string, variables: Record<string, unknown>) {
  return source.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => String(variables[key] ?? ""));
}

async function resolveRecipients(input: Pick<CreateNotificationInput, "userIds" | "roles">) {
  const filters: Record<string, unknown>[] = [];
  if (input.userIds?.length) {
    filters.push({
      $or: [{ _id: { $in: input.userIds } }, { id: { $in: input.userIds } }],
    });
  }
  if (input.roles?.length) {
    filters.push({ role: { $in: input.roles } });
  }

  if (!filters.length) {
    return [];
  }

  const users = await UserModel.find(filters.length === 1 ? filters[0] : { $or: filters })
    .select("_id id name email role")
    .limit(MAX_RECIPIENTS_PER_REQUEST + 1)
    .lean();

  const unique = new Map<string, NotificationRecipient>();
  for (const user of users) {
    const rawUser = user as { id?: string; _id?: unknown; email?: string; role?: string; name?: string };
    const id = String(rawUser.id || rawUser._id);
    if (!unique.has(id)) {
      unique.set(id, {
        id,
        email: rawUser.email || "",
        role: rawUser.role || "",
        name: rawUser.name || "",
      });
    }
  }

  return Array.from(unique.values()).slice(0, MAX_RECIPIENTS_PER_REQUEST);
}

async function resolveMessage(input: CreateNotificationInput) {
  const template = input.templateKey
    ? await NotificationTemplateModel.findOne({ key: input.templateKey, isActive: { $ne: false } }).lean()
    : null;
  const variables = input.variables || {};

  const title = renderTemplate(String(input.title || template?.title || ""), variables).trim();
  const subject = renderTemplate(String(input.subject || template?.subject || title), variables).trim();
  const body = renderTemplate(String(input.body || template?.body || ""), variables).trim();

  if (!title || !body) {
    throw new Error("Notification title and body are required");
  }

  return {
    templateKey: template?.key || input.templateKey || "",
    title,
    subject,
    body,
  };
}

export async function createNotificationDeliveries(input: CreateNotificationInput) {
  const recipients = await resolveRecipients(input);
  const message = await resolveMessage(input);
  const campaignId = randomUUID();
  const now = Date.now();

  if (!recipients.length) {
    return { campaignId, created: 0, recipients: 0 };
  }

  const channels = Array.from(new Set(input.channels));
  const docs = recipients.flatMap((recipient) =>
    channels.map((channel) => ({
      id: randomUUID(),
      campaignId,
      templateKey: message.templateKey,
      channel,
      status: channel === "in_app" ? "sent" : "pending",
      title: message.title,
      subject: message.subject,
      body: message.body,
      recipientUserId: recipient.id,
      recipientEmail: recipient.email || "",
      recipientRole: recipient.role || "",
      provider: channel === "in_app" ? "internal" : "",
      sentAt: channel === "in_app" ? now : null,
      createdBy: input.createdBy,
      metadata: {
        recipientName: recipient.name || "",
      },
    })),
  );

  await NotificationDeliveryModel.insertMany(docs, { ordered: false });
  return { campaignId, created: docs.length, recipients: recipients.length };
}

function isConsoleProviderEnabled(channel: NotificationChannel) {
  if (channel === "email") {
    return process.env.EMAIL_PROVIDER === "console";
  }
  if (channel === "whatsapp") {
    return process.env.WHATSAPP_PROVIDER === "console";
  }
  return channel === "in_app";
}

export async function processPendingNotifications(limit = 25) {
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const pending = await NotificationDeliveryModel.find({
    status: { $in: ["pending", "retrying"] },
    channel: { $in: ["email", "whatsapp"] },
    $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: Date.now() } }],
  })
    .sort({ createdAt: 1 })
    .limit(safeLimit);

  let sent = 0;
  let retrying = 0;
  let failed = 0;

  for (const item of pending) {
    if (isConsoleProviderEnabled(item.channel as NotificationChannel)) {
      console.info(
        JSON.stringify({
          event: "notification_delivery",
          provider: "console",
          channel: item.channel,
          recipientUserId: item.recipientUserId,
          title: item.title,
        }),
      );
      item.status = "sent";
      item.provider = "console";
      item.sentAt = Date.now();
      item.failureReason = "";
      sent += 1;
      await item.save();
      continue;
    }

    item.status = item.retryCount >= 3 ? "failed" : "retrying";
    item.failureReason = `${item.channel}_provider_not_configured`;
    item.retryCount += 1;
    item.nextAttemptAt = Date.now() + 15 * 60 * 1000;
    if (item.status === "failed") {
      failed += 1;
    } else {
      retrying += 1;
    }
    await item.save();
  }

  return { scanned: pending.length, sent, retrying, failed };
}

export function getNotificationBatchLimit() {
  return MAX_RECIPIENTS_PER_REQUEST;
}
