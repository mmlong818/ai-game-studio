// Help and practice never read or mutate the live board, energy or scores.
export function installGameHelp(getContext) {
  const dialog = document.createElement('dialog');
  dialog.id = 'game-help-dialog';
  dialog.className = 'new-player-help';
  dialog.setAttribute('aria-labelledby', 'game-help-title');
  dialog.innerHTML = `<header><div><small id="game-help-progress"></small><h2 id="game-help-title">新手帮助</h2></div><button type="button" id="game-help-close" aria-label="关闭新手帮助">关闭</button></header><div id="game-help-content"></div><footer><button type="button" id="game-help-prev">上一页</button><button type="button" id="game-help-next">下一页</button></footer>`;
  document.body.append(dialog);
  const content = dialog.querySelector('#game-help-content');
  const previous = dialog.querySelector('#game-help-prev');
  const next = dialog.querySelector('#game-help-next');
  let step = 0, context, selected = null, practiced = false;
  const text = (tag, value, className = '') => {
    const node = document.createElement(tag); node.textContent = value; node.className = className; return node;
  };
  function paragraph(value) { content.append(text('p', value)); }
  function render() {
    const duel = context.mode === 'duel';
    const titles = ['先认识你的棋盘', duel ? '六种棋子，各有作用' : '这一局怎么玩', duel ? '回合与技能，怎么看' : '随时提示，安心继续', '动手试一次'];
    dialog.querySelector('#game-help-title').textContent = titles[step];
    dialog.querySelector('#game-help-progress').textContent = `${duel ? '对战' : context.mode === 'solo' ? '单人闯关' : '无限休闲'} · ${step + 1} / 4`;
    previous.disabled = step === 0;
    next.textContent = step === 3 ? '返回游戏' : '下一页';
    content.replaceChildren();
    if (step === 0) {
      const zones = text('div', '', 'help-zones');
      zones.append(text('div', duel ? '露娜操作上半区' : '整张棋盘都能操作'), text('div', duel ? '你操作下半区' : '点击两枚相邻棋子，或滑动交换'));
      content.append(zones);
      paragraph('把相邻的两枚棋子交换，横向或竖向凑成三个相同图案即可消除。没有形成消除会自动换回，可放心尝试。');
      paragraph(duel ? '目标是把露娜的生命降到 0。上半区可以观察，但不能操作；不要跨越中线交换。' : context.mode === 'solo' ? '按上方目标收集棋子，在步数用完前收满即可通关。无效交换不扣步。' : '没有目标、倒计时和步数上限。想玩多久都可以，也没有对手。');
    } else if (step === 1 && duel) {
      const cards = text('div', '', 'help-tile-cards');
      for (const [type, label, detail] of [
        ['star', '星星', '消除后攻击对方'], ['heart', '爱心', '恢复行动者的生命，不超过上限'],
        ['drop', '水滴', '为潮汐换位充能'], ['flower', '花朵', '为绽放复苏充能'],
        ['moon', '月光', '为月幕护盾充能'], ['cloud', '云朵', '同时为三种技能少量充能'],
      ]) {
        const card = text('div', '', 'help-tile-card');
        const image = document.createElement('img'); image.src = `./assets/tiles-v2/${type}.png`; image.alt = ''; image.width = 40; image.height = 40;
        card.append(image, text('strong', label), text('span', detail)); cards.append(card);
      }
      content.append(cards);
      paragraph(context.level.allowSkills ? '本关技能已开放：水滴/花朵/月光每枚充能 2 点，云朵给每种能量各加 1 点。' : '前四关双方技能都未开放，先学星星攻击与爱心恢复；第 5 关起才积攒技能能量。');
    } else if (step === 2 && duel) {
      paragraph('连消归谁？谁交换触发，整段连消就归谁。即使爱心落在你的半区，由露娜触发也会给露娜回血。当前规则还会给第二段起的连消附加少量恢复，即使那段没有爱心；双方规则相同。');
      paragraph(context.level.allowExtraTurn ? '本关四连可保留行动权，最多连续额外行动两次；否则消除结束后轮到对方。' : '本关消除结束后轮到对方；第 3 关起开放四连续行。');
      paragraph(context.level.allowSkills ? '本关技能已开放。按钮灰色通常是能量不足或还没轮到你；玩家要点击技能，露娜由 AI 决定是否使用。双方从零能量起步、消耗一致，各自靠消除积攒。' : '本关双方都不能用技能，按钮变灰不是故障。第 5 关起双方一起开放。');
      const list = text('ul', '', 'help-skill-list');
      for (const line of ['潮汐换位：8 点水能量，再选下半区任意两枚棋子，必须形成消除。', '绽放复苏：10 点花能量，最多恢复 9 点生命，下一次星击 +6。露娜低于 66% 生命且能量足够时会考虑使用。', '月幕：10 点月能量，增加 20 点护盾，先抵扣伤害；护盾最多 40 点。']) list.append(text('li', line));
      content.append(list);
    } else if (step === 1) {
      paragraph(context.mode === 'solo' ? '只看本关列出的目标颜色。每次有效交换消耗一步，同一次交换产生的连消也全部计入收集；最后一步刚好收满，仍算胜利。' : '所有颜色都可以消除，不需要刻意收集某一种。棋盘无可用交换时会自动重排，你可以继续玩。');
      paragraph('单人闯关和无限休闲都没有战斗生命、技能或 AI。棋子颜色用来配对，不会触发对战中的攻击与恢复。');
    } else if (step === 2) {
      paragraph('找不到交换位置时，点“给我提示”。提示免费，不扣步、不降低星级；它只标出一组可交换棋子，仍由你自己操作。');
      paragraph('本局在可操作时自动保存。返回菜单或刷新后，选择同一种玩法继续；三种玩法的进度互不覆盖。');
    } else {
      paragraph('这是一张独立练习棋盘，不影响正式对局。交换中间的云朵和它下方的星星，让第一行变成三颗星。');
      const board = text('div', '', 'help-practice');
      const types = practiced ? ['star', 'star', 'star', 'heart', 'cloud', 'heart'] : ['star', 'cloud', 'star', 'heart', 'star', 'heart'];
      types.forEach((type, index) => {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.practice = String(index);
        button.setAttribute('aria-label', `练习第 ${Math.floor(index / 3) + 1} 行第 ${index % 3 + 1} 列${{star:'星星',cloud:'云朵',heart:'爱心'}[type]}`);
        button.setAttribute('aria-pressed', String(selected === index)); button.disabled = practiced;
        const image = document.createElement('img'); image.src = `./assets/tiles-v2/${type}.png`; image.alt = ''; button.append(image);
        button.addEventListener('click', () => {
          if (selected === null) { selected = index; render(); content.querySelector(`[data-practice="${index}"]`).focus(); return; }
          if ((selected === 1 && index === 4) || (selected === 4 && index === 1)) {
            practiced = true;
            try { localStorage.setItem(`star-dream-duel:help:${context.mode}:v1`, 'completed'); } catch {}
          }
          selected = null; render();
          if (practiced) next.focus();
          else content.querySelector('[data-practice="1"]').focus();
          if (!practiced) dialog.querySelector('#help-practice-feedback').textContent = '再试一次：先点第一行中间的云朵，再点它下方的星星。';
        }); board.append(button);
      });
      content.append(board);
      const feedback = text('p', practiced ? '✓ 三星连成一行！你已学会基本交换，回到游戏试试吧。' : '先点云朵，再点它下方的星星。');
      feedback.id = 'help-practice-feedback'; feedback.setAttribute('role', 'status'); content.append(feedback);
    }
  }
  function close() { dialog.close(); }
  const seen = new Set();
  const seenKey = mode => `star-dream-duel:help-seen:${mode}:v1`;
  dialog.addEventListener('close', () => {
    if (!context) return;
    seen.add(context.mode);
    try { localStorage.setItem(seenKey(context.mode), 'seen'); } catch {}
  });
  dialog.querySelector('#game-help-close').addEventListener('click', close);
  previous.addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
  next.addEventListener('click', () => { if (step === 3) close(); else { step += 1; render(); } });
  function open() {
    if (dialog.open) return;
    context = getContext(); step = 0; selected = null; practiced = false; render(); dialog.showModal();
  }
  for (const button of document.querySelectorAll('[data-open-game-help]')) button.addEventListener('click', open);
  return { showFirstVisit() {
    const mode = getContext().mode;
    if (seen.has(mode)) return;
    try { if (localStorage.getItem(seenKey(mode)) === 'seen') return; } catch {}
    open();
  } };
}
