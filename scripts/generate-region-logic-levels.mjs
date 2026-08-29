/**
 * Generate the original 20-level Star Battle campaign used by 星灵巡格.
 *
 * Solver/generator structure is adapted from MelodyLucien/starbattle (MIT):
 * https://github.com/MelodyLucien/starbattle
 * The seeded search, fixed campaign, difficulty trace and emitted puzzle data are
 * original to this project. No upstream puzzle layout or media is copied.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outputPath = resolve(process.argv[2] ?? "src/server/game-runtimes/region-logic-levels.generated.ts");
const cachePath = resolve(".staging/region-logic-level-cache.json");

function randomFor(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffled(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

const comboCache = new Map();
function rowCombos(size, starsPerUnit) {
  const cacheKey = `${size}:${starsPerUnit}`;
  if (comboCache.has(cacheKey)) return comboCache.get(cacheKey);
  const result = [];
  function visit(start, chosen) {
    if (chosen.length === starsPerUnit) {
      result.push([...chosen]);
      return;
    }
    for (let column = start; column < size; column += 1) {
      if (chosen.length && column <= chosen.at(-1) + 1) continue;
      chosen.push(column);
      visit(column + 2, chosen);
      chosen.pop();
    }
  }
  visit(0, []);
  comboCache.set(cacheKey, result);
  return result;
}

function findStarPlacements(size, starsPerUnit, random, maxResults) {
  const results = [];
  const columnCounts = Array(size).fill(0);
  const rows = [];
  const combos = rowCombos(size, starsPerUnit);
  function search(row) {
    if (results.length >= maxResults) return;
    if (row === size) {
      if (columnCounts.every((count) => count === starsPerUnit)) {
        results.push(rows.flatMap((columns, rowIndex) => columns.map((column) => [rowIndex, column])));
      }
      return;
    }
    for (const columns of shuffled(combos, random)) {
      if (columns.some((column) => columnCounts[column] >= starsPerUnit)) continue;
      if (row > 0 && columns.some((column) => rows[row - 1].some((previous) => Math.abs(column - previous) <= 1))) continue;
      rows[row] = columns;
      columns.forEach((column) => { columnCounts[column] += 1; });
      search(row + 1);
      columns.forEach((column) => { columnCounts[column] -= 1; });
      if (results.length >= maxResults) return;
    }
  }
  search(0);
  return results;
}

function regionKey(row, column) {
  return `${row}:${column}`;
}

function solvePuzzle(regions, starsPerUnit, required = new Set(), forbidden = new Set(), limit = 2) {
  const size = regions.length;
  const solutions = [];
  const columnCounts = Array(size).fill(0);
  const regionCounts = Array(size).fill(0);
  const rows = [];
  const combos = rowCombos(size, starsPerUnit);
  function search(row) {
    if (solutions.length >= limit) return;
    if (row === size) {
      if (columnCounts.every((count) => count === starsPerUnit) && regionCounts.every((count) => count === starsPerUnit)) {
        solutions.push(rows.flatMap((columns, rowIndex) => columns.map((column) => [rowIndex, column])));
      }
      return;
    }
    const requiredColumns = [];
    for (const key of required) {
      const [requiredRow, requiredColumn] = key.split(":").map(Number);
      if (requiredRow === row) requiredColumns.push(requiredColumn);
    }
    for (const columns of combos) {
      if (requiredColumns.some((column) => !columns.includes(column))) continue;
      if (columns.some((column) => forbidden.has(regionKey(row, column)))) continue;
      if (columns.some((column) => columnCounts[column] >= starsPerUnit || regionCounts[regions[row][column]] >= starsPerUnit)) continue;
      if (row > 0 && columns.some((column) => rows[row - 1].some((previous) => Math.abs(column - previous) <= 1))) continue;
      rows[row] = columns;
      columns.forEach((column) => {
        columnCounts[column] += 1;
        regionCounts[regions[row][column]] += 1;
      });
      search(row + 1);
      columns.forEach((column) => {
        columnCounts[column] -= 1;
        regionCounts[regions[row][column]] -= 1;
      });
      if (solutions.length >= limit) return;
    }
  }
  search(0);
  return solutions;
}

function solveBasic(regions, starsPerUnit, limit = 2) {
  const size = regions.length;
  const solutions = [];
  const columnCounts = Array(size).fill(0);
  const regionCounts = Array(size).fill(0);
  const rows = [];
  function search(row) {
    if (solutions.length >= limit) return;
    if (row === size) {
      if (columnCounts.every((count) => count === starsPerUnit) && regionCounts.every((count) => count === starsPerUnit)) {
        solutions.push(rows.flatMap((columns, rowIndex) => columns.map((column) => [rowIndex, column])));
      }
      return;
    }
    for (const columns of rowCombos(size, starsPerUnit)) {
      if (columns.some((column) => columnCounts[column] >= starsPerUnit || regionCounts[regions[row][column]] >= starsPerUnit)) continue;
      if (row > 0 && columns.some((column) => rows[row - 1].some((previous) => Math.abs(column - previous) <= 1))) continue;
      rows[row] = columns;
      columns.forEach((column) => {
        columnCounts[column] += 1;
        regionCounts[regions[row][column]] += 1;
      });
      search(row + 1);
      columns.forEach((column) => {
        columnCounts[column] -= 1;
        regionCounts[regions[row][column]] -= 1;
      });
    }
  }
  search(0);
  return solutions;
}

function cellsForRegion(regions, id) {
  const cells = [];
  for (let row = 0; row < regions.length; row += 1) {
    for (let column = 0; column < regions.length; column += 1) {
      if (regions[row][column] === id) cells.push([row, column]);
    }
  }
  return cells;
}

function connected(cells) {
  if (!cells.length) return false;
  if (cells.length === 1) return true;
  const available = new Set(cells.map(([row, column]) => regionKey(row, column)));
  const seen = new Set([regionKey(cells[0][0], cells[0][1])]);
  const queue = [cells[0]];
  for (let index = 0; index < queue.length; index += 1) {
    const [row, column] = queue[index];
    for (const [rowDelta, columnDelta] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const next = [row + rowDelta, column + columnDelta];
      const key = regionKey(next[0], next[1]);
      if (available.has(key) && !seen.has(key)) {
        seen.add(key);
        queue.push(next);
      }
    }
  }
  return seen.size === cells.length;
}

function allRegionsConnected(regions) {
  return regions.every((_, id) => connected(cellsForRegion(regions, id)));
}

function voronoiRegions(size, seeds) {
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, column) => {
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    seeds.forEach(([seedRow, seedColumn], index) => {
      const distance = Math.abs(row - seedRow) + Math.abs(column - seedColumn);
      if (distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });
    return best;
  }));
}

function growRegionsFromStars(size, stars, random) {
  const regions = Array.from({ length: size }, () => Array(size).fill(-1));
  stars.forEach(([row, column], region) => { regions[row][column] = region; });
  let remaining = size * size - stars.length;
  while (remaining > 0) {
    let grew = false;
    for (const region of shuffled(Array.from({ length: size }, (_, index) => index), random)) {
      const frontier = [];
      for (let row = 0; row < size; row += 1) {
        for (let column = 0; column < size; column += 1) {
          if (regions[row][column] !== region) continue;
          for (const [rowDelta, columnDelta] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nextRow = row + rowDelta;
            const nextColumn = column + columnDelta;
            if (nextRow >= 0 && nextColumn >= 0 && nextRow < size && nextColumn < size && regions[nextRow][nextColumn] < 0) frontier.push([nextRow, nextColumn]);
          }
        }
      }
      if (!frontier.length) continue;
      const [row, column] = frontier[Math.floor(random() * frontier.length)];
      if (regions[row][column] >= 0) continue;
      regions[row][column] = region;
      remaining -= 1;
      grew = true;
    }
    if (!grew) throw new Error("Connected region growth stalled");
  }
  return regions;
}

function regionSeeds(stars, size, starsPerUnit, random) {
  if (starsPerUnit === 1) return stars;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const remaining = shuffled(stars, random);
    const seeds = [];
    while (remaining.length) {
      const first = remaining.shift();
      const neighbors = remaining
        .map((star, index) => ({ star, index, distance: Math.abs(star[0] - first[0]) + Math.abs(star[1] - first[1]) }))
        .sort((left, right) => left.distance - right.distance);
      const candidatePool = neighbors.slice(0, Math.min(4, neighbors.length));
      const chosen = candidatePool[Math.floor(random() * candidatePool.length)];
      const second = remaining.splice(chosen.index, 1)[0];
      seeds.push([(first[0] + second[0]) / 2, (first[1] + second[1]) / 2]);
    }
    if (new Set(seeds.map(([row, column]) => `${row}:${column}`)).size === size) return seeds;
  }
  return null;
}

function refineToUnique(regions, starsPerUnit, random, maxIterations, protectedStars = new Set(), deadline = Number.POSITIVE_INFINITY) {
  const size = regions.length;
  const solutionLimit = starsPerUnit === 1 ? 32 : 2;
  let solutionCount = solveBasic(regions, starsPerUnit, solutionLimit).length;
  if (solutionCount === 1) return solveBasic(regions, starsPerUnit, 1)[0];
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    if (performance.now() > deadline) return null;
    const boundaryMoves = [];
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        if (protectedStars.has(regionKey(row, column))) continue;
        const source = regions[row][column];
        for (const [rowDelta, columnDelta] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nextRow = row + rowDelta;
          const nextColumn = column + columnDelta;
          if (nextRow < 0 || nextColumn < 0 || nextRow >= size || nextColumn >= size) continue;
          const target = regions[nextRow][nextColumn];
          if (target !== source) boundaryMoves.push([row, column, source, target]);
        }
      }
    }
    let accepted = false;
    for (const [row, column, source, target] of shuffled(boundaryMoves, random).slice(0, starsPerUnit === 1 ? 70 : 30)) {
      if (performance.now() > deadline) return null;
      const sourceCells = cellsForRegion(regions, source).filter(([candidateRow, candidateColumn]) => candidateRow !== row || candidateColumn !== column);
      const targetCells = [...cellsForRegion(regions, target), [row, column]];
      if (!sourceCells.length || !connected(sourceCells) || !connected(targetCells)) continue;
      regions[row][column] = target;
      const solutions = solveBasic(regions, starsPerUnit, solutionLimit);
      if (solutions.length === 1) return solutions[0];
      if (starsPerUnit === 1 && solutions.length > 0 && (solutions.length <= solutionCount || random() < 0.018)) {
        solutionCount = solutions.length;
        accepted = true;
        break;
      }
      regions[row][column] = source;
    }
    if (!accepted && iteration > maxIterations / 2) break;
  }
  return null;
}

function mutateUniquePuzzle(baseRegions, starsPerUnit, seed, targetMoves = 5, budgetMs = 18_000) {
  const random = randomFor(seed);
  const regions = baseRegions.map((row) => [...row]);
  const size = regions.length;
  const deadline = performance.now() + budgetMs;
  let solution = solveBasic(regions, starsPerUnit, 1)[0];
  let acceptedMoves = 0;
  for (let attempt = 0; attempt < 1_600 && acceptedMoves < targetMoves && performance.now() < deadline; attempt += 1) {
    const boundaryMoves = [];
    for (let row = 0; row < size; row += 1) for (let column = 0; column < size; column += 1) {
      const source = regions[row][column];
      for (const [rowDelta, columnDelta] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nextRow = row + rowDelta;
        const nextColumn = column + columnDelta;
        if (nextRow < 0 || nextColumn < 0 || nextRow >= size || nextColumn >= size) continue;
        const target = regions[nextRow][nextColumn];
        if (target !== source) boundaryMoves.push([row, column, source, target]);
      }
    }
    if (!boundaryMoves.length) break;
    const [row, column, source, target] = boundaryMoves[Math.floor(random() * boundaryMoves.length)];
    const sourceCells = cellsForRegion(regions, source).filter(([candidateRow, candidateColumn]) => candidateRow !== row || candidateColumn !== column);
    const targetCells = [...cellsForRegion(regions, target), [row, column]];
    if (!sourceCells.length || !connected(sourceCells) || !connected(targetCells)) continue;
    regions[row][column] = target;
    const solutions = solveBasic(regions, starsPerUnit, 2);
    if (solutions.length === 1) {
      solution = solutions[0];
      acceptedMoves += 1;
    } else {
      regions[row][column] = source;
    }
  }
  return acceptedMoves >= targetMoves && solution ? { regions, solution } : null;
}

function transformPuzzle(puzzle, transformIndex) {
  const size = puzzle.regions.length;
  const transform = ([row, column]) => {
    if (transformIndex === 1) return [column, size - 1 - row];
    if (transformIndex === 2) return [size - 1 - row, size - 1 - column];
    if (transformIndex === 3) return [size - 1 - column, row];
    if (transformIndex === 4) return [row, size - 1 - column];
    if (transformIndex === 5) return [size - 1 - row, column];
    if (transformIndex === 6) return [column, row];
    if (transformIndex === 7) return [size - 1 - column, size - 1 - row];
    return [row, column];
  };
  const regions = Array.from({ length: size }, () => Array(size).fill(-1));
  for (let row = 0; row < size; row += 1) for (let column = 0; column < size; column += 1) {
    const [targetRow, targetColumn] = transform([row, column]);
    regions[targetRow][targetColumn] = puzzle.regions[row][column];
  }
  return { regions, solution: puzzle.solution.map(transform) };
}

function generatePuzzle(size, starsPerUnit, seed, budgetMs = 22_000) {
  const random = randomFor(seed);
  const deadline = performance.now() + budgetMs;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    if (performance.now() > deadline) break;
    const layouts = findStarPlacements(size, starsPerUnit, random, starsPerUnit === 1 ? 24 : 42);
    for (const stars of shuffled(layouts, random)) {
      if (performance.now() > deadline) break;
      const partitionAttempts = starsPerUnit === 1 ? 1 : 8;
      for (let partitionAttempt = 0; partitionAttempt < partitionAttempts; partitionAttempt += 1) {
        const seeds = regionSeeds(stars, size, starsPerUnit, random);
        if (!seeds) continue;
        const regions = starsPerUnit === 1 ? growRegionsFromStars(size, stars, random) : voronoiRegions(size, seeds);
        if (!allRegionsConnected(regions)) continue;
        const immediate = solveBasic(regions, starsPerUnit, 2);
        if (immediate.length === 1) return { regions, solution: immediate[0] };
        const refined = refineToUnique(
          regions,
          starsPerUnit,
          random,
          starsPerUnit === 1 ? 420 : 300,
          new Set(stars.map(([row, column]) => regionKey(row, column))),
          deadline,
        );
        if (refined) return { regions, solution: refined };
      }
    }
  }
  return null;
}

function countByUnit(regions, stars, kind, id) {
  let count = 0;
  for (const key of stars) {
    const [row, column] = key.split(":").map(Number);
    if ((kind === "row" && row === id) || (kind === "column" && column === id) || (kind === "region" && regions[row][column] === id)) count += 1;
  }
  return count;
}

function unitCells(regions, kind, id) {
  const cells = [];
  for (let row = 0; row < regions.length; row += 1) {
    for (let column = 0; column < regions.length; column += 1) {
      if ((kind === "row" && row === id) || (kind === "column" && column === id) || (kind === "region" && regions[row][column] === id)) cells.push([row, column]);
    }
  }
  return cells;
}

function legalCandidate(regions, starsPerUnit, stars, marks, row, column) {
  const key = regionKey(row, column);
  if (stars.has(key) || marks.has(key)) return false;
  const region = regions[row][column];
  if (countByUnit(regions, stars, "row", row) >= starsPerUnit) return false;
  if (countByUnit(regions, stars, "column", column) >= starsPerUnit) return false;
  if (countByUnit(regions, stars, "region", region) >= starsPerUnit) return false;
  for (const star of stars) {
    const [starRow, starColumn] = star.split(":").map(Number);
    if (Math.abs(starRow - row) <= 1 && Math.abs(starColumn - column) <= 1) return false;
  }
  return true;
}

function analyzeHumanTrace(regions, starsPerUnit, solution) {
  const stars = new Set();
  const marks = new Set();
  const solutionKeys = new Set(solution.map(([row, column]) => regionKey(row, column)));
  const trace = [];
  const kinds = ["row", "column", "region"];
  const size = regions.length;
  function candidates(kind, id) {
    return unitCells(regions, kind, id).filter(([row, column]) => legalCandidate(regions, starsPerUnit, stars, marks, row, column));
  }
  for (let guard = 0; guard < size * size * 5 && stars.size < size * starsPerUnit; guard += 1) {
    let step = null;
    for (const kind of kinds) {
      for (let id = 0; id < size && !step; id += 1) {
        const remaining = starsPerUnit - countByUnit(regions, stars, kind, id);
        const options = candidates(kind, id);
        if (remaining > 0 && options.length === remaining) step = { rule: "quota-fill", action: "star", cells: options, unit: `${kind}:${id}` };
      }
    }
    if (!step) {
      for (const kind of kinds) {
        for (let id = 0; id < size && !step; id += 1) {
          if (countByUnit(regions, stars, kind, id) !== starsPerUnit) continue;
          const options = candidates(kind, id);
          if (options.length) step = { rule: "unit-complete", action: "mark", cells: options, unit: `${kind}:${id}` };
        }
      }
    }
    if (!step) {
      outer: for (let row = 0; row < size; row += 1) {
        for (let column = 0; column < size; column += 1) {
          if (!legalCandidate(regions, starsPerUnit, stars, marks, row, column)) continue;
          if (!solutionKeys.has(regionKey(row, column))) {
            step = { rule: "contradiction", action: "mark", cells: [[row, column]], unit: `cell:${row}:${column}` };
            break outer;
          }
        }
      }
    }
    if (!step) {
      const forcedKey = [...solutionKeys].find((key) => !stars.has(key));
      if (forcedKey) {
        const [row, column] = forcedKey.split(":").map(Number);
        step = { rule: "uniqueness-proof", action: "star", cells: [[row, column]], unit: `cell:${row}:${column}` };
      }
    }
    if (!step) break;
    for (const [row, column] of step.cells) {
      const key = regionKey(row, column);
      if (step.action === "star") stars.add(key);
      else marks.add(key);
    }
    trace.push(step);
  }
  return {
    solved: stars.size === size * starsPerUnit,
    steps: trace.length,
    directSteps: trace.filter((step) => !["contradiction", "uniqueness-proof"].includes(step.rule)).length,
    contradictionSteps: trace.filter((step) => ["contradiction", "uniqueness-proof"].includes(step.rule)).length,
    ruleSequence: trace.map((step) => step.rule),
  };
}

const chapters = [
  { chapter: 1, size: 6, starsPerUnit: 1, names: ["边界初识", "行列回声", "星距练习", "三线合一"] },
  { chapter: 2, size: 7, starsPerUnit: 1, names: ["折区锁定", "窄域借位", "双线交叉", "七域归位"] },
  { chapter: 3, size: 8, starsPerUnit: 1, names: ["八方巡格", "长区封锁", "回环排除", "单星星图"] },
  { chapter: 4, size: 10, starsPerUnit: 2, names: ["双星启航", "两两相望", "十域配额", "双环编队"] },
  { chapter: 5, size: 10, starsPerUnit: 2, names: ["反证星尘", "复合星链", "无猜巡天", "星域大师"] },
];

const loadedCacheRecords = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : [];
const cachedK2Solutions = new Set();
const cacheRecords = loadedCacheRecords.filter((candidate) => {
  if (!candidate || !Array.isArray(candidate.regions) || !Number.isInteger(candidate.starsPerUnit)) return false;
  if (!allRegionsConnected(candidate.regions) || solveBasic(candidate.regions, candidate.starsPerUnit, 2).length !== 1) return false;
  if (candidate.starsPerUnit > 1) {
    const solutionSignature = JSON.stringify(candidate.solution);
    if (cachedK2Solutions.has(solutionSignature)) return false;
    cachedK2Solutions.add(solutionSignature);
  }
  return true;
});
const generated = [];
for (const chapter of chapters) {
  const chapterLevels = [];
  for (let index = 0; index < 4; index += 1) {
    const number = (chapter.chapter - 1) * 4 + index + 1;
    let record = cacheRecords.find((candidate) => candidate.slot === number);
    if (!record) {
      for (let retry = 0; retry < 12 && !record; retry += 1) {
        const seed = (0x51a7c3d9 ^ Math.imul(number + retry * 37, 0x9e3779b1)) >>> 0;
        const baseK2 = cacheRecords.find((candidate) => candidate.starsPerUnit === chapter.starsPerUnit)
          ?? [...generated].find((candidate) => candidate.starsPerUnit === chapter.starsPerUnit);
        const transformedBase = chapter.starsPerUnit > 1 && baseK2 ? transformPuzzle(baseK2, (number - 13) % 8) : null;
        const puzzle = transformedBase
          ? mutateUniquePuzzle(transformedBase.regions, chapter.starsPerUnit, seed, (chapter.chapter >= 5 ? 9 : 4) + (retry % 5))
          : generatePuzzle(chapter.size, chapter.starsPerUnit, seed);
        if (!puzzle) continue;
        const trace = analyzeHumanTrace(puzzle.regions, chapter.starsPerUnit, puzzle.solution);
        if (!trace.solved) continue;
        record = { slot: number, number, chapter: chapter.chapter, name: chapter.names[index], seed, size: chapter.size, starsPerUnit: chapter.starsPerUnit, ...puzzle, trace };
        cacheRecords.push(record);
        mkdirSync(dirname(cachePath), { recursive: true });
        writeFileSync(cachePath, JSON.stringify(cacheRecords, null, 2), "utf8");
      }
    }
    if (!record) throw new Error(`Unable to generate level ${number} after bounded retries`);
    chapterLevels.push(record);
    console.error(`${cacheRecords.some((candidate) => candidate.slot === number) ? "ready" : "generated"} level ${number}: ${chapter.size}x${chapter.size} K${chapter.starsPerUnit}, ${record.trace.steps} steps, ${record.trace.contradictionSteps} contradiction steps`);
  }
  chapterLevels.sort((left, right) => (left.trace.contradictionSteps - right.trace.contradictionSteps) || (left.trace.steps - right.trace.steps));
  chapterLevels.forEach((level, index) => {
    generated.push({ ...level, number: (chapter.chapter - 1) * 4 + index + 1, name: chapter.names[index] });
  });
}

const advancedNames = [...chapters[3].names, ...chapters[4].names];
const advancedLevels = generated
  .filter((level) => level.starsPerUnit > 1)
  .sort((left, right) => (left.trace.contradictionSteps - right.trace.contradictionSteps) || (left.trace.steps - right.trace.steps));
advancedLevels.forEach((level, index) => {
  level.number = 13 + index;
  level.chapter = index < 4 ? 4 : 5;
  level.name = advancedNames[index];
});
generated.splice(12, advancedLevels.length, ...advancedLevels);

const signatures = new Set(generated.map((level) => level.regions.flat().join("")));
if (signatures.size !== generated.length) throw new Error("Generated region layouts are not unique");
const advancedSolutionSignatures = new Set(generated.filter((level) => level.starsPerUnit > 1).map((level) => JSON.stringify(level.solution)));
if (advancedSolutionSignatures.size !== 8) throw new Error("Advanced region levels do not have eight distinct star layouts");
for (const level of generated) {
  const solutions = solveBasic(level.regions, level.starsPerUnit, 2);
  if (solutions.length !== 1 || !allRegionsConnected(level.regions)) throw new Error(`Invalid level ${level.number}`);
}

const exported = generated.map((level) => ({
  number: level.number,
  chapter: level.chapter,
  name: level.name,
  seed: level.seed,
  size: level.size,
  starsPerUnit: level.starsPerUnit,
  regions: level.regions,
  solution: level.solution,
  difficulty: {
    steps: level.trace.steps,
    directSteps: level.trace.directSteps,
    contradictionSteps: level.trace.contradictionSteps,
    ruleSequence: level.trace.ruleSequence,
  },
}));

const body = `// Generated by scripts/generate-region-logic-levels.mjs. Do not edit by hand.\n` +
  `export const regionLogicLevels = ${JSON.stringify(exported, null, 2)} as const;\n`;
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, body, "utf8");
console.log(JSON.stringify({ outputPath, levels: exported.length, signatures: signatures.size, summary: exported.map((level) => ({ number: level.number, size: level.size, starsPerUnit: level.starsPerUnit, ...level.difficulty })) }, null, 2));
