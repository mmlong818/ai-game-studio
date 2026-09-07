import { gameDesignProfileSchema, type GameDesignProfile, type ProjectInput } from "../shared/contracts";
import { generateDesignPreview } from "../web/api";

// Session-local reuse of actual model output, never a preset design.
// Keep in-flight work across the back/edit/return flow as well.
const storageKey = "studio-design-previews-v1";
const entries = new Map<string, { pending: Promise<GameDesignProfile>; text: string; settled: boolean; listeners: Set<(text: string) => void> }>();
function saved(): Record<string, GameDesignProfile> {
  try { return JSON.parse(sessionStorage.getItem(storageKey) ?? "{}"); } catch { return {}; }
}
export function clearDesignPreviewCache(clearSaved = true) {
  entries.clear();
  if (clearSaved) { try { sessionStorage.removeItem(storageKey); } catch { /* Storage can be unavailable. */ } }
}
export function getDesignPreview(input: ProjectInput, regenerate = false, onText?: (text: string) => void) {
  const key = JSON.stringify(input);
  const existing = entries.get(key);
  if (existing && !regenerate) {
    if (onText) { onText(existing.text); if (!existing.settled) existing.listeners.add(onText); }
    return existing.pending;
  }
  if (!regenerate) {
    const restored = gameDesignProfileSchema.safeParse(saved()?.[key]);
    if (restored.success) return Promise.resolve(restored.data);
  }
  const listeners = new Set<(text: string) => void>();
  if (onText) listeners.add(onText);
  const entry = { pending: null! as Promise<GameDesignProfile>, text: "", settled: false, listeners };
  const pending = generateDesignPreview(input, new AbortController().signal, delta => {
    entry.text += delta;
    for (const listener of listeners) listener(entry.text);
  });
  entry.pending = pending;
  entries.set(key, entry);
  if (entries.size > 12) entries.delete(entries.keys().next().value!);
  void pending.then(profile => {
    entry.settled = true;
    listeners.clear();
    if (entries.get(key) !== entry) return;
    try {
      const previous = saved() ?? {};
      delete previous[key];
      const latest = Object.fromEntries([...Object.entries(previous), [key, profile]].slice(-12));
      sessionStorage.setItem(storageKey, JSON.stringify(latest));
    } catch { /* Reuse still works in memory when storage is unavailable. */ }
  }, () => { listeners.clear(); if (entries.get(key) === entry) entries.delete(key); });
  return pending;
}
