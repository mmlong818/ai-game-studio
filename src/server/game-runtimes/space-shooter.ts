// 玩法结构移植自 Jack Rugile 的 Radius Raid js13k 版本（MIT）。本文件未复制上游视听资产。
export const spaceShooterScript = String.raw`
let ship;
let bullets = [];
let enemies = [];
let pickups = [];
let particles = [];
let shooterLives = 3;
let shooterMaxLives = 3;
let kills = 0;
let shooterFrame = null;
let shooterLast = 0;
let nextEnemyAt = 0;
let nextShotAt = 0;
let shipInvulnerableUntil = 0;
let shooterStartedAt = 0;
let shooterPointerId = null;
let shooterCombo = 0;
let lastKillAt = 0;
let rapidFireUntil = 0;
let shooterGrazeCount = 0;
let shooterPointerMoves = 0;
let shooterHeld = { left: false, right: false };
let killTarget = 28;
let shooterInputAuditActive = false;
let shooterFrameCount = 0;
let shooterMaxFrameGapMs = 0;
let shooterLastPointerMoveAt = 0;
let shooterMaxPointerGapMs = 0;
let shooterPointerTarget = null;
let shooterPointerType = "none";

function shooterSceneHeight() {
  return gameSceneHeight();
}

function spawnEnemy(timestamp) {
  const learningPhase = timestamp - shooterStartedAt < 15000;
  const eliteChance = .12 + currentCampaignLevel().tier * .035;
  const elite = !learningPhase && kills > killTarget * .35 && campaignRandom() < eliteChance;
  enemies.push({
    x: 48 + campaignRandom() * 624,
    y: -40,
    width: elite ? 58 : 44,
    height: elite ? 48 : 38,
    speed: ((elite ? 92 : 118) + campaignRandom() * 38 + kills * 1.1) * campaignScale("speedMultiplier"),
    hp: elite ? 2 : 1,
    phase: campaignRandom() * Math.PI * 2,
    warningUntil: timestamp + (learningPhase ? 920 : 620),
    elite,
  });
  const baseDelay = learningPhase ? 1250 : config.difficulty === "relaxed" ? 1050 : config.difficulty === "challenging" ? 620 : 820;
  nextEnemyAt = timestamp + Math.max(390, (baseDelay - kills * 2.2) / campaignScale("densityMultiplier"));
}

function fireBullet(timestamp) {
  if (timestamp < nextShotAt) return;
  bullets.push({ x: ship.x + ship.width / 2 - 6, y: ship.y - 24, width: 12, height: 32, speed: 680 });
  nextShotAt = timestamp + (timestamp < rapidFireUntil ? 108 : 185);
  if (kills % 4 === 0) playSound("move");
}

function hit(a, b, inset = 0) {
  return a.x + inset < b.x + b.width - inset && a.x + a.width - inset > b.x + inset && a.y + inset < b.y + b.height - inset && a.y + a.height - inset > b.y + inset;
}

function burst(x, y, color) {
  for (let index = 0; index < 10; index += 1) particles.push({
    x, y, vx: Math.cos(index / 10 * Math.PI * 2) * (40 + index * 4), vy: Math.sin(index / 10 * Math.PI * 2) * (40 + index * 4), life: .55, color,
  });
}

function damageShip(timestamp) {
  if (timestamp < shipInvulnerableUntil) return;
  if (shooterInputAuditActive) {
    shipInvulnerableUntil = timestamp + 850;
    return;
  }
  shipInvulnerableUntil = timestamp + 850;
  shooterLives -= 1;
  burst(ship.x + ship.width / 2, ship.y + ship.height / 2, palette.primary);
  playSound("fail");
  if (shooterLives <= 0) {
    showResult(false, "星环失守", "你击破了 " + kills + " 架敌机，飞船能量已经耗尽。");
    return;
  }
  setStatus((shooterLives === 1 ? "临界能量 · " : "飞船受击 · ") + "剩余 " + shooterLives + " 点能量。850ms 无敌保护已生效。");
}

function spawnPickup(enemy, timestamp) {
  if (kills % 9 !== 0 && !(enemy.elite && campaignRandom() < .38)) return;
  pickups.push({
    x: enemy.x + enemy.width / 2 - 19,
    y: enemy.y + enemy.height / 2 - 19,
    width: 38,
    height: 38,
    speed: 82,
    type: kills % 18 === 0 ? "repair" : "overdrive",
    phase: campaignRandom() * Math.PI * 2,
    bornAt: timestamp,
  });
}

function collectPickup(pickup, timestamp) {
  pickup.dead = true;
  if (pickup.type === "repair") {
    shooterLives = Math.min(shooterMaxLives, shooterLives + 1);
    shipInvulnerableUntil = Math.max(shipInvulnerableUntil, timestamp + 950);
    setStatus("修复核心已回收 · 当前 " + shooterLives + " / " + shooterMaxLives + " 点能量。");
  } else {
    rapidFireUntil = timestamp + 6000;
    setStatus("跃迁过载已启动 · 6 秒快速射击。");
  }
  playSound("reward");
  burst(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2, palette.highlight);
}

function updateShooter(delta, timestamp) {
  const seconds = Math.min(.035, delta / 1000);
  const direction = (shooterHeld.right ? 1 : 0) - (shooterHeld.left ? 1 : 0);
  if (shooterPointerTarget) {
    const followStrength = 1 - Math.exp(-18 * seconds);
    ship.x += (shooterPointerTarget.x - ship.x) * followStrength;
    ship.y += (shooterPointerTarget.y - ship.y) * followStrength;
  } else {
    ship.x = Math.max(16, Math.min(720 - ship.width - 16, ship.x + direction * 330 * seconds));
  }
  fireBullet(timestamp);
  if (timestamp >= nextEnemyAt) spawnEnemy(timestamp);

  bullets.forEach((bullet) => { bullet.y -= bullet.speed * seconds; });
  enemies.forEach((enemy) => {
    if (timestamp >= enemy.warningUntil) enemy.y += enemy.speed * seconds;
    enemy.x += Math.sin(timestamp / 430 + enemy.phase) * (enemy.elite ? 78 : 34) * seconds;
  });
  pickups.forEach((pickup) => {
    pickup.y += pickup.speed * seconds;
    pickup.x += Math.sin(timestamp / 320 + pickup.phase) * 18 * seconds;
  });
  particles.forEach((particle) => {
    particle.x += particle.vx * seconds;
    particle.y += particle.vy * seconds;
    particle.life -= seconds;
  });

  for (const bullet of bullets) for (const enemy of enemies) {
    if (bullet.dead || enemy.dead || !hit(bullet, enemy)) continue;
    bullet.dead = true;
    enemy.hp -= 1;
    if (enemy.hp > 0) continue;
    enemy.dead = true;
    kills += 1;
    shooterCombo = timestamp - lastKillAt < 1600 ? shooterCombo + 1 : 1;
    lastKillAt = timestamp;
    burst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.elite ? palette.secondary : palette.accent);
    spawnPickup(enemy, timestamp);
    playSound(shooterCombo >= 3 ? "reward" : "hit");
    setMetric(kills + " / " + killTarget);
    if (shooterCombo >= 3) setStatus(shooterCombo + " 连击 · 敌机爆散。保持移动，注意顶部预警线。");
    if (kills >= killTarget && !shooterInputAuditActive) {
      showResult(true, "星环突围", "你击破了 " + kills + " 架敌机并清空了跃迁航道。");
      return;
    }
  }
  enemies.forEach((enemy) => {
    if (enemy.dead) return;
    if (timestamp < enemy.warningUntil) return;
    if (hit(ship, enemy, 7)) { enemy.dead = true; damageShip(timestamp); }
    else if (!enemy.grazed && enemy.y + enemy.height >= ship.y + 18 && enemy.y <= ship.y + ship.height - 18) {
      const horizontalGap = Math.max(0, ship.x - (enemy.x + enemy.width), enemy.x - (ship.x + ship.width));
      if (horizontalGap > 0 && horizontalGap < 30) {
        enemy.grazed = true;
        shooterGrazeCount += 1;
        shooterCombo += 1;
        playSound("legal");
        setStatus("擦弹 " + shooterGrazeCount + " 次 · 危险距离通过，连击保持。");
      }
    }
    else if (enemy.y > shooterSceneHeight() + 20) {
      enemy.dead = true;
      shooterCombo = 0;
      if (timestamp - shooterStartedAt >= 15000) setStatus("敌机穿过航道，连击已中断；只有碰撞会损失能量。");
    }
  });
  pickups.forEach((pickup) => {
    if (pickup.dead) return;
    if (hit(ship, pickup, 5)) collectPickup(pickup, timestamp);
    else if (pickup.y > shooterSceneHeight() + 30) pickup.dead = true;
  });
  bullets = bullets.filter((bullet) => !bullet.dead && bullet.y > -30);
  enemies = enemies.filter((enemy) => !enemy.dead);
  pickups = pickups.filter((pickup) => !pickup.dead);
  particles = particles.filter((particle) => particle.life > 0);
}

function drawShooterBullet(bullet) {
  const centerX = bullet.x + bullet.width / 2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const trail = ctx.createLinearGradient(centerX, bullet.y + bullet.height + 18, centerX, bullet.y - 8);
  trail.addColorStop(0, "rgba(60,205,255,0)");
  trail.addColorStop(.44, "rgba(60,205,255,.38)");
  trail.addColorStop(1, "rgba(255,255,255,.94)");
  ctx.fillStyle = trail;
  ctx.shadowColor = "rgba(85,235,255,.95)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.roundRect(bullet.x - 4, bullet.y - 6, bullet.width + 8, bullet.height + 24, 9);
  ctx.fill();
  ctx.restore();
  drawBitmapSprite(3, bullet.x - 7, bullet.y - 8, bullet.width + 14, bullet.height + 16, { fallback: "#72efff", padding: 2, alpha: .94 });
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(255,255,255,.96)";
  ctx.shadowColor = "#8ff7ff";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.roundRect(bullet.x + bullet.width * .32, bullet.y + 2, bullet.width * .36, bullet.height * .72, 4);
  ctx.fill();
  ctx.restore();
}

function drawShooter(timestamp = 0) {
  clearCanvas();
  ctx.save();
  ctx.translate(0, gameSceneTop());
  drawPlayfield(20, 10, 680, shooterSceneHeight() - 20, { radius: 28, alpha: .44 });
  for (let index = 0; index < 70; index += 1) {
    const y = (index * 83 + timestamp * (.018 + index % 4 * .006)) % shooterSceneHeight();
    ctx.fillStyle = index % 5 ? palette.grid : palette.highlight;
    ctx.fillRect((index * 137) % 720, y, index % 5 ? 2 : 3, index % 5 ? 2 : 3);
  }
  bullets.forEach((bullet) => {
    drawShooterBullet(bullet);
  });
  enemies.forEach((enemy) => {
    if (timestamp < enemy.warningUntil) {
      const pulse = .45 + Math.sin(timestamp / 90 + enemy.phase) * .2;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = palette.primary;
      ctx.fillRect(enemy.x, 42, enemy.width, 6);
      ctx.globalAlpha = 1;
      return;
    }
    drawBitmapSprite(enemy.elite ? 2 : 1, enemy.x - 12, enemy.y - 12, enemy.width + 24, enemy.height + 24, { fallback: enemy.elite ? palette.pieces[4] : palette.primary });
    if (enemy.elite) { ctx.strokeStyle = palette.highlight; ctx.lineWidth = 3; ctx.strokeRect(enemy.x - 3, enemy.y - 3, enemy.width + 6, enemy.height + 6); }
  });
  pickups.forEach((pickup) => {
    const pulse = 1 + Math.sin(timestamp / 130 + pickup.phase) * .1;
    drawBitmapSprite(6, pickup.x - 6, pickup.y - 6, pickup.width + 12, pickup.height + 12, {
      fallback: pickup.type === "repair" ? palette.highlight : palette.secondary,
      scale: pulse,
      rotation: timestamp / 1100,
    });
    ctx.save();
    ctx.strokeStyle = pickup.type === "repair" ? palette.highlight : palette.secondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2, 25 + Math.sin(timestamp / 100) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
  particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life * 2);
    drawBitmapSprite(5, particle.x - 5, particle.y - 5, 14, 14, { fallback: particle.color, circle: true, padding: 10, alpha: Math.max(0, particle.life * 2) });
  });
  ctx.globalAlpha = 1;
  if (!(timestamp < shipInvulnerableUntil && Math.floor(timestamp / 90) % 2)) {
    drawBitmapSprite(0, ship.x - 14, ship.y - 14, ship.width + 28, ship.height + 28, { fallback: palette.accent });
    drawBitmapSprite(7, ship.x + ship.width / 2 - 13, ship.y + ship.height - 8, 26, 38, { fallback: palette.highlight, padding: 8 });
  }
  ctx.fillStyle = palette.primary;
  for (let life = 0; life < shooterMaxLives; life += 1) {
    ctx.globalAlpha = life < shooterLives ? 1 : .18;
    ctx.fillStyle = shooterLives === 1 && life === 0 && Math.floor(timestamp / 180) % 2 ? palette.highlight : palette.primary;
    ctx.fillRect(20 + life * 23, 20, 15, 6);
  }
  ctx.globalAlpha = 1;
  if (timestamp < rapidFireUntil) {
    ctx.fillStyle = palette.secondary;
    ctx.font = "700 14px Inter, sans-serif";
    ctx.fillText("OVERDRIVE " + Math.max(0, Math.ceil((rapidFireUntil - timestamp) / 1000)) + "s", 20, 48);
  }
  ctx.restore();
  finishCanvasStyle();
}

function shooterLoop(timestamp) {
  if (!running) return;
  const delta = shooterLast ? timestamp - shooterLast : 16.67;
  if (shooterLast) shooterMaxFrameGapMs = Math.max(shooterMaxFrameGapMs, delta);
  shooterFrameCount += 1;
  shooterLast = timestamp;
  updateShooter(delta, timestamp);
  drawShooter(timestamp);
  if (running) shooterFrame = requestAnimationFrame(shooterLoop);
}

function startGame() {
  if (shooterFrame) cancelAnimationFrame(shooterFrame);
  resetCampaignRandom();
  const level = currentCampaignLevel();
  const baseTarget = config.difficulty === "relaxed" ? 90 : config.difficulty === "challenging" ? 118 : 105;
  const baselineDensity = config.difficulty === "relaxed" ? .7 : config.difficulty === "challenging" ? .88 : .78;
  killTarget = Math.max(72, Math.round(baseTarget * level.densityMultiplier / baselineDensity));
  ship = { x: 320, y: shooterSceneHeight() - 148, width: 80, height: 104 };
  bullets = [];
  enemies = [];
  pickups = [];
  particles = [];
  kills = 0;
  const baseLives = config.difficulty === "relaxed" ? 6 : config.difficulty === "challenging" ? 3 : 5;
  shooterMaxLives = Math.max(2, baseLives - (currentCampaignLevel().tier >= 5 ? 1 : 0));
  shooterLives = shooterMaxLives;
  shooterHeld = { left: false, right: false };
  shooterLast = 0;
  nextEnemyAt = performance.now() + 850;
  nextShotAt = 0;
  shipInvulnerableUntil = 0;
  shooterStartedAt = performance.now();
  shooterPointerId = null;
  shooterCombo = 0;
  lastKillAt = 0;
  rapidFireUntil = 0;
  shooterGrazeCount = 0;
  shooterPointerMoves = 0;
  shooterFrameCount = 0;
  shooterMaxFrameGapMs = 0;
  shooterLastPointerMoveAt = 0;
  shooterMaxPointerGapMs = 0;
  shooterPointerTarget = null;
  shooterPointerType = "none";
  running = true;
  hideOverlay();
  setMetric("0 / " + killTarget);
  setStatus("第 " + currentCampaignLevel().number + " 关 · " + currentCampaignLevel().ruleModifier + "；击破 " + killTarget + " 架敌机即可突围。");
  startAmbient();
  shooterFrame = requestAnimationFrame(shooterLoop);
}

function handleControl(value) {
  shooterPointerTarget = null;
  if (value === "left") { shooterHeld.left = true; setTimeout(() => { shooterHeld.left = false; }, 210); }
  if (value === "right") { shooterHeld.right = true; setTimeout(() => { shooterHeld.right = false; }, 210); }
  if (value === "fire") fireBullet(performance.now());
}

function handleKey(key) {
  shooterPointerTarget = null;
  if (key === "ArrowLeft" || key.toLowerCase() === "a") shooterHeld.left = true;
  if (key === "ArrowRight" || key.toLowerCase() === "d") shooterHeld.right = true;
  if (key === " " || key.toLowerCase() === "f") fireBullet(performance.now());
}

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") shooterHeld.left = false;
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") shooterHeld.right = false;
});
function moveShipTowardPointer(event) {
  const point = eventScenePoint(event);
  const minY = shooterSceneHeight() * .2;
  shooterPointerTarget = {
    x: Math.max(16, Math.min(720 - ship.width - 16, point.x - ship.width / 2)),
    y: Math.max(minY, Math.min(shooterSceneHeight() - ship.height - 24, point.y - ship.height / 2)),
  };
  shooterPointerType = event.pointerType || "mouse";
  const now = performance.now();
  if (shooterLastPointerMoveAt) shooterMaxPointerGapMs = Math.max(shooterMaxPointerGapMs, now - shooterLastPointerMoveAt);
  shooterLastPointerMoveAt = now;
  shooterPointerMoves += 1;
}
canvas.addEventListener("pointerdown", (event) => {
  if (!running) return;
  shooterPointerId = event.pointerId;
  shooterPointerType = event.pointerType || "mouse";
  shooterLastPointerMoveAt = performance.now();
  moveShipTowardPointer(event);
  try { canvas.setPointerCapture(event.pointerId); } catch {}
  if (event.cancelable) event.preventDefault();
});
canvas.addEventListener("pointermove", (event) => {
  if (!running) return;
  const mouseHover = event.pointerType === "mouse" || !event.pointerType;
  if (!mouseHover && event.pointerId !== shooterPointerId) return;
  moveShipTowardPointer(event);
  if (event.cancelable) event.preventDefault();
});
function releaseShooterPointer(event) {
  if (event.pointerId !== shooterPointerId) return;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if (shooterPointerType !== "mouse") shooterPointerTarget = null;
  shooterPointerId = null;
}
canvas.addEventListener("pointerup", releaseShooterPointer);
canvas.addEventListener("pointercancel", releaseShooterPointer);
canvas.addEventListener("pointerleave", (event) => {
  if ((event.pointerType === "mouse" || !event.pointerType) && shooterPointerId === null) shooterPointerTarget = null;
});

function estimatedShooterSessionSeconds() {
  const learningKills = 12;
  const remainingKills = Math.max(0, killTarget - learningKills);
  const baseDelay = config.difficulty === "relaxed" ? 1050 : config.difficulty === "challenging" ? 620 : 820;
  const averageKills = (learningKills + killTarget) / 2;
  const averageDelay = Math.max(390, (baseDelay - averageKills * 2.2) / campaignScale("densityMultiplier"));
  return Math.round((15 + remainingKills * averageDelay / 1000) * 10) / 10;
}

runtimeDebugActions = {
  beginContinuousInputAudit: () => {
    shooterInputAuditActive = true;
    startGame();
  },
  endContinuousInputAudit: () => { shooterInputAuditActive = false; },
  damageOnce: () => {
    shooterInputAuditActive = false;
    shipInvulnerableUntil = 0;
    damageShip(performance.now());
  },
  collectRepair: () => {
    if (shooterLives >= shooterMaxLives) shooterLives = Math.max(1, shooterLives - 1);
    collectPickup({ type: "repair", x: ship.x, y: ship.y, width: 38, height: 38 }, performance.now());
  },
  forceLoss: () => {
    shooterInputAuditActive = false;
    shooterLives = 1;
    shipInvulnerableUntil = 0;
    damageShip(performance.now());
  },
};

runtimeDebugState = () => ({
  level: currentCampaignLevel().number,
  tier: currentCampaignLevel().tier,
  kills,
  killTarget,
  lives: shooterLives,
  maxLives: shooterMaxLives,
  enemyCount: enemies.length,
  pickupCount: pickups.length,
  grazeCount: shooterGrazeCount,
  pointerMoves: shooterPointerMoves,
  pointerCaptured: shooterPointerId !== null,
  pointerType: shooterPointerType,
  pointerTarget: shooterPointerTarget,
  shipPosition: { x: Math.round(ship.x), y: Math.round(ship.y) },
  pointerControl: "mouse-hover-touch-hold-drag",
  bulletVisual: { width: 12, height: 32, glowRadius: 18, bitmapPadding: 2, highContrastCore: true },
  inputAuditActive: shooterInputAuditActive,
  frameCount: shooterFrameCount,
  maxFrameGapMs: Math.round(shooterMaxFrameGapMs * 10) / 10,
  maxPointerGapMs: Math.round(shooterMaxPointerGapMs * 10) / 10,
  estimatedSessionSeconds: estimatedShooterSessionSeconds(),
  elapsedMs: shooterStartedAt ? Math.max(0, performance.now() - shooterStartedAt) : 0,
});

ship = { x: 320, y: shooterSceneHeight() - 148, width: 80, height: 104 };
drawShooter();
`;
