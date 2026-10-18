/** Provider response transport. The caller validates the configured public URL. */
export const fetchAiResponseWithTimeout = async (
  url: string, init: RequestInit, timeoutMs: number, boundedBody = false,
) => {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timeoutId: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => { timeoutId = setTimeout(() => { controller.abort(); reject(new Error('AI request deadline exceeded')); }, timeoutMs); });
  try {
    const read = async () => {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!boundedBody || !response.body) return response;
      reader = response.body.getReader(); const chunks: Uint8Array[] = []; let count = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        count += value.byteLength; if (count > 131072) throw new Error('AI response exceeds bounded size');
        chunks.push(value);
      }
      return new Response(Buffer.concat(chunks, count), { status: response.status, headers: response.headers });
    };
    return await Promise.race([read(), deadline]);
  } finally {
    clearTimeout(timeoutId!);
    if (boundedBody) { controller.abort(); void reader?.cancel().catch(() => {}); }
  }
};
