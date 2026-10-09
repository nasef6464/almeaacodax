/** One read per event burst, with at most one trailing read while a request is pending. */
export const createCoalescedAsyncRefresh = (
  refresh: () => Promise<unknown>,
  delayMs = 250,
  onError: (error: unknown) => void = () => {},
) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let dirty = false;
  let disposed = false;
  const schedule = () => {
    if (disposed || running || timer !== null || !dirty) return;
    timer = setTimeout(async () => {
      timer = null;
      if (disposed) return;
      dirty = false;
      running = true;
      try { await refresh(); }
      catch (error) { onError(error); }
      finally { running = false; schedule(); }
    }, delayMs);
  };
  return {
    request: () => { if (!disposed) { dirty = true; schedule(); } },
    dispose: () => {
      disposed = true;
      dirty = false;
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
};
