// Original track-space arcade physics. Rendering is deliberately independent of rules.
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const wrap = (v, size) => ((v % size) + size) % size;
export const angleDelta = (a, b) => wrap(a - b + Math.PI, TAU) - Math.PI;
export const RULES = Object.freeze({ halfWidth: 9, speed: 25, boostSpeed: 36, boostCost: 40, boostSeconds: 2.1, laps: 3 });

function curve(t) {
  const a = t * TAU;
  const bridge = Math.max(0, 1 - Math.abs(t - .53) / .11);
  return { x: Math.sin(a) * 190 + Math.sin(a * 2) * 38, z: Math.cos(a) * 140 + Math.cos(a * 3) * 22, y: 2.5 + (1 - Math.cos(bridge * Math.PI)) * 3.7 + Math.sin(a * 2) * .8 };
}
export function createTrack() {
  const points = []; let length = 0;
  for (let i = 0; i <= 1200; i++) {
    const p = curve(i / 1200), prev = points.at(-1);
    if (prev) length += Math.hypot(p.x - prev.x, p.z - prev.z);
    points.push({ ...p, s: length, t: i / 1200 });
  }
  function sample(distance, offset = 0) {
    const s = wrap(distance, length);
    let lo = 0, hi = points.length - 1;
    while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (points[mid].s > s) hi = mid; else lo = mid; }
    const p = points[lo], q = points[hi], f = (s - p.s) / (q.s - p.s);
    const yaw = Math.atan2(q.x - p.x, q.z - p.z);
    return { x: p.x + (q.x - p.x) * f - Math.cos(yaw) * offset, y: p.y + (q.y - p.y) * f,
      z: p.z + (q.z - p.z) * f + Math.sin(yaw) * offset, yaw, t: (lo + f) / 1200 };
  }
  return { length, points, sample, curvature(s) { return angleDelta(sample(s + 3).yaw, sample(s - 3).yaw) / 6; } };
}
export const track = createTrack();
export const RACERS = [
  { name: '你', color: '#21bcb1' }, { name: '蜜桃', color: '#ed8ca1' }, { name: '柠檬', color: '#eed05c' },
];
export function interpolateCar(car, alpha) {
  const fraction = clamp(alpha, 0, 1), view = { ...car };
  for (const key of ['s', 'offset', 'heading']) {
    const previous = car.previousPose?.[key] ?? car[key];
    view[key] = previous + (car[key] - previous) * fraction;
  }
  return view;
}
export function createRace(mode = 'race', difficulty = 'easy') {
  return { mode, difficulty, phase: 'countdown', countdown: 3.2, time: 0, lapTimes: [], lastLapAt: 0,
    racers: RACERS.map((r, id) => ({ ...r, id, s: -(id + 1) * 5, offset: id % 2 ? 2.7 : -2.7,
      speed: 0, heading: 0, energy: 60, boost: 0, shield: 0, hit: 0, coins: 0, lap: 0, finishTime: null, wallHits: 0 })),
    pickups: Array.from({ length: 66 }, (_, i) => ({ s: 30 + (i / 66) * (track.length - 60), offset: [-4.5, 0, 4.5][Math.floor(i / 3) % 3],
      type: i % 11 === 8 ? 'box' : 'coin', readyAt: 0 })), events: [], result: null };
}
export function drive(car, input, dt, difficulty = 'easy') {
  car.hit = Math.max(0, car.hit - dt); car.shield = Math.max(0, car.shield - dt);
  car.boost = Math.max(0, car.boost - dt);
  car.energy = Math.min(100, car.energy + 3.4 * dt);
  if (input.boost && car.energy >= RULES.boostCost && car.boost <= 0) { car.energy -= RULES.boostCost; car.boost = RULES.boostSeconds; }
  const offroad = Math.abs(car.offset) > RULES.halfWidth - 1.4;
  const throttle = clamp(input.throttle ?? 1, 0, 1);
  const target = (input.brake ? 12 : car.boost > 0 ? RULES.boostSpeed : RULES.speed * throttle) * (offroad ? .64 : 1) * (car.hit > 0 ? .72 : 1);
  car.speed += clamp(target - car.speed, -22 * dt, 10 * dt);
  const steer = clamp(input.steer || 0, -1, 1), curvature = track.curvature(car.s);
  const ds = car.speed * Math.cos(car.heading) * dt;
  // Partial assisted steering, not an on-rails lane switch. Counter-steering and lateral position remain player-controlled.
  const assist = difficulty === 'easy' ? .91 : .68;
  car.heading += steer * 1.5 * dt * Math.min(1, car.speed / 8) + curvature * ds * (1 - assist);
  car.heading *= Math.exp(-(steer ? 1.65 : 3.1) * dt);
  car.heading = clamp(car.heading, -.72, .72);
  car.offset += Math.sin(car.heading) * car.speed * dt;
  if (Math.abs(car.offset) > RULES.halfWidth) {
    car.offset = Math.sign(car.offset) * RULES.halfWidth;
    car.heading *= -.3;
    if (!car.hit) { car.speed *= .78; car.wallHits++; car.hit = .45; }
  }
  car.s += ds;
}
export function aiInput(race, car) {
  // Bounded reactions and imperfect driving, not hidden changes to vehicle physics.
  if (car.aiDecision && race.time < car.aiDecisionAt) return car.aiDecision;
  const novice = race.difficulty === 'easy';
  let lane = Math.sin(car.s / 80 + car.id * 2) * 4;
  const item = race.pickups.find(p => p.readyAt <= race.time && wrap(p.s - car.s, track.length) < 24);
  if (item) lane = item.offset;
  const ahead = race.racers.find(r => r.id !== car.id && r.s - car.s > 0 && r.s - car.s < 11 && Math.abs(r.offset - car.offset) < 2.5);
  if (ahead) lane = ahead.offset > 0 ? -4 : 4;
  const boost = car.energy >= 75 && race.time >= (car.aiBoostAfter ?? 8 + car.id * 2)
    && Math.abs(track.curvature(car.s + 15)) < .009;
  if (boost) car.aiBoostAfter = race.time + (novice ? 16 : 12) + car.id;
  car.aiDecisionAt = race.time + (novice ? .32 : .22) + car.id * .035;
  car.aiDecision = { steer: clamp((lane - car.offset) * .16 - car.heading * 2.7, -1, 1),
    throttle: novice ? .92 + car.id * .01 : .97, boost, brake: false };
  return car.aiDecision;
}
export function ranking(race) {
  return [...race.racers].sort((a, b) => {
    if (a.finishTime !== null && b.finishTime !== null) return a.finishTime - b.finishTime;
    if (a.finishTime !== null) return -1; if (b.finishTime !== null) return 1;
    return b.s - a.s;
  });
}
export function stepRace(race, input, dt) {
  race.events = [];
  if (!['countdown', 'racing'].includes(race.phase)) return;
  dt = clamp(dt, 0, .05);
  if (race.phase === 'countdown') {
    race.countdown -= dt;
    if (race.countdown <= 0) { race.phase = 'racing'; race.events.push({ type: 'go' }); }
    return;
  }
  race.time += dt;
  for (const car of race.racers) {
    if (car.finishTime !== null) continue;
    car.previousPose = { s: car.s, offset: car.offset, heading: car.heading };
    const before = car.s;
    drive(car, car.id === 0 ? input : aiInput(race, car), dt, race.difficulty);
    for (const p of race.pickups) {
      if (p.readyAt > race.time || Math.abs(car.offset - p.offset) > 1.9) continue;
      const distance = wrap(p.s - before, track.length);
      if (distance <= car.s - before + .7) {
        p.readyAt = race.time + 14;
        if (p.type === 'coin') { car.coins++; car.energy = Math.min(100, car.energy + 7); }
        else if ((car.coins + car.id) % 2) { car.shield = 7; }
        else { car.energy = Math.min(100, car.energy + 40); }
        if (car.id === 0) race.events.push({ type: p.type, shield: car.shield > 0 });
      }
    }
    const completed = Math.max(0, Math.floor(car.s / track.length));
    if (completed > car.lap) {
      car.lap = completed;
      if (car.id === 0) { race.lapTimes.push(race.time - race.lastLapAt); race.lastLapAt = race.time; race.events.push({ type: 'lap', lap: car.lap }); }
    }
    if (race.mode === 'race' && car.s >= track.length * RULES.laps) car.finishTime = race.time;
  }
  for (let i = 0; i < race.racers.length; i++) for (let j = i + 1; j < race.racers.length; j++) {
    const a = race.racers[i], b = race.racers[j];
    const gap = angleDelta(wrap(a.s, track.length) / track.length * TAU, wrap(b.s, track.length) / track.length * TAU) * track.length / TAU;
    if (Math.abs(gap) < 2.4 && Math.abs(a.offset - b.offset) < 2.1 && !a.hit && !b.hit && a.finishTime === null && b.finishTime === null) {
      const dir = a.offset >= b.offset ? 1 : -1;
      for (const [car, sign] of [[a, dir], [b, -dir]]) {
        if (!car.shield) { car.offset = clamp(car.offset + sign * .6, -9, 9); car.speed *= .86; car.hit = .55; }
      }
    }
  }
  if (race.racers[0].finishTime !== null) {
    race.phase = 'finished';
    const order = ranking(race);
    race.result = { rank: order.findIndex(c => c.id === 0) + 1, time: race.time, coins: race.racers[0].coins,
      bestLap: Math.min(...race.lapTimes), order: order.map(c => c.id) };
    race.events.push({ type: 'finish' });
  }
}
