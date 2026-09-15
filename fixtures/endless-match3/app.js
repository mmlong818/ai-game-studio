/* forge-platform:begin */
const safeStorage = (() => {
  const memory = new Map();
  return {
    getItem(key) {
      try { const value = localStorage.getItem(key); if (value !== null) return value; } catch {}
      return memory.has(key) ? memory.get(key) : null;
    },
    setItem(key, value) {
      const stringValue = String(value);
      try { localStorage.setItem(key, stringValue); } catch { memory.set(key, stringValue); }
    },
    removeItem(key) {
      try { localStorage.removeItem(key); } catch { memory.delete(key); }
    },
  };
})();
/* forge-platform:end */
/* forge-platform:begin */
window.__FORGE_SPRITE_SPECS__ = Object.freeze({});
(() => {
  const registered = window.__FORGE_SPRITE_SPECS__ || {};
  const resolveAnimation = (image, candidate) => {
    const complete = candidate && ["frameWidth", "frameHeight", "columns", "rows", "frameCount"].every(key => Number.isFinite(candidate[key]) && candidate[key] > 0)
      && candidate.anchor && Number.isFinite(candidate.anchor.x) && Number.isFinite(candidate.anchor.y)
      && Array.isArray(candidate.clips) && candidate.clips.length && candidate.clips.every(clip => clip && typeof clip.id === "string" && Number.isFinite(clip.startFrame) && Number.isFinite(clip.frameCount) && Number.isFinite(clip.fps));
    if (complete) return candidate;
    const rawSource = String(image?.currentSrc || image?.src || "");
    let sourcePath = rawSource;
    try { sourcePath = decodeURIComponent(new URL(rawSource, location.href).pathname); } catch {}
    const file = Object.keys(registered).find(path => sourcePath === "/" + path || sourcePath.endsWith("/" + path));
    if (!file) throw new Error("Sprite Sheet 缺少平台登记的动画合同。");
    return registered[file];
  };
  const frameAt = (animation, clipId, elapsedMs) => {
    const clip = animation.clips.find(candidate => candidate.id === clipId);
    if (!clip) throw new Error("Sprite Sheet 没有动作 " + clipId + "。");
    const advanced = Math.max(0, Math.floor(Math.max(0, elapsedMs) * clip.fps / 1000));
    const offset = clip.loop ? advanced % clip.frameCount : Math.min(advanced, clip.frameCount - 1);
    const frame = clip.startFrame + offset;
    return { clipId, frame, sourceX: frame % animation.columns * animation.frameWidth, sourceY: Math.floor(frame / animation.columns) * animation.frameHeight, sourceWidth: animation.frameWidth, sourceHeight: animation.frameHeight };
  };
  window.__FORGE_SPRITES__ = Object.freeze({
    create(image, animation, initialClip) {
      animation = resolveAnimation(image, animation);
      let clipId = initialClip || animation.clips[0].id;
      let clipStartedAt = performance.now();
      return {
        play(nextClip, now = performance.now(), restart = false) {
          if (!animation.clips.some(clip => clip.id === nextClip)) throw new Error("Sprite Sheet 没有动作 " + nextClip + "。");
          if (restart || nextClip !== clipId) { clipId = nextClip; clipStartedAt = now; }
        },
        frame(now = performance.now()) { return frameAt(animation, clipId, now - clipStartedAt); },
        draw(context, anchorX, anchorY, scale = 1, now = performance.now()) {
          const frame = frameAt(animation, clipId, now - clipStartedAt);
          context.drawImage(image, frame.sourceX, frame.sourceY, frame.sourceWidth, frame.sourceHeight, anchorX - animation.anchor.x * scale, anchorY - animation.anchor.y * scale, frame.sourceWidth * scale, frame.sourceHeight * scale);
          return frame;
        },
        get clipId() { return clipId; }
      };
    }
  });
})();
/* forge-platform:end */




(function(){
'use strict';

/* ===== 常量与状态 ===== */
var N=7, TYPES=5, PAD=8;
var GEMS=[
  {base:'#FF9AA6',ink:'#B4384A',shape:'circle'},
  {base:'#FFC978',ink:'#A9660F',shape:'square'},
  {base:'#8FE0C0',ink:'#17795C',shape:'triangle'},
  {base:'#93C4F7',ink:'#1F5A96',shape:'diamond'},
  {base:'#C4AAF5',ink:'#5D3AA0',shape:'cross'}
];

var canvas=document.getElementById('game-canvas');
var ctx=canvas.getContext('2d');
var stage=document.getElementById('stage');
var hintLayer=document.getElementById('hint-layer');
var bannerEl=document.getElementById('banner');
var scoreEl=document.getElementById('score');
var bestEl=document.getElementById('best');
var chainEl=document.getElementById('chain');
var chainStat=document.getElementById('chainStat');
var statusEl=document.getElementById('status');

var cell=44, boardPx=320, dpr=1;
var grid=new Array(N*N).fill(-1);
var fallFrom=null;
var phase='idle', animT=0, animDur=0, animData=null;
var selected=null, cursor={r:3,c:3}, showCursor=false;
var score=0, best=0, chain=0, chainVal=0, chainShow=0;
var popups=[], bursts=[];
var cur='idle';
var gesture=null, lastTapTs=0, lastDragSwapTs=0;
var recommended=null, queuedRecommend=false;
var lastChainText='—', lastScoreText='0';

/* ===== 存档 ===== */
var store=(window.safeStorage&&typeof window.safeStorage.getItem==='function')?window.safeStorage:null;
function loadBest(){ try{ var v=store?store.getItem('ziyou-chuangxiang-best'):null; best=v?(parseInt(v,10)||0):0; }catch(e){ best=0; } }
function saveBest(){ try{ if(store) store.setItem('ziyou-chuangxiang-best',String(best)); }catch(e){} }

/* ===== 音效（首次交互后创建） ===== */
var actx=null;
function initAudio(){
  if(actx) return;
  try{ var AC=window.AudioContext||window.webkitAudioContext; if(AC) actx=new AC(); }catch(e){ actx=null; }
}
function beep(f,dur,type,vol,when,slideTo){
  if(!actx) return;
  try{
    var t0=actx.currentTime+(when||0);
    var o=actx.createOscillator(), g=actx.createGain();
    o.type=type||'square';
    o.frequency.setValueAtTime(f,t0);
    if(slideTo) o.frequency.linearRampToValueAtTime(slideTo,t0+dur);
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.linearRampToValueAtTime(vol||0.1,t0+0.012);
    g.gain.exponentialRampToValueAtTime(0.0008,t0+dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t0); o.stop(t0+dur+0.03);
  }catch(e){}
}
function sfx(kind){
  if(kind==='swap'){ beep(520,0.08,'square',0.08); }
  else if(kind==='tap'){ beep(760,0.05,'triangle',0.055); }
  else if(kind==='bad'){ beep(170,0.16,'sawtooth',0.07,0,110); }
  else if(kind==='shuffle'){ beep(220,0.42,'triangle',0.08,0,640); beep(330,0.3,'square',0.04,0.1,760); }
}
function sfxMatch(ch,n){
  var base=460*Math.pow(1.12,Math.max(0,ch-1));
  beep(base,0.1,'triangle',0.1,0);
  beep(base*1.25,0.1,'triangle',0.09,0.06);
  beep(base*1.5,0.13,'square',0.07,0.12);
  if(n>3) beep(base*2,0.12,'triangle',0.06,0.19);
}

/* ===== 工具 ===== */
function inB(r,c){ return r>=0&&r<N&&c>=0&&c<N; }
function at(r,c){ return grid[r*N+c]; }
function clampIdx(v){ return v<0?0:(v>N-1?N-1:v); }
function easeOut(t){ return 1-Math.pow(1-t,3); }
function easeInOut(t){ return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }
function rndType(){ return Math.floor(Math.random()*TYPES); }

/* ===== DOM 状态镜像（棋盘变化可被外部观察） ===== */
function syncDom(){
  var s='',i;
  for(i=0;i<grid.length;i++) s+=(grid[i]<0?'.':String(grid[i]));
  if(stage.dataset.board!==s) stage.dataset.board=s;
  if(stage.dataset.phase!==phase) stage.dataset.phase=phase;
  var sc=String(score);
  if(stage.dataset.score!==sc) stage.dataset.score=sc;
  if(canvas.dataset.score!==sc) canvas.dataset.score=sc;
}

/* ===== 匹配与合法步 ===== */
function findMatches(g){
  var s=new Set(), r,c,run,k;
  for(r=0;r<N;r++){
    run=1;
    for(c=1;c<=N;c++){
      var same=(c<N)&&g[r*N+c]>=0&&g[r*N+c]===g[r*N+c-1];
      if(same){ run++; }
      else{ if(run>=3){ for(k=c-run;k<c;k++) s.add(r*N+k); } run=1; }
    }
  }
  for(c=0;c<N;c++){
    run=1;
    for(r=1;r<=N;r++){
      var same2=(r<N)&&g[r*N+c]>=0&&g[r*N+c]===g[(r-1)*N+c];
      if(same2){ run++; }
      else{ if(run>=3){ for(k=r-run;k<r;k++) s.add(k*N+c); } run=1; }
    }
  }
  return s;
}
function trySwapHasMatch(a,b){
  var i=a.r*N+a.c, j=b.r*N+b.c, t=grid[i];
  grid[i]=grid[j]; grid[j]=t;
  var ok=findMatches(grid).size>0;
  t=grid[i]; grid[i]=grid[j]; grid[j]=t;
  return ok;
}
function getMoves(){
  var out=[],r,c;
  for(r=0;r<N;r++) for(c=0;c<N;c++){
    if(c<N-1&&trySwapHasMatch({r:r,c:c},{r:r,c:c+1})) out.push({a:{r:r,c:c},b:{r:r,c:c+1}});
    if(r<N-1&&trySwapHasMatch({r:r,c:c},{r:r+1,c:c})) out.push({a:{r:r,c:c},b:{r:r+1,c:c}});
  }
  return out;
}
function hasAnyMove(){
  for(var r=0;r<N;r++) for(var c=0;c<N;c++){
    if(c<N-1&&trySwapHasMatch({r:r,c:c},{r:r,c:c+1})) return true;
    if(r<N-1&&trySwapHasMatch({r:r,c:c},{r:r+1,c:c})) return true;
  }
  return false;
}

/* ===== 盘面生成 / 洗牌 ===== */
function genBoard(){
  var guardAll=0;
  do{
    for(var r=0;r<N;r++) for(var c=0;c<N;c++){
      var t,guard=0;
      do{ t=rndType(); guard++; }
      while(guard<40&&(
        (c>=2&&grid[r*N+c-1]===t&&grid[r*N+c-2]===t)||
        (r>=2&&grid[(r-1)*N+c]===t&&grid[(r-2)*N+c]===t)
      ));
      grid[r*N+c]=t;
    }
    guardAll++;
  }while(guardAll<40&&(findMatches(grid).size>0||!hasAnyMove()));
  syncDom();
}
function shuffleBoard(){
  for(var tries=0;tries<80;tries++){
    var arr=grid.slice();
    for(var i=arr.length-1;i>0;i--){
      var j=Math.floor(Math.random()*(i+1)), t=arr[i]; arr[i]=arr[j]; arr[j]=t;
    }
    var bak=grid; grid=arr;
    if(findMatches(grid).size===0&&hasAnyMove()){ syncDom(); return; }
    grid=bak;
  }
  genBoard();
}

/* ===== 状态机 ===== */
function setState(s){
  if(cur===s){ document.body.dataset.gameState=s; return; }
  cur=s;
  document.body.dataset.gameState=s;
  window.dispatchEvent(new CustomEvent('game:state-change',{detail:{state:s}}));
}

/* ===== HUD ===== */
var T=function(key,vars){return window.EndlessI18n.t(key,vars);};
var bannerState=null;
function banner(text,ms){
  bannerEl.textContent=text;
  bannerEl.classList.add('show');
  clearTimeout(banner._t);
  banner._t=setTimeout(function(){ bannerEl.classList.remove('show'); },ms||1000);
}
function localizedBanner(key,vars,ms){bannerState={key:key,vars:vars||{}};banner(T(key,vars),ms);}
function setSelected(p){
  selected=p;
  stage.dataset.selected=p?(p.r+','+p.c):'';
  statusEl.textContent=p?T('selected',{row:p.r+1,col:p.c+1}):T('idle');
}
function updateHUD(){
  var s=String(score);
  if(s!==lastScoreText){ scoreEl.textContent=s; lastScoreText=s; }
  bestEl.textContent=String(best);
  syncDom();
}

/* ===== 推荐交换：棋盘上的真实可点/可拖物体 ===== */
function dirOf(m){
  var a=m.a,b=m.b;
  return (b.c>a.c)?'right':(b.c<a.c)?'left':(b.r>a.r)?'down':'up';
}
function dirName(d){ return T(d); }
function updateHints(){
  if(cur!=='playing'){ hintLayer.innerHTML=''; recommended=null; return; }
  if(phase!=='idle') return;           /* 动画期间保留已有物体，避免节点被移除 */
  hintLayer.innerHTML='';
  recommended=null;
  var moves=getMoves();
  if(!moves.length) return;
  recommended=moves[Math.floor(Math.random()*moves.length)];
  hintLayer.appendChild(makeHint(recommended));
}
function makeHint(m){
  var a=m.a, d=dirOf(m), size=Math.max(44,cell);
  var el=document.createElement('button');
  el.type='button'; el.className='hint';
  el.style.width=size+'px'; el.style.height=size+'px';
  el.style.left=(PAD+a.c*cell+cell/2)+'px';
  el.style.top=(PAD+a.r*cell+cell/2)+'px';
  el.dataset.gameAction='click';
  el.dataset.gameDrag=d;
  el.setAttribute('aria-label',T('hint',{row:a.r+1,col:a.c+1,direction:dirName(d)}));
  el.addEventListener('pointerdown',function(e){ e.preventDefault(); gDown(e.clientX,e.clientY,a); });
  el.addEventListener('mousedown',function(e){ e.preventDefault(); gDown(e.clientX,e.clientY,a); });
  el.addEventListener('touchstart',function(e){
    var t=e.touches&&e.touches[0]; if(t) gDown(t.clientX,t.clientY,a);
  },{passive:true});
  el.addEventListener('click',function(e){
    e.preventDefault();
    initAudio();
    if(Date.now()-lastDragSwapTs<500) return;   /* 刚刚由拖动完成，不重复执行 */
    runRecommended();
  });
  return el;
}
function runRecommended(){
  if(cur!=='playing') return;
  if(phase!=='idle'){ queuedRecommend=true; return; }
  var m=recommended;
  if(!m||!trySwapHasMatch(m.a,m.b)){
    var moves=getMoves();
    m=moves.length?moves[0]:null;
  }
  if(!m){ beginShuffle(); return; }
  setSelected(null);
  attemptSwap(m.a,m.b);
}

/* ===== 阶段推进 ===== */
function swapCells(a,b){
  var i=a.r*N+a.c, j=b.r*N+b.c, t=grid[i];
  grid[i]=grid[j]; grid[j]=t;
  syncDom();
}
function attemptSwap(a,b){
  if(cur!=='playing'||phase!=='idle') return false;
  if(Math.abs(a.r-b.r)+Math.abs(a.c-b.c)!==1) return false;
  setSelected(null);
  swapCells(a,b);
  animData={a:a,b:b}; phase='swap'; animT=0; animDur=130;
  sfx('swap');
  hintLayer.innerHTML=''; recommended=null;
  syncDom();
  return true;
}
function beginClear(set){
  var cells=[]; set.forEach(function(i){ cells.push(i); });
  var gain=cells.length*10*Math.max(1,chain)+Math.max(0,cells.length-3)*15;
  score+=gain;
  if(score>best){ best=score; saveBest(); }
  var sx=0,sy=0;
  cells.forEach(function(i){
    var r=Math.floor(i/N), c=i%N;
    sx+=PAD+c*cell+cell/2; sy+=PAD+r*cell+cell/2;
    bursts.push({x:PAD+c*cell+cell/2,y:PAD+r*cell+cell/2,t:0,col:GEMS[grid[i]>=0?grid[i]:0].base});
  });
  popups.push({x:sx/cells.length,y:sy/cells.length,t:0,text:'+'+gain,big:chain>1});
  if(chain>1){ chainVal=chain; chainShow=1500; localizedBanner('combo',{count:chain},1000); }
  sfxMatch(chain,cells.length);
  animData={cells:cells}; phase='clear'; animT=0; animDur=200; fallFrom=null;
  statusEl.textContent=T('cleared',{count:cells.length,score:gain});
  updateHUD();
}
function beginFall(){
  var from=new Array(N*N).fill(null), maxDist=1;
  for(var c=0;c<N;c++){
    var write=N-1;
    for(var r=N-1;r>=0;r--){
      if(grid[r*N+c]>=0){
        if(write!==r){
          grid[write*N+c]=grid[r*N+c];
          grid[r*N+c]=-1;
          from[write*N+c]=r;
          if(write-r>maxDist) maxDist=write-r;
        }
        write--;
      }
    }
    var off=write+1;
    for(var r2=write;r2>=0;r2--){
      grid[r2*N+c]=rndType();
      from[r2*N+c]=r2-off;
      if(off>maxDist) maxDist=off;
    }
  }
  fallFrom=from;
  phase='fall'; animT=0; animDur=Math.min(400,140+maxDist*42);
  syncDom();
}
function beginShuffle(){
  localizedBanner('shuffle',{},1300); statusEl.textContent=T('shuffling');
  sfx('shuffle');
  animData={applied:false}; phase='shuffle'; animT=0; animDur=600;
  syncDom();
}
function onIdle(){
  chain=0; fallFrom=null; animData=null;
  if(!hasAnyMove()){ beginShuffle(); return; }
  if(!selected) statusEl.textContent=T('idle');
  updateHints();
  syncDom();
  if(queuedRecommend){ queuedRecommend=false; runRecommended(); }
}
function advance(){
  if(phase==='swap'){
    var m=findMatches(grid);
    if(m.size){ chain=1; beginClear(m); }
    else{
      swapCells(animData.a,animData.b);
      phase='swapback'; animT=0; animDur=150; sfx('bad');
      statusEl.textContent=T('invalid');
    }
  }else if(phase==='swapback'){
    phase='idle'; onIdle();
  }else if(phase==='clear'){
    animData.cells.forEach(function(i){ grid[i]=-1; });
    syncDom();
    beginFall();
  }else if(phase==='fall'){
    var m2=findMatches(grid);
    if(m2.size){ chain=chain+1; beginClear(m2); }
    else{ phase='idle'; onIdle(); }
  }else if(phase==='shuffle'){
    phase='idle'; onIdle();
  }
}
function step(dt){
  if(phase==='idle') return;
  animT+=dt;
  if(phase==='shuffle'&&animData&&!animData.applied&&animT>=animDur*0.5){
    shuffleBoard(); animData.applied=true;
  }
  if(animT>=animDur) advance();
}

/* ===== 绘制 ===== */
function shapePath(s,type){
  var g=GEMS[type], r=s*0.27;
  ctx.beginPath();
  if(g.shape==='circle'){ ctx.arc(0,0,r,0,Math.PI*2); }
  else if(g.shape==='square'){ ctx.rect(-r*0.92,-r*0.92,r*1.84,r*1.84); }
  else if(g.shape==='triangle'){ ctx.moveTo(0,-r*1.08); ctx.lineTo(r,r*0.8); ctx.lineTo(-r,r*0.8); ctx.closePath(); }
  else if(g.shape==='diamond'){ ctx.moveTo(0,-r*1.15); ctx.lineTo(r*1.15,0); ctx.lineTo(0,r*1.15); ctx.lineTo(-r*1.15,0); ctx.closePath(); }
  else{ var a=r*0.42,b=r*1.15; ctx.rect(-a,-b,a*2,b*2); ctx.rect(-b,-a,b*2,a*2); }
}
function drawGem(cx,cy,s,type,scale,rot){
  if(type<0||scale<=0.02) return;
  var g=GEMS[type], h=s*scale/2;
  ctx.save();
  ctx.translate(cx,cy);
  if(rot) ctx.rotate(rot);
  ctx.fillStyle='rgba(43,42,51,0.22)';
  ctx.fillRect(-h+s*0.07,-h+s*0.07,2*h,2*h);
  ctx.fillStyle=g.base;
  ctx.fillRect(-h,-h,2*h,2*h);
  ctx.fillStyle='rgba(255,255,255,0.5)';
  ctx.fillRect(-h,-h,2*h*0.36,2*h*0.15);
  ctx.fillStyle=g.ink;
  ctx.globalAlpha=0.22;
  ctx.fillRect(h-2*h*0.22,h-2*h*0.12,2*h*0.22,2*h*0.12);
  ctx.globalAlpha=1;
  shapePath(s*scale,type);
  ctx.fillStyle=g.ink; ctx.fill();
  ctx.lineWidth=Math.max(1.4,s*0.03); ctx.strokeStyle='rgba(255,255,255,0.75)'; ctx.stroke();
  ctx.lineWidth=Math.max(2,s*0.055); ctx.strokeStyle='#2B2A33';
  ctx.strokeRect(-h,-h,2*h,2*h);
  ctx.restore();
}
function cellOffset(r,c){
  if((phase==='swap'||phase==='swapback')&&animData&&animData.a){
    var t=easeInOut(Math.min(1,animT/animDur)), a=animData.a, b=animData.b;
    if(r===a.r&&c===a.c) return [(b.c-a.c)*cell*(1-t),(b.r-a.r)*cell*(1-t)];
    if(r===b.r&&c===b.c) return [(a.c-b.c)*cell*(1-t),(a.r-b.r)*cell*(1-t)];
  }
  if(phase==='fall'&&fallFrom){
    var f=fallFrom[r*N+c];
    if(f!==null&&f!==undefined){
      var tf=easeOut(Math.min(1,animT/animDur));
      return [0,(f-r)*cell*(1-tf)];
    }
  }
  return [0,0];
}
function cellScale(r,c){
  if(phase==='clear'&&animData&&animData.cells){
    var i=r*N+c;
    if(animData.cells.indexOf(i)>=0){
      var t=Math.min(1,animT/animDur);
      return Math.max(0,1-t);
    }
  }
  if(phase==='shuffle'){
    var ts=Math.min(1,animT/animDur);
    return Math.max(0.05,Math.abs(1-2*ts));
  }
  return 1;
}
function render(){
  var W=boardPx;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,W,W);
  ctx.fillStyle='#EDE7DA'; ctx.fillRect(0,0,W,W);

  /* 边框细节：四角套色标记 */
  ctx.fillStyle='#FF9AA6'; ctx.fillRect(0,0,PAD,PAD);
  ctx.fillStyle='#8FE0C0'; ctx.fillRect(W-PAD,0,PAD,PAD);
  ctx.fillStyle='#93C4F7'; ctx.fillRect(0,W-PAD,PAD,PAD);
  ctx.fillStyle='#C4AAF5'; ctx.fillRect(W-PAD,W-PAD,PAD,PAD);

  var r,c;
  for(r=0;r<N;r++) for(c=0;c<N;c++){
    ctx.fillStyle=((r+c)%2)?'#E4DCC9':'#F0EBE0';
    ctx.fillRect(PAD+c*cell,PAD+r*cell,cell,cell);
  }
  ctx.strokeStyle='rgba(43,42,51,0.18)'; ctx.lineWidth=1;
  for(var i=0;i<=N;i++){
    ctx.beginPath(); ctx.moveTo(PAD+i*cell+0.5,PAD); ctx.lineTo(PAD+i*cell+0.5,PAD+N*cell); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD,PAD+i*cell+0.5); ctx.lineTo(PAD+N*cell,PAD+i*cell+0.5); ctx.stroke();
  }
  ctx.strokeStyle='#2B2A33'; ctx.lineWidth=3;
  ctx.strokeRect(PAD-1.5,PAD-1.5,N*cell+3,N*cell+3);

  if(cur!=='playing'){ return; }

  var shuffleRot=(phase==='shuffle')?(1-Math.abs(1-2*Math.min(1,animT/animDur)))*0.5:0;
  for(r=0;r<N;r++) for(c=0;c<N;c++){
    var t=at(r,c);
    if(t<0) continue;
    var off=cellOffset(r,c);
    var cx=PAD+c*cell+cell/2+off[0];
    var cy=PAD+r*cell+cell/2+off[1];
    drawGem(cx,cy,cell-6,t,cellScale(r,c),shuffleRot*((r+c)%2?1:-1));
  }

  /* 消除碎块 */
  for(var bi=0;bi<bursts.length;bi++){
    var b=bursts[bi], bt=b.t/320;
    if(bt>=1) continue;
    var d=bt*cell*0.85, sz=Math.max(1,(1-bt)*cell*0.22);
    ctx.fillStyle=b.col; ctx.globalAlpha=1-bt;
    ctx.fillRect(b.x-d-sz/2,b.y-d-sz/2,sz,sz);
    ctx.fillRect(b.x+d-sz/2,b.y-d-sz/2,sz,sz);
    ctx.fillRect(b.x-d-sz/2,b.y+d-sz/2,sz,sz);
    ctx.fillRect(b.x+d-sz/2,b.y+d-sz/2,sz,sz);
    ctx.globalAlpha=1;
  }

  /* 选中框 */
  if(selected){
    var sx=PAD+selected.c*cell, sy=PAD+selected.r*cell;
    ctx.lineWidth=4; ctx.strokeStyle='#2B2A33';
    ctx.strokeRect(sx+2,sy+2,cell-4,cell-4);
    ctx.lineWidth=2; ctx.strokeStyle='#FFFFFF';
    ctx.setLineDash([5,4]);
    ctx.strokeRect(sx+2,sy+2,cell-4,cell-4);
    ctx.setLineDash([]);
  }
  /* 键盘光标 */
  if(showCursor){
    var kx=PAD+cursor.c*cell, ky=PAD+cursor.r*cell;
    ctx.lineWidth=3; ctx.strokeStyle='#2B2A33';
    ctx.setLineDash([3,4]);
    ctx.strokeRect(kx+4,ky+4,cell-8,cell-8);
    ctx.setLineDash([]);
    ctx.fillStyle='#2B2A33';
    ctx.fillRect(kx+4,ky+4,8,8);
  }

  /* 分数飘字 */
  for(var pi=0;pi<popups.length;pi++){
    var p=popups[pi], pt=p.t/900;
    ctx.save();
    ctx.globalAlpha=Math.max(0,1-pt);
    ctx.font='800 '+Math.max(14,Math.round(cell*(p.big?0.5:0.4)))+'px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    var py=p.y-pt*cell*0.9;
    ctx.fillStyle='#2B2A33'; ctx.fillText(p.text,p.x+2,py+2);
    ctx.fillStyle=p.big?'#FFC978':'#FFFFFF'; ctx.fillText(p.text,p.x,py);
    ctx.restore();
  }
}

/* ===== 主循环 ===== */
var last=0;
function frame(ts){
  var dt=last?Math.min(50,ts-last):16; last=ts;
  step(dt);
  var i;
  for(i=popups.length-1;i>=0;i--){ popups[i].t+=dt; if(popups[i].t>900) popups.splice(i,1); }
  for(i=bursts.length-1;i>=0;i--){ bursts[i].t+=dt; if(bursts[i].t>320) bursts.splice(i,1); }
  if(chainShow>0){
    chainShow-=dt;
    var txt='×'+chainVal;
    if(txt!==lastChainText){ chainEl.textContent=txt; lastChainText=txt; chainStat.classList.add('hot'); }
  }else if(lastChainText!=='—'){
    chainEl.textContent='—'; lastChainText='—'; chainStat.classList.remove('hot');
  }
  render();
  requestAnimationFrame(frame);
}

/* ===== 布局 ===== */
function layout(){
  var wrap=document.getElementById('board-wrap');
  var w=wrap.clientWidth-4, h=wrap.clientHeight-4;
  var size=Math.max(196,Math.min(w,h,440));
  cell=Math.max(26,Math.floor((size-PAD*2)/N));
  boardPx=cell*N+PAD*2;
  dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(boardPx*dpr);
  canvas.height=Math.round(boardPx*dpr);
  canvas.style.width=boardPx+'px';
  canvas.style.height=boardPx+'px';
  stage.style.width=boardPx+'px';
  stage.style.height=boardPx+'px';
  if(phase==='idle') updateHints();
}

/* ===== 输入：指针 / 鼠标 / 触摸统一，互相去重 ===== */
function cellFromPoint(x,y){
  var rect=canvas.getBoundingClientRect();
  var cx=x-rect.left-PAD, cy=y-rect.top-PAD;
  var c=Math.floor(cx/cell), r=Math.floor(cy/cell);
  return inB(r,c)?{r:r,c:c}:null;
}
function handleTap(p){
  if(!p) return;
  if(cur!=='playing'||phase!=='idle') return;
  if(!selected){ setSelected(p); sfx('tap'); return; }
  if(selected.r===p.r&&selected.c===p.c){ setSelected(null); sfx('tap'); return; }
  if(Math.abs(selected.r-p.r)+Math.abs(selected.c-p.c)===1){ attemptSwap(selected,p); return; }
  setSelected(p); sfx('tap');
}
function gDown(x,y,p){
  initAudio();
  if(gesture) return;                  /* 同一次手势里其它事件族的重复 down 直接忽略 */
  if(cur!=='playing') return;
  if(!p) p=cellFromPoint(x,y);
  if(!p) return;
  gesture={p:p,x:x,y:y,moved:false};
  showCursor=false;
  cursor={r:p.r,c:p.c};
}
function gMove(x,y){
  if(!gesture||gesture.moved) return;
  var dx=x-gesture.x, dy=y-gesture.y;
  var th=Math.max(9,cell*0.3);
  if(Math.abs(dx)<th&&Math.abs(dy)<th) return;
  gesture.moved=true;
  var d=(Math.abs(dx)>Math.abs(dy))?{r:0,c:dx>0?1:-1}:{r:dy>0?1:-1,c:0};
  var a=gesture.p, b={r:a.r+d.r,c:a.c+d.c};
  if(inB(b.r,b.c)&&attemptSwap(a,b)) lastDragSwapTs=Date.now();
}
function gUp(){
  if(!gesture) return;
  var g=gesture; gesture=null;
  lastTapTs=Date.now();
  if(g.moved) return;
  handleTap(g.p);
}

canvas.addEventListener('pointerdown',function(e){
  var p=cellFromPoint(e.clientX,e.clientY);
  if(p){ e.preventDefault(); canvas.focus({preventScroll:true}); gDown(e.clientX,e.clientY,p); }
});
canvas.addEventListener('mousedown',function(e){
  var p=cellFromPoint(e.clientX,e.clientY);
  if(p){ e.preventDefault(); gDown(e.clientX,e.clientY,p); }
});
canvas.addEventListener('touchstart',function(e){
  var t=e.touches&&e.touches[0]; if(!t) return;
  var p=cellFromPoint(t.clientX,t.clientY);
  if(p){ gDown(t.clientX,t.clientY,p); }
},{passive:true});
/* 纯合成 click（无 down/up 序列）也能完成点选 */
canvas.addEventListener('click',function(e){
  initAudio();
  if(gesture){ gesture=null; return; }
  if(Date.now()-lastTapTs<350) return;
  handleTap(cellFromPoint(e.clientX,e.clientY));
});

window.addEventListener('pointermove',function(e){ gMove(e.clientX,e.clientY); },{passive:true});
window.addEventListener('mousemove',function(e){ gMove(e.clientX,e.clientY); },{passive:true});
window.addEventListener('touchmove',function(e){
  var t=e.touches&&e.touches[0]; if(t) gMove(t.clientX,t.clientY);
},{passive:true});
window.addEventListener('pointerup',gUp);
window.addEventListener('mouseup',gUp);
window.addEventListener('touchend',gUp);
window.addEventListener('pointercancel',function(){ gesture=null; });
window.addEventListener('touchcancel',function(){ gesture=null; });

window.addEventListener('keydown',function(e){
  initAudio();
  if(cur!=='playing') return;
  var dirs={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
  var d=dirs[e.key];
  if(d){
    e.preventDefault();
    showCursor=true;
    if(selected){
      var nr=selected.r+d[0], nc=selected.c+d[1];
      if(inB(nr,nc)){ cursor={r:nr,c:nc}; attemptSwap(selected,{r:nr,c:nc}); return; }
    }
    cursor={r:clampIdx(cursor.r+d[0]),c:clampIdx(cursor.c+d[1])};
    return;
  }
  if(e.key===' '||e.key==='Enter'){
    var ae=document.activeElement;
    if(ae&&ae.tagName==='BUTTON') return;   /* 按钮自身处理激活 */
    e.preventDefault();
    showCursor=true;
    if(phase!=='idle') return;
    if(selected&&selected.r===cursor.r&&selected.c===cursor.c) setSelected(null);
    else handleTap({r:cursor.r,c:cursor.c});
  }
});

/* ===== 开局 / 重开 ===== */
function startGame(){
  score=0; chain=0; chainVal=0; chainShow=0;
  popups=[]; bursts=[]; fallFrom=null; animData=null; phase='idle';
  gesture=null; queuedRecommend=false; recommended=null; lastDragSwapTs=0;
  hintLayer.innerHTML='';
  setSelected(null);
  grid=new Array(N*N).fill(-1);
  genBoard();
  setState('playing');
  layout();
  updateHUD();
  statusEl.textContent=T('idle'); localizedBanner('welcome',{},1100);
  if(!hasAnyMove()) beginShuffle(); else updateHints();
  syncDom();
}
document.getElementById('start').addEventListener('click',function(){ initAudio(); startGame(); });
document.getElementById('restart').addEventListener('click',function(){ initAudio(); startGame(); });

window.addEventListener('resize',layout);
window.addEventListener('orientationchange',function(){ setTimeout(layout,120); });
window.addEventListener('forge:locale-change',function(){setSelected(selected);if(bannerEl.classList.contains('show')&&bannerState)bannerEl.textContent=T(bannerState.key,bannerState.vars);if(recommended){var hint=hintLayer.querySelector('.hint');if(hint)hint.setAttribute('aria-label',T('hint',{row:recommended.a.r+1,col:recommended.a.c+1,direction:dirName(dirOf(recommended))}));}});

/* ===== 探针 ===== */
try{
  if(new URLSearchParams(window.location.search).has('probe')){
    window.__GAME_DEBUG__={
      getState:function(){
        return {
          mode:'endless',
          state:cur,
          score:score,
          best:best,
          phase:phase,
          chain:chain,
          board:grid.slice(),
          availableMoves:(cur==='playing'?getMoves().length:0),
          selected:selected?{r:selected.r,c:selected.c}:null
        };
      },
      restart:function(){ startGame(); return true; }
    };
  }
}catch(e){}

/* ===== 初始 ===== */
loadBest();
updateHUD();
setState('idle');
document.body.dataset.gameState='idle';
layout();
syncDom();
requestAnimationFrame(frame);
})();



/* forge-platform:begin */

;(() => {
  if (!/^\/(play|version)\//.test(location.pathname)) return;
  const identity = {"projectId":"93620a9e-9916-4d4b-9301-e114ea1aa3a4","versionId":"4ae85fbc-ec4b-44d0-b862-d7d1bdf5a44d"};
  let playerId = "";
  try {
    playerId = safeStorage.getItem("forge-player-id") || "";
    if (!/^player-[0-9a-f-]{36}$/i.test(playerId)) {
      playerId = "player-" + crypto.randomUUID();
      safeStorage.setItem("forge-player-id", playerId);
    }
  } catch { playerId = "player-" + crypto.randomUUID(); }
  let inputMode = "unknown";
  let active = false;
  let terminal = false;
  let frameCount = 0;
  let frameStartedAt = performance.now();
  const frame = () => { frameCount += 1; requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
  addEventListener("keydown", () => { inputMode = "keyboard"; }, { passive: true });
  addEventListener("pointerdown", (event) => { inputMode = event.pointerType === "touch" ? "touch" : "pointer"; }, { passive: true });
  function snapshot() {
    const debug = window.__GAME_DEBUG__;
    const state = typeof debug?.getState === "function" ? debug.getState() : debug?.state || {};
    return {
      level: Number(state?.campaign?.level?.number || state?.level || 1),
      bestScore: Number(state?.bestScore || state?.score || state?.collected || 0),
      averageFps: Math.min(240, frameCount * 1000 / Math.max(1, performance.now() - frameStartedAt)),
    };
  }
  function send(type) {
    const payload = snapshot();
    fetch("/api/play-events", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...identity, playerId, type, inputMode, viewport: innerWidth + "x" + innerHeight, ...payload }) }).catch(() => {});
  }
  addEventListener("game:state-change", (event) => {
    const next = event.detail?.state;
    if (next === "playing" && !active) { active = true; terminal = false; frameCount = 0; frameStartedAt = performance.now(); send("start"); }
    if (next === "won" || next === "stage-complete") { terminal = true; send("complete"); }
    if (next === "lost") { terminal = true; send("fail"); }
  });
  addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement || event.target instanceof HTMLAudioElement) send("resource-error");
  }, true);
  addEventListener("pagehide", () => { if (active && !terminal) send("exit"); });
})();
/* forge-platform:end */
