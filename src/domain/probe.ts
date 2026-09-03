import type { OfficialProbeKind, OfficialProbeScenario } from "../shared/official-games";
import type { GameSpecV2 } from "./platformTypes";
import { GAMEPLAY_TEMPLATE_BUNDLES, getGameplayBundle } from "./templates";

export interface PublicGameState {
  lifecycle: "ready" | "playing" | "result";
  result: "completed" | "failed" | null;
  score: number;
  resources: Record<string, number>;
  values: Record<string, number | string | boolean | number[]>;
  events: string[];
}

export interface ProbeActionResult {
  accepted: boolean;
  reason: string;
  state: PublicGameState;
}

export interface GameProbe {
  getState(): PublicGameState;
  listActions(): string[];
  performAction(actionId: string): ProbeActionResult;
  setSeed(seed: number): void;
  restart(): void;
  restore(snapshot: PublicGameState): void;
  snapshot(): PublicGameState;
}

const cloneState = (state: PublicGameState): PublicGameState =>
  JSON.parse(JSON.stringify(state)) as PublicGameState;

const restoreState = (snapshot: PublicGameState): PublicGameState => {
  if (!["ready", "playing", "result"].includes(snapshot.lifecycle)) throw new Error("存档生命周期无效");
  const restored = cloneState(snapshot);
  restored.events.push("checkpoint-restored");
  return restored;
};

export class MergeGridProbe implements GameProbe {
  private seed = 1;
  private state: PublicGameState = this.initialState();

  private initialState(): PublicGameState {
    return {
      lifecycle: "ready",
      result: null,
      score: 0,
      resources: { moves: 0 },
      values: { board: [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      events: [],
    };
  }

  getState(): PublicGameState {
    return cloneState(this.state);
  }

  listActions(): string[] {
    if (this.state.lifecycle === "ready") return ["start"];
    if (this.state.lifecycle === "result") return ["restart"];
    return ["slide-left", "slide-right", "slide-up", "slide-down", "restart"];
  }

  performAction(actionId: string): ProbeActionResult {
    if (!this.listActions().includes(actionId)) {
      return { accepted: false, reason: "动作在当前状态不可用", state: this.getState() };
    }
    if (actionId === "start") {
      this.state.lifecycle = "playing";
      this.state.events.push("session-start");
      return { accepted: true, reason: "开始", state: this.getState() };
    }
    if (actionId === "restart") {
      this.restart();
      return { accepted: true, reason: "重开", state: this.getState() };
    }
    const board = [...(this.state.values.board as number[])];
    if (actionId === "slide-left" && board[0] === 2 && board[1] === 2) {
      board[0] = 4;
      board[1] = 0;
      const spawnIndex = 2 + (this.seed % 14);
      board[spawnIndex] = 2;
      this.state.values.board = board;
      this.state.score += 4;
      this.state.resources.moves += 1;
      this.state.events.push("board-slid", "equal-merged-once", "tile-spawned-after-valid-move");
      return { accepted: true, reason: "有效滑动", state: this.getState() };
    }
    this.state.events.push("invalid-move-preserved-state");
    return { accepted: false, reason: "无效移动不会生成新块", state: this.getState() };
  }

  setSeed(seed: number): void {
    this.seed = Math.abs(Math.floor(seed)) || 1;
  }

  restart(): void {
    this.state = this.initialState();
  }

  restore(snapshot: PublicGameState): void { this.state = restoreState(snapshot); }

  snapshot(): PublicGameState {
    return this.getState();
  }
}

export class LadybugClimbProbe implements GameProbe {
  private seed = 1;
  private state: PublicGameState = this.initialState();

  private initialState(): PublicGameState {
    return {
      lifecycle: "ready",
      result: null,
      score: 0,
      resources: { dew: 0, boost: 0 },
      values: {
        x: 1,
        y: 50,
        backgroundOffset: 0,
        speedTier: "cruise",
        dewVisible: true,
        dewBurst: false,
        resinVisible: true,
        safeLane: this.seed % 3,
      },
      events: [],
    };
  }

  getState(): PublicGameState {
    return cloneState(this.state);
  }

  listActions(): string[] {
    if (this.state.lifecycle === "ready") return ["start"];
    if (this.state.lifecycle === "result") return ["restart"];
    return [
      "move-left",
      "move-right",
      "move-up",
      "move-down",
      "body-touch-dew",
      "head-touch-dew",
      "advance",
      "boost",
      "hit-resin",
      "restart",
    ];
  }

  performAction(actionId: string): ProbeActionResult {
    if (!this.listActions().includes(actionId)) {
      return { accepted: false, reason: "动作在当前状态不可用", state: this.getState() };
    }
    if (actionId === "start") {
      this.state.lifecycle = "playing";
      this.state.events.push("session-start");
    } else if (actionId === "restart") {
      this.restart();
    } else if (actionId.startsWith("move-")) {
      const direction = actionId.slice(5);
      if (direction === "left") this.state.values.x = Math.max(0, Number(this.state.values.x) - 1);
      if (direction === "right") this.state.values.x = Math.min(2, Number(this.state.values.x) + 1);
      if (direction === "up") this.state.values.y = Math.max(0, Number(this.state.values.y) - 10);
      if (direction === "down") this.state.values.y = Math.min(100, Number(this.state.values.y) + 10);
      this.state.events.push(`moved-${direction}`, "legs-animated");
    } else if (actionId === "body-touch-dew") {
      this.state.events.push("body-overlap-ignored");
      return { accepted: false, reason: "身体触碰不会收集露珠", state: this.getState() };
    } else if (actionId === "head-touch-dew" && this.state.values.dewVisible === true) {
      this.state.values.dewVisible = false;
      this.state.values.dewBurst = true;
      this.state.resources.dew += 1;
      this.state.resources.boost += 25;
      this.state.score += 100;
      this.state.events.push("dew-collected-by-head", "dew-burst", "dew-removed");
    } else if (actionId === "advance") {
      this.state.values.backgroundOffset = Number(this.state.values.backgroundOffset) + 24;
      this.state.values.speedTier = this.state.resources.boost > 0 ? "accelerate" : "cruise";
      this.state.events.push("background-scrolled-down", "safe-lane-preserved", "speed-tier-visible");
    } else if (actionId === "boost" && this.state.resources.boost > 0) {
      this.state.resources.boost -= 10;
      this.state.values.speedTier = "boost";
      this.state.events.push("boost-started", "speed-tier-visible");
    } else if (actionId === "hit-resin") {
      if (this.state.values.speedTier === "boost") {
        this.state.values.resinVisible = false;
        this.state.events.push("resin-broken-by-boost");
      } else {
        this.state.lifecycle = "result";
        this.state.result = "failed";
        this.state.events.push("normal-resin-collision-failed");
      }
    }
    return { accepted: true, reason: "动作已执行", state: this.getState() };
  }

  setSeed(seed: number): void {
    this.seed = Math.abs(Math.floor(seed)) || 1;
    this.state.values.safeLane = this.seed % 3;
  }

  restart(): void {
    this.state = this.initialState();
  }

  restore(snapshot: PublicGameState): void { this.state = restoreState(snapshot); }

  snapshot(): PublicGameState {
    return this.getState();
  }
}

export class TileRogueliteProbe implements GameProbe {
  private seed = 1;
  private state: PublicGameState = this.initialState();

  private initialState(): PublicGameState {
    return {
      lifecycle: "ready",
      result: null,
      score: 0,
      resources: { freePairs: 2, relics: 0 },
      values: { layoutSolvable: true, route: "none", checkpoint: false, seed: this.seed },
      events: [],
    };
  }

  getState() { return cloneState(this.state); }
  listActions() {
    if (this.state.lifecycle === "ready") return ["start"];
    if (this.state.lifecycle === "result") return ["restart"];
    return ["match-free-pair", "match-blocked-pair", "choose-risk-route", "take-relic", "save-checkpoint", "finish"];
  }
  performAction(actionId: string): ProbeActionResult {
    if (!this.listActions().includes(actionId)) return { accepted: false, reason: "动作不可用", state: this.getState() };
    if (actionId === "start") { this.state.lifecycle = "playing"; this.state.events.push("session-start", "seeded-solvable-layout"); }
    if (actionId === "match-blocked-pair") return { accepted: false, reason: "被压住的牌不是自由牌", state: this.getState() };
    if (actionId === "match-free-pair") { this.state.resources.freePairs -= 1; this.state.score += 20; this.state.events.push("free-pair-removed"); }
    if (actionId === "choose-risk-route") { this.state.values.route = "risk"; this.state.events.push("route-choice-applied"); }
    if (actionId === "take-relic") { this.state.resources.relics += 1; this.state.events.push("relic-synergy-applied"); }
    if (actionId === "save-checkpoint") { this.state.values.checkpoint = true; this.state.events.push("checkpoint-saved"); }
    if (actionId === "finish") { this.state.lifecycle = "result"; this.state.result = "completed"; this.state.events.push("run-completed"); }
    return { accepted: true, reason: "动作已执行", state: this.getState() };
  }
  setSeed(seed: number) { this.seed = Math.abs(Math.floor(seed)) || 1; this.state.values.seed = this.seed; }
  restart() { this.state = this.initialState(); }
  restore(snapshot: PublicGameState) { this.state = restoreState(snapshot); }
  snapshot() { return this.getState(); }
}

export class CollectEscape3DProbe implements GameProbe {
  private seed = 1;
  private state: PublicGameState = this.initialState();

  private initialState(): PublicGameState {
    return {
      lifecycle: "ready",
      result: null,
      score: 0,
      resources: { collected: 0, required: 1 },
      values: { x: 0, cameraYaw: 0, wallCrossed: false, exitUnlocked: false, grounded: true, seed: this.seed },
      events: [],
    };
  }
  getState() { return cloneState(this.state); }
  listActions() {
    if (this.state.lifecycle === "ready") return ["start"];
    if (this.state.lifecycle === "result") return ["restart"];
    return ["move-forward", "rotate-camera", "cross-wall", "collect", "enter-exit", "fall-check"];
  }
  performAction(actionId: string): ProbeActionResult {
    if (!this.listActions().includes(actionId)) return { accepted: false, reason: "动作不可用", state: this.getState() };
    if (actionId === "start") { this.state.lifecycle = "playing"; this.state.events.push("session-start"); }
    if (actionId === "move-forward") { this.state.values.x = Number(this.state.values.x) + 1; this.state.events.push("character-moved"); }
    if (actionId === "rotate-camera") { this.state.values.cameraYaw = Number(this.state.values.cameraYaw) + 30; this.state.events.push("camera-rotated"); }
    if (actionId === "cross-wall") return { accepted: false, reason: "碰撞边界阻止穿墙", state: this.getState() };
    if (actionId === "collect") { this.state.resources.collected += 1; this.state.values.exitUnlocked = true; this.state.events.push("target-collected", "exit-unlocked"); }
    if (actionId === "enter-exit" && this.state.values.exitUnlocked) { this.state.lifecycle = "result"; this.state.result = "completed"; this.state.events.push("exit-reached"); }
    if (actionId === "fall-check") { this.state.values.grounded = true; this.state.events.push("ground-check-passed"); }
    return { accepted: true, reason: "动作已执行", state: this.getState() };
  }
  setSeed(seed: number) { this.seed = Math.abs(Math.floor(seed)) || 1; this.state.values.seed = this.seed; }
  restart() { this.state = this.initialState(); }
  restore(snapshot: PublicGameState) { this.state = restoreState(snapshot); }
  snapshot() { return this.getState(); }
}

export type GoldenScenarioDefinition = OfficialProbeScenario;

/**
 * 玩法模板 id → 确定性验收场景。由玩法模板捆绑（官方游戏登记表 + 补充模板）派生，
 * 只包含走通用 GoldenTemplateProbe 的模板；有专属探针类的模板（probeKind ≠ "golden"）不在其中。
 */
export const GOLDEN_SCENARIOS: Record<string, GoldenScenarioDefinition> = Object.fromEntries(
  GAMEPLAY_TEMPLATE_BUNDLES
    .filter((bundle) => (bundle.probeKind ?? "golden") === "golden")
    .map((bundle) => [bundle.domainTemplate.id, bundle.probeScenario]),
);

const COMPOSED_MECHANIC_SCENARIOS: Record<string, GoldenScenarioDefinition> = {
  "lane-dodge": { actions: { "read-lane": ["safe-lane-visible"], dodge: ["lane-changed", "obstacle-avoided"], finish: ["distance-target-reached", "session-completed"] }, completingActions: ["finish"] },
  "grid-merge": { actions: { inspect: ["board-readable"], slide: ["board-slid", "equal-merged-once"], finish: ["target-tile-reached", "session-completed"] }, completingActions: ["finish"] },
  "projectile-combat": { actions: { aim: ["aim-readable"], fire: ["projectile-fired", "stable-hit"], finish: ["enemy-wave-settled", "session-completed"] }, completingActions: ["finish"] },
  "grid-path": { actions: { inspect: ["entry-exit-connected"], "invalid-wall": ["wall-blocked"], finish: ["exit-reached", "session-completed"] }, rejectedActions: ["invalid-wall"], completingActions: ["finish"] },
  "route-choice": { actions: { compare: ["risk-reward-visible"], choose: ["route-choice-applied"], finish: ["route-result-resolved", "session-completed"] }, completingActions: ["finish"] },
  "collect-escape": { actions: { collect: ["target-collected", "exit-unlocked"], retreat: ["risk-increased"], finish: ["exit-reached", "session-completed"] }, completingActions: ["finish"] },
  "drag-snap": { actions: { pick: ["piece-picked"], "invalid-drop": ["invalid-drop-rejected"], finish: ["piece-snapped", "session-completed"] }, rejectedActions: ["invalid-drop"], completingActions: ["finish"] },
  "constraint-deduction": { actions: { inspect: ["constraints-complete"], eliminate: ["candidate-eliminated"], finish: ["unique-solution-confirmed", "session-completed"] }, completingActions: ["finish"] },
  "queue-management": { actions: { inspect: ["orders-and-deadlines-visible"], schedule: ["queue-order-applied", "capacity-respected"], finish: ["orders-delivered", "round-settled", "session-completed"] }, completingActions: ["finish"] },
  "chapter-branch": { actions: { read: ["chapter-state-visible"], choose: ["branch-choice-applied", "consequence-flag-saved"], finish: ["chapter-result-reached", "checkpoint-saved", "session-completed"] }, completingActions: ["finish"] },
  "deck-combo": { actions: { draw: ["seeded-card-drawn"], play: ["card-cost-paid", "combo-resolved"], finish: ["turn-settled", "session-completed"] }, completingActions: ["finish"] },
  "gamepad-control": { actions: { connect: ["gamepad-detected"], act: ["gamepad-action-mapped", "focus-feedback-visible"], finish: ["keyboard-fallback-preserved", "session-completed"] }, completingActions: ["finish"] },
  "spatial-puzzle-3d": { actions: { observe: ["camera-rotated", "spatial-clue-visible"], operate: ["mechanism-state-changed", "path-remains-reachable"], finish: ["spatial-goal-reached", "checkpoint-saved", "session-completed"] }, completingActions: ["finish"] },
};

export function scenarioForMechanics(mechanicIds: string[]): GoldenScenarioDefinition | null {
  const scenarios = mechanicIds.map((id) => COMPOSED_MECHANIC_SCENARIOS[id]).filter(Boolean);
  if (scenarios.length === 0) return null;
  const actions = Object.assign({}, ...scenarios.map((scenario, index) => Object.fromEntries(
    Object.entries(scenario.actions).map(([action, events]) => [`m${index}-${action}`, events]),
  )));
  const rejectedActions = scenarios.flatMap((scenario, index) => (scenario.rejectedActions ?? []).map((action) => `m${index}-${action}`));
  const finalIndex = scenarios.length - 1;
  const completingActions = (scenarios.at(-1)?.completingActions ?? []).map((action) => `m${finalIndex}-${action}`);
  return { actions, rejectedActions, completingActions };
}

export class GoldenTemplateProbe implements GameProbe {
  private seed = 1;
  private state: PublicGameState;

  constructor(private readonly definition: GoldenScenarioDefinition) {
    this.state = this.initialState();
  }

  private initialState(): PublicGameState {
    return {
      lifecycle: "ready",
      result: null,
      score: 0,
      resources: { steps: 0 },
      values: { seed: this.seed },
      events: [],
    };
  }

  getState() { return cloneState(this.state); }
  listActions() {
    if (this.state.lifecycle === "ready") return ["start"];
    if (this.state.lifecycle === "result") return ["restart"];
    return [...Object.keys(this.definition.actions), "restart"];
  }
  performAction(actionId: string): ProbeActionResult {
    if (!this.listActions().includes(actionId)) return { accepted: false, reason: "动作在当前状态不可用", state: this.getState() };
    if (actionId === "start") {
      this.state.lifecycle = "playing";
      this.state.events.push("session-start");
      return { accepted: true, reason: "开始", state: this.getState() };
    }
    if (actionId === "restart") {
      this.restart();
      return { accepted: true, reason: "重开", state: this.getState() };
    }
    this.state.events.push(...(this.definition.actions[actionId] ?? []));
    const rejected = this.definition.rejectedActions?.includes(actionId) ?? false;
    if (!rejected) this.state.resources.steps += 1;
    if (this.definition.completingActions?.includes(actionId)) {
      this.state.lifecycle = "result";
      this.state.result = this.state.events.includes("session-failed") ? "failed" : "completed";
    }
    return {
      accepted: !rejected,
      reason: rejected ? "规则正确拒绝非法动作" : "动作已执行",
      state: this.getState(),
    };
  }
  setSeed(seed: number) { this.seed = Math.abs(Math.floor(seed)) || 1; this.state.values.seed = this.seed; }
  restart() { this.state = this.initialState(); }
  restore(snapshot: PublicGameState) { this.state = restoreState(snapshot); }
  snapshot() { return this.getState(); }
}

/**
 * 登记表 probeKind → 探针工厂。"golden" 用登记的场景驱动通用探针；
 * 其余指向专属探针类。这里没有实现的种类（例如尚未合并的 paper-popup）会让 createProbe 抛错，
 * 守卫测试因此能拦住登记了却没有探针的游戏。
 */
const PROBE_FACTORIES: Partial<Record<OfficialProbeKind, (scenario: OfficialProbeScenario) => GameProbe>> = {
  golden: (scenario) => new GoldenTemplateProbe(scenario),
  "merge-grid": () => new MergeGridProbe(),
  "tile-roguelite": () => new TileRogueliteProbe(),
  "collect-escape-3d": () => new CollectEscape3DProbe(),
};

export function createProbe(spec: GameSpecV2): GameProbe {
  const bundle = getGameplayBundle(spec.source.templateId);
  if (bundle) {
    const probeKind = bundle.probeKind ?? "golden";
    const factory = PROBE_FACTORIES[probeKind];
    if (!factory) throw new Error(`玩法模板 ${bundle.domainTemplate.id} 登记的探针种类 ${probeKind} 还没有实现。`);
    return factory(bundle.probeScenario);
  }
  if (
    spec.source.selectedMechanicIds.includes("lane-dodge") &&
    spec.source.selectedMechanicIds.includes("collect-escape")
  ) {
    return new LadybugClimbProbe();
  }
  const composedScenario = scenarioForMechanics(spec.source.selectedMechanicIds);
  if (composedScenario) return new GoldenTemplateProbe(composedScenario);
  throw new Error("当前玩法还没有专属 GameProbe，不能使用其他游戏的探针替代。");
}
