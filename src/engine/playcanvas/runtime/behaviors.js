// 引擎层 · 行为运行时（浏览器运行时片段）。
// 行为注册表：id → 工厂(entity, params, node, ctx) → { update(dt, time)?, dispose()?, state()? , ...动作 }。
// GameProjectV3 的 behavior 绑定（moduleId / parameters）由 attachAll 挂到场景图实体上；未登记的 moduleId 记入 unknown 而不抛错。
// 网格约定：世界 x/z 平面，格子边长 grid.cellSize，格心 = 整数格坐标 × cellSize。所有内建行为都以“格”为单位思考，与 2D 运行时互不影响。

export function createGrid(cellSize) {
  const size = cellSize || 1;
  const solid = new Map();
  const key = (cx, cz) => cx + "," + cz;
  return {
    cellSize: size,
    cellOf(x, z) { return { x: Math.round(x / size), z: Math.round(z / size) }; },
    worldOf(cx, cz) { return { x: cx * size, z: cz * size }; },
    mark(cx, cz, height) { solid.set(key(cx, cz), height === undefined ? 0 : height); },
    heightAt(cx, cz) { return solid.has(key(cx, cz)) ? solid.get(key(cx, cz)) : null; },
    walkable(cx, cz) { return solid.has(key(cx, cz)); },
    cells() { return Array.from(solid.keys()).map((k) => { const [x, z] = k.split(",").map(Number); return { x, z, height: solid.get(k) }; }); },
    clear() { solid.clear(); },
  };
}

export function createEventBus() {
  const listeners = new Map();
  const log = [];
  return {
    on(type, handler) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(handler); return () => { const list = listeners.get(type) || []; const at = list.indexOf(handler); if (at >= 0) list.splice(at, 1); }; },
    emit(type, payload) {
      log.push({ type, payload, at: typeof performance !== "undefined" ? performance.now() : Date.now() }); if (log.length > 120) log.shift();
      (listeners.get(type) || []).slice().forEach((handler) => handler(payload, type));
      (listeners.get("*") || []).slice().forEach((handler) => handler(payload, type));
    },
    recent(count) { return log.slice(-(count || 20)); },
  };
}

export function createBehaviorRuntime(ctx) {
  // ctx: { grid, events, sceneGraph, reducedMotion, entityKit, colorKit, materials }
  const registry = new Map();
  const attached = [];
  const unknown = [];
  const cellDirections = { N: { x: 0, z: -1 }, S: { x: 0, z: 1 }, E: { x: 1, z: 0 }, W: { x: -1, z: 0 } };
  function register(id, factory) { registry.set(id, factory); }
  function cellOfEntity(entity) { const p = entity.getLocalPosition(); return ctx.grid.cellOf(p.x, p.z); }
  function placeAtCell(entity, cx, cz, y) { const w = ctx.grid.worldOf(cx, cz); const p = entity.getLocalPosition(); entity.setLocalPosition(w.x, y === undefined ? p.y : y, w.z); }
  function player() { return attached.find((item) => item.moduleId === "engine.grid-walker"); }
  function sameCell(a, b) { return a && b && a.x === b.x && a.z === b.z; }

  // 1) 网格占位 / 高度：把实体吸附到格心，登记为可走格；params.height 抬高顶面。
  register("engine.grid-footprint", (entity, params, node) => {
    const cell = cellOfEntity(entity);
    const height = Number(params.height === undefined ? node.size.y : params.height) || 0;
    const w = Math.max(1, Math.round(node.size.x / ctx.grid.cellSize)); const d = Math.max(1, Math.round(node.size.z / ctx.grid.cellSize));
    for (let dz = 0; dz < d; dz += 1) for (let dx = 0; dx < w; dx += 1) ctx.grid.mark(cell.x + dx - Math.floor((w - 1) / 2), cell.z + dz - Math.floor((d - 1) / 2), height);
    placeAtCell(entity, cell.x, cell.z);
    return { cell: () => cell, state: () => ({ cell, height, footprint: [w, d] }) };
  });
  // 2) 静态装饰：不参与碰撞与网格；可选随机朝向（确定性种子）。
  register("engine.static-decor", (entity, params, node) => {
    if (params.randomYaw) { const r = ctx.entityKit.seeded(Array.from(node.id).reduce((sum, ch) => sum + ch.charCodeAt(0), 0))(); entity.setLocalEulerAngles(0, r * 360, 0); }
    entity.findComponents("render").forEach((render) => { render.castShadows = params.castShadows !== false; });
    return { state: () => ({ decor: true }) };
  });
  // 3) 可拾取物：旋转 / 上下浮动；玩家进入同格时触发 collision 信号并隐藏自己（只触发一次）。
  register("engine.pickup", (entity, params, node) => {
    const cell = cellOfEntity(entity); const base = entity.getLocalPosition().y; let collected = false; let spin = 0;
    const visual = entity.userData && entity.userData.visual;
    return {
      update(dt, time) {
        if (collected) return;
        if (!ctx.reducedMotion) { spin += dt * (Number(params.spinSpeed) || 1.4); if (visual) { visual.setLocalEulerAngles(0, spin * 180 / Math.PI, 0); const p = visual.getLocalPosition(); visual.setLocalPosition(p.x, node.size.y / 2 + Math.sin(time * 2.2) * (Number(params.bob) || 0.05), p.z); } }
        const walker = player();
        if (walker && sameCell(walker.behavior.cell(), cell)) { collected = true; entity.enabled = false; ctx.events.emit("collision", { sourceId: walker.node.objectId, targetId: node.objectId, sourceInstanceId: walker.node.id, targetInstanceId: node.id, kind: "pickup" }); }
      },
      state: () => ({ cell, collected, base }),
    };
  });
  // 4) 压板 / 可触发机关：玩家踩上去切换 active（toggle）或按住（hold），发 trigger 事件并改自发光。
  register("engine.pressure-plate", (entity, params, node) => {
    const cell = cellOfEntity(entity); let active = false; let occupied = false;
    const mode = params.mode === "hold" ? "hold" : "toggle";
    const visual = entity.userData && entity.userData.visual;
    const material = visual ? ctx.materials.uniqueMaterial({ tint: node.color, emissive: node.color, emissiveIntensity: 0.05 }) : null;
    if (visual && material) visual.render.meshInstances[0].material = material;
    function setActive(next) { if (next === active) return; active = next; if (material) { material.emissiveIntensity = active ? 0.6 : 0.05; material.update(); } ctx.events.emit("trigger", { instanceId: node.id, objectId: node.objectId, active }); }
    return {
      update() {
        const walker = player(); const on = Boolean(walker && sameCell(walker.behavior.cell(), cell));
        if (mode === "hold") setActive(on); else if (on && !occupied) setActive(!active);
        occupied = on;
      },
      state: () => ({ cell, active, mode }),
    };
  });
  // 5) 节拍移动障碍：沿 params.path（相对格位移数组，如 [[1,0],[1,0],[-1,0],[-1,0]]）每 every 拍走一步；与玩家同格时发 hazard 碰撞。
  register("engine.beat-mover", (entity, params, node) => {
    const origin = cellOfEntity(entity); const path = Array.isArray(params.path) && params.path.length ? params.path : [[1, 0], [-1, 0]];
    const every = Math.max(1, Number(params.every) || 1); const y = entity.getLocalPosition().y;
    let beats = 0; let step = 0; let cell = { x: origin.x, z: origin.z }; let from = { x: origin.x, z: origin.z }; let progress = 1; let hits = 0;
    function nextCell() { const move = path[step % path.length]; return { x: cell.x + move[0], z: cell.z + move[1] }; }
    return {
      beat() {
        beats += 1; if (beats % every !== 0) return;
        from = cell; cell = nextCell(); step += 1; progress = 0;
        const walker = player(); if (walker && sameCell(walker.behavior.cell(), cell)) { hits += 1; ctx.events.emit("collision", { sourceId: walker.node.objectId, targetId: node.objectId, sourceInstanceId: walker.node.id, targetInstanceId: node.id, kind: "hazard" }); }
      },
      update(dt) {
        progress = Math.min(1, progress + dt * 4);
        const a = ctx.grid.worldOf(from.x, from.z); const b = ctx.grid.worldOf(cell.x, cell.z); const f = ctx.reducedMotion ? 1 : progress;
        entity.setLocalPosition(a.x + (b.x - a.x) * f, y, a.z + (b.z - a.z) * f);
      },
      cell: () => cell, next: () => nextCell(),
      state: () => ({ cell, next: nextCell(), beats, hits, every }),
    };
  });
  // 6) 网格行走者（玩家）：抽象动作 N/E/S/W 走一格（目标格必须可走），jump 越过一格空隙；移动为一拍插值。
  register("engine.grid-walker", (entity, params, node) => {
    let cell = cellOfEntity(entity); let from = cell; let progress = 1; let facing = "S"; let moves = 0; let blocked = 0;
    const y = entity.getLocalPosition().y; const speed = Number(params.stepsPerSecond) || 4;
    function tryMove(direction, distance) {
      const d = cellDirections[direction]; if (!d) return false;
      facing = direction;
      const target = { x: cell.x + d.x * distance, z: cell.z + d.z * distance };
      if (!ctx.grid.walkable(target.x, target.z)) { blocked += 1; ctx.events.emit("blocked", { instanceId: node.id, direction }); return false; }
      from = cell; cell = target; progress = 0; moves += 1;
      ctx.events.emit("moved", { instanceId: node.id, objectId: node.objectId, cell, direction });
      return true;
    }
    return {
      control(action) {
        if (action === "jump") { const d = cellDirections[facing]; if (!d) return false; if (ctx.grid.walkable(cell.x + d.x, cell.z + d.z)) { blocked += 1; ctx.events.emit("blocked", { instanceId: node.id, direction: facing, jump: true }); return false; } return tryMove(facing, 2); }
        return tryMove(action, 1);
      },
      update(dt) {
        progress = Math.min(1, progress + dt * speed);
        const a = ctx.grid.worldOf(from.x, from.z); const b = ctx.grid.worldOf(cell.x, cell.z); const f = ctx.reducedMotion ? 1 : progress;
        const arc = ctx.reducedMotion ? 0 : Math.sin(f * Math.PI) * 0.15;
        entity.setLocalPosition(a.x + (b.x - a.x) * f, y + arc, a.z + (b.z - a.z) * f);
        const yaw = facing === "N" ? 180 : facing === "S" ? 0 : facing === "E" ? 90 : -90; entity.setLocalEulerAngles(0, yaw, 0);
      },
      cell: () => cell, facing: () => facing,
      state: () => ({ cell, facing, moves, blocked }),
    };
  });

  function attachAll(sceneGraph) {
    sceneGraph.list.forEach(({ node, entity }) => {
      (node.behaviors || []).forEach((binding) => {
        if (binding.enabled === false) return;
        const factory = registry.get(binding.moduleId);
        if (!factory) { unknown.push({ instanceId: node.id, moduleId: binding.moduleId }); return; }
        const behavior = factory(entity, binding.parameters || {}, node, ctx) || {};
        attached.push({ id: binding.id, moduleId: binding.moduleId, instanceId: node.id, node, entity, behavior });
      });
    });
    // 先挂 footprint（登记可走格），其它行为的初始化不依赖顺序。
    return attached;
  }
  let time = 0;
  function update(dt) { time += dt; attached.forEach((item) => { if (item.behavior.update) item.behavior.update(dt, time); }); }
  function beat() { attached.forEach((item) => { if (item.behavior.beat) item.behavior.beat(); }); }
  function control(action) { const walker = player(); return walker && walker.behavior.control ? walker.behavior.control(action) : false; }
  function dispose() { attached.splice(0).forEach((item) => { if (item.behavior.dispose) item.behavior.dispose(); }); }
  function snapshot() { return attached.map((item) => ({ id: item.id, moduleId: item.moduleId, instanceId: item.instanceId, state: item.behavior.state ? item.behavior.state() : null })); }
  return { registry, register, attachAll, attached, unknown, update, beat, control, dispose, snapshot, player, cellDirections };
}
