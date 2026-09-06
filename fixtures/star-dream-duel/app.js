import {
  MAX_STARTING_SCORE,
  MIN_STARTING_SCORE,
  SCORE_STEP,
  STARTING_SCORE,
  TACTICAL_RULE_VERSION,
  HEALING_MULTIPLIER,
  SKILL_COSTS,
  canUseBattleSkill,
  applyAttack,
  calculateTacticalEffects,
  canOwnerSwap,
  chooseTacticalAiMove,
  createSpecialFromGroups,
  createBoard,
  createSeededRng,
  expandSpecialMatches,
  findMatchGroups,
  findMatches,
  findValidMoves,
  isAdjacent,
  normalizeStartingScore,
  prismSwapTargets,
  removeAndCollapse,
  reshuffleBattleBoard,
  swapTiles,
  tileBase,
  tileSpecial,
} from './game-core.js?v=10';
import { SOLO_LEVELS, createSoloProgress, collectSolo, soloOutcome, soloStars } from './solo-mode.js?v=8';
import { installGameHelp } from './new-player-help.js?v=15';

const TILE_ART = {
  moon: './assets/tiles-v2/moon.png',
  cloud: './assets/tiles-v2/cloud.png',
  star: './assets/tiles-v2/star.png',
  flower: './assets/tiles-v2/flower.png',
  heart: './assets/tiles-v2/heart.png',
  drop: './assets/tiles-v2/drop.png'
};
const TILE_LABEL = { moon: '月光', cloud: '云朵', star: '星星', flower: '花朵', heart: '爱心', drop: '水滴' };

const CAMPAIGN_STORAGE_KEY = 'star-dream-duel:campaign:v2';
const DUEL_SESSION_KEY = 'star-dream-duel:session:v3';
const CAMPAIGN_CHAPTERS = ['星击入门', '三相充能', '构形反击', '封锁博弈', '月蚀决胜'];
const LEVEL_BLUEPRINTS = [
  ['初见星痕', '用星星造成第一次伤害', 100, 'balanced'],
  ['心光回响', '在受伤后用爱心恢复生命', 100, 'balanced'],
  ['四星续行', '完成四连并获得额外回合', 110, 'tempo'],
  ['边界攻防', '跨越分区观察完整连消', 110, 'balanced'],
  ['潮汐初醒', '积攒水滴能量并读取技能收益', 120, 'tide'],
  ['绽放复苏', '使用绽放恢复并强化下一击', 120, 'bloom'],
  ['月幕守护', '用护盾吸收露娜的星击', 130, 'veil'],
  ['三相抉择', '在进攻、恢复和充能之间取舍', 130, 'balanced'],
  ['横贯星轨', '制造横向四连并保留先手', 140, 'tempo'],
  ['纵落星轨', '制造纵向四连改变落子结构', 140, 'tempo'],
  ['新星交汇', '利用交叉消除扩大收益', 150, 'shape'],
  ['棱镜前夜', '争夺五连与连续行动', 150, 'shape'],
  ['雾门试探', '识别低收益交换留下的反击口', 160, 'deny'],
  ['潮锁反制', '用充能路线破坏露娜的准备', 160, 'tide'],
  ['护幕消耗', '先破盾再完成致命星击', 170, 'veil'],
  ['双层预判', '预判露娜回应后再选择走法', 170, 'deny'],
  ['月蚀猎手', '迎战偏好直接进攻的露娜', 180, 'attack'],
  ['繁花守卫', '迎战善于恢复与拖延的露娜', 180, 'bloom'],
  ['潮汐策士', '迎战会为下一回合布局的露娜', 190, 'tide'],
  ['终局星冕', '在完整规则下赢得最终对决', 200, 'master'],
];
const BLOCKER_LAYOUTS = [
  [{ row: 2, col: 3 }, { row: 5, col: 4 }],
  [{ row: 1, col: 2 }, { row: 2, col: 5 }, { row: 5, col: 2 }, { row: 6, col: 5 }],
  [{ row: 2, col: 1 }, { row: 2, col: 6 }, { row: 5, col: 1 }, { row: 5, col: 6 }],
  [{ row: 1, col: 3 }, { row: 2, col: 4 }, { row: 5, col: 3 }, { row: 6, col: 4 }],
  [{ row: 1, col: 1 }, { row: 2, col: 6 }, { row: 5, col: 6 }, { row: 6, col: 1 }],
  [{ row: 1, col: 4 }, { row: 2, col: 3 }, { row: 5, col: 4 }, { row: 6, col: 3 }],
  [{ row: 1, col: 2 }, { row: 1, col: 5 }, { row: 6, col: 2 }, { row: 6, col: 5 }],
  [{ row: 1, col: 3 }, { row: 2, col: 1 }, { row: 2, col: 6 }, { row: 5, col: 1 }, { row: 5, col: 6 }, { row: 6, col: 4 }],
];
const CAMPAIGN_LEVELS = LEVEL_BLUEPRINTS.map(([name, mission, startingScore, opponentStyle], index) => {
  const tier = Math.floor(index / 4) + 1;
  return {
    number: index + 1,
    name,
    mission,
    rule: name,
    tier,
    tierLabel: CAMPAIGN_CHAPTERS[tier - 1],
    startingScore,
    opponentStyle,
    allowExtraTurn: index >= 2,
    allowSkills: index >= 4,
    allowShapes: index >= 8,
    blockers: index >= 12 ? BLOCKER_LAYOUTS[index - 12] : [],
    aiLookahead: index >= 15 ? 2 : 1,
    playerDamageMultiplier: 1,
    aiDamageMultiplier: [0.88, 0.94, 1, 1.05, 1.1][tier - 1],
    seed: 0x5f3759df ^ Math.imul(index + 1, 0x9e3779b1),
  };
});

const boardElement = document.querySelector('#board');
const aiScoreElement = document.querySelector('#ai-score');
const playerScoreElement = document.querySelector('#player-score');
const aiScoreBar = document.querySelector('#ai-score-bar');
const playerScoreBar = document.querySelector('#player-score-bar');
const roundCurrent = document.querySelector('#round-current');
const turnText = document.querySelector('#turn-text');
const turnBanner = document.querySelector('#turn-banner');
const thinkingDots = document.querySelector('#thinking-dots');
const boardToast = document.querySelector('#board-toast');
const battleLogList = document.querySelector('#battle-log-list');
const damageSummary = document.querySelector('#damage-summary');
const hintButton = document.querySelector('#hint-button');
const soundToggle = document.querySelector('#sound-toggle');
const soundToggleLabel = document.querySelector('#sound-toggle-label');
const installButton = document.querySelector('#install-app');
const resultModal = document.querySelector('#result-modal');
const fxLayer = document.querySelector('#fx-layer');
const gameRoot = document.querySelector('.game');
const setupModal = document.querySelector('#setup-modal');
const scoreRange = document.querySelector('#score-range');
const scoreMinus = document.querySelector('#score-minus');
const scorePlus = document.querySelector('#score-plus');
const setupScoreValue = document.querySelector('#setup-score-value');
const setupStartScore = document.querySelector('#setup-start-score');
const setupStart = document.querySelector('#setup-start');
const campaignSelect = document.querySelector('#campaign-level');
const campaignProgress = document.querySelector('#campaign-progress');
const aiDifficultySelect = document.querySelector('#ai-difficulty');
const resourceElements = {
  player: {
    shield: document.querySelector('#player-shield'), tide: document.querySelector('#player-tide'),
    bloom: document.querySelector('#player-bloom'), veil: document.querySelector('#player-veil'),
  },
  ai: {
    shield: document.querySelector('#ai-shield'), tide: document.querySelector('#ai-tide'),
    bloom: document.querySelector('#ai-bloom'), veil: document.querySelector('#ai-veil'),
  },
};
const skillButtons = [...document.querySelectorAll('[data-skill]')];

let state;
let rng;
let gameVersion = 0;
let toastTimer;
let audioContext;
let soundEnabled = true;
let selectedStartingScore = STARTING_SCORE;
let deferredInstallPrompt;
let pointerGesture;
let suppressClickUntil = 0;
let campaignLevelIndex = 0;
let campaignMaxUnlocked = 0;
let aiDifficulty = 'standard';
let duelStep = 'player-ready';
let gameMode = 'solo';
let soloMastery = {};
let gameHelp;
const modeButtons = [...document.querySelectorAll('button[data-game-mode]')];
const isEndless = () => gameMode === 'endless';
const isSolo = () => gameMode === 'solo' || isEndless();
const ENDLESS_LEVEL = { ...SOLO_LEVELS[0], name: '无限休闲', tierLabel: '自由消除', mission: '', targets: {}, moves: null };
const activeLevels = () => isEndless() ? [ENDLESS_LEVEL] : isSolo() ? SOLO_LEVELS : CAMPAIGN_LEVELS;
const campaignKey = () => isEndless() ? 'star-dream-duel:endless:campaign:v1' : isSolo() ? 'star-dream-duel:solo:campaign:v1' : CAMPAIGN_STORAGE_KEY;
const sessionKey = () => isEndless() ? 'star-dream-duel:endless:session:v1' : isSolo() ? 'star-dream-duel:solo:session:v1' : DUEL_SESSION_KEY;
const playerOwner = () => isSolo() ? 'solo' : 'player';

function switchMode(mode) {
  if (!['solo', 'duel', 'endless'].includes(mode)) return;
  gameVersion += 1;
  gameMode = mode;
  modeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.gameMode === mode)));
  document.body.dataset.gameMode = mode;
  loadCampaignProgress();
  openSetup();
}

function currentCampaignLevel() {
  return activeLevels()[campaignLevelIndex];
}

function saveCampaignProgress() {
  try {
    localStorage.setItem(campaignKey(), JSON.stringify({ current: campaignLevelIndex, maxUnlocked: campaignMaxUnlocked, mastery: soloMastery }));
  } catch {}
}

function loadCampaignProgress() {
  if (isEndless()) { campaignLevelIndex = 0; campaignMaxUnlocked = 0; soloMastery = {}; return; }
  try {
    const saved = JSON.parse(localStorage.getItem(campaignKey()) || 'null');
    soloMastery = saved?.mastery && typeof saved.mastery === 'object' ? saved.mastery : {};
    campaignMaxUnlocked = Math.max(0, Math.min(19, Number(saved?.maxUnlocked) || 0));
    campaignLevelIndex = Math.max(0, Math.min(campaignMaxUnlocked, Number(saved?.current) || 0));
  } catch {
    soloMastery = {};
    campaignLevelIndex = 0;
    campaignMaxUnlocked = 0;
  }
}

function syncCampaignUi() {
  const level = currentCampaignLevel();
  campaignSelect.replaceChildren(...activeLevels().map((item, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${String(item.number).padStart(2, '0')} · ${item.tierLabel} · ${item.name}`;
    option.disabled = index > campaignMaxUnlocked;
    option.selected = index === campaignLevelIndex;
    return option;
  }));
  campaignProgress.textContent = `第 ${level.number} / 20 关 · ${level.tierLabel} · ${level.mission}`;
  document.body.dataset.campaignCurrentLevel = String(level.number);
  document.body.dataset.gameMode = gameMode;
  document.querySelector('#setup-description').textContent = isSolo()
    ? '独自探索整张棋盘。交换相邻棋子凑成三个，收集目标即可过关；没有计时，也没有对手。'
    : '你和露娜共用一张棋盘，各自控制一半区域。不同棋子承担攻击、恢复和充能职责。';
  document.querySelector('#solo-start-label').hidden = !isSolo();
  document.querySelector('#duel-start-label').hidden = isSolo();
  document.querySelector('#result-eyebrow').textContent = isSolo() ? '星梦收藏册' : '对战成果';
  if (isEndless()) document.querySelector('#setup-description').textContent = '没有目标、没有步数和时间限制。自由交换整张棋盘，享受消除与连锁；随时离开，下次继续。';
  document.querySelector('#solo-start-label').textContent = isEndless() ? '进入无限休闲' : '开始收集星光';
}

function setCampaignLevel(levelNumber, allowLocked = false) {
  if (isEndless()) return;
  const requested = Math.max(0, Math.min(19, Number(levelNumber) - 1));
  campaignLevelIndex = allowLocked ? requested : Math.min(requested, campaignMaxUnlocked);
  if (allowLocked) campaignMaxUnlocked = Math.max(campaignMaxUnlocked, requested);
  selectedStartingScore = currentCampaignLevel().startingScore;
  saveCampaignProgress();
  syncCampaignUi();
  updateScorePicker(selectedStartingScore);
}

function setSessionState(nextState) {
  document.body.dataset.gameState = nextState;
  document.body.dataset.running = String(nextState === 'playing');
  window.dispatchEvent(new CustomEvent('game:state-change', { detail: { state: nextState } }));
}

function saveDuelSession() {
  if (!state || state.phase !== 'player' || document.body.dataset.gameState !== 'playing') return;
  try {
    localStorage.setItem(sessionKey(), JSON.stringify({ schemaVersion: 3, mode: gameMode, rngState: rng.getState(), level: currentCampaignLevel().number, aiDifficulty, state, updatedAt: Date.now() }));
  } catch {}
}

function restoreDuelSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(sessionKey()) || 'null');
    if (isSolo() && (saved?.mode !== gameMode || saved?.state?.solo?.version !== 1)) return false;
    if (!saved || saved.schemaVersion !== 3 || saved.level !== currentCampaignLevel().number || saved.aiDifficulty !== aiDifficulty || saved.state?.phase !== 'player') return false;
    state = saved.state;
    if (Number.isInteger(saved.rngState)) rng.setState(saved.rngState);
    state.selected = null;
    state.skillMode = null;
    duelStep = 'player-ready';
    return true;
  } catch { return false; }
}

function clearDuelSession() {
  try { localStorage.removeItem(sessionKey()); } catch {}
}

function formatScore(score) {
  return new Intl.NumberFormat('zh-CN').format(score);
}

function wait(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function positionKey(position) {
  return `${position.row}:${position.col}`;
}

function renderBoard() {
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < state.board.length; row += 1) {
    for (let col = 0; col < state.board[row].length; col += 1) {
      const rawTile = state.board[row][col];
      const type = tileBase(rawTile);
      const special = tileSpecial(rawTile);
      const blocker = rawTile === 'blocker';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `tile ${blocker ? 'tile--blocker' : `tile--${type}`}${special ? ` tile--special tile--special-${special}` : ''}`;
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.dataset.position = `${row}:${col}`;
      button.setAttribute('role', 'gridcell');
      const specialLabel = { row: '横向星轨', column: '纵向星轨', nova: '新星', prism: '棱镜' }[special] ?? '';
      button.setAttribute('aria-label', `${row < 4 ? 'AI 区' : '玩家区'}第 ${row + 1} 行第 ${col + 1} 列${blocker ? '封印障碍' : specialLabel || TILE_LABEL[type]}棋子`);
      button.disabled = blocker || (!isSolo() && row < 4) || state.phase !== 'player';
      if (isSolo()) button.setAttribute('aria-label', `第 ${row + 1} 行第 ${col + 1} 列${TILE_LABEL[type]}棋子`);
      const artType = type === 'prism' ? 'star' : blocker ? 'moon' : type;
      button.innerHTML = `<span class="tile__face"><img src="${TILE_ART[artType]}" alt="" width="512" height="512" draggable="false"></span>${blocker ? '<i class="tile__blocker-mark" aria-hidden="true">×</i>' : ''}${special ? `<i class="tile__special-mark" aria-hidden="true">${{ row: '↔', column: '↕', nova: '✦', prism: '◇' }[special]}</i>` : ''}`;
      if (state.selected && state.selected.row === row && state.selected.col === col) {
        button.classList.add('is-selected');
        button.setAttribute('aria-pressed', 'true');
      }
      fragment.append(button);
    }
  }
  boardElement.replaceChildren(fragment);
}

function setScoreDisplay(element, bar, value) {
  element.value = formatScore(value);
  element.textContent = formatScore(value);
  bar.style.width = `${Math.max(0, value / state.startingScore) * 100}%`;
}

function actorEnergy(actor) {
  return actor === 'player' ? state.playerEnergy : state.aiEnergy;
}

function actorShield(actor) {
  return actor === 'player' ? state.playerShield : state.aiShield;
}

function renderResources() {
  if (!state) return;
  for (const actor of ['player', 'ai']) {
    const energy = actorEnergy(actor);
    resourceElements[actor].shield.textContent = String(actorShield(actor) ?? 0);
    resourceElements[actor].tide.textContent = String(energy?.tide ?? 0);
    resourceElements[actor].bloom.textContent = String(energy?.bloom ?? 0);
    resourceElements[actor].veil.textContent = String(energy?.veil ?? 0);
  }
  for (const button of skillButtons) {
    const skill = button.dataset.skill;
    document.querySelector(`#skill-${skill}-value`).textContent = String(state.playerEnergy?.[skill] ?? 0);
    const available = canUseBattleSkill(currentCampaignLevel(), state, 'player', skill);
    button.disabled = !available;
    button.classList.toggle('is-armed', state.skillMode === skill);
  }
}

function renderStatus() {
  document.querySelector('#play-help').disabled = state.phase !== 'player';
  if (isEndless()) { hintButton.disabled = state.phase !== 'player'; return; }
  if (isSolo() && state.solo) {
    const level = currentCampaignLevel();
    document.querySelector('#solo-moves').textContent = String(state.solo.movesLeft);
    document.querySelector('#solo-targets').replaceChildren(...Object.entries(level.targets).map(([type, target]) => {
      const item = document.createElement('span');
      const count = Math.min(target, state.solo.collected[type] || 0);
      item.textContent = `${TILE_LABEL[type]} ${count} / ${target}${count >= target ? ' ✓' : ''}`;
      return item;
    }));
    hintButton.disabled = state.phase !== 'player';
    return;
  }
  setScoreDisplay(aiScoreElement, aiScoreBar, state.aiScore);
  setScoreDisplay(playerScoreElement, playerScoreBar, state.playerScore);
  roundCurrent.textContent = String(state.round);

  const messages = {
    player: '轮到你行动',
    ai: '露娜正在思考',
    resolving: state.activeActor === 'player' ? '正在结算你的攻击' : '正在结算 AI 攻击',
    ended: '本局对战结束'
  };
  const stepMessages = {
    'player-ready': '轮到你行动',
    resolving: state.activeActor === 'player' ? '正在结算你的攻击' : '正在结算 AI 攻击',
    cascade: '连消继续结算',
    'ai-thinking': '露娜正在思考',
    'ai-action': '露娜正在行动',
    handoff: '回合交接中'
  };
  turnText.textContent = stepMessages[duelStep] || messages[state.phase] || messages.player;
  turnBanner.dataset.phase = state.phase;
  thinkingDots.classList.toggle('is-active', state.phase === 'ai');
  hintButton.disabled = state.phase !== 'player';
  damageSummary.textContent = state.playerDamage + state.aiDamage
    ? `你造成 ${formatScore(state.playerDamage)} · AI 造成 ${formatScore(state.aiDamage)}`
    : '双方尚未出手';
  renderResources();
}

function addEnergy(actor, gains) {
  if (!currentCampaignLevel().allowSkills) return;
  const energy = actorEnergy(actor);
  for (const skill of ['tide', 'bloom', 'veil']) energy[skill] = Math.min(12, (energy[skill] ?? 0) + (gains[skill] ?? 0));
}

function applyBattleEffects(actor, effects) {
  if (isSolo()) {
    collectSolo(state.solo, effects.counts);
    return { damage: 0, healing: 0, energy: { tide: 0, bloom: 0, veil: 0 }, absorbed: 0, extraTurn: false };
  }
  const level = currentCampaignLevel();
  const energy = level.allowSkills ? effects.energy : { tide: 0, bloom: 0, veil: 0 };
  const rawDamage = level.allowShapes ? effects.damage : effects.counts.star * 4 + Math.max(0, (effects.cascadeLevel ?? 1) - 1);
  const boostKey = actor === 'player' ? 'playerAttackBoost' : 'aiAttackBoost';
  const multiplier = actor === 'ai' ? level.aiDamageMultiplier : level.playerDamageMultiplier;
  const boost = rawDamage > 0 ? state[boostKey] ?? 0 : 0;
  const damage = Math.max(0, Math.round(rawDamage * multiplier) + boost);
  if (boost) state[boostKey] = 0;
  if (damage) Object.assign(state, applyAttack(state, actor, damage));
  const scoreKey = actor === 'player' ? 'playerScore' : 'aiScore';
  const healing = Math.min(effects.healing, state.startingScore - state[scoreKey]);
  state[scoreKey] += healing;
  addEnergy(actor, energy);
  return { damage, healing, energy, absorbed: state.lastAbsorbed ?? 0, extraTurn: level.allowExtraTurn && effects.extraTurn };
}

function renderLog() {
  battleLogList.replaceChildren();
  for (const item of state.log.slice(0, 4)) {
    const li = document.createElement('li');
    li.className = `battle-log__item battle-log__item--${item.actor}`;
    li.innerHTML = `<span>${item.icon}</span><p><strong>${item.title}</strong><small>${item.detail}</small></p>`;
    battleLogList.append(li);
  }
}

function render() {
  renderBoard();
  renderStatus();
  renderLog();
  saveDuelSession();
}

function addLog(actor, title, detail, icon = '✦') {
  state.log.unshift({ actor, title, detail, icon });
  state.log = state.log.slice(0, 4);
  renderLog();
}

function showToast(message, tone = 'info', duration = 1300) {
  window.clearTimeout(toastTimer);
  boardToast.textContent = message;
  boardToast.dataset.tone = tone;
  boardToast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => boardToast.classList.remove('is-visible'), duration);
}

function highlightPositions(positions, className) {
  for (const position of positions) {
    boardElement.querySelector(`[data-position="${positionKey(position)}"]`)?.classList.add(className);
  }
}

function pulseScore(actor) {
  const element = actor === 'player' ? aiScoreElement : playerScoreElement;
  element.classList.remove('is-hit');
  void element.offsetWidth;
  element.classList.add('is-hit');
}

function playTone(kind = 'match', cascadeLevel = 1) {
  if (!soundEnabled) return;
  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const frequencies = { select: 420, swap: 520, match: 620 + cascadeLevel * 90, win: 880, lose: 210 };
    oscillator.type = kind === 'lose' ? 'sine' : 'triangle';
    oscillator.frequency.value = frequencies[kind] || frequencies.match;
    gain.gain.setValueAtTime(0.06, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.16);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.17);
  } catch {
    soundEnabled = false;
  }
}

function isCurrentGame(version) {
  return version === gameVersion;
}

function getTile(position) {
  return boardElement.querySelector(`[data-position="${positionKey(position)}"]`);
}

async function finishAnimations(animations) {
  await Promise.allSettled(animations.map((animation) => animation.finished));
}

async function animateSwap(first, second) {
  const firstTile = getTile(first);
  const secondTile = getTile(second);
  if (!firstTile || !secondTile) {
    await wait(30);
    return;
  }

  const firstRect = firstTile.getBoundingClientRect();
  const secondRect = secondTile.getBoundingClientRect();
  const deltaX = secondRect.left - firstRect.left;
  const deltaY = secondRect.top - firstRect.top;
  const options = {
    duration: 210,
    easing: 'cubic-bezier(0.22, 0.78, 0.24, 1)',
    fill: 'forwards'
  };

  await finishAnimations([
    firstTile.animate([
      { transform: 'translate3d(0, 0, 0)', zIndex: 7 },
      { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.04)`, zIndex: 7 }
    ], options),
    secondTile.animate([
      { transform: 'translate3d(0, 0, 0)', zIndex: 6 },
      { transform: `translate3d(${-deltaX}px, ${-deltaY}px, 0) scale(0.98)`, zIndex: 6 }
    ], options)
  ]);
}

function buildFallPlan(matches) {
  const removedByColumn = Array.from({ length: 8 }, () => []);
  for (const { row, col } of matches) removedByColumn[col].push(row);

  const plan = [];
  for (let col = 0; col < removedByColumn.length; col += 1) {
    let segmentStart = 0;
    for (let boundary = 0; boundary <= 8; boundary += 1) {
      if (boundary < 8 && state.board[boundary][col] !== 'blocker') continue;
      const segmentEnd = boundary - 1;
      const removedRows = removedByColumn[col].filter((row) => row >= segmentStart && row <= segmentEnd).sort((first, second) => first - second);
      const removedSet = new Set(removedRows);
      for (let row = segmentStart; row <= segmentEnd; row += 1) {
        if (removedSet.has(row)) continue;
        const shift = removedRows.filter((removedRow) => removedRow > row).length;
        if (shift) plan.push({ col, toRow: row + shift, offsetRows: shift, isNew: false });
      }
      for (let index = 0; index < removedRows.length; index += 1) {
        plan.push({ col, toRow: segmentStart + index, offsetRows: removedRows.length + 1, isNew: true });
      }
      segmentStart = boundary + 1;
    }
  }
  return plan;
}

async function animateFall(plan) {
  if (!plan.length) {
    await wait(30);
    return;
  }

  const topTile = getTile({ row: 0, col: 0 });
  const nextTile = getTile({ row: 1, col: 0 });
  const pitch = topTile && nextTile
    ? nextTile.getBoundingClientRect().top - topTile.getBoundingClientRect().top
    : 64;
  const animations = plan.map(({ col, toRow, offsetRows, isNew }) => {
    const tile = getTile({ row: toRow, col });
    const offset = -pitch * offsetRows;
    return tile.animate([
      { transform: `translate3d(0, ${offset}px, 0)`, opacity: isNew ? 0 : 1 },
      { transform: 'translate3d(0, 3px, 0) scaleY(0.97)', opacity: 1, offset: 0.82 },
      { transform: 'translate3d(0, 0, 0) scaleY(1)', opacity: 1 }
    ], {
      duration: 300 + Math.min(offsetRows, 4) * 32,
      delay: col * 5 + (isNew ? toRow * 18 : 0),
      easing: 'cubic-bezier(0.18, 0.72, 0.22, 1)',
      fill: 'both'
    });
  });
  await finishAnimations(animations);
}

function emitMatchParticles(matches, groups, actor) {
  const shellRect = fxLayer.getBoundingClientRect();
  const colors = actor === 'player'
    ? ['#fff7b2', '#ffffff', '#ff9fbe', '#ffd45d']
    : ['#fff7b2', '#ffffff', '#cbb9ff', '#8fe4ee'];

  matches.forEach((position, matchIndex) => {
    const tile = getTile(position);
    if (!tile) return;
    const rect = tile.getBoundingClientRect();
    const centerX = rect.left - shellRect.left + rect.width / 2;
    const centerY = rect.top - shellRect.top + rect.height / 2;

    for (let particleIndex = 0; particleIndex < 4; particleIndex += 1) {
      const particle = document.createElement('span');
      particle.className = `spark-particle${particleIndex === 0 ? ' spark-particle--star' : ''}`;
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;
      const particleColor = colors[(matchIndex + particleIndex) % colors.length];
      particle.style.color = particleColor;
      particle.style.background = particleColor;
      fxLayer.append(particle);

      const angle = ((matchIndex * 53 + particleIndex * 91) % 360) * Math.PI / 180;
      const distance = 20 + particleIndex * 7 + (matchIndex % 3) * 3;
      const animation = particle.animate([
        { transform: 'translate3d(-50%, -50%, 0) scale(0.2)', opacity: 0 },
        { transform: 'translate3d(-50%, -50%, 0) scale(1)', opacity: 1, offset: 0.18 },
        {
          transform: `translate3d(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px), 0) scale(0.1)`,
          opacity: 0
        }
      ], {
        duration: 430 + particleIndex * 25,
        delay: matchIndex * 9,
        easing: 'cubic-bezier(0.15, 0.75, 0.25, 1)',
        fill: 'forwards'
      });
      animation.finished.then(() => particle.remove(), () => particle.remove());
    }
  });

  groups.forEach((group, groupIndex) => {
    const rects = group.positions.map(getTile).filter(Boolean).map((tile) => tile.getBoundingClientRect());
    if (!rects.length) return;
    const centerX = rects.reduce((total, rect) => total + rect.left + rect.width / 2, 0) / rects.length - shellRect.left;
    const centerY = rects.reduce((total, rect) => total + rect.top + rect.height / 2, 0) / rects.length - shellRect.top;
    const bloom = document.createElement('span');
    bloom.className = 'match-bloom';
    bloom.style.left = `${centerX}px`;
    bloom.style.top = `${centerY}px`;
    fxLayer.append(bloom);
    const animation = bloom.animate([
      { transform: 'translate3d(-50%, -50%, 0) scale(0.25)', opacity: 0.85 },
      { transform: 'translate3d(-50%, -50%, 0) scale(1.7)', opacity: 0 }
    ], {
      duration: 390,
      delay: groupIndex * 35,
      easing: 'cubic-bezier(0, 0.7, 0.25, 1)',
      fill: 'forwards'
    });
    animation.finished.then(() => bloom.remove(), () => bloom.remove());
  });
}

async function animateMatchRemoval(matches, groups, actor) {
  emitMatchParticles(matches, groups, actor);
  const animations = matches.map((position, index) => getTile(position)?.animate([
    { transform: 'scale(1)', opacity: 1, filter: 'brightness(1)' },
    { transform: 'scale(1.12)', opacity: 1, filter: 'brightness(1.45)', offset: 0.38 },
    { transform: `scale(0.16) rotate(${index % 2 ? 7 : -7}deg)`, opacity: 0, filter: 'brightness(1.7)' }
  ], {
    duration: 260,
    delay: index * 10,
    easing: 'cubic-bezier(0.2, 0.72, 0.24, 1)',
    fill: 'forwards'
  })).filter(Boolean);
  await finishAnimations(animations);
}

async function resolvePrism(actor, prismEffect, version) {
  const matches = prismEffect.matches;
  const effects = calculateTacticalEffects(state.board, matches, [], 1);
  effects.shape = 'prism';
  effects.damage += 8;
  duelStep = 'resolving';
  renderStatus();
  showToast(`棱镜共鸣 · 清除全部${TILE_LABEL[prismEffect.targetType]}`, actor, 1200);
  playTone('match', 3);
  const fallPlan = buildFallPlan(matches);
  await animateMatchRemoval(matches, [], actor);
  if (!isCurrentGame(version)) return null;
  const applied = applyBattleEffects(actor, effects);
  state.board = removeAndCollapse(state.board, matches, rng);
  renderBoard();
  await animateFall(fallPlan);
  addLog(actor, actor === 'player' ? '你触发棱镜共鸣' : '露娜触发棱镜共鸣', `清除 ${matches.length} 枚 · 攻击 ${applied.damage} · 恢复 ${applied.healing}`, '◇');
  return { totalDamage: applied.damage, totalHealing: applied.healing, totalEnergy: Object.values(applied.energy).reduce((sum, amount) => sum + amount, 0), cascades: 1, extraTurn: false, shapes: ['prism'] };
}

async function resolveMatches(actor, version) {
  let cascadeLevel = 1;
  let totalDamage = 0;
  let totalHealing = 0;
  let totalEnergy = 0;
  let extraTurn = false;
  const shapes = [];

  while (isCurrentGame(version)) {
    const groups = findMatchGroups(state.board);
    if (!groups.length) break;
    const baseMatches = findMatches(state.board);
    const expanded = currentCampaignLevel().allowShapes ? expandSpecialMatches(state.board, baseMatches) : { matches: baseMatches, activated: [] };
    const matches = expanded.matches;
    const creation = currentCampaignLevel().allowShapes && cascadeLevel === 1 ? createSpecialFromGroups(groups, state.lastMovedTo) : null;
    const fallingMatches = creation ? matches.filter(({ row, col }) => row !== creation.position.row || col !== creation.position.col) : matches;
    const effects = { ...calculateTacticalEffects(state.board, matches, groups, cascadeLevel), cascadeLevel };
    duelStep = cascadeLevel > 1 ? 'cascade' : 'resolving';
    renderStatus();
    const comboText = cascadeLevel > 1
      ? `连消 ×${cascadeLevel}！`
      : groups.length > 1
        ? `${groups.length} 组同时消除`
        : `${groups[0].positions.length} 枚一组`;
    const shapeLabel = { row: '横向星轨', column: '纵向星轨', nova: '新星交汇', prism: '棱镜构形' }[effects.shape];
    showToast(`${comboText}${shapeLabel && currentCampaignLevel().allowShapes ? ` · ${shapeLabel}` : ''}`, cascadeLevel > 1 ? 'combo' : actor, 1000);
    playTone('match', cascadeLevel);
    const fallPlan = buildFallPlan(fallingMatches);
    await animateMatchRemoval(fallingMatches, groups, actor);
    if (!isCurrentGame(version)) return;

    const applied = applyBattleEffects(actor, effects);
    totalDamage += applied.damage;
    totalHealing += applied.healing;
    totalEnergy += Object.values(applied.energy).reduce((total, amount) => total + amount, 0);
    extraTurn ||= applied.extraTurn;
    if (effects.shape !== 'plain') shapes.push(effects.shape);
    if (applied.damage || applied.absorbed) pulseScore(actor);
    renderStatus();

    state.board = removeAndCollapse(state.board, matches, rng, creation);
    renderBoard();
    await animateFall(fallPlan);
    const resultParts = [];
    if (applied.damage) resultParts.push(`攻击 ${applied.damage}`);
    if (applied.absorbed) resultParts.push(`护盾吸收 ${applied.absorbed}`);
    if (applied.healing) resultParts.push(`恢复 ${applied.healing}`);
    if (Object.values(applied.energy).some(Boolean)) resultParts.push(`充能 +${Object.values(applied.energy).reduce((sum, amount) => sum + amount, 0)}`);
    if (creation) resultParts.push(`生成${{ row: '横向星轨', column: '纵向星轨', nova: '新星', prism: '棱镜' }[creation.shape]}`);
    if (expanded.activated.length) resultParts.push(`激活 ${expanded.activated.length} 个特殊棋子`);
    if (resultParts.length) showToast(resultParts.join(' · '), cascadeLevel > 1 ? 'combo' : actor, 900);
    cascadeLevel += 1;
  }

  const cascades = cascadeLevel - 1;
  addLog(
    actor,
    actor === 'player' ? `你的行动：攻击 ${totalDamage} · 恢复 ${totalHealing}` : `露娜行动：攻击 ${totalDamage} · 恢复 ${totalHealing}`,
    `${cascades} 段消除 · 充能 ${totalEnergy}${extraTurn ? ' · 获得额外回合' : ''}${shapes.length ? ` · ${shapes.length} 次高阶构形` : ''}`,
    actor === 'player' ? '♥' : '✦'
  );
  return { totalDamage, totalHealing, totalEnergy, cascades, extraTurn, shapes };
}

function hasEnded() {
  if (isEndless()) return false;
  if (isSolo()) return soloOutcome(currentCampaignLevel(), state.solo) !== 'playing';
  return state.aiScore <= 0 || state.playerScore <= 0;
}

async function ensurePlayable(version) {
  if (findValidMoves(state.board, playerOwner()).length && (isSolo() || findValidMoves(state.board, 'ai').length)) return true;
  showToast('棋局进入星雾，正在重新排列…', 'info', 1500);
  await wait(500);
  if (!isCurrentGame(version)) return false;
  state = reshuffleBattleBoard(state, rng, { blockers: currentCampaignLevel().blockers });
  addLog('system', '星雾重排了棋盘', '仅重排棋子，双方生命保持不变', '↻');
  render();
  return true;
}

async function executeMove(actor, first, second, version) {
  const prismEffect = currentCampaignLevel().allowShapes ? prismSwapTargets(state.board, first, second) : null;
  duelStep = actor === 'ai' ? 'ai-action' : 'resolving';
  state.phase = 'resolving';
  state.activeActor = actor;
  state.lastMovedTo = second;
  state.selected = null;
  renderStatus();
  renderBoard();
  highlightPositions([first, second], actor === 'ai' ? 'is-ai-choice' : 'is-swapping');
  playTone('swap');
  await animateSwap(first, second);
  if (!isCurrentGame(version)) return;

  state.board = swapTiles(state.board, first, second);
  renderBoard();

  if (!findMatches(state.board).length && !prismEffect) {
    highlightPositions([first, second], 'is-swapping');
    await animateSwap(first, second);
    if (!isCurrentGame(version)) return;
    state.board = swapTiles(state.board, first, second);
    renderBoard();
    showToast('这次交换没有形成消除', 'warning');
    playTone('select');
    await wait(140);
    if (!isCurrentGame(version)) return;
    state.phase = 'player';
    duelStep = 'player-ready';
    render();
    return;
  }

  if (isSolo() && !isEndless()) state.solo.movesLeft -= 1;
  const outcome = prismEffect ? await resolvePrism(actor, prismEffect, version) : await resolveMatches(actor, version);
  state.lastMovedTo = null;
  if (!isCurrentGame(version)) return;

  if (hasEnded()) {
    finishGame();
    return;
  }

  if (!(await ensurePlayable(version)) || !isCurrentGame(version)) return;

  if (isSolo()) {
    state.round += 1;
    state.phase = 'player';
    duelStep = 'player-ready';
    render();
    saveDuelSession();
    return;
  }

  if (outcome?.extraTurn && (state.extraTurnStreak ?? 0) < 2) {
    state.extraTurnStreak = (state.extraTurnStreak ?? 0) + 1;
    state.phase = actor;
    duelStep = actor === 'player' ? 'player-ready' : 'ai-thinking';
    render();
    showToast(actor === 'player' ? '四连续行 · 你保留行动权' : '露娜四连续行', actor, 1200);
    if (actor === 'ai') {
      await wait(520);
      if (isCurrentGame(version)) await runAiTurn(version);
    }
    return;
  }
  state.extraTurnStreak = 0;

  if (actor === 'player') {
    state.phase = 'ai';
    duelStep = 'ai-thinking';
    render();
    await wait(650);
    if (isCurrentGame(version)) await runAiTurn(version);
    return;
  }

  state.round += 1;
  state.phase = 'player';
  duelStep = 'handoff';
  addLog('system', `第 ${state.round} 回合开始`, '选择下半区的两枚相邻棋子', '◇');
  render();
  showToast(`第 ${state.round} 回合 · 轮到你`, 'player', 1100);
  window.setTimeout(() => {
    if (state?.phase === 'player') { duelStep = 'player-ready'; renderStatus(); saveDuelSession(); }
  }, 180);
}

function chooseDuelAiMove() {
  const move = chooseTacticalAiMove(state.board, aiDifficulty, rng, {
    lookahead: Math.max(currentCampaignLevel().aiLookahead, aiDifficulty === 'challenging' ? 2 : 1),
    allowShapes: currentCampaignLevel().allowShapes,
  });
  state.lastAiDecision = move ? { tacticalScore: move.tacticalScore, immediateScore: move.immediateScore, opponentReply: move.opponentReply, effects: move.effects } : null;
  return move;
}

async function runAiTurn(version) {
  duelStep = 'ai-thinking'; renderStatus();
  maybeUseAiSkill();
  const move = chooseDuelAiMove();
  if (!move) {
    await ensurePlayable(version);
    if (!isCurrentGame(version)) return;
    return runAiTurn(version);
  }
  highlightPositions([move.first, move.second], 'is-ai-thinking');
  const forecast = move.effects?.extraTurn ? '额外回合' : move.effects?.damage ? `星击 ${move.effects.damage}` : move.effects?.healing ? `恢复 ${move.effects.healing}` : '技能充能';
  showToast(aiDifficulty === 'challenging' ? `露娜预判回应 · ${forecast}` : `露娜权衡：${forecast}`, 'ai', 900);
  await wait(500);
  if (isCurrentGame(version)) await executeMove('ai', move.first, move.second, version);
}

function finishGame() {
  if (isEndless()) return;
  if (isSolo()) { finishSoloGame(); return; }
  state.phase = 'ended';
  clearDuelSession();
  renderStatus();
  renderBoard();
  const playerWon = state.playerScore > state.aiScore;
  const draw = state.playerScore === state.aiScore;
  const completedLevel = currentCampaignLevel();
  const won = draw || state.playerScore > state.aiScore;
  const hasNextLevel = won && completedLevel.number < CAMPAIGN_LEVELS.length;
  if (hasNextLevel) {
    campaignMaxUnlocked = Math.max(campaignMaxUnlocked, campaignLevelIndex + 1);
    campaignLevelIndex += 1;
    saveCampaignProgress();
    syncCampaignUi();
  }
  setSessionState(hasNextLevel ? 'stage-complete' : won ? 'won' : 'lost');
  const title = document.querySelector('#result-title');
  const detail = document.querySelector('#result-detail');
  title.textContent = hasNextLevel ? `第 ${completedLevel.number} 关完成` : draw ? '星光平局' : playerWon ? '你赢下了星梦对决！' : '露娜守住了梦境';
  detail.textContent = draw
    ? hasNextLevel ? `下一关进入“${currentCampaignLevel().tierLabel}”，露娜的攻击压力会按阶段提升。` : '双方剩余生命完全相同，这是一场势均力敌的对局。'
    : playerWon
      ? hasNextLevel ? `你以 ${formatScore(state.playerScore - state.aiScore)} 点剩余生命优势通过本关。下一关：${currentCampaignLevel().rule}。` : `你以 ${formatScore(state.playerScore - state.aiScore)} 点剩余生命优势完成全部 20 关，并掌握了技能与特殊构形。`
      : `露娜以 ${formatScore(state.aiScore - state.playerScore)} 点剩余生命优势获胜。${state.aiDamage > state.playerDamage ? '失败原因：AI 的有效消除与连消总伤害更高。' : '失败原因：关键回合未能把高价值走法转化为伤害。'} 下一局可降低 AI 难度或调整初始生命。`;
  document.querySelector('#result-player-score').textContent = formatScore(state.playerScore);
  document.querySelector('#result-ai-score').textContent = formatScore(state.aiScore);
  resultModal.hidden = false;
  resultModal.classList.add('is-visible');
  gameRoot.inert = true;
  playTone(draw ? 'match' : playerWon ? 'win' : 'lose');
  const continueButton = document.querySelector('#play-again');
  continueButton.textContent = hasNextLevel ? `进入第 ${currentCampaignLevel().number} 关` : won ? '重玩本关' : '再试本关';
  continueButton.focus();
}

function hintValue(effects) {
  if (isEndless()) return Object.values(effects.counts).reduce((sum, count) => sum + count, 0);
  if (!isSolo()) return effects.damage * 6 + effects.healing * 3 + (effects.extraTurn ? 24 : 0);
  return Object.entries(currentCampaignLevel().targets).reduce((sum, [type, target]) =>
    sum + Math.min(Math.max(0, target - (state.solo.collected[type] || 0)), effects.counts[type] || 0), 0);
}

function finishSoloGame() {
  if (isEndless()) return;
  if (state.phase === 'ended') return;
  const level = currentCampaignLevel();
  const won = soloOutcome(level, state.solo) === 'won';
  const stars = soloStars(level, state.solo);
  const previous = Math.max(0, Math.min(3, Number(soloMastery[level.number]) || 0));
  state.phase = 'ended';
  clearDuelSession();
  const next = won && level.number < SOLO_LEVELS.length;
  if (won) {
    soloMastery[level.number] = Math.max(previous, stars);
    if (next) {
      campaignLevelIndex += 1;
      campaignMaxUnlocked = Math.max(campaignMaxUnlocked, campaignLevelIndex);
    }
    saveCampaignProgress();
  }
  setSessionState(next ? 'stage-complete' : won ? 'won' : 'lost');
  document.querySelector('#result-title').textContent = won ? `${level.name} · 收集完成！` : '只差一点，再试一次';
  document.querySelector('#result-detail').textContent = won
    ? `剩余 ${state.solo.movesLeft} 步 · ${stars > previous ? `收藏新增 ${stars - previous} 颗星` : '已保留历史最佳'}。${next ? `下一站：${currentCampaignLevel().name}` : '20 站星梦旅程已全部点亮！'}`
    : '本关步数已用完。先找目标颜色的三连；随时点击“给我提示”，不会扣步。';
  const medals = document.querySelector('#solo-result');
  medals.textContent = won ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '✧';
  medals.setAttribute('aria-label', won ? `本关 ${stars} 星，历史最佳 ${Math.max(previous, stars)} 星` : '本关尚未完成');
  document.querySelector('#solo-result-targets').textContent = Object.entries(level.targets)
    .map(([type, target]) => `${TILE_LABEL[type]} ${Math.min(target, state.solo.collected[type] || 0)}/${target}`).join(' · ');
  resultModal.hidden = false;
  resultModal.classList.add('is-visible');
  gameRoot.inert = true;
  playTone(won ? 'win' : 'lose');
  const button = document.querySelector('#play-again');
  button.textContent = next ? '前往下一站' : won ? '重玩本关' : '再试本关';
  button.focus();
}

function updateScorePicker(value) {
  selectedStartingScore = normalizeStartingScore(value);
  scoreRange.value = String(selectedStartingScore);
  const progress = (selectedStartingScore - MIN_STARTING_SCORE) / (MAX_STARTING_SCORE - MIN_STARTING_SCORE) * 100;
  scoreRange.style.setProperty('--score-progress', `${progress}%`);
  setupScoreValue.value = String(selectedStartingScore);
  setupScoreValue.textContent = formatScore(selectedStartingScore);
  setupStartScore.textContent = formatScore(selectedStartingScore);
  scoreMinus.disabled = selectedStartingScore <= MIN_STARTING_SCORE;
  scorePlus.disabled = selectedStartingScore >= MAX_STARTING_SCORE;
}

function openSetup() {
  gameVersion += 1;
  window.clearTimeout(toastTimer);
  boardToast.classList.remove('is-visible');
  fxLayer.replaceChildren();
  if (state) {
    state.phase = 'ended';
    state.selected = null;
    renderStatus();
    renderBoard();
  }
  setSessionState('idle');
  resultModal.classList.remove('is-visible');
  resultModal.hidden = true;
  setupModal.hidden = false;
  setupModal.classList.add('is-visible');
  gameRoot.inert = true;
  selectedStartingScore = currentCampaignLevel().startingScore;
  updateScorePicker(selectedStartingScore);
  syncCampaignUi();
  gameHelp?.showFirstVisit();
  window.setTimeout(() => {
    if (!document.querySelector('#game-help-dialog')?.open) modeButtons.find(button => button.dataset.gameMode === gameMode)?.focus();
  }, 0);
}

function startGame(startingScore = selectedStartingScore) {
  gameVersion += 1;
  selectedStartingScore = normalizeStartingScore(startingScore);
  aiDifficulty = aiDifficultySelect.value;
  rng = createSeededRng(currentCampaignLevel().seed + (isSolo() ? 0 : gameVersion * 997));
  const restored = restoreDuelSession();
  if (!restored) state = {
    board: createBoard(rng, { blockers: currentCampaignLevel().blockers }),
    startingScore: selectedStartingScore,
    playerScore: selectedStartingScore,
    aiScore: selectedStartingScore,
    playerDamage: 0,
    aiDamage: 0,
    playerShield: 0,
    aiShield: 0,
    playerEnergy: { tide: 0, bloom: 0, veil: 0 },
    aiEnergy: { tide: 0, bloom: 0, veil: 0 },
    playerAttackBoost: 0,
    aiAttackBoost: 0,
    extraTurnStreak: 0,
    round: 1,
    phase: 'player',
    activeActor: 'player',
    selected: null,
    skillMode: null,
    solo: isSolo() ? createSoloProgress(currentCampaignLevel()) : null,
    log: [{ actor: 'system', title: '第 1 回合开始', detail: '选择下半区的两枚相邻棋子', icon: '◇' }]
  };
  duelStep = 'player-ready';
  setupModal.classList.remove('is-visible');
  setupModal.hidden = true;
  resultModal.classList.remove('is-visible');
  resultModal.hidden = true;
  gameRoot.inert = false;
  setSessionState('playing');
  render();
  showToast(isEndless() ? (restored ? '已恢复棋盘 · 随心消除，慢慢享受' : '没有目标，没有倒计时 · 随心消除') : isSolo() ? '交换相邻棋子凑成三个；目标收满即可过关' : restored ? `已恢复第 ${state.round} 回合 · 轮到你` : `第 ${currentCampaignLevel().number} 关 · ${formatScore(selectedStartingScore)} 点生命 · 轮到你`, 'player', 1400);
  saveDuelSession();
}

function useSkill(actor, skill) {
  if (!canUseBattleSkill(currentCampaignLevel(), state, actor, skill)) return false;
  const energy = actorEnergy(actor);
  const cost = SKILL_COSTS[skill];
  if (skill === 'tide' && actor === 'player') {
    state.skillMode = 'tide';
    state.selected = null;
    render();
    showToast('潮汐换位：选择下半区任意两枚棋子，交换后必须形成消除', 'player', 1900);
    return true;
  }
  energy[skill] -= cost;
  if (skill === 'bloom') {
    const scoreKey = actor === 'player' ? 'playerScore' : 'aiScore';
    const boostKey = actor === 'player' ? 'playerAttackBoost' : 'aiAttackBoost';
    const restored = Math.min(Math.ceil(18 * HEALING_MULTIPLIER), state.startingScore - state[scoreKey]);
    state[scoreKey] += restored;
    state[boostKey] = Math.max(state[boostKey], 6);
    addLog(actor, actor === 'player' ? '你释放绽放复苏' : '露娜释放绽放复苏', `恢复 ${restored} · 下一次星击 +6`, '✿');
    showToast(`绽放复苏 · 恢复 ${restored} · 星击强化`, actor, 1300);
  }
  if (skill === 'veil') {
    const shieldKey = actor === 'player' ? 'playerShield' : 'aiShield';
    state[shieldKey] = Math.min(40, state[shieldKey] + 20);
    addLog(actor, actor === 'player' ? '你展开月幕' : '露娜展开月幕', '护盾 +20', '☾');
    showToast('月幕展开 · 护盾 +20', actor, 1200);
  }
  render();
  return true;
}

function maybeUseAiSkill() {
  if (!currentCampaignLevel().allowSkills) return;
  const lifeRatio = state.aiScore / state.startingScore;
  if (lifeRatio < 0.66 && canUseBattleSkill(currentCampaignLevel(), state, 'ai', 'bloom')) useSkill('ai', 'bloom');
  else if (state.aiShield < 8 && canUseBattleSkill(currentCampaignLevel(), state, 'ai', 'veil')) useSkill('ai', 'veil');
}

function selectOrMovePlayerTile(position) {
  if (!state.selected) {
    state.selected = position;
    playTone('select');
    renderBoard();
    return;
  }

  if (state.selected.row === position.row && state.selected.col === position.col) {
    state.selected = null;
    renderBoard();
    return;
  }

  if (state.skillMode === 'tide') {
    const first = state.selected;
    const swapped = swapTiles(state.board, first, position);
    if (!findMatches(swapped).length) {
      state.selected = null;
      renderBoard();
      showToast('潮汐换位必须形成消除，请重新选择', 'warning', 1300);
      return;
    }
    state.playerEnergy.tide -= 8;
    state.skillMode = null;
    state.selected = null;
    addLog('player', '你释放潮汐换位', '跨格交换并形成消除', '≈');
    executeMove('player', first, position, gameVersion);
    return;
  }

  if (!isAdjacent(state.selected, position)) {
    state.selected = position;
    playTone('select');
    renderBoard();
    showToast('请再选一枚相邻棋子', 'info', 850);
    return;
  }

  const first = state.selected;
  if (canOwnerSwap(first, position, playerOwner(), state.board)) {
    executeMove('player', first, position, gameVersion);
  }
}

boardElement.addEventListener('pointerdown', (event) => {
  const tile = event.target.closest('.tile');
  if (!tile || state.phase !== 'player' || state.skillMode === 'tide') return;
  const position = { row: Number(tile.dataset.row), col: Number(tile.dataset.col) };
  if (!isSolo() && position.row < 4) return;
  pointerGesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, position };
});

boardElement.addEventListener('pointerup', (event) => {
  if (!pointerGesture || pointerGesture.pointerId !== event.pointerId || state.phase !== 'player') return;
  const { x, y, position } = pointerGesture;
  pointerGesture = null;
  const deltaX = event.clientX - x;
  const deltaY = event.clientY - y;
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 18) return;

  suppressClickUntil = performance.now() + 450;
  event.preventDefault();
  const target = Math.abs(deltaX) > Math.abs(deltaY)
    ? { row: position.row, col: position.col + Math.sign(deltaX) }
    : { row: position.row + Math.sign(deltaY), col: position.col };

  if (target.row < (isSolo() ? 0 : 4) || target.row > 7 || target.col < 0 || target.col > 7) {
    showToast('只能在下半区滑动棋子', 'info', 850);
    return;
  }

  if (!canOwnerSwap(position, target, playerOwner(), state.board)) return;
  state.selected = null;
  executeMove('player', position, target, gameVersion);
});

boardElement.addEventListener('pointercancel', () => {
  pointerGesture = null;
});

boardElement.addEventListener('click', (event) => {
  if (performance.now() < suppressClickUntil) return;
  const tile = event.target.closest('.tile');
  if (!tile || state.phase !== 'player') return;
  const position = { row: Number(tile.dataset.row), col: Number(tile.dataset.col) };
  if (!isSolo() && position.row < 4) return;
  selectOrMovePlayerTile(position);
});

hintButton.addEventListener('click', () => {
  if (state.phase !== 'player') return;
  const move = findValidMoves(state.board, playerOwner())
    .map((candidate) => ({ ...candidate, board: swapTiles(state.board, candidate.first, candidate.second) }))
    .map((candidate) => ({ ...candidate, effects: calculateTacticalEffects(candidate.board, findMatches(candidate.board), findMatchGroups(candidate.board), 1) }))
    .sort((left, right) => hintValue(right.effects) - hintValue(left.effects))[0];
  if (!move) return;
  state.selected = null;
  renderBoard();
  highlightPositions([move.first, move.second], 'is-hint');
  const reason = isEndless() ? '这两枚交换后可以消除' : isSolo() ? '优先收集尚未完成的目标；连消也会计入' : move.effects.extraTurn ? '形成四连并获得额外回合' : move.effects.damage ? `可造成 ${move.effects.damage} 点星击` : move.effects.healing ? `可恢复 ${move.effects.healing} 点生命` : '可为战术技能充能';
  showToast(`建议交换：${reason}`, 'player', 1700);
  playTone('select');
});

for (const button of skillButtons) button.addEventListener('click', () => useSkill('player', button.dataset.skill));

soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggle.classList.toggle('is-muted', !soundEnabled);
  soundToggle.setAttribute('aria-label', soundEnabled ? '关闭音效' : '开启音效');
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  soundToggleLabel.textContent = soundEnabled ? '声音开启' : '声音关闭';
  if (soundEnabled) playTone('select');
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = undefined;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = undefined;
  installButton.hidden = true;
  showToast('星梦对决已安装到主屏幕', 'player', 1800);
});

window.addEventListener('load', () => {
  const isNativeAndroidApp = new URLSearchParams(window.location.search).has('native');
  if ('serviceWorker' in navigator && !isNativeAndroidApp) {
    navigator.serviceWorker.register('./sw.js?v=16').catch((error) => {
      console.warn('离线服务注册失败：', error);
    });
  }
});

scoreRange.addEventListener('input', () => updateScorePicker(scoreRange.value));
scoreMinus.addEventListener('click', () => updateScorePicker(selectedStartingScore - SCORE_STEP));
scorePlus.addEventListener('click', () => updateScorePicker(selectedStartingScore + SCORE_STEP));
setupStart.addEventListener('click', () => startGame(scoreRange.value));
campaignSelect.addEventListener('change', () => setCampaignLevel(Number(campaignSelect.value) + 1));
aiDifficultySelect.addEventListener('change', () => { aiDifficulty = aiDifficultySelect.value; });
window.addEventListener('pagehide', saveDuelSession);

document.querySelector('#back-to-setup').addEventListener('click', openSetup);
document.querySelector('#play-again').addEventListener('click', () => { clearDuelSession(); startGame(currentCampaignLevel().startingScore); });
document.querySelector('#result-setup').addEventListener('click', openSetup);
modeButtons.forEach(button => button.addEventListener('click', () => {
  if (button.dataset.gameMode !== gameMode) switchMode(button.dataset.gameMode);
}));

window.__GAME_DEBUG__ = {
  getState: () => ({
    mode: gameMode,
    solo: state?.solo ? structuredClone(state.solo) : null,
    phase: state?.phase ?? 'idle',
    playerScore: state?.playerScore ?? 0,
    aiScore: state?.aiScore ?? 0,
    campaign: { level: currentCampaignLevel(), maxUnlocked: campaignMaxUnlocked + 1, total: CAMPAIGN_LEVELS.length },
    runtime: {
      soloTargets: isSolo() ? { ...currentCampaignLevel().targets } : null,
      soloMoveLimit: isSolo() ? currentCampaignLevel().moves : null,
      startingScore: currentCampaignLevel().startingScore,
      playerDamageMultiplier: currentCampaignLevel().playerDamageMultiplier,
      aiDamageMultiplier: currentCampaignLevel().aiDamageMultiplier,
      aiDifficulty,
      duelStep,
      recoverable: Boolean(localStorage.getItem(sessionKey())),
      tacticalRuleVersion: TACTICAL_RULE_VERSION,
      campaignSignatureCount: new Set(CAMPAIGN_LEVELS.map((level) => `${level.name}:${level.mission}:${level.seed}`)).size,
      chapterCount: new Set(CAMPAIGN_LEVELS.map((level) => level.tierLabel)).size,
      allowExtraTurn: currentCampaignLevel().allowExtraTurn,
      allowSkills: currentCampaignLevel().allowSkills,
      allowShapes: currentCampaignLevel().allowShapes,
      aiLookahead: aiDifficulty === 'challenging' ? 2 : currentCampaignLevel().aiLookahead,
      aiFairness: 'same-board-same-zone-same-resources',
      tileRoles: { star: 'damage', heart: 'healing', drop: 'tide', flower: 'bloom', moon: 'veil', cloud: 'wild-energy' },
      playerEnergy: state?.playerEnergy ?? { tide: 0, bloom: 0, veil: 0 },
      aiEnergy: state?.aiEnergy ?? { tide: 0, bloom: 0, veil: 0 },
      playerShield: state?.playerShield ?? 0,
      aiShield: state?.aiShield ?? 0,
      skillMode: state?.skillMode ?? null,
      aiZoneReadable: true,
      specialCount: state?.board?.flat().filter((tile) => Boolean(tileSpecial(tile))).length ?? 0,
      specialTypes: [...new Set(state?.board?.flat().map(tileSpecial).filter(Boolean) ?? [])],
      blockerCount: state?.board?.flat().filter((tile) => tile === 'blocker').length ?? 0,
      blockerLayoutSignature: currentCampaignLevel().blockers.map(({ row, col }) => `${row}:${col}`).join('|'),
      lastAiDecision: state?.lastAiDecision ?? null,
    },
  }),
  async legalAction() {
    const [move] = findValidMoves(state.board, playerOwner());
    if (move) await executeMove('player', move.first, move.second, gameVersion);
  },
  forceWin() {
    if (isEndless()) return;
    if (isSolo()) { state.solo.collected = { ...currentCampaignLevel().targets }; finishSoloGame(); return; }
    state.playerScore = Math.max(state.playerScore, 1);
    state.aiScore = 0;
    finishGame();
  },
  forceLose() {
    if (isEndless()) return;
    if (isSolo()) { state.solo.movesLeft = 0; state.solo.collected = {}; finishSoloGame(); return; }
    state.playerScore = 0;
    state.aiScore = Math.max(state.aiScore, 1);
    finishGame();
  },
  restart: () => startGame(selectedStartingScore),
  setLevel: (level) => setCampaignLevel(level, true),
  unlockAllLevels: () => { campaignMaxUnlocked = 19; saveCampaignProgress(); syncCampaignUi(); },
  chargeSkills() {
    state.playerEnergy = { tide: 12, bloom: 12, veil: 12 };
    render();
  },
  useBloom: () => useSkill('player', 'bloom'),
  useVeil: () => useSkill('player', 'veil'),
  primeFourMatch() {
    state.board = createBoard(createSeededRng(0x51a7));
    state.board[7][0] = 'star';
    state.board[7][1] = 'star';
    state.board[7][2] = 'cloud';
    state.board[7][3] = 'star';
    state.board[6][2] = 'star';
    state.phase = 'player';
    state.selected = null;
    render();
  },
  async triggerPrimedFour() {
    await executeMove('player', { row: 6, col: 2 }, { row: 7, col: 2 }, gameVersion);
  },
};
loadCampaignProgress();
gameHelp = installGameHelp(() => ({ mode: gameMode, level: currentCampaignLevel() }));
syncCampaignUi();
openSetup();
