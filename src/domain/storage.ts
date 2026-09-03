import type { StudioDraft } from "./types";

const STORAGE_KEY = "ai-game-studio:m0-draft";

export const INITIAL_DRAFT: StudioDraft = {
  creationMode: "template-remix",
  templateId: "merge-2048",
  sourceGame: null,
  selectedSuggestionIds: [],
  freeRequest: "",
  newGameBrief: "",
  selectedMechanicIds: [],
  changeLevel: "R0",
  referenceDossier: null,
};

export function loadDraft(): StudioDraft {
  if (typeof window === "undefined") return INITIAL_DRAFT;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? { ...INITIAL_DRAFT, ...JSON.parse(value) } : INITIAL_DRAFT;
  } catch {
    return INITIAL_DRAFT;
  }
}

export function saveDraft(draft: StudioDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}
