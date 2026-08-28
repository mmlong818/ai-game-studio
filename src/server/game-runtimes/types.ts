import type { GameTemplate } from "../../shared/contracts.js";

export type RuntimeDefinition = {
  id: GameTemplate;
  label: string;
  eyebrow: string;
  intro: string;
  objective: string;
  primaryMetric: string;
  controls: Array<{ value: string; label: string; ariaLabel: string }>;
  script: string;
  redrawFunction: string;
  probeTokens: string[];
};
