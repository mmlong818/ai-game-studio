export type FeedbackDraft = { id: string; content: string };
const key = (projectId: string) => "studio-feedback:" + projectId;

export function loadFeedbackDraft(projectId: string | null): FeedbackDraft | null {
  if (!projectId) return null;
  try {
    const value = JSON.parse(localStorage.getItem(key(projectId)) ?? "null");
    return value && typeof value.id === "string" && /^[0-9a-f-]{36}$/i.test(value.id) && typeof value.content === "string"
      ? { id: value.id, content: value.content.slice(0, 2000) } : null;
  } catch { return null; }
}

// Failure to persist must not prevent a user from submitting feedback in this tab.
export function saveFeedbackDraft(projectId: string, draft: FeedbackDraft | null) {
  try {
    if (draft) localStorage.setItem(key(projectId), JSON.stringify(draft));
    else localStorage.removeItem(key(projectId));
  } catch { /* Storage may be disabled. The live React state remains available. */ }
}
