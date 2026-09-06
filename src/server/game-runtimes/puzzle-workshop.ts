/** Puzzle-only organization, learning evidence and safe group restoration. */
export const puzzleWorkshopScript = String.raw`
function puzzleRegion(row, rows) { return Math.min(2, Math.floor(row * 3 / rows)); }
function puzzleWorkshopProgress(pieces, rows, columns) {
  const corner = (p) => (p.row === 0 || p.row === rows - 1) && (p.column === 0 || p.column === columns - 1);
  const edge = (p) => p.row === 0 || p.row === rows - 1 || p.column === 0 || p.column === columns - 1;
  const tally = (items) => ({ done: items.filter((p) => p.locked).length, total: items.length });
  return { corners: tally(pieces.filter(corner)), frame: tally(pieces.filter(edge)), regions: [0,1,2].map((region) => tally(pieces.filter((p) => puzzleRegion(p.row,rows) === region))) };
}
function puzzleWorkshopLesson(level, progress, connections) {
  if (level <= 4) return progress.corners.done < progress.corners.total ? '先找两条直边的角块，画面从四角开始。' : '四角已定位，沿着直边把外围连起来。';
  if (level <= 8) return connections < 1 ? '试着在外围接好相邻两块，再把整组移回画板。' : '拼好的组可以整组搬运；空白处可自由整理。';
  if (level <= 12) return '按上、中、下部分类，先追踪连续的线条，再比较颜色。';
  if (level <= 16) return '先拼成小组，再连接大画面；筛选不会拆散已连接的组。';
  return '任选熟悉的区域开工；预览与线索始终可用，不必硬猜。';
}
function puzzleWorkshopVisible(piece, pieces, filter, rows) {
  if (piece.locked || filter === 'all') return true;
  return pieces.some((other) => other.groupId === piece.groupId && (filter === 'edge' ? Object.values(other.edges).some((value) => value === 0) : puzzleRegion(other.row,rows) === Number(filter)));
}
function puzzleDropIsBoardAttempt(group, board) {
  return group.some((p) => p.x > board.x && p.x < board.x + board.width && p.y > board.y && p.y < board.y + board.height);
}
function puzzleRecoverGroupOffset(group, board, bounds) {
  if (!group.length) return {dx:0,dy:0};
  const boxes=group.map((p)=>{const angle=p.angle||0,scale=p.displayScale||1;const halfWidth=(Math.abs(Math.cos(angle))*board.cellWidth+Math.abs(Math.sin(angle))*board.cellHeight)*scale*.72,halfHeight=(Math.abs(Math.sin(angle))*board.cellWidth+Math.abs(Math.cos(angle))*board.cellHeight)*scale*.72;return {left:p.x-halfWidth,right:p.x+halfWidth,top:p.y-halfHeight,bottom:p.y+halfHeight};});
  const left=Math.min(...boxes.map((b)=>b.left)),right=Math.max(...boxes.map((b)=>b.right)),top=Math.min(...boxes.map((b)=>b.top)),bottom=Math.max(...boxes.map((b)=>b.bottom));
  const shift=(lo,hi,min,max)=>hi-lo>max-min?(min+max-lo-hi)/2:lo<min?min-lo:hi>max?max-hi:0;
  return {dx:shift(left,right,bounds.left,bounds.right),dy:shift(top,bottom,bounds.top,bounds.bottom)};
}
function puzzleValidatedLayout(saved, pieces, board, width, height) {
  if (!Array.isArray(saved) || saved.length !== pieces.length) return null;
  const seen = new Set();
  for (const entry of saved) {
    if (!entry || !Number.isInteger(entry.index) || !pieces[entry.index] || seen.has(entry.index) || !Number.isInteger(entry.groupId) || !Number.isFinite(entry.x) || !Number.isFinite(entry.y) || entry.x < -width || entry.x > width * 2 || entry.y < -height || entry.y > height * 2 || ![0,1,2,3].includes(entry.turn) || typeof entry.locked !== 'boolean') return null;
    seen.add(entry.index);
    if (entry.displayScale !== undefined && (!Number.isFinite(entry.displayScale) || entry.displayScale < .42 || entry.displayScale > 1)) return null;
  }
  for (const entry of saved) {
    const group = saved.filter((other) => other.groupId === entry.groupId), origin = pieces[entry.index];
    if (!entry.locked) {
      const reachable = new Set([entry.index]);
      let changed = true;
      while (changed) { changed = false; for (const candidate of group) { if (!reachable.has(candidate.index) && group.some((other) => reachable.has(other.index) && Math.abs(pieces[candidate.index].row-pieces[other.index].row)+Math.abs(pieces[candidate.index].column-pieces[other.index].column)===1)) { reachable.add(candidate.index); changed=true; } } }
      if (reachable.size !== group.length) return null;
    }
    if (entry.locked && (entry.turn !== 0 || Math.hypot(entry.x-origin.homeX,entry.y-origin.homeY)>1.5)) return null;
    for (const other of group) {
      if (other.turn !== entry.turn || other.locked !== entry.locked) return null;
      const target = pieces[other.index], dx = (target.column-origin.column)*board.cellWidth, dy = (target.row-origin.row)*board.cellHeight;
      const angle = entry.turn*Math.PI/2;
      if (Math.hypot(other.x-entry.x-(dx*Math.cos(angle)-dy*Math.sin(angle)),other.y-entry.y-(dx*Math.sin(angle)+dy*Math.cos(angle)))>1.5) return null;
    }
  }
  return saved;
}
`;
