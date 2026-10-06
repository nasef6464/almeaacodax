export type AiPricingHint = {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  cachedInputUsdPerMillion?: number;
};

export const readAiPricingHint = (raw: Record<string, unknown>): AiPricingHint | undefined => {
  const hasInput = raw.inputUsdPerMillion !== undefined;
  const hasOutput = raw.outputUsdPerMillion !== undefined;
  if (!hasInput || !hasOutput) return undefined;

  const inputUsdPerMillion = Math.max(0, Number(raw.inputUsdPerMillion || 0));
  const outputUsdPerMillion = Math.max(0, Number(raw.outputUsdPerMillion || 0));
  const cachedInputUsdPerMillion = raw.cachedInputUsdPerMillion === undefined
    ? undefined
    : Math.max(0, Number(raw.cachedInputUsdPerMillion || 0));

  if (![inputUsdPerMillion, outputUsdPerMillion, cachedInputUsdPerMillion ?? 0].every(Number.isFinite)) {
    return undefined;
  }

  return { inputUsdPerMillion, outputUsdPerMillion, cachedInputUsdPerMillion };
};

export const estimateAiCostMicrosUsd = (
  usage: { inputTokens: number; outputTokens: number; cachedTokens: number },
  pricing?: AiPricingHint,
) => {
  if (!pricing) return { estimatedCostMicrosUsd: 0, pricingKnown: false };

  const cachedTokens = Math.max(0, Number(usage.cachedTokens || 0));
  const inputTokens = Math.max(0, Number(usage.inputTokens || 0));
  const outputTokens = Math.max(0, Number(usage.outputTokens || 0));
  const uncachedInputTokens = Math.max(0, inputTokens - cachedTokens);
  const cachedRate = pricing.cachedInputUsdPerMillion ?? pricing.inputUsdPerMillion;

  const estimatedCostMicrosUsd = Math.max(0, Math.round(
    uncachedInputTokens * pricing.inputUsdPerMillion
    + cachedTokens * cachedRate
    + outputTokens * pricing.outputUsdPerMillion,
  ));

  return { estimatedCostMicrosUsd, pricingKnown: true };
};
