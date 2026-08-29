export const mazeScript = String.raw`
const mazeBlueprints = [
  ["初识苔门","辨路入庭","moss-gate",9,15,5,0,0,0,0],["双岔寻星","辨路入庭","twin-fork",9,15,6,0,0,0,0],
  ["回廊试步","辨路入庭","first-loop",9,17,7,0,0,0,0],["四隅辨向","辨路入庭","four-corners",11,17,8,0,0,0,0],
  ["萤灯支路","灯火探径","lantern-branch",11,17,8,0,0,0,0],["月桥回环","灯火探径","moon-bridge",11,19,9,0,0,0,0],
  ["双庭择路","灯火探径","twin-courts",11,19,10,0,0,0,0],["藏灯深巷","灯火探径","hidden-lanterns",13,19,11,0,0,0,0],
  ["薄雾初临","雾庭记忆","light-fog",11,19,10,4,0,0,0],["灯影留痕","雾庭记忆","fog-trail",13,19,11,4,0,0,0],
  ["雾中双环","雾庭记忆","fog-rings",13,21,12,3,0,0,0],["暗庭寻星","雾庭记忆","dark-garden",13,21,13,3,0,0,0],
  ["霜径试滑","冰苔机关","ice-intro",11,19,10,0,5,0,0],["回风冰廊","冰苔机关","ice-corridor",13,21,12,0,8,0,0],
  ["钥启苔门","冰苔机关","key-gate",13,21,13,0,6,1,0],["双钥回庭","冰苔机关","double-key",15,23,14,0,9,2,0],
  ["雾锁冰桥","暮钟综合","fog-ice",13,21,13,4,8,1,88],["机关折返","暮钟综合","mechanism-return",15,23,15,3,10,1,82],
  ["暮钟竞径","暮钟综合","twilight-race",15,23,16,3,12,2,76],["苔庭归星","暮钟综合","grand-maze",15,25,18,2,14,2,70],
].map((v,i)=>({number:i+1,name:v[0],chapter:v[1],pattern:v[2],columns:v[3],rows:v[4],loops:v[5],fogRadius:v[6],iceCount:v[7],keyCount:v[8],timeLimit:v[9]}));

let mazeColumns=9,mazeRows=15,maze=[],player={x:0,y:0,renderX:0,renderY:0},steps=0,trail=[],moveAnimation=null,iceDirection=null;
let bumpUntil=0,bumpVector={x:0,y:0},gesturePoint=null,lastBlockedSound=0,lastMazeDraw=0,mazeShortestPath=[];
let lanternKeys=new Set(),reachedLanterns=new Set(),starKeys=new Set(),collectedKeys=new Set(),iceKeys=new Set(),visitedKeys=new Set();
let hintPath=[],hintUntil=0,hintUses=3,backtracks=0,challenge=false,controlMode="swipe",mazePaused=false,readyUntil=0,remainingMs=0,lastFrameAt=0,layoutSignature="",validation=null;
const controlModeButtons=[...document.querySelectorAll("[data-maze-control-mode]")];
const blueprint=()=>mazeBlueprints[Math.max(0,Math.min(19,currentCampaignLevel().number-1))];
const key=(x,y)=>x+":"+y;
const point=(value)=>{const p=value.split(":").map(Number);return{x:p[0],y:p[1]};};
const goal=()=>({x:mazeColumns-1,y:mazeRows-1});
const directions=()=>[[0,-1,0],[1,0,1],[0,1,2],[-1,0,3]];

function configureMaze(){
  const delta=config.difficulty==="relaxed"?-2:config.difficulty==="challenging"?2:0;
  mazeColumns=Math.max(9,blueprint().columns+delta);mazeRows=config.aspectRatio==="9:16"?Math.max(15,blueprint().rows+delta*2):mazeColumns;
  if(mazeColumns%2===0)mazeColumns+=1;if(mazeRows%2===0)mazeRows+=1;
}
function openPassage(x,y,nx,ny){const dx=nx-x,dy=ny-y,wall=dx===1?1:dx===-1?3:dy===1?2:0;maze[y][x].walls[wall]=false;maze[ny][nx].walls[(wall+2)%4]=false;}
function closedPassages(){const out=[];maze.forEach((row,y)=>row.forEach((cell,x)=>{if(x+1<mazeColumns&&cell.walls[1])out.push({x,y,nx:x+1,ny:y});if(y+1<mazeRows&&cell.walls[2])out.push({x,y,nx:x,ny:y+1});}));return shuffle(out);}
function shuffle(values){const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(campaignRandom()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function mazeDegree(x,y){return maze[y][x].walls.filter(v=>!v).length;}
function mazeLoopCount(){let edges=0;maze.forEach(row=>row.forEach(cell=>{if(!cell.walls[1])edges++;if(!cell.walls[2])edges++;}));return Math.max(0,edges-mazeColumns*mazeRows+1);}
function mazeJunctionCount(){let n=0;maze.forEach((row,y)=>row.forEach((_cell,x)=>{if(mazeDegree(x,y)>=3)n++;}));return n;}
function pathBetween(start,target,blocked=new Set()){
  const queue=[{...start}],previous=new Map([[key(start.x,start.y),null]]);
  for(let i=0;i<queue.length;i++){const p=queue[i];if(p.x===target.x&&p.y===target.y)break;for(const[dx,dy,wall]of directions()){
    if(maze[p.y][p.x].walls[wall])continue;const next={x:p.x+dx,y:p.y+dy},nextKey=key(next.x,next.y);
    if(next.x<0||next.y<0||next.x>=mazeColumns||next.y>=mazeRows||blocked.has(nextKey)||previous.has(nextKey))continue;previous.set(nextKey,p);queue.push(next);
  }}
  if(!previous.has(key(target.x,target.y)))return[];const out=[];let cursor={...target};while(cursor){out.unshift(cursor);cursor=previous.get(key(cursor.x,cursor.y));}return out;
}
function solveMazeShortestPath(){return pathBetween({x:0,y:0},goal());}
function missionOptimalSteps(){
  const targets=[...starKeys].map(point);if(!targets.length)return Math.max(1,mazeShortestPath.length-1);let best=Infinity;
  const visit=(from,remaining,total)=>{if(total>=best)return;if(!remaining.length){const finalPath=pathBetween(from,goal());if(finalPath.length)best=Math.min(best,total+finalPath.length-1);return;}remaining.forEach((target,index)=>{const segment=pathBetween(from,target);if(!segment.length)return;visit(target,remaining.filter((_item,i)=>i!==index),total+segment.length-1);});};
  visit({x:0,y:0},targets,0);return Number.isFinite(best)?best:Math.max(1,mazeShortestPath.length-1);
}
function reachableWithoutEdge(from,to){
  const queue=[{x:0,y:0}],seen=new Set(["0:0"]);for(let i=0;i<queue.length;i++){const p=queue[i];if(p.x===mazeColumns-1&&p.y===mazeRows-1)return true;
    for(const[dx,dy,wall]of directions()){if(maze[p.y][p.x].walls[wall])continue;const n={x:p.x+dx,y:p.y+dy},blocked=(p.x===from.x&&p.y===from.y&&n.x===to.x&&n.y===to.y)||(p.x===to.x&&p.y===to.y&&n.x===from.x&&n.y===from.y),k=key(n.x,n.y);if(blocked||seen.has(k))continue;seen.add(k);queue.push(n);}}
  return false;
}
function mazeAlternativeSegments(path=solveMazeShortestPath()){let n=0;for(let i=1;i<path.length;i++)if(reachableWithoutEdge(path[i-1],path[i]))n++;return n;}
function braidMaze(){const target=Math.max(5,blueprint().loops+(config.difficulty==="challenging"?3:config.difficulty==="relaxed"?-1:0)),alternatives=3+Math.floor((blueprint().number-1)/8),closed=closedPassages();let opened=0;while(closed.length&&(opened<target||mazeAlternativeSegments()<alternatives)){const p=closed.pop();openPassage(p.x,p.y,p.nx,p.ny);opened++;}}
function createMaze(){
  maze=Array.from({length:mazeRows},()=>Array.from({length:mazeColumns},()=>({visited:false,walls:[true,true,true,true]})));const stack=[[0,0]];maze[0][0].visited=true;
  while(stack.length){const[x,y]=stack[stack.length-1],options=directions().map(([dx,dy,wall])=>({nx:x+dx,ny:y+dy,wall,opposite:(wall+2)%4})).filter(n=>n.nx>=0&&n.ny>=0&&n.nx<mazeColumns&&n.ny<mazeRows&&!maze[n.ny][n.nx].visited);if(!options.length){stack.pop();continue;}const next=options[Math.floor(campaignRandom()*options.length)];maze[y][x].walls[next.wall]=false;maze[next.ny][next.nx].walls[next.opposite]=false;maze[next.ny][next.nx].visited=true;stack.push([next.nx,next.ny]);}
  braidMaze();layoutSignature=blueprint().pattern+":"+mazeColumns+"x"+mazeRows+":"+maze.map(row=>row.map(cell=>cell.walls.map(w=>w?1:0).join("")).join("/")).join("|");
}
function prepareObjectives(){
  mazeShortestPath=solveMazeShortestPath();const pathKeys=new Set(mazeShortestPath.map(p=>key(p.x,p.y))),all=[];maze.forEach((row,y)=>row.forEach((_c,x)=>{const k=key(x,y);if(k!=="0:0"&&k!==key(mazeColumns-1,mazeRows-1))all.push(k);}));
  const branches=shuffle(all.filter(k=>!pathKeys.has(k)&&mazeDegree(point(k).x,point(k).y)<=2)),fallback=shuffle(all.filter(k=>!branches.includes(k))),pool=[...branches,...fallback];lanternKeys=new Set(pool.slice(0,3));reachedLanterns=new Set();starKeys=new Set(pool.filter(k=>!lanternKeys.has(k)).slice(0,blueprint().keyCount));collectedKeys=new Set();
  const used=new Set(["0:0",key(mazeColumns-1,mazeRows-1),...lanternKeys,...starKeys]);iceKeys=new Set(shuffle(all.filter(k=>!used.has(k)&&mazeDegree(point(k).x,point(k).y)===2)).slice(0,blueprint().iceCount));
  hintPath=[];hintUntil=0;hintUses=config.difficulty==="relaxed"?4:config.difficulty==="challenging"?2:3;visitedKeys=new Set(["0:0"]);backtracks=0;validation={goalReachable:mazeShortestPath.length>0,objectivesReachable:[...lanternKeys,...starKeys].every(k=>pathBetween({x:0,y:0},point(k)).length>0),iceCount:iceKeys.size};
}
function mazeLayout(){const boardWidth=config.aspectRatio==="9:16"?660:620,cell=boardWidth/mazeColumns,boardHeight=cell*mazeRows;return{boardWidth,boardHeight,cell,originX:(720-boardWidth)/2,originY:(gameSceneHeight()-boardHeight)/2};}
function drawWall(x,y,w,h){ctx.save();ctx.fillStyle="rgba(81,116,87,.94)";ctx.strokeStyle="rgba(231,238,199,.62)";ctx.lineWidth=Math.max(1,Math.min(w,h)*.12);ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(w,h)/2);ctx.fill();ctx.stroke();ctx.restore();}
function openDirectionsAt(x,y){return directions().filter(d=>!maze[y][x].walls[d[2]]).map(([dx,dy,wall])=>({dx,dy,wall}));}
function openDirections(){return openDirectionsAt(player.x,player.y);}
function drawFloor(ox,oy,cell){ctx.save();iceKeys.forEach(k=>{const p=point(k),x=ox+p.x*cell+cell*.13,y=oy+p.y*cell+cell*.13,g=ctx.createLinearGradient(x,y,x+cell*.74,y+cell*.74);g.addColorStop(0,"rgba(221,250,250,.94)");g.addColorStop(1,"rgba(145,211,225,.78)");ctx.fillStyle=g;ctx.strokeStyle="rgba(255,255,255,.94)";ctx.lineWidth=Math.max(1,cell*.045);ctx.beginPath();ctx.roundRect(x,y,cell*.74,cell*.74,cell*.2);ctx.fill();ctx.stroke();ctx.strokeStyle="rgba(255,255,255,.82)";ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x+cell*.17,y+cell*.47);ctx.lineTo(x+cell*.31,y+cell*.38);ctx.lineTo(x+cell*.42,y+cell*.51);ctx.lineTo(x+cell*.58,y+cell*.34);ctx.stroke();ctx.beginPath();ctx.moveTo(x+cell*.52,y+cell*.19);ctx.lineTo(x+cell*.52,y+cell*.29);ctx.moveTo(x+cell*.47,y+cell*.24);ctx.lineTo(x+cell*.57,y+cell*.24);ctx.stroke();});ctx.restore();}
function drawTrail(ox,oy,cell){ctx.save();trail.slice(-(blueprint().fogRadius?12:24)).forEach((p,i,a)=>{ctx.beginPath();ctx.arc(ox+(p.x+.5)*cell,oy+(p.y+.5)*cell,Math.max(2,cell*.065),0,Math.PI*2);ctx.fillStyle="rgba(255,205,118,"+(.08+.28*(i+1)/a.length)+")";ctx.fill();});ctx.restore();}
function drawDirections(ox,oy,cell,t){if(!running||mazePaused||moveAnimation||t>bumpUntil+900)return;ctx.save();openDirections().forEach(d=>{ctx.beginPath();ctx.arc(ox+(player.x+.5+d.dx*.48)*cell,oy+(player.y+.5+d.dy*.48)*cell,Math.max(3,cell*.11),0,Math.PI*2);ctx.fillStyle="rgba(255,226,137,"+(.46+Math.sin(t/180)*.12)+")";ctx.fill();});ctx.restore();}
function drawHint(ox,oy,cell,t){if(t>=hintUntil||!hintPath.length)return;ctx.save();ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="rgba(255,196,84,.92)";ctx.lineWidth=Math.max(3,cell*.15);ctx.shadowColor="#ffd779";ctx.shadowBlur=Math.max(8,cell*.4);ctx.beginPath();ctx.moveTo(ox+(player.x+.5)*cell,oy+(player.y+.5)*cell);hintPath.forEach(p=>ctx.lineTo(ox+(p.x+.5)*cell,oy+(p.y+.5)*cell));ctx.stroke();ctx.restore();}
function drawObjectives(ox,oy,cell,t){
  const halo=(x,y,color,alpha=.22)=>{ctx.save();ctx.fillStyle=color;ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(ox+(x+.5)*cell,oy+(y+.5)*cell,Math.max(8,cell*.42),0,Math.PI*2);ctx.fill();ctx.restore();};
  lanternKeys.forEach(k=>{const p=point(k),reached=reachedLanterns.has(k),size=Math.max(34,cell*.92);halo(p.x,p.y,"#ffd992",reached?.12:.28);drawBitmapSprite(6,ox+(p.x+.5)*cell-size/2,oy+(p.y+.5)*cell-size/2,size,size,{fallback:"#f4a261",padding:0,scale:1.08,alpha:reached?.48:1});});
  starKeys.forEach(k=>{if(collectedKeys.has(k))return;const p=point(k),size=Math.max(38,cell*.98)*(1+Math.sin(t/220)*.04);halo(p.x,p.y,"#ffe684",.34);drawBitmapSprite(7,ox+(p.x+.5)*cell-size/2,oy+(p.y+.5)*cell-size/2,size,size,{fallback:"#ffd45f",padding:0,scale:1.12});});
  const g=goal(),locked=collectedKeys.size<starKeys.size,size=Math.max(40,cell);halo(g.x,g.y,locked?"#f2a59b":"#ffe681",.36);drawBitmapSprite(locked?4:3,ox+(g.x+.5)*cell-size/2,oy+(g.y+.5)*cell-size/2,size,size,{fallback:locked?"#de7d6b":"#ffd75f",padding:0,scale:1.08});
}
function drawFog(ox,oy,cell){const radius=blueprint().fogRadius;if(!radius)return;ctx.save();maze.forEach((row,y)=>row.forEach((_c,x)=>{const d=Math.abs(x-player.renderX)+Math.abs(y-player.renderY);if(d<=radius)return;const litByLantern=[...reachedLanterns].some(k=>{const p=point(k);return Math.abs(x-p.x)+Math.abs(y-p.y)<=2;}),explored=visitedKeys.has(key(x,y));const alpha=litByLantern?.08:explored?.18:Math.min(.66,.3+(d-radius)*.075);ctx.fillStyle="rgba(47,66,65,"+alpha+")";ctx.fillRect(ox+x*cell,oy+y*cell,cell+1,cell+1);}));ctx.restore();}
function drawPause(ox,oy,w,h){if(!mazePaused)return;ctx.save();ctx.fillStyle="rgba(243,248,239,.84)";ctx.fillRect(ox,oy,w,h);ctx.fillStyle="#29483d";ctx.textAlign="center";ctx.font="700 36px Inter,Microsoft YaHei,sans-serif";ctx.fillText("迷庭暂停",360,oy+h*.48);ctx.font="500 18px Inter,Microsoft YaHei,sans-serif";ctx.fillText("按 P、空格或继续返回",360,oy+h*.54);ctx.restore();}
function drawMaze(t=performance.now()){
  clearCanvas();ctx.save();ctx.translate(0,gameSceneTop());const{boardWidth,boardHeight,cell,originX:ox,originY:oy}=mazeLayout();drawPlayfield(ox-10,oy-10,boardWidth+20,boardHeight+20,{radius:24,alpha:.92});drawFloor(ox,oy,cell);const wall=Math.max(6,cell*.15);
  maze.forEach((row,y)=>row.forEach((data,x)=>{const px=ox+x*cell,py=oy+y*cell;if(data.walls[0])drawWall(px-wall/2,py-wall/2,cell+wall,wall);if(data.walls[1])drawWall(px+cell-wall/2,py-wall/2,wall,cell+wall);if(data.walls[2])drawWall(px-wall/2,py+cell-wall/2,cell+wall,wall);if(data.walls[3])drawWall(px-wall/2,py-wall/2,wall,cell+wall);}));drawTrail(ox,oy,cell);drawFog(ox,oy,cell);drawObjectives(ox,oy,cell,t);drawHint(ox,oy,cell,t);drawDirections(ox,oy,cell,t);
  let px=player.renderX,py=player.renderY;if(t<bumpUntil){const shake=Math.sin((bumpUntil-t)*.2)*.1;px+=bumpVector.x*shake;py+=bumpVector.y*shake;}ctx.save();ctx.fillStyle="rgba(255,247,213,.4)";ctx.beginPath();ctx.arc(ox+(px+.5)*cell,oy+(py+.5)*cell,Math.max(9,cell*.43),0,Math.PI*2);ctx.fill();ctx.restore();const playerSize=Math.max(38,cell*.98);drawBitmapSprite(2,ox+(px+.5)*cell-playerSize/2,oy+(py+.5)*cell-playerSize/2,playerSize,playerSize,{fallback:"#fff7e0",padding:0,scale:1.08});drawPause(ox,oy,boardWidth,boardHeight);ctx.restore();finishCanvasStyle();
}
function updateControls(){
  document.body.dataset.mazeControlMode=controlMode;controlModeButtons.forEach(button=>{const selected=button.dataset.mazeControlMode===controlMode;button.classList.toggle("is-selected",selected);button.setAttribute("aria-pressed",String(selected));});
  document.querySelectorAll("[data-control=pause]").forEach(button=>{button.textContent=mazePaused?"继续":"暂停";button.disabled=!(gameSessionState==="playing"||gameSessionState==="paused");});
  document.querySelectorAll("[data-control=hint]").forEach(button=>{button.textContent="提示 "+hintUses;button.disabled=hintUses<=0||mazePaused||gameSessionState!=="playing";});
}
function loadControlMode(){try{const stored=safeStorage.getItem("maze-control-mode-v1");if(stored==="buttons"||stored==="swipe")controlMode=stored;}catch{}updateControls();}
function togglePause(){if(gameSessionState==="playing"){mazePaused=true;setGameSessionState("paused");stopEnvironmentAudio();setStatus("迷庭已暂停；返回页面后由你主动继续。");}else if(gameSessionState==="paused"){mazePaused=false;lastFrameAt=performance.now();setGameSessionState("playing");startAmbient();setStatus(blueprint().name+"继续。");}updateControls();drawMaze();}
function currentTarget(){const missing=[...starKeys].find(k=>!collectedKeys.has(k));return missing?point(missing):goal();}
function showHint(){if(!running||mazePaused||moveAnimation||hintUses<=0)return false;const path=pathBetween({x:player.x,y:player.y},currentTarget());if(path.length<2)return false;hintUses--;hintPath=path.slice(1,5);hintUntil=performance.now()+1600;setStatus("微光只照亮下一段 "+hintPath.length+" 格；还可提示 "+hintUses+" 次。");playSound("ui");updateControls();drawMaze();return true;}
function challengeTarget(){return Math.ceil(missionOptimalSteps()*1.35);}
function completeMaze(){const b=blueprint(),optimal=missionOptimalSteps(),elapsed=Math.max(0,Math.round((b.timeLimit*1000-remainingMs)/1000)),used=(config.difficulty==="relaxed"?4:config.difficulty==="challenging"?2:3)-hintUses,challengeResult=challenge?" · 竞径 "+(steps<=challengeTarget()?"达成":"未达成")+"（目标 ≤"+challengeTarget()+" 步）":"";showResult(true,"找到归星门",b.name+"完成 · "+steps+" 步 / 最短任务路线 "+optimal+" 步 · 探索 "+visitedKeys.size+" 格 · 回头 "+backtracks+" 次 · 萤灯 "+reachedLanterns.size+"/3 · 提示 "+used+" 次"+(b.timeLimit?" · 用时 "+elapsed+" 秒":"")+challengeResult+"。");}
function finishMove(){if(!moveAnimation)return;const d={dx:moveAnimation.dx,dy:moveAnimation.dy,wall:moveAnimation.wall};player.renderX=moveAnimation.toX;player.renderY=moveAnimation.toY;moveAnimation=null;const k=key(player.x,player.y);if(lanternKeys.has(k)&&!reachedLanterns.has(k)){reachedLanterns.add(k);playSound("collect");}if(starKeys.has(k)&&!collectedKeys.has(k)){collectedKeys.add(k);playSound("collect");setStatus("取得星钥 "+collectedKeys.size+" / "+starKeys.size+"。");}if(player.x===mazeColumns-1&&player.y===mazeRows-1){completeMaze();return;}if(iceKeys.has(k)&&!maze[player.y][player.x].walls[d.wall]){iceDirection=d;window.setTimeout(()=>{if(running&&!mazePaused&&!moveAnimation)movePlayer(d.dx,d.dy,d.wall,true);},28);return;}iceDirection=null;setStatus(blueprint().name+" · "+steps+" 步 · 萤灯 "+reachedLanterns.size+"/3"+(starKeys.size?" · 星钥 "+collectedKeys.size+"/"+starKeys.size:"")+(blueprint().timeLimit?" · 暮钟 "+Math.ceil(remainingMs/1000)+" 秒":""));}
function updateAnimation(t){if(!moveAnimation||mazePaused)return;const p=Math.min(1,(t-moveAnimation.startedAt)/moveAnimation.duration),e=1-Math.pow(1-p,3);player.renderX=moveAnimation.fromX+(moveAnimation.toX-moveAnimation.fromX)*e;player.renderY=moveAnimation.fromY+(moveAnimation.toY-moveAnimation.fromY)*e;if(p>=1)finishMove();}
function updateTimer(t){if(!running||mazePaused||!blueprint().timeLimit){lastFrameAt=t;return;}const delta=lastFrameAt?Math.min(80,t-lastFrameAt):0;lastFrameAt=t;if(t<readyUntil)return;remainingMs=Math.max(0,remainingMs-delta);if(remainingMs<=0){showResult(false,"暮钟已经响起","路线仍然可解；重试后先观察星钥与冰径，再决定支路顺序。");updateControls();}}
function animationLoop(t){updateTimer(t);updateAnimation(t);if(moveAnimation||t<bumpUntil||t<hintUntil||mazePaused||blueprint().fogRadius||blueprint().timeLimit||t-lastMazeDraw>240){drawMaze(t);lastMazeDraw=t;}requestAnimationFrame(animationLoop);}
function movePlayer(dx,dy,wall,automatic=false){
  if(!running||mazePaused||moveAnimation||performance.now()<readyUntil)return false;if(maze[player.y][player.x].walls[wall]){if(automatic){iceDirection=null;return false;}bumpUntil=performance.now()+220;bumpVector={x:dx,y:dy};setStatus("这里是苔墙；可走方向会短暂亮起。");if(performance.now()-lastBlockedSound>260){playSound("fail");lastBlockedSound=performance.now();}return false;}
  const nx=player.x+dx,ny=player.y+dy;if(nx===mazeColumns-1&&ny===mazeRows-1&&collectedKeys.size<starKeys.size){bumpUntil=performance.now()+260;bumpVector={x:dx,y:dy};playSound("fail");setStatus("归星门尚未开启：还缺 "+(starKeys.size-collectedKeys.size)+" 枚星钥。");return false;}
  const fromX=player.renderX,fromY=player.renderY;trail.push({x:player.x,y:player.y});player.x=nx;player.y=ny;steps++;const k=key(nx,ny);if(visitedKeys.has(k))backtracks++;visitedKeys.add(k);moveAnimation={fromX,fromY,toX:nx,toY:ny,dx,dy,wall,startedAt:performance.now(),duration:automatic?88:112};setMetric(String(steps));playSound("move");return true;
}
function startGame(){resetCampaignRandom();configureMaze();createMaze();prepareObjectives();challenge=Boolean(document.querySelector("[data-maze-shortest]")?.checked);player={x:0,y:0,renderX:0,renderY:0};steps=0;trail=[];moveAnimation=null;iceDirection=null;bumpUntil=0;mazePaused=false;readyUntil=performance.now()+700;lastFrameAt=performance.now();const scale=config.difficulty==="relaxed"?1.25:config.difficulty==="challenging"?.86:1;remainingMs=Math.round(blueprint().timeLimit*scale*1000);running=true;hideOverlay();setMetric("0");updateControls();setStatus("第 "+blueprint().number+" 关 · "+blueprint().chapter+" / "+blueprint().name+" · "+mazeColumns+"×"+mazeRows+" · "+mazeLoopCount()+" 处环路"+(challenge?" · 竞径目标 ≤"+challengeTarget()+" 步":"")+"。先观察 0.7 秒再出发。");startAmbient();lastMazeDraw=0;drawMaze();}
function handleControl(value){if(value==="pause"){togglePause();return true;}if(value==="hint")return showHint();const moves={up:[0,-1,0],right:[1,0,1],down:[0,1,2],left:[-1,0,3]};return moves[value]?movePlayer(...moves[value]):false;}
function handleKey(value){const k=value.length===1?value.toLowerCase():value;if(k==="p"||k===" "){togglePause();return;}const map={ArrowUp:"up",ArrowRight:"right",ArrowDown:"down",ArrowLeft:"left",w:"up",d:"right",s:"down",a:"left",h:"hint"};if(map[k])handleControl(map[k]);}
function gestureDirection(dx,dy){return Math.abs(dx)>Math.abs(dy)?dx>0?"right":"left":dy>0?"down":"up";}
canvas.addEventListener("pointerdown",event=>{if(!running||mazePaused||controlMode!=="swipe"||moveAnimation)return;gesturePoint={pointerId:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture?.(event.pointerId);});
canvas.addEventListener("pointerup",event=>{if(!running||mazePaused||!gesturePoint||gesturePoint.pointerId!==event.pointerId)return;const dx=event.clientX-gesturePoint.x,dy=event.clientY-gesturePoint.y;gesturePoint=null;if(Math.max(Math.abs(dx),Math.abs(dy))>=18)handleControl(gestureDirection(dx,dy));});
canvas.addEventListener("pointercancel",()=>{gesturePoint=null;});
let holdDelay=null,holdRepeat=null,lastPointerControlAt=0;function stopRepeat(){clearTimeout(holdDelay);clearInterval(holdRepeat);holdDelay=null;holdRepeat=null;}
document.querySelectorAll(".maze-pad [data-control]").forEach(button=>{if(["pause","hint"].includes(button.dataset.control))return;button.addEventListener("pointerdown",event=>{if(controlMode!=="buttons")return;event.preventDefault();stopRepeat();lastPointerControlAt=performance.now();handleControl(button.dataset.control);holdDelay=setTimeout(()=>{holdRepeat=setInterval(()=>handleControl(button.dataset.control),145);},330);});["pointerup","pointercancel","pointerleave"].forEach(name=>button.addEventListener(name,stopRepeat));button.addEventListener("click",event=>{event.stopImmediatePropagation();if(controlMode==="buttons"&&performance.now()-lastPointerControlAt>500)handleControl(button.dataset.control);});});
controlModeButtons.forEach(button=>button.addEventListener("click",()=>{const value=button.dataset.mazeControlMode;if(value!=="buttons"&&value!=="swipe")return;controlMode=value;try{safeStorage.setItem("maze-control-mode-v1",controlMode);}catch{}updateControls();}));
document.addEventListener("visibilitychange",()=>{if(document.hidden&&gameSessionState==="playing")togglePause();});
onCampaignLevelChanged=()=>{if(!running&&!mazePaused){resetCampaignRandom();configureMaze();createMaze();prepareObjectives();player={x:0,y:0,renderX:0,renderY:0};drawMaze();}};
loadControlMode();resetCampaignRandom();configureMaze();createMaze();prepareObjectives();
runtimeDebugActions={solveMaze:()=>{steps=missionOptimalSteps();reachedLanterns=new Set(lanternKeys);collectedKeys=new Set(starKeys);player={x:mazeColumns-1,y:mazeRows-1,renderX:mazeColumns-1,renderY:mazeRows-1};drawMaze();completeMaze();},failMazeChallenge:()=>showResult(false,"竞径挑战未完成","本次路线超过目标；普通探索仍可不限步数完成。"),useMazeHint:()=>showHint(),pauseMaze:()=>togglePause(),probeMazeSwipe:()=>{readyUntil=0;const d=openDirections()[0];return d?movePlayer(d.dx,d.dy,d.wall):false;}};
runtimeDebugState=()=>({level:blueprint().number,name:blueprint().name,chapter:blueprint().chapter,pattern:blueprint().pattern,columns:mazeColumns,rows:mazeRows,steps,directOptimalSteps:Math.max(1,mazeShortestPath.length-1),optimalSteps:missionOptimalSteps(),challengeTarget:challengeTarget(),lanterns:reachedLanterns.size,checkpoints:reachedLanterns.size,keyCount:starKeys.size,collectedKeys:collectedKeys.size,iceCount:iceKeys.size,fogRadius:blueprint().fogRadius,timeLimit:blueprint().timeLimit,remainingSeconds:Math.ceil(remainingMs/1000),hintUses,hintPathLength:performance.now()<hintUntil?hintPath.length:0,visitedCells:visitedKeys.size,backtracks,loopCount:mazeLoopCount(),junctionCount:mazeJunctionCount(),alternativeSegments:mazeAlternativeSegments(mazeShortestPath),hasMultipleRoutes:mazeAlternativeSegments(mazeShortestPath)>0,challenge,controlMode,paused:mazePaused,openDirections:openDirections().map(d=>({dx:d.dx,dy:d.dy,wall:d.wall})),layoutSignature,validation,player:{...player},readyGraceActive:performance.now()<readyUntil});
requestAnimationFrame(animationLoop);
`;
