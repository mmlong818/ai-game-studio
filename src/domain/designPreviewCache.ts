import { gameDesignProfileSchema, type GameDesignProfile, type ProjectInput } from "../shared/contracts";
import { generateDesignPreview, type DesignPreviewPhase } from "../web/api";

// Session-local reuse of actual model output, never a preset design.
// Keep in-flight work across the back/edit/return flow as well.
const storageKey = "studio-design-previews-v1";
type PreviewListener = { onText?: (text: string) => void; onStatus?: (phase: DesignPreviewPhase, startedAt: string) => void };
const entries = new Map<string, { pending: Promise<GameDesignProfile>; text: string; phase: DesignPreviewPhase; startedAt: string; settled: boolean; listeners: Set<PreviewListener> }>();
function saved(): Record<string, GameDesignProfile> {
  try { return JSON.parse(sessionStorage.getItem(storageKey) ?? "{}"); } catch { return {}; }
}
export function clearDesignPreviewCache(clearSaved = true) {
  entries.clear();
  if (clearSaved) { try { sessionStorage.removeItem(storageKey); } catch { /* Storage can be unavailable. */ } }
}
export function getDesignPreview(input: ProjectInput, regenerate = false, onText?: (text: string) => void, onStatus?: (phase: DesignPreviewPhase, startedAt: string) => void) {
  const key = JSON.stringify(input);
  const existing = entries.get(key);
  // Regenerate is permission to replace a completed result, not to fork an
  // already-running paid request (including back/return and rapid clicks).
  if (existing && (!regenerate || !existing.settled)) {
    onText?.(existing.text);
    onStatus?.(existing.phase, existing.startedAt);
    if (!existing.settled && (onText || onStatus)) existing.listeners.add({ onText, onStatus });
    return existing.pending;
  }
  if (!regenerate) {
    const restored = gameDesignProfileSchema.safeParse(saved()?.[key]);
    if (restored.success) return Promise.resolve(restored.data);
  }
  const listeners = new Set<PreviewListener>();
  if (onText || onStatus) listeners.add({ onText, onStatus });
  const entry = { pending: null! as Promise<GameDesignProfile>, text: "", phase: "submitted" as DesignPreviewPhase, startedAt: new Date().toISOString(), settled: false, listeners };
  const pending = generateDesignPreview(input, new AbortController().signal, delta => {
    entry.text += delta;
    for (const listener of listeners) listener.onText?.(entry.text);
  }, () => {
    // 模型上一次输出被服务端校验拒绝并重写：已显示的半截内容作废。
    entry.text = "";
    for (const listener of listeners) listener.onText?.("");
  }, phase => {
    entry.phase = phase;
    for (const listener of listeners) listener.onStatus?.(phase, entry.startedAt);
  });
  entry.pending = pending;
  entries.set(key, entry);
  if (entries.size > 12) {
    const settledKey = [...entries].find(([, value]) => value.settled)?.[0];
    if (settledKey) entries.delete(settledKey);
  }
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
