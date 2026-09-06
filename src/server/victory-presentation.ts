/** Self-contained presentation, embedded in each generated game. No storage or reward writes. */
export const victoryPresentationScript = String.raw`
function renderVictorySummary(host, beforeNode, result) {
  host.querySelector('[data-victory-summary]')?.remove();
  const stars = Math.max(1, Math.min(3, Math.floor(Number(result.stars) || 1)));
  const previous = Math.max(0, Math.min(3, Number(result.previous) || 0));
  const gained = Math.max(0, stars - previous);
  const panel = document.createElement('section');
  panel.className = 'victory-summary';
  panel.dataset.victorySummary = String(result.level.number);
  panel.setAttribute('aria-label', '本关成果');
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  panel.append(node('div', 'victory-ribbon', previous === 0 ? '首次通关' : gained ? '突破个人最佳' : '再次完成挑战'));
  const medals = node('div', 'victory-medals');
  medals.setAttribute('role', 'img');
  medals.setAttribute('aria-label', '本关获得 ' + stars + ' 颗星，历史最佳 ' + Math.max(previous, stars) + ' 颗星');
  for (let index = 0; index < 3; index += 1) {
    const medal = node('b', 'victory-medal' + (index < stars ? ' is-earned' : ''), index < stars ? '★' : '☆');
    medal.style.setProperty('--medal-order', String(index));
    medal.setAttribute('aria-hidden', 'true');
    medals.append(medal);
  }
  panel.append(medals);
  panel.append(node('div', 'victory-level', result.level.name || result.level.label || ('第 ' + result.level.number + ' 关')));
  const achievements = node('ul', 'victory-achievements');
  achievements.append(node('li', 'is-achieved', '✓ 完成本关目标'));
  (result.checks || []).slice(0, 2).forEach((check) => {
    achievements.append(node('li', check.passed ? 'is-achieved' : 'is-challenge', (check.passed ? '✓ ' : '○ 下次挑战：') + check.label));
  });
  panel.append(achievements);
  panel.append(node('div', 'victory-reward', gained ? '收藏新增 +' + gained + ' 星章' : '已保留本关最佳成绩'));
  const total = Math.max(0, Math.floor(Number(result.total) || 0));
  const maximum = Math.max(3, Number(result.maximum) || 3);
  const progress = node('progress', 'victory-progress');
  progress.max = maximum; progress.value = Math.min(maximum, total);
  progress.setAttribute('aria-label', '本游戏星章收藏 ' + total + ' / ' + maximum);
  panel.append(progress, node('div', 'victory-collection', '本游戏收藏 ' + total + ' / ' + maximum + ' 星章'));
  panel.append(node('div', 'victory-next', result.next
    ? '下一关 · ' + (result.next.name || result.next.label || result.next.tierLabel || result.next.number) + ' — ' + (result.next.mission || result.next.ruleModifier || '继续新的挑战')
    : '全部关卡已完成 · 可以重玩喜欢的关卡，完善星章收藏'));
  panel.addEventListener('pointerdown', () => panel.classList.add('is-settled'), { once: true });
  host.insertBefore(panel, beforeNode);
}
window.addEventListener('game:state-change', (event) => {
  if (!['won', 'stage-complete'].includes(event.detail?.state)) {
    document.querySelectorAll('[data-victory-summary]').forEach((panel) => panel.remove());
  }
});
`;

export const victoryPresentationStyles = String.raw`
.victory-summary{--victory-gold:#ffc95b;--victory-ink:var(--theme-text,#f3f4f8);--victory-muted:var(--theme-muted,#bac6dc);color:var(--victory-ink);margin:12px 0 18px;text-align:center;font-family:inherit}
.victory-summary .victory-ribbon{font-size:12px;font-weight:800;letter-spacing:.1em;color:var(--theme-accent,#98a9ff)}
.victory-summary .victory-medals{display:flex;justify-content:center;align-items:center;gap:18px;height:84px}
.victory-summary .victory-medal{display:block;font:48px/1 Georgia,serif;color:var(--victory-muted);opacity:.35}
.victory-summary .victory-medal.is-earned{opacity:1;color:var(--victory-gold);text-shadow:0 3px 0 #a96b24,0 7px 18px #ffc95b38;animation:victory-stamp .48s cubic-bezier(.2,.8,.2,1.2) both;animation-delay:calc(var(--medal-order)*.13s)}
.victory-summary .victory-medal:nth-child(2){font-size:62px}
.victory-summary .victory-level{font-size:15px;font-weight:800;margin-bottom:10px}
.victory-summary .victory-achievements{list-style:none;padding:0;margin:0;display:grid;gap:6px;text-align:left;font-size:12px;line-height:1.5}
.victory-summary .is-challenge{color:var(--victory-muted)}
.victory-summary .victory-reward{margin:12px 0 6px;font-size:14px;font-weight:800}
.victory-summary .victory-progress{width:100%;height:7px;accent-color:var(--theme-accent,#98a9ff);display:block}
.victory-summary .victory-collection{font:11px/1.5 ui-monospace,Consolas,monospace;margin-top:5px;color:var(--victory-muted)}
.victory-summary .victory-next{font-size:12px;line-height:1.5;text-align:left;margin-top:12px;padding-top:10px;border-top:1px solid var(--theme-line,#566382);overflow-wrap:anywhere}
body:is([data-game-state=won],[data-game-state=stage-complete]) .game-overlay{max-height:calc(100dvh - 32px);overflow-y:auto;overscroll-behavior:contain}
body:is([data-game-state=won],[data-game-state=stage-complete]) .game-overlay h2{margin-top:12px;font-size:clamp(22px,4vw,30px)}
body:is([data-game-state=won],[data-game-state=stage-complete]) .game-overlay>p{margin-bottom:8px}
body:is([data-game-state=won],[data-game-state=stage-complete]) .game-overlay>:not(h2):not(p):not(.victory-summary):not(#start){display:none}
body:is([data-game-state=won],[data-game-state=stage-complete],[data-game-state=lost]) .onboarding-coach{display:none}
.victory-summary.is-settled .victory-medal{animation:none}
@keyframes victory-stamp{from{opacity:0;transform:translateY(-12px) scale(1.6) rotate(-12deg)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.victory-summary .victory-medal{animation:none!important}}
@media(max-height:650px){.victory-summary{margin:6px 0 10px}.victory-summary .victory-medals{height:58px}.victory-summary .victory-medal{font-size:36px}.victory-summary .victory-medal:nth-child(2){font-size:46px}.victory-summary .victory-next{margin-top:7px;padding-top:6px}}
`;
