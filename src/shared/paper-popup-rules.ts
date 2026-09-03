/**
 * 纸境 · 立体书迷宫（paper-popup）规则内核。
 *
 * 这是旋转 / 可达性模型的唯一实现：服务端求解器、领域 GameProbe、Node 测试与浏览器运行时都使用同一份代码。
 * 浏览器运行时通过 `createPaperPopupRules.toString()` 内嵌本工厂，因此本文件必须保持自包含：
 * 不引用模块级变量、不 import 运行时依赖、只使用 ES2020 语法。
 *
 * 模型摘要：
 * - 关卡是 W×D 网格；每格高度 0（空洞）或 1–9；角色永远站在某个格上。
 * - 整本书按 90° 转动，朝向 o ∈ {0,1,2,3}。转动不消耗节拍，但会改变桥 / 台阶的连接与星星的可见性。
 * - 时间以节拍推进：走一格、跳一次、等待各占一个节拍；纸浪 / 纸鸟按节拍沿路径移动；限时门按节拍倒数。
 * - 失败（跳空、被纸浪 / 纸鸟撞到）回到最近检查点，不整局重来。
 */

export type PopupCell = { x: number; z: number };
export type PopupAngle = 0 | 1 | 2 | 3;
export type PopupDirection = "N" | "E" | "S" | "W";
export type PopupAction = "cw" | "ccw" | PopupDirection | "jN" | "jE" | "jS" | "jW" | "wait";

export type PopupLink = {
  id: string;
  /** bridge：跨越 1–2 个空洞格、两端同高；stair：相邻两格、高差 2。 */
  kind: "bridge" | "stair";
  from: PopupCell;
  to: PopupCell;
  /** 只在这些朝向下接上；省略表示任何朝向都接上。 */
  angles?: PopupAngle[];
  /** 由某块翻转压板控制：压板为开时接上。 */
  plate?: string;
  /** 顺序机关：顺序进度 ≥ step 时接上。 */
  step?: number;
  /** 顺序机关：顺序进度 ≥ closeStep 时断开（开合桥）。 */
  closeStep?: number;
  /** 限时门：对应计时压板剩余节拍 > 0 时接上。 */
  timer?: string;
};

export type PopupPlate = {
  id: string;
  at: PopupCell;
  kind: "toggle" | "order" | "timer";
  /** order 压板的序号（从 1 开始）。 */
  order?: number;
  /** timer 压板触发后的节拍数（开门有效动作数为 duration - 1）。 */
  duration?: number;
};

export type PopupHazard = {
  id: string;
  kind: "wave" | "bird";
  path: PopupCell[];
  /** 每移动一格所需节拍数。 */
  every: number;
  phase?: number;
};

export type PopupStar = PopupCell & { angles: PopupAngle[] };

export type PopupBlueprint = {
  id: string;
  name: string;
  chapter: 1 | 2 | 3 | 4;
  chapterName: string;
  intro: string;
  rows: string[];
  start: PopupCell;
  exit: PopupCell;
  checkpoints: PopupCell[];
  stars: PopupStar[];
  links: PopupLink[];
  plates: PopupPlate[];
  hazards: PopupHazard[];
};

export type PopupState = {
  x: number;
  z: number;
  o: PopupAngle;
  t: number;
  checkpoint: number;
  stars: boolean[];
  toggles: Record<string, boolean>;
  progress: number;
  timers: Record<string, number>;
  mistakes: number;
  done: boolean;
  facing: PopupDirection;
};

export type PopupStepResult = {
  state: PopupState;
  events: string[];
  ok: boolean;
};

export type PopupSolveOptions = {
  allowRotate?: boolean;
  maxNodes?: number;
};

export type PopupSolution = {
  actions: PopupAction[];
  beats: number;
  rotations: number;
};

export type PopupRules = ReturnType<typeof createPaperPopupRules>;

export function createPaperPopupRules() {
  const DIRECTIONS: Record<PopupDirection, PopupCell> = { N: { x: 0, z: -1 }, E: { x: 1, z: 0 }, S: { x: 0, z: 1 }, W: { x: -1, z: 0 } };
  const DIRECTION_ORDER: PopupDirection[] = ["N", "E", "S", "W"];
  const MOVE_ACTIONS: PopupAction[] = ["N", "E", "S", "W"];
  const JUMP_ACTIONS: PopupAction[] = ["jN", "jE", "jS", "jW"];

  function width(bp: PopupBlueprint) { return bp.rows[0]?.length ?? 0; }
  function depth(bp: PopupBlueprint) { return bp.rows.length; }
  function inside(bp: PopupBlueprint, x: number, z: number) { return z >= 0 && z < depth(bp) && x >= 0 && x < width(bp); }
  function heightAt(bp: PopupBlueprint, x: number, z: number) {
    if (!inside(bp, x, z)) return 0;
    const code = bp.rows[z].charCodeAt(x);
    return code >= 49 && code <= 57 ? code - 48 : 0;
  }
  function solid(bp: PopupBlueprint, x: number, z: number) { return heightAt(bp, x, z) > 0; }
  function same(a: PopupCell, b: PopupCell) { return a.x === b.x && a.z === b.z; }
  function cellKey(cell: PopupCell) { return cell.x + "," + cell.z; }

  /** 屏幕方向 → 网格方向：书顺时针转了 o 次 90°，玩家按“向上”时应沿网格里被转到远端的方向走。 */
  function screenToGrid(direction: PopupDirection, o: PopupAngle): PopupDirection {
    const index = DIRECTION_ORDER.indexOf(direction);
    return DIRECTION_ORDER[(index - o + 4) % 4];
  }

  function hazardCell(hazard: PopupHazard, t: number): PopupCell {
    const every = Math.max(1, hazard.every | 0);
    const index = Math.floor((t + (hazard.phase || 0)) / every) % hazard.path.length;
    return hazard.path[index];
  }

  function hazardCells(bp: PopupBlueprint, t: number) {
    return bp.hazards.map((hazard) => hazardCell(hazard, t));
  }

  function hazardCycle(bp: PopupBlueprint) {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    let cycle = 1;
    for (const hazard of bp.hazards) {
      const length = Math.max(1, hazard.every | 0) * hazard.path.length;
      cycle = (cycle * length) / gcd(cycle, length);
    }
    return cycle;
  }

  function linkOpen(link: PopupLink, state: Pick<PopupState, "o" | "toggles" | "progress" | "timers">) {
    if (link.angles && !link.angles.includes(state.o)) return false;
    if (link.plate && !state.toggles[link.plate]) return false;
    if (typeof link.step === "number" && state.progress < link.step) return false;
    if (typeof link.closeStep === "number" && state.progress >= link.closeStep) return false;
    if (link.timer && !((state.timers[link.timer] || 0) > 0)) return false;
    return true;
  }

  /** 从 from 沿 direction 出发，找到当前状态下可通行的链接（桥或台阶）以及落点。 */
  function linkFrom(bp: PopupBlueprint, state: PopupState, from: PopupCell, direction: PopupDirection) {
    const delta = DIRECTIONS[direction];
    for (const link of bp.links) {
      const ends = same(link.from, from) ? [link.from, link.to] : same(link.to, from) ? [link.to, link.from] : null;
      if (!ends) continue;
      const dx = Math.sign(ends[1].x - ends[0].x);
      const dz = Math.sign(ends[1].z - ends[0].z);
      if (dx !== delta.x || dz !== delta.z) continue;
      if (!linkOpen(link, state)) continue;
      return { link, to: ends[1] };
    }
    return null;
  }

  /** 走一步的落点；null 表示走不了。 */
  function walkTarget(bp: PopupBlueprint, state: PopupState, direction: PopupDirection): PopupCell | null {
    const delta = DIRECTIONS[direction];
    const here = { x: state.x, z: state.z };
    const next = { x: here.x + delta.x, z: here.z + delta.z };
    const h = heightAt(bp, here.x, here.z);
    if (solid(bp, next.x, next.z) && Math.abs(heightAt(bp, next.x, next.z) - h) <= 1) return next;
    const via = linkFrom(bp, state, here, direction);
    if (via) return via.to;
    return null;
  }

  /** 跳跃：只能越过正前方的一格空洞，落到再前一格；前方是实心格时跳不出去。返回 { cell, falls, blocked }。 */
  function jumpTarget(bp: PopupBlueprint, state: PopupState, direction: PopupDirection) {
    const delta = DIRECTIONS[direction];
    const h = heightAt(bp, state.x, state.z);
    const over = { x: state.x + delta.x, z: state.z + delta.z };
    const land = { x: state.x + delta.x * 2, z: state.z + delta.z * 2 };
    if (solid(bp, over.x, over.z)) return { cell: null, falls: false, blocked: true };
    const landHeight = heightAt(bp, land.x, land.z);
    if (landHeight > 0 && landHeight <= h + 1) return { cell: land, falls: false, blocked: false };
    return { cell: land, falls: true, blocked: false };
  }

  function respawnCell(bp: PopupBlueprint, state: PopupState): PopupCell {
    return state.checkpoint >= 0 ? bp.checkpoints[state.checkpoint] : bp.start;
  }

  function createState(bp: PopupBlueprint): PopupState {
    return {
      x: bp.start.x,
      z: bp.start.z,
      o: 0,
      t: 0,
      checkpoint: -1,
      stars: bp.stars.map(() => false),
      toggles: {},
      progress: 0,
      timers: {},
      mistakes: 0,
      done: false,
      facing: "N",
    };
  }

  function cloneState(state: PopupState): PopupState {
    return {
      x: state.x, z: state.z, o: state.o, t: state.t, checkpoint: state.checkpoint,
      stars: state.stars.slice(), toggles: { ...state.toggles }, progress: state.progress,
      timers: { ...state.timers }, mistakes: state.mistakes, done: state.done, facing: state.facing,
    };
  }

  function plateAt(bp: PopupBlueprint, cell: PopupCell) {
    return bp.plates.find((plate) => same(plate.at, cell)) || null;
  }

  /** 到达一格后的即时结算：压板、检查点、星星、出口。 */
  function settleCell(bp: PopupBlueprint, state: PopupState, events: string[], landed: boolean) {
    const here = { x: state.x, z: state.z };
    if (landed) {
      const plate = plateAt(bp, here);
      if (plate) {
        if (plate.kind === "toggle") {
          state.toggles[plate.id] = !state.toggles[plate.id];
          events.push("plate:" + plate.id + ":" + (state.toggles[plate.id] ? "on" : "off"));
        } else if (plate.kind === "order") {
          const order = plate.order || 1;
          if (order === state.progress + 1) { state.progress = order; events.push("order:" + state.progress); }
          else if (order > state.progress + 1) { state.progress = 0; events.push("order:reset"); }
        } else if (plate.kind === "timer") {
          state.timers[plate.id] = Math.max(1, plate.duration || 6);
          events.push("timer:" + plate.id);
        }
      }
      const checkpointIndex = bp.checkpoints.findIndex((point) => same(point, here));
      if (checkpointIndex >= 0 && checkpointIndex > state.checkpoint) {
        state.checkpoint = checkpointIndex;
        events.push("checkpoint:" + checkpointIndex);
      }
    }
    bp.stars.forEach((star, index) => {
      if (!state.stars[index] && same(star, here) && star.angles.includes(state.o)) {
        state.stars[index] = true;
        events.push("star:" + index);
      }
    });
    if (same(bp.exit, here) && !state.done) {
      state.done = true;
      events.push("exit");
    }
  }

  function fail(bp: PopupBlueprint, state: PopupState, events: string[], reason: string) {
    const back = respawnCell(bp, state);
    state.x = back.x;
    state.z = back.z;
    state.mistakes += 1;
    state.timers = {};
    events.push(reason);
  }

  /** 执行一个动作。转动不消耗节拍；走、跳、等待（含被阻挡）各消耗一个节拍。 */
  function step(bp: PopupBlueprint, previous: PopupState, action: PopupAction): PopupStepResult {
    const state = cloneState(previous);
    const events: string[] = [];
    if (state.done) return { state, events: ["already-done"], ok: false };
    if (action === "cw" || action === "ccw") {
      state.o = (((state.o + (action === "cw" ? 1 : 3)) % 4) as PopupAngle);
      events.push("rotate:" + state.o);
      settleCell(bp, state, events, false);
      return { state, events, ok: true };
    }
    for (const key of Object.keys(state.timers)) state.timers[key] = Math.max(0, state.timers[key] - 1);
    let ok = true;
    let landed = false;
    if (action === "wait") {
      events.push("wait");
    } else if (MOVE_ACTIONS.includes(action)) {
      const direction = action as PopupDirection;
      state.facing = direction;
      const target = walkTarget(bp, state, direction);
      if (target) { state.x = target.x; state.z = target.z; landed = true; events.push("move:" + direction); }
      else { ok = false; events.push("blocked:" + direction); }
    } else if (JUMP_ACTIONS.includes(action)) {
      const direction = action.slice(1) as PopupDirection;
      state.facing = direction;
      const jump = jumpTarget(bp, state, direction);
      if (jump.blocked) { ok = false; events.push("blocked:" + direction); }
      else if (jump.falls) { events.push("jump:" + direction); fail(bp, state, events, "fell"); }
      else if (jump.cell) { state.x = jump.cell.x; state.z = jump.cell.z; landed = true; events.push("jump:" + direction); }
    } else {
      return { state, events: ["unknown-action"], ok: false };
    }
    state.t += 1;
    if (!events.includes("fell")) {
      const hit = hazardCells(bp, state.t).some((cell) => same(cell, { x: state.x, z: state.z }));
      if (hit) fail(bp, state, events, "hit");
      else settleCell(bp, state, events, landed);
    }
    return { state, events, ok };
  }

  function applyActions(bp: PopupBlueprint, state: PopupState, actions: PopupAction[]) {
    let current = state;
    const trace: PopupStepResult[] = [];
    for (const action of actions) {
      const result = step(bp, current, action);
      trace.push(result);
      current = result.state;
    }
    return { state: current, trace };
  }

  function encodeState(bp: PopupBlueprint, state: PopupState, cycle: number, includeStars: boolean) {
    const toggles = bp.plates.filter((plate) => plate.kind === "toggle").map((plate) => (state.toggles[plate.id] ? "1" : "0")).join("");
    const timers = bp.plates.filter((plate) => plate.kind === "timer").map((plate) => String(state.timers[plate.id] || 0)).join(",");
    return state.x + "," + state.z + "|" + state.o + "|" + (state.t % cycle) + "|" + toggles + "|" + state.progress + "|" + timers + "|" + state.checkpoint + (includeStars ? "|" + state.stars.map((flag) => (flag ? "1" : "0")).join("") : "");
  }

  /**
   * 广度优先搜索：从 start 状态找到满足 goal 的最短节拍序列。
   * 转动不占节拍，但为了让“正确角度序列”可被枚举，搜索按动作数展开（转动同样算一个动作）。
   */
  function search(bp: PopupBlueprint, start: PopupState, goal: (state: PopupState, events: string[]) => boolean, options: PopupSolveOptions = {}): PopupSolution | null {
    const allowRotate = options.allowRotate !== false;
    const maxNodes = options.maxNodes || 400000;
    const cycle = hazardCycle(bp);
    const hasTimers = bp.plates.some((plate) => plate.kind === "timer");
    const useWait = bp.hazards.length > 0 || hasTimers;
    const actions: PopupAction[] = [...(allowRotate ? (["cw", "ccw"] as PopupAction[]) : []), ...MOVE_ACTIONS, ...JUMP_ACTIONS, ...(useWait ? (["wait"] as PopupAction[]) : [])];
    const includeStars = true;
    if (goal(start, [])) return { actions: [], beats: 0, rotations: 0 };
    const startKey = encodeState(bp, start, cycle, includeStars);
    const seen = new Set<string>([startKey]);
    const queue: Array<{ state: PopupState; path: PopupAction[] }> = [{ state: start, path: [] }];
    let head = 0;
    while (head < queue.length) {
      const node = queue[head++];
      if (head > maxNodes) return null;
      for (const action of actions) {
        const result = step(bp, node.state, action);
        if (!result.ok) continue;
        if (result.events.includes("fell") || result.events.includes("hit")) continue;
        const path = node.path.concat([action]);
        if (goal(result.state, result.events)) {
          return { actions: path, beats: path.filter((item) => item !== "cw" && item !== "ccw").length, rotations: path.filter((item) => item === "cw" || item === "ccw").length };
        }
        const key = encodeState(bp, result.state, cycle, includeStars);
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push({ state: result.state, path });
      }
    }
    return null;
  }

  /** 主线解：起点 → 第一个检查点 → 出口。 */
  function solveLevel(bp: PopupBlueprint, options: PopupSolveOptions = {}): PopupSolution | null {
    let state = createState(bp);
    const actions: PopupAction[] = [];
    for (let index = 0; index < bp.checkpoints.length; index += 1) {
      const leg = search(bp, state, (candidate) => candidate.checkpoint >= index, options);
      if (!leg) return null;
      actions.push(...leg.actions);
      state = applyActions(bp, state, leg.actions).state;
    }
    const final = search(bp, state, (candidate) => candidate.done, options);
    if (!final) return null;
    actions.push(...final.actions);
    return { actions, beats: actions.filter((item) => item !== "cw" && item !== "ccw").length, rotations: actions.filter((item) => item === "cw" || item === "ccw").length };
  }

  /** 某颗星的采集解（从起点出发，不要求经过检查点）。 */
  function solveStar(bp: PopupBlueprint, index: number, options: PopupSolveOptions = {}): PopupSolution | null {
    return search(bp, createState(bp), (_candidate, events) => events.includes("star:" + index), options);
  }

  /** 全收集解：依次采集三颗星再到出口（贪心分段，用于探针演示，不保证全局最短）。 */
  function solveAllStars(bp: PopupBlueprint, options: PopupSolveOptions = {}): PopupSolution | null {
    let state = createState(bp);
    const actions: PopupAction[] = [];
    const remaining = bp.stars.map((_, index) => index);
    while (remaining.length) {
      let best: { index: number; solution: PopupSolution } | null = null;
      for (const index of remaining) {
        const solution = search(bp, state, (candidate) => candidate.stars[index], options);
        if (solution && (!best || solution.actions.length < best.solution.actions.length)) best = { index, solution };
      }
      if (!best) return null;
      actions.push(...best.solution.actions);
      state = applyActions(bp, state, best.solution.actions).state;
      remaining.splice(remaining.indexOf(best.index), 1);
    }
    if (!state.done) {
      const final = search(bp, state, (candidate) => candidate.done, options);
      if (!final) return null;
      actions.push(...final.actions);
    }
    return { actions, beats: actions.filter((item) => item !== "cw" && item !== "ccw").length, rotations: actions.filter((item) => item === "cw" || item === "ccw").length };
  }

  /** 静态与结构校验：返回问题列表，空数组表示通过。 */
  function validate(bp: PopupBlueprint): string[] {
    const issues: string[] = [];
    const w = width(bp);
    const d = depth(bp);
    if (w < 3 || d < 3) issues.push("网格至少 3×3");
    if (bp.rows.some((row) => row.length !== w)) issues.push("每行宽度必须一致");
    if (bp.rows.some((row) => !/^[.1-9]+$/.test(row))) issues.push("高度只允许 . 与 1-9");
    const requireSolid = (cell: PopupCell, label: string) => { if (!solid(bp, cell.x, cell.z)) issues.push(label + " 不在实心格上：" + cellKey(cell)); };
    requireSolid(bp.start, "起点");
    requireSolid(bp.exit, "出口");
    if (same(bp.start, bp.exit)) issues.push("起点与出口重合");
    if (bp.checkpoints.length < 1) issues.push("至少一个检查点");
    bp.checkpoints.forEach((cell, index) => requireSolid(cell, "检查点 " + index));
    if (bp.stars.length !== 3) issues.push("必须正好三颗星");
    bp.stars.forEach((star, index) => {
      requireSolid(star, "星 " + index);
      if (!star.angles.length) issues.push("星 " + index + " 没有可见角度");
      if (same(star, bp.exit) || same(star, bp.start)) issues.push("星 " + index + " 不能放在起点或出口");
    });
    if (!bp.stars.some((star) => !star.angles.includes(0))) issues.push("至少一颗星必须在默认角度不可见");
    const plateIds = new Set(bp.plates.map((plate) => plate.id));
    const orderCount = bp.plates.filter((plate) => plate.kind === "order").length;
    bp.plates.forEach((plate) => {
      requireSolid(plate.at, "压板 " + plate.id);
      if (plate.kind === "order" && (!plate.order || plate.order < 1 || plate.order > orderCount)) issues.push("顺序压板序号无效：" + plate.id);
      if (plate.kind === "timer" && (!plate.duration || plate.duration < 2)) issues.push("计时压板时长无效：" + plate.id);
      if (same(plate.at, bp.exit)) issues.push("压板不能放在出口：" + plate.id);
    });
    const linkIds = new Set<string>();
    bp.links.forEach((link) => {
      if (linkIds.has(link.id)) issues.push("链接 id 重复：" + link.id);
      linkIds.add(link.id);
      requireSolid(link.from, "链接 " + link.id + " 起点");
      requireSolid(link.to, "链接 " + link.id + " 终点");
      const dx = link.to.x - link.from.x;
      const dz = link.to.z - link.from.z;
      if (dx !== 0 && dz !== 0) issues.push("链接必须沿行或列：" + link.id);
      const span = Math.abs(dx) + Math.abs(dz);
      if (link.kind === "bridge") {
        if (span < 2 || span > 3) issues.push("桥必须跨越 1–2 个空洞格：" + link.id);
        if (heightAt(bp, link.from.x, link.from.z) !== heightAt(bp, link.to.x, link.to.z)) issues.push("桥两端必须同高：" + link.id);
        for (let index = 1; index < span; index += 1) {
          const cell = { x: link.from.x + Math.sign(dx) * index, z: link.from.z + Math.sign(dz) * index };
          if (solid(bp, cell.x, cell.z)) issues.push("桥下方必须是空洞：" + link.id);
        }
      } else if (link.kind === "stair") {
        if (span !== 1) issues.push("台阶必须连接相邻两格：" + link.id);
        if (Math.abs(heightAt(bp, link.from.x, link.from.z) - heightAt(bp, link.to.x, link.to.z)) !== 2) issues.push("台阶两端高差必须为 2：" + link.id);
      }
      if (link.angles && (!link.angles.length || link.angles.length >= 4)) issues.push("角度桥必须只在部分角度接上：" + link.id);
      if (link.plate && !plateIds.has(link.plate)) issues.push("链接引用了不存在的压板：" + link.id);
      if (link.timer && !plateIds.has(link.timer)) issues.push("链接引用了不存在的计时压板：" + link.id);
      if (typeof link.step === "number" && (link.step < 1 || link.step > orderCount)) issues.push("链接的顺序步数无效：" + link.id);
    });
    bp.hazards.forEach((hazard) => {
      if (hazard.path.length < 2) issues.push("障碍路径至少两格：" + hazard.id);
      if (!(hazard.every >= 1)) issues.push("障碍节拍无效：" + hazard.id);
      hazard.path.forEach((cell) => { if (!inside(bp, cell.x, cell.z)) issues.push("障碍路径越界：" + hazard.id); });
      if (hazard.path.some((cell) => same(cell, bp.start))) issues.push("障碍不能经过起点：" + hazard.id);
      if (hazard.path.some((cell) => bp.checkpoints.some((point) => same(point, cell)))) issues.push("障碍不能经过检查点：" + hazard.id);
    });
    const hasAngleLink = bp.links.some((link) => link.angles);
    if (!hasAngleLink) issues.push("每关至少一个只在特定角度接上的桥或台阶");
    if (bp.chapter >= 2 && bp.hazards.length === 0) issues.push("第二章起必须有纸浪或纸鸟障碍");
    if (bp.chapter === 3 && !(bp.plates.some((plate) => plate.kind === "order") && bp.links.some((link) => typeof link.step === "number"))) issues.push("第三章必须有顺序机关与受其控制的桥");
    if (bp.chapter === 4 && !(bp.plates.some((plate) => plate.kind === "timer") && bp.links.some((link) => link.timer))) issues.push("第四章必须有限时门");
    return issues;
  }

  return {
    DIRECTIONS,
    DIRECTION_ORDER,
    width,
    depth,
    inside,
    heightAt,
    solid,
    same,
    cellKey,
    screenToGrid,
    hazardCell,
    hazardCells,
    hazardCycle,
    linkOpen,
    linkFrom,
    walkTarget,
    jumpTarget,
    respawnCell,
    plateAt,
    createState,
    cloneState,
    step,
    applyActions,
    search,
    solveLevel,
    solveStar,
    solveAllStars,
    validate,
  };
}

/**
 * 供浏览器运行时内嵌的规则源码：与 Node 侧使用同一份函数体。
 * tsx/esbuild 在开发态会给函数注入 `__name` 保名助手，tsc 产物则没有；这里提供一个无副作用的兜底定义，保证两种编译路径内嵌后都能运行。
 */
export function paperPopupRulesSource() {
  return `(() => { const __name = (target, value) => { try { Object.defineProperty(target, "name", { value, configurable: true }); } catch {} return target; }; void __name; return (${createPaperPopupRules.toString()})(); })()`;
}
