/** Pure rules embedded unchanged in the template; planning never places a piece for the player. */
export const tetrisPlanningScript = String.raw`
function tetrisHoles(grid) {
  let holes = 0;
  for (let x = 0; x < grid[0].length; x++) {
    let covered = false;
    for (let y = 0; y < grid.length; y++) {
      if (grid[y][x]) covered = true;
      else if (covered) holes++;
    }
  }
  return holes;
}
function tetrisPlacementForecast(grid, shape, x, y) {
  const result = grid.map(row => row.slice());
  let valid = true;
  shape.forEach((row, dy) => row.forEach((value, dx) => {
    if (!value) return;
    if (y + dy < 0 || y + dy >= grid.length || x + dx < 0 || x + dx >= grid[0].length || result[y + dy][x + dx]) valid = false;
    else result[y + dy][x + dx] = value;
  }));
  if (!valid) return { valid: false, clearRows: [], addedHoles: 0 };
  const clearRows = result.flatMap((row, index) => row.every(Boolean) ? [index] : []);
  const after = result.filter(row => !row.every(Boolean));
  while (after.length < grid.length) after.unshift(Array(grid[0].length).fill(0));
  return { valid: true, clearRows, addedHoles: tetrisHoles(after) - tetrisHoles(grid) };
}
function tetrisLesson(level) {
  const chapter = Math.min(4, Math.floor((Math.max(1, level) - 1) / 4));
  const variant = (Math.max(1, level) - 1) % 4;
  const names = ['平铺开口', '双层拼合', '竖井四消', '暂存取舍', '清理余隙'];
  const instructions = ['把长条平放进缺口，先完成一次消行。', '用方块填入双层缺口，一次消两行。', '把长条转直再放进竖井，一次消四行。', '暂存方块换出长条，保留合适形状再落下。', '清理底部缺口，并完成 3 枚落下后空洞未增加的放置。'];
  const depth = chapter === 1 ? 2 : chapter === 2 ? 4 : 1;
  const gapWidth = chapter === 1 ? 2 : chapter === 2 ? 1 : 4;
  const gap = [3, 0, 6, 2][variant];
  const grid = Array.from({ length: 20 }, () => Array(10).fill(0));
  for (let y = 20 - depth; y < 20; y++) {
    for (let x = 0; x < 10; x++) if (x < gap || x >= gap + gapWidth) grid[y][x] = 1 + (x + y) % 7;
  }
  return { chapter, name: names[chapter], instruction: instructions[chapter], grid, firstPiece: chapter === 1 || chapter === 3 ? 1 : 0, secondPiece: chapter === 3 ? 0 : null, goal: chapter === 2 ? 4 : chapter === 1 ? 2 : 1 };
}
`;
