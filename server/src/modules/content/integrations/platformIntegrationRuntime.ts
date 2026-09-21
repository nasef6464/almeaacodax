const normalizeExternalPlatformId = (value: unknown) => String(value || "").trim().toLowerCase();

const SENSITIVE_PROVIDER_FIELDS = ["appSecret", "clientSecret", "apiKey", "accessToken", "botToken", "verifyToken"] as const;
const SENSITIVE_EXTERNAL_PLATFORM_FIELDS = ["apiKey", "apiSecret", "webhookSecret"] as const;
const SENSITIVE_EXTERNAL_PLATFORM_ARRAY_FIELDS = ["apiKeys"] as const;

export const sanitizeAndValidateExternalPlatforms = (input: Array<Record<string, unknown>> | undefined) => {
  const normalized = (input || []).map((item) => ({
    ...item,
    id: normalizeExternalPlatformId(item.id),
    name: String(item.name || "").trim(),
    baseUrl: String(item.baseUrl || "").trim(),
  }));

  const emptyId = normalized.find((item) => !item.id);
  if (emptyId) {
    throw Object.assign(new Error("externalPlatforms contains empty id"), { statusCode: 400 });
  }

  const ids = normalized.map((item) => item.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw Object.assign(
      new Error(`externalPlatforms contains duplicate ids: ${[...new Set(duplicateIds)].join(", ")}`),
      { statusCode: 400 },
    );
  }

  return normalized;
};

export const normalizeBaseUrl = (value?: string) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
};

export const buildPublicBaseUrl = (
  settings: { seo?: { canonicalBaseUrl?: string } } | null | undefined,
  reqHost?: string,
) => {
  const bySeo = normalizeBaseUrl(settings?.seo?.canonicalBaseUrl);
  if (bySeo) return bySeo;
  const byHost = normalizeBaseUrl(reqHost);
  if (byHost) return byHost;
  return "";
};

export const maskSensitiveProviderValues = (settings: Record<string, unknown>) => {
  const masked = JSON.parse(JSON.stringify(settings)) as Record<string, unknown>;
  const providers = (masked.providers as Record<string, Record<string, unknown>> | undefined) || {};
  const providerSecretState: Record<string, Record<string, boolean>> = {};

  Object.entries(providers).forEach(([providerKey, providerConfig]) => {
    providerSecretState[providerKey] = {};
    SENSITIVE_PROVIDER_FIELDS.forEach((fieldKey) => {
      const currentValue = String(providerConfig[fieldKey] || "");
      providerSecretState[providerKey][fieldKey] = currentValue.length > 0;
      if (currentValue.length > 0) {
        providerConfig[fieldKey] = "";
      }
    });
  });

  const externalPlatforms = (masked.externalPlatforms as Array<Record<string, unknown>> | undefined) || [];
  const externalPlatformSecretState: Record<string, Record<string, boolean>> = {};
  externalPlatforms.forEach((platform) => {
    const platformId = normalizeExternalPlatformId(platform.id);
    if (!platformId) return;
    externalPlatformSecretState[platformId] = {};

    SENSITIVE_EXTERNAL_PLATFORM_FIELDS.forEach((fieldKey) => {
      const currentValue = String(platform[fieldKey] || "");
      externalPlatformSecretState[platformId][fieldKey] = currentValue.length > 0;
      if (currentValue.length > 0) {
        platform[fieldKey] = "";
      }
    });

    SENSITIVE_EXTERNAL_PLATFORM_ARRAY_FIELDS.forEach((fieldKey) => {
      const currentValues = Array.isArray(platform[fieldKey]) ? (platform[fieldKey] as unknown[]) : [];
      externalPlatformSecretState[platformId][fieldKey] = currentValues.some(
        (value) => String(value || "").trim().length > 0,
      );
      platform[fieldKey] = [];
    });
  });

  masked.providerSecretState = providerSecretState;
  masked.externalPlatformSecretState = externalPlatformSecretState;
  return masked;
};

export const mergeSensitiveProviderValues = (
  payload: Record<string, unknown>,
  previous?: Record<string, unknown> | null,
) => {
  const merged = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  const mergedProviders = (merged.providers as Record<string, Record<string, unknown>> | undefined) || {};
  const previousProviders = ((previous?.providers as Record<string, Record<string, unknown>> | undefined) || {});

  Object.entries(mergedProviders).forEach(([providerKey, providerConfig]) => {
    const previousConfig = previousProviders[providerKey] || {};
    SENSITIVE_PROVIDER_FIELDS.forEach((fieldKey) => {
      const incomingValue = String(providerConfig[fieldKey] || "").trim();
      const previousValue = String(previousConfig[fieldKey] || "");
      if (!incomingValue && previousValue) {
        providerConfig[fieldKey] = previousValue;
      }
    });
  });

  const mergedExternalPlatforms = (merged.externalPlatforms as Array<Record<string, unknown>> | undefined) || [];
  const previousExternalPlatforms = ((previous?.externalPlatforms as Array<Record<string, unknown>> | undefined) || []);
  const previousById = new Map(
    previousExternalPlatforms.map((platform) => [normalizeExternalPlatformId(platform.id), platform] as const),
  );

  mergedExternalPlatforms.forEach((platform) => {
    const platformId = normalizeExternalPlatformId(platform.id);
    const previousPlatform = previousById.get(platformId);
    if (!previousPlatform) return;

    SENSITIVE_EXTERNAL_PLATFORM_FIELDS.forEach((fieldKey) => {
      const incomingValue = String(platform[fieldKey] || "").trim();
      const previousValue = String(previousPlatform[fieldKey] || "");
      if (!incomingValue && previousValue) {
        platform[fieldKey] = previousValue;
      }
    });

    SENSITIVE_EXTERNAL_PLATFORM_ARRAY_FIELDS.forEach((fieldKey) => {
      const incomingValues = Array.isArray(platform[fieldKey]) ? (platform[fieldKey] as unknown[]) : [];
      const hasIncoming = incomingValues.some((value) => String(value || "").trim().length > 0);
      const previousValues = Array.isArray(previousPlatform[fieldKey]) ? previousPlatform[fieldKey] : [];
      if (!hasIncoming && previousValues.length > 0) {
        platform[fieldKey] = previousValues;
      }
    });
  });

  return merged;
};

export const maskIntegrationSnapshot = (snapshot: unknown) => {
  if (!snapshot || typeof snapshot !== "object") {
    return {};
  }

  return maskSensitiveProviderValues(JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>);
};
