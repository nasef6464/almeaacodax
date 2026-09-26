export const AI_RUNTIME_CONFIG_CACHE_TTL_MS = 15_000;

export const createRuntimeConfigCache = <T>(loader: () => Promise<T>, ttlMs = AI_RUNTIME_CONFIG_CACHE_TTL_MS) => {
  let cachedValue: T | null = null;
  let expiresAt = 0;
  let inflight: Promise<T> | null = null;

  const get = async (force = false): Promise<T> => {
    const now = Date.now();
    if (!force && cachedValue !== null && now < expiresAt) return cachedValue;
    if (!force && inflight) return inflight;

    inflight = loader()
      .then((value) => {
        cachedValue = value;
        expiresAt = Date.now() + ttlMs;
        return value;
      })
      .finally(() => {
        inflight = null;
      });

    return inflight;
  };

  const invalidate = () => {
    cachedValue = null;
    expiresAt = 0;
  };

  return { get, invalidate };
};
