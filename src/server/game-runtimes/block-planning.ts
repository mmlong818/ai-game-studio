/** Shared by the playable template and tests. No random choices or board mutation. */
export const blockPlanningScript = String.raw`
function blockForecast(board, piece, row, column, combo = 0) {
  const empty = {valid:false,rows:[],columns:[],cells:[],earned:0,next:board};
  if (!piece || piece.used) return {...empty,reason:"这枚已经放置，请选择剩余拼块。"};
  if (piece.cells.some(([r,c])=>row+r<0||column+c<0||row+r>=board.length||column+c>=board[0].length)) return {...empty,reason:"拼块超出边界，向棋盘内移动。"};
  if (piece.cells.some(([r,c])=>board[row+r][column+c])) return {...empty,reason:"这里已有果冻，换到完整空位。"};
  const next=board.map(line=>line.slice());
  piece.cells.forEach(([r,c])=>{next[row+r][column+c]=1;});
  const rows=next.flatMap((line,r)=>line.every(Boolean)?[r]:[]);
  const columns=next[0].flatMap((_,c)=>next.every(line=>line[c])?[c]:[]);
  const cells=[];
  for(let r=0;r<next.length;r++)for(let c=0;c<next[r].length;c++)if(rows.includes(r)||columns.includes(c)){cells.push([r,c]);next[r][c]=0;}
  const lines=rows.length+columns.length;
  return {valid:true,rows,columns,cells,next,earned:piece.cells.length+lines*12*(combo+1),reason:lines?"将消除 "+lines+" 条，获得 "+(piece.cells.length+lines*12*(combo+1))+" 分":"可放置，暂不消线。"};
}
function blockPlanBatch(board, pieces, budget = 8000) {
  let visited=0, exhausted=false;
  const memo=new Set();
  function search(grid, indices) {
    if (!indices.length) return [];
    const key=grid.map(line=>line.map(Boolean).map(Number).join("")).join("/")+"@"+indices.join(",");
    if(memo.has(key))return null;
    const options=[];
    for(const index of indices)for(let row=0;row<grid.length;row++)for(let column=0;column<grid[0].length;column++){
      if(++visited>budget){exhausted=true;return null;}
      const forecast=blockForecast(grid,pieces[index],row,column);
      if(forecast.valid)options.push({index,row,column,forecast});
    }
    options.sort((a,b)=>(b.forecast.rows.length+b.forecast.columns.length)-(a.forecast.rows.length+a.forecast.columns.length));
    for(const option of options){
      const rest=search(option.forecast.next,indices.filter(index=>index!==option.index));
      if(rest)return [option,...rest];
      if(exhausted)return null;
    }
    memo.add(key);return null;
  }
  const plan=search(board,pieces.flatMap((piece,index)=>piece.used?[]:[index]));
  return {status:plan?"solved":exhausted?"budget-exhausted":"unsolvable",plan:plan||[],visited};
}
`;
