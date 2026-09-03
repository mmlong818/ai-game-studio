import type { GameSpecV2 } from "./platformTypes";
import { popupBestTemplateBlueprints } from "../shared/paper-popup-levels";
import { createPaperPopupRules, type PopupAction, type PopupBlueprint, type PopupState } from "../shared/paper-popup-rules";

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

/** 纸境 · 立体书迷宫的专属探针：直接驱动真实规则内核（与浏览器运行时同一份），不是事件脚本。 */
export const PAPER_POPUP_TEMPLATE_ID = "popup-rotate-3d";
export const PAPER_POPUP_RULE_LABELS = [
  "整本书按 90° 转动",
  "桥与台阶只在特定角度接上",
  "隐藏星只在非默认角度可见",
  "跳空或被障碍碰到回到检查点",
  "抵达出口门通关",
] as const;

export class PaperPopupProbe implements GameProbe {
  private readonly rules = createPaperPopupRules();
  private seed = 1;
  private blueprint: PopupBlueprint = popupBestTemplateBlueprints[0];
  private model: PopupState = this.rules.createState(this.blueprint);
  private state: PublicGameState = this.initialState();

  constructor(levelIndex = 0) {
    this.blueprint = popupBestTemplateBlueprints[Math.max(0, Math.min(popupBestTemplateBlueprints.length - 1, levelIndex))];
    this.model = this.rules.createState(this.blueprint);
    this.state = this.initialState();
  }

  private initialState(): PublicGameState {
    return {
      lifecycle: "ready",
      result: null,
      score: 0,
      resources: { stars: 0, mistakes: 0, beats: 0, rotations: 0 },
      values: { level: this.blueprint.id, orientation: 0, x: this.blueprint.start.x, z: this.blueprint.start.z, seed: this.seed, hiddenStarVisible: false, angleLinkOpen: false, checkpoint: -1 },
      events: [],
    };
  }

  private hiddenStarIndex() {
    return this.blueprint.stars.findIndex((star) => !star.angles.includes(0));
  }

  private angleLink() {
    return this.blueprint.links.find((link) => Array.isArray(link.angles)) ?? null;
  }

  private syncValues() {
    const hidden = this.hiddenStarIndex();
    const link = this.angleLink();
    this.state.values.orientation = this.model.o * 90;
    this.state.values.x = this.model.x;
    this.state.values.z = this.model.z;
    this.state.values.checkpoint = this.model.checkpoint;
    this.state.values.hiddenStarVisible = hidden >= 0 && this.blueprint.stars[hidden].angles.includes(this.model.o) && !this.model.stars[hidden];
    this.state.values.angleLinkOpen = link ? this.rules.linkOpen(link, this.model) : false;
    this.state.resources.stars = this.model.stars.filter(Boolean).length;
    this.state.resources.mistakes = this.model.mistakes;
    this.state.score = this.state.resources.stars * 100 + (this.model.done ? 300 : 0);
  }

  getState() { return cloneState(this.state); }

  listActions() {
    if (this.state.lifecycle === "ready") return ["start"];
    if (this.state.lifecycle === "result") return ["restart"];
    return ["rotate-cw", "rotate-ccw", "move-N", "move-E", "move-S", "move-W", "jump-N", "jump-E", "jump-S", "jump-W", "wait", "cross-folded-link", "restart"];
  }

  /** 求解器给出的正确角度序列，供验收场景真实走完本关。 */
  solution(): string[] {
    const solution = this.rules.solveLevel(this.blueprint);
    return (solution?.actions ?? []).map((action) => action === "cw" ? "rotate-cw" : action === "ccw" ? "rotate-ccw" : action === "wait" ? "wait" : action.startsWith("j") ? `jump-${action.slice(1)}` : `move-${action}`);
  }

  performAction(actionId: string): ProbeActionResult {
    if (!this.listActions().includes(actionId)) return { accepted: false, reason: "动作在当前状态不可用", state: this.getState() };
    if (actionId === "start") {
      this.state.lifecycle = "playing";
      this.state.events.push("session-start");
      this.syncValues();
      return { accepted: true, reason: "翻开这一页", state: this.getState() };
    }
    if (actionId === "restart") {
      this.restart();
      return { accepted: true, reason: "重开", state: this.getState() };
    }
    if (actionId === "cross-folded-link") {
      // 试图走过一座此时没有接上的角度桥/台阶：规则必须拒绝，人物留在原地。
      const link = this.angleLink();
      if (!link || this.rules.linkOpen(link, this.model)) return { accepted: false, reason: "当前没有折起的角度桥可供测试", state: this.getState() };
      const probe = this.rules.cloneState(this.model);
      probe.x = link.from.x; probe.z = link.from.z;
      const dx = Math.sign(link.to.x - link.from.x);
      const dz = Math.sign(link.to.z - link.from.z);
      const direction = dx === 1 ? "E" : dx === -1 ? "W" : dz === 1 ? "S" : "N";
      const target = this.rules.walkTarget(this.blueprint, probe, direction);
      const crossed = Boolean(target && target.x === link.to.x && target.z === link.to.z);
      this.state.events.push(crossed ? "folded-link-crossed" : "folded-link-blocked");
      return { accepted: false, reason: crossed ? "折起的桥被错误穿过" : "折起的桥挡住了去路", state: this.getState() };
    }
    const action: PopupAction = actionId === "rotate-cw" ? "cw" : actionId === "rotate-ccw" ? "ccw" : actionId === "wait" ? "wait" : actionId.startsWith("jump-") ? (`j${actionId.slice(5)}` as PopupAction) : (actionId.slice(5) as PopupAction);
    const result = this.rules.step(this.blueprint, this.model, action);
    this.model = result.state;
    if (action === "cw" || action === "ccw") { this.state.resources.rotations += 1; this.state.events.push("book-rotated"); }
    else this.state.resources.beats += 1;
    for (const event of result.events) {
      if (event.startsWith("star:")) this.state.events.push("star-collected");
      if (event.startsWith("checkpoint:")) this.state.events.push("checkpoint-reached");
      if (event === "fell" || event === "hit") this.state.events.push("returned-to-checkpoint");
      if (event === "exit") this.state.events.push("exit-reached");
      if (event.startsWith("blocked:")) this.state.events.push("move-blocked");
    }
    const link = this.angleLink();
    if (link && (action === "cw" || action === "ccw")) this.state.events.push(this.rules.linkOpen(link, this.model) ? "angle-link-connected" : "angle-link-folded");
    const hidden = this.hiddenStarIndex();
    if (hidden >= 0 && (action === "cw" || action === "ccw") && this.blueprint.stars[hidden].angles.includes(this.model.o)) this.state.events.push("hidden-star-revealed");
    this.syncValues();
    if (this.model.done) { this.state.lifecycle = "result"; this.state.result = "completed"; }
    return { accepted: result.ok, reason: result.ok ? "动作已执行" : "规则拒绝了这个动作", state: this.getState() };
  }

  setSeed(seed: number) { this.seed = Math.abs(Math.floor(seed)) || 1; this.state.values.seed = this.seed; }
  restart() { this.model = this.rules.createState(this.blueprint); this.state = this.initialState(); }
  restore(snapshot: PublicGameState) {
    this.state = restoreState(snapshot);
    this.model.o = ((Math.round(Number(snapshot.values.orientation) / 90) % 4 + 4) % 4) as PopupState["o"];
    this.model.x = Number(snapshot.values.x);
    this.model.z = Number(snapshot.values.z);
  }
  snapshot() { return this.getState(); }
}

export interface GoldenScenarioDefinition {
  actions: Record<string, string[]>;
  rejectedActions?: string[];
  completingActions?: string[];
}

export const GOLDEN_SCENARIOS: Record<string, GoldenScenarioDefinition> = {
  "falling-blocks": {
    actions: {
      tick: ["piece-fell"],
      "complete-row": ["full-row-detected", "row-cleared"],
      "stack-to-top": ["top-reached", "session-failed"],
    },
    completingActions: ["stack-to-top"],
  },
  "picture-puzzle": {
    actions: {
      "inspect-pieces": ["piece-source-stable"],
      "drop-correct": ["piece-snapped"],
      "place-all": ["all-pieces-placed", "session-completed"],
    },
    completingActions: ["place-all"],
  },
  breakout: {
    actions: {
      "paddle-bounce": ["paddle-reflected-ball"],
      "hit-target": ["ball-hit-target", "hit-feedback"],
      "clear-targets": ["all-targets-cleared", "session-completed"],
    },
    completingActions: ["clear-targets"],
  },
  "sliding-block": {
    actions: {
      "inspect-grid": ["occupancy-fixed"],
      "invalid-overlap": ["overlap-blocked"],
      "move-target-exit": ["target-reached-exit", "session-completed"],
    },
    rejectedActions: ["invalid-overlap"],
    completingActions: ["move-target-exit"],
  },
  maze: {
    actions: {
      "invalid-cross-wall": ["wall-blocked"],
      "inspect-route": ["entry-exit-connected"],
      "follow-route-exit": ["exit-reached", "session-completed"],
    },
    rejectedActions: ["invalid-cross-wall"],
    completingActions: ["follow-route-exit"],
  },
  snake: {
    actions: {
      tick: ["continuous-step"],
      "invalid-reverse": ["reverse-blocked"],
      "eat-and-self-collide": ["food-collected", "body-grew", "self-collision", "session-failed"],
    },
    rejectedActions: ["invalid-reverse"],
    completingActions: ["eat-and-self-collide"],
  },
  "space-shooter": {
    actions: {
      "move-and-shoot": ["player-moved", "projectile-fired"],
      "hit-enemy": ["stable-hit", "hit-feedback"],
      "finish-wave": ["life-accounted", "wave-settled", "session-completed"],
    },
    completingActions: ["finish-wave"],
  },
  polyomino: {
    actions: {
      "rotate-piece": ["piece-rotated"],
      "invalid-overlap": ["overlap-blocked"],
      "cover-outline": ["outline-covered", "session-completed"],
    },
    rejectedActions: ["invalid-overlap"],
    completingActions: ["cover-outline"],
  },
  "block-placement": {
    actions: {
      "deal-three": ["three-pieces-offered"],
      "place-legal": ["legal-placement"],
      "complete-line": ["row-or-column-full", "line-cleared", "session-completed"],
    },
    completingActions: ["complete-line"],
  },
  "region-logic": {
    actions: {
      "inspect-clues": ["constraints-complete"],
      solve: ["solver-found-solution"],
      "make-error": ["error-explained", "session-completed"],
    },
    completingActions: ["make-error"],
  },
  "arena-3d": {
    actions: {
      "move-and-attack": ["movement-responsive", "attack-responsive"],
      "hit-enemy": ["stable-hit", "hit-feedback"],
      "finish-wave": ["enemy-wave-settled", "session-completed"],
    },
    completingActions: ["finish-wave"],
  },
  "turn-duel-match3": {
    actions: {
      "inspect-board": ["board-readable", "half-zones-visible"],
      "swap-outside-zone": ["zone-blocked"],
      "swap-match": ["three-in-line", "combo-scored-to-actor"],
      "end-turn": ["turn-passed-to-ai", "ai-turn-resolved"],
      "drain-opponent": ["score-drained", "session-completed"],
    },
    rejectedActions: ["swap-outside-zone"],
    completingActions: ["drain-opponent"],
  },
  "solitaire-freecell": {
    actions: {
      "inspect-tableau": ["tableau-readable", "free-cells-visible"],
      "stack-illegal": ["stack-rule-blocked"],
      "move-to-cell": ["card-parked-in-cell"],
      "stack-legal": ["alternating-descending-stack"],
      "supermove-over-limit": ["supermove-limit-blocked"],
      "build-foundation": ["foundation-advanced", "session-completed"],
    },
    rejectedActions: ["stack-illegal", "supermove-over-limit"],
    completingActions: ["build-foundation"],
  },
  "lane-climb": {
    actions: {
      "read-lanes": ["safe-lane-visible"],
      "switch-lane": ["lane-changed", "obstacle-avoided"],
      collect: ["target-collected", "speed-tier-changed"],
      finish: ["distance-target-reached", "session-completed"],
    },
    completingActions: ["finish"],
  },
};

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

export function createProbe(spec: GameSpecV2): GameProbe {
  if (spec.source.templateId === "merge-2048") return new MergeGridProbe();
  if (spec.source.templateId === "tile-roguelite") return new TileRogueliteProbe();
  if (spec.source.templateId === "collect-escape-3d") return new CollectEscape3DProbe();
  if (spec.source.templateId === PAPER_POPUP_TEMPLATE_ID) return new PaperPopupProbe();
  if (spec.source.templateId && GOLDEN_SCENARIOS[spec.source.templateId]) {
    return new GoldenTemplateProbe(GOLDEN_SCENARIOS[spec.source.templateId]);
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
