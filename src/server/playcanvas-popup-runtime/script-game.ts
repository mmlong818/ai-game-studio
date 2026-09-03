// 纸境 · 立体书迷宫 PlayCanvas 运行时 —— 第 3 段：规则驱动、动画循环；输入 / 后台停渲染 / 自动降档 / 调试骨架来自引擎层，这里只接纸境的语义。
// 注意：本段是浏览器脚本的模板字面量片段，内部不能出现 ${ 与反斜杠转义。
export const popupGameLoopScript = `
function hazardWorld(hazard, t) {
  const cell = rules.hazardCell(hazard, t);
  const top = rules.solid(blueprint, cell.x, cell.z) ? cellTop(cell.x, cell.z) : 0;
  return cellWorld(cell.x, cell.z, top - 0.1 + (hazard.kind === "bird" ? 0.95 : 0.02));
}
function hazardNextCell(hazard, t) { return rules.hazardCell(hazard, t + 1); }
// 障碍视图：本拍从 from 滑到 to（等于规则里 t-1 → t 的位置）；提示标记直接放在“下一拍会到的格子”，
// 让玩家看到的就是规则判定碰撞时用的格子——第 8 关“看着躲开了却被撞到”的根因之一。
function syncHazards(immediate) {
  hazardViews.forEach((view) => {
    const target = hazardWorld(view.hazard, model.t);
    if (immediate || !view.to) { view.from = target.clone(); view.to = target.clone(); place(view.root, target); }
    else { view.from = view.to; view.to = target; }
    view.prevCell = view.cell;
    view.cell = rules.hazardCell(view.hazard, model.t);
    view.next = hazardNextCell(view.hazard, model.t);
    const nextTop = rules.solid(blueprint, view.next.x, view.next.z) ? cellTop(view.next.x, view.next.z) : 0;
    place(view.marker, cellWorld(view.next.x, view.next.z, nextTop - 0.1 + 0.04));
    const stays = view.next.x === view.cell.x && view.next.z === view.cell.z;
    view.marker.enabled = !stays;
    const currentCell = view.cell;
    const stepCell = rules.hazardCell(view.hazard, model.t + Math.max(1, view.hazard.every));
    if (stepCell.x !== currentCell.x || stepCell.z !== currentCell.z) setRot(view.root, 0, Math.atan2(stepCell.x - currentCell.x, stepCell.z - currentCell.z), 0);
  });
}
function syncLinks() { linkViews.forEach((view) => { view.open = rules.linkOpen(view.link, model); }); }
function syncStars() {
  starViews.forEach((view) => {
    const visible = view.star.angles.includes(model.o);
    view.collected = model.stars[view.index];
    view.starMesh.enabled = visible && !view.collected;
    view.glow.light.intensity = view.starMesh.enabled ? 0.8 : 0;
  });
  starCount.querySelectorAll("i").forEach((dot, index) => { dot.classList.toggle("is-lit", Boolean(model.stars[index])); });
  starCount.setAttribute("aria-label", "折纸星 " + model.stars.filter(Boolean).length + " / 3");
}
function syncPlates() {
  plateViews.forEach((view) => {
    const plate = view.plate;
    let active = false;
    if (plate.kind === "toggle") active = Boolean(model.toggles[plate.id]);
    if (plate.kind === "order") active = model.progress >= (plate.order || 1);
    if (plate.kind === "timer") active = (model.timers[plate.id] || 0) > 0;
    view.padMaterial.emissiveIntensity = active ? 0.55 : 0.05; view.padMaterial.update();
    view.pad.setLocalPosition(0, active ? 0.02 : 0.035, 0);
    if (view.knob) setRot(view.knob, 0, 0, active ? Math.PI : 0);
    if (view.ring) { const fraction = active ? (model.timers[plate.id] || 0) / Math.max(1, plate.duration || 6) : 1; setScale(view.ring, 0.4 + fraction * 0.6); }
  });
}
function syncFlags() {
  flagViews.forEach((view) => {
    const reached = model.checkpoint >= view.index;
    if (reached !== view.reached) {
      view.reached = reached;
      const color = reached ? palette.star : palette.accent2;
      view.flagMaterial.diffuse = pcColor(color); view.flagMaterial.emissive = pcColor(color); view.flagMaterial.emissiveIntensity = reached ? 0.9 : 0.15; view.flagMaterial.update();
      view.ringMaterial.diffuse = pcColor(color); view.ringMaterial.emissive = pcColor(color); view.ringMaterial.emissiveIntensity = reached ? 1 : 0.3; view.ringMaterial.update();
    }
  });
}
function syncOrientation() {
  state.orientation = model.o;
  orientationDial.style.transform = "rotate(" + (model.o * 90) + "deg)";
  orientationDial.setAttribute("aria-label", "书本朝向 " + (model.o * 90) + " 度");
}

// 纸偶动画：from → to 用一拍走完；then 是“先走到出事的格子、拍末再回旗子”的第二段（跳空 / 被撞的可读性修复）。
const playerAnim = { from: null, to: null, progress: 1, kind: "move", falling: false, then: null, sink: false };
function playerWorld() { const top = cellTop(model.x, model.z); return cellWorld(model.x, model.z, top - 0.1); }
function cellWorldAny(cell) { const top = rules.solid(blueprint, cell.x, cell.z) ? cellTop(cell.x, cell.z) : 0; return cellWorld(cell.x, cell.z, top - 0.1); }
function currentPlayerPosition() { const p = playerView.getLocalPosition(); return new pc.Vec3(p.x, p.y, p.z); }
function placePlayer(immediate) {
  const target = playerWorld();
  playerAnim.then = null; playerAnim.sink = false;
  if (immediate || !playerAnim.to) { playerAnim.from = target.clone(); playerAnim.to = target.clone(); playerAnim.progress = 1; place(playerView, target); }
  else { playerAnim.from = currentPlayerPosition(); playerAnim.to = target; playerAnim.progress = 0; }
  setRot(playerView.userData.puppet, 0, directionAngle(model.facing), 0);
}
function playerImpact(impactCell, sink) {
  playerAnim.from = currentPlayerPosition();
  playerAnim.to = cellWorldAny(impactCell);
  playerAnim.progress = 0;
  playerAnim.then = playerWorld();
  playerAnim.sink = Boolean(sink);
  setRot(playerView.userData.puppet, 0, directionAngle(model.facing), 0);
}

let rotationTarget = 0;
let bookYaw = 0;
function syncRotation(immediate) {
  rotationTarget = -model.o * Math.PI / 2;
  backdropTargetZ = backdropZFor(model.o);
  if (immediate || reducedMotion) { bookYaw = rotationTarget; book.setLocalEulerAngles(0, deg(bookYaw), 0); const p = backdropGroup.getLocalPosition(); backdropGroup.setLocalPosition(p.x, p.y, backdropTargetZ); }
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 1400);
}

const sounds = {
  music: new Audio("./assets/music.wav"), ambient: new Audio("./assets/ambient.wav"),
  legal: new Audio("./assets/legal.wav"), illegal: new Audio("./assets/illegal.wav"), reward: new Audio("./assets/reward.wav"),
  hit: new Audio("./assets/hit.wav"), victory: new Audio("./assets/victory.wav"), defeat: new Audio("./assets/defeat.wav"), ui: new Audio("./assets/ui.wav"),
};
sounds.music.loop = true; sounds.ambient.loop = true; sounds.music.volume = 0.14; sounds.ambient.volume = 0.18;
const soundLastPlayed = new Map();
function playSound(name) {
  const sound = sounds[name];
  if (!sound) return;
  const now = performance.now();
  if (now - (soundLastPlayed.get(name) || 0) < 70) return;
  soundLastPlayed.set(name, now);
  sound.currentTime = 0;
  void sound.play().catch(() => {});
}
function startEnvironmentAudio() { if (document.hidden) return; void sounds.music.play().catch(() => {}); void sounds.ambient.play().catch(() => {}); }
function stopEnvironmentAudio() { sounds.music.pause(); sounds.ambient.pause(); }

function currentCampaignLevel() { return config.campaignLevels[campaignLevelIndex]; }
function saveCampaign() {
  try { safeStorage.setItem(config.campaignStorageKey, JSON.stringify({ schemaVersion: 2, current: campaignLevelIndex, maxUnlocked: campaignMaxUnlocked, mastery: campaignMastery })); } catch {}
}
function syncCampaignUi() {
  const levelInfo = currentCampaignLevel();
  campaignSelect.value = String(campaignLevelIndex);
  Array.from(campaignSelect.options).forEach((option, index) => { option.disabled = index > campaignMaxUnlocked; });
  campaignProgress.textContent = "第 " + levelInfo.number + " / " + config.campaignLevels.length + " 页 · " + levelInfo.tierLabel + " · " + levelInfo.ruleModifier;
  campaignHud.textContent = "第 " + levelInfo.number + " / " + config.campaignLevels.length + " 页 · " + levelInfo.tierLabel;
  levelTitle.textContent = levelInfo.ruleModifier;
  document.body.dataset.campaignCurrentLevel = String(levelInfo.number);
  let masteryCard = startCard.querySelector("[data-mastery-card]");
  if (!masteryCard) {
    masteryCard = document.createElement("section");
    masteryCard.dataset.masteryCard = "";
    masteryCard.className = "three-mastery-card";
    masteryCard.innerHTML = '<strong data-mastery-mission></strong><ul data-mastery-objectives></ul><small data-mastery-summary></small>';
    startCard.querySelector("#start")?.before(masteryCard);
  }
  const bp = config.blueprints[campaignLevelIndex];
  masteryCard.querySelector("[data-mastery-mission]").textContent = bp.intro;
  masteryCard.querySelector("[data-mastery-objectives]").replaceChildren(...levelInfo.masteryRules.map((rule) => { const item = document.createElement("li"); item.textContent = rule.label; return item; }));
  const earned = Math.max(0, Math.min(3, Number(campaignMastery[levelInfo.id]) || 0));
  const total = Object.values(campaignMastery).reduce((sum, value) => sum + Math.max(0, Math.min(3, Number(value) || 0)), 0);
  masteryCard.querySelector("[data-mastery-summary]").textContent = "本页 " + "★".repeat(earned) + "☆".repeat(3 - earned) + " · 全书折纸星 " + total + " / 60";
}
function loadCampaign() {
  try {
    const saved = JSON.parse(safeStorage.getItem(config.campaignStorageKey) || "null");
    campaignMaxUnlocked = Math.max(0, Math.min(config.campaignLevels.length - 1, Number(saved?.maxUnlocked) || 0));
    campaignLevelIndex = Math.max(0, Math.min(campaignMaxUnlocked, Number(saved?.current) || 0));
    campaignMastery = saved?.mastery && typeof saved.mastery === "object" ? saved.mastery : {};
  } catch {}
  syncCampaignUi();
}

function setGameSessionState(nextState) {
  const previousState = gameSessionState;
  gameSessionState = nextState;
  state.running = nextState === "playing";
  document.body.dataset.gameState = nextState;
  document.querySelectorAll("[data-key]").forEach((button) => { button.disabled = !state.running; });
  window.dispatchEvent(new CustomEvent("game:state-change", { detail: { previousState, state: nextState } }));
}
setGameSessionState("idle");

function togglePause() {
  if (gameSessionState === "playing") {
    setGameSessionState("paused");
    stopEnvironmentAudio();
    pauseButton.textContent = "继续";
    statusLabel.textContent = "已暂停";
    status.textContent = "书页停在这里；纸浪、纸鸟与限时门都停了。";
  } else if (gameSessionState === "paused") {
    setGameSessionState("playing");
    startEnvironmentAudio();
    previousFrame = performance.now();
    pauseButton.textContent = "暂停";
    statusLabel.textContent = "继续";
    status.textContent = "接着走。";
  }
}

let introClock = -1;
function applyPaletteToScene() {
  // 章节色板 → 引擎环境：天空 / 雾 / 半球近似环境光 / 曝光 / 主光补光。
  engine.applyEnvironment({ sky: palette.sky, fog: palette.fog, ambient: shade(mixColor(palette.hemiSky, palette.hemiGround, 0.5), -0.42 + (palette.hemiIntensity - 0.55) * 0.5), exposure: palette.exposure || 1.08, sunColor: palette.sunColor, sunIntensity: palette.sunIntensity, fillColor: palette.hemiSky, fillIntensity: palette.hemiIntensity * 0.3 });
  engine.setFog(cameraDistance * 2.2, cameraDistance * 4.5);
  desk.render.meshInstances[0].mesh = planeMesh(90, 90, palette.desk);
}
function loadLevel(index) {
  campaignLevelIndex = Math.max(0, Math.min(config.blueprints.length - 1, index));
  blueprint = config.blueprints[campaignLevelIndex];
  palette = palettes[blueprint.chapter];
  document.body.dataset.chapter = String(blueprint.chapter);
  gridWidth = rules.width(blueprint);
  gridDepth = rules.depth(blueprint);
  model = rules.createState(blueprint);
  queue.splice(0);
  applyPaletteToScene();
  buildBook();
  buildLevel();
  state.mistakes = 0; state.stars = 0; state.beats = 0; state.rotations = 0; state.blockedMoves = 0; state.finished = false; state.lastEvent = "";
  syncLinks(); syncStars(); syncPlates(); syncFlags(); syncOrientation(); syncRotation(true); syncHazards(true); placePlayer(true);
  linkViews.forEach((view) => { view.fold = view.open ? 0 : 1; setRot(view.arm, view.fold * -1.35, 0, 0); });
  fitCamera();
  introClock = reducedMotion ? -1 : 0;
  if (introClock === 0) { rightPage.setLocalEulerAngles(0, 0, deg(Math.PI * 0.92)); level.setLocalScale(1, 0.001, 1); }
}

function fitCamera() {
  const portrait = cameraAspect < 1;
  cameraDirection.copy(portrait ? PORTRAIT_DIRECTION : LANDSCAPE_DIRECTION);
  // 投影拟合：把整本书（网格 + 书页留白，含最高纸台）的 8 个角点都放进视锥；竖屏书页应占画面高度 55% 以上。
  const right = new pc.Vec3().cross(pc.Vec3.UP, cameraDirection).normalize();
  const up = new pc.Vec3().cross(cameraDirection, right).normalize();
  const vertical = Math.tan(32 * Math.PI / 360);
  const horizontal = vertical * cameraAspect;
  let maxHeight = 0.72;
  for (let z = 0; z < gridDepth; z += 1) for (let x = 0; x < gridWidth; x += 1) maxHeight = Math.max(maxHeight, cellTop(x, z));
  cameraTarget.set(0, maxHeight * 0.4, 0);
  let distance = 4;
  // 竖屏：横向只保证网格 + 1/4 留白进入画幅（书页左右外沿允许出画），纵向仍放整本书，让书占到 ≥ 55% 画面高度。
  const halfW = gridWidth / 2 + (portrait ? 0.08 : bookMargin());
  const halfD = gridDepth / 2 + (portrait ? 0.08 : bookMargin());
  const headroom = portrait ? 0.55 : 0.9;
  for (const [x, y, z] of [[-halfW, -0.45, -halfD], [halfW, -0.45, -halfD], [-halfW, -0.45, halfD], [halfW, -0.45, halfD], [-halfW, maxHeight + headroom, -halfD], [halfW, maxHeight + headroom, -halfD], [-halfW, maxHeight + headroom, halfD], [halfW, maxHeight + headroom, halfD]]) {
    const point = new pc.Vec3(x, y, z).sub(cameraTarget);
    const rx = Math.abs(point.dot(right));
    const uy = Math.abs(point.dot(up));
    const fz = point.dot(cameraDirection);
    distance = Math.max(distance, fz + rx / horizontal, fz + uy / vertical);
  }
  cameraDistance = distance * (portrait ? 0.96 : 1.0);
  const eye = new pc.Vec3().copy(cameraTarget).add(new pc.Vec3().copy(cameraDirection).mulScalar(cameraDistance));
  cameraEntity.setPosition(eye);
  cameraEntity.lookAt(cameraTarget);
  // 焦平面 = 书页：景深与雾的起止都由引擎按预设比例随相机距离更新。
  engine.setFocus(cameraDistance);
  const radius = Math.hypot(gridWidth, gridDepth) * 0.5 + 0.9;
  engine.placeSun(radius);
  sun.light.shadowDistance = cameraDistance + radius * 3;
}

// 书页在画面上占的高度比例（投影包围盒，供竖屏取景断言）。
function bookScreenHeightFraction() {
  if (!blueprint) return 0;
  const bookW = gridWidth + 2 * bookMargin(); const bookD = gridDepth + 2 * bookMargin();
  const transform = book.getWorldTransform();
  let minY = Infinity; let maxY = -Infinity;
  for (const x of [-bookW / 2, bookW / 2]) for (const z of [-bookD / 2, bookD / 2]) for (const y of [-0.4, -0.1]) {
    const screen = cameraEntity.camera.worldToScreen(transform.transformPoint(new pc.Vec3(x, y, z)), new pc.Vec3());
    minY = Math.min(minY, screen.y); maxY = Math.max(maxY, screen.y);
  }
  return Math.min(1, (maxY - minY) / Math.max(1, device.height));
}

function applyEvents(events, action) {
  events.forEach((event) => {
    if (event !== "wait") state.lastEvent = event;
    if (event.startsWith("blocked:")) state.blockedMoves += 1;
    if (event.startsWith("star:")) { const index = Number(event.split(":")[1]); state.stars = model.stars.filter(Boolean).length; burstConfetti(starViews[index] ? starViews[index].root.getLocalPosition() : null); starViews[index].pop = 1; playSound("reward"); statusLabel.textContent = "折纸星"; status.textContent = "找到第 " + state.stars + " 颗折纸星。"; }
    else if (event.startsWith("checkpoint:")) { playSound("legal"); statusLabel.textContent = "检查点"; status.textContent = "旗子亮了。如果掉下去，会回到这里。"; showToast("检查点旗已点亮"); }
    else if (event === "fell") { state.mistakes += 1; playerAnim.falling = true; playSound("illegal"); statusLabel.textContent = "跳空了"; status.textContent = "只能越过一格空隙。已回到最近的旗子。"; showToast("回到检查点"); }
    else if (event === "hit") { state.mistakes += 1; playSound("hit"); statusLabel.textContent = "被碰到了"; status.textContent = "纸浪和纸鸟按节拍移动：泡沫环 / 影子标出它们下一拍落到的格子，别踩进去。已回到最近的旗子。"; showToast("回到检查点"); }
    else if (event.startsWith("plate:")) { playSound("ui"); statusLabel.textContent = "翻转板"; status.textContent = event.endsWith(":on") ? "木板翻开了，对应的桥接上。" : "木板翻回去了，对应的桥又折起来。"; }
    else if (event.startsWith("order:")) { playSound(event === "order:reset" ? "illegal" : "ui"); statusLabel.textContent = "顺序机关"; status.textContent = event === "order:reset" ? "顺序错了，灯全灭了。从第一盏重新点。" : "点亮第 " + event.split(":")[1] + " 盏灯。"; }
    else if (event.startsWith("timer:")) { playSound("ui"); statusLabel.textContent = "限时门"; status.textContent = "计时开始，桥只接上几拍。快走。"; }
    else if (event.startsWith("blocked:")) { queue.splice(0); statusLabel.textContent = "走不通"; status.textContent = action && action.startsWith("j") ? "跳跃只能越过一格空隙，跳不过实心格上的纸浪。等它过去再走。" : "这条路现在没接上。试着转一转书，或者换个方向。"; }
    else if (event === "exit") { completeLevel(); }
  });
}

function performRotation(direction) {
  if (!state.running || model.done) return false;
  const result = rules.step(blueprint, model, direction);
  model = result.state;
  state.rotations += 1;
  syncRotation(false); syncLinks(); syncStars(); syncOrientation();
  playSound("ui");
  applyEvents(result.events.filter((event) => !event.startsWith("rotate")), direction);
  if (!result.events.some((event) => event.startsWith("star:"))) { statusLabel.textContent = "转动书本"; status.textContent = "朝向 " + (model.o * 90) + "°。折起的桥和台阶会在对的角度落下。"; }
  return true;
}

function tick() {
  if (!state.running || model.done) return;
  const action = queue.shift() || "wait";
  if (queue.length === 0) keyboardQueue = false;
  if (action === "cw" || action === "ccw") { performRotation(action); return; }
  const previous = model;
  const result = rules.step(blueprint, model, action);
  model = result.state;
  state.beats += 1;
  if (action !== "wait") { playerAnim.kind = action.startsWith("j") ? "jump" : "move"; }
  playerAnim.falling = false;
  const fell = result.events.includes("fell");
  const hit = result.events.includes("hit");
  if (fell || hit) {
    // 先把纸偶走到出事的格子（跳空落到空洞上方并下沉；被撞则与障碍在同一格相遇），一拍后再回到旗子。
    let impact = { x: previous.x, z: previous.z };
    if (action.startsWith("j")) { const jump = rules.jumpTarget(blueprint, previous, action.slice(1)); if (jump.cell) impact = jump.cell; }
    else if (action !== "wait") { const target = rules.walkTarget(blueprint, previous, action); if (target) impact = target; }
    playerImpact(impact, fell);
  } else if (model.x !== previous.x || model.z !== previous.z) {
    placePlayer(false);
    // 与障碍交换格子（规则允许擦身而过）：用一个小跳把“越过纸浪”读出来。
    const swapped = blueprint.hazards.some((hazard) => { const was = rules.hazardCell(hazard, previous.t); const now = rules.hazardCell(hazard, model.t); return was.x === model.x && was.z === model.z && now.x === previous.x && now.z === previous.z; });
    if (swapped) playerAnim.kind = "hop";
  } else placePlayer(true);
  syncHazards(false); syncLinks(); syncStars(); syncPlates(); syncFlags();
  applyEvents(result.events, action);
}

function enqueue(actions) {
  if (!state.running) return 0;
  for (const action of actions) {
    if (action === "cw" || action === "ccw") { flushQueueThenRotate(action); continue; }
    queue.push(action);
  }
  return queue.length;
}
function flushQueueThenRotate(direction) {
  if (queue.length === 0) performRotation(direction);
  else queue.push(direction);
}

function walkableNeighbors(cell) {
  const probeState = rules.cloneState(model);
  probeState.x = cell.x; probeState.z = cell.z;
  return rules.DIRECTION_ORDER.flatMap((direction) => {
    const target = rules.walkTarget(blueprint, probeState, direction);
    return target ? [{ direction, cell: target }] : [];
  });
}
function planPath(target) {
  const startKey = rules.cellKey({ x: model.x, z: model.z });
  const goalKey = rules.cellKey(target);
  if (startKey === goalKey) return [];
  const previous = new Map([[startKey, null]]);
  const frontier = [{ x: model.x, z: model.z }];
  let head = 0;
  while (head < frontier.length) {
    const current = frontier[head++];
    for (const next of walkableNeighbors(current)) {
      const key = rules.cellKey(next.cell);
      if (previous.has(key)) continue;
      previous.set(key, { from: current, direction: next.direction });
      if (key === goalKey) {
        const actions = [];
        let cursor = key;
        while (previous.get(cursor)) { const link = previous.get(cursor); actions.unshift(link.direction); cursor = rules.cellKey(link.from); }
        return actions;
      }
      frontier.push(next.cell);
    }
  }
  return null;
}
// 有障碍的关卡：点击地面时用规则内核自带的节拍搜索（含等待）规划一条不被纸浪 / 纸鸟撞到的路，而不是盲走最短路。
function planSafePath(target) {
  if (!blueprint.hazards.length) return null;
  const solution = rules.search(blueprint, model, (candidate) => candidate.x === target.x && candidate.z === target.z, { allowRotate: false, maxNodes: 40000 });
  return solution ? solution.actions : null;
}
function moveTowards(target) {
  if (!state.running || model.done) return false;
  const safe = planSafePath(target);
  const path = safe || planPath(target);
  keyboardQueue = false;
  if (path && path.length) { queue.splice(0); queue.push(...path); statusLabel.textContent = "行走"; status.textContent = path.length + " 步。" + (safe && path.some((step) => step === "wait") ? "会在纸浪 / 纸鸟经过时停一拍。" : "纸浪和纸鸟会按节拍移动。"); return true; }
  if (path && path.length === 0) return false;
  for (const direction of rules.DIRECTION_ORDER) {
    const jump = rules.jumpTarget(blueprint, model, direction);
    if (jump.cell && !jump.falls && jump.cell.x === target.x && jump.cell.z === target.z) { queue.splice(0); queue.push("j" + direction); statusLabel.textContent = "跳跃"; status.textContent = "越过一格空隙。"; return true; }
  }
  statusLabel.textContent = "走不通";
  status.textContent = "那里现在到不了。转一转书，看看桥和台阶会不会接上。";
  showToast("转一转书试试");
  return false;
}
let keyboardQueue = false;
// 直接输入立刻结算（第 8 关修复的核心）：旧运行时把按键排进队列、等下一个 380ms 节拍边界才交给规则，
// 玩家按下时看到的纸浪位置与规则结算时的位置差了半拍到一拍，"看着躲开了却被撞到"。现在队列为空时的按键
// 当场推进一拍（纸浪同步走一步、节拍时钟归零），空闲不按键时纸浪仍按 380ms 一拍自行移动；连按仍按顺序排队。
function consumeNow() {
  if (queue.length === 1 && introClock < 0 && state.running) { beatClock = 0; tick(); }
}
function moveScreen(direction) {
  if (!state.running) return;
  const gridDirection = rules.screenToGrid(direction, model.o);
  // 连按方向键会按顺序排队（最多 12 步）；点击地面的路径则会被新的按键打断。
  if (!keyboardQueue) queue.splice(0);
  if (queue.length >= 12) queue.splice(0, queue.length - 11);
  queue.push(gridDirection);
  keyboardQueue = true;
  consumeNow();
}
function jump() {
  if (!state.running) return;
  if (!keyboardQueue) queue.splice(0);
  queue.push("j" + model.facing);
  keyboardQueue = true;
  consumeNow();
}

// 纸屑：一张动态网格里的 48 片小纸方块，逐帧更新顶点位置。
let confettiMesh = null;
function burstConfetti(position) {
  if (!position || reducedMotion || !engine.profile.particles) return;
  if (confetti) { confetti.entity.destroy(); confetti = null; }
  const count = 48;
  const particles = [];
  const paletteColors = [palette.star, palette.accent2, palette.edge, palette.top[0]];
  for (let index = 0; index < count; index += 1) particles.push({ x: position.x, y: position.y + 0.4, z: position.z, vx: (Math.random() - 0.5) * 2.2, vy: 1.4 + Math.random() * 1.8, vz: (Math.random() - 0.5) * 2.2, color: paletteColors[index % paletteColors.length], spin: Math.random() * Math.PI * 2 });
  if (!confettiMesh) { confettiMesh = new pc.Mesh(device); confettiMesh.clear(true, false); confettiMesh.incRefCount(); }
  const material = uniqueMaterial({ doubleSide: true, opacity: 0.999 });
  const entity = new pc.Entity("confetti");
  entity.addComponent("render", { meshInstances: [new pc.MeshInstance(confettiMesh, material)], castShadows: false, receiveShadows: false });
  entity.render.meshInstances[0].cull = false;
  level.addChild(entity);
  confetti = { entity, material, particles, life: 1 };
  updateConfettiMesh();
}
function updateConfettiMesh() {
  const positions = []; const colors = []; const normals = []; const indices = []; const size = 0.045;
  confetti.particles.forEach((p, index) => {
    const c = Math.cos(p.spin) * size; const s = Math.sin(p.spin) * size;
    const base = index * 4;
    positions.push(p.x - c, p.y - s * 0.3, p.z - s, p.x + c, p.y + s * 0.3, p.z + s, p.x + c, p.y + size + s * 0.3, p.z + s, p.x - c, p.y + size - s * 0.3, p.z - s);
    for (let k = 0; k < 4; k += 1) { normals.push(0, 1, 0); colors.push((p.color >> 16) & 255, (p.color >> 8) & 255, p.color & 255, 255); }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  confettiMesh.setPositions(positions); confettiMesh.setNormals(normals); confettiMesh.setColors32(colors); confettiMesh.setIndices(indices);
  confettiMesh.update(pc.PRIMITIVE_TRIANGLES);
}

function completeLevel() {
  state.finished = true;
  state.stars = model.stars.filter(Boolean).length;
  burstConfetti(exitView ? exitView.getLocalPosition() : null);
  showResult(true);
}

function showResult(won) {
  const finalWin = won && campaignLevelIndex === config.campaignLevels.length - 1;
  const stars = won ? Math.min(3, 1 + Number(state.stars >= 2) + Number(state.stars === 3)) : 0;
  if (won) {
    const completedLevel = currentCampaignLevel();
    campaignMastery[completedLevel.id] = Math.max(Number(campaignMastery[completedLevel.id]) || 0, stars);
  }
  setGameSessionState(won ? (finalWin ? "won" : "stage-complete") : "lost");
  state.finished = true;
  queue.splice(0);
  stopEnvironmentAudio();
  document.querySelector("#result-kicker").textContent = won ? (finalWin ? "整本书读完了" : "这一页读完了") : "这一页先合上";
  document.querySelector("#result-title").textContent = won ? (finalWin ? "20 页全部走完" : "第 " + (campaignLevelIndex + 1) + " 页 · 抵达出口") : "暂时放下";
  document.querySelectorAll("#result-stars i").forEach((dot, index) => dot.classList.toggle("is-lit", index < stars));
  document.querySelector("#result-detail").textContent = won
    ? "折纸星 " + state.stars + " / 3，转动 " + state.rotations + " 次，用了 " + state.beats + " 拍" + (state.mistakes ? "，回到旗子 " + state.mistakes + " 次。" : "，一次都没掉下去。") + (finalWin ? " 谢谢你读完这本纸做的书。" : "")
    : "进度已保存在目录里，随时可以再翻开这一页。";
  resultCard.hidden = false;
  if (won && !finalWin) {
    campaignMaxUnlocked = Math.max(campaignMaxUnlocked, campaignLevelIndex + 1);
    campaignLevelIndex += 1;
    saveCampaign(); syncCampaignUi();
    document.querySelector("#restart").textContent = "翻到第 " + (campaignLevelIndex + 1) + " 页";
  } else if (finalWin) {
    campaignMaxUnlocked = config.campaignLevels.length - 1;
    saveCampaign();
    document.querySelector("#restart").textContent = "重读第 20 页";
  } else document.querySelector("#restart").textContent = "再翻开这一页";
  playSound(won ? "victory" : "defeat");
}

function resetGame() {
  loadLevel(campaignLevelIndex);
  setGameSessionState("playing");
  startCard.hidden = true; resultCard.hidden = true;
  statusLabel.textContent = "第 " + (campaignLevelIndex + 1) + " 页 · " + blueprint.chapterName;
  status.textContent = blueprint.intro;
  startEnvironmentAudio();
  previousFrame = performance.now();
  beatClock = 0;
}
function returnToSetup() {
  queue.splice(0);
  stopEnvironmentAudio();
  setGameSessionState("idle");
  state.finished = false;
  statusLabel.textContent = "目录";
  status.textContent = "选一页再翻开。";
  resultCard.hidden = true;
  startCard.hidden = false;
  syncCampaignUi();
}

let time = 0;
function animate(dt) {
  const delta = Math.min(Math.max(0, dt), 0.05);
  time += delta;
  if (state.running && introClock < 0) {
    beatClock += delta * 1000;
    while (beatClock >= beatMs) { beatClock -= beatMs; tick(); if (!state.running) break; }
  }
  if (introClock >= 0) {
    introClock += delta;
    const flip = Math.min(1, introClock / 0.7);
    rightPage.setLocalEulerAngles(0, 0, deg(Math.PI * 0.92 * (1 - (1 - Math.pow(1 - flip, 3)))));
    const pop = Math.max(0, Math.min(1, (introClock - 0.35) / 0.55));
    const scaleY = 0.001 + (1 - Math.pow(1 - pop, 3)) * 0.999;
    level.setLocalScale(1, scaleY, 1);
    if (introClock > 1.05) { introClock = -1; rightPage.setLocalEulerAngles(0, 0, 0); level.setLocalScale(1, 1, 1); }
  }
  const backdropPosition = backdropGroup.getLocalPosition();
  if (!reducedMotion) {
    const turn = rotationTarget - bookYaw;
    bookYaw += turn * Math.min(1, delta * 9);
    if (Math.abs(turn) < 0.002) bookYaw = rotationTarget;
    book.setLocalEulerAngles(0, deg(bookYaw), 0);
    // 背景纸山不随书旋转，只在书页远端随页边缘前后滑动（非正方形网格时）。
    backdropGroup.setLocalPosition(backdropPosition.x, backdropPosition.y, backdropPosition.z + (backdropTargetZ - backdropPosition.z) * Math.min(1, delta * 9));
  } else backdropGroup.setLocalPosition(backdropPosition.x, backdropPosition.y, backdropTargetZ);
  backdropGroup.setLocalScale(1, level.getLocalScale().y, 1);
  const beatFraction = Math.min(1, beatClock / beatMs);
  linkViews.forEach((view) => {
    const targetFold = view.open ? 0 : 1;
    view.fold += (targetFold - view.fold) * (reducedMotion ? 1 : Math.min(1, delta * 7));
    setRot(view.arm, view.fold * -1.35, 0, 0);
    if (view.glow) { view.glow.emissiveIntensity = view.open ? 0.9 + Math.sin(time * 5) * 0.2 : 0.15; view.glow.update(); }
  });
  starViews.forEach((view) => {
    setRot(view.starMesh, 0, time * 1.4 + view.index, 0);
    view.starMesh.setLocalPosition(0, 0.46 + (reducedMotion ? 0 : Math.sin(time * 2.2 + view.index) * 0.05), 0);
    if (view.pop > 0) { view.pop = Math.max(0, view.pop - delta * 2.5); setScale(view.pocket, 1 + view.pop * 0.12); }
  });
  flagViews.forEach((view) => { setRot(view.flag, 0, reducedMotion ? 0 : Math.sin(time * 3 + view.index) * 0.16, 0); });
  if (exitView) { exitView.userData.light.light.intensity = (palette.lanterns ? 2.2 : 1.4) + Math.sin(time * 2.5) * 0.3; exitView.userData.lanternMaterial.emissiveIntensity = 1.2 + (reducedMotion ? 0 : Math.sin(time * 3) * 0.25); exitView.userData.lanternMaterial.update(); }
  hazardViews.forEach((view) => {
    if (!view.from || !view.to) return;
    const f = reducedMotion ? 1 : beatFraction;
    const p = new pc.Vec3().lerp(view.from, view.to, f);
    if (view.hazard.kind === "bird") { p.y += Math.sin(time * 6) * 0.04; view.root.userData.wings.forEach((wing, index) => { setRot(wing, 0, 0, (index === 0 ? 1 : -1) * Math.sin(time * 9) * 0.55); }); }
    else { const e = view.root.getLocalEulerAngles(); view.root.setLocalEulerAngles(e.x, e.y, deg(Math.sin(time * 4) * 0.08)); }
    view.root.setLocalPosition(p.x, p.y, p.z);
    // 落点提示随节拍呼吸，越接近拍末越亮。
    if (view.marker.enabled) { const pulse = 0.85 + f * 0.35; view.marker.setLocalScale(pulse, 1, pulse); }
  });
  if (playerView && playerAnim.to) {
    if (playerAnim.progress < 1) {
      playerAnim.progress = Math.min(1, playerAnim.progress + delta * (1000 / beatMs));
      const eased = playerAnim.progress;
      const p = new pc.Vec3().lerp(playerAnim.from, playerAnim.to, eased);
      const arc = playerAnim.kind === "jump" ? 0.55 : playerAnim.kind === "hop" ? 0.42 : 0.12;
      if (!reducedMotion) p.y += Math.sin(eased * Math.PI) * arc;
      if (playerAnim.sink && !reducedMotion) p.y -= Math.pow(Math.max(0, eased - 0.55), 2) * 6;
      playerView.setLocalPosition(p.x, p.y, p.z);
      if (playerAnim.progress >= 1 && playerAnim.then) { const back = playerAnim.then; playerAnim.then = null; playerAnim.sink = false; playerAnim.from = back.clone(); playerAnim.to = back.clone(); place(playerView, back); playerAnim.kind = "move"; }
    }
    const puppet = playerView.userData.puppet;
    const bob = !reducedMotion && playerAnim.progress < 1 ? Math.sin(playerAnim.progress * Math.PI * 2) * 0.08 : 0;
    puppet.setLocalScale(1 - bob * 0.5, 1 + bob, 1 - bob * 0.5);
  }
  if (confetti) {
    confetti.life -= delta * 0.9;
    confetti.particles.forEach((p) => { p.vy -= 4.5 * delta; p.x += p.vx * delta; p.y += p.vy * delta; p.z += p.vz * delta; p.spin += delta * 6; });
    updateConfettiMesh();
    confetti.material.opacity = Math.max(0.02, confetti.life); confetti.material.update();
    if (confetti.life <= 0) { confetti.entity.destroy(); confetti = null; }
  }
  // 帧预算交给引擎层：连续慢帧降档、高配设备连续快帧升到高档（升档只在游戏运行中发生）。
  engine.trackFrame(delta, state.running);
}
// 渲染节奏由引擎层控制：后台 / 探针挂起时既不推进节拍也不渲染（renderCount 不再增长）。
engine.onUpdate((dt) => {
  animate(dt);
  state.renderCount += 1;
});
engine.resize();

// 输入：点击地面行走 / 横向滑动转书 / 键盘，全部经引擎层输入控制器转成抽象动作。拾取用相机射线与纸台包围盒在书局部空间求交（书转动时随之旋转）。
function pickCell(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = (clientX - rect.left) / rect.width * device.width;
  const sy = (clientY - rect.top) / rect.height * device.height;
  const far = cameraEntity.camera.screenToWorld(sx, sy, cameraEntity.camera.farClip, new pc.Vec3());
  const origin = cameraEntity.getPosition().clone();
  const inverse = book.getWorldTransform().clone().invert();
  const localOrigin = inverse.transformPoint(origin);
  const localFar = inverse.transformPoint(far);
  const dir = localFar.sub(localOrigin).normalize();
  let best = null;
  cellBoxes.forEach((box) => {
    let tMin = -Infinity; let tMax = Infinity;
    const lo = [box.min.x - 0.5, box.min.y, box.min.z - 0.5]; const hi = [box.max.x + 0.5, box.max.y, box.max.z + 0.5];
    const o = [localOrigin.x, localOrigin.y, localOrigin.z]; const d = [dir.x, dir.y, dir.z];
    for (let axis = 0; axis < 3; axis += 1) {
      if (Math.abs(d[axis]) < 1e-9) { if (o[axis] < lo[axis] || o[axis] > hi[axis]) return; continue; }
      let t1 = (lo[axis] - o[axis]) / d[axis]; let t2 = (hi[axis] - o[axis]) / d[axis];
      if (t1 > t2) { const swap = t1; t1 = t2; t2 = swap; }
      tMin = Math.max(tMin, t1); tMax = Math.min(tMax, t2);
      if (tMin > tMax) return;
    }
    if (tMax < 0) return;
    if (!best || tMin < best.t) best = { t: tMin, cell: { x: box.x, z: box.z } };
  });
  return best ? best.cell : null;
}
function control(action) {
  if (action === "cw" || action === "ccw") return performRotation(action);
  if (action === "jump") { jump(); return true; }
  if (["N", "E", "S", "W"].includes(action)) { moveScreen(action); return true; }
  if (action === "pause") { togglePause(); return true; }
  return false;
}
const input = createInputController({
  canvas,
  enabled: () => state.running,
  keyMap: { KeyQ: "ccw", KeyE: "cw", Space: "jump", ArrowUp: "N", KeyW: "N", ArrowDown: "S", KeyS: "S", ArrowLeft: "W", KeyA: "W", ArrowRight: "E", KeyD: "E", KeyP: { action: "pause", always: true } },
  preventCodes: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD", "Space", "KeyQ", "KeyE"],
  buttons: document.querySelectorAll("[data-key]"),
  swipe: { minDistance: 42, axisRatio: 1.2 },
  onAction: control,
  onSwipe(dx) { performRotation(dx > 0 ? "cw" : "ccw"); },
  onTap(clientX, clientY) { const cell = pickCell(clientX, clientY); if (cell) moveTowards(cell); },
});
void input;
document.querySelector("#start").addEventListener("click", () => resetGame());
document.querySelector("#restart").addEventListener("click", () => resetGame());
backToSetupButton.addEventListener("click", returnToSetup);
pauseButton.addEventListener("click", togglePause);
resultSetupButton.addEventListener("click", returnToSetup);
campaignSelect.addEventListener("change", () => {
  campaignLevelIndex = Math.min(campaignMaxUnlocked, Math.max(0, Number(campaignSelect.value) || 0));
  saveCampaign(); syncCampaignUi();
});
engine.applyPerformanceTier(engine.tier);
loadCampaign();
loadLevel(campaignLevelIndex);
app.start();

// __GAME_DEBUG__：通用骨架（state / getState / suspend / restart / control / setPerformanceTier / setBeatMs / tickNow / engine）由引擎层提供，
// 纸境的专属字段（replay / rotate / moveTo / solution / jumpIntoVoid / forceWin / forceFail / setLevel / enqueue 与 getState 的 popup 段）在这里注入。字段集合与语义与重构前一致。
const gameDebugApi = createDebugApi({
  state,
  engine,
  restart: resetGame,
  control,
  setBeatMs(value) { beatMs = Math.max(30, Number(value) || config.beatMs); return beatMs; },
  tickNow() { tick(); },
  engineHandles() { return { book, level, decorGroup, backdropGroup, materialCache, meshCache }; },
}, {
  getState() {
    const bp = blueprint;
    const playerPosition = playerView ? playerView.getLocalPosition() : null;
    return {
      ...state,
      mode: "popup",
      engine: "playcanvas",
      level: campaignLevelIndex + 1,
      player: playerPosition ? { x: playerPosition.x, y: playerPosition.y, z: playerPosition.z } : null,
      model: model ? { x: model.x, z: model.z, o: model.o, t: model.t, checkpoint: model.checkpoint, stars: model.stars.slice(), progress: model.progress, toggles: { ...model.toggles }, timers: { ...model.timers }, mistakes: model.mistakes, done: model.done, facing: model.facing } : null,
      queueLength: queue.length,
      beatMs,
      beatFraction: Math.min(1, beatClock / beatMs),
      bookScreenHeightFraction: Number(bookScreenHeightFraction().toFixed(3)),
      viewport: { width: device.width, height: device.height, portrait: cameraAspect < 1 },
      campaign: { level: currentCampaignLevel(), maxUnlocked: campaignMaxUnlocked + 1, total: config.campaignLevels.length, mastery: { ...campaignMastery }, stars: Object.values(campaignMastery).reduce((sum, value) => sum + Number(value || 0), 0) },
      contract: config.contract,
      popup: bp ? {
        blueprintCount: config.blueprints.length,
        uniqueSignatures: new Set(config.blueprints.map((item) => JSON.stringify({ rows: item.rows, start: item.start, exit: item.exit, links: item.links, plates: item.plates, hazards: item.hazards, stars: item.stars }))).size,
        chapterCount: new Set(config.blueprints.map((item) => item.chapter)).size,
        blueprintId: bp.id, blueprintName: bp.name, chapter: bp.chapter,
        blueprint: bp,
        stars: bp.stars,
        start: bp.start,
        respawn: rules.respawnCell(bp, model),
        hiddenStarIndexes: bp.stars.flatMap((star, index) => (star.angles.includes(0) ? [] : [index])),
        visibleStarIndexes: bp.stars.flatMap((star, index) => (star.angles.includes(model.o) && !model.stars[index] ? [index] : [])),
        links: linkViews.map((view) => ({ id: view.link.id, open: view.open, fold: Number(view.fold.toFixed(3)) })),
        hazards: bp.hazards.map((hazard) => ({ id: hazard.id, cell: rules.hazardCell(hazard, model.t), next: rules.hazardCell(hazard, model.t + 1) })),
        rotationModel: "book-90-degree-steps",
        reachabilityModel: "grid-beat-rules",
        tiltShift: engine.profile.tiltShift,
        postProcessing: engine.postProcessingState(),
        reducedMotion,
        decor: decorStats,
        decorItems: decorItems.map((item) => ({ kind: item.kind, x: Number(item.x.toFixed(2)), z: Number(item.z.toFixed(2)), height: Number(item.height.toFixed(2)), main: item.main, layers: item.layers, occludes: item.occludes, clearance: Number(item.clearance.toFixed(2)) })),
      } : null,
    };
  },
  enqueue(actions) { return enqueue(Array.isArray(actions) ? actions : [actions]); },
  /** 确定性回放：从本关 t=0 重开并一次性入队，保证与求解器的节拍模型一致。 */
  replay(actions, nextBeatMs) {
    resetGame();
    if (nextBeatMs) beatMs = Math.max(30, Number(nextBeatMs) || beatMs);
    introClock = -1; rightPage.setLocalEulerAngles(0, 0, 0); level.setLocalScale(1, 1, 1);
    return enqueue(Array.isArray(actions) ? actions : config.solutions[blueprint.id] || []);
  },
  rotate(direction) { return performRotation(direction === "ccw" ? "ccw" : "cw"); },
  moveTo(x, z) { return moveTowards({ x: Number(x), z: Number(z) }); },
  solution() { return config.solutions[blueprint.id] || []; },
  jumpIntoVoid() {
    if (!state.running) return false;
    const direction = rules.DIRECTION_ORDER.find((candidate) => { const jump = rules.jumpTarget(blueprint, model, candidate); return !jump.blocked && jump.falls; });
    if (!direction) return false;
    queue.splice(0); queue.push("j" + direction); tick();
    return true;
  },
  forceWin() { if (!blueprint) return; model.done = true; completeLevel(); },
  forceFail() { showResult(false); },
  setLevel(levelNumber) { campaignLevelIndex = Math.max(0, Math.min(config.blueprints.length - 1, Number(levelNumber) - 1)); campaignMaxUnlocked = Math.max(campaignMaxUnlocked, campaignLevelIndex); syncCampaignUi(); saveCampaign(); },
});
installDebugApi(gameDebugApi);
`;
