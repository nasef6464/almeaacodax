export type FailureBudget = { count: number; retryAfterMs: number };
export interface LoginFailureStore {
  read(key: string): Promise<FailureBudget>;
  increment(key: string): Promise<void>;
  clear(key: string): Promise<void>;
}

// Fixed windows, bounded memory, and no timers/connections per account.
export function memoryLoginFailureStore(windowMs: number, now = Date.now, capacity = 10000): LoginFailureStore {
  const entries = new Map<string, { count: number; expires: number }>();
  const current = (key: string) => {
    const entry = entries.get(key);
    if (entry && entry.expires <= now()) { entries.delete(key); return undefined; }
    return entry;
  };
  return {
    async clear(key) { entries.delete(key); },
    async read(key) {
      const entry = current(key);
      return { count: entry?.count ?? 0, retryAfterMs: entry ? entry.expires - now() : 0 };
    },
    async increment(key) {
      const entry = current(key);
      if (entry) { entry.count++; return; }
      if (entries.size >= capacity) {
        for (const [id, value] of entries) if (value.expires <= now()) entries.delete(id);
        if (entries.size >= capacity) throw new Error("login_failure_store_capacity");
      }
      entries.set(key, { count: 1, expires: now() + windowMs });
    },
  };
}

type RedisEval = (script: string, keys: number, ...args: string[]) => Promise<unknown>;
export function redisLoginFailureStore(evaluate: RedisEval, prefix: string, windowMs: number): LoginFailureStore {
  return {
    async clear(key) { await evaluate("return redis.call('DEL', KEYS[1])", 1, prefix + key); },
    async read(key) {
      const result = await evaluate("return {tonumber(redis.call('GET', KEYS[1]) or '0'), redis.call('PTTL', KEYS[1])}", 1, prefix + key) as number[];
      const count = Number(result[0]); const ttl = Number(result[1]);
      if (!Number.isSafeInteger(count) || count < 0 || !Number.isFinite(ttl) || (count > 0 && ttl <= 0)) throw new Error("invalid_login_failure_budget");
      return { count, retryAfterMs: Math.max(0, ttl) };
    },
    async increment(key) {
      await evaluate("local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end; return n", 1, prefix + key, String(windowMs));
    },
  };
}
