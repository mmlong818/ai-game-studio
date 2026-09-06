/** Shared verbatim with generated games. Search respects every player placement. */
export const polyominoSolverScript = String.raw`
function solvePolyRemainder(pieces, placements, target, variants, limit = 12000) {
  const occupied = new Set();
  for (const placement of placements) {
    const piece = pieces.find(item => item.id === placement.id);
    const variant = variants(piece.cells).find(item => item.rotation === placement.rotation)
      || { cells: rotatePolyCells(piece.cells, placement.rotation) };
    for (const [r,c] of variant.cells) occupied.add((r+placement.row)+":"+(c+placement.column));
  }
  const remaining = pieces.filter(piece => !placements.some(item => item.id === piece.id));
  const candidates = remaining.flatMap(piece => variants(piece.cells).flatMap(variant => {
    const found = new Map();
    for (const key of target) {
      const [r,c] = key.split(":").map(Number);
      for (const [dr,dc] of variant.cells) {
        const row=r-dr,column=c-dc;
        const cells=variant.cells.map(([rr,cc]) => (row+rr)+":"+(column+cc));
        if(cells.every(cell => target.has(cell) && !occupied.has(cell)))
          found.set(row+":"+column,{id:piece.id,row,column,rotation:variant.rotation,cells});
      }
    }
    return [...found.values()];
  }));
  let visited=0, exhausted=false;
  function search(used, filled, path) {
    if(++visited>limit){exhausted=true;return null;}
    if(used.size===remaining.length)return filled.size===target.size?path:null;
    let best=null;
    for(const cell of target){
      if(filled.has(cell))continue;
      const options=candidates.filter(candidate=>!used.has(candidate.id)&&candidate.cells.includes(cell)&&candidate.cells.every(key=>!filled.has(key)));
      if(!options.length)return null;
      if(!best||options.length<best.length)best=options;
      if(best.length===1)break;
    }
    for(const candidate of best||[]){
      const result=search(new Set([...used,candidate.id]),new Set([...filled,...candidate.cells]),[...path,candidate]);
      if(result)return result;
      if(exhausted)return null;
    }
    return null;
  }
  const solution=search(new Set(),occupied,[]);
  return {solution,exhausted,visited};
}
`;
