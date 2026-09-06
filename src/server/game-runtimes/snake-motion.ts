/** Embedded unchanged in the generated game and exercised by rule tests. Units are world cells. */
export const snakeMotionScript = String.raw`
function advanceSnakeMotion(parts, heading, target, seconds, options) {
  const body = parts.map(part => ({ ...part }));
  let angle = heading, distance = 0;
  const total = Math.max(0, Math.min(.25, seconds));
  if (total === 0) return { parts: body, angle, distance, reason: '', collision: null };
  const steps = Math.max(1, Math.ceil(total / (1 / 120)));
  const dt = total / steps;
  for (let step = 0; step < steps; step += 1) {
    const difference = Math.atan2(Math.sin(target - angle), Math.cos(target - angle));
    angle += Math.max(-options.turnRate * dt, Math.min(options.turnRate * dt, difference));
    const head = { x: body[0].x + Math.cos(angle) * options.speed * dt, y: body[0].y + Math.sin(angle) * options.speed * dt };
    let reason = '';
    const crossed = head.x < 0 || head.y < 0 || head.x > options.width - 1 || head.y > options.height - 1;
    if (crossed && options.wrap) {
      const x = (head.x + options.width) % options.width, y = (head.y + options.height) % options.height;
      const dx = x - head.x, dy = y - head.y;
      head.x = x; head.y = y;
      body.forEach(part => { part.x += dx; part.y += dy; });
    } else if (crossed) reason = '撞到庭园边界';
    if (options.obstacles.some(part => Math.hypot(part.x - head.x, part.y - head.y) < .72)) reason = '撞到庭石';
    if (options.selfCollision && body.slice(3).some(part => Math.hypot(part.x - head.x, part.y - head.y) < .55)) reason = '撞到自己的身体';
    if (reason) return { parts: body, angle, distance, reason, collision: head };
    body[0] = head;
    for (let index = 1; index < body.length; index += 1) {
      const previous = body[index - 1], part = body[index];
      const length = Math.hypot(part.x - previous.x, part.y - previous.y);
      if (length > .8) {
        part.x = previous.x + (part.x - previous.x) / length * .8;
        part.y = previous.y + (part.y - previous.y) / length * .8;
      }
    }
    distance += options.speed * dt;
  }
  return { parts: body, angle, distance, reason: '', collision: null };
}
`;
