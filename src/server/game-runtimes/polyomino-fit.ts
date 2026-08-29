// 规则架构参考 mkgame-poly（MIT）；关卡、拼块、名称和视听资产均为本平台原创。
export const polyominoFitScript = String.raw`
const polyDifficulty = {
  relaxed: { boardBonus: 0, hintBonus: 1, rotationOffset: 0 },
  standard: { boardBonus: 0, hintBonus: 0, rotationOffset: 1 },
  challenging: { boardBonus: 1, hintBonus: -1, rotationOffset: 2 },
}[config.difficulty];

const polyChapters = ["认识轮廓", "判断旋转", "破解凹槽", "规划顺序", "综合掌握"];
const polyShapeLibrary = [
  { id: "corner-3", cells: [[0,0],[1,0],[1,1]] },
  { id: "bar-3", cells: [[0,0],[0,1],[0,2]] },
  { id: "square-4", cells: [[0,0],[0,1],[1,0],[1,1]] },
  { id: "tee-4", cells: [[0,0],[0,1],[0,2],[1,1]] },
  { id: "ell-4", cells: [[0,0],[1,0],[2,0],[2,1]] },
  { id: "zig-4", cells: [[0,0],[0,1],[1,1],[1,2]] },
  { id: "bar-4", cells: [[0,0],[0,1],[0,2],[0,3]] },
  { id: "pee-5", cells: [[0,0],[0,1],[1,0],[1,1],[2,0]] },
  { id: "you-5", cells: [[0,0],[0,2],[1,0],[1,1],[1,2]] },
  { id: "tee-5", cells: [[0,0],[0,1],[0,2],[1,1],[2,1]] },
  { id: "double-zig-5", cells: [[0,0],[1,0],[1,1],[2,1],[2,2]] },
  { id: "why-5", cells: [[0,0],[0,1],[0,2],[0,3],[1,1]] },
  { id: "ell-5", cells: [[0,0],[1,0],[2,0],[3,0],[3,1]] },
];
const polyLevelSeeds = [
  0x1571a9,0x2b04df,0x3d91b7,0x4f270d,0x5ac863,0x6c55d9,0x7e032f,0x8f9095,0x914deb,0xa2db41,
  0xb46897,0xc5f5ed,0xd78343,0xe91099,0xfaadef,0x1c3b45,0x2dc89b,0x3f55f1,0x40e347,0x52709d,
];
const polyLevelNames = [
  "柠糖小湾","双角花圃","莓果回廊","汽水拱门",
  "旋转码头","镜面软岛","风车浅滩","四向糖桥",
  "凹槽果园","窄湾拼岸","双齿灯塔","回声内港",
  "珊瑚瓶颈","两岸相望","曲折潮门","星糖锁湾",
  "八色群岛","深湾回环","双岛月桥","软糖终章",
];

let polyBoardSize = 6;
let polyPieces = [];
let polyPlacements = [];
let selectedPolyPiece = 0;
let polyHint = null;
let polyHintsRemaining = 2;
let polyMoves = 0;
let polyInvalidMoves = 0;
let polyUndoStack = [];
let polyPulse = null;
let polyDragState = null;
let polyDragPreview = null;
let polyRestored = false;
let polyBestMoves = 0;
let polyBlueprintCache = new Map();

function createPolyRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function polyCellKey(row, column) { return row + ":" + column; }

function normalizePolyCells(cells) {
  const minRow = Math.min(...cells.map((cell) => cell[0]));
  const minColumn = Math.min(...cells.map((cell) => cell[1]));
  return cells.map(([row,column]) => [row-minRow,column-minColumn]).sort((left,right)=>left[0]-right[0]||left[1]-right[1]);
}

function rotatePolyCells(cells, turns) {
  let rotated = cells.map(([row, column]) => [row, column]);
  for (let turn = 0; turn < ((turns % 4) + 4) % 4; turn += 1) rotated = normalizePolyCells(rotated.map(([row,column])=>[column,-row]));
  return normalizePolyCells(rotated);
}

function polyShapeVariants(cells) {
  const variants = [];
  const signatures = new Set();
  for (let rotation=0;rotation<4;rotation+=1) {
    const rotated=rotatePolyCells(cells,rotation);
    const signature=rotated.map((cell)=>cell.join(":")).join("|");
    if(signatures.has(signature))continue;
    signatures.add(signature);variants.push({rotation,cells:rotated});
  }
  return variants;
}

function polyPlacementCandidates(boardSize, occupied, cells, requireAdjacent) {
  const maxRow=Math.max(...cells.map((cell)=>cell[0]));
  const maxColumn=Math.max(...cells.map((cell)=>cell[1]));
  const candidates=[];
  for(let row=0;row<boardSize-maxRow;row+=1)for(let column=0;column<boardSize-maxColumn;column+=1){
    const absolute=cells.map(([cellRow,cellColumn])=>[row+cellRow,column+cellColumn]);
    if(absolute.some(([cellRow,cellColumn])=>occupied.has(polyCellKey(cellRow,cellColumn))))continue;
    let adjacency=0;
    for(const [cellRow,cellColumn] of absolute)for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]])if(occupied.has(polyCellKey(cellRow+dr,cellColumn+dc)))adjacency+=1;
    if(requireAdjacent&&adjacency===0)continue;
    const centerDistance=Math.hypot(row+maxRow/2-(boardSize-1)/2,column+maxColumn/2-(boardSize-1)/2);
    candidates.push({row,column,adjacency,centerDistance});
  }
  return candidates;
}

function validatePolyBlueprint(blueprint) {
  const target=new Set();
  let area=0;
  for(const piece of blueprint.pieces){
    const cells=rotatePolyCells(piece.cells,piece.solution[2]);
    const local=new Set(cells.map((cell)=>cell.join(":")));
    if(local.size!==cells.length)return false;
    for(const [cellRow,cellColumn] of cells){
      const row=piece.solution[0]+cellRow,column=piece.solution[1]+cellColumn,key=polyCellKey(row,column);
      if(row<0||column<0||row>=blueprint.boardSize||column>=blueprint.boardSize||target.has(key))return false;
      target.add(key);area+=1;
    }
  }
  return area===target.size&&target.size>=15&&blueprint.pieces.length>=4;
}

function compilePolyBlueprint(levelNumber) {
  if(polyBlueprintCache.has(levelNumber))return structuredClone(polyBlueprintCache.get(levelNumber));
  const level=config.campaignLevels[Math.max(0,Math.min(19,levelNumber-1))];
  const tier=level.tier;
  const pieceCount=3+tier;
  const boardSize=Math.min(8,5+Math.ceil(tier/2)+polyDifficulty.boardBonus);
  for(let attempt=0;attempt<96;attempt+=1){
    const random=createPolyRandom((polyLevelSeeds[levelNumber-1]+attempt*0x9e3779b1)>>>0);
    const occupied=new Set();
    const pieces=[];
    let failed=false;
    for(let index=0;index<pieceCount;index+=1){
      const maxShapeIndex=Math.min(polyShapeLibrary.length,4+tier*2);
      const shape=polyShapeLibrary[(Math.floor(random()*maxShapeIndex)+levelNumber+index)%maxShapeIndex];
      const variants=polyShapeVariants(shape.cells);
      const variant=variants[Math.floor(random()*variants.length)];
      const candidates=polyPlacementCandidates(boardSize,occupied,variant.cells,index>0);
      if(!candidates.length){failed=true;break;}
      candidates.forEach((candidate)=>{candidate.rank=candidate.adjacency+random()*.7-candidate.centerDistance*.14;});
      candidates.sort((left,right)=>right.rank-left.rank);
      const chosen=candidates[Math.floor(random()*Math.min(7,candidates.length))];
      for(const [cellRow,cellColumn] of variant.cells)occupied.add(polyCellKey(chosen.row+cellRow,chosen.column+cellColumn));
      const initialRotation=(variant.rotation+1+Math.floor(random()*3)+polyDifficulty.rotationOffset)%4;
      pieces.push({id:"piece-"+(index+1),shapeId:shape.id,cells:shape.cells.map((cell)=>[...cell]),solution:[chosen.row,chosen.column,variant.rotation],rotation:initialRotation,sprite:(levelNumber+index*2)%6});
    }
    if(failed)continue;
    const rows=[...occupied].map((key)=>Number(key.split(":")[0]));
    const columns=[...occupied].map((key)=>Number(key.split(":")[1]));
    const width=Math.max(...columns)-Math.min(...columns)+1;
    const height=Math.max(...rows)-Math.min(...rows)+1;
    const blueprint={number:levelNumber,name:polyLevelNames[levelNumber-1],chapter:polyChapters[tier-1],boardSize,pieces,area:occupied.size,width,height,hints:Math.max(0,3-Math.ceil(tier/2)+polyDifficulty.hintBonus),seed:polyLevelSeeds[levelNumber-1]};
    if(width>=4&&height>=4&&validatePolyBlueprint(blueprint)){polyBlueprintCache.set(levelNumber,blueprint);return structuredClone(blueprint);}
  }
  throw new Error("无法生成可解的软糖拼岛关卡 "+levelNumber);
}

function currentPolyBlueprint(){return compilePolyBlueprint(currentCampaignLevel().number);}
function polySessionKey(){return config.campaignStorageKey+"-polyomino-session-v3";}
function polyBestKey(){return config.campaignStorageKey+"-polyomino-best-"+currentCampaignLevel().number;}
function clearPolySession(){try{safeStorage.removeItem(polySessionKey());}catch{}}
function readPolyBest(){try{return Math.max(0,Number(safeStorage.getItem(polyBestKey()))||0);}catch{return 0;}}

function persistPolySession(){
  try{safeStorage.setItem(polySessionKey(),JSON.stringify({schemaVersion:3,level:currentCampaignLevel().number,pieces:polyPieces.map((piece)=>({id:piece.id,rotation:piece.rotation})),placements:polyPlacements,moves:polyMoves,invalid:polyInvalidMoves,hints:polyHintsRemaining,selected:selectedPolyPiece,updatedAt:new Date().toISOString()}));}catch{}
}

function restorePolySession(){
  polyRestored=false;
  try{
    const saved=JSON.parse(safeStorage.getItem(polySessionKey())||"null");
    if(!saved||saved.schemaVersion!==3||saved.level!==currentCampaignLevel().number||!Array.isArray(saved.pieces)||!Array.isArray(saved.placements))return;
    const rotations=new Map(saved.pieces.map((piece)=>[piece.id,Number(piece.rotation)]));
    if(polyPieces.some((piece)=>!rotations.has(piece.id)))return;
    const candidatePlacements=[];
    for(const placement of saved.placements){
      const piece=polyPieces.find((entry)=>entry.id===placement.id);
      if(!piece||candidatePlacements.some((entry)=>entry.id===piece.id))return;
      const originalPlacements=polyPlacements;polyPlacements=candidatePlacements;
      const valid=canPlacePolyPiece(piece,Number(placement.row),Number(placement.column),Number(placement.rotation));
      polyPlacements=originalPlacements;
      if(!valid)return;
      candidatePlacements.push({id:piece.id,row:Number(placement.row),column:Number(placement.column),rotation:Number(placement.rotation)});
    }
    polyPieces.forEach((piece)=>{piece.rotation=((rotations.get(piece.id)%4)+4)%4;});
    polyPlacements=candidatePlacements;
    polyMoves=Math.max(0,Number(saved.moves)||0);polyInvalidMoves=Math.max(0,Number(saved.invalid)||0);polyHintsRemaining=Math.max(0,Number(saved.hints)||0);selectedPolyPiece=Math.max(0,Math.min(polyPieces.length-1,Number(saved.selected)||0));polyRestored=true;
  }catch{}
}

function polyTargetCells() {
  const target = new Set();
  for (const piece of polyPieces) {
    const [row, column, rotation] = piece.solution;
    for (const [cellRow, cellColumn] of rotatePolyCells(piece.cells, rotation)) target.add(polyCellKey(row + cellRow, column + cellColumn));
  }
  return target;
}

function polyOccupiedCells(ignoreId = null) {
  const occupied = new Set();
  for (const placement of polyPlacements) {
    if (placement.id === ignoreId) continue;
    const piece = polyPieces.find((item) => item.id === placement.id);
    for (const [cellRow, cellColumn] of rotatePolyCells(piece.cells, placement.rotation)) occupied.add(polyCellKey(placement.row + cellRow, placement.column + cellColumn));
  }
  return occupied;
}

function canPlacePolyPiece(piece, row, column, rotation = piece.rotation) {
  if(!piece||polyPlacements.some((placement)=>placement.id===piece.id)||!Number.isInteger(row)||!Number.isInteger(column))return false;
  const target = polyTargetCells();
  const occupied = polyOccupiedCells(piece.id);
  return rotatePolyCells(piece.cells, rotation).every(([cellRow, cellColumn]) => {
    const boardRow = row + cellRow, boardColumn = column + cellColumn, key = polyCellKey(boardRow, boardColumn);
    return boardRow >= 0 && boardColumn >= 0 && boardRow < polyBoardSize && boardColumn < polyBoardSize && target.has(key) && !occupied.has(key);
  });
}

function findNearestLegalPlacement(piece, targetRow, targetColumn) {
  if(!piece)return null;
  const cells=rotatePolyCells(piece.cells,piece.rotation),candidates=[];
  for(const [grabRow,grabColumn] of cells){
    const row=targetRow-grabRow,column=targetColumn-grabColumn;
    if(canPlacePolyPiece(piece,row,column))candidates.push({row,column,distance:Math.hypot(grabRow,grabColumn)});
  }
  return candidates.sort((left,right)=>left.distance-right.distance)[0]||null;
}

function selectNextPolyPiece(){const next=polyPieces.findIndex((piece)=>!polyPlacements.some((placement)=>placement.id===piece.id));if(next>=0)selectedPolyPiece=next;}

function placePolyPiece(piece,row,column,rotation=piece.rotation){
  if(!canPlacePolyPiece(piece,row,column,rotation)){
    polyInvalidMoves+=1;polyPulse={kind:"invalid",until:performance.now()+260};playSound("fail");setStatus("这里无法完整容纳该拼块；拼块已回到候选区。");drawPolyomino();return false;
  }
  polyUndoStack.push({placements:structuredClone(polyPlacements),rotations:polyPieces.map((entry)=>entry.rotation),moves:polyMoves});
  polyPlacements.push({id:piece.id,row,column,rotation});polyMoves+=1;polyHint=null;polyPulse={kind:"snap",id:piece.id,until:performance.now()+300};playSound("move");selectNextPolyPiece();
  if(polyPlacements.length === polyPieces.length){
    clearPolySession();
    if(!polyBestMoves||polyMoves<polyBestMoves){polyBestMoves=polyMoves;try{safeStorage.setItem(polyBestKey(),String(polyBestMoves));}catch{}}
    drawPolyomino();showResult(true,"软糖岛完整了","全部 "+polyTargetCells().size+" 格已覆盖；使用 "+polyMoves+" 次操作、提示 "+(currentPolyBlueprint().hints-polyHintsRemaining)+" 次。最佳 "+polyBestMoves+" 步。");return true;
  }
  persistPolySession();updatePolyStatus();drawPolyomino();return true;
}

function updatePolyStatus(){
  setMetric(polyPlacements.length+" / "+polyPieces.length+" · "+polyMoves+" 步");
  setStatus((polyRestored?"已恢复 · ":"")+currentPolyBlueprint().name+" · 还剩 "+(polyPieces.length-polyPlacements.length)+" 块 · 提示 "+polyHintsRemaining+"。先处理紧角与凹槽。");
}

function polyLayout(){const boardSize=Math.min(620,gameSceneHeight()*.54);return{boardSize,cell:boardSize/polyBoardSize,x:(720-boardSize)/2,y:164};}

function polyTrayLayout(boardLayout=polyLayout()){
  const columns=polyPieces.length>=7?4:polyPieces.length>=5?3:polyPieces.length;
  const rows=Math.ceil(polyPieces.length/columns),gap=8,slotWidth=Math.floor((660-gap*(columns-1))/columns),slotHeight=rows>1?124:154;
  const width=slotWidth*columns+gap*(columns-1),height=slotHeight*rows,y=Math.min(gameSceneHeight()-height-22,boardLayout.y+boardLayout.boardSize+46);
  return{x:(720-width)/2,y,width,height,columns,rows,gap,slotWidth,slotHeight};
}

function polyTrayPieceAt(point,layout=polyLayout()){
  const tray=polyTrayLayout(layout);
  if(point.x<tray.x||point.x>tray.x+tray.width||point.y<tray.y||point.y>tray.y+tray.height)return-1;
  for(let index=0;index<polyPieces.length;index+=1){const column=index%tray.columns,row=Math.floor(index/tray.columns),x=tray.x+column*(tray.slotWidth+tray.gap),y=tray.y+row*tray.slotHeight;if(point.x>=x&&point.x<=x+tray.slotWidth&&point.y>=y&&point.y<=y+tray.slotHeight)return index;}
  return-1;
}

function drawPolyPiece(piece,index,x,y,cell,alpha=1){
  ctx.save();ctx.globalAlpha=alpha;
  for(const [row,column] of rotatePolyCells(piece.cells,piece.rotation))drawBitmapSprite(piece.sprite,x+column*cell,y+row*cell,cell,cell,{fallback:palette.pieces[index%palette.pieces.length],radius:Math.max(8,cell*.22),scale:1.14,alpha});
  ctx.restore();
}

function drawPolyomino(){
  clearCanvas();ctx.save();ctx.fillStyle="rgba(252,247,242,.94)";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.translate(0,gameSceneTop());
  const layout=polyLayout(),target=polyTargetCells(),occupied=polyOccupiedCells();
  if(running){ctx.textAlign="center";ctx.fillStyle="#40343f";ctx.font="800 30px Inter,sans-serif";ctx.fillText(currentPolyBlueprint().name+" · "+polyPlacements.length+"/"+polyPieces.length+" 块",360,76);ctx.fillStyle="#776875";ctx.font="600 18px Inter,sans-serif";ctx.fillText(currentPolyBlueprint().chapter+" · "+polyMoves+" 步 · 提示 "+polyHintsRemaining,360,111);}
  ctx.save();ctx.fillStyle="#3a3540";ctx.shadowColor="rgba(72,44,72,.16)";ctx.shadowBlur=22;ctx.shadowOffsetY=10;ctx.beginPath();ctx.roundRect(layout.x-15,layout.y-15,layout.boardSize+30,layout.boardSize+30,34);ctx.fill();ctx.restore();
  for(let row=0;row<polyBoardSize;row+=1)for(let column=0;column<polyBoardSize;column+=1){
    const key=polyCellKey(row,column);if(!target.has(key))continue;const x=layout.x+column*layout.cell,y=layout.y+row*layout.cell;
    if(!occupied.has(key)){ctx.fillStyle="#514a56";ctx.strokeStyle="rgba(255,239,222,.22)";ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x+4,y+4,layout.cell-8,layout.cell-8,Math.min(14,layout.cell*.22));ctx.fill();ctx.stroke();}
    if(polyHint?.cells?.has(key)){ctx.fillStyle="rgba(255,211,95,.4)";ctx.fillRect(x+5,y+5,layout.cell-10,layout.cell-10);}
  }
  for(const placement of polyPlacements){const index=polyPieces.findIndex((piece)=>piece.id===placement.id),piece=polyPieces[index],cells=rotatePolyCells(piece.cells,placement.rotation);for(const [row,column] of cells)drawBitmapSprite(piece.sprite,layout.x+(placement.column+column)*layout.cell+3,layout.y+(placement.row+row)*layout.cell+3,layout.cell-6,layout.cell-6,{fallback:palette.pieces[index%palette.pieces.length],radius:14,scale:1.12});}
  if(polyDragPreview){const piece=polyPieces[selectedPolyPiece],cells=rotatePolyCells(piece.cells,piece.rotation);for(const [row,column] of cells){const x=layout.x+(polyDragPreview.column+column)*layout.cell,y=layout.y+(polyDragPreview.row+row)*layout.cell;ctx.fillStyle=polyDragPreview.valid?"rgba(116,228,186,.42)":"rgba(238,77,55,.35)";ctx.fillRect(x+4,y+4,layout.cell-8,layout.cell-8);}}
  const tray=polyTrayLayout(layout);
  ctx.save();ctx.fillStyle="rgba(255,252,248,.93)";ctx.strokeStyle="rgba(122,90,119,.2)";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(tray.x-12,tray.y-12,tray.width+24,tray.height+24,28);ctx.fill();ctx.stroke();ctx.restore();
  polyPieces.forEach((piece,index)=>{
    const used=polyPlacements.some((placement)=>placement.id===piece.id),column=index%tray.columns,row=Math.floor(index/tray.columns),x=tray.x+column*(tray.slotWidth+tray.gap),y=tray.y+row*tray.slotHeight,selected=index===selectedPolyPiece&&!used;
    ctx.save();ctx.fillStyle=selected?"rgba(255,235,194,.72)":"rgba(255,255,255,.48)";ctx.strokeStyle=selected?"#9a5f8e":"rgba(110,83,108,.18)";ctx.lineWidth=selected?3:1;ctx.shadowColor=selected?"rgba(198,106,176,.2)":"transparent";ctx.shadowBlur=selected?18:0;ctx.beginPath();ctx.roundRect(x,y,tray.slotWidth,tray.slotHeight-8,20);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=selected?"#7d416f":"#756c74";ctx.beginPath();ctx.arc(x+18,y+18,10,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="800 14px Inter,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(index+1),x+18,y+18);ctx.restore();
    const cells=rotatePolyCells(piece.cells,piece.rotation),maxColumn=Math.max(...cells.map((cell)=>cell[1]))+1,maxRow=Math.max(...cells.map((cell)=>cell[0]))+1,mini=Math.min(48,(tray.slotWidth-24)/maxColumn,(tray.slotHeight-38)/maxRow),pieceX=x+(tray.slotWidth-maxColumn*mini)/2,pieceY=y+20+(tray.slotHeight-28-maxRow*mini)/2;
    if(!used)drawPolyPiece(piece,index,pieceX,pieceY,mini);else{ctx.fillStyle="rgba(82,69,79,.58)";ctx.font="700 14px Inter,sans-serif";ctx.textAlign="center";ctx.fillText("已吸附",x+tray.slotWidth/2,y+tray.slotHeight/2);}
  });
  if(polyPulse&&performance.now()<polyPulse.until&&polyPulse.kind==="invalid"){ctx.fillStyle="rgba(238,77,55,.12)";ctx.fillRect(layout.x,layout.y,layout.boardSize,layout.boardSize);}
  ctx.restore();if(config.visualStyle!=="cute")finishCanvasStyle();
}

function rotateSelectedPolyPiece(){const piece=polyPieces[selectedPolyPiece];if(!piece||polyPlacements.some((placement)=>placement.id===piece.id))return false;piece.rotation=(piece.rotation+1)%4;polyMoves+=1;polyHint=null;playSound("move");persistPolySession();updatePolyStatus();drawPolyomino();return true;}

function hintPolyPiece(){
  if(polyHintsRemaining<=0){setStatus("本关提示已用完；优先寻找只容得下一种拼块的紧角。");return false;}
  const index=polyPieces.findIndex((piece)=>!polyPlacements.some((placement)=>placement.id===piece.id));if(index<0)return false;
  selectedPolyPiece=index;const piece=polyPieces[index],solutionCells=rotatePolyCells(piece.cells,piece.solution[2]).map(([row,column])=>polyCellKey(piece.solution[0]+row,piece.solution[1]+column));
  const stage=polyHintsRemaining===currentPolyBlueprint().hints?"region":"anchor";polyHint={pieceId:piece.id,stage,cells:new Set(stage==="region"?solutionCells:[solutionCells[0]])};polyHintsRemaining-=1;persistPolySession();setStatus(stage==="region"?"已标出一块软糖对应的区域，但方向仍由你判断。":"已标出该拼块的一个锚点，不会自动旋转或代放。");drawPolyomino();return true;
}

function undoPolyPiece(){
  const snapshot=polyUndoStack.pop();
  if(snapshot){polyPlacements=snapshot.placements;polyPieces.forEach((piece,index)=>{piece.rotation=snapshot.rotations[index];});polyMoves=snapshot.moves;selectNextPolyPiece();}
  else{const removed=polyPlacements.pop();if(!removed)return false;selectedPolyPiece=polyPieces.findIndex((piece)=>piece.id===removed.id);polyMoves+=1;}
  polyHint=null;persistPolySession();setStatus("已撤销上一块；方向与候选状态已恢复。");updatePolyStatus();drawPolyomino();return true;
}

function startGame(){
  if(running)clearPolySession();
  const blueprint=currentPolyBlueprint();polyBoardSize=blueprint.boardSize;polyPieces=blueprint.pieces;polyPlacements=[];selectedPolyPiece=0;polyHint=null;polyHintsRemaining=blueprint.hints;polyMoves=0;polyInvalidMoves=0;polyUndoStack=[];polyPulse=null;polyDragState=null;polyDragPreview=null;polyRestored=false;polyBestMoves=readPolyBest();restorePolySession();running=true;hideOverlay();startAmbient();updatePolyStatus();drawPolyomino();
}

function handleControl(value){if(value==="rotate")rotateSelectedPolyPiece();if(value==="hint")hintPolyPiece();if(value==="undo")undoPolyPiece();}
function handleKey(key){if(key.toLowerCase()==="r")rotateSelectedPolyPiece();if(key.toLowerCase()==="h")hintPolyPiece();if(key.toLowerCase()==="z")undoPolyPiece();if("12345678".includes(key)){const index=Number(key)-1;if(index<polyPieces.length&&!polyPlacements.some((placement)=>placement.id===polyPieces[index].id)){selectedPolyPiece=index;drawPolyomino();}}}

canvas.addEventListener("pointerdown",(event)=>{
  if(!running)return;const point=eventScenePoint(event),layout=polyLayout(),pieceIndex=polyTrayPieceAt(point,layout);
  if(pieceIndex<0||polyPlacements.some((placement)=>placement.id===polyPieces[pieceIndex].id))return;
  const wasSelected=selectedPolyPiece===pieceIndex;selectedPolyPiece=pieceIndex;polyDragState={pointerId:event.pointerId,startX:point.x,startY:point.y,moved:false,wasSelected,liftCells:event.pointerType==="touch"?2:1};try{canvas.setPointerCapture(event.pointerId);}catch{}drawPolyomino();
});

canvas.addEventListener("pointermove",(event)=>{
  if(!running||!polyDragState||polyDragState.pointerId!==event.pointerId)return;const point=eventScenePoint(event),layout=polyLayout();if(Math.hypot(point.x-polyDragState.startX,point.y-polyDragState.startY)>8)polyDragState.moved=true;
  if(!polyDragState.moved)return;const targetRow=Math.floor((point.y-layout.y)/layout.cell)-polyDragState.liftCells,targetColumn=Math.floor((point.x-layout.x)/layout.cell),piece=polyPieces[selectedPolyPiece],placement=findNearestLegalPlacement(piece,targetRow,targetColumn);polyDragPreview=placement?{...placement,valid:true}:{row:targetRow,column:targetColumn,valid:false};drawPolyomino();
});

function finishPolyPointer(event){
  if(!running)return;const point=eventScenePoint(event),layout=polyLayout();
  if(polyDragState?.pointerId===event.pointerId){
    if(polyDragState.moved){const piece=polyPieces[selectedPolyPiece];if(polyDragPreview?.valid)placePolyPiece(piece,polyDragPreview.row,polyDragPreview.column);else{polyInvalidMoves+=1;polyPulse={kind:"invalid",until:performance.now()+260};playSound("fail");setStatus("未对准完整轮廓，拼块已回弹。");}}
    else if(polyDragState.wasSelected)rotateSelectedPolyPiece();
    polyDragPreview=null;polyDragState=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);drawPolyomino();return;
  }
  if(point.y>=layout.y&&point.y<=layout.y+layout.boardSize&&point.x>=layout.x&&point.x<=layout.x+layout.boardSize){const piece=polyPieces[selectedPolyPiece],placement=findNearestLegalPlacement(piece,Math.floor((point.y-layout.y)/layout.cell),Math.floor((point.x-layout.x)/layout.cell));if(placement)placePolyPiece(piece,placement.row,placement.column);else{polyInvalidMoves+=1;polyPulse={kind:"invalid",until:performance.now()+260};playSound("fail");drawPolyomino();}}
}
canvas.addEventListener("pointerup",finishPolyPointer);
canvas.addEventListener("pointercancel",(event)=>{polyDragPreview=null;polyDragState=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);drawPolyomino();});

function initializePolyPreview(){const blueprint=currentPolyBlueprint();polyBoardSize=blueprint.boardSize;polyPieces=blueprint.pieces;polyPlacements=[];selectedPolyPiece=0;polyHintsRemaining=blueprint.hints;}
initializePolyPreview();
onCampaignLevelChanged=()=>{if(!running){initializePolyPreview();drawPolyomino();}};

runtimeDebugState=()=>{
  const tray=polyTrayLayout(),piece=polyPieces[selectedPolyPiece]||polyPieces[0],cells=piece?rotatePolyCells(piece.cells,piece.rotation):[[0,0]],maxColumn=Math.max(...cells.map((cell)=>cell[1]))+1,maxRow=Math.max(...cells.map((cell)=>cell[0]))+1,cellSize=Math.min(48,(tray.slotWidth-24)/maxColumn,(tray.slotHeight-38)/maxRow),targets=[...polyTargetCells()].sort();
  const selectedColumn=selectedPolyPiece%tray.columns,selectedRow=Math.floor(selectedPolyPiece/tray.columns);
  return{level:currentCampaignLevel().number,tier:currentCampaignLevel().tier,levelName:currentPolyBlueprint().name,chapter:currentPolyBlueprint().chapter,contourCount:20,contourSignature:targets.join("|"),pieceSignature:polyPieces.map((entry)=>entry.shapeId+"@"+entry.solution.join(":" )).join("/"),rotationSignature:polyPieces.map((entry)=>entry.rotation).join("|"),targetCellCount: polyTargetCells().size,boardSize:polyBoardSize,pieceCount:polyPieces.length,placed:polyPlacements.length,moves:polyMoves,invalidMoves:polyInvalidMoves,bestMoves:polyBestMoves,hintsRemaining:polyHintsRemaining,selectedPiece:selectedPolyPiece,selectedRotation:piece?.rotation||0,hintAnchorOnly:polyHint?.stage==="anchor",hintStage:polyHint?.stage||null,clickToRotate: true,dragPreview:polyDragPreview,dragLiftCells:polyDragState?.liftCells||0,restored:polyRestored,validBlueprint:validatePolyBlueprint(currentPolyBlueprint()),tray:{columns:tray.columns,rows:tray.rows,slotWidth:Math.round(tray.slotWidth),slotHeight:tray.slotHeight,cellSize:Math.round(cellSize)},trayFirstCenterCanvas:{x:tray.x+tray.slotWidth/2,y:gameSceneTop()+tray.y+tray.slotHeight/2},selectedTrayCenterCanvas:{x:tray.x+selectedColumn*(tray.slotWidth+tray.gap)+tray.slotWidth/2,y:gameSceneTop()+tray.y+selectedRow*tray.slotHeight+tray.slotHeight/2},canvasSize:{width:canvas.width,height:canvas.height}};
};

runtimeDebugActions={
  legalAction(){const piece=polyPieces[selectedPolyPiece];if(!piece)return false;piece.rotation=piece.solution[2];return placePolyPiece(piece,piece.solution[0],piece.solution[1]);},
  pointerProbe(){const index=polyPieces.findIndex((piece)=>!polyPlacements.some((placement)=>placement.id===piece.id));if(index<0)return null;selectedPolyPiece=index;const piece=polyPieces[index],layout=polyLayout(),tray=polyTrayLayout(layout),column=index%tray.columns,row=Math.floor(index/tray.columns);piece.rotation=piece.solution[2];return{from:{x:tray.x+column*(tray.slotWidth+tray.gap)+tray.slotWidth/2,y:gameSceneTop()+tray.y+row*tray.slotHeight+tray.slotHeight/2},to:{x:layout.x+(piece.solution[1]+.5)*layout.cell,y:gameSceneTop()+layout.y+(piece.solution[0]+1.5)*layout.cell},invalidTo:{x:layout.x-24,y:gameSceneTop()+layout.y-24},canvas:{width:canvas.width,height:canvas.height}};},
  hint:hintPolyPiece,rotate:rotateSelectedPolyPiece,undo:undoPolyPiece,clearSession:clearPolySession,
  selectPiece(index){if(index>=0&&index<polyPieces.length&&!polyPlacements.some((placement)=>placement.id===polyPieces[index].id)){selectedPolyPiece=index;drawPolyomino();return true;}return false;},
  placeSolutionPiece(){const piece=polyPieces[selectedPolyPiece];if(!piece)return false;piece.rotation=piece.solution[2];return placePolyPiece(piece,piece.solution[0],piece.solution[1]);},
  surveyLevels(){const targets=new Set(),pieces=new Set();let valid=0,minArea=99,maxArea=0,minPieces=99,maxPieces=0;for(let level=1;level<=20;level+=1){const blueprint=compilePolyBlueprint(level),target=[];for(const piece of blueprint.pieces)for(const [row,column] of rotatePolyCells(piece.cells,piece.solution[2]))target.push(polyCellKey(piece.solution[0]+row,piece.solution[1]+column));targets.add(target.sort().join("|"));pieces.add(blueprint.pieces.map((piece)=>piece.shapeId+"@"+piece.solution.join(":" )).join("/"));if(validatePolyBlueprint(blueprint))valid+=1;minArea=Math.min(minArea,blueprint.area);maxArea=Math.max(maxArea,blueprint.area);minPieces=Math.min(minPieces,blueprint.pieces.length);maxPieces=Math.max(maxPieces,blueprint.pieces.length);}return{count:20,valid,uniqueTargets:targets.size,uniquePieceSets:pieces.size,minArea,maxArea,minPieces,maxPieces};},
};
drawPolyomino();
`;
