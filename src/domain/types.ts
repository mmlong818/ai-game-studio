export type ChangeLevel = "R0" | "R1" | "R2" | "R3";

export type CreationMode = "template-remix" | "mechanic-composition";

export type SuggestionCategory =
  | "world"
  | "visual"
  | "content"
  | "tuning"
  | "mechanic";

export interface TemplateSuggestion {
  id: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  keeps: string;
  newAssets: string;
  level: Exclude<ChangeLevel, "R3">;
  risk: "低" | "中";
}

export interface GameTemplate {
  id: string;
  name: string;
  genre: string;
  pitch: string;
  coreLoop: string;
  coreRules: string[];
  capabilities: string[];
  suggestions: TemplateSuggestion[];
  redirectExamples: string[];
}

export interface ClassificationResult {
  level: ChangeLevel;
  label: string;
  reasons: string[];
  matchedTerms: string[];
}

export interface MechanicDefinition {
  id: string;
  name: string;
  description: string;
  capabilityIds: string[];
  keywords: string[];
}

export type SourceType =
  | "official-rules"
  | "official-product"
  | "official-guide"
  | "original-repository";

export interface ResearchReference {
  title: string;
  url: string;
  sourceType: SourceType;
  verifiedAt: string;
  observedRules: string[];
  doNotCopy: string[];
  license: string | null;
}

export interface ReferenceDossier {
  id: string;
  queryIntent: string;
  internalCandidates: string[];
  references: ResearchReference[];
  adopted: string[];
  adapted: string[];
  rejected: string[];
  compatibilityRisks: string[];
}

/** 用户在大厅里选中的真实游戏；模板只是它背后的玩法骨架。 */
export interface SourceGame {
  id: string;
  title: string;
  coverUrl: string | null;
}

export interface StudioDraft {
  creationMode: CreationMode;
  templateId: string | null;
  sourceGame?: SourceGame | null;
  selectedSuggestionIds: string[];
  freeRequest: string;
  newGameBrief: string;
  selectedMechanicIds: string[];
  changeLevel: ChangeLevel;
  referenceDossier: ReferenceDossier | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
