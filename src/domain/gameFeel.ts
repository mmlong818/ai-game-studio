import type { GameSpecV2, SceneNode } from "./platformTypes";

export function validateGameFeel(spec: GameSpecV2, scene: SceneNode[]): string[] {
  const errors: string[] = [];
  if (spec.intent.designPillars.length < 1 || spec.intent.designPillars.length > 3) {
    errors.push("必须声明 1–3 个核心爽点");
  }
  if (spec.actions.some((action) => action.feedback.length === 0)) errors.push("每个核心动作都必须有可观察反馈");
  const player = scene.find((node) => node.role === "player");
  if (!player) errors.push("缺少玩家操作对象");
  if (spec.source.selectedMechanicIds.includes("lane-dodge")) {
    if (player && player.size.width > 28) errors.push("玩家宽度超过安全路线的 28%，无法稳定躲避");
    const labels = spec.rules.map((rule) => rule.label).join("；");
    if (!/速度|巡航|冲刺/.test(labels)) errors.push("闪避玩法缺少可辨认的速度层次");
    if (!/安全通路|安全路线/.test(labels)) errors.push("程序生成没有声明安全通路");
    if (!/背景.*(滚动|移动|下移)/.test(labels)) errors.push("背景没有承担速度参照物作用");
  }
  return errors;
}
