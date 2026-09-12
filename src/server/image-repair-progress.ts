import { AsyncLocalStorage } from "node:async_hooks";
import { throwIfCancellationRequested } from "./cancellation.js";

export interface ImageRepairProgress {
  resource: { file: string; label: string };
  attempt: number;
  maxAttempts: number;
  code: string;
  message: string;
}

type Reporter = (progress: ImageRepairProgress) => void | Promise<void>;
const reporters = new AsyncLocalStorage<Reporter>();

export function runWithImageRepairProgress<T>(reporter: Reporter, action: () => Promise<T>): Promise<T> {
  return reporters.run(reporter, action);
}

export async function reportImageRepair(progress: ImageRepairProgress): Promise<void> {
  try {
    await reporters.getStore()?.(progress);
  } catch {
    throwIfCancellationRequested();
  }
}
