import { beforeEach, describe, expect, it } from "vitest";
import { victoryPresentationScript } from "./victory-presentation.js";

const render = new Function(victoryPresentationScript + '; return renderVictorySummary;')() as (host: HTMLElement, before: HTMLElement, result: object) => void;
const result = { level: { number: 3, name: "余白四格" }, stars: 2, previous: 1, total: 7, maximum: 60, checks: [{ label: "保留六个空格", passed: true }, { label: "不使用回溯", passed: false }], next: { number: 4, name: "六十四结点", mission: "合成 64" } };
function mount(data = result) {
  const host = document.createElement('div');
  const button = document.createElement('button');
  button.textContent = '下一关'; host.append(button); document.body.append(host);
  render(host, button, data);
  return { host, button };
}
beforeEach(() => { document.body.replaceChildren(); });
describe('胜利成果卡', () => {
  it('展示真实星级、进步和下一关，原有按钮仍可立即操作', () => {
    const { host, button } = mount();
    expect(host.textContent).toContain('收藏新增 +1 星章');
    expect(host.querySelectorAll('.is-earned')).toHaveLength(2);
    expect(host.textContent).toContain('下次挑战：不使用回溯');
    expect(host.textContent).toContain('六十四结点');
    expect(button.disabled).toBe(false);
  });
  it('重复成绩无新增奖励，重复渲染不叠加面板', () => {
    const { host, button } = mount({ ...result, previous: 3 });
    render(host, button, { ...result, previous: 3 });
    expect(host.textContent).toContain('已保留本关最佳成绩');
    expect(host.querySelectorAll('[data-victory-summary]')).toHaveLength(1);
  });
  it('进入新关或失败时清理旧成果', () => {
    mount();
    window.dispatchEvent(new CustomEvent('game:state-change', { detail: { state: 'playing' } }));
    expect(document.querySelector('[data-victory-summary]')).toBeNull();
  });
  it('文本按文字显示，各实例使用自己的成绩', () => {
    const a = mount({ ...result, level: { number: 1, name: '<img src=x onerror=alert(1)>' } });
    const b = mount({ ...result, previous: 3 });
    expect(a.host.querySelector('img')).toBeNull();
    expect(a.host.textContent).toContain('新增 +1');
    expect(b.host.textContent).not.toContain('新增');
  });
});
