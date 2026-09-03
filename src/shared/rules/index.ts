import type { GameProjectV3 } from "../project-schema/index.js";

export type RuntimeSignal =
  | { type: "frame"; deltaMs: number }
  | { type: "input"; direction?: { x: number; y: number }; action?: string }
  | { type: "collision"; sourceId: string; targetId: string }
  | { type: "timer"; id: string; elapsedMs: number };

export interface RuleRuntimeState {
  gameState: string;
  variables: Record<string, unknown>;
  entities: Record<string, { active: boolean; x: number; y: number }>;
  feedback: Array<{ type: string; payload: Record<string, unknown> }>;
  triggeredRuleIds: string[];
}

type Instruction = GameProjectV3["rules"][number]["when"][number];
type ConditionHandler = (instruction: Instruction, state: RuleRuntimeState, signal: RuntimeSignal) => boolean;
type ActionHandler = (instruction: Instruction, state: RuleRuntimeState, signal: RuntimeSignal) => void;

const numberParameter = (instruction: Instruction, name: string, fallback = 0) => {
  const value = instruction.parameters[name];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

export const CONDITION_HANDLERS: Readonly<Record<string, ConditionHandler>> = Object.freeze({
  "state.is": (instruction, state) => state.gameState === instruction.parameters.value,
  "input.received": (instruction, _state, signal) => signal.type === "input" && (!instruction.parameters.action || signal.action === instruction.parameters.action),
  "collision.overlap": (instruction, _state, signal) => {
    if (signal.type !== "collision") return false;
    const ids = instruction.references.filter(({ kind }) => kind === "object" || kind === "instance").map(({ id }) => id);
    return ids.length < 2 || (ids.includes(signal.sourceId) && ids.includes(signal.targetId));
  },
  "timer.elapsed": (instruction, _state, signal) => signal.type === "timer" && signal.id === instruction.parameters.id && signal.elapsedMs >= numberParameter(instruction, "minimumMs"),
  "variable.compare": (instruction, state) => {
    const id = String(instruction.parameters.id ?? "");
    const expected = instruction.parameters.value;
    const actual = state.variables[id];
    const operator = instruction.parameters.operator ?? "equals";
    if (operator === "greater-or-equal") return Number(actual) >= Number(expected);
    if (operator === "less-or-equal") return Number(actual) <= Number(expected);
    return actual === expected;
  },
});

export const ACTION_HANDLERS: Readonly<Record<string, ActionHandler>> = Object.freeze({
  "state.set": (instruction, state) => { state.gameState = String(instruction.parameters.value ?? state.gameState); },
  "variable.set": (instruction, state) => { state.variables[String(instruction.parameters.id)] = instruction.parameters.value; },
  "variable.add": (instruction, state) => {
    const id = String(instruction.parameters.id);
    state.variables[id] = Number(state.variables[id] ?? 0) + numberParameter(instruction, "value");
  },
  "entity.destroy": (instruction, state) => {
    instruction.references.filter(({ kind }) => kind === "instance" || kind === "object").forEach(({ id }) => {
      if (state.entities[id]) state.entities[id].active = false;
    });
  },
  "entity.spawn": (instruction, state) => {
    const reference = instruction.references.find(({ kind }) => kind === "instance" || kind === "object");
    if (reference) state.entities[reference.id] = { active: true, x: numberParameter(instruction, "x"), y: numberParameter(instruction, "y") };
  },
  "movement.apply": (instruction, state, signal) => {
    const reference = instruction.references.find(({ kind }) => kind === "instance" || kind === "object");
    if (!reference || signal.type !== "input" || !signal.direction) return;
    const entity = state.entities[reference.id];
    if (!entity?.active) return;
    const distance = numberParameter(instruction, "distance", 1);
    entity.x += signal.direction.x * distance;
    entity.y += signal.direction.y * distance;
  },
  "feedback.emit": (instruction, state) => { state.feedback.push({ type: String(instruction.parameters.type ?? "generic"), payload: { ...instruction.parameters } }); },
});

export function validateRegisteredRules(project: GameProjectV3): string[] {
  const errors: string[] = [];
  project.rules.forEach((rule) => {
    rule.when.forEach(({ type }) => { if (!CONDITION_HANDLERS[type]) errors.push(`${rule.id} 使用未登记条件：${type}`); });
    rule.then.forEach(({ type }) => { if (!ACTION_HANDLERS[type]) errors.push(`${rule.id} 使用未登记动作：${type}`); });
  });
  return errors;
}

export function executeRuleFrame(project: GameProjectV3, current: RuleRuntimeState, signal: RuntimeSignal): RuleRuntimeState {
  const state = structuredClone(current);
  for (const rule of project.rules) {
    if (!rule.enabled) continue;
    const matches = rule.when.every((instruction) => CONDITION_HANDLERS[instruction.type]?.(instruction, state, signal) ?? false);
    if (!matches) continue;
    rule.then.forEach((instruction) => ACTION_HANDLERS[instruction.type]?.(instruction, state, signal));
    state.triggeredRuleIds.push(rule.id);
  }
  return state;
}

export function createRuleRuntimeState(project: GameProjectV3): RuleRuntimeState {
  return {
    gameState: String(project.variables.find(({ id }) => id === "VARIABLE-GAME-STATE")?.initialValue ?? "idle"),
    variables: Object.fromEntries(project.variables.map(({ id, initialValue }) => [id, structuredClone(initialValue)])),
    entities: Object.fromEntries(project.scenes.flatMap(({ instances }) => instances.map(({ id, position }) => [id, { active: true, ...position }]))),
    feedback: [],
    triggeredRuleIds: [],
  };
}
