import { createRace, stepRace, ranking, track, clamp, wrap, RULES, RACERS } from './race-core.js';
import { createScene } from './scene.js';
const $ = id => document.getElementById(id);
const format = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;
let race = createRace(), mode = 'race', menu = true, scene, lastTime = 0, accumulator = 0, toastUntil = 0, finishAt = 0, lastHudTime = 0;
const held = new Set(), keys = new Set(); let audio = null, muted = true, boostQueued = false;
const STORE = 'island-kart.records.v1';
let records = {};
try { records = JSON.parse(localStorage.getItem(STORE) || '{}'); if (!records || typeof records !== 'object') records = {}; } catch { records = {}; }
function savedBest() { const best = records[$('assist').checked ? 'easy' : 'standard']; return best && Number.isFinite(best.time) && Number.isFinite(best.lap) ? best : null; }
function refreshBest() { $('record').textContent = savedBest() ? `纪录 ${format(savedBest().time)}` : '首次出发'; }
refreshBest(); $('assist').addEventListener('change', refreshBest);
function initAudio() {
  try {
    if (audio) { audio.ctx.resume(); return; }
    const ctx = new AudioContext(), engine = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
    engine.type = 'sawtooth'; filter.type = 'lowpass'; filter.frequency.value = 350; gain.gain.value = 0;
    engine.connect(filter); filter.connect(gain); gain.connect(ctx.destination); engine.start(); audio = { ctx, engine, gain };
  } catch { /* Sound is optional; an unavailable audio device must not stop a race. */ }
}
function chime(freq = 660, duration = .12) {
  if (!audio || muted) return;
  const o = audio.ctx.createOscillator(), g = audio.ctx.createGain(), now = audio.ctx.currentTime;
  o.type = 'sine'; o.frequency.setValueAtTime(freq, now); o.frequency.exponentialRampToValueAtTime(freq * 1.3, now + duration);
  g.gain.setValueAtTime(.065, now); g.gain.exponentialRampToValueAtTime(.001, now + duration);
  o.connect(g); g.connect(audio.ctx.destination); o.start(); o.stop(now + duration);
}
function toast(text, duration = 2) { $('toast').textContent = text; $('toast').classList.add('visible'); toastUntil = performance.now() + duration * 1000; }
function clearInput() { held.clear(); keys.clear(); boostQueued = false; document.querySelectorAll('[data-control]').forEach(b => b.classList.remove('active')); }
function start() {
  race = createRace(mode, $('assist').checked ? 'easy' : 'standard'); menu = false; finishAt = 0; accumulator = 0; clearInput();
  scene.setPickups(race.pickups); scene.resetCamera();
  for (const id of ['menu', 'results', 'pause-panel']) $(id).hidden = true;
  for (const id of ['hud', 'driving-hud', 'touch']) $(id).hidden = false;
  $('toast').classList.remove('visible'); initAudio();
  document.body.dataset.phase = race.phase;
}
function home() {
  clearInput(); menu = true; race = createRace(mode); scene.setPickups(race.pickups); scene.resetCamera();
  for (const id of ['results', 'pause-panel', 'hud', 'driving-hud', 'touch']) $(id).hidden = true;
  $('menu').hidden = false; $('countdown').textContent = ''; $('toast').classList.remove('visible'); refreshBest();
}
let resumePhase = 'racing';
function pause() {
  if (menu || !['racing', 'countdown', 'paused'].includes(race.phase)) return;
  clearInput();
  if (race.phase === 'paused') { race.phase = resumePhase; $('pause-panel').hidden = true; }
  else { resumePhase = race.phase; race.phase = 'paused'; $('pause-panel').hidden = false; }
  accumulator = 0;
}
$('start').addEventListener('click', start); $('again').addEventListener('click', start); $('restart').addEventListener('click', start);
$('back').addEventListener('click', home); $('result-home').addEventListener('click', home);
$('pause').addEventListener('click', pause); $('resume').addEventListener('click', pause);
$('sound').addEventListener('click', () => { initAudio(); muted = !muted; $('sound').textContent = muted ? '♪' : '♫'; $('sound').setAttribute('aria-label', muted ? '开启声音' : '关闭声音'); });
$('reload').addEventListener('click', () => location.reload());
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  mode = button.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  $('mode-description').textContent = mode === 'race' ? `${RACERS.length} 位车手 · 3 圈海岸赛道 · 约 2–3 分钟` : '没有终点与输赢，沿着海岸一直开';
}));
document.querySelectorAll('[data-control]').forEach(button => {
  const activePointers = new Set();
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); activePointers.add(event.pointerId); held.add(button.dataset.control); if (button.dataset.control === 'boost') boostQueued = true; button.classList.add('active'); });
  const release = event => { activePointers.delete(event.pointerId); if (!activePointers.size) { held.delete(button.dataset.control); button.classList.remove('active'); } };
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
});
const playKeys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyS'];
addEventListener('keydown', event => {
  if (event.code === 'Escape' || event.code === 'KeyP') { if (!event.repeat) pause(); return; }
  if (!menu && playKeys.includes(event.code)) { event.preventDefault(); keys.add(event.code); if (event.code === 'Space') boostQueued = true; }
});
addEventListener('keyup', event => keys.delete(event.code));
addEventListener('blur', () => { clearInput(); if (['racing', 'countdown'].includes(race.phase) && !menu) pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !menu && ['racing', 'countdown'].includes(race.phase)) pause(); });
function input() { return { steer: Number(held.has('right') || keys.has('ArrowRight') || keys.has('KeyD')) - Number(held.has('left') || keys.has('ArrowLeft') || keys.has('KeyA')),
  brake: keys.has('ArrowDown') || keys.has('KeyS'), boost: boostQueued || held.has('boost') || keys.has('Space') }; }
function result() {
  const r = race.result, previous = savedBest();
  const newRecord = !previous || r.time < previous.time;
  records[race.difficulty] = { time: Math.min(previous?.time ?? Infinity, r.time), lap: Math.min(previous?.lap ?? Infinity, r.bestLap) };
  try { localStorage.setItem(STORE, JSON.stringify(records)); } catch { /* Private browsing can disable persistence. */ }
  $('result-title').textContent = r.rank === 1 ? '海岛冠军！' : r.rank <= 3 ? '登上领奖台！' : '漂亮的冲线！';
  $('result-caption').textContent = `第 ${r.rank} 名 / ${race.racers.length} 位车手 · 三圈海岸，全部完成`;
  $('result-time').textContent = format(r.time); $('result-lap').textContent = format(r.bestLap); $('result-coins').textContent = String(r.coins);
  $('personal-best').textContent = newRecord ? '✦ 新的个人纪录' : `距离个人纪录 ${format(r.time - previous.time)}`;
  $('podium').replaceChildren();
  for (const rank of [2, 1, 3]) {
    const car = race.racers[r.order[rank - 1]], step = document.createElement('div');
    step.className = `podium-step ${['', 'first', 'second', 'third'][rank]}${car.id === 0 ? ' you' : ''}`;
    const name = document.createElement('span'); name.textContent = car.name; const n = document.createElement('b'); n.textContent = String(rank); step.append(name, n); $('podium').append(step);
  }
  $('results').hidden = false;
}
const map = $('minimap').getContext('2d');
function drawMap() {
  map.clearRect(0, 0, 180, 140); map.lineCap = 'round'; map.lineJoin = 'round';
  const xy = p => [90 + p.x * .34, 70 + p.z * .34];
  map.beginPath(); track.points.filter((_, i) => i % 8 === 0).forEach((p, i) => { const [x, y] = xy(p); i ? map.lineTo(x, y) : map.moveTo(x, y); }); map.closePath();
  map.strokeStyle = '#316b75aa'; map.lineWidth = 8; map.stroke(); map.strokeStyle = '#f9f4d9'; map.lineWidth = 3; map.stroke();
  for (const c of [...race.racers].reverse()) { const [x, y] = xy(track.sample(c.s)); map.beginPath(); map.arc(x, y, c.id === 0 ? 4.5 : 2.6, 0, Math.PI * 2); map.fillStyle = c.id === 0 ? '#ffdc75' : c.color; map.fill(); if (c.id === 0) { map.strokeStyle = '#fff'; map.lineWidth = 1.5; map.stroke(); } }
}
function hud() {
  const p = race.racers[0]; document.body.dataset.phase = menu ? 'menu' : race.phase;
  $('rank').textContent = race.mode === 'free' ? '∞' : String(ranking(race).findIndex(c => c.id === 0) + 1);
  $('rank-label').textContent = race.mode === 'free' ? '自由驾驶' : `/ ${race.racers.length} 名`;
  $('clock').textContent = format(race.time); $('lap-clock').textContent = `本圈 ${format(race.time - race.lastLapAt)}`;
  const lapLabel = `${Math.min(race.mode === 'free' ? Infinity : 3, p.lap + 1)}${race.mode === 'free' ? ' 圈' : ' / 3 圈'}`;
  if ($('lap').textContent !== lapLabel) $('lap').textContent = lapLabel;
  $('speed').textContent = String(Math.round(p.speed * 6.6)); $('coins').textContent = String(p.coins); $('energy').style.width = `${p.energy}%`;
  $('boost-status').textContent = p.boost > 0 ? '海风冲刺！' : p.energy >= RULES.boostCost ? '冲刺就绪 · 空格 / 冲刺键' : '收集金币，为冲刺蓄能';
  $('shield').textContent = p.shield > 0 ? `护盾 ${Math.ceil(p.shield)}s` : '';
  const t = track.sample(p.s).t; $('sector').textContent = t < .22 ? '椰林海湾' : t < .43 ? '珊瑚弯道' : t < .63 ? '跨海木桥' : t < .85 ? '暖风村落' : '冲线海岸';
  document.body.classList.toggle('boosting', p.boost > 0 && race.phase === 'racing');
  if (race.phase === 'countdown' && !menu) $('countdown').textContent = String(Math.max(1, Math.ceil(race.countdown)));
  else if (race.phase === 'racing' && race.time < 1) $('countdown').textContent = 'GO!';
  else if (race.phase === 'finished' && performance.now() - finishAt < 1600) $('countdown').textContent = 'FINISH!';
  else $('countdown').textContent = '';
  drawMap();
}
function events() {
  for (const e of race.events) {
    if (e.type === 'coin') chime(850, .09);
    if (e.type === 'box') { toast(e.shield ? '护盾开启 · 7 秒碰撞保护' : '冲刺能量 +40'); chime(600, .24); }
    if (e.type === 'go') { toast('左右转向 · 直道上按空格冲刺', 4); chime(880, .3); }
    if (e.type === 'lap' && race.phase !== 'finished') { toast(`第 ${e.lap} 圈完成 · ${format(race.lapTimes.at(-1))}${e.lap === 2 && race.mode === 'race' ? ' · 最后一圈！' : ''}`, 3); chime(990, .4); }
    if (e.type === 'finish') { finishAt = performance.now(); clearInput(); $('touch').hidden = true; chime(1100, .6); }
  }
}
function frame(now) {
  const dt = Math.min((now - lastTime) / 1000 || .016, .05); lastTime = now;
  if (!menu && ['racing', 'countdown'].includes(race.phase)) {
    accumulator += dt;
    while (accumulator >= 1 / 60) { stepRace(race, input(), 1 / 60); boostQueued = false; events(); accumulator -= 1 / 60; }
  }
  if (race.phase === 'finished' && finishAt && now - finishAt > 2100 && $('results').hidden) result();
  if (now > toastUntil) $('toast').classList.remove('visible');
  if (now - lastHudTime >= 80) { hud(); lastHudTime = now; }
  scene.render(race, dt, now / 1000, menu, accumulator * 60);
  if (audio) { audio.engine.frequency.setTargetAtTime(45 + race.racers[0].speed * 4, audio.ctx.currentTime, .08); audio.gain.gain.setTargetAtTime(!muted && !menu && race.phase === 'racing' ? .025 : 0, audio.ctx.currentTime, .08); }
  requestAnimationFrame(frame);
}
try {
  scene = createScene($('world')); scene.setPickups(race.pickups);
  $('start').disabled = false; $('start').textContent = '出发，去海边  →'; requestAnimationFrame(frame);
  $('world').addEventListener('webglcontextlost', event => { event.preventDefault(); if (!menu) pause(); $('fatal-message').textContent = '图形上下文暂时丢失，请重新加载。'; $('fatal').hidden = false; });
} catch (error) { $('fatal-message').textContent = '请使用支持 WebGL 2 的浏览器并开启硬件加速。' + error.message; $('fatal').hidden = false; }
// Test-only probe. Normal player URLs never expose state mutation.
if (new URLSearchParams(location.search).has('probe')) window.__kart = {
  state: () => structuredClone(race), input,
  advance(seconds, controls = {}) { for (let t = 0; t < seconds; t += 1 / 60) { stepRace(race, controls, 1 / 60); events(); } hud(); },
  place(s, offset = 0) { race.racers[0].s = s; race.racers[0].offset = offset; },
  graphics: () => ({ calls: scene.renderer.info.render.calls, triangles: scene.renderer.info.render.triangles, ...scene.renderer.info.memory, quality: scene.quality() }),
  models: () => scene.modelState(),
};
