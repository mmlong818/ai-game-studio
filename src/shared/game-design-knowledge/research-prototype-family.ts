import { GAME_DESIGN_KNOWLEDGE_LIBRARY } from "./catalog.js";
import type { GameResearchTask } from "./research-queue.js";

export type ResearchPrototypeFamily = "spatial" | "matching" | "movement" | "economy" | "combat" | "generic";
export type ResearchPrototypeScenario = {
  family: ResearchPrototypeFamily;
  label: string;
  instruction: string;
  controls: Array<{ id: string; label: string }>;
  interactionSteps: string[];
};

const supported = new Set<ResearchPrototypeFamily>(["spatial", "matching", "movement", "economy", "combat"]);

export function resolveResearchPrototypeFamily(task: GameResearchTask): ResearchPrototypeFamily {
  if (!task.candidateDraft) return "generic";
  if (task.candidateDraft.kind === "mechanic") {
    const family = task.candidateDraft.artifact.family as ResearchPrototypeFamily;
    return supported.has(family) ? family : "generic";
  }
  for (const mechanicId of task.candidateDraft.artifact.coreMechanicIds) {
    const family = GAME_DESIGN_KNOWLEDGE_LIBRARY.mechanics.find(({ id }) => id === mechanicId)?.family as ResearchPrototypeFamily | undefined;
    if (family && supported.has(family)) return family;
  }
  return "generic";
}

export function createResearchPrototypeScenario(task: GameResearchTask): ResearchPrototypeScenario {
  const family = resolveResearchPrototypeFamily(task);
  const signalCount = Math.max(1, task.evaluation?.requiredProbeSignals.length ?? 1);
  if (family === "spatial") {
    const path = [5, 2, 1, 0, 3, 6, 7, 8, 5, 4];
    const steps = Array.from({ length: signalCount }, (_, index) => `cell-${path[index % path.length]}`);
    return { family, label: "相邻路径板", instruction: "从发光格开始，只选择上下左右相邻的格子。", controls: Array.from({ length: 9 }, (_, index) => ({ id: `cell-${index}`, label: `格子 ${index + 1}` })), interactionSteps: steps };
  }
  if (family === "matching") {
    const pairs = ["amber", "mint", "blue"];
    const steps = Array.from({ length: signalCount * 2 }, (_, index) => {
      const pair = pairs[Math.floor(index / 2) % pairs.length]!;
      return `token-${pair}-${index % 2}`;
    });
    return { family, label: "配对与连锁板", instruction: "连续选择两个同色符号，形成一次有效匹配。", controls: pairs.flatMap((pair) => [0, 1].map((index) => ({ id: `token-${pair}-${index}`, label: `${pair} ${index + 1}` }))), interactionSteps: steps };
  }
  if (family === "movement") {
    return { family, label: "路径移动板", instruction: "逐格向目标移动；每一步都必须来自可见方向控件。", controls: [{ id: "move-left", label: "向左" }, { id: "move-right", label: "向右" }], interactionSteps: Array.from({ length: signalCount }, () => "move-right") };
  }
  if (family === "economy") {
    const upgrades = ["focus", "power", "speed"];
    return { family, label: "有限预算板", instruction: "把有限资源分配给不同升级，观察预算和能力同步变化。", controls: upgrades.map((id) => ({ id: `upgrade-${id}`, label: `升级 ${id}` })), interactionSteps: Array.from({ length: signalCount }, (_, index) => `upgrade-${upgrades[index % upgrades.length]}`) };
  }
  if (family === "combat") {
    const targets = Array.from({ length: signalCount }, (_, index) => `target-${index}`);
    return { family, label: "目标与命中板", instruction: "选择目标并发射，每次合法命中推进一次战斗状态。", controls: targets.map((id, index) => ({ id, label: `目标 ${index + 1}` })), interactionSteps: targets };
  }
  return { family: "generic", label: "规则因果板", instruction: "按顺序触发每个可见动作，观察状态因果。", controls: Array.from({ length: signalCount }, (_, index) => ({ id: `action-${index}`, label: `动作 ${index + 1}` })), interactionSteps: Array.from({ length: signalCount }, (_, index) => `action-${index}`) };
}
