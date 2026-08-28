import {
  MAX_STARTING_SCORE,
  MIN_STARTING_SCORE,
  SCORE_STEP,
  STARTING_SCORE,
  applyAttack,
  calculateGroupScore,
  calculateMatchScore,
  canOwnerSwap,
  chooseAiMove,
  createBoard,
  createSeededRng,
  findMatchGroups,
  findMatches,
  findValidMoves,
  isAdjacent,
  normalizeStartingScore,
  removeAndCollapse,
  swapTiles
} from './game-core.js?v=6';

const TILE_ART = {
  moon: './assets/tiles-v2/moon.png',
  cloud: './assets/tiles-v2/cloud.png',
  star: './assets/tiles-v2/star.png',
  flower: './assets/tiles-v2/flower.png',
  heart: './assets/tiles-v2/heart.png',
  drop: './assets/tiles-v2/drop.png'
};
const TILE_LABEL = { moon: '月光', cloud: '云朵', star: '星星', flower: '花朵', heart: '爱心', drop: '水滴' };

const CAMPAIGN_STORAGE_KEY = 'star-dream-duel:campaign:v1';
const DUEL_SESSION_KEY = 'star-dream-duel:session:v2';
const CAMPAIGN_TIERS = ['认识规则', '稳定节奏', '加入变化', '组合压力', '最终掌握'];
const CAMPAIGN_RULES = ['基础交换', '观察连消', '保留下半区', '反制露娜'];
const CAMPAIGN_LEVELS = Array.from({ length: 20 }, (_, index) => {
  const tier = Math.floor(index / 4) + 1;
  return {
    number: index + 1,
    tier,
    tierLabel: CAMPAIGN_TIERS[tier - 1],
    rule: CAMPAIGN_RULES[index % 4],
    startingScore: [100, 200, 300, 500, 700][tier - 1],
    playerDamageMultiplier: [1, 0.98, 0.96, 0.94, 0.92][tier - 1],
    aiDamageMultiplier: [1, 1.08, 1.16, 1.25, 1.35][tier - 1],
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
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
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

function currentCampaignLevel() {
  return CAMPAIGN_LEVELS[campaignLevelIndex];
}

function saveCampaignProgress() {
  try {
    localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify({ current: campaignLevelIndex, maxUnlocked: campaignMaxUnlocked }));
  } catch {}
}

function loadCampaignProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(CAMPAIGN_STORAGE_KEY) || 'null');
    campaignMaxUnlocked = Math.max(0, Math.min(19, Number(saved?.maxUnlocked) || 0));
    campaignLevelIndex = Math.max(0, Math.min(campaignMaxUnlocked, Number(saved?.current) || 0));
  } catch {
    campaignLevelIndex = 0;
    campaignMaxUnlocked = 0;
  }
}

function syncCampaignUi() {
  const level = currentCampaignLevel();
  campaignSelect.replaceChildren(...CAMPAIGN_LEVELS.map((item, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${String(item.number).padStart(2, '0')} · ${item.tierLabel} · ${item.rule}`;
    option.disabled = index > campaignMaxUnlocked;
    option.selected = index === campaignLevelIndex;
    return option;
  }));
  campaignProgress.textContent = `第 ${level.number} / 20 关 · ${level.tierLabel} · ${level.rule}`;
  document.body.dataset.campaignCurrentLevel = String(level.number);
}

function setCampaignLevel(levelNumber, allowLocked = false) {
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
    localStorage.setItem(DUEL_SESSION_KEY, JSON.stringify({ schemaVersion: 2, level: currentCampaignLevel().number, aiDifficulty, state, updatedAt: Date.now() }));
  } catch {}
}

function restoreDuelSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(DUEL_SESSION_KEY) || 'null');
    if (!saved || saved.schemaVersion !== 2 || saved.level !== currentCampaignLevel().number || saved.aiDifficulty !== aiDifficulty || saved.state?.phase !== 'player') return false;
    state = saved.state;
    state.selected = null;
    duelStep = 'player-ready';
    return true;
  } catch { return false; }
}

function clearDuelSession() {
  try { localStorage.removeItem(DUEL_SESSION_KEY); } catch {}
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
      const type = state.board[row][col];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `tile tile--${type}`;
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.dataset.position = `${row}:${col}`;
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', `${row < 4 ? 'AI 区' : '玩家区'}第 ${row + 1} 行第 ${col + 1} 列${TILE_LABEL[type]}棋子`);
      button.disabled = row < 4 || state.phase !== 'player';
      button.innerHTML = `<span class="tile__face"><img src="${TILE_ART[type]}" alt="" width="512" height="512" draggable="false"></span>`;
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

function renderStatus() {
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
  if (!firstTile || !secondTile || reducedMotion.matches) {
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
    const removedRows = removedByColumn[col].sort((first, second) => first - second);
    if (!removedRows.length) continue;
    const removedSet = new Set(removedRows);

    for (let row = 0; row < 8; row += 1) {
      if (removedSet.has(row)) continue;
      const shift = removedRows.filter((removedRow) => removedRow > row).length;
      if (shift) plan.push({ col, toRow: row + shift, offsetRows: shift, isNew: false });
    }
    for (let row = 0; row < removedRows.length; row += 1) {
      plan.push({ col, toRow: row, offsetRows: removedRows.length + 1, isNew: true });
    }
  }
  return plan;
}

async function animateFall(plan) {
  if (!plan.length || reducedMotion.matches) {
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
  if (reducedMotion.matches) return;
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
  if (reducedMotion.matches) {
    await wait(80);
    return;
  }
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

async function resolveMatches(actor, version) {
  let cascadeLevel = 1;
  let totalDamage = 0;

  while (isCurrentGame(version)) {
    const groups = findMatchGroups(state.board);
    if (!groups.length) break;
    const matches = findMatches(state.board);
    const baseDamage = calculateMatchScore(groups);
    const levelRule = currentCampaignLevel();
    const damageMultiplier = actor === 'ai' ? levelRule.aiDamageMultiplier : levelRule.playerDamageMultiplier;
    const damage = Math.max(1, Math.round(baseDamage * damageMultiplier));
    const groupScores = groups.map((group) => calculateGroupScore(group.positions.length));
    duelStep = cascadeLevel > 1 ? 'cascade' : 'resolving';
    renderStatus();
    const comboText = cascadeLevel > 1
      ? `连消 ×${cascadeLevel}！`
      : groups.length > 1
        ? `${groups.length} 组同时消除`
        : `${groups[0].positions.length} 枚一组`;
    showToast(`${comboText}  −${formatScore(damage)}`, cascadeLevel > 1 ? 'combo' : actor, 1000);
    playTone('match', cascadeLevel);
    const fallPlan = buildFallPlan(matches);
    await animateMatchRemoval(matches, groups, actor);
    if (!isCurrentGame(version)) return;

    Object.assign(state, applyAttack(state, actor, damage));
    totalDamage += damage;
    pulseScore(actor);
    renderStatus();

    state.board = removeAndCollapse(state.board, matches, rng);
    renderBoard();
    await animateFall(fallPlan);
    if (groupScores.length > 1) {
      showToast(`${groupScores.join(' + ')} = ${damage} 分`, cascadeLevel > 1 ? 'combo' : actor, 750);
    }
    cascadeLevel += 1;
  }

  const cascades = cascadeLevel - 1;
  addLog(
    actor,
    actor === 'player' ? `你造成 ${formatScore(totalDamage)} 伤害` : `露娜造成 ${formatScore(totalDamage)} 伤害`,
    cascades > 1 ? `${cascades} 段连消全部记入本次行动` : '完成 1 段消除',
    actor === 'player' ? '♥' : '✦'
  );
}

function hasEnded() {
  return state.aiScore <= 0 || state.playerScore <= 0;
}

async function ensurePlayable(version) {
  if (findValidMoves(state.board, 'player').length && findValidMoves(state.board, 'ai').length) return true;
  showToast('棋局进入星雾，正在重新排列…', 'info', 1500);
  await wait(500);
  if (!isCurrentGame(version)) return false;
  state.board = createBoard(rng);
  renderBoard();
  addLog('system', '星雾重排了棋盘', '双方都获得了新的可消除选择', '↻');
  return true;
}

async function executeMove(actor, first, second, version) {
  duelStep = actor === 'ai' ? 'ai-action' : 'resolving';
  state.phase = 'resolving';
  state.activeActor = actor;
  state.selected = null;
  renderStatus();
  renderBoard();
  highlightPositions([first, second], actor === 'ai' ? 'is-ai-choice' : 'is-swapping');
  playTone('swap');
  await animateSwap(first, second);
  if (!isCurrentGame(version)) return;

  state.board = swapTiles(state.board, first, second);
  renderBoard();

  if (!findMatches(state.board).length) {
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

  await resolveMatches(actor, version);
  if (!isCurrentGame(version)) return;

  if (hasEnded()) {
    finishGame();
    return;
  }

  if (!(await ensurePlayable(version)) || !isCurrentGame(version)) return;

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
  const moves = findValidMoves(state.board, 'ai');
  if (!moves.length) return null;
  if (aiDifficulty === 'challenging') return chooseAiMove(state.board, rng);
  const ranked = [...moves].sort((left, right) => right.score - left.score);
  const pool = aiDifficulty === 'relaxed'
    ? ranked.slice(Math.max(0, Math.floor(ranked.length * .55)))
    : ranked.slice(0, Math.max(1, Math.ceil(ranked.length / 2)));
  return pool[Math.floor(rng() * pool.length)] || ranked[0];
}

async function runAiTurn(version) {
  duelStep = 'ai-thinking'; renderStatus();
  const move = chooseDuelAiMove();
  if (!move) {
    await ensurePlayable(version);
    if (!isCurrentGame(version)) return;
    return runAiTurn(version);
  }
  highlightPositions([move.first, move.second], 'is-ai-thinking');
  showToast(aiDifficulty === 'challenging' ? '露娜锁定了最佳消除' : '露娜正在权衡走法', 'ai', 900);
  await wait(500);
  if (isCurrentGame(version)) await executeMove('ai', move.first, move.second, version);
}

function finishGame() {
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
    ? hasNextLevel ? `下一关进入“${currentCampaignLevel().tierLabel}”，露娜的攻击压力会按阶段提升。` : '双方积分完全相同，这是一场势均力敌的对局。'
    : playerWon
      ? hasNextLevel ? `你以 ${formatScore(state.playerScore - state.aiScore)} 分优势通过本关。下一关：${currentCampaignLevel().rule}。` : `你以 ${formatScore(state.playerScore - state.aiScore)} 分优势完成全部 20 关，连消归属也全部正确结算。`
      : `露娜以 ${formatScore(state.aiScore - state.playerScore)} 分优势获胜。${state.aiDamage > state.playerDamage ? '失败原因：AI 的有效消除与连消总伤害更高。' : '失败原因：关键回合未能把高价值走法转化为伤害。'} 下一局可降低 AI 难度或调整初始积分。`;
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
  window.setTimeout(() => scoreRange.focus(), 0);
}

function startGame(startingScore = selectedStartingScore) {
  gameVersion += 1;
  selectedStartingScore = normalizeStartingScore(startingScore);
  aiDifficulty = aiDifficultySelect.value;
  rng = createSeededRng(currentCampaignLevel().seed + gameVersion * 997);
  const restored = restoreDuelSession();
  if (!restored) state = {
    board: createBoard(rng),
    startingScore: selectedStartingScore,
    playerScore: selectedStartingScore,
    aiScore: selectedStartingScore,
    playerDamage: 0,
    aiDamage: 0,
    round: 1,
    phase: 'player',
    activeActor: 'player',
    selected: null,
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
  showToast(restored ? `已恢复第 ${state.round} 回合 · 轮到你` : `第 ${currentCampaignLevel().number} 关 · ${formatScore(selectedStartingScore)} 分对局 · 轮到你`, 'player', 1400);
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

  if (!isAdjacent(state.selected, position)) {
    state.selected = position;
    playTone('select');
    renderBoard();
    showToast('请再选一枚相邻棋子', 'info', 850);
    return;
  }

  const first = state.selected;
  if (canOwnerSwap(first, position, 'player')) {
    executeMove('player', first, position, gameVersion);
  }
}

boardElement.addEventListener('pointerdown', (event) => {
  const tile = event.target.closest('.tile');
  if (!tile || state.phase !== 'player') return;
  const position = { row: Number(tile.dataset.row), col: Number(tile.dataset.col) };
  if (position.row < 4) return;
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

  if (target.row < 4 || target.row > 7 || target.col < 0 || target.col > 7) {
    showToast('只能在下半区滑动棋子', 'info', 850);
    return;
  }

  if (!canOwnerSwap(position, target, 'player')) return;
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
  if (position.row < 4) return;
  selectOrMovePlayerTile(position);
});

hintButton.addEventListener('click', () => {
  if (state.phase !== 'player') return;
  const [move] = findValidMoves(state.board, 'player');
  if (!move) return;
  state.selected = null;
  renderBoard();
  highlightPositions([move.first, move.second], 'is-hint');
  showToast('这两枚棋子可以形成消除', 'player', 1300);
  playTone('select');
});

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
    navigator.serviceWorker.register('./sw.js?v=6').catch((error) => {
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
document.querySelector('#play-again').addEventListener('click', openSetup);

window.__GAME_DEBUG__ = {
  getState: () => ({
    phase: state?.phase ?? 'idle',
    playerScore: state?.playerScore ?? 0,
    aiScore: state?.aiScore ?? 0,
    campaign: { level: currentCampaignLevel(), maxUnlocked: campaignMaxUnlocked + 1, total: CAMPAIGN_LEVELS.length },
    runtime: {
      startingScore: currentCampaignLevel().startingScore,
      playerDamageMultiplier: currentCampaignLevel().playerDamageMultiplier,
      aiDamageMultiplier: currentCampaignLevel().aiDamageMultiplier,
      aiDifficulty,
      duelStep,
      recoverable: Boolean(localStorage.getItem(DUEL_SESSION_KEY)),
    },
  }),
  async legalAction() {
    const [move] = findValidMoves(state.board, 'player');
    if (move) await executeMove('player', move.first, move.second, gameVersion);
  },
  forceWin() {
    state.playerScore = Math.max(state.playerScore, 1);
    state.aiScore = 0;
    finishGame();
  },
  forceLose() {
    state.playerScore = 0;
    state.aiScore = Math.max(state.aiScore, 1);
    finishGame();
  },
  restart: () => startGame(selectedStartingScore),
  setLevel: (level) => setCampaignLevel(level, true),
  unlockAllLevels: () => { campaignMaxUnlocked = 19; saveCampaignProgress(); syncCampaignUi(); },
};
loadCampaignProgress();
syncCampaignUi();
openSetup();
