import { AsyncLocalStorage } from "node:async_hooks";

const cancellation = new AsyncLocalStorage<AbortSignal>();
export const runWithCancellation = <T>(signal: AbortSignal, action: () => Promise<T>) => cancellation.run(signal, action);
export function cancellationSignal(explicit?: AbortSignal): AbortSignal | undefined {
  const inherited = cancellation.getStore();
  if (explicit && inherited && explicit !== inherited) return AbortSignal.any([explicit, inherited]);
  return explicit ?? inherited;
}
export const throwIfCancellationRequested = (explicit?: AbortSignal) => cancellationSignal(explicit)?.throwIfAborted();
export function withTimeoutSignal(timeout: AbortSignal, explicit?: AbortSignal) {
  const active = cancellationSignal(explicit);
  return active ? AbortSignal.any([timeout, active]) : timeout;
}
