// 基础帧循环移植自 Jack Rugile 的 Radius Raid js13k 版本（MIT）。
// 波次、敌机、Boss、机体、主动能力、输入、关卡与视听表现均为本平台独立重制。
export const spaceShooterScript = String.raw`
const shooterWaveCount = 3;
const shooterEnemyKinds = ["scout", "weaver", "charger", "turret", "shield"];
const shooterLoadouts = {
  interceptor: { id: "interceptor", label: "逐光", follow: 21, fireDelay: 132, maxLives: 4, pulseRadius: 286, pulseDamage: 3, pulseGain: 1, eliteDamage: 1 },
  bulwark: { id: "bulwark", label: "岚盾", follow: 15, fireDelay: 188, maxLives: 5, pulseRadius: 350, pulseDamage: 2, pulseGain: 1.18, eliteDamage: 1 },
  lancer: { id: "lancer", label: "星矛", follow: 18, fireDelay: 172, maxLives: 4, pulseRadius: 264, pulseDamage: 3, pulseGain: .84, eliteDamage: 1.55 },
};

let ship;
let bullets = [];
let enemies = [];
let enemyBullets = [];
let pickups = [];
let particles = [];
let shooterLives = 4;
let shooterMaxLives = 4;
let shooterShield = 0;
let kills = 0;
let shooterScore = 0;
let shooterFrame = null;
let shooterLast = 0;
let nextEnemyAt = 0;
let nextShotAt = 0;
let shipInvulnerableUntil = 0;
let shooterStartedAt = 0;
let shooterPointerId = null;
let shooterCombo = 0;
let shooterBestCombo = 0;
let lastKillAt = 0;
let rapidFireUntil = 0;
let shooterGrazeCount = 0;
let shooterPointerMoves = 0;
let shooterHeld = { left: false, right: false, up: false, down: false };
let killTarget = 24;
let shooterInputAuditActive = false;
let shooterFrameCount = 0;
let shooterMaxFrameGapMs = 0;
let shooterLastPointerMoveAt = 0;
let shooterMaxPointerGapMs = 0;
let shooterPointerTarget = null;
let shooterPointerType = "none";
let shooterLoadout = "interceptor";
let shooterWavePlans = [];
let shooterWaveIndex = 0;
let shooterWaveSpawned = 0;
let shooterWaveDefeated = 0;
let shooterIntermissionUntil = 0;
let shooterPulseCharge = 35;
let shooterPulseEffect = null;
let shooterPulseReadyNotified = false;
let shooterBoss = null;
let shooterBossPhase = 0;
let shooterHitFlashUntil = 0;
let shooterWaveBannerUntil = 0;
let shooterWaveBannerText = "";

function shooterSceneHeight() {
  return gameSceneHeight();
}

function currentShooterLoadout() {
  return shooterLoadouts[shooterLoadout] || shooterLoadouts.interceptor;
}

function shooterDifficultyProfile() {
  if (config.difficulty === "relaxed") return { fireRate: .72, bulletSpeed: .82, spawnDelay: 1.1 };
  if (config.difficulty === "challenging") return { fireRate: 1.24, bulletSpeed: 1.17, spawnDelay: .86 };
  return { fireRate: 1, bulletSpeed: 1, spawnDelay: 1 };
}

function shooterLevelBlueprints() {
  const level = currentCampaignLevel();
  const tier = level.tier;
  const variant = level.number - 1;
  const unlocked = shooterEnemyKinds.slice(0, Math.min(shooterEnemyKinds.length, 1 + tier));
  const pick = (offset) => unlocked[(variant + offset) % unlocked.length];
  const guardian = level.number % 4 === 0;
  return [
    { label: tier === 1 ? "航道校准" : "前锋接敌", count: 6 + tier, kinds: ["scout", pick(1)] },
    { label: tier < 3 ? "双翼压制" : "混合火网", count: 7 + tier, kinds: [pick(1), pick(2), tier >= 3 ? "turret" : "weaver"] },
    guardian
      ? { label: "守环者", count: 1, kinds: ["boss"], boss: true }
      : { label: tier < 2 ? "精英封锁" : "全型编队", count: 8 + tier, kinds: [pick(2), pick(3), tier >= 2 ? "shield" : "scout"], elite: true },
  ];
}

function syncShooterLoadoutUi() {
  document.querySelectorAll("[data-shooter-loadout]").forEach((button) => {
    const selected = button.dataset.shooterLoadout === shooterLoadout;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function syncShooterAbilityControl() {
  const button = document.querySelector('[data-control="pulse"]');
  if (!button) return;
  const ready = shooterPulseCharge >= 100;
  button.textContent = ready ? "脉冲就绪" : "脉冲 " + Math.round(shooterPulseCharge) + "%";
  button.disabled = !running || !ready;
  button.setAttribute("aria-label", ready ? "释放星环脉冲" : "星环脉冲充能 " + Math.round(shooterPulseCharge) + "%");
}

document.querySelectorAll("[data-shooter-loadout]").forEach((button) => button.addEventListener("click", () => {
  if (running) return;
  shooterLoadout = button.dataset.shooterLoadout || "interceptor";
  syncShooterLoadoutUi();
  playSound("ui");
}));

function shooterEnemyStats(kind) {
  const tier = currentCampaignLevel().tier;
  const speedScale = campaignScale("speedMultiplier");
  const stats = {
    scout: { width: 60, height: 52, hp: 2 + Math.floor((tier - 1) / 3), speed: 112, score: 110, delay: 720 },
    weaver: { width: 68, height: 56, hp: 3 + Math.floor(tier / 3), speed: 96, score: 150, delay: 640 },
    charger: { width: 56, height: 68, hp: 3 + Math.floor(tier / 2), speed: 210, score: 180, delay: 820 },
    turret: { width: 82, height: 68, hp: 6 + tier, speed: 58, score: 260, delay: 520 },
    shield: { width: 74, height: 66, hp: 4 + tier, speed: 78, score: 230, delay: 610, shield: 1 + Math.floor(tier / 4) },
    boss: { width: 180, height: 136, hp: 25 + tier * 9, speed: 44, score: 2500, delay: 380 },
  }[kind] || { width: 48, height: 42, hp: 2, speed: 100, score: 100, delay: 720 };
  return { ...stats, speed: stats.speed * speedScale };
}

function shooterWarningDuration(kind) {
  const learning = performance.now() - shooterStartedAt < 12000;
  if (kind === "charger") return learning ? 1250 : 920;
  if (kind === "boss") return 1500;
  return learning ? 980 : 660;
}

function spawnShooterEnemy(kind, timestamp) {
  const stats = shooterEnemyStats(kind);
  const plan = shooterWavePlans[shooterWaveIndex] || shooterWavePlans[0];
  const spacing = 600 / Math.max(1, plan.count - 1);
  const indexedX = 60 + (shooterWaveSpawned % Math.max(1, plan.count)) * spacing;
  const randomX = 54 + campaignRandom() * 612;
  const x = kind === "boss" ? 360 - stats.width / 2 : Math.max(34, Math.min(686 - stats.width, indexedX * .58 + randomX * .42));
  const warningUntil = timestamp + shooterWarningDuration(kind);
  const enemy = {
    id: "enemy-" + shooterWaveIndex + "-" + shooterWaveSpawned + "-" + Math.round(timestamp),
    kind,
    x,
    y: kind === "boss" ? -stats.height - 30 : -stats.height - 12,
    width: stats.width,
    height: stats.height,
    speed: stats.speed,
    hp: stats.hp,
    maxHp: stats.hp,
    score: stats.score,
    shield: stats.shield || 0,
    phase: campaignRandom() * Math.PI * 2,
    warningUntil,
    shotAt: warningUntil + stats.delay,
    bornAt: timestamp,
    targetY: kind === "boss" ? 138 : kind === "turret" ? 196 + campaignRandom() * 90 : 0,
    elite: Boolean(plan.elite || kind === "boss"),
    boss: kind === "boss",
  };
  enemies.push(enemy);
  if (enemy.boss) {
    shooterBoss = enemy;
    shooterBossPhase = 1;
  }
  return enemy;
}

function firePlayerBullet(timestamp) {
  if (!ship || timestamp < nextShotAt) return;
  const loadout = currentShooterLoadout();
  const rapid = timestamp < rapidFireUntil ? .62 : 1;
  const positions = loadout.id === "lancer" ? [-17, 17] : [0];
  positions.forEach((offset) => bullets.push({ x: ship.x + ship.width / 2 - 7 + offset, y: ship.y - 24, width: 14, height: 34, speed: 730, damage: loadout.id === "lancer" ? 1.05 : 1 }));
  nextShotAt = timestamp + loadout.fireDelay * rapid;
  if (shooterFrameCount % 18 === 0) playSound("move");
}

function hit(a, b, inset = 0) {
  return a.x + inset < b.x + b.width - inset && a.x + a.width - inset > b.x + inset && a.y + inset < b.y + b.height - inset && a.y + a.height - inset > b.y + inset;
}

function circleHitsShip(bullet, inset = 9) {
  const closestX = Math.max(ship.x + inset, Math.min(bullet.x, ship.x + ship.width - inset));
  const closestY = Math.max(ship.y + inset, Math.min(bullet.y, ship.y + ship.height - inset));
  return Math.hypot(bullet.x - closestX, bullet.y - closestY) <= bullet.radius;
}

function burst(x, y, color, count = 12, speed = 120) {
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2 + campaignRandom() * .18;
    particles.push({ x, y, vx: Math.cos(angle) * (speed * .45 + campaignRandom() * speed), vy: Math.sin(angle) * (speed * .45 + campaignRandom() * speed), life: .42 + campaignRandom() * .4, color, size: 8 + campaignRandom() * 10 });
  }
  if (particles.length > 180) particles.splice(0, particles.length - 180);
}

function addShooterPulseCharge(amount) {
  const before = shooterPulseCharge;
  shooterPulseCharge = Math.min(100, shooterPulseCharge + amount * currentShooterLoadout().pulseGain);
  if (before < 100 && shooterPulseCharge >= 100 && !shooterPulseReadyNotified) {
    shooterPulseReadyNotified = true;
    setStatus("星环脉冲已充满 · 点击右下按钮或按 Space / F 清除近身敌弹。");
    playSound("reward");
  }
  syncShooterAbilityControl();
}

function activateShooterPulse() {
  if (!running || shooterPulseCharge < 100 || !ship) return false;
  const loadout = currentShooterLoadout();
  const centerX = ship.x + ship.width / 2;
  const centerY = ship.y + ship.height / 2;
  let cleared = 0;
  enemyBullets.forEach((bullet) => {
    if (bullet.dead || Math.hypot(bullet.x - centerX, bullet.y - centerY) > loadout.pulseRadius) return;
    bullet.dead = true;
    cleared += 1;
    burst(bullet.x, bullet.y, "#7af4f2", 4, 58);
  });
  enemyBullets = enemyBullets.filter((bullet) => !bullet.dead);
  enemies.forEach((enemy) => {
    if (enemy.dead || performance.now() < enemy.warningUntil) return;
    const distance = Math.hypot(enemy.x + enemy.width / 2 - centerX, enemy.y + enemy.height / 2 - centerY);
    if (distance > loadout.pulseRadius) return;
    enemy.hp -= loadout.pulseDamage * (loadout.id === "lancer" && enemy.elite ? loadout.eliteDamage : 1);
  });
  shooterPulseCharge = 0;
  shooterPulseReadyNotified = false;
  const now = performance.now();
  shooterPulseEffect = { x: centerX, y: centerY, radius: loadout.pulseRadius, startedAt: now, until: now + 520 };
  shooterScore += cleared * 35;
  burst(centerX, centerY, "#a9ffff", 28, 210);
  playSound("reward");
  setStatus("脉冲释放 · 清除 " + cleared + " 枚近身敌弹，并冲击范围内敌机。");
  syncShooterAbilityControl();
  return true;
}

function damageShip(timestamp) {
  if (!ship || timestamp < shipInvulnerableUntil) return;
  if (shooterInputAuditActive) { shipInvulnerableUntil = timestamp + 850; return; }
  shipInvulnerableUntil = timestamp + 1050;
  shooterHitFlashUntil = timestamp + 240;
  if (shooterShield > 0) {
    shooterShield -= 1;
    burst(ship.x + ship.width / 2, ship.y + ship.height / 2, "#77f0e7", 18, 145);
    playSound("legal");
    setStatus("护盾吸收了一次命中 · 能量未损失。");
    return;
  }
  shooterLives -= 1;
  shooterCombo = 0;
  burst(ship.x + ship.width / 2, ship.y + ship.height / 2, "#ff6a5d", 24, 180);
  playSound("fail");
  if (shooterLives <= 0) {
    showResult(false, "星环失守", "你完成了 " + (shooterWaveIndex + 1) + " / " + shooterWaveCount + " 波，击破 " + kills + " 架敌机，最高连击 ×" + shooterBestCombo + "。");
    return;
  }
  setStatus((shooterLives === 1 ? "临界能量 · " : "飞船受击 · ") + "剩余 " + shooterLives + " 点能量；短暂无敌已生效。");
}

function spawnShooterPickup(enemy, timestamp) {
  if (!enemy.boss && kills % 7 !== 0 && !(enemy.elite && campaignRandom() < .3)) return;
  const type = shooterLives < shooterMaxLives && kills % 14 === 0 ? "repair" : kills % 3 === 0 ? "overdrive" : "pulse";
  pickups.push({ x: enemy.x + enemy.width / 2 - 20, y: enemy.y + enemy.height / 2 - 20, width: 40, height: 40, speed: 88, type, phase: campaignRandom() * Math.PI * 2, bornAt: timestamp });
}

function collectShooterPickup(pickup, timestamp) {
  pickup.dead = true;
  if (pickup.type === "repair") {
    shooterLives = Math.min(shooterMaxLives, shooterLives + 1);
    shipInvulnerableUntil = Math.max(shipInvulnerableUntil, timestamp + 800);
    setStatus("修复核心已回收 · 当前 " + shooterLives + " / " + shooterMaxLives + " 点能量。");
  } else if (pickup.type === "overdrive") {
    rapidFireUntil = timestamp + 6500;
    setStatus("跃迁过载已启动 · 6 秒快速射击。");
  } else {
    addShooterPulseCharge(38);
    shooterShield = Math.min(1, shooterShield + 1);
    setStatus("脉冲电池已回收 · 同时获得 1 层护盾。");
  }
  shooterScore += 300;
  playSound("reward");
  burst(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2, "#ffd67a", 18, 135);
}

function aimShooterBullet(enemy, speed, angleOffset = 0, radius = 9) {
  if (!ship || enemyBullets.length >= 90) return;
  const dx = ship.x + ship.width / 2 - (enemy.x + enemy.width / 2);
  const dy = ship.y + ship.height / 2 - (enemy.y + enemy.height / 2);
  const base = Math.atan2(dy, dx) + angleOffset;
  const difficulty = shooterDifficultyProfile();
  enemyBullets.push({ x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height * .72, vx: Math.cos(base) * speed * difficulty.bulletSpeed, vy: Math.sin(base) * speed * difficulty.bulletSpeed, radius, kind: enemy.kind, grazed: false, bornAt: performance.now() });
}

function fireShooterEnemy(enemy, timestamp) {
  if (enemy.dead || timestamp < enemy.warningUntil || timestamp < enemy.shotAt || enemy.y < 18) return;
  const difficulty = shooterDifficultyProfile();
  const tier = currentCampaignLevel().tier;
  if (enemy.kind === "scout") aimShooterBullet(enemy, 178 + tier * 8, 0, 8);
  if (enemy.kind === "weaver") { aimShooterBullet(enemy, 170 + tier * 7, -.16, 8); aimShooterBullet(enemy, 170 + tier * 7, .16, 8); }
  if (enemy.kind === "turret" || enemy.kind === "shield") [-.28, 0, .28].forEach((angle) => aimShooterBullet(enemy, 158 + tier * 8, angle, enemy.kind === "turret" ? 10 : 8));
  if (enemy.kind === "boss") {
    const count = shooterBossPhase === 2 ? 7 : 5;
    for (let index = 0; index < count; index += 1) aimShooterBullet(enemy, 170 + tier * 9, (index - (count - 1) / 2) * .16, shooterBossPhase === 2 ? 11 : 9);
  }
  enemy.shotAt = timestamp + shooterEnemyStats(enemy.kind).delay / difficulty.fireRate;
}

function destroyShooterEnemy(enemy, timestamp) {
  if (enemy.dead) return;
  enemy.dead = true;
  kills += 1;
  shooterWaveDefeated += 1;
  shooterCombo = timestamp - lastKillAt < 1850 ? shooterCombo + 1 : 1;
  shooterBestCombo = Math.max(shooterBestCombo, shooterCombo);
  lastKillAt = timestamp;
  const multiplier = 1 + Math.min(4, shooterCombo - 1) * .18;
  shooterScore += Math.round(enemy.score * multiplier);
  addShooterPulseCharge(enemy.boss ? 35 : enemy.elite ? 13 : 7);
  burst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.boss ? "#ffd064" : enemy.elite ? "#ff8b69" : "#61e7df", enemy.boss ? 48 : 18, enemy.boss ? 260 : 150);
  spawnShooterPickup(enemy, timestamp);
  playSound(shooterCombo >= 4 || enemy.elite ? "reward" : "hit");
  if (enemy.boss) { shooterBoss = null; shooterBossPhase = 0; }
}

function updateShooterEnemy(enemy, seconds, timestamp) {
  if (timestamp < enemy.warningUntil) return;
  const age = (timestamp - enemy.warningUntil) / 1000;
  if (enemy.kind === "boss") {
    enemy.y += (enemy.targetY - enemy.y) * Math.min(1, seconds * 2.4);
    enemy.x += Math.sin(timestamp / 1150 + enemy.phase) * 74 * seconds;
    enemy.x = Math.max(52, Math.min(668 - enemy.width, enemy.x));
    const nextPhase = enemy.hp <= enemy.maxHp * .5 ? 2 : 1;
    if (nextPhase !== shooterBossPhase) {
      shooterBossPhase = nextPhase;
      shooterWaveBannerText = "守环者进入裂变阶段";
      shooterWaveBannerUntil = timestamp + 1500;
      playSound("warning");
    }
  } else if (enemy.kind === "turret") {
    if (enemy.y < enemy.targetY) enemy.y += enemy.speed * seconds;
    else { enemy.x += Math.sin(timestamp / 720 + enemy.phase) * 46 * seconds; if (age > 8.5) enemy.y += enemy.speed * 1.35 * seconds; }
  } else if (enemy.kind === "weaver") {
    enemy.y += enemy.speed * seconds;
    enemy.x += Math.sin(timestamp / 310 + enemy.phase) * 112 * seconds;
  } else if (enemy.kind === "charger") {
    enemy.y += enemy.speed * (age < .55 ? .42 : 1.42) * seconds;
  } else {
    enemy.y += enemy.speed * seconds;
    if (enemy.kind === "shield") enemy.x += Math.sin(timestamp / 520 + enemy.phase) * 38 * seconds;
  }
  enemy.x = Math.max(24, Math.min(696 - enemy.width, enemy.x));
  fireShooterEnemy(enemy, timestamp);
}

function shooterWaveComplete(timestamp) {
  const plan = shooterWavePlans[shooterWaveIndex];
  if (!plan || shooterWaveSpawned < plan.count || enemies.some((enemy) => !enemy.dead)) return false;
  if (shooterWaveIndex >= shooterWaveCount - 1) {
    if (!shooterInputAuditActive) showResult(true, "星环航道已打开", "你完成三波作战，击破 " + kills + " 架敌机，最高连击 ×" + shooterBestCombo + "，得分 " + shooterScore + "。");
    return true;
  }
  shooterWaveIndex += 1;
  shooterWaveSpawned = 0;
  shooterWaveDefeated = 0;
  shooterIntermissionUntil = timestamp + 1650;
  shooterWaveBannerText = "WAVE " + (shooterWaveIndex + 1) + " · " + shooterWavePlans[shooterWaveIndex].label;
  shooterWaveBannerUntil = timestamp + 2100;
  setStatus("第 " + (shooterWaveIndex + 1) + " 波即将进入 · " + shooterWavePlans[shooterWaveIndex].label + "。");
  return false;
}

function updateShooter(delta, timestamp) {
  const seconds = Math.min(.034, delta / 1000);
  const loadout = currentShooterLoadout();
  const horizontal = (shooterHeld.right ? 1 : 0) - (shooterHeld.left ? 1 : 0);
  const vertical = (shooterHeld.down ? 1 : 0) - (shooterHeld.up ? 1 : 0);
  if (shooterPointerTarget) {
    const followStrength = 1 - Math.exp(-loadout.follow * seconds);
    ship.x += (shooterPointerTarget.x - ship.x) * followStrength;
    ship.y += (shooterPointerTarget.y - ship.y) * followStrength;
  } else {
    const length = Math.hypot(horizontal, vertical) || 1;
    ship.x += horizontal / length * 360 * seconds;
    ship.y += vertical / length * 360 * seconds;
  }
  ship.x = Math.max(18, Math.min(720 - ship.width - 18, ship.x));
  ship.y = Math.max(142, Math.min(shooterSceneHeight() - ship.height - 26, ship.y));
  firePlayerBullet(timestamp);
  const plan = shooterWavePlans[shooterWaveIndex];
  if (plan && timestamp >= shooterIntermissionUntil && shooterWaveSpawned < plan.count && timestamp >= nextEnemyAt) {
    const kind = plan.kinds[shooterWaveSpawned % plan.kinds.length];
    spawnShooterEnemy(kind, timestamp);
    shooterWaveSpawned += 1;
    const baseDelay = plan.boss ? 1000 : Math.max(430, 820 - currentCampaignLevel().tier * 55);
    nextEnemyAt = timestamp + baseDelay * shooterDifficultyProfile().spawnDelay / campaignScale("densityMultiplier");
  }
  bullets.forEach((bullet) => { bullet.y -= bullet.speed * seconds; });
  enemies.forEach((enemy) => updateShooterEnemy(enemy, seconds, timestamp));
  enemyBullets.forEach((bullet) => { bullet.x += bullet.vx * seconds; bullet.y += bullet.vy * seconds; });
  pickups.forEach((pickup) => { pickup.y += pickup.speed * seconds; pickup.x += Math.sin(timestamp / 320 + pickup.phase) * 20 * seconds; });
  particles.forEach((particle) => { particle.x += particle.vx * seconds; particle.y += particle.vy * seconds; particle.vx *= .985; particle.vy *= .985; particle.life -= seconds; });
  for (const bullet of bullets) for (const enemy of enemies) {
    if (bullet.dead || enemy.dead || timestamp < enemy.warningUntil || !hit(bullet, enemy, 2)) continue;
    bullet.dead = true;
    if (enemy.shield > 0) { enemy.shield -= 1; burst(bullet.x, bullet.y, "#75d9ff", 9, 92); playSound("legal"); continue; }
    const eliteBonus = loadout.id === "lancer" && enemy.elite ? loadout.eliteDamage : 1;
    enemy.hp -= bullet.damage * eliteBonus;
    if (enemy.hp <= 0) destroyShooterEnemy(enemy, timestamp);
  }
  enemies.forEach((enemy) => {
    if (enemy.dead || timestamp < enemy.warningUntil) return;
    if (enemy.hp <= 0) { destroyShooterEnemy(enemy, timestamp); return; }
    if (hit(ship, enemy, enemy.boss ? 18 : 8)) { if (!enemy.boss) enemy.dead = true; damageShip(timestamp); }
    else if (enemy.y > shooterSceneHeight() + 36) { enemy.dead = true; shooterCombo = 0; if (timestamp - shooterStartedAt > 9000) setStatus("敌机突破航道 · 连击中断，但只有命中会损失能量。"); }
  });
  enemyBullets.forEach((bullet) => {
    if (bullet.dead) return;
    if (circleHitsShip(bullet)) { bullet.dead = true; damageShip(timestamp); return; }
    if (!bullet.grazed) {
      const centerX = ship.x + ship.width / 2;
      const centerY = ship.y + ship.height / 2;
      const distance = Math.hypot(bullet.x - centerX, bullet.y - centerY);
      if (distance > 26 && distance < 52) {
        bullet.grazed = true;
        shooterGrazeCount += 1;
        shooterCombo = Math.max(1, shooterCombo + 1);
        shooterBestCombo = Math.max(shooterBestCombo, shooterCombo);
        shooterScore += 55;
        addShooterPulseCharge(8);
        playSound("legal");
      }
    }
  });
  pickups.forEach((pickup) => { if (!pickup.dead) { if (hit(ship, pickup, 5)) collectShooterPickup(pickup, timestamp); else if (pickup.y > shooterSceneHeight() + 34) pickup.dead = true; } });
  bullets = bullets.filter((bullet) => !bullet.dead && bullet.y > -48);
  enemies = enemies.filter((enemy) => !enemy.dead);
  enemyBullets = enemyBullets.filter((bullet) => !bullet.dead && bullet.x > -40 && bullet.x < 760 && bullet.y > -50 && bullet.y < shooterSceneHeight() + 50 && timestamp - bullet.bornAt < 11000);
  pickups = pickups.filter((pickup) => !pickup.dead);
  particles = particles.filter((particle) => particle.life > 0);
  if (shooterPulseEffect && timestamp >= shooterPulseEffect.until) shooterPulseEffect = null;
  setMetric("W" + (shooterWaveIndex + 1) + "/3 · " + kills + "/" + killTarget);
  shooterWaveComplete(timestamp);
}

function drawShooterBullet(bullet) {
  const centerX = bullet.x + bullet.width / 2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const trail = ctx.createLinearGradient(centerX, bullet.y + bullet.height + 20, centerX, bullet.y - 8);
  trail.addColorStop(0, "rgba(66,214,255,0)"); trail.addColorStop(.48, "rgba(66,214,255,.46)"); trail.addColorStop(1, "rgba(255,255,255,.98)");
  ctx.fillStyle = trail; ctx.shadowColor = "rgba(95,242,255,.98)"; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.roundRect(bullet.x - 4, bullet.y - 6, bullet.width + 8, bullet.height + 26, 9); ctx.fill(); ctx.restore();
  drawBitmapSprite(3, bullet.x - 7, bullet.y - 8, bullet.width + 14, bullet.height + 18, { fallback: "#80f6ff", padding: 2, alpha: .96 });
  ctx.save(); ctx.fillStyle = "rgba(255,255,255,.98)"; ctx.shadowColor = "#a9ffff"; ctx.shadowBlur = 9;
  ctx.beginPath(); ctx.roundRect(bullet.x + bullet.width * .31, bullet.y + 1, bullet.width * .38, bullet.height * .76, 4); ctx.fill(); ctx.restore();
}

function drawShooterEnemyBullet(bullet) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = bullet.kind === "boss" ? "#ffdb6a" : "#ff715f";
  ctx.shadowColor = bullet.kind === "boss" ? "#ff9c3e" : "#ff4258"; ctx.shadowBlur = 13; ctx.beginPath();
  if (bullet.kind === "turret" || bullet.kind === "boss") ctx.rect(bullet.x - bullet.radius * .7, bullet.y - bullet.radius * .7, bullet.radius * 1.4, bullet.radius * 1.4);
  else ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
  ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.stroke(); ctx.restore();
}

function drawShooterWarning(enemy, timestamp) {
  const pulse = .62 + Math.sin(timestamp / 85 + enemy.phase) * .22;
  const center = enemy.x + enemy.width / 2;
  ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = enemy.kind === "charger" || enemy.boss ? "#ff665c" : "#ffba62"; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = enemy.boss ? 4 : 3;
  ctx.setLineDash([10, 9]); ctx.beginPath(); ctx.moveTo(center, 118); ctx.lineTo(center, enemy.kind === "charger" ? shooterSceneHeight() - 180 : 184); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(center, 118); ctx.lineTo(center - 14, 92); ctx.lineTo(center + 14, 92); ctx.closePath(); ctx.fill();
  const ghostY = enemy.boss ? 184 : 148;
  ctx.globalAlpha = pulse * .42;
  ctx.beginPath(); ctx.arc(center, ghostY, Math.max(28, enemy.width * .58), 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = pulse * .72;
  drawBitmapSprite(enemy.boss || enemy.kind === "turret" || enemy.kind === "charger" ? 2 : 1, center - enemy.width * .62, ghostY - enemy.height * .52, enemy.width * 1.24, enemy.height * 1.04, { fallback: ctx.fillStyle, alpha: pulse * .72 });
  if (enemy.boss) { ctx.font = "800 18px ui-monospace, Consolas, monospace"; ctx.textAlign = "center"; ctx.fillText("GUARDIAN INBOUND", 360, 146); }
  ctx.restore();
}

function drawShooterEnemy(enemy, timestamp) {
  if (timestamp < enemy.warningUntil) { drawShooterWarning(enemy, timestamp); return; }
  const sprite = enemy.boss || enemy.kind === "turret" || enemy.kind === "charger" ? 2 : 1;
  drawBitmapSprite(sprite, enemy.x - 12, enemy.y - 12, enemy.width + 24, enemy.height + 24, { fallback: enemy.boss ? "#ff7b65" : enemy.elite ? "#ff9c68" : "#58ded7", scale: enemy.boss ? 1.1 : enemy.kind === "weaver" ? 1.12 : 1, rotation: enemy.kind === "weaver" ? Math.sin(timestamp / 330 + enemy.phase) * .08 : 0 });
  ctx.save();
  if (enemy.kind === "weaver") { ctx.strokeStyle = "rgba(95,232,225,.82)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(enemy.x - 8, enemy.y + enemy.height * .55); ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + enemy.height * .28); ctx.lineTo(enemy.x + enemy.width + 8, enemy.y + enemy.height * .55); ctx.stroke(); }
  if (enemy.kind === "turret") { ctx.strokeStyle = "#ffbd68"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width * .52, 0, Math.PI * 2); ctx.stroke(); }
  if (enemy.shield > 0) { ctx.strokeStyle = "rgba(97,216,255,.92)"; ctx.lineWidth = 4; ctx.shadowColor = "#55d9ff"; ctx.shadowBlur = 12; ctx.beginPath(); ctx.ellipse(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width * .62, enemy.height * .68, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (!enemy.boss && enemy.hp < enemy.maxHp) { ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(enemy.x, enemy.y - 10, enemy.width, 5); ctx.fillStyle = enemy.elite ? "#ffb668" : "#68ebe3"; ctx.fillRect(enemy.x, enemy.y - 10, enemy.width * Math.max(0, enemy.hp / enemy.maxHp), 5); }
  ctx.restore();
}

function drawShooterHud(timestamp) {
  const plan = shooterWavePlans[shooterWaveIndex] || { label: "待命", count: 1 };
  const progress = plan.boss && shooterBoss ? 1 - shooterBoss.hp / shooterBoss.maxHp : Math.min(1, shooterWaveDefeated / Math.max(1, plan.count));
  ctx.save(); ctx.fillStyle = "rgba(3,17,25,.86)"; ctx.beginPath(); ctx.roundRect(18, 16, 684, 92, 18); ctx.fill(); ctx.strokeStyle = "rgba(91,224,221,.28)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = "800 15px ui-monospace, Consolas, monospace"; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillStyle = "#b8fff9"; ctx.fillText("ENERGY", 36, 42);
  for (let life = 0; life < shooterMaxLives; life += 1) { ctx.globalAlpha = life < shooterLives ? 1 : .18; ctx.fillStyle = shooterLives === 1 && life === 0 && Math.floor(timestamp / 180) % 2 ? "#ff665c" : "#63e8df"; ctx.beginPath(); ctx.roundRect(36 + life * 24, 58, 18, 8, 4); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (shooterShield > 0) { ctx.strokeStyle = "#7fdcff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(36 + shooterMaxLives * 24 + 10, 62, 8, 0, Math.PI * 2); ctx.stroke(); }
  ctx.textAlign = "center"; ctx.fillStyle = "#f3fbff"; ctx.font = "850 18px Inter, sans-serif"; ctx.fillText("WAVE " + (shooterWaveIndex + 1) + " / " + shooterWaveCount, 360, 40);
  ctx.fillStyle = "#9cb9c4"; ctx.font = "700 12px Inter, sans-serif"; ctx.fillText(plan.label, 360, 64);
  const barX = 254; const barY = 83; const barW = 212;
  ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.beginPath(); ctx.roundRect(barX, barY, barW, 7, 4); ctx.fill();
  const gradient = ctx.createLinearGradient(barX, 0, barX + barW, 0); gradient.addColorStop(0, "#55e7df"); gradient.addColorStop(1, plan.boss ? "#ff665c" : "#ffd06a"); ctx.fillStyle = gradient; ctx.beginPath(); ctx.roundRect(barX, barY, barW * progress, 7, 4); ctx.fill();
  ctx.textAlign = "right"; ctx.fillStyle = "#b8fff9"; ctx.font = "800 14px ui-monospace, Consolas, monospace"; ctx.fillText(String(shooterScore).padStart(6, "0"), 682, 39); ctx.fillStyle = shooterCombo > 1 ? "#ffd06a" : "#87aab4"; ctx.fillText("COMBO ×" + Math.max(1, shooterCombo), 682, 66); ctx.restore();
}

function drawShooterPulseControl(timestamp) {
  const x = 646; const y = shooterSceneHeight() - 94; const ready = shooterPulseCharge >= 100;
  ctx.save(); ctx.fillStyle = "rgba(3,18,25,.76)"; ctx.beginPath(); ctx.arc(x, y, 44, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = "rgba(94,226,222,.2)"; ctx.stroke();
  ctx.strokeStyle = ready ? "#b9fffa" : "#55e5dc"; ctx.shadowColor = ready ? "#7ffff7" : "transparent"; ctx.shadowBlur = ready ? 18 + Math.sin(timestamp / 120) * 4 : 0; ctx.beginPath(); ctx.arc(x, y, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * shooterPulseCharge / 100); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = ready ? "#ffffff" : "#a8c7cd"; ctx.font = "800 12px Inter, sans-serif"; ctx.fillText(ready ? "脉冲" : Math.round(shooterPulseCharge) + "%", x, y - 2); ctx.font = "700 9px Inter, sans-serif"; ctx.fillText(ready ? "READY" : "CHARGE", x, y + 15); ctx.restore();
}

function drawShooter(timestamp = 0) {
  clearCanvas(); ctx.save(); ctx.translate(0, gameSceneTop()); const flash = timestamp < shooterHitFlashUntil;
  drawPlayfield(10, 6, 700, shooterSceneHeight() - 12, { radius: 30, alpha: .54 });
  const nebula = ctx.createRadialGradient(360, shooterSceneHeight() * .28, 30, 360, shooterSceneHeight() * .28, 420); nebula.addColorStop(0, "rgba(33,127,142,.18)"); nebula.addColorStop(.52, "rgba(25,60,91,.08)"); nebula.addColorStop(1, "rgba(3,11,18,0)"); ctx.fillStyle = nebula; ctx.fillRect(12, 8, 696, shooterSceneHeight() - 16);
  for (let index = 0; index < 82; index += 1) { const speed = .022 + index % 5 * .007; const y = (index * 91 + timestamp * speed) % shooterSceneHeight(); const size = index % 7 === 0 ? 3 : index % 3 === 0 ? 2 : 1; ctx.globalAlpha = .34 + (index % 4) * .13; ctx.fillStyle = index % 9 === 0 ? "#80f8ee" : "#d7f1ff"; ctx.fillRect((index * 149) % 720, y, size, size * 1.6); }
  ctx.globalAlpha = 1; bullets.forEach(drawShooterBullet); enemyBullets.forEach(drawShooterEnemyBullet); enemies.forEach((enemy) => drawShooterEnemy(enemy, timestamp));
  pickups.forEach((pickup) => { const pulse = 1 + Math.sin(timestamp / 130 + pickup.phase) * .1; drawBitmapSprite(6, pickup.x - 7, pickup.y - 7, pickup.width + 14, pickup.height + 14, { fallback: pickup.type === "repair" ? "#7dffb1" : pickup.type === "overdrive" ? "#ffd06a" : "#71e6ff", scale: pulse, rotation: timestamp / 1100 }); ctx.save(); ctx.strokeStyle = pickup.type === "repair" ? "#7dffb1" : pickup.type === "overdrive" ? "#ffd06a" : "#71e6ff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2, 27 + Math.sin(timestamp / 100) * 3, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); });
  particles.forEach((particle) => { ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 2)); drawBitmapSprite(5, particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size, { fallback: particle.color, circle: true, padding: 8, alpha: ctx.globalAlpha }); });
  ctx.globalAlpha = 1;
  if (ship && !(timestamp < shipInvulnerableUntil && Math.floor(timestamp / 82) % 2)) {
    if (shooterShield > 0) { ctx.strokeStyle = "rgba(100,224,255,.9)"; ctx.lineWidth = 4; ctx.shadowColor = "#58dfff"; ctx.shadowBlur = 16; ctx.beginPath(); ctx.ellipse(ship.x + ship.width / 2, ship.y + ship.height / 2, ship.width * .64, ship.height * .57, 0, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; }
    drawBitmapSprite(0, ship.x - 14, ship.y - 14, ship.width + 28, ship.height + 28, { fallback: "#65e6df" }); drawBitmapSprite(7, ship.x + ship.width / 2 - 14, ship.y + ship.height - 10, 28, 42, { fallback: "#ffd16a", padding: 8, alpha: .94 });
  }
  if (shooterPulseEffect) { const progress = Math.min(1, Math.max(0, (timestamp - shooterPulseEffect.startedAt) / (shooterPulseEffect.until - shooterPulseEffect.startedAt))); ctx.strokeStyle = "rgba(133,255,249," + (1 - progress) + ")"; ctx.lineWidth = 9 * (1 - progress) + 2; ctx.shadowColor = "#7ffcf5"; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(shooterPulseEffect.x, shooterPulseEffect.y, shooterPulseEffect.radius * progress, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; }
  drawShooterHud(timestamp); drawShooterPulseControl(timestamp);
  if (timestamp < rapidFireUntil) { ctx.fillStyle = "#ffd06a"; ctx.font = "800 12px ui-monospace, Consolas, monospace"; ctx.textAlign = "left"; ctx.fillText("OVERDRIVE " + Math.max(0, Math.ceil((rapidFireUntil - timestamp) / 1000)) + "s", 28, 128); }
  if (timestamp < shooterWaveBannerUntil) { const alpha = Math.min(1, Math.max(0, (shooterWaveBannerUntil - timestamp) / 420)); ctx.fillStyle = "rgba(3,18,27," + Math.min(.78, alpha) + ")"; ctx.fillRect(0, shooterSceneHeight() * .42 - 42, 720, 84); ctx.fillStyle = "rgba(235,255,255," + alpha + ")"; ctx.font = "900 25px Inter, sans-serif"; ctx.textAlign = "center"; ctx.fillText(shooterWaveBannerText, 360, shooterSceneHeight() * .42 + 7); }
  if (flash) { ctx.fillStyle = "rgba(255,83,72,.16)"; ctx.fillRect(0, 0, 720, shooterSceneHeight()); }
  ctx.restore(); finishCanvasStyle();
}

function shooterLoop(timestamp) {
  if (!running) return;
  const delta = shooterLast ? timestamp - shooterLast : 16.67;
  if (shooterLast) shooterMaxFrameGapMs = Math.max(shooterMaxFrameGapMs, delta);
  shooterFrameCount += 1; shooterLast = timestamp; updateShooter(delta, timestamp); drawShooter(timestamp);
  if (running) shooterFrame = requestAnimationFrame(shooterLoop);
}

function startGame() {
  if (shooterFrame) cancelAnimationFrame(shooterFrame);
  resetCampaignRandom();
  const loadout = currentShooterLoadout();
  shooterWavePlans = shooterLevelBlueprints();
  killTarget = shooterWavePlans.reduce((total, wave) => total + wave.count, 0);
  ship = { x: 320, y: shooterSceneHeight() - 170, width: 80, height: 104 };
  bullets = []; enemies = []; enemyBullets = []; pickups = []; particles = []; kills = 0; shooterScore = 0;
  const difficultyLives = config.difficulty === "relaxed" ? 1 : config.difficulty === "challenging" ? -1 : 0;
  shooterMaxLives = Math.max(3, loadout.maxLives + difficultyLives); shooterLives = shooterMaxLives; shooterShield = loadout.id === "bulwark" ? 1 : 0;
  shooterHeld = { left: false, right: false, up: false, down: false }; shooterLast = 0; nextEnemyAt = performance.now() + 900; nextShotAt = 0; shipInvulnerableUntil = 0; shooterStartedAt = performance.now(); shooterPointerId = null; shooterCombo = 0; shooterBestCombo = 0; lastKillAt = 0; rapidFireUntil = 0; shooterGrazeCount = 0; shooterPointerMoves = 0; shooterFrameCount = 0; shooterMaxFrameGapMs = 0; shooterLastPointerMoveAt = 0; shooterMaxPointerGapMs = 0; shooterPointerTarget = null; shooterPointerType = "none";
  shooterWaveIndex = 0; shooterWaveSpawned = 0; shooterWaveDefeated = 0; shooterIntermissionUntil = performance.now() + 650; shooterPulseCharge = loadout.id === "bulwark" ? 50 : 35; shooterPulseEffect = null; shooterPulseReadyNotified = false; shooterBoss = null; shooterBossPhase = 0; shooterHitFlashUntil = 0;
  shooterWaveBannerText = "WAVE 1 · " + shooterWavePlans[0].label; shooterWaveBannerUntil = performance.now() + 2100;
  running = true; hideOverlay(); syncShooterAbilityControl(); setMetric("W1/3 · 0/" + killTarget); setStatus(currentShooterLoadout().label + "出击 · 第 1 波 " + shooterWavePlans[0].label + "；移动规避，主武器自动射击。"); startAmbient(); shooterFrame = requestAnimationFrame(shooterLoop);
}

function handleControl(value) {
  shooterPointerTarget = null;
  if (value === "left") { shooterHeld.left = true; setTimeout(() => { shooterHeld.left = false; }, 210); }
  if (value === "right") { shooterHeld.right = true; setTimeout(() => { shooterHeld.right = false; }, 210); }
  if (value === "up") { shooterHeld.up = true; setTimeout(() => { shooterHeld.up = false; }, 210); }
  if (value === "down") { shooterHeld.down = true; setTimeout(() => { shooterHeld.down = false; }, 210); }
  if (value === "pulse" || value === "fire") activateShooterPulse();
}

function handleKey(key) {
  shooterPointerTarget = null; const lower = key.toLowerCase();
  if (key === "ArrowLeft" || lower === "a") shooterHeld.left = true;
  if (key === "ArrowRight" || lower === "d") shooterHeld.right = true;
  if (key === "ArrowUp" || lower === "w") shooterHeld.up = true;
  if (key === "ArrowDown" || lower === "s") shooterHeld.down = true;
  if (key === " " || lower === "f") activateShooterPulse();
}

window.addEventListener("keyup", (event) => { const lower = event.key.toLowerCase(); if (event.key === "ArrowLeft" || lower === "a") shooterHeld.left = false; if (event.key === "ArrowRight" || lower === "d") shooterHeld.right = false; if (event.key === "ArrowUp" || lower === "w") shooterHeld.up = false; if (event.key === "ArrowDown" || lower === "s") shooterHeld.down = false; });

function moveShipTowardPointer(event) {
  const point = eventScenePoint(event);
  shooterPointerTarget = { x: Math.max(18, Math.min(720 - ship.width - 18, point.x - ship.width / 2)), y: Math.max(142, Math.min(shooterSceneHeight() - ship.height - 26, point.y - ship.height / 2)) };
  shooterPointerType = event.pointerType || "mouse"; const now = performance.now(); if (shooterLastPointerMoveAt) shooterMaxPointerGapMs = Math.max(shooterMaxPointerGapMs, now - shooterLastPointerMoveAt); shooterLastPointerMoveAt = now; shooterPointerMoves += 1;
}

canvas.addEventListener("pointerdown", (event) => {
  if (!running) return;
  const point = eventScenePoint(event);
  if (point.x > 588 && point.y > shooterSceneHeight() - 156 && shooterPulseCharge >= 100) { activateShooterPulse(); if (event.cancelable) event.preventDefault(); return; }
  shooterPointerId = event.pointerId; shooterPointerType = event.pointerType || "mouse"; shooterLastPointerMoveAt = performance.now(); moveShipTowardPointer(event); try { canvas.setPointerCapture(event.pointerId); } catch {} if (event.cancelable) event.preventDefault();
});

canvas.addEventListener("pointermove", (event) => { if (!running) return; const mouseHover = event.pointerType === "mouse" || !event.pointerType; if (!mouseHover && event.pointerId !== shooterPointerId) return; moveShipTowardPointer(event); if (event.cancelable) event.preventDefault(); });
function releaseShooterPointer(event) { if (event.pointerId !== shooterPointerId) return; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); if (shooterPointerType !== "mouse") shooterPointerTarget = null; shooterPointerId = null; }
canvas.addEventListener("pointerup", releaseShooterPointer); canvas.addEventListener("pointercancel", releaseShooterPointer); canvas.addEventListener("pointerleave", (event) => { if ((event.pointerType === "mouse" || !event.pointerType) && shooterPointerId === null) shooterPointerTarget = null; });

function estimatedShooterSessionSeconds() {
  const tier = currentCampaignLevel().tier;
  const guardian = currentCampaignLevel().number % 4 === 0;
  return Math.round((92 + tier * 6 + (guardian ? 12 : 0)) / campaignScale("densityMultiplier") * 10) / 10;
}

runtimeDebugActions = {
  beginContinuousInputAudit: () => { shooterInputAuditActive = true; startGame(); },
  endContinuousInputAudit: () => { shooterInputAuditActive = false; },
  damageOnce: () => { shooterInputAuditActive = false; shipInvulnerableUntil = 0; shooterShield = 0; damageShip(performance.now()); },
  collectRepair: () => { if (shooterLives >= shooterMaxLives) shooterLives = Math.max(1, shooterLives - 1); collectShooterPickup({ type: "repair", x: ship.x, y: ship.y, width: 40, height: 40 }, performance.now()); },
  spawnThreatWave: () => { const timestamp = performance.now(); const enemy = spawnShooterEnemy("turret", timestamp - 2000); enemy.x = ship.x + ship.width / 2 - enemy.width / 2; enemy.y = Math.max(180, ship.y - 210); enemy.warningUntil = 0; for (let index = 0; index < 9; index += 1) aimShooterBullet(enemy, 120, (index - 4) * .1, 9); },
  chargePulse: () => { shooterPulseCharge = 100; shooterPulseReadyNotified = true; syncShooterAbilityControl(); },
  triggerPulse: () => activateShooterPulse(),
  previewBoss: () => { const timestamp = performance.now(); enemies = []; enemyBullets = []; shooterWaveIndex = 2; shooterWavePlans[2] = { label: "守环者", count: 1, kinds: ["boss"], boss: true }; shooterWaveSpawned = 1; shooterWaveDefeated = 0; const boss = spawnShooterEnemy("boss", timestamp - 2000); boss.warningUntil = 0; boss.y = 138; },
  damageBossHalf: () => { if (!shooterBoss) return; shooterBoss.hp = shooterBoss.maxHp * .5 - 1; shooterBossPhase = 2; },
  forceLoss: () => { shooterInputAuditActive = false; shooterLives = 1; shooterShield = 0; shipInvulnerableUntil = 0; damageShip(performance.now()); },
};

runtimeDebugState = () => ({
  level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, loadout: shooterLoadout, loadoutCount: Object.keys(shooterLoadouts).length,
  kills, killTarget, score: shooterScore, lives: shooterLives, maxLives: shooterMaxLives, shield: shooterShield,
  currentWave: shooterWaveIndex + 1, waveCount: shooterWaveCount, waveLabel: shooterWavePlans[shooterWaveIndex]?.label || "待命", waveSpawned: shooterWaveSpawned, waveDefeated: shooterWaveDefeated,
  enemyCount: enemies.length, enemyBulletCount: enemyBullets.length, enemyArchetypeCount: shooterEnemyKinds.length, enemyArchetypes: [...shooterEnemyKinds],
  bossActive: Boolean(shooterBoss && !shooterBoss.dead), bossHp: shooterBoss ? Math.max(0, Math.round(shooterBoss.hp)) : 0, bossMaxHp: shooterBoss ? shooterBoss.maxHp : 0, bossPhase: shooterBossPhase,
  pulseCharge: Math.round(shooterPulseCharge), pulseReady: shooterPulseCharge >= 100, pulseEffectActive: Boolean(shooterPulseEffect), pickupCount: pickups.length,
  grazeCount: shooterGrazeCount, combo: shooterCombo, bestCombo: shooterBestCombo, pointerMoves: shooterPointerMoves, pointerCaptured: shooterPointerId !== null, pointerType: shooterPointerType, pointerTarget: shooterPointerTarget,
  shipPosition: { x: Math.round(ship.x), y: Math.round(ship.y) }, pointerControl: "mouse-hover-touch-hold-drag", abilityControl: "space-f-touch-button",
  bulletVisual: { width: 14, height: 34, glowRadius: 20, bitmapPadding: 2, highContrastCore: true }, enemyBulletVisual: { warmSolidCore: true, shapeDistinctFromPlayer: true, minimumRadius: 8 }, hudContract: "energy-wave-score-boss",
  inputAuditActive: shooterInputAuditActive, frameCount: shooterFrameCount, maxFrameGapMs: Math.round(shooterMaxFrameGapMs * 10) / 10, maxPointerGapMs: Math.round(shooterMaxPointerGapMs * 10) / 10,
  estimatedSessionSeconds: estimatedShooterSessionSeconds(), elapsedMs: shooterStartedAt ? Math.max(0, performance.now() - shooterStartedAt) : 0,
});

syncShooterLoadoutUi();
ship = { x: 320, y: shooterSceneHeight() - 170, width: 80, height: 104 };
shooterWavePlans = shooterLevelBlueprints();
syncShooterAbilityControl();
drawShooter();
`;
