import { AiInteractionModel } from "../../../models/AiInteraction.js";
import { AiUsageDailyModel, type AiUsageScopeType } from "../../../models/AiUsageDaily.js";

export type AiUsageSnapshot = {
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens: number;
};

const zeroSnapshot = (): AiUsageSnapshot => ({
  requestCount: 0,
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cachedTokens: 0,
});

export const utcDayKey = (date = new Date()) => date.toISOString().slice(0, 10);

const startOfUtcDay = (dayKey: string) => new Date(`${dayKey}T00:00:00.000Z`);

const scopeFilter = (scopeType: AiUsageScopeType, scopeId: string) => {
  if (scopeType === "global") return {};
  if (scopeType === "user") return { userId: scopeId };
  if (scopeType === "school") return { schoolId: scopeId };
  if (scopeType === "capability") return { endpoint: scopeId };
  return {};
};

export const readAiUsageDaily = async (
  scopeType: AiUsageScopeType,
  scopeId: string,
  dayKey = utcDayKey(),
): Promise<AiUsageSnapshot> => {
  const found = await AiUsageDailyModel.findOne({ dayKey, scopeType, scopeId }).lean() as any;
  if (found) {
    return {
      requestCount: Number(found.requestCount || 0),
      inputTokens: Number(found.inputTokens || 0),
      outputTokens: Number(found.outputTokens || 0),
      totalTokens: Number(found.totalTokens || 0),
      cachedTokens: Number(found.cachedTokens || 0),
    };
  }

  const since = startOfUtcDay(dayKey);
  const [aggregate] = await AiInteractionModel.aggregate([
    {
      $match: {
        createdAt: { $gte: since },
        "metadata.billable": { $ne: false },
        ...scopeFilter(scopeType, scopeId),
      },
    },
    {
      $group: {
        _id: null,
        requestCount: { $sum: 1 },
        inputTokens: { $sum: "$inputTokens" },
        outputTokens: { $sum: "$outputTokens" },
        totalTokens: { $sum: "$totalTokens" },
        cachedTokens: { $sum: "$cachedTokens" },
      },
    },
  ]);

  const snapshot = aggregate
    ? {
        requestCount: Number(aggregate.requestCount || 0),
        inputTokens: Number(aggregate.inputTokens || 0),
        outputTokens: Number(aggregate.outputTokens || 0),
        totalTokens: Number(aggregate.totalTokens || 0),
        cachedTokens: Number(aggregate.cachedTokens || 0),
      }
    : zeroSnapshot();

  await AiUsageDailyModel.updateOne(
    { dayKey, scopeType, scopeId },
    {
      $setOnInsert: {
        dayKey,
        scopeType,
        scopeId,
        requestCount: snapshot.requestCount,
        inputTokens: snapshot.inputTokens,
        outputTokens: snapshot.outputTokens,
        totalTokens: snapshot.totalTokens,
        cachedTokens: snapshot.cachedTokens,
        estimatedUsageCount: 0,
      },
      $set: { lastUsedAt: new Date() },
    },
    { upsert: true },
  );

  return snapshot;
};

export const incrementAiUsageDaily = async (input: {
  endpoint: string;
  userId?: string;
  schoolId?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
  usageEstimated?: boolean;
}) => {
  const dayKey = utcDayKey();
  const now = new Date();
  const inc = {
    requestCount: 1,
    inputTokens: Math.max(0, Number(input.inputTokens || 0)),
    outputTokens: Math.max(0, Number(input.outputTokens || 0)),
    totalTokens: Math.max(0, Number(input.totalTokens || 0)),
    cachedTokens: Math.max(0, Number(input.cachedTokens || 0)),
    estimatedUsageCount: input.usageEstimated ? 1 : 0,
  };

  const scopes: Array<{ scopeType: AiUsageScopeType; scopeId: string }> = [
    { scopeType: "global", scopeId: "*" },
    { scopeType: "capability", scopeId: input.endpoint || "unknown" },
  ];
  if (input.userId) scopes.push({ scopeType: "user", scopeId: input.userId });
  if (input.schoolId) scopes.push({ scopeType: "school", scopeId: input.schoolId });

  await Promise.all(
    scopes.map(({ scopeType, scopeId }) =>
      AiUsageDailyModel.updateOne(
        { dayKey, scopeType, scopeId },
        {
          $setOnInsert: { dayKey, scopeType, scopeId },
          $inc: inc,
          $set: { lastUsedAt: now },
        },
        { upsert: true },
      ),
    ),
  );
};
