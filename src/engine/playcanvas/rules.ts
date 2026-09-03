/**
 * 引擎层 · 规则桥（服务端侧）。条件 / 动作登记表复用 src/shared/rules；这里只补 3D 运行时的支持范围与静态校验。
 * 浏览器实现见 runtime/rules.js。
 */
import type { GameProjectV3 } from "../../shared/project-schema/index.js";
import { ACTION_HANDLERS, CONDITION_HANDLERS, validateRegisteredRules } from "../../shared/rules/index.js";

/** 引擎事件总线 → 规则信号的映射。 */
export const ENGINE_RULE_SIGNALS = Object.freeze({
  collision: "行为（pickup / beat-mover）在玩家与目标同格时发出；sourceId/targetId 为对象 id，另附 sourceInstanceId/targetInstanceId",
  input: "输入控制器把抽象动作转发为 { action }；movement.apply 需要 direction:{x,y}（y 映射到世界 Z）",
  timer: "游戏循环按需发出 { id, elapsedMs }",
});

export const ENGINE_SUPPORTED_CONDITIONS = Object.freeze(Object.keys(CONDITION_HANDLERS));
export const ENGINE_SUPPORTED_ACTIONS = Object.freeze(Object.keys(ACTION_HANDLERS));

export function validateEngineRules(project: GameProjectV3): string[] {
  return validateRegisteredRules(project);
}
