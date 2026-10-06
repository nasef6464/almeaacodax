import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import type { AppRole } from "../../../constants/roles.js";
import { UserModel } from "../../../models/User.js";
import { enqueueNotificationDeliveries } from "../../../queues/notificationQueue.js";
import {
  createNotificationDeliveries,
  getNotificationBatchLimit,
  type CreateNotificationInput,
  type NotificationChannel,
} from "../../../services/notificationService.js";

export const MAX_NOTIFICATION_CAMPAIGN_RECIPIENTS = 10_000;
const CAMPAIGN_AUDIENCE_PAGE_SIZE = 500;

export class NotificationCampaignTooLargeError extends Error {
  constructor(
    public readonly maxRecipients: number,
    public readonly resolvedRecipients: number,
  ) {
    super(`notification_campaign_too_large:${resolvedRecipients}>${maxRecipients}`);
    this.name = "NotificationCampaignTooLargeError";
  }
}

type CampaignInput = Omit<CreateNotificationInput, "campaignId"> & {
  userIds?: string[];
  roles?: AppRole[];
  channels: NotificationChannel[];
};

const normalizeIds = (values: unknown[]) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));

function buildAudienceFilter(input: Pick<CampaignInput, "userIds" | "roles">) {
  const clauses: Record<string, unknown>[] = [];
  const userIds = normalizeIds(input.userIds || []);
  if (userIds.length) {
    const objectIds = userIds
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    clauses.push({
      $or: [
        ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
        { id: { $in: userIds } },
      ],
    });
  }
  if (input.roles?.length) {
    clauses.push({ role: { $in: input.roles } });
  }
  if (!clauses.length) return null;
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

const chunk = <T>(items: T[], size: number) => {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
};

/**
 * Application-level orchestration for large notification audiences.
 *
 * It resolves the complete bounded audience first so campaigns never silently
 * truncate. Delivery creation remains delegated to the existing bounded service
 * in batches of MAX_RECIPIENTS_PER_REQUEST.
 */
export async function createNotificationCampaignDeliveries(input: CampaignInput) {
  const filter = buildAudienceFilter(input);
  const campaignId = randomUUID();
  if (!filter) {
    return {
      campaignId,
      recipients: 0,
      created: 0,
      batches: 0,
      deliveryIds: [] as string[],
      queue: { queued: false, count: 0 },
    };
  }

  const totalRecipients = await UserModel.countDocuments(filter);
  if (totalRecipients > MAX_NOTIFICATION_CAMPAIGN_RECIPIENTS) {
    throw new NotificationCampaignTooLargeError(
      MAX_NOTIFICATION_CAMPAIGN_RECIPIENTS,
      totalRecipients,
    );
  }

  const recipientIds: string[] = [];
  let afterId: mongoose.Types.ObjectId | null = null;
  while (recipientIds.length < totalRecipients) {
    const pageFilter = afterId ? { $and: [filter, { _id: { $gt: afterId } }] } : filter;
    const users = await UserModel.find(pageFilter)
      .select("_id")
      .sort({ _id: 1 })
      .limit(CAMPAIGN_AUDIENCE_PAGE_SIZE)
      .lean();
    if (!users.length) break;
    recipientIds.push(...users.map((user) => String(user._id)));
    afterId = users.at(-1)?._id as mongoose.Types.ObjectId;
    if (users.length < CAMPAIGN_AUDIENCE_PAGE_SIZE) break;
  }

  const batches = chunk(recipientIds, getNotificationBatchLimit());
  const deliveryIds: string[] = [];
  let created = 0;
  let recipients = 0;
  let queuedCount = 0;
  let queueAvailable = false;

  for (const userIds of batches) {
    const result = await createNotificationDeliveries({
      ...input,
      campaignId,
      userIds,
      roles: [],
    });
    const ids = result.deliveryIds || [];
    deliveryIds.push(...ids);
    created += Number(result.created || 0);
    recipients += Number(result.recipients || 0);

    const queueResult = await enqueueNotificationDeliveries(ids);
    queueAvailable ||= queueResult.queued;
    queuedCount += queueResult.count;
  }

  return {
    campaignId,
    recipients,
    created,
    batches: batches.length,
    deliveryIds,
    queue: {
      queued: queueAvailable,
      count: queuedCount,
    },
  };
}
