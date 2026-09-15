const DEFAULT_DELAYS_MS = [250, 1_000] as const;

function nestedCode(value: unknown): string {
  return value && typeof value === "object"
    ? String((value as { code?: unknown }).code ?? nestedCode((value as { cause?: unknown }).cause)).toUpperCase()
    : "";
}

/** Only failures known to occur before a provider accepted a request are safe to replay. */
export function isPreDispatchNetworkFailure(error: unknown) {
  return /^(?:ENOTFOUND|EAI_AGAIN|ECONNREFUSED|UND_ERR_CONNECT_TIMEOUT)$/.test(nestedCode(error));
}

export async function waitForTransientRetry(attempt: number, signal?: AbortSignal | null, response?: Response) {
  signal?.throwIfAborted();
  const retryAfter = response?.headers.get("retry-after")?.trim();
  const headerDelay = retryAfter && /^\d+(?:\.\d+)?$/.test(retryAfter) ? Number(retryAfter) * 1_000 : NaN;
  const milliseconds = Math.min(5_000, Number.isFinite(headerDelay) ? headerDelay : DEFAULT_DELAYS_MS[Math.min(attempt - 1, DEFAULT_DELAYS_MS.length - 1)]);
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(done, milliseconds);
    const abort = () => { clearTimeout(timer); reject(signal?.reason); };
    function done() { signal?.removeEventListener("abort", abort); resolve(); }
    signal?.addEventListener("abort", abort, { once: true });
  });
}

