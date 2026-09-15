import { createRace, stepRace, ranking, track, clamp, wrap, RULES, RACERS } from './race-core.js';
import { createScene } from './scene.js';
const $ = id => document.getElementById(id);
const allowedLocales = new Set(['zh-CN', 'zh-TW', 'en', 'ja']);
let locale = new URLSearchParams(location.search).get('lang');
if (!allowedLocales.has(locale)) locale = 'zh-CN';
const I18N = {
  'zh-CN': { title:'椰风海岛 · 卡丁车', world:'海岛卡丁车三维赛道', rank:n=>`/ ${n} 名`, free:'自由驾驶', lapTime:v=>`本圈 ${v}`, lapFree:n=>`${n} 圈`, lapRace:n=>`${n} / 3 圈`, soundOn:'开启声音', soundOff:'关闭声音', pause:'暂停游戏', map:'赛道小地图', boostReady:'冲刺就绪 · 空格 / 冲刺键', boostNow:'海风冲刺！', boostCharge:'收集金币，为冲刺蓄能', shield:n=>`护盾 ${n}s`, sectors:['椰林海湾','珊瑚弯道','跨海木桥','暖风村落','冲线海岸'], race:'海岛竞速', raceDesc:n=>`${n} 位车手 · 3 圈海岸赛道 · 约 2–3 分钟`, freeDesc:'没有终点与输赢，沿着海岸一直开', loading:'正在准备赛道…', start:'出发，去海边  →', assist:'新手转向辅助', first:'首次出发', record:v=>`纪录 ${v}`, guideEyebrow:'第一次来也能开', guideTitle:'转弯，超车，冲线。', steer:'左右转向', steerSub:'自动前进，不需要一直踩油门', energy:'能量冲刺', energySub:'捡金币蓄能，直道冲出去', item:'经过道具箱', itemSub:'获得护盾或补充冲刺能量', guideFoot:'触屏使用下方方向键与冲刺键 · P 暂停\n碰墙只会减速，随时可以追上来。', pauseTitle:'海风等你', pauseHelp:'← → 转向 · 空格冲刺 · ↓ 减速', resume:'继续驾驶', restart:'重新起跑', home:'返回出发点', finishTime:'完赛用时', bestLap:'最快单圈', coins:'收集金币', again:'再跑一场', controls:'驾驶控制', left:'向左转向', right:'向右转向', boost:'使用能量冲刺', boostButton:'冲刺', fatalTitle:'赛道暂时无法启动', reload:'重新加载', champion:'海岛冠军！', podium:'登上领奖台！', finish:'漂亮的冲线！', resultCaption:(rank,n)=>`第 ${rank} 名 / ${n} 位车手 · 三圈海岸，全部完成`, newRecord:'✦ 新的个人纪录', recordGap:v=>`距离个人纪录 ${v}`, racers:['你','蜜桃','柠檬'], boxShield:'护盾开启 · 7 秒碰撞保护', boxEnergy:'冲刺能量 +40', go:'左右转向 · 直道上按空格冲刺', lapDone:(n,v,last)=>`第 ${n} 圈完成 · ${v}${last?' · 最后一圈！':''}`, contextLost:'图形上下文暂时丢失，请重新加载。', webgl:'请使用支持 WebGL 2 的浏览器并开启硬件加速。' },
  'zh-TW': { title:'椰風海島 · 卡丁車', world:'海島卡丁車三維賽道', rank:n=>`/ ${n} 名`, free:'自由駕駛', lapTime:v=>`本圈 ${v}`, lapFree:n=>`${n} 圈`, lapRace:n=>`${n} / 3 圈`, soundOn:'開啟聲音', soundOff:'關閉聲音', pause:'暫停遊戲', map:'賽道小地圖', boostReady:'衝刺就緒 · 空白鍵 / 衝刺鍵', boostNow:'海風衝刺！', boostCharge:'收集金幣，為衝刺蓄能', shield:n=>`護盾 ${n}s`, sectors:['椰林海灣','珊瑚彎道','跨海木橋','暖風村落','衝線海岸'], race:'海島競速', raceDesc:n=>`${n} 位車手 · 3 圈海岸賽道 · 約 2–3 分鐘`, freeDesc:'沒有終點與輸贏，沿著海岸一直開', loading:'正在準備賽道…', start:'出發，去海邊  →', assist:'新手轉向輔助', first:'首次出發', record:v=>`紀錄 ${v}`, guideEyebrow:'第一次來也能開', guideTitle:'轉彎，超車，衝線。', steer:'左右轉向', steerSub:'自動前進，不需要一直踩油門', energy:'能量衝刺', energySub:'撿金幣蓄能，在直道衝出去', item:'經過道具箱', itemSub:'獲得護盾或補充衝刺能量', guideFoot:'觸控使用下方方向鍵與衝刺鍵 · P 暫停\n撞牆只會減速，隨時可以追上來。', pauseTitle:'海風等你', pauseHelp:'← → 轉向 · 空白鍵衝刺 · ↓ 減速', resume:'繼續駕駛', restart:'重新起跑', home:'返回出發點', finishTime:'完賽用時', bestLap:'最快單圈', coins:'收集金幣', again:'再跑一場', controls:'駕駛控制', left:'向左轉向', right:'向右轉向', boost:'使用能量衝刺', boostButton:'衝刺', fatalTitle:'賽道暫時無法啟動', reload:'重新載入', champion:'海島冠軍！', podium:'登上頒獎台！', finish:'漂亮的衝線！', resultCaption:(rank,n)=>`第 ${rank} 名 / ${n} 位車手 · 三圈海岸，全部完成`, newRecord:'✦ 新的個人紀錄', recordGap:v=>`距離個人紀錄 ${v}`, racers:['你','蜜桃','檸檬'], boxShield:'護盾開啟 · 7 秒碰撞保護', boxEnergy:'衝刺能量 +40', go:'左右轉向 · 直道上按空白鍵衝刺', lapDone:(n,v,last)=>`第 ${n} 圈完成 · ${v}${last?' · 最後一圈！':''}`, contextLost:'圖形內容暫時遺失，請重新載入。', webgl:'請使用支援 WebGL 2 的瀏覽器並開啟硬體加速。' },
  en: { title:'Coconut Coast · Kart Racing', world:'3D island kart track', rank:n=>`/ ${n}`, free:'Free drive', lapTime:v=>`Lap ${v}`, lapFree:n=>`${n} laps`, lapRace:n=>`${n} / 3 laps`, soundOn:'Turn sound on', soundOff:'Turn sound off', pause:'Pause game', map:'Track minimap', boostReady:'Boost ready · Space / Boost', boostNow:'Sea-breeze boost!', boostCharge:'Collect coins to charge boost', shield:n=>`Shield ${n}s`, sectors:['Palm Bay','Coral Bend','Ocean Bridge','Breeze Village','Finish Coast'], race:'Island race', raceDesc:n=>`${n} racers · 3 coastal laps · about 2–3 minutes`, freeDesc:'No finish or ranking — drive along the coast forever', loading:'Preparing the track…', start:'Head to the coast  →', assist:'Beginner steering assist', first:'First drive', record:v=>`Record ${v}`, guideEyebrow:'Easy on your first drive', guideTitle:'Turn, pass, finish.', steer:'Steer left and right', steerSub:'Automatic acceleration — no throttle needed', energy:'Energy boost', energySub:'Collect coins, then boost on a straight', item:'Drive through item boxes', itemSub:'Gain a shield or refill boost energy', guideFoot:'On touchscreens, use the steering and boost buttons below · P pauses\nWalls only slow you down, so you can always catch up.', pauseTitle:'The sea breeze can wait', pauseHelp:'← → steer · Space boost · ↓ slow down', resume:'Keep driving', restart:'Restart race', home:'Back to start', finishTime:'Finish time', bestLap:'Fastest lap', coins:'Coins', again:'Race again', controls:'Driving controls', left:'Steer left', right:'Steer right', boost:'Use energy boost', boostButton:'Boost', fatalTitle:'The track could not start', reload:'Reload', champion:'Island champion!', podium:'A podium finish!', finish:'Great finish!', resultCaption:(rank,n)=>`${rank} of ${n} racers · all three coastal laps complete`, newRecord:'✦ New personal record', recordGap:v=>`${v} behind your record`, racers:['You','Peach','Lemon'], boxShield:'Shield active · 7 seconds of collision protection', boxEnergy:'Boost energy +40', go:'Steer left and right · press Space to boost on straights', lapDone:(n,v,last)=>`Lap ${n} complete · ${v}${last?' · Final lap!':''}`, contextLost:'The graphics context was lost. Please reload.', webgl:'Use a browser with WebGL 2 and hardware acceleration enabled. ' },
  ja: { title:'ココナッツ海岸 · カート', world:'島の3Dカートコース', rank:n=>`/ ${n}位`, free:'フリードライブ', lapTime:v=>`ラップ ${v}`, lapFree:n=>`${n}周`, lapRace:n=>`${n} / 3周`, soundOn:'音をオン', soundOff:'音をオフ', pause:'ゲームを一時停止', map:'コースのミニマップ', boostReady:'ブースト準備完了 · スペース / ブースト', boostNow:'潮風ブースト！', boostCharge:'コインを集めてブーストをチャージ', shield:n=>`シールド ${n}秒`, sectors:['ヤシの湾','サンゴのカーブ','海上の橋','潮風の村','ゴール海岸'], race:'アイランドレース', raceDesc:n=>`${n}人 · 海岸コース3周 · 約2～3分`, freeDesc:'ゴールも勝敗もなし。海岸をずっと走れます', loading:'コースを準備中…', start:'海へ出発  →', assist:'初心者向けステアリング補助', first:'初めてのドライブ', record:v=>`記録 ${v}`, guideEyebrow:'初めてでもすぐ走れる', guideTitle:'曲がって、抜いて、ゴール。', steer:'左右に曲がる', steerSub:'自動で前進するのでアクセルは不要', energy:'エネルギーブースト', energySub:'コインを集め、直線で一気に加速', item:'アイテム箱を通る', itemSub:'シールドかブーストエネルギーを獲得', guideFoot:'タッチ操作は下の方向・ブーストボタン · Pで一時停止\n壁に当たっても減速するだけ。いつでも追いつけます。', pauseTitle:'潮風が待っています', pauseHelp:'← → 操舵 · スペースでブースト · ↓ 減速', resume:'運転を続ける', restart:'レースをやり直す', home:'スタートへ戻る', finishTime:'完走タイム', bestLap:'最速ラップ', coins:'コイン', again:'もう一度走る', controls:'運転操作', left:'左へ曲がる', right:'右へ曲がる', boost:'エネルギーブースト', boostButton:'ブースト', fatalTitle:'コースを開始できません', reload:'再読み込み', champion:'アイランドチャンピオン！', podium:'表彰台入り！', finish:'ナイスゴール！', resultCaption:(rank,n)=>`${n}人中${rank}位 · 海岸コース3周を完走`, newRecord:'✦ 自己ベスト更新', recordGap:v=>`自己ベストまで ${v}`, racers:['あなた','ピーチ','レモン'], boxShield:'シールド発動 · 7秒間衝突を防止', boxEnergy:'ブーストエネルギー +40', go:'左右に曲がる · 直線でスペースを押してブースト', lapDone:(n,v,last)=>`${n}周目完了 · ${v}${last?' · ファイナルラップ！':''}`, contextLost:'描画コンテキストが失われました。再読み込みしてください。', webgl:'WebGL 2対応ブラウザでハードウェアアクセラレーションを有効にしてください。' }
};
const text = key => I18N[locale][key];
const BRAND = {'zh-CN':['椰风','海岛'],'zh-TW':['椰風','海島'],en:['Coconut','Coast'],ja:['ココナッツ','海岸']};
const format = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;
let race = createRace(), mode = 'race', menu = true, scene, lastTime = 0, accumulator = 0, toastUntil = 0, finishAt = 0, lastHudTime = 0;
const held = new Set(), keys = new Set(); let audio = null, muted = true, boostQueued = false;
const STORE = 'island-kart.records.v1';
let records = {};
try { records = JSON.parse(localStorage.getItem(STORE) || '{}'); if (!records || typeof records !== 'object') records = {}; } catch { records = {}; }
function savedBest() { const best = records[$('assist').checked ? 'easy' : 'standard']; return best && Number.isFinite(best.time) && Number.isFinite(best.lap) ? best : null; }
function refreshBest() { $('record').textContent = savedBest() ? text('record')(format(savedBest().time)) : text('first'); }
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
$('sound').addEventListener('click', () => { initAudio(); muted = !muted; $('sound').textContent = muted ? '♪' : '♫'; $('sound').setAttribute('aria-label', text(muted ? 'soundOn' : 'soundOff')); });
$('reload').addEventListener('click', () => location.reload());
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  mode = button.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  $('mode-description').textContent = mode === 'race' ? text('raceDesc')(RACERS.length) : text('freeDesc');
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
let lastResultNewRecord = false;
function result() {
  const r = race.result, previous = savedBest();
  lastResultNewRecord = !previous || r.time < previous.time;
  records[race.difficulty] = { time: Math.min(previous?.time ?? Infinity, r.time), lap: Math.min(previous?.lap ?? Infinity, r.bestLap) };
  try { localStorage.setItem(STORE, JSON.stringify(records)); } catch { /* Private browsing can disable persistence. */ }
  renderResult(r, lastResultNewRecord);
  $('results').hidden = false;
}
function renderResult(r, newRecord) {
  $('result-title').textContent = r.rank === 1 ? text('champion') : r.rank <= 3 ? text('podium') : text('finish');
  $('result-caption').textContent = text('resultCaption')(r.rank, race.racers.length);
  $('result-time').textContent = format(r.time); $('result-lap').textContent = format(r.bestLap); $('result-coins').textContent = String(r.coins);
  $('personal-best').textContent = newRecord ? text('newRecord') : text('recordGap')(format(r.time - previous.time));
  $('podium').replaceChildren();
  for (const rank of [2, 1, 3]) {
    const car = race.racers[r.order[rank - 1]], step = document.createElement('div');
    step.className = `podium-step ${['', 'first', 'second', 'third'][rank]}${car.id === 0 ? ' you' : ''}`;
    const name = document.createElement('span'); name.textContent = text('racers')[car.id]; const n = document.createElement('b'); n.textContent = String(rank); step.append(name, n); $('podium').append(step);
  }
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
  $('rank-label').textContent = race.mode === 'free' ? text('free') : text('rank')(race.racers.length);
  $('clock').textContent = format(race.time); $('lap-clock').textContent = text('lapTime')(format(race.time - race.lastLapAt));
  const lapNumber = Math.min(race.mode === 'free' ? Infinity : 3, p.lap + 1);
  const lapLabel = text(race.mode === 'free' ? 'lapFree' : 'lapRace')(lapNumber);
  if ($('lap').textContent !== lapLabel) $('lap').textContent = lapLabel;
  $('speed').textContent = String(Math.round(p.speed * 6.6)); $('coins').textContent = String(p.coins); $('energy').style.width = `${p.energy}%`;
  $('boost-status').textContent = p.boost > 0 ? text('boostNow') : p.energy >= RULES.boostCost ? text('boostReady') : text('boostCharge');
  $('shield').textContent = p.shield > 0 ? text('shield')(Math.ceil(p.shield)) : '';
  const t = track.sample(p.s).t, sectors=text('sectors'); $('sector').textContent = t < .22 ? sectors[0] : t < .43 ? sectors[1] : t < .63 ? sectors[2] : t < .85 ? sectors[3] : sectors[4];
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
    if (e.type === 'box') { toast(text(e.shield ? 'boxShield' : 'boxEnergy')); chime(600, .24); }
    if (e.type === 'go') { toast(text('go'), 4); chime(880, .3); }
    if (e.type === 'lap' && race.phase !== 'finished') { toast(text('lapDone')(e.lap,format(race.lapTimes.at(-1)),e.lap === 2 && race.mode === 'race'), 3); chime(990, .4); }
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
  $('start').disabled = false; $('start').textContent = text('start'); requestAnimationFrame(frame);
  $('world').addEventListener('webglcontextlost', event => { event.preventDefault(); if (!menu) pause(); $('fatal-message').textContent = text('contextLost'); $('fatal').hidden = false; });
} catch (error) { $('fatal-message').textContent = text('webgl') + error.message; $('fatal').hidden = false; }
function applyLocale() {
  document.documentElement.lang = locale; document.title = text('title');
  $('world').setAttribute('aria-label', text('world')); $('minimap').setAttribute('aria-label', text('map'));
  $('sound').setAttribute('aria-label', text(muted ? 'soundOn' : 'soundOff')); $('pause').setAttribute('aria-label', text('pause'));
  const brand = document.querySelector('.menu-card h1'); brand.replaceChildren(BRAND[locale][0], Object.assign(document.createElement('span'), { textContent: BRAND[locale][1] }));
  const modeButtons = document.querySelectorAll('[data-mode]'); modeButtons[0].textContent = text('race'); modeButtons[1].textContent = text('free');
  document.querySelector('.mode-switch').setAttribute('aria-label', locale === 'en' ? 'Game mode' : locale === 'ja' ? 'ゲームモード' : locale === 'zh-TW' ? '玩法選擇' : '玩法选择');
  $('mode-description').textContent = mode === 'race' ? text('raceDesc')(RACERS.length) : text('freeDesc');
  $('start').textContent = $('start').disabled ? text('loading') : text('start');
  const assistLabel = $('assist').closest('label'); assistLabel.lastChild.nodeValue = ` ${text('assist')}`; refreshBest();
  const guide = document.querySelector('.guide'), rows = guide.querySelectorAll(':scope > div');
  guide.querySelector(':scope > .eyebrow').textContent = text('guideEyebrow'); guide.querySelector('h2').textContent = text('guideTitle');
  [[text('steer'),text('steerSub')],[text('energy'),text('energySub')],[text('item'),text('itemSub')]].forEach((pair,index)=>{rows[index].querySelector('b').textContent=pair[0];rows[index].querySelector('p span').textContent=pair[1];});
  rows[1].querySelector('kbd').textContent = locale === 'zh-CN' ? '空格' : locale === 'zh-TW' ? '空白鍵' : locale === 'ja' ? 'スペース' : 'Space';
  guide.querySelector('footer').textContent = text('guideFoot');
  document.querySelector('#pause-panel h2').textContent=text('pauseTitle'); document.querySelector('#pause-panel p').textContent=text('pauseHelp');
  $('resume').textContent=text('resume'); $('restart').textContent=text('restart'); $('back').textContent=text('home');
  const resultLabels=document.querySelectorAll('.result-stats span'); [text('finishTime'),text('bestLap'),text('coins')].forEach((value,index)=>resultLabels[index].textContent=value);
  $('again').textContent=text('again'); $('result-home').textContent=text('home');
  $('touch').setAttribute('aria-label',text('controls')); document.querySelector('[data-control="left"]').setAttribute('aria-label',text('left')); document.querySelector('[data-control="right"]').setAttribute('aria-label',text('right'));
  const boostButton=document.querySelector('[data-control="boost"]'); boostButton.setAttribute('aria-label',text('boost')); boostButton.firstChild.nodeValue=`${text('boostButton')} `;
  document.querySelector('#fatal h2').textContent=text('fatalTitle'); $('reload').textContent=text('reload');
  $('toast').classList.remove('visible');
  if(scene) hud(); if(!$('results').hidden&&race.result) renderResult(race.result,lastResultNewRecord);
}
let trustedParentOrigin=null; try { if(document.referrer) trustedParentOrigin=new URL(document.referrer).origin; } catch { trustedParentOrigin=null; }
addEventListener('message',event=>{const data=event.data;if(event.source!==parent||!trustedParentOrigin||event.origin!==trustedParentOrigin||!data||data.type!=='forge:locale'||!allowedLocales.has(data.locale)||data.locale===locale)return;locale=data.locale;applyLocale();});
applyLocale();
// Test-only probe. Normal player URLs never expose state mutation.
if (new URLSearchParams(location.search).has('probe')) window.__kart = {
  state: () => structuredClone(race), input,
  advance(seconds, controls = {}) { for (let t = 0; t < seconds; t += 1 / 60) { stepRace(race, controls, 1 / 60); events(); } hud(); },
  place(s, offset = 0) { race.racers[0].s = s; race.racers[0].offset = offset; },
  graphics: () => ({ calls: scene.renderer.info.render.calls, triangles: scene.renderer.info.render.triangles, ...scene.renderer.info.memory, quality: scene.quality() }),
  models: () => scene.modelState(),
};
