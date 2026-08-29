// 玩法节奏参考 Super Mario Run / Celeste / Oddmar；未引入其代码或资产。
export const platformerScript = String.raw`
const portraitPlatformer = config.aspectRatio === "9:16";
const platformerScale = portraitPlatformer ? 1.35 : 1;
const world = { width: 720, height: portraitPlatformer ? 1280 : 720, gravity: 1720 };
const platformerLevelBlueprints = [
  { name: "轻羽起步", chapter: "云芽坡", skill: "短跳与落点", xs: [72,246,448,286,92,330,526], kinds: ["fixed","fixed","fixed","fixed","fixed","fixed","fixed"], width: 156, hazards: [], wind: [], dash: [], key: -1, patrols: [] },
  { name: "长风落点", chapter: "云芽坡", skill: "长按跳跃", xs: [84,302,516,356,132,394,548], kinds: ["fixed","fixed","fixed","fixed","fixed","fixed","fixed"], width: 146, hazards: [258], wind: [], dash: [], key: -1, patrols: [] },
  { name: "星核岔路", chapter: "云芽坡", skill: "高低路线", xs: [58,228,456,530,302,96,370,544], kinds: ["fixed","fixed","fixed","fixed","fixed","fixed","fixed","fixed"], width: 140, hazards: [212,458], wind: [], dash: [], key: -1, patrols: [] },
  { name: "坡顶信标", chapter: "云芽坡", skill: "连续稳定跳", xs: [86,278,494,310,102,332,548,420], kinds: ["fixed","fixed","fixed","fixed","fixed","fixed","fixed","fixed"], width: 136, hazards: [250,442], wind: [], dash: [], key: -1, patrols: [] },
  { name: "往返云台", chapter: "风琴峡", skill: "水平移动台", xs: [70,246,474,300,100,342,536], kinds: ["fixed","moving-h","fixed","moving-h","fixed","moving-h","fixed"], width: 140, hazards: [220], wind: [], dash: [], key: -1, patrols: [] },
  { name: "弹簧花径", chapter: "风琴峡", skill: "弹跳云", xs: [78,274,486,332,126,356,548], kinds: ["fixed","bounce","fixed","bounce","fixed","bounce","fixed"], width: 136, hazards: [240,446], wind: [], dash: [], key: -1, patrols: [] },
  { name: "碎云踏板", chapter: "风琴峡", skill: "限时离开", xs: [62,232,452,522,306,92,354,546], kinds: ["fixed","crumble","fixed","crumble","fixed","crumble","fixed","fixed"], width: 132, hazards: [204,462], wind: [], dash: [], key: -1, patrols: [] },
  { name: "风琴追逐", chapter: "风琴峡", skill: "移动与弹跳组合", xs: [88,284,500,348,118,378,546,436], kinds: ["fixed","moving-v","bounce","moving-h","crumble","moving-v","bounce","fixed"], width: 128, hazards: [244,438], wind: [], dash: [], key: -1, patrols: [{ platform: 4 }] },
  { name: "脉冲门钥", chapter: "雷芽站", skill: "钥匙与门", xs: [64,248,476,314,104,354,542], kinds: ["fixed","fixed","moving-h","fixed","fixed","moving-v","fixed"], width: 132, hazards: [222], wind: [], dash: [], key: 3, patrols: [] },
  { name: "逆风横渡", chapter: "雷芽站", skill: "风场修正", xs: [72,270,510,352,132,384,544], kinds: ["fixed","fixed","fixed","moving-h","fixed","fixed","fixed"], width: 128, hazards: [236,444], wind: [{ from: 2, to: 4, force: -180 }], dash: [], key: -1, patrols: [] },
  { name: "跃迁冲刺", chapter: "雷芽站", skill: "空中冲刺", xs: [54,232,506,336,88,374,548], kinds: ["fixed","fixed","fixed","crumble","fixed","fixed","fixed"], width: 124, hazards: [198,450], wind: [], dash: [2,5], key: -1, patrols: [] },
  { name: "雷芽守门", chapter: "雷芽站", skill: "风场冲刺组合", xs: [88,286,508,330,112,350,534,430], kinds: ["fixed","moving-h","crumble","moving-v","bounce","fixed","moving-h","fixed"], width: 122, hazards: [240,432], wind: [{ from: 3, to: 5, force: 210 }], dash: [2,6], key: 4, patrols: [{ platform: 2 }] },
  { name: "明灭云阶", chapter: "镜云庭", skill: "相位平台", xs: [64,242,468,536,316,98,354,544], kinds: ["fixed","phase","fixed","phase","fixed","phase","fixed","fixed"], width: 126, hazards: [212,458], wind: [], dash: [], key: -1, patrols: [] },
  { name: "镜像岔道", chapter: "镜云庭", skill: "路线判断", xs: [86,306,520,360,132,400,548,430], kinds: ["fixed","moving-v","phase","fixed","crumble","phase","bounce","fixed"], width: 122, hazards: [256,448], wind: [{ from: 4, to: 6, force: -160 }], dash: [5], key: -1, patrols: [] },
  { name: "巡游星兽", chapter: "镜云庭", skill: "观察巡逻", xs: [58,236,464,526,310,88,350,542], kinds: ["fixed","fixed","moving-h","fixed","bounce","fixed","moving-v","fixed"], width: 120, hazards: [202,452], wind: [], dash: [4], key: -1, patrols: [{ platform: 2 },{ platform: 5 }] },
  { name: "镜庭逃逸", chapter: "镜云庭", skill: "动态机关链", xs: [82,282,500,344,110,368,540,420], kinds: ["fixed","phase","moving-h","crumble","bounce","moving-v","phase","fixed"], width: 116, hazards: [236,432], wind: [{ from: 2, to: 4, force: 190 }], dash: [3,6], key: 4, patrols: [{ platform: 5 }] },
  { name: "四式复习", chapter: "天门核", skill: "四类平台复习", xs: [70,250,478,324,92,348,536,424], kinds: ["fixed","moving-h","bounce","crumble","phase","moving-v","fixed","fixed"], width: 118, hazards: [214,446], wind: [], dash: [5], key: -1, patrols: [{ platform: 3 }] },
  { name: "零伤星路", chapter: "天门核", skill: "风险路线", xs: [54,224,448,522,302,84,340,538], kinds: ["fixed","crumble","phase","moving-h","bounce","phase","moving-v","fixed"], width: 114, hazards: [190,390,484], wind: [{ from: 3, to: 6, force: -205 }], dash: [2,5], key: 4, patrols: [{ platform: 2 },{ platform: 6 }] },
  { name: "极限云脊", chapter: "天门核", skill: "连续机制组合", xs: [88,292,516,356,116,378,548,428], kinds: ["fixed","moving-v","crumble","phase","bounce","moving-h","phase","fixed"], width: 110, hazards: [242,426], wind: [{ from: 2, to: 5, force: 225 }], dash: [3,6], key: 5, patrols: [{ platform: 2 },{ platform: 4 }] },
  { name: "天门重启", chapter: "天门核", skill: "完整技巧终考", xs: [60,238,468,536,316,92,352,542,408], kinds: ["fixed","phase","moving-h","crumble","bounce","moving-v","phase","moving-h","fixed"], width: 108, hazards: [198,386,470], wind: [{ from: 3, to: 6, force: -230 }], dash: [2,5,7], key: 6, patrols: [{ platform: 2 },{ platform: 4 },{ platform: 7 }] },
];
const platformMechanics = ["fixed","moving-h","moving-v","bounce","crumble","phase","wind","dash","key-gate","patrol"];
const platformStages = ["读图起步", "机制展开", "组合考验", "终点冲刺"];
let activeBlueprint;
let platforms = [];
let hazardZones = [];
let windZones = [];
let dashNodes = [];
let patrols = [];
let platformCoins = [];
let platformGoal = { x: 620, y: 260, width: 52, height: 92 };
let groundY = portraitPlatformer ? 1224 : 664;
let player;
let coinsCollected = 0;
let coinTarget = 4;
let platformLives = 3;
let platformFrame = null;
let platformLast = 0;
let coyoteUntil = 0;
let jumpBufferedUntil = 0;
let jumpHeld = false;
let jumpStartedAt = 0;
let invulnerableUntil = 0;
let recoveringUntil = 0;
let platformCameraX = 360;
let platformCameraY = 0;
let landingPulseUntil = 0;
let launchStretchUntil = 0;
let dashPulseUntil = 0;
let platformStage = 0;
let stageAnnounceUntil = 0;
let lastCheckpoint = { x: 52, y: groundY - 64, stage: 0 };
let safeLandingPreview = [];
let held = { left: false, right: false };
let platformKeyCollected = false;
let dashCharges = 0;
let deaths = 0;
let currentPlatformId = null;
let platformPointerHandledUntil = 0;

function platformY(index) {
  const portraitY = 1092 - index * 118 - (index % 3 === 1 ? 10 : 0);
  return portraitPlatformer ? portraitY : 586 - index * 67;
}

function buildPlatformerLevel(levelNumber) {
  activeBlueprint = platformerLevelBlueprints[Math.max(0, Math.min(19, levelNumber - 1))];
  groundY = portraitPlatformer ? 1224 : 664;
  const tier = currentCampaignLevel().tier;
  const widthPressure = tier <= 1 ? 1.05 : tier >= 5 ? .94 : 1;
  platforms = [{ id: "ground", x: 0, y: groundY, width: 720, height: 56, kind: "fixed", stage: 0, checkpoint: true, active: true }];
  activeBlueprint.xs.forEach((x, index) => {
    const kind = activeBlueprint.kinds[index] || "fixed";
    const width = Math.max(96, Math.round((activeBlueprint.width + ((index * 17 + levelNumber * 11) % 25)) * widthPressure));
    const y = platformY(index);
    platforms.push({ id: "p" + index, x: Math.min(720 - width - 12, x), y, width, height: 22, kind, stage: Math.min(3, Math.floor(index / Math.max(1, activeBlueprint.xs.length / 4))), checkpoint: index === 2 || index === 5 || index === activeBlueprint.xs.length - 1, originX: Math.min(720 - width - 12, x), originY: y, active: true, crumbleAt: 0, respawnAt: 0, dx: 0, dy: 0 });
  });
  const hazardY = groundY - 18;
  hazardZones = activeBlueprint.hazards.map((x, index) => ({ id: "h" + index, x, y: hazardY, width: 44 + (index % 2) * 12, height: 20 }));
  windZones = activeBlueprint.wind.map((wind, index) => {
    const from = platforms[Math.min(platforms.length - 1, wind.from + 1)];
    const to = platforms[Math.min(platforms.length - 1, wind.to + 1)];
    return { id: "w" + index, x: Math.min(from.x, to.x) - 30, y: Math.min(from.y, to.y) - 130, width: Math.abs(to.x - from.x) + 180, height: Math.abs(to.y - from.y) + 220, force: wind.force };
  });
  dashNodes = activeBlueprint.dash.map((platformIndex, index) => { const platform = platforms[Math.min(platforms.length - 1, platformIndex + 1)]; return { id: "d" + index, x: platform.x + platform.width / 2, y: platform.y - 56, collected: false }; });
  patrols = activeBlueprint.patrols.map((entry, index) => { const platform = platforms[Math.min(platforms.length - 1, entry.platform + 1)]; return { id: "e" + index, platformId: platform.id, x: platform.x + 18, y: platform.y - 38, width: 34, height: 34, direction: index % 2 ? -1 : 1 }; });
  platformCoins = platforms.slice(1).map((platform, index) => ({ id: "c" + index, x: platform.x + platform.width * (index % 2 ? .32 : .68), y: platform.y - 42, drawX: 0, drawY: 0, collected: false }));
  platformCoins.forEach((coin) => { coin.drawX = coin.x; coin.drawY = coin.y; });
  const finalPlatform = platforms[platforms.length - 1];
  platformGoal = { x: Math.min(650, finalPlatform.x + finalPlatform.width - 52), y: finalPlatform.y - 92, width: 48, height: 92 };
}

function rectsOverlap(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }

function resetPlayer(useCheckpoint = true) {
  const spawn = useCheckpoint ? lastCheckpoint : { x: 52, y: groundY - 64, stage: 0 };
  player = { x: spawn.x, y: spawn.y, width: 52, height: 64, vx: 0, vy: 0, grounded: false };
  platformStage = spawn.stage; currentPlatformId = null; jumpHeld = false;
}

function updatePlatformMechanics(timestamp) {
  platforms.forEach((platform) => {
    const previousX = platform.x; const previousY = platform.y;
    const phase = Number(platform.id.replace("p", "")) * .63 + currentCampaignLevel().variant * .51;
    if (platform.kind === "moving-h") platform.x = platform.originX + Math.sin(timestamp / 860 + phase) * (72 + currentCampaignLevel().tier * 7);
    if (platform.kind === "moving-v") platform.y = platform.originY + Math.sin(timestamp / 940 + phase) * (42 + currentCampaignLevel().tier * 4);
    if (platform.kind === "phase") platform.active = Math.sin(timestamp / 920 + phase) > -.45;
    if (platform.kind === "crumble" && platform.crumbleAt && timestamp >= platform.crumbleAt) { platform.active = false; if (!platform.respawnAt) platform.respawnAt = timestamp + 1650; }
    if (platform.kind === "crumble" && platform.respawnAt && timestamp >= platform.respawnAt) { platform.active = true; platform.crumbleAt = 0; platform.respawnAt = 0; }
    platform.dx = platform.x - previousX; platform.dy = platform.y - previousY;
  });
  const standing = platforms.find((platform) => platform.id === currentPlatformId && platform.active);
  if (standing && player.grounded) { player.x += standing.dx; player.y += standing.dy; }
  patrols.forEach((enemy) => { const platform = platforms.find((item) => item.id === enemy.platformId); if (!platform || !platform.active) return; enemy.x += enemy.direction * (.75 + currentCampaignLevel().tier * .08); if (enemy.x < platform.x + 8 || enemy.x + enemy.width > platform.x + platform.width - 8) enemy.direction *= -1; enemy.y = platform.y - enemy.height; });
}

function performJump() {
  player.vy = config.difficulty === "challenging" ? -760 : portraitPlatformer ? -724 : -630; player.grounded = false; currentPlatformId = null; coyoteUntil = 0; launchStretchUntil = performance.now() + 170; jumpStartedAt = performance.now(); playSound("move");
}

function performDash() {
  if (dashCharges <= 0) return false;
  const direction = held.left ? -1 : held.right ? 1 : player.vx < -20 ? -1 : 1;
  player.vx = direction * 520; player.vy = -90; dashCharges -= 1; dashPulseUntil = performance.now() + 260; playSound("reward"); setStatus("星核冲刺已释放；寻找下一枚蓝色跃迁核补充。 "); return true;
}

function pressJump() {
  if (!running || jumpHeld || performance.now() < recoveringUntil) return;
  jumpHeld = true;
  if (!player.grounded && performance.now() > coyoteUntil && dashCharges > 0) { performDash(); return; }
  if (!player.grounded && performance.now() > coyoteUntil) { jumpBufferedUntil = performance.now() + 150; return; }
  performJump();
}

function releaseJump() { if (!jumpHeld) return; const heldFor = performance.now() - jumpStartedAt; jumpHeld = false; if (player.vy < -170 && heldFor < 235) player.vy *= .5; }

function landOnPlatforms(previousBottom, timestamp) {
  const wasGrounded = player.grounded; player.grounded = false; currentPlatformId = null;
  for (const platform of platforms) {
    if (!platform.active || player.vy < 0) continue;
    const horizontal = player.x + player.width > platform.x + 2 && player.x < platform.x + platform.width - 2;
    if (horizontal && previousBottom <= platform.y + Math.max(7, player.vy * .03) && player.y + player.height >= platform.y) {
      player.y = platform.y - player.height; player.vy = platform.kind === "bounce" ? -850 : 0; player.grounded = platform.kind !== "bounce"; currentPlatformId = player.grounded ? platform.id : null;
      coyoteUntil = timestamp + (config.difficulty === "relaxed" ? 135 : config.difficulty === "challenging" ? 110 : 122);
      if (!wasGrounded) { landingPulseUntil = timestamp + 180; playSound("hit"); }
      if (platform.kind === "bounce") { launchStretchUntil = timestamp + 210; playSound("reward"); }
      if (platform.kind === "crumble" && !platform.crumbleAt) platform.crumbleAt = timestamp + (config.difficulty === "relaxed" ? 820 : 620);
      if (platform.checkpoint && platform.stage >= lastCheckpoint.stage) lastCheckpoint = { x: platform.x + Math.min(22, platform.width * .18), y: platform.y - player.height, stage: platform.stage };
      if (timestamp <= jumpBufferedUntil && player.grounded) { jumpBufferedUntil = 0; performJump(); }
      return;
    }
  }
}

function hurtPlayer(reason) {
  const now = performance.now(); if (now < invulnerableUntil || now < recoveringUntil) return;
  platformLives -= 1; deaths += 1;
  if (platformLives <= 0) { showResult(false, "跃迁中断", reason + "，能量核心已经耗尽。 "); return; }
  recoveringUntil = now + 430; invulnerableUntil = now + 1250; held = { left: false, right: false };
  setStatus(reason + " · 0.43 秒后从“" + platformStages[lastCheckpoint.stage] + "”检查点恢复。剩余 " + platformLives + " 点能量。 "); playSound("fail");
  setTimeout(() => { if (running) resetPlayer(true); }, 430);
}

function updatePlatformer(delta, timestamp) {
  const seconds = Math.min(.028, delta / 1000); if (timestamp < recoveringUntil) return; updatePlatformMechanics(timestamp);
  const acceleration = player.grounded ? 2200 : 1420; if (held.left) player.vx -= acceleration * seconds; if (held.right) player.vx += acceleration * seconds; if (!held.left && !held.right) player.vx *= player.grounded ? .7 : .965;
  windZones.forEach((zone) => { if (rectsOverlap(player, zone)) player.vx += zone.force * seconds; });
  const horizontalSpeedLimit = timestamp < dashPulseUntil ? 560 : 300;
  player.vx = Math.max(-horizontalSpeedLimit, Math.min(horizontalSpeedLimit, player.vx)); player.vy += world.gravity * seconds;
  const previousBottom = player.y + player.height; player.x = Math.max(0, Math.min(world.width - player.width, player.x + player.vx * seconds)); player.y += player.vy * seconds; landOnPlatforms(previousBottom, timestamp);
  const nextStage = Math.max(0, Math.min(3, platforms.reduce((highest, platform) => player.y <= platform.y + 26 ? Math.max(highest, platform.stage) : highest, 0)));
  if (nextStage > platformStage) { platformStage = nextStage; stageAnnounceUntil = timestamp + 1050; setStatus("第 " + (platformStage + 1) + " 段 · " + platformStages[platformStage] + "。本关技巧：" + activeBlueprint.skill + "。 "); playSound("reward"); }
  safeLandingPreview = platforms.filter((platform) => platform.active && platform.id !== "ground" && platform.y < player.y + player.height - 10 && platform.y > player.y - 235 && Math.abs(platform.x + platform.width / 2 - (player.x + player.width / 2)) < 255).sort((a, b) => b.y - a.y).slice(0, currentCampaignLevel().tier >= 4 ? 1 : 2);
  const visibleWidth = canvas.width / platformerScale; const visibleHeight = gameSceneHeight() / platformerScale; const lookAhead = Math.max(-72, Math.min(72, player.vx * .24)); const targetX = Math.max(visibleWidth / 2, Math.min(world.width - visibleWidth / 2, player.x + player.width / 2 + lookAhead)); const targetY = Math.max(0, Math.min(world.height - visibleHeight, player.y - visibleHeight * .62)); platformCameraX += (targetX - platformCameraX) * Math.min(1, seconds * 5.2); platformCameraY += (targetY - platformCameraY) * Math.min(1, seconds * 4.6);
  hazardZones.forEach((hazard) => { if (rectsOverlap(player, hazard)) hurtPlayer("落入裂隙"); }); patrols.forEach((enemy) => { if (rectsOverlap(player, enemy)) hurtPlayer("撞上巡游星兽"); }); if (player.y > world.height + 70) hurtPlayer("跌出浮岛边界");
  dashNodes.forEach((node) => { if (!node.collected && Math.hypot(player.x + player.width / 2 - node.x, player.y + player.height / 2 - node.y) < 42) { node.collected = true; dashCharges = Math.min(2, dashCharges + 1); playSound("success"); setStatus("获得跃迁冲刺；在空中再次按跳跃键释放。 "); } });
  if (activeBlueprint.key >= 0 && !platformKeyCollected) { const keyPlatform = platforms[Math.min(platforms.length - 1, activeBlueprint.key + 1)]; const keyRect = { x: keyPlatform.x + keyPlatform.width / 2 - 16, y: keyPlatform.y - 54, width: 32, height: 32 }; if (rectsOverlap(player, keyRect)) { platformKeyCollected = true; playSound("success"); setStatus("脉冲钥匙已取得，终点天门解除封锁。 "); } }
  platformCoins.forEach((coin) => { if (coin.collected) return; const centerX = player.x + player.width / 2; const centerY = player.y + player.height / 2; const distance = Math.hypot(centerX - coin.drawX, centerY - coin.drawY); if (distance < 112) { const attraction = Math.min(1, seconds * (distance < 54 ? 12 : 5.2)); coin.drawX += (centerX - coin.drawX) * attraction; coin.drawY += (centerY - coin.drawY) * attraction; } if (rectsOverlap(player, { x: coin.drawX - 15, y: coin.drawY - 15, width: 30, height: 30 })) { coin.collected = true; coinsCollected += 1; setMetric(coinsCollected + " / " + coinTarget); playSound("success"); } });
  const atGoal = rectsOverlap(player, platformGoal); const gateOpen = activeBlueprint.key < 0 || platformKeyCollected;
  if (atGoal && coinsCollected >= coinTarget && gateOpen) showResult(true, activeBlueprint.name + "完成", "你掌握了“" + activeBlueprint.skill + "”，并点亮了" + activeBlueprint.chapter + "的信标。 "); else if (atGoal && !gateOpen) setStatus("天门仍被锁定；先取得本关的脉冲钥匙。 "); else if (atGoal) setStatus("信标需要 " + coinTarget + " 枚星核，目前已收集 " + coinsCollected + " 枚。 ");
}

function drawPlatformKind(platform, index, timestamp) {
  const alpha = platform.active ? 1 : .24; ctx.save(); ctx.globalAlpha = alpha;
  if (platform.id === "ground") {
    ctx.fillStyle = "rgba(18,43,50,.82)"; ctx.fillRect(platform.x, platform.y + 10, platform.width, platform.height);
    for (let x = platform.x - 12; x < platform.x + platform.width; x += 178) {
      drawBitmapSprite(2, x, platform.y - 10, 190, 86, { fallback: palette.pieces[2], padding: 0 });
    }
  } else {
    const artWidth = platform.width + 22; const artHeight = Math.max(54, artWidth / 2.15);
    drawBitmapSprite(index % 2 ? 3 : 2, platform.x - 11, platform.y - 8, artWidth, artHeight, { fallback: palette.pieces[(index + 1) % palette.pieces.length], padding: 0 });
  }
  if (platform.kind === "bounce") { ctx.strokeStyle = palette.secondary; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(platform.x + platform.width / 2, platform.y + 3, 16 + Math.sin(timestamp / 110) * 4, Math.PI, 0); ctx.stroke(); }
  if (platform.kind === "crumble") { ctx.strokeStyle = palette.primary; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(platform.x + platform.width * .34, platform.y); ctx.lineTo(platform.x + platform.width * .5, platform.y + 12); ctx.lineTo(platform.x + platform.width * .66, platform.y); ctx.stroke(); }
  if (platform.kind === "phase") { ctx.setLineDash([8,6]); ctx.strokeStyle = palette.highlight; ctx.lineWidth = 3; ctx.strokeRect(platform.x + 5, platform.y - 4, platform.width - 10, platform.height + 8); }
  if (platform.checkpoint && platform.id !== "ground" && index < platforms.length - 1) drawBitmapSprite(8, platform.x + 5, platform.y - 60, 62, 66, { fallback: palette.highlight, padding: 1 });
  ctx.restore();
}

function drawPlatformer(timestamp = 0) {
  clearCanvas(); ctx.save(); ctx.translate(0, gameSceneTop()); ctx.translate(canvas.width / 2, 0); ctx.scale(platformerScale, platformerScale); ctx.translate(-platformCameraX, -platformCameraY);
  drawPlayfield(24, 18, 672, world.height - 36, { radius: 28, alpha: .18, fill: palette.surfaceSoft, stroke: "rgba(126,226,232,.16)" });
  windZones.forEach((zone) => { ctx.save(); ctx.globalAlpha = .24; ctx.strokeStyle = palette.highlight; ctx.lineWidth = 3; for (let y = zone.y + 28; y < zone.y + zone.height; y += 34) { ctx.beginPath(); const start = zone.force > 0 ? zone.x + 12 : zone.x + zone.width - 12; const end = zone.force > 0 ? zone.x + zone.width - 12 : zone.x + 12; ctx.moveTo(start,y); ctx.lineTo(end,y); ctx.stroke(); } ctx.restore(); });
  safeLandingPreview.forEach((platform, index) => { ctx.save(); ctx.globalAlpha = .42 - index * .1; ctx.strokeStyle = palette.highlight; ctx.lineWidth = 4; ctx.setLineDash([10,8]); ctx.strokeRect(platform.x - 8, platform.y - 18, platform.width + 16, platform.height + 28); ctx.restore(); });
  platforms.forEach((platform, index) => drawPlatformKind(platform, index, timestamp));
  hazardZones.forEach((hazard) => { ctx.fillStyle = palette.primary; for (let x = hazard.x; x < hazard.x + hazard.width; x += 13) { ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x + 6.5, hazard.y); ctx.lineTo(x + 13, groundY); ctx.fill(); } });
  platformCoins.forEach((coin) => { if (!coin.collected) { const pulse = 1 + Math.sin(timestamp / 180 + coin.x) * .12; drawBitmapSprite(4, coin.drawX - 15 * pulse, coin.drawY - 15 * pulse, 30 * pulse, 30 * pulse, { fallback: palette.secondary, circle: true, padding: 7 }); } });
  dashNodes.forEach((node) => { if (!node.collected) drawBitmapSprite(7, node.x - 23, node.y - 30, 46, 60, { fallback: "#6fe8ff", rotation: timestamp / 2400, padding: 3 }); });
  if (activeBlueprint?.key >= 0 && !platformKeyCollected) { const keyPlatform = platforms[Math.min(platforms.length - 1, activeBlueprint.key + 1)]; ctx.fillStyle = "#ffd86b"; ctx.beginPath(); ctx.arc(keyPlatform.x + keyPlatform.width / 2, keyPlatform.y - 40, 12, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(keyPlatform.x + keyPlatform.width / 2 + 8, keyPlatform.y - 43, 19, 7); }
  patrols.forEach((enemy) => { drawBitmapSprite(6, enemy.x - 5, enemy.y - 7, enemy.width + 10, enemy.height + 14, { fallback: palette.primary, padding: 3, mirrorX: enemy.direction < 0 }); });
  drawBitmapSprite(5, platformGoal.x - 35, platformGoal.y - 42, 118, 132, { fallback: platformKeyCollected || activeBlueprint?.key < 0 ? palette.accent : palette.muted, padding: 2 });
  if (!(performance.now() < invulnerableUntil && Math.floor(performance.now() / 90) % 2) && performance.now() >= recoveringUntil) { const landing = performance.now() < landingPulseUntil; const launching = performance.now() < launchStretchUntil; const dashing = performance.now() < dashPulseUntil; drawBitmapSprite(player.vx < 0 ? 1 : 0, player.x - 16 - (dashing && player.vx > 0 ? 12 : 0), player.y - 16, player.width + 32 + (dashing ? 22 : 0), player.height + 32, { fallback: palette.primary, scaleX: landing ? 1.12 : launching ? .9 : dashing ? 1.2 : 1, scaleY: landing ? .88 : launching ? 1.13 : dashing ? .86 : 1 }); }
  ctx.restore(); ctx.save(); ctx.fillStyle = "rgba(8,25,36,.78)"; ctx.strokeStyle = palette.highlight; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(44, gameSceneTop() + 38, 330, 66, 18); ctx.fill(); ctx.stroke(); ctx.fillStyle = palette.highlight; ctx.font = "800 16px Inter, sans-serif"; ctx.fillText(activeBlueprint.chapter + " · " + activeBlueprint.name, 64, gameSceneTop() + 67); ctx.fillStyle = "rgba(231,250,255,.82)"; ctx.font = "700 13px Inter, sans-serif"; ctx.fillText("0" + (platformStage + 1) + "/04  " + activeBlueprint.skill + "  ·  能量 " + platformLives + "  ·  冲刺 " + dashCharges, 64, gameSceneTop() + 91); if (timestamp < stageAnnounceUntil) { ctx.globalAlpha = Math.min(1,(stageAnnounceUntil - timestamp) / 330); drawBitmapSprite(8, 500, gameSceneTop() + 8, 148, 148, { fallback: palette.secondary, alpha: ctx.globalAlpha }); } ctx.restore(); finishCanvasStyle();
}

function platformLoop(timestamp) { if (!running) return; const delta = platformLast ? timestamp - platformLast : 16.67; platformLast = timestamp; updatePlatformer(delta, timestamp); drawPlatformer(timestamp); if (running) platformFrame = requestAnimationFrame(platformLoop); }

function startGame() {
  if (platformFrame) cancelAnimationFrame(platformFrame);
  const level = currentCampaignLevel(); buildPlatformerLevel(level.number);
  const baseGravity = config.difficulty === "relaxed" ? 1490 : config.difficulty === "challenging" ? 1910 : 1700; world.gravity = Math.round(baseGravity * (.94 + (level.tier - 1) * .035));
  coinTarget = Math.min(platformCoins.length, Math.max(3, Math.round((config.difficulty === "relaxed" ? 3 : config.difficulty === "challenging" ? 5 : 4) * level.goalMultiplier)));
  lastCheckpoint = { x: 52, y: groundY - 64, stage: 0 }; resetPlayer(false); platformLives = config.difficulty === "challenging" ? 2 : config.difficulty === "relaxed" ? 4 : 3; coinsCollected = 0; platformKeyCollected = false; dashCharges = 0; deaths = 0; held = { left: false, right: false }; jumpBufferedUntil = 0; recoveringUntil = 0; platformCameraX = portraitPlatformer ? canvas.width / platformerScale / 2 : 360; platformCameraY = Math.max(0, groundY - gameSceneHeight() / platformerScale); landingPulseUntil = 0; launchStretchUntil = 0; dashPulseUntil = 0; platformStage = 0; stageAnnounceUntil = performance.now() + 1050; safeLandingPreview = []; running = true; platformLast = 0; hideOverlay(); setMetric("0 / " + coinTarget); setStatus("第 " + level.number + " 关 · " + activeBlueprint.chapter + " / " + activeBlueprint.name + " · 技巧目标：" + activeBlueprint.skill + "。 "); startAmbient(); platformFrame = requestAnimationFrame(platformLoop);
}

function handleControl(value) { if (performance.now() < platformPointerHandledUntil) return; if (value === "left") { held.left = true; setTimeout(() => { held.left = false; }, 190); } if (value === "right") { held.right = true; setTimeout(() => { held.right = false; }, 190); } if (value === "jump") { pressJump(); setTimeout(releaseJump, 125); } }
function handleKey(key) { if (key === "ArrowLeft" || key.toLowerCase() === "a") held.left = true; if (key === "ArrowRight" || key.toLowerCase() === "d") held.right = true; if ((key === "ArrowUp" || key.toLowerCase() === "w" || key === " ") && !jumpHeld) pressJump(); }
window.addEventListener("keyup", (event) => { if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") held.left = false; if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") held.right = false; if (event.key === "ArrowUp" || event.key.toLowerCase() === "w" || event.key === " ") releaseJump(); });

document.querySelectorAll('[data-control="left"],[data-control="right"],[data-control="jump"]').forEach((button) => {
  const value = button.dataset.control;
  button.addEventListener("pointerdown", (event) => { if (!running) return; platformPointerHandledUntil = performance.now() + 280; button.setPointerCapture?.(event.pointerId); if (value === "jump") pressJump(); else held[value] = true; });
  const release = (event) => { platformPointerHandledUntil = performance.now() + 180; if (value === "jump") releaseJump(); else held[value] = false; if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId); };
  button.addEventListener("pointerup", release); button.addEventListener("pointercancel", release); button.addEventListener("lostpointercapture", () => { if (value !== "jump") held[value] = false; });
});

runtimeDebugActions = {
  holdRightAndJump: () => { held.right = true; pressJump(); setTimeout(() => { releaseJump(); held.right = false; }, 220); },
  grantDash: () => { dashCharges = 1; },
  useDash: () => { player.grounded = false; dashCharges = Math.max(1, dashCharges); jumpHeld = false; pressJump(); },
  damageOnce: () => { invulnerableUntil = 0; recoveringUntil = 0; hurtPlayer("质量探针受击"); },
  forceLoss: () => { platformLives = 1; invulnerableUntil = 0; recoveringUntil = 0; hurtPlayer("质量探针失败"); },
};

runtimeDebugState = () => ({
  level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, blueprintName: activeBlueprint?.name, chapter: activeBlueprint?.chapter, skill: activeBlueprint?.skill,
  layoutSignature: platforms.map((platform) => [Math.round(platform.originX ?? platform.x), Math.round(platform.originY ?? platform.y), platform.kind]).join("|"),
  mechanics: [...new Set([...(platforms.map((platform) => platform.kind)), ...(windZones.length ? ["wind"] : []), ...(dashNodes.length ? ["dash"] : []), ...(activeBlueprint?.key >= 0 ? ["key-gate"] : []), ...(patrols.length ? ["patrol"] : [])])],
  mechanicCatalog: platformMechanics, coinsCollected, coinTarget, lives: platformLives, deaths, checkpointStage: lastCheckpoint.stage, safeLandingCount: safeLandingPreview.length,
  stage: platformStage, stageCount: platformStages.length, stageLabels: [...platformStages], camera: { x: Math.round(platformCameraX), y: Math.round(platformCameraY), mode: "dead-zone-look-ahead" },
  player: { x: Math.round(player.x), y: Math.round(player.y), width: player.width, height: player.height, vx: Math.round(player.vx), vy: Math.round(player.vy), grounded: player.grounded },
  playerVisibleWidthRatio: Math.round(player.width / (canvas.width / platformerScale) * 1000) / 10, gravity: world.gravity, hazardCount: hazardZones.length, dashCharges, keyRequired: activeBlueprint?.key >= 0, keyCollected: platformKeyCollected,
  jumpModel: { coyoteMs: config.difficulty === "relaxed" ? 135 : config.difficulty === "challenging" ? 110 : 122, bufferMs: 150, variableHeight: true }, recoveryMs: 430, touchModel: "simultaneous-hold-and-jump", platformCount: platforms.length, patrolCount: patrols.length,
});

buildPlatformerLevel(currentCampaignLevel().number); resetPlayer(false); drawPlatformer();
`;
