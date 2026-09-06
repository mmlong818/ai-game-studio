export type WorkshopPartKind = "core" | "battery" | "gear" | "coolant" | "crystal" | "relay" | "shield";
export type WorkshopCell = readonly [row: number, column: number];
export type WorkshopPart = { id: string; kind: WorkshopPartKind; cells: WorkshopCell[] };
export type WorkshopPlacement = { partId: string; row: number; column: number; rotation: number };
export type PocketWorkshopLevel = {
  number: number; name: string; chapter: string; tier: 1 | 2 | 3 | 4 | 5; boardSize: number; blocked: WorkshopCell[];
  parts: WorkshopPart[]; targetScore: number; solution: WorkshopPlacement[];
  difficulty: { cognition: number; operation: number; space: number; resources: number; combination: number; punishment: number };
};

const synergy: Partial<Record<WorkshopPartKind, Partial<Record<WorkshopPartKind, number>>>> = {
  core: { battery: 5, gear: 4, coolant: 3, relay: 3, shield: 2 }, battery: { crystal: 3, coolant: 2, relay: 2 }, gear: { crystal: 2, relay: 3 }, crystal: { relay: 2 }, shield: { coolant: 2 },
};
const chapters = ["点亮核心", "读懂协同", "容纳形状", "绕开损坏格", "完成整机"];
const names = ["第一束火花", "齿轮问候", "冷却回路", "三件小工坊", "晶体增幅", "双路供能", "冷却选择", "邻接链条", "长芯机组", "双格电池", "晶体转角", "紧凑五件", "缺角工作台", "断路维修", "绕行装配", "受限六件", "满载试机", "复合回路", "七件协同", "掌心工坊"];

export const POCKET_WORKSHOP_ONBOARDING = [
  { id: "inspect-part", instruction: "先点一下核心，查看它需要相邻的零件。", requiredSignal: "part-inspected", safe: true },
  { id: "place-battery", instruction: "把电池放到核心正上、下、左或右的一格。", requiredSignal: "synergy-previewed", safe: true },
  { id: "resolve-machine", instruction: "放完全部零件后点“试机”，观察每条得分来自哪一对零件。", requiredSignal: "resolution-explained", safe: true },
] as const;

export const POCKET_WORKSHOP_ASSISTANCE = [
  { afterFailures: 1, action: "explain-cause", message: "指出缺失的最高价值邻接，并解释本次差几分。" },
  { afterFailures: 2, action: "highlight-rule", message: "高亮一对应该相邻的零件，但不直接给出格位。" },
  { afterFailures: 3, action: "show-step", message: "显示作者解中的一个零件位置，其他部分仍由玩家完成。" },
] as const;

export function rotateWorkshopCells(cells: WorkshopCell[], turns: number): WorkshopCell[] {
  let result = cells.map(([row, column]) => [row, column] as WorkshopCell);
  for (let turn = 0; turn < ((turns % 4) + 4) % 4; turn += 1) {
    result = result.map(([row, column]) => [column, -row] as WorkshopCell);
    const minRow = Math.min(...result.map(([row]) => row)); const minColumn = Math.min(...result.map(([, column]) => column));
    result = result.map(([row, column]) => [row - minRow, column - minColumn] as WorkshopCell);
  }
  return result.sort(([ar, ac], [br, bc]) => ar - br || ac - bc);
}

export function workshopPlacementCells(part: WorkshopPart, placement: WorkshopPlacement): WorkshopCell[] {
  return rotateWorkshopCells(part.cells, placement.rotation).map(([row, column]) => [row + placement.row, column + placement.column] as WorkshopCell);
}

export function validateWorkshopLayout(level: PocketWorkshopLevel, placements: WorkshopPlacement[]) {
  const errors: string[] = []; const partById = new Map(level.parts.map((part) => [part.id, part])); const occupied = new Map<string, string>(); const blocked = new Set(level.blocked.map(([row, column]) => `${row}:${column}`)); const seen = new Set<string>();
  for (const placement of placements) {
    const part = partById.get(placement.partId); if (!part) { errors.push(`未知零件 ${placement.partId}`); continue; }
    if (seen.has(part.id)) { errors.push(`零件重复放置 ${part.id}`); continue; } seen.add(part.id);
    for (const [row, column] of workshopPlacementCells(part, placement)) {
      const key = `${row}:${column}`;
      if (row < 0 || column < 0 || row >= level.boardSize || column >= level.boardSize) errors.push(`${part.id} 越出容器`);
      else if (blocked.has(key)) errors.push(`${part.id} 占用了损坏格`);
      else if (occupied.has(key)) errors.push(`${part.id} 与 ${occupied.get(key)} 重叠`);
      else occupied.set(key, part.id);
    }
  }
  return { valid: errors.length === 0, complete: errors.length === 0 && seen.size === level.parts.length, errors };
}

const pairValue = (left: WorkshopPartKind, right: WorkshopPartKind) => synergy[left]?.[right] ?? synergy[right]?.[left] ?? 0;

export function resolvePocketWorkshop(level: PocketWorkshopLevel, placements: WorkshopPlacement[]) {
  const validation = validateWorkshopLayout(level, placements); if (!validation.valid) return { ...validation, score: 0, won: false, activations: [] as Array<{ left: string; right: string; value: number }> };
  const partById = new Map(level.parts.map((part) => [part.id, part])); const cellOwner = new Map<string, string>();
  for (const placement of placements) for (const [row, column] of workshopPlacementCells(partById.get(placement.partId)!, placement)) cellOwner.set(`${row}:${column}`, placement.partId);
  const pairs = new Set<string>();
  for (const [key, owner] of cellOwner) { const [row, column] = key.split(":").map(Number); for (const [dr, dc] of [[1, 0], [0, 1]] as const) { const other = cellOwner.get(`${row! + dr}:${column! + dc}`); if (other && other !== owner) pairs.add([owner, other].sort().join("|")); } }
  const activations = [...pairs].map((key) => { const [left, right] = key.split("|") as [string, string]; return { left, right, value: pairValue(partById.get(left)!.kind, partById.get(right)!.kind) }; }).filter(({ value }) => value > 0).sort((a, b) => b.value - a.value || `${a.left}${a.right}`.localeCompare(`${b.left}${b.right}`));
  const score = (validation.complete ? level.parts.length : placements.length) + activations.reduce((sum, { value }) => sum + value, 0);
  return { ...validation, score, won: validation.complete && score >= level.targetScore, activations };
}

function rotateAuthoredPlacement(part: WorkshopPart, placement: WorkshopPlacement, boardSize: number, turns: number): WorkshopPlacement {
  let cells = workshopPlacementCells(part, placement);
  for (let turn = 0; turn < turns; turn += 1) cells = cells.map(([row, column]) => [column, boardSize - 1 - row] as WorkshopCell);
  const minRow = Math.min(...cells.map(([row]) => row)); const minColumn = Math.min(...cells.map(([, column]) => column));
  return { partId: placement.partId, row: minRow, column: minColumn, rotation: (placement.rotation + turns) % 4 };
}

function levelParts(tier: number, levelNumber: number): { parts: WorkshopPart[]; placements: WorkshopPlacement[]; boardSize: number } {
  const boardSize = tier < 3 ? 4 : 5; const kinds: WorkshopPartKind[] = ["core", "battery", "gear", ...(tier >= 2 ? ["coolant" as const] : []), ...(tier >= 3 ? ["crystal" as const] : []), ...(tier >= 4 ? ["relay" as const] : []), ...(tier >= 5 ? ["shield" as const] : [])];
  const parts = kinds.map((kind, index) => ({ id: `${kind}-${levelNumber}`, kind, cells: tier >= 3 && [0, 1].includes(index) ? [[0, 0], [0, 1]] as WorkshopCell[] : [[0, 0]] as WorkshopCell[] }));
  const base = tier < 3 ? [[1, 1, 0], [0, 1, 0], [1, 0, 0], [1, 2, 0]] : [[2, 2, 0], [0, 2, 1], [3, 2, 0], [2, 4, 0], [0, 1, 0], [3, 3, 0], [3, 4, 0]];
  const placements = parts.map((part, index) => ({ partId: part.id, row: base[index]![0], column: base[index]![1], rotation: base[index]![2] }));
  const turns = (levelNumber - 1) % 4; return { parts, boardSize, placements: placements.map((placement, index) => rotateAuthoredPlacement(parts[index]!, placement, boardSize, turns)) };
}

export function createPocketWorkshopLevels(): PocketWorkshopLevel[] {
  return Array.from({ length: 20 }, (_, index) => {
    const number = index + 1; const tier = (Math.floor(index / 4) + 1) as 1 | 2 | 3 | 4 | 5; const { parts, placements: solution, boardSize } = levelParts(tier, number);
    const candidateBlocked: WorkshopCell[] = tier >= 4 ? [[0, 0], [boardSize - 1, boardSize - 1], ...(tier === 5 ? [[0, boardSize - 1] as WorkshopCell] : [])] : [];
    const solutionCells = new Set(solution.flatMap((placement) => workshopPlacementCells(parts.find(({ id }) => id === placement.partId)!, placement).map(([row, column]) => `${row}:${column}`)));
    const blocked = candidateBlocked.filter(([row, column]) => !solutionCells.has(`${row}:${column}`));
    const draft: PocketWorkshopLevel = { number, name: names[index]!, chapter: chapters[tier - 1]!, tier, boardSize, blocked, parts, targetScore: 0, solution, difficulty: { cognition: tier, operation: Math.min(3, 1 + Math.floor((tier - 1) / 2)), space: tier, resources: tier >= 3 ? tier - 2 : 0, combination: Math.max(0, tier - 1), punishment: tier >= 4 ? 1 : 0 } };
    const solved = resolvePocketWorkshop(draft, solution); return { ...draft, targetScore: Math.max(parts.length, solved.score - (number % 4 === 0 ? 0 : 1)) };
  });
}

export function pocketWorkshopHint(level: PocketWorkshopLevel, placements: WorkshopPlacement[], failures: number) {
  const placed = new Set(placements.map(({ partId }) => partId)); const missing = level.solution.find(({ partId }) => !placed.has(partId)) ?? null;
  if (failures <= 0) return null;
  if (failures === 1) return { level: 1, message: "核心与电池的正交邻接价值最高；先检查它们是否真正共边。", placement: null };
  if (failures === 2) return { level: 2, message: "建议先让核心靠近电池或齿轮，再围绕它安排其他零件。", placement: null };
  return { level: 3, message: missing ? `可以先把 ${missing.partId} 放到高亮格，之后继续自行完成。` : "当前已放完，可重新检查邻接方向。", placement: missing };
}

export const POCKET_WORKSHOP_LEVELS = createPocketWorkshopLevels();
