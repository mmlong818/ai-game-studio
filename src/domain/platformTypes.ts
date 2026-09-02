import type { CreationMode, ReferenceDossier } from "./types";

export type ProgressionMode =
  | "finite-campaign"
  | "endless"
  | "run-based"
  | "round-based"
  | "chapter-based"
  | "sandbox";

export type GameDimension = "2d" | "limited-3d";
export type InputMethod = "keyboard" | "pointer" | "touch" | "gamepad";
export type RulePriority = "P0" | "P1" | "P2";
export type EvidenceStatus = "pending" | "passed" | "failed" | "stale" | "manual-review";
export type AssetRole =
  | "player"
  | "background"
  | "obstacle"
  | "collectible"
  | "effect"
  | "interface";

export interface ProductIntent {
  title: string;
  vision: string;
  genre: string;
  targetPlayer: string;
  playerFantasy: string;
  sessionLength: {
    minimumMinutes: number;
    targetMinutes: number;
    maximumMinutes: number;
  };
  designPillars: string[];
}

export interface CapabilityDeclaration {
  dimensions: GameDimension;
  perspective: "top-down" | "side" | "board" | "fixed-camera";
  world: "single-stage" | "multi-stage";
  progressionMode: ProgressionMode;
  networkMode: "single-player";
  deliveryTarget: "web";
  inputs: InputMethod[];
  requiredCapabilities: string[];
}

export interface GameActionContract {
  id: string;
  label: string;
  availableWhen: string[];
  inputBindings: string[];
  continuous: boolean;
  effects: string[];
  feedback: string[];
}

export interface GameEntityContract {
  id: string;
  label: string;
  role: AssetRole;
  collider: "none" | "box" | "circle" | "head" | "grid-cell";
  spawnWhen: string[];
  destroyWhen: string[];
  effects: string[];
  presentation: string[];
}

export interface GameRuleContract {
  id: string;
  priority: RulePriority;
  label: string;
  trigger: string;
  conditions: string[];
  effects: string[];
  invariants: string[];
  observable: string[];
  failureMessage: string;
}

export interface GameSpecV2 {
  schemaVersion: "game-spec-v2";
  projectId: string;
  createdAt: string;
  creationMode: CreationMode;
  intent: ProductIntent;
  capabilities: CapabilityDeclaration;
  source: {
    templateId: string | null;
    changeLevel: "R0" | "R1" | "R2" | "R3";
    lockedCoreRuleIds: string[];
    selectedMechanicIds: string[];
    referenceDossierId: string | null;
  };
  lifecycle: ["loading", "ready", "playing", "paused", "result", "error"];
  actions: GameActionContract[];
  entities: GameEntityContract[];
  rules: GameRuleContract[];
  progression: {
    mode: ProgressionMode;
    supportsRestore: boolean;
    completion: string;
    failure: string;
  };
  assetPolicy: {
    gameArt: "ai-generated-raster-only";
    allowSvgGameArt: false;
    requireLocalFiles: true;
    requireProvenance: true;
  };
  qualityTargets: {
    touchTargetPx: 44;
    requiredViewports: string[];
    targetFps: number;
    initialAssetBudgetMb: number;
    packageBudgetMb: number;
  };
}

export interface AssetGenerationRecord {
  id: string;
  role: AssetRole;
  label: string;
  prompt: string;
  promptHash: string;
  model: string;
  provider: string;
  generatedAt: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  localPath: string;
  contentHash: string;
  version: number;
  status: "candidate" | "active" | "superseded" | "failed";
  processing: string[];
  provenance: "ai-generated";
}

export interface AssetBinding {
  id: string;
  assetId: string;
  sceneNodeId: string;
  state: string;
}

export interface SceneNode {
  id: string;
  parentId: string | null;
  label: string;
  role: AssetRole;
  renderer: "dom" | "canvas-2d" | "webgl";
  position: { x: number; y: number };
  size: { width: number; height: number };
  anchor: { x: number; y: number };
  layer: number;
  visible: boolean;
  collider: {
    kind: GameEntityContract["collider"];
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
  animation: {
    clip: string | null;
    speed: number;
    movableParts: string[];
  };
  assetId: string | null;
  ruleIds: string[];
  editableProperties: Array<"position" | "size" | "layer" | "visible" | "animation-speed">;
  lockedProperties: Array<"collider" | "rules" | "asset-role">;
}

export interface AcceptanceAssertion {
  id: string;
  sourceRuleIds: string[];
  label: string;
  priority: RulePriority;
  kind: "rule" | "asset" | "viewport" | "performance" | "accessibility" | "game-feel" | "manual";
  status: EvidenceStatus;
  message: string;
  evidenceIds: string[];
}

export interface QualityEvidence {
  id: string;
  assertionId: string;
  buildId: string;
  kind: "state" | "screenshot" | "event-log" | "metric" | "manual-note";
  capturedAt: string;
  value: string;
  specHash: string;
  codeHash: string;
  assetManifestHash: string;
}

export interface BuildManifest {
  id: string;
  projectId: string;
  changeSetId: string | null;
  createdAt: string;
  status: "building" | "healthy" | "failed";
  specHash: string;
  codeHash: string;
  assetManifestHash: string;
  checkerVersion: string;
  entryFile: "index.html";
  assetPaths: string[];
  viewports: string[];
  errors: string[];
}

export interface ChangeSet {
  id: string;
  goal: string;
  createdAt: string;
  status: "draft" | "building" | "validating" | "manual-review" | "completed" | "failed" | "rolled-back";
  affectedRuleIds: string[];
  affectedNodeIds: string[];
  affectedAssetIds: string[];
  targetViewports: string[];
  previousBuildId: string | null;
  nextBuildId: string | null;
  rollbackBuildId: string | null;
  failureReasons: string[];
  beforeScreenshotEvidenceIds: string[];
  afterScreenshotEvidenceIds: string[];
  beforeSnapshot: {
    assets: AssetGenerationRecord[];
    assetBindings: AssetBinding[];
    scene: SceneNode[];
    assertions: AcceptanceAssertion[];
    evidence: QualityEvidence[];
  };
}

export interface AnonymousQualityEvent {
  id: string;
  projectId: string;
  buildId: string;
  event:
    | "session-start"
    | "completed"
    | "failed"
    | "retry"
    | "hint"
    | "undo"
    | "paused"
    | "restored"
    | "mechanic-used"
    | "performance";
  occurredAt: string;
  viewport: string;
  input: InputMethod;
  ruleId?: string;
  reasonCode?: string;
  numericValue?: number;
}

export interface StudioProject {
  id: string;
  name: string;
  spec: GameSpecV2;
  referenceDossier: ReferenceDossier | null;
  assets: AssetGenerationRecord[];
  assetBindings: AssetBinding[];
  scene: SceneNode[];
  assertions: AcceptanceAssertion[];
  evidence: QualityEvidence[];
  builds: BuildManifest[];
  changeSets: ChangeSet[];
  qualityEvents: AnonymousQualityEvent[];
  activeBuildId: string | null;
  publishedBuildId: string | null;
}
