import { klotskiCurriculumScript } from './klotski-curriculum.js';
export const klotskiScript = klotskiCurriculumScript + String.raw`
const initialPieces = [
  { id: "cao", label: "队长机器人", x: 1, y: 0, w: 2, h: 2, kind: "hero" },
  { id: "guan", label: "星星包裹", x: 1, y: 2, w: 2, h: 1, kind: "guard" },
  { id: "z1", label: "蓝色包裹", x: 0, y: 0, w: 1, h: 2, kind: "guard" },
  { id: "z2", label: "珊瑚包裹", x: 3, y: 0, w: 1, h: 2, kind: "guard" },
  { id: "z3", label: "蓝色包裹", x: 0, y: 2, w: 1, h: 2, kind: "guard" },
  { id: "z4", label: "珊瑚包裹", x: 3, y: 2, w: 1, h: 2, kind: "guard" },
  { id: "s1", label: "小熊包裹", x: 0, y: 4, w: 1, h: 1, kind: "soldier" },
  { id: "s2", label: "小猫包裹", x: 3, y: 4, w: 1, h: 1, kind: "soldier" },
  { id: "s3", label: "小熊包裹", x: 1, y: 3, w: 1, h: 1, kind: "soldier" },
  { id: "s4", label: "小猫包裹", x: 2, y: 3, w: 1, h: 1, kind: "soldier" },
];

const klotskiPieceOrder = ["z1","z2","z3","z4","guan","cao","s1","s2","s3","s4"];
const klotskiBlueprints = [
  ["初开朱门",8,[[0,0],[1,0],[2,0],[3,0],[0,3],[2,3],[0,2],[1,2],[0,4],[1,4]]],
  ["双兵让道",12,[[2,0],[3,0],[0,1],[1,1],[0,3],[2,3],[0,0],[1,0],[0,4],[1,4]]],
  ["横梁移位",16,[[2,0],[1,1],[0,3],[1,3],[2,2],[2,3],[0,0],[1,0],[3,0],[0,2]]],
  ["回廊换肩",20,[[0,0],[1,0],[2,0],[3,1],[2,4],[0,2],[3,0],[3,3],[0,4],[1,4]]],
  ["侧门借位",24,[[0,0],[1,0],[3,0],[3,2],[2,4],[1,2],[2,0],[2,1],[0,4],[1,4]]],
  ["二空接力",30,[[2,0],[3,0],[0,1],[0,3],[1,4],[1,2],[0,0],[1,1],[3,3],[3,4]]],
  ["长将归边",36,[[1,0],[3,0],[2,1],[3,2],[2,4],[0,3],[0,0],[0,1],[1,2],[2,3]]],
  ["中心腾挪",42,[[0,0],[2,0],[3,0],[1,2],[2,4],[2,2],[1,1],[0,2],[0,3],[1,4]]],
  ["折返三隙",48,[[0,0],[3,1],[2,2],[3,3],[0,4],[0,2],[1,0],[3,0],[1,1],[2,4]]],
  ["双列换位",54,[[1,0],[0,1],[2,1],[3,1],[2,4],[0,3],[0,0],[2,0],[1,2],[2,3]]],
  ["横刀解扣",60,[[2,0],[1,3],[2,3],[3,3],[1,2],[0,0],[3,0],[0,2],[3,2],[0,4]]],
  ["门前清障",66,[[2,0],[3,1],[1,3],[3,3],[1,2],[0,0],[3,0],[0,2],[0,4],[2,4]]],
  ["深庭回旋",72,[[3,1],[0,2],[1,2],[2,3],[0,4],[1,0],[0,0],[0,1],[2,2],[3,3]]],
  ["四角调兵",78,[[0,0],[2,0],[3,1],[0,3],[2,4],[1,2],[1,0],[1,1],[3,3],[1,4]]],
  ["错层借道",84,[[2,0],[3,0],[0,2],[2,3],[0,4],[0,0],[1,2],[1,3],[3,3],[3,4]]],
  ["窄门转轴",90,[[3,0],[2,1],[0,2],[3,3],[0,4],[0,0],[2,0],[1,2],[2,3],[2,4]]],
  ["长廊逆行",96,[[2,0],[1,2],[2,2],[3,2],[0,4],[0,0],[3,0],[3,1],[0,3],[2,4]]],
  ["层层设防",104,[[3,0],[3,2],[0,3],[1,3],[1,2],[0,0],[2,1],[0,2],[2,4],[3,4]]],
  ["水泄不通",112,[[1,0],[0,1],[1,2],[0,3],[2,4],[2,0],[2,2],[3,2],[3,3],[1,4]]],
  ["横刀立马",120,[[0,0],[3,1],[0,3],[2,3],[0,2],[1,0],[3,0],[1,3],[1,4],[3,4]]],
];

function activeKlotskiBlueprint() {
  if(klotskiRoomIndex===0&&currentCampaignLevel().number<=3){const practice=klotskiPracticeLayouts[currentCampaignLevel().number-1];return [practice.name,practice.optimal,practice.points];}
  return klotskiBlueprints[currentKlotskiRoom().layout];
}

function createCampaignKlotskiPieces(roomIndex=klotskiRoomIndex) {
  if(roomIndex===0&&currentCampaignLevel().number<=3){
    const practice=klotskiPracticeLayouts[currentCampaignLevel().number-1];
    return ["cao","guan","z1","z2","s1","s2"].map((id,index)=>({...initialPieces.find(piece=>piece.id===id),x:practice.points[index][0],y:practice.points[index][1]}));
  }
  const blueprint = klotskiBlueprints[currentKlotskiCourse().boards[roomIndex]];
  return klotskiPieceOrder.map((id, index) => {
    const base = initialPieces.find((piece) => piece.id === id);
    const x=blueprint[2][index][0];
    return { ...base, x: roomIndex%2===1?4-base.w-x:x, y: blueprint[2][index][1] };
  });
}
const courtyardArt = new Image();
courtyardArt.decoding = "async";
courtyardArt.src = "./assets/klotski-courtyard.png";
courtyardArt.addEventListener("load", () => drawKlotski());
let pieces = [];
let selectedId = "cao";
let moves = 0;
let moveAnimation = null;
let particles = [];
let blockedUntil = 0;
let exitOpen = false;
let winAt = 0;
let selectedAt = performance.now();
let klotskiHistory = [];
let klotskiRedo = [];
let replayPath = [];
let initialLayoutSnapshot = [];
let replaying = false;
let optimalReference = null;
let klotskiHint = null;
let klotskiHintDistance = null;
let klotskiEpoch = 0;
let klotskiRestored = false;
let klotskiHintReason = "";
let klotskiHintStage=0;
let klotskiHintSignature="";
let klotskiFreedCells=[];
let klotskiFreedUntil=0;
const klotskiReasonCard=document.createElement("aside");
klotskiReasonCard.className="klotski-reason";klotskiReasonCard.hidden=true;klotskiReasonCard.setAttribute("aria-live","polite");
document.body.appendChild(klotskiReasonCard);
const klotskiHelpStyle=document.createElement("style");
klotskiHelpStyle.textContent="body[data-template=klotski] .onboarding-coach{bottom:110px;padding:10px;gap:4px}body[data-template=klotski] .onboarding-coach small{display:none}.klotski-reason{position:fixed;z-index:8;top:84px;left:50%;transform:translateX(-50%);width:min(520px,calc(100% - 24px));padding:10px 14px;background:#fff5e3f5;color:#503d32;border:1px solid #bb7564;border-left:5px solid #bb7564;border-radius:8px;font:600 14px/1.5 Inter,'Microsoft YaHei',sans-serif;pointer-events:none}.klotski-reason[hidden]{display:none}";
document.head.appendChild(klotskiHelpStyle);
const klotskiCourseHud=document.createElement("section");
klotskiCourseHud.className="klotski-course-hud";
klotskiCourseHud.innerHTML='<div class="course-heading"><span data-course-chapter></span><span data-course-progress></span></div><h2 data-course-title></h2><p data-course-purpose></p><div class="course-seals" aria-label="本关闯庭进展"></div>';
document.body.appendChild(klotskiCourseHud);
const klotskiRemakeStyle=document.createElement("style");
klotskiRemakeStyle.textContent="body[data-template=klotski]{background:#182f32}body[data-template=klotski] .klotski-course-hud{position:fixed;z-index:7;top:84px;left:50%;transform:translateX(-50%);width:min(510px,calc(100% - 28px));color:#f6ead2;pointer-events:none}.course-heading{display:flex;justify-content:space-between;font:600 11px/1.3 Inter,sans-serif;letter-spacing:1px;color:#c9b88e}.klotski-course-hud h2{font:700 26px/1.15 'Microsoft YaHei',sans-serif;margin:7px 0}.klotski-course-hud p{margin:0;font:500 12px/1.45 'Microsoft YaHei',sans-serif;color:#ddd5bd}.course-seals{display:flex;gap:6px;margin-top:10px}.course-seals span{flex:1;height:6px;border-radius:3px;background:#5d6d64}.course-seals span.is-cleared{background:#d3b570}.course-seals span.is-current{background:#f1e5b7;box-shadow:0 0 8px #e4c88688}.klotski-reason{top:auto;bottom:116px;width:min(510px,calc(100% - 28px));font-size:12px;border-left-color:#c49651}body[data-template=klotski] .onboarding-coach{bottom:116px}body[data-template=klotski] .game-overlay{border-radius:20px;border:1px solid #cfb787;background:#f5edda;color:#283e38}body[data-template=klotski] .game-overlay h2{font-family:'Microsoft YaHei',sans-serif}.klotski-course-result{margin:12px 0;padding:14px;background:#1e3d39;color:#f8edcf;border-radius:14px;font-size:14px;line-height:1.6}.klotski-course-result strong{font-size:22px;display:block;color:#f4d68d}body[data-template=klotski]:not([data-game-state=playing]) .klotski-course-hud{display:none}body[data-template=klotski] .game-panel .status{display:none}";
document.head.appendChild(klotskiRemakeStyle);
klotskiCourseHud.appendChild(klotskiReasonCard);
const klotskiAnchorStyle=document.createElement("style");
klotskiAnchorStyle.textContent="body[data-template=klotski] .onboarding-coach{position:fixed;right:auto;bottom:auto;transform:translateX(-50%)}.klotski-course-hud .klotski-reason{position:static;transform:none;width:100%;margin-top:6px;padding:7px 10px;line-height:1.4}.klotski-course-hud:has(.klotski-reason:not([hidden])) [data-course-purpose],.klotski-course-hud:has(.klotski-reason:not([hidden])) .course-seals{display:none}";
document.head.appendChild(klotskiAnchorStyle);
klotskiAnchorStyle.textContent+="body[data-template=klotski]:not([data-game-state=playing]) .onboarding-coach{display:none}";
let klotskiAnchorKey="";
function syncKlotskiAnchors(){
  const key=[innerWidth,innerHeight,gameSessionState,onboardingState.status].join("/");
  if(key===klotskiAnchorKey)return;klotskiAnchorKey=key;
  const rect=canvas.getBoundingClientRect(),layout=klotskiLayout();
  const center=rect.x+rect.width/2,width=Math.min(510,rect.width-28);
  klotskiCourseHud.style.left=center+"px";klotskiCourseHud.style.width=width+"px";klotskiCourseHud.style.top=(rect.y+12)+"px";
  if(onboardingCoach){
    onboardingCoach.style.left=center+"px";onboardingCoach.style.width=(onboardingState.status==="active"?rect.width-20:Math.min(190,rect.width-20))+"px";
    const bottom=rect.y+(gameSceneTop()+layout.originY+layout.cell*5)/canvas.height*rect.height;
    const height=onboardingCoach.getBoundingClientRect().height;
    onboardingCoach.style.top=Math.max(bottom+14,Math.min(bottom+24,Math.min(rect.bottom-4,innerHeight-92)-height))+"px";
  }
}
function syncKlotskiCourseHud(){
  const course=currentKlotskiCourse();
  klotskiCourseHud.querySelector("[data-course-chapter]").textContent="朱门行旅 · 第 "+currentCampaignLevel().number+" 关";
  const role=klotskiRoomIndex===0?"入门":klotskiRoomIndex===course.boards.length-1?"综合":"变式";
  klotskiCourseHud.querySelector("[data-course-progress]").textContent=role+" · "+(klotskiRoomIndex+1)+" / "+course.boards.length+" 庭 · "+moves+" 步";
  klotskiCourseHud.querySelector("[data-course-title]").textContent=course.name;
  klotskiCourseHud.querySelector("[data-course-purpose]").textContent=course.intro;
  const seals=klotskiCourseHud.querySelector(".course-seals");seals.replaceChildren();
  course.boards.forEach((_,index)=>{const seal=document.createElement("span");seal.className=index<klotskiRoomIndex?"is-cleared":index===klotskiRoomIndex?"is-current":"";seal.setAttribute("aria-label","第 "+(index+1)+" 庭"+(index<klotskiRoomIndex?"已完成":index===klotskiRoomIndex?"进行中":"待解"));seals.appendChild(seal);});
}
function completeKlotskiRoom(){
  if(klotskiRoomHandoff)return;
  klotskiRoomHandoff=true;
  const totals=klotskiCourseTotals(),course=currentKlotskiCourse();
  klotskiRoomResults.push({path:replayPath.map(move=>({...move})),hints:klotskiRoomHints,undos:klotskiRoomUndo});
  if(klotskiRoomIndex+1<course.boards.length){
    klotskiRoomIndex+=1;klotskiRoomHints=0;klotskiRoomUndo=0;
    resetPieces();persistKlotskiSession();syncKlotskiCourseHud();playSound("reward");
    setStatus("一庭已通 · 继续第 "+(klotskiRoomIndex+1)+" 庭。"+course.intro);
  }else{
    const independentRooms=klotskiRoomResults.filter(result=>result.hints===0).length;
    const bestKey=config.campaignStorageKey+":klotski-course-best:v2:"+currentCampaignLevel().number;
    let previous=null;try{previous=JSON.parse(safeStorage.getItem(bestKey)||"null");}catch{}
    const improved=previous&&Number.isFinite(previous.moves)?Math.max(0,previous.moves-totals.moves):0;
    safeStorage.setItem(bestKey,JSON.stringify({moves:Math.min(previous?.moves??Infinity,totals.moves),independent:Math.max(previous?.independent??0,independentRooms)}));
    klotskiResultSummary={...totals,independentRooms,rooms:course.boards.length,seconds:Math.round(klotskiMissionMs/1000)};
    clearKlotskiSession();running=false;
    showResult(true,"一庭一印 · "+course.name,"完成 "+course.boards.length+" 庭连续练习，共 "+totals.moves+" 步。"+(improved?"比自己的最佳纪录少 "+improved+" 步。":"下次可以尝试更少提示或更短路线。"));
    const card=document.createElement("section");card.className="klotski-course-result";
    const headline=document.createElement("strong");headline.textContent=course.boards.length+" 庭全通 · "+course.skill;
    const detail=document.createElement("div");detail.textContent=independentRooms+" 庭独立解开 · 使用 "+totals.hints+" 次提示 · 有效游玩 "+Math.floor(klotskiMissionMs/60000)+" 分 "+Math.round(klotskiMissionMs/1000)%60+" 秒";
    card.append(headline,detail);(overlay.querySelector(".victory-summary")||overlay).appendChild(card);
  }
  klotskiRoomHandoff=false;
}

function klotskiLayout() {
  const cell = config.aspectRatio === "9:16" ? 144 : 112;
  return {
    cell,
    originX: (720 - cell * 4) / 2,
    originY: (gameSceneHeight() - cell * 5) / 2 - 24,
  };
}

function occupiedBy(piece, x, y) {
  return x >= piece.x && x < piece.x + piece.w && y >= piece.y && y < piece.y + piece.h;
}

function canMove(piece, dx, dy) {
  const next = { ...piece, x: piece.x + dx, y: piece.y + dy };
  if (next.x < 0 || next.y < 0 || next.x + next.w > 4 || next.y + next.h > 5) return false;
  return !pieces.some((other) => other.id !== piece.id &&
    next.x < other.x + other.w && next.x + next.w > other.x && next.y < other.y + other.h && next.y + next.h > other.y);
}

function klotskiStateKey(state) {
  return state.map((piece) => [piece.kind, piece.w, piece.h, piece.x, piece.y].join(":" )).sort().join("|");
}

function klotskiStateCanMove(state, piece, dx, dy) {
  const nextX = piece.x + dx;
  const nextY = piece.y + dy;
  if (nextX < 0 || nextY < 0 || nextX + piece.w > 4 || nextY + piece.h > 5) return false;
  return !state.some((other) => other.id !== piece.id && nextX < other.x + other.w && nextX + piece.w > other.x && nextY < other.y + other.h && nextY + piece.h > other.y);
}

function solveKlotski(source = pieces, budget = 80000) {
  const start = source.map(({ id, kind, w, h, x, y }) => ({ id, kind, w, h, x, y }));
  const startKey = klotskiStateKey(start);
  const queue = [start];
  const parents = new Map([[startKey, null]]);
  const parentMoves = new Map();
  let goalKey = null;
  let visited = 0;
  for (let cursor = 0; cursor < queue.length && cursor < budget; cursor += 1) {
    visited += 1;
    const state = queue[cursor];
    const stateKey = klotskiStateKey(state);
    const hero = state.find((piece) => piece.id === "cao");
    if (hero?.x === 1 && hero?.y === 3) { goalKey = stateKey; break; }
    for (const piece of state) for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      if (!klotskiStateCanMove(state, piece, dx, dy)) continue;
      const next = state.map((item) => item.id === piece.id ? { ...item, x: item.x + dx, y: item.y + dy } : { ...item });
      const nextKey = klotskiStateKey(next);
      if (parents.has(nextKey)) continue;
      parents.set(nextKey, stateKey);
      parentMoves.set(nextKey, { id: piece.id, dx, dy });
      queue.push(next);
    }
  }
  if (!goalKey) return {status:visited < queue.length ? "budget-exhausted" : "unsolvable",first:null,distance:null,visited};
  let cursorKey = goalKey;
  let first = null;
  let distance = 0;
  while (parents.get(cursorKey)) {
    first = parentMoves.get(cursorKey);
    cursorKey = parents.get(cursorKey);
    distance += 1;
  }
  return { status:"solved", first, distance, visited };
}

function explainKlotskiMove(state, move) {
  const piece=state.find(item=>item.id===move.id);
  if(!piece || !klotskiStateCanMove(state,piece,move.dx,move.dy))return "";
  const after=state.map(item=>item.id===piece.id?{...item,x:item.x+move.dx,y:item.y+move.dy}:item);
  const directions=[[-1,0,"左"],[1,0,"右"],[0,-1,"上"],[0,1,"下"]];
  const unlocked=[];
  for(const other of state)if(other.id!==piece.id)for(const [dx,dy,label] of directions){
    if(!klotskiStateCanMove(state,other,dx,dy)&&klotskiStateCanMove(after,other,dx,dy))unlocked.push(other.label+"可向"+label);
  }
  const freed=move.dx?piece.h:piece.w;
  return unlocked.length?"让路后，"+[...new Set(unlocked)].slice(0,2).join("、")+"。":"这一步释放 "+freed+" 格，继续调整空位；是已验证最短路径中的一步。";
}

function requestKlotskiHint() {
  if (!running || moveAnimation || replaying) return;
  const signature=pieces.map(piece=>piece.id+":"+piece.x+","+piece.y).join("|");
  if(signature===klotskiHintSignature&&klotskiHintStage===2){klotskiReasonCard.hidden=false;return;}
  const solution = signature===klotskiHintSignature&&klotskiHint ? {status:"solved",first:klotskiHint,distance:klotskiHintDistance} : solveKlotski();
  klotskiHint = solution?.first ?? null;
  klotskiHintDistance = solution?.distance ?? null;
  if (!klotskiHint) { const message=solution.status==="budget-exhausted"?"局面较复杂，本次搜索尚未找到完整解法；这不表示无解，可继续尝试或撤销。":solution.status==="solved"?"队长已到出口。":"已检查可达局面，未找到出口路径；可撤销后重试。";setStatus(message);klotskiReasonCard.textContent=message;klotskiReasonCard.hidden=false;return; }
  if(signature!==klotskiHintSignature){klotskiHintSignature=signature;klotskiHintStage=1;klotskiRoomHints+=1;persistKlotskiSession();
    const piece=pieces.find(item=>item.id===klotskiHint.id);
    selectedId=piece.id;selectedAt=performance.now();
    klotskiHintReason="观察“"+piece.label+"”周围的空位。"+currentKlotskiCourse().intro;
    klotskiReasonCard.textContent=klotskiHintReason+" 再点提示查看一步建议。";klotskiReasonCard.hidden=false;setStatus(klotskiHintReason);return;}
  klotskiHintStage=2;
  selectedId = klotskiHint.id;
  selectedAt = performance.now();
  const arrows = { "-1,0": "左", "1,0": "右", "0,-1": "上", "0,1": "下" };
  const piece = pieces.find((candidate) => candidate.id === klotskiHint.id);
  klotskiHintReason=explainKlotskiMove(pieces,klotskiHint);
  setStatus("拖动“" + piece.label + "”向" + arrows[klotskiHint.dx + "," + klotskiHint.dy] + "一格。"+klotskiHintReason+" 当前最短剩余 "+klotskiHintDistance+" 步。");
  klotskiReasonCard.textContent="拖动“"+piece.label+"”向"+arrows[klotskiHint.dx+","+klotskiHint.dy]+"一格。"+klotskiHintReason+" 剩余最短 "+klotskiHintDistance+" 步。";
  klotskiReasonCard.hidden=false;
  spawnParticles(piece, "select", 10);
}

function pieceCenter(piece, x = piece.renderX, y = piece.renderY) {
  const { cell, originX, originY } = klotskiLayout();
  return {
    x: originX + (x + piece.w / 2) * cell,
    y: originY + (y + piece.h / 2) * cell,
  };
}

function spawnParticles(piece, type, count = 8) {
  const center = pieceCenter(piece);
  for (let index = 0; index < count; index += 1) {
    const angle = Math.PI * 2 * index / count + Math.random() * .35;
    const speed = type === "victory" ? 2.2 + Math.random() * 3.2 : .7 + Math.random() * 1.8;
    particles.push({
      x: center.x,
      y: center.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (type === "victory" ? 1.8 : .3),
      life: type === "victory" ? 72 + Math.random() * 32 : 34 + Math.random() * 22,
      maxLife: type === "victory" ? 104 : 56,
      size: type === "victory" ? 18 + Math.random() * 18 : 12 + Math.random() * 14,
      tone: index % 3,
    });
  }
}

function validMoves(piece) {
  return [
    { dx: -1, dy: 0, symbol: "←" },
    { dx: 1, dy: 0, symbol: "→" },
    { dx: 0, dy: -1, symbol: "↑" },
    { dx: 0, dy: 1, symbol: "↓" },
  ].filter((direction) => canMove(piece, direction.dx, direction.dy));
}

function snapshotKlotski() {
  return pieces.map(({ id, x, y }) => ({ id, x, y }));
}

function rebuildKlotskiPath(initial, path) {
  if(!Array.isArray(path)||path.length>2000)return null;
  let state=initial.map(piece=>({...piece}));
  const history=[];
  for(const move of path){
    if(!move||!Number.isInteger(move.dx)||!Number.isInteger(move.dy)||Math.abs(move.dx)+Math.abs(move.dy)!==1)return null;
    const piece=state.find(item=>item.id===move.id);
    if(!piece||!klotskiStateCanMove(state,piece,move.dx,move.dy))return null;
    history.push({snapshot:state.map(({id,x,y})=>({id,x,y})),selectedId:move.id});
    state=state.map(item=>item.id===move.id?{...item,x:item.x+move.dx,y:item.y+move.dy}:item);
  }
  return {state,history};
}
function klotskiSessionKey(){return config.campaignStorageKey+":klotski-curriculum:v2:"+currentCampaignLevel().number;}
function clearKlotskiSession(){safeStorage.removeItem(klotskiSessionKey());}
function persistKlotskiSession(){
  if(replaying||exitOpen)return;
  safeStorage.setItem(klotskiSessionKey(),JSON.stringify({schemaVersion:2,room:klotskiRoomIndex,results:klotskiRoomResults,activeMs:klotskiMissionMs,hints:klotskiRoomHints,undos:klotskiRoomUndo,path:replayPath,redo:klotskiRedo.map(entry=>entry.replayMove),selectedId}));
}
function restoreKlotskiSession(){
  try{
    const saved=JSON.parse(safeStorage.getItem(klotskiSessionKey())||"null");
    if(saved?.schemaVersion!==2||!Number.isInteger(saved.room)||saved.room<0||saved.room>=currentKlotskiCourse().boards.length||!Array.isArray(saved.results)||saved.results.length!==saved.room)return;
    for(let i=0;i<saved.results.length;i++){
      const result=saved.results[i],proof=rebuildKlotskiPath(createCampaignKlotskiPieces(i),result.path);
      if(!proof||!proof.state.some(piece=>piece.id==="cao"&&piece.x===1&&piece.y===3)||!Number.isInteger(result.hints)||result.hints<0)return;
    }
    klotskiRoomIndex=saved.room;
    const restored=rebuildKlotskiPath(createCampaignKlotskiPieces(),saved.path);
    if(!restored||restored.state.some(piece=>piece.id==="cao"&&piece.x===1&&piece.y===3))return;
    const redo=[];
    let future=restored.state;
    if(!Array.isArray(saved.redo)||saved.redo.length>2000)return;
    for(const move of [...saved.redo].reverse()){
      const step=rebuildKlotskiPath(future,[move]);if(!step)return;future=step.state;
      redo.push({snapshot:future.map(({id,x,y})=>({id,x,y})),selectedId:move.id,replayMove:{...move}});
    }
    pieces=restored.state.map(piece=>({...piece,renderX:piece.x,renderY:piece.y}));
    klotskiHistory=restored.history;replayPath=saved.path.map(move=>({...move}));klotskiRedo=redo.reverse();
    moves=replayPath.length;selectedId=pieces.some(piece=>piece.id===saved.selectedId)?saved.selectedId:"cao";klotskiRestored=true;
    klotskiRoomResults=saved.results;klotskiMissionMs=Number.isFinite(saved.activeMs)?Math.max(0,saved.activeMs):0;
    klotskiRoomHints=Number.isInteger(saved.hints)?Math.max(0,saved.hints):0;klotskiRoomUndo=Number.isInteger(saved.undos)?Math.max(0,saved.undos):0;
    optimalReference=activeKlotskiBlueprint()[1];initialLayoutSnapshot=createCampaignKlotskiPieces().map(({id,x,y})=>({id,x,y}));
  }catch{}
}

function restoreKlotski(snapshot) {
  klotskiHintStage=0;klotskiHintSignature="";
  klotskiReasonCard.hidden=true;
  klotskiHint=null;klotskiHintDistance=null;klotskiHintReason="";
  snapshot.forEach((saved) => {
    const piece = pieces.find((candidate) => candidate.id === saved.id);
    if (!piece) return;
    piece.x = saved.x; piece.y = saved.y; piece.renderX = saved.x; piece.renderY = saved.y;
  });
  moveAnimation = null;
  exitOpen = false;
  winAt = 0;
}

function undoKlotskiMove() {
  if (!running || moveAnimation || replaying || !klotskiHistory.length) return;
  const last = klotskiHistory.pop();
  klotskiRoomUndo += 1;
  const replayMove = replayPath.pop() ?? null;
  klotskiRedo.push({ snapshot: snapshotKlotski(), selectedId, replayMove });
  restoreKlotski(last.snapshot);
  moves = Math.max(0, moves - 1);
  selectedId = last.selectedId;
  selectedAt = performance.now();
  setMetric(String(moves));syncKlotskiCourseHud();
  persistKlotskiSession();
  setStatus("已撤销一步 · 当前 " + moves + " 步 · 最优 " + optimalReference + " 步。 ");
  playSound("move");
}

function redoKlotskiMove() {
  if (!running || moveAnimation || replaying || !klotskiRedo.length) return;
  const next = klotskiRedo.pop();
  klotskiHistory.push({ snapshot: snapshotKlotski(), selectedId });
  restoreKlotski(next.snapshot);
  if (next.replayMove) replayPath.push(next.replayMove);
  selectedId = next.selectedId;
  selectedAt = performance.now();
  moves += 1;
  setMetric(String(moves));
  const hero=pieces.find(piece=>piece.id==="cao");
  if(hero.x===1&&hero.y===3)completeMove({piece:hero,toX:hero.x,toY:hero.y});
  else persistKlotskiSession();
  setStatus("已重做一步 · 当前 " + moves + " 步 · 最优 " + optimalReference + " 步。 ");
  playSound("move");
}

async function replayKlotskiMoves() {
  if (!running || moveAnimation || replaying || !replayPath.length) return;
  const path = replayPath.map((move) => ({ ...move }));
  const epoch=++klotskiEpoch;
  replaying = true;
  restoreKlotski(initialLayoutSnapshot);
  moves = 0;
  klotskiHistory = [];
  setMetric("0");
  setStatus("正在回放 " + path.length + " 步操作……");
  for (const move of path) {
    if(epoch!==klotskiEpoch||!running)return;
    selectedId = move.id;
    moveSelected(move.dx, move.dy, true);
    await new Promise((resolve) => setTimeout(resolve, 245));
  }
  if(epoch!==klotskiEpoch||!running)return;
  replayPath = path;
  replaying = false;
  persistKlotskiSession();
  setStatus("回放完成 · 可继续操作或撤销。 ");
}

function moveSelected(dx, dy, fromReplay = false, preserveRedo = false) {
  if (!running || moveAnimation || (replaying&&!fromReplay)) return false;
  const piece = pieces.find((candidate) => candidate.id === selectedId);
  if (!piece || !canMove(piece, dx, dy)) {
    blockedUntil = performance.now() + 280;
    if (piece) spawnParticles(piece, "blocked", 6);
    setStatus("这条方向被挡住了；发光箭头表示当前可以移动的位置。");
    playSound("fail");
    return false;
  }
  const fromX = piece.renderX;
  const fromY = piece.renderY;
  klotskiHintStage=0;klotskiHintSignature="";
  klotskiFreedCells=[];
  for(let y=piece.y;y<piece.y+piece.h;y++)for(let x=piece.x;x<piece.x+piece.w;x++)if(x<piece.x+dx||x>=piece.x+dx+piece.w||y<piece.y+dy||y>=piece.y+dy+piece.h)klotskiFreedCells.push({x,y});
  klotskiFreedUntil=performance.now()+800;
  klotskiHint = null;
  klotskiHintDistance = null;
  klotskiHintReason = "";
  klotskiReasonCard.hidden=true;
  if (!fromReplay) {
    if (!preserveRedo) klotskiRedo = [];
    klotskiHistory.push({ snapshot: snapshotKlotski(), selectedId });
    replayPath.push({ id: piece.id, dx, dy });
  } else klotskiHistory.push({ snapshot: snapshotKlotski(), selectedId });
  piece.x += dx;
  piece.y += dy;
  moveAnimation = {
    piece,
    fromX,
    fromY,
    toX: piece.x,
    toY: piece.y,
    startedAt: performance.now(),
    duration: 210,
  };
  moves += 1;
  syncKlotskiCourseHud();
  setMetric(String(moves));
  setStatus("正在移动“" + piece.label + "”；目标是让队长机器人抵达发光出口。");
  spawnParticles(piece, "move", 5);
  playSound("move");
  if (!fromReplay) signalOnboarding("block-moved");
  return true;
}

function completeMove(animation) {
  animation.piece.renderX = animation.toX;
  animation.piece.renderY = animation.toY;
  moveAnimation = null;
  selectedAt = performance.now();
  if (animation.piece.id === "cao" && animation.piece.x === 1 && animation.piece.y === 3) {
    exitOpen = true;
    winAt = performance.now() + 780;
    spawnParticles(animation.piece, "victory", 30);
    setStatus("朱门已经开启，队长机器人正在穿过出口……");
  } else {
    persistKlotskiSession();
    setStatus("已移动“" + animation.piece.label + "”；继续利用发光方向提示腾出出口。");
  }
}

function updateKlotskiEffects(timestamp) {
  if (moveAnimation) {
    const progress = Math.min(1, (timestamp - moveAnimation.startedAt) / moveAnimation.duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    moveAnimation.piece.renderX = moveAnimation.fromX + (moveAnimation.toX - moveAnimation.fromX) * eased;
    moveAnimation.piece.renderY = moveAnimation.fromY + (moveAnimation.toY - moveAnimation.fromY) * eased;
    if (progress >= 1) completeMove(moveAnimation);
  }
  particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += .035;
    particle.life -= 1;
  });
  particles = particles.filter((particle) => particle.life > 0);
  if (winAt && timestamp >= winAt) {
    winAt = 0;
    completeKlotskiRoom();
  }
}

function drawCourtyard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#182f32";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (courtyardArt.complete && courtyardArt.naturalWidth) {
    ctx.save();
    ctx.globalAlpha=.17;drawImageCover(courtyardArt, 0, 0, canvas.width, canvas.height);ctx.globalAlpha=1;
    ctx.fillStyle = "rgba(24,47,50,.48)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

function drawExit(originX, originY, cell, timestamp) {
  const pulse = .5 + Math.sin(timestamp / 230) * .22;
  const exitX = originX + cell;
  const exitY = originY + cell * 5 - 24;
  ctx.save();
  const glow = ctx.createRadialGradient(exitX + cell, exitY + 14, 12, exitX + cell, exitY + 14, cell * 1.3);
  glow.addColorStop(0, exitOpen ? "rgba(255,244,172,.95)" : "rgba(255,115,103," + pulse + ")");
  glow.addColorStop(1, "rgba(255,115,103,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(exitX - cell * .5, exitY - cell * .6, cell * 3, cell * 1.4);
  drawBitmapSprite(7, exitX, exitY - 2, cell * 2, 44, { fallback: palette.secondary, radius: 14, padding: 8, alpha: exitOpen ? 1 : .9 });
  ctx.font="700 20px 'Microsoft YaHei',sans-serif";ctx.textAlign="center";ctx.fillStyle="#713f33";ctx.fillText("朱门 · 出口",originX+cell*2,originY+cell*5+15);
  ctx.restore();
}

function drawMoveGuides(piece, originX, originY, cell, timestamp) {
  if (!running || moveAnimation || exitOpen) return;
  const guideStrength = currentCampaignLevel().tier >= 4 ? .46 : currentCampaignLevel().tier >= 3 ? .58 : .68;
  const pulse = guideStrength + Math.sin(timestamp / 180) * .16;
  ctx.save();
  ctx.font = "700 22px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  validMoves(piece).forEach((direction) => {
    const x = originX + (piece.x + piece.w / 2 + direction.dx * (piece.w / 2 + .22)) * cell;
    const y = originY + (piece.y + piece.h / 2 + direction.dy * (piece.h / 2 + .22)) * cell;
    ctx.beginPath();
    ctx.arc(x, y, 19 + pulse * 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,228,128," + pulse + ")";
    ctx.fill();
    ctx.fillStyle = "#5d3b3e";
    ctx.fillText(direction.symbol, x, y + 1);
  });
  ctx.restore();
}

function pieceSprite(piece) {
  if (piece.kind === "hero") return 0;
  if (piece.kind === "guard") return piece.w > piece.h ? 3 : (Number(piece.id.slice(-1)) % 2 ? 1 : 2);
  return piece.id.charCodeAt(piece.id.length - 1) % 2 ? 4 : 5;
}

function pieceScale(piece) {
  if (piece.kind === "hero") return .94;
  if (piece.kind === "soldier") return .92;
  if (piece.w > piece.h) return .94;
  return .96;
}

function pieceSourceRect(piece) {
  const sprite = pieceSprite(piece);
  if (sprite === 3) return { x: .08, y: .3, width: .84, height: .66 };
  if (sprite === 4 || sprite === 5) return { x: .17, y: .32, width: .66, height: .64 };
  return null;
}

function pieceFrameTone(piece) {
  if (piece.kind === "hero") return { fill: "#fff3d5", stroke: "#8f3d43" };
  const sprite = pieceSprite(piece);
  if (sprite === 1) return { fill: "#e5f5ff", stroke: "#2d759c" };
  if (sprite === 2) return { fill: "#fff0e9", stroke: "#b65751" };
  if (sprite === 3) return { fill: "#fff7d7", stroke: "#a96f1e" };
  if (sprite === 4) return { fill: "#f3eaff", stroke: "#765b91" };
  return { fill: "#fff0e8", stroke: "#a85e55" };
}

function drawBoardGrid(originX, originY, cell) {
  ctx.save();
  for(let y=0;y<5;y++)for(let x=0;x<4;x++){
    if(pieces.some(piece=>occupiedBy(piece,x,y)))continue;
    const freed=performance.now()<klotskiFreedUntil&&klotskiFreedCells.some(point=>point.x===x&&point.y===y);
    ctx.fillStyle=freed?"rgba(91,185,156,.48)":"rgba(62,113,95,.12)";ctx.fillRect(originX+x*cell+5,originY+y*cell+5,cell-10,cell-10);
    ctx.strokeStyle=freed?"#408772":"rgba(73,113,95,.48)";ctx.lineWidth=2;ctx.setLineDash([7,7]);ctx.strokeRect(originX+x*cell+15,originY+y*cell+15,cell-30,cell-30);ctx.setLineDash([]);
  }
  ctx.strokeStyle = "rgba(105,55,58,.24)";
  ctx.lineWidth = 2;
  for (let column = 0; column <= 4; column += 1) {
    ctx.beginPath();
    ctx.moveTo(originX + column * cell, originY);
    ctx.lineTo(originX + column * cell, originY + cell * 5);
    ctx.stroke();
  }
  for (let row = 0; row <= 5; row += 1) {
    ctx.beginPath();
    ctx.moveTo(originX, originY + row * cell);
    ctx.lineTo(originX + cell * 4, originY + row * cell);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPiece(piece, originX, originY, cell, timestamp) {
  const inset = 5;
  let x = originX + piece.renderX * cell + inset;
  let y = originY + piece.renderY * cell + inset;
  const width = piece.w * cell - inset * 2;
  const height = piece.h * cell - inset * 2;
  const selected = piece.id === selectedId;
  const frame = pieceFrameTone(piece);
  if (selected && !moveAnimation) y -= Math.sin((timestamp - selectedAt) / 170) * 2.5;
  if (selected && timestamp < blockedUntil) x += Math.sin((blockedUntil - timestamp) * .16) * 8;
  ctx.save();
  ctx.fillStyle = "rgba(53,27,35,.26)";
  ctx.beginPath();
  ctx.roundRect(x + 5, y + 8, width, height, 18);
  ctx.fill();
  if (selected) {
    const glow = ctx.createRadialGradient(x + width / 2, y + height / 2, 12, x + width / 2, y + height / 2, Math.max(width, height) * .72);
    glow.addColorStop(0, "rgba(255,239,158,.5)");
    glow.addColorStop(1, "rgba(255,193,92,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 18, y - 18, width + 36, height + 36);
  }
  ctx.fillStyle = frame.fill;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, Math.min(20, styleProfile.corner || 14));
  ctx.fill();
  drawBitmapSprite(pieceSprite(piece), x, y, width, height, {
    fallback: frame.fill,
    radius: Math.min(20, styleProfile.corner || 14),
    padding: 7,
    scale: pieceScale(piece),
    sourceRect: pieceSourceRect(piece),
  });
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, width - 4, height - 4, Math.min(18, styleProfile.corner || 12));
  ctx.strokeStyle = selected ? "#ffbf38" : "rgba(82,45,49,.92)";
  ctx.lineWidth = selected ? 5 : 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x + 8, y + 8, width - 16, height - 16, Math.min(14, styleProfile.corner || 10));
  ctx.strokeStyle = selected ? "rgba(255,255,232,.96)" : frame.stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawParticles() {
  particles.forEach((particle) => {
    const alpha = Math.min(1, particle.life / Math.max(1, particle.maxLife * .45));
    const sprite = particle.tone === 0 ? 8 : particle.tone === 1 ? 6 : 7;
    drawBitmapSprite(sprite, particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size, {
      fallback: particle.tone === 0 ? "#fff0c4" : particle.tone === 1 ? "#ff8d7c" : "#8de0d0",
      circle: true,
      padding: 12,
      alpha,
      rotation: particle.x * .01,
    });
  });
}

function drawKlotski(timestamp = performance.now()) {
  drawCourtyard();
  ctx.save();
  ctx.translate(0, gameSceneTop());
  const { cell, originX, originY } = klotskiLayout();
  drawPlayfield(originX - 22, originY - 22, cell * 4 + 44, cell * 5 + 44, {
    radius: 34,
    alpha: 1,
    fill: "#efe6cc",
    stroke: "#bca575",
    lineWidth: 5,
  });
  drawBoardGrid(originX, originY, cell);
  drawExit(originX, originY, cell, timestamp);
  const selectedPiece = pieces.find((piece) => piece.id === selectedId);
  if (selectedPiece) drawMoveGuides(selectedPiece, originX, originY, cell, timestamp);
  pieces.forEach((piece) => drawPiece(piece, originX, originY, cell, timestamp));
  drawParticles();
  ctx.restore();
  finishCanvasStyle();
}

function animationLoop(timestamp) {
  if(klotskiClockAt&&running&&!onboardingIsActive()&&!replaying&&!exitOpen&&!document.hidden)klotskiMissionMs+=Math.max(0,Math.min(100,timestamp-klotskiClockAt));
  klotskiClockAt=timestamp;
  updateKlotskiEffects(timestamp);
  drawKlotski(timestamp);
  syncKlotskiAnchors();
  requestAnimationFrame(animationLoop);
}

let klotskiDrag = null;
let suppressKlotskiClick = false;
canvas.addEventListener("pointerdown", (event) => {
  if (!running || moveAnimation || replaying) return;
  klotskiEpoch += 1;
  const { x: px, y: py } = eventScenePoint(event);
  const { cell, originX, originY } = klotskiLayout();
  const gridX = Math.floor((px - originX) / cell);
  const gridY = Math.floor((py - originY) / cell);
  const piece = pieces.find((candidate) => occupiedBy(candidate, gridX, gridY));
  if (!piece) return;
  selectedId = piece.id;
  selectedAt = performance.now();
  klotskiDrag = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture?.(event.pointerId);
});

canvas.addEventListener("pointerup", async (event) => {
  if (!klotskiDrag || klotskiDrag.id !== event.pointerId) return;
  const drag = klotskiDrag;
  klotskiDrag = null;
  canvas.releasePointerCapture?.(event.pointerId);
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / Math.max(1, rect.width);
  const deltaX = (event.clientX - drag.x) * scale;
  const deltaY = (event.clientY - drag.y) * scale;
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) return;
  const horizontal = Math.abs(deltaX) >= Math.abs(deltaY);
  const dx = horizontal ? Math.sign(deltaX) : 0;
  const dy = horizontal ? 0 : Math.sign(deltaY);
  const distance = horizontal ? Math.abs(deltaX) : Math.abs(deltaY);
  const steps = Math.max(1, Math.min(4, Math.round(distance / klotskiLayout().cell)));
  suppressKlotskiClick = true;
  const epoch=klotskiEpoch;
  for (let index = 0; index < steps; index += 1) {
    if(epoch!==klotskiEpoch||!running)break;
    if (!moveSelected(dx, dy, false, index > 0)) break;
    await new Promise((resolve) => setTimeout(resolve, 220));
  }
  setTimeout(() => { suppressKlotskiClick = false; }, 0);
});
canvas.addEventListener("pointercancel", () => { klotskiDrag = null; });
canvas.addEventListener("lostpointercapture", () => { klotskiDrag = null; });

canvas.addEventListener("click", (event) => {
  if(!running||replaying)return;
  if (suppressKlotskiClick) return;
  if (moveAnimation) return;
  const { x: px, y: py } = eventScenePoint(event);
  const { cell, originX, originY } = klotskiLayout();
  const gridX = Math.floor((px - originX) / cell);
  const gridY = Math.floor((py - originY) / cell);
  const piece = pieces.find((candidate) => occupiedBy(candidate, gridX, gridY));
  if (piece) {
    selectedId = piece.id;
    selectedAt = performance.now();
    spawnParticles(piece, "select", 5);
    setStatus("已选择“" + piece.label + "”；发光箭头显示当前可以移动的方向。");
  }
});

function resetPieces() {
  klotskiHintStage=0;klotskiHintSignature="";klotskiFreedCells=[];
  klotskiReasonCard.hidden=true;
  klotskiEpoch += 1;
  klotskiRestored = false;
  resetCampaignRandom();
  pieces = createCampaignKlotskiPieces().map((piece) => ({ ...piece, renderX: piece.x, renderY: piece.y }));
  optimalReference = activeKlotskiBlueprint()[1];
  selectedId = "cao";
  moves = 0;
  moveAnimation = null;
  particles = [];
  blockedUntil = 0;
  exitOpen = false;
  winAt = 0;
  selectedAt = performance.now();
  klotskiHistory = [];
  klotskiRedo = [];
  replayPath = [];
  replaying = false;
  klotskiHint = null;
  klotskiHintDistance = null;
  initialLayoutSnapshot = snapshotKlotski();
}

function startGame() {
  klotskiRoomIndex=0;klotskiRoomResults=[];klotskiMissionMs=0;klotskiRoomHints=0;klotskiRoomUndo=0;klotskiResultSummary=null;
  resetPieces();
  restoreKlotskiSession();
  if(!klotskiRestored&&klotskiRoomIndex!==0){klotskiRoomIndex=0;resetPieces();}
  running = true;
  hideOverlay();
  setMetric(String(moves));
  setStatus((klotskiRestored?"已恢复 "+moves+" 步操作 · ":"")+"第 " + currentCampaignLevel().number + " 关 · " + activeKlotskiBlueprint()[0] + " · 最优 " + optimalReference + " 步；拖动棋子让队长机器人抵达出口。");
  startAmbient();
  syncKlotskiCourseHud();
}

restartCurrentGame=()=>{clearKlotskiSession();startGame();};
window.addEventListener("game:state-change",()=>{
  if(gameSessionState==="idle"){if(!klotskiResultSummary)persistKlotskiSession();klotskiEpoch+=1;replaying=false;moveAnimation=null;klotskiDrag=null;winAt=0;klotskiReasonCard.hidden=true;}
});

function handleControl(value) {
  const vectors = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  if (vectors[value]) moveSelected(vectors[value][0], vectors[value][1]);
  if (value === "undo") undoKlotskiMove();
  if (value === "redo") redoKlotskiMove();
  if (value === "hint") requestKlotskiHint();
  if (value === "replay") replayKlotskiMoves();
}

function handleKey(key) {
  const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", z: "undo", Z: "undo", y: "redo", Y: "redo", h: "hint", H: "hint", r: "replay", R: "replay" };
  if (map[key]) handleControl(map[key]);
}

resetPieces();
runtimeDebugState = () => {
  const layout = klotskiLayout();
  const dragEntry = pieces.map((piece) => ({ piece, move: validMoves(piece)[0] })).find((entry) => entry.move);
  const dragProbe = dragEntry ? {
    id: dragEntry.piece.id,
    from: { x: layout.originX + (dragEntry.piece.x + dragEntry.piece.w / 2) * layout.cell, y: layout.originY + (dragEntry.piece.y + dragEntry.piece.h / 2) * layout.cell },
    to: { x: layout.originX + (dragEntry.piece.x + dragEntry.piece.w / 2 + dragEntry.move.dx) * layout.cell, y: layout.originY + (dragEntry.piece.y + dragEntry.piece.h / 2 + dragEntry.move.dy) * layout.cell },
  } : null;
  const hintedPiece = klotskiHint ? pieces.find((piece) => piece.id === klotskiHint.id) : null;
  return { courseName:currentKlotskiCourse().name, courseRooms:currentKlotskiCourse().boards.length, roomIndex:klotskiRoomIndex, roomResults:klotskiRoomResults.map(result=>({moves:result.path.length,hints:result.hints})), totalMoves:(klotskiResultSummary||klotskiCourseTotals()).moves, totalOptimal:(klotskiResultSummary||klotskiCourseTotals()).optimal, independentRooms:klotskiResultSummary?.independentRooms||0, activeMs:klotskiMissionMs, hintStage:klotskiHintStage, restored:klotskiRestored, hintReason:klotskiHintReason, level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, blueprintName: activeKlotskiBlueprint()[0], layoutCount: klotskiBlueprints.length + klotskiPracticeLayouts.length, uniqueBlueprints: new Set([...klotskiBlueprints.map((item) => JSON.stringify(item[2])),...klotskiPracticeLayouts.map(item=>JSON.stringify(item.points))]).size, moves, canUndo: klotskiHistory.length > 0, canRedo: klotskiRedo.length > 0, replayLength: replayPath.length, replaying, optimalReference, optimalExact: Number.isInteger(optimalReference), transitionMs: 210, directDrag: true, dragProbe, canvasSize: { width: canvas.width, height: canvas.height }, hint: klotskiHint, hintDistance: klotskiHintDistance, hintLegal: Boolean(hintedPiece && klotskiStateCanMove(pieces, hintedPiece, klotskiHint.dx, klotskiHint.dy)), boardWidthRatio: Number(((layout.cell * 4 + 44) / 720 * 100).toFixed(1)), identityUsesShapeAndBitmap: true, pieceGap: 10, pieceOutlineWidth: 2, selectedOutlineWidth: 5, incompleteArtIsCropped: true, pieceState: pieces.map(({ id, x, y }) => ({ id, x, y })) };
};
runtimeDebugActions = {
  courseMoveProbe(){
    const solution=solveKlotski();if(!solution.first)return null;
    const piece=pieces.find(item=>item.id===solution.first.id),layout=klotskiLayout();
    return {move:solution.first,from:{x:layout.originX+(piece.x+piece.w/2)*layout.cell,y:gameSceneTop()+layout.originY+(piece.y+piece.h/2)*layout.cell},to:{x:layout.originX+(piece.x+piece.w/2+solution.first.dx)*layout.cell,y:gameSceneTop()+layout.originY+(piece.y+piece.h/2+solution.first.dy)*layout.cell},room:klotskiRoomIndex,distance:solution.distance};
  },
  undo: undoKlotskiMove,
  redo: redoKlotskiMove,
  hint: requestKlotskiHint,
  replay: replayKlotskiMoves,
  legalMove() {
    const movable = pieces.map((piece) => ({ piece, moves: validMoves(piece) })).find((entry) => entry.moves.length);
    if (!movable) return false;
    selectedId = movable.piece.id;
    moveSelected(movable.moves[0].dx, movable.moves[0].dy);
    return true;
  },
};
requestAnimationFrame(animationLoop);
`;
