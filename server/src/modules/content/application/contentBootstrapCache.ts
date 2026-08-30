type CacheEntry<T> = { expiresAt: number; payload: T };

export const resolveContentBootstrapCache = async <T>({
  cacheKey,
  canUseSharedCache,
  cache,
  pending,
  ttlMs,
  load,
  now = Date.now,
}: {
  cacheKey: string;
  canUseSharedCache: boolean;
  cache: Map<string, CacheEntry<T>>;
  pending: Map<string, Promise<T>>;
  ttlMs: number;
  load: () => Promise<T>;
  now?: () => number;
}) => {
  if (!canUseSharedCache || !cacheKey) {
    return { payload: await load(), cacheStatus: null };
  }

  const cachedEntry = cache.get(cacheKey);
  if (cachedEntry && cachedEntry.expiresAt > now()) {
    return { payload: cachedEntry.payload, cacheStatus: "hit" as const };
  }

  const pendingPromise = pending.get(cacheKey);
  if (pendingPromise) {
    return { payload: await pendingPromise, cacheStatus: "shared" as const };
  }

  const inflight = load().finally(() => pending.delete(cacheKey));
  pending.set(cacheKey, inflight);
  const payload = await inflight;
  cache.set(cacheKey, { expiresAt: now() + ttlMs, payload });
  return { payload, cacheStatus: "miss" as const };
};
