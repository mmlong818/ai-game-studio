// Help and practice never read or mutate the live board, energy or scores.
export function installGameHelp(getContext) {
  const I=window.StarI18n;
  const dialog = document.createElement('dialog');
  dialog.id = 'game-help-dialog';
  dialog.className = 'new-player-help';
  dialog.setAttribute('aria-labelledby', 'game-help-title');
  dialog.innerHTML = `<header><div><small id="game-help-progress"></small><h2 id="game-help-title"></h2></div><button type="button" id="game-help-close"></button></header><div id="game-help-content"></div><footer><button type="button" id="game-help-prev"></button><button type="button" id="game-help-next"></button></footer>`;
  document.body.append(dialog);
  const content = dialog.querySelector('#game-help-content');
  const previous = dialog.querySelector('#game-help-prev');
  const next = dialog.querySelector('#game-help-next');
  let step = 0, context, selected = null, practiced = false;
  const text = (tag, value, className = '') => {
    const node = document.createElement(tag); node.textContent = I.text(value); node.className = className; return node;
  };
  function paragraph(value) { content.append(text('p', value)); }
  function render() {
    const duel = context.mode === 'duel';
    const titles = ['helpBoardTitle', duel ? 'helpTilesTitle' : 'helpModeTitle', duel ? 'helpSkillsTitle' : 'helpHintTitle', 'helpPracticeTitle'];
    dialog.querySelector('#game-help-title').textContent=I.t(titles[step]);
    dialog.querySelector('#game-help-progress').textContent=`${I.t(context.mode==='duel'?'duel':context.mode==='solo'?'solo':'endless')} · ${step+1} / 4`;
    previous.disabled = step === 0;
    next.textContent=I.t(step===3?'returnGame':'next');
    content.replaceChildren();
    if (step === 0) {
      const zones = text('div', '', 'help-zones');
      zones.append(text('div', I.t(duel?'helpAiZone':'helpWholeBoard')), text('div', I.t(duel?'helpPlayerZone':'helpSwap')));
      content.append(zones);
      paragraph(I.t('helpMatch'));
      paragraph(I.t(duel?'helpDuelGoal':context.mode==='solo'?'helpSoloGoal':'helpEndlessGoal'));
    } else if (step === 1 && duel) {
      const cards = text('div', '', 'help-tile-cards');
      for (const [type, detail] of [
        ['star', 'helpStar'], ['heart', 'helpHeart'], ['drop', 'helpDrop'],
        ['flower', 'helpFlower'], ['moon', 'helpMoon'], ['cloud', 'helpCloud'],
      ]) {
        const card = text('div', '', 'help-tile-card');
        const image = document.createElement('img'); image.src = `./assets/tiles-v2/${type}.png`; image.alt = ''; image.width = 40; image.height = 40;
        card.append(image,text('strong',I.t(type)),text('span',I.t(detail)));cards.append(card);
      }
      content.append(cards);
      paragraph(I.t(context.level.allowSkills?'helpSkillsOpen':'helpSkillsLocked'));
    } else if (step === 2 && duel) {
      paragraph(I.t('helpCascade'));
      paragraph(I.t(context.level.allowExtraTurn?'helpExtraOpen':'helpExtraLocked'));
      paragraph(I.t(context.level.allowSkills?'helpButtonsOpen':'helpButtonsLocked'));
      const list = text('ul', '', 'help-skill-list');
      for (const key of ['helpTide','helpBloom','helpVeil']) list.append(text('li', I.t(key)));
      content.append(list);
    } else if (step === 1) {
      paragraph(I.t(context.mode==='solo'?'helpSoloRules':'helpEndlessRules'));
      paragraph(I.t('helpNoBattle'));
    } else if (step === 2) {
      paragraph(I.t('helpHintText'));
      paragraph(I.t('helpSave'));
    } else {
      paragraph(I.t('helpPractice'));
      const board = text('div', '', 'help-practice');
      const types = practiced ? ['star', 'star', 'star', 'heart', 'cloud', 'heart'] : ['star', 'cloud', 'star', 'heart', 'star', 'heart'];
      types.forEach((type, index) => {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.practice = String(index);
        button.setAttribute('aria-label',I.t('tile',{row:Math.floor(index/3)+1,col:index%3+1,tile:I.t(type)}));
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
          if(!practiced)dialog.querySelector('#help-practice-feedback').textContent=I.t('helpRetry');
        }); board.append(button);
      });
      content.append(board);
      const feedback = text('p', I.t(practiced?'helpSuccess':'helpInstruction'));
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
  function applyChrome(){const closeButton=dialog.querySelector('#game-help-close');closeButton.textContent=I.t('closeHelp');closeButton.setAttribute('aria-label',I.t('closeHelp'));previous.textContent=I.t('previous');}
  applyChrome();
  window.addEventListener('forge:locale-change',()=>{applyChrome();if(dialog.open&&context)render();});
  return { showFirstVisit() {
    const mode = getContext().mode;
    if (seen.has(mode)) return;
    try { if (localStorage.getItem(seenKey(mode)) === 'seen') return; } catch {}
    open();
  } };
}
