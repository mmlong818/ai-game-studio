/**
 * 引擎层 · 输入（服务端侧）：HUD 触控按钮（data-key）与键位表的生成。浏览器实现见 runtime/input.js。
 */

export type ControlButton = { key: string; label: string; ariaLabel: string; className?: string };

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** 生成 `<button type="button" data-key="…" [class] aria-label="…">label</button>` 序列（属性顺序固定，便于合同比对）。 */
export function controlButtonsHtml(buttons: readonly ControlButton[]): string {
  return buttons.map((button) => `<button type="button" data-key="${escapeHtml(button.key)}"${button.className ? ` class="${escapeHtml(button.className)}"` : ""} aria-label="${escapeHtml(button.ariaLabel)}">${escapeHtml(button.label)}</button>`).join("");
}

export function controlBarHtml(ariaLabel: string, buttons: readonly ControlButton[], className = "three-controls"): string {
  return `<div class="${escapeHtml(className)}" aria-label="${escapeHtml(ariaLabel)}">${controlButtonsHtml(buttons)}</div>`;
}

/** 四方向 + 跳跃的默认键位表（KeyboardEvent.code → 抽象动作）。 */
export const defaultGridKeyMap: Record<string, string | { action: string; always: boolean }> = {
  ArrowUp: "N", KeyW: "N", ArrowDown: "S", KeyS: "S", ArrowLeft: "W", KeyA: "W", ArrowRight: "E", KeyD: "E", Space: "jump",
  KeyP: { action: "pause", always: true },
};

export const defaultGridButtons: readonly ControlButton[] = [
  { key: "W", label: "←", ariaLabel: "向左" },
  { key: "N", label: "↑", ariaLabel: "向上" },
  { key: "S", label: "↓", ariaLabel: "向下" },
  { key: "E", label: "→", ariaLabel: "向右" },
  { key: "jump", label: "跃", ariaLabel: "跳跃", className: "engine-jump" },
];
