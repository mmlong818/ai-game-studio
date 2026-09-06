/** One implementation feeds the rendered preview and the real paddle collision. */
export const breakoutGuidanceScript = String.raw`
function breakoutReturnVelocity(offset, speed) {
  const angle = Math.max(-1, Math.min(1, offset)) * 1.02;
  const vx = Math.sin(angle) * speed;
  const vy = -Math.max(speed * .62, Math.abs(Math.cos(angle) * speed));
  const length = Math.hypot(vx, vy) || 1;
  return { vx: vx / length * speed, vy: vy / length * speed };
}

function breakoutLandingX(ball, paddleY, left = 48, right = 672) {
  if (ball.vy <= 0 || ball.y > paddleY - ball.radius) return null;
  const min = left + ball.radius, width = right - left - ball.radius * 2;
  const unfolded = ball.x + ball.vx * (paddleY - ball.radius - ball.y) / ball.vy - min;
  const folded = ((unfolded % (2 * width)) + 2 * width) % (2 * width);
  return min + (folded <= width ? folded : 2 * width - folded);
}

// Stop at the first expanded collision rectangle, not at an attractive target behind it.
function breakoutTraceReturn(origin, velocity, targets, ceiling, radius = 14) {
  let x = origin.x, y = origin.y, vx = velocity.vx, vy = velocity.vy;
  const points = [{ x, y }];
  for (let bounce = 0; bounce < 5; bounce += 1) {
    let time = (ceiling + radius - y) / vy;
    let edge = "top", hit = null;
    if (Math.abs(vx) > .00001) {
      const wall = ((vx > 0 ? 672 - radius : 48 + radius) - x) / vx;
      if (wall >= 0 && wall < time) { time = wall; edge = "wall"; }
    }
    for (const brick of targets) {
      if (!brick.alive) continue;
      const x1 = brick.x - radius, x2 = brick.x + brick.width + radius;
      const y1 = brick.y - radius, y2 = brick.y + brick.height + radius;
      if (Math.abs(vx) < .00001 && (x < x1 || x > x2)) continue;
      const enterX = Math.abs(vx) < .00001 ? -Infinity : Math.min((x1 - x) / vx, (x2 - x) / vx);
      const leaveX = Math.abs(vx) < .00001 ? Infinity : Math.max((x1 - x) / vx, (x2 - x) / vx);
      const enterY = Math.min((y1 - y) / vy, (y2 - y) / vy);
      const leaveY = Math.max((y1 - y) / vy, (y2 - y) / vy);
      const enter = Math.max(0, enterX, enterY), leave = Math.min(leaveX, leaveY);
      if (enter <= leave && enter <= time) { time = enter; hit = brick; edge = "brick"; }
    }
    if (!Number.isFinite(time) || time < 0) break;
    x += vx * time; y += vy * time;
    points.push({ x, y });
    if (edge !== "wall") return { points, targetId: hit ? hit.id : null };
    vx *= -1;
  }
  return { points, targetId: null };
}

function breakoutLesson(index) {
  return [
    { title: "学会控角", detail: "接在挡板左侧向左飞，右侧向右飞；虚线显示回球方向。" },
    { title: "先取潮盾", detail: "◇ 潮盾砖在前排，击碎后自动保住一次失球。" },
    { title: "借宽板开路", detail: "↔ 先打宽板砖，十秒内接球范围变大，再清理两翼。" },
    { title: "穿透破重甲", detail: "✦ 穿透砖藏在通路后，取得四次穿透可一击击碎重甲。" },
    { title: "规划能力顺序", detail: "先取潮盾保底，再借宽板与穿透清理深处重甲。" },
  ][Math.min(4, Math.floor(index / 4))];
}

function breakoutArrangePowers(targets, index) {
  const chapter = Math.min(4, Math.floor(index / 4));
  const kinds = chapter === 0 ? [] : chapter === 1 ? ["shield"] : chapter === 2 ? ["wide", "shield"] : chapter === 3 ? ["pierce", "shield"] : ["shield", "wide", "pierce"];
  const available = [...targets].sort((a, b) => b.row - a.row || Math.abs(a.column - 4) - Math.abs(b.column - 4) || a.column - b.column);
  kinds.forEach((kind, i) => {
    // Spread powers across accessible lower ranks; retain original layout and armor elsewhere.
    const offset = kind === "pierce" ? Math.min(available.length - 1, Math.floor(available.length * .35)) : Math.min(available.length - 1, i * 3);
    const brick = available.splice(offset, 1)[0];
    if (brick) { brick.kind = kind; brick.hits = 1; brick.maxHits = 1; }
  });
}
`;
