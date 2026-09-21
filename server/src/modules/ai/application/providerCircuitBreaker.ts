type ProviderHealth = {
  failures: number;
  openUntil: number;
  lastFailureAt: number;
};

const state = new Map<string, ProviderHealth>();

const FAILURE_THRESHOLD = 3;
const OPEN_MS = 60_000;

export const isAiProviderCircuitOpen = (provider: string, now = Date.now()) => {
  const current = state.get(provider);
  if (!current) return false;
  if (current.openUntil > now) return true;
  if (current.openUntil > 0 && current.openUntil <= now) {
    state.set(provider, { failures: 0, openUntil: 0, lastFailureAt: current.lastFailureAt });
  }
  return false;
};

export const recordAiProviderSuccess = (provider: string) => {
  state.set(provider, { failures: 0, openUntil: 0, lastFailureAt: 0 });
};

export const recordAiProviderFailure = (provider: string, now = Date.now()) => {
  const current = state.get(provider) || { failures: 0, openUntil: 0, lastFailureAt: 0 };
  const failures = current.failures + 1;
  state.set(provider, {
    failures,
    lastFailureAt: now,
    openUntil: failures >= FAILURE_THRESHOLD ? now + OPEN_MS : 0,
  });
};

export const getAiProviderCircuitSnapshot = (now = Date.now()) =>
  [...state.entries()].map(([provider, health]) => ({
    provider,
    failures: health.failures,
    open: health.openUntil > now,
    openUntil: health.openUntil || undefined,
    lastFailureAt: health.lastFailureAt || undefined,
  }));
