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
"use strict";
var qs=new URLSearchParams(location.search);
var PROBE=qs.has("probe");
var store=(function(){var s=window.safeStorage;if(s&&typeof s.getItem==="function")return s;var m={};return{getItem:function(k){return k in m?m[k]:null},setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]}};})();

/* ============ 关卡表（前 20 关，按原作内置关卡表规律）
   [宽, 高, 箭头数, 形状标记]
   第 1 关不计时；第 3 关按正方形规则宽高同取较小边；第 4 关点阵按椭圆裁剪；第 10/20 关为大关。 ============ */
var TABLE=[
 [15,20,45,"rect"],
 [17,23,55,"rect"],
 [20,26,65,"square"],
 [24,31,85,"ellipse"],
 [24,32,86,"rect"],
 [25,32,88,"rect"],
 [25,33,89,"rect"],
 [26,33,90,"rect"],
 [26,34,92,"rect"],
 [35,49,158,"rect"],
 [25,32,92,"rect"],
 [25,32,94,"rect"],
 [25,33,96,"rect"],
 [26,33,98,"rect"],
 [26,33,100,"rect"],
 [26,34,102,"rect"],
 [26,34,104,"rect"],
 [26,34,106,"rect"],
 [26,34,108,"rect"],
 [36,50,166,"rect"]
];
var LEVELS=[];
(function(){
  for(var L=1;L<=20;L++){
    var t=TABLE[L-1],w=t[0],h=t[1];
    /* 正方形关：宽高同时取 min(宽,高)，真实棋盘变为正方形 */
    if(t[3]==="square"){var m=Math.min(w,h);w=m;h=m;}
    LEVELS.push({w:w,h:h,n:t[2],shape:t[3]});
  }
})();
var VARIANT=["intro-rect-untimed","countdown-rect","countdown-square-board","countdown-ellipse-dots",
 "countdown-rect-dense","countdown-rect-dense","countdown-rect-dense","countdown-rect-dense","countdown-rect-dense",
 "milestone-wide-rect",
 "countdown-wide-dense","countdown-wide-dense","countdown-wide-dense","countdown-wide-dense","countdown-wide-dense",
 "countdown-wide-dense","countdown-wide-dense","countdown-wide-dense","countdown-wide-dense",
 "milestone-final-wide-rect"];
function ceil5(x){return Math.ceil(x/5)*5;}
function timeLimitOf(L){return L===1?0:ceil5(Math.max(4*LEVELS[L-1].n,120));}
var PAL=["#e05a47","#e2894b","#d8b13f","#a2bb52","#4faa68","#3fa79a","#4b93cd","#5a74c4","#7b66bd","#ad5fb1",
 "#d2578f","#bb6f56","#83944a","#5a8a8a","#946a4d","#cc8663","#6b7ba3","#ab5656","#548c54","#8a548a"];

/* ============ 关卡生成器 ============ */
var DX=[0,1,0,-1],DY=[-1,0,1,0];
function makeRng(seed){var s=seed%233280;if(s<0)s+=233280;return function(){s=(9301*s+49297)%233280;return s/233280;};}

/* 独立复核：在干净棋盘上反复剥离“头部到边界全空”的箭头，
   全部剥完才算可解；同时统计开局可直接射出的箭头数（含头部贴边朝外）。 */
function boardCheck(W,H,arrows){
  var N=W*H,g=new Int32Array(N),i,k;
  for(i=0;i<N;i++)g[i]=-1;
  for(i=0;i<arrows.length;i++){
    var c=arrows[i].cells;
    if(c.length<2)return {solvable:false,shoot:99};
    for(k=0;k<c.length;k++){if(c[k]<0||c[k]>=N||g[c[k]]>=0)return {solvable:false,shoot:99};g[c[k]]=i;}
  }
  function stp(p,d){var x=p%W+DX[d],y=((p/W)|0)+DY[d];if(x<0||y<0||x>=W||y>=H)return -1;return y*W+x;}
  function clr(p,d){var c=stp(p,d);while(c>=0){if(g[c]>=0)return false;c=stp(c,d);}return true;}
  var shoot=0;
  for(i=0;i<arrows.length;i++){var a=arrows[i];if(clr(a.cells[a.cells.length-1],a.dir))shoot++;}
  var gone=new Uint8Array(arrows.length),left=arrows.length,guard=0;
  while(left>0&&guard++<=arrows.length+2){
    var moved=false;
    for(i=0;i<arrows.length;i++){
      if(gone[i])continue;
      var ar=arrows[i];
      if(clr(ar.cells[ar.cells.length-1],ar.dir)){
        gone[i]=1;left--;moved=true;
        for(k=0;k<ar.cells.length;k++)g[ar.cells[k]]=-1;
      }
    }
    if(!moved)break;
  }
  return {solvable:left===0,shoot:shoot};
}
/* 候选盘面评分：可解为前提，其次把开局直射数压到 3 以内，再看箭头数贴近目标与填充度 */
function scoreOf(c,target){
  if(!c||!c.solvable)return -1e12;
  return -Math.max(0,c.shoot-3)*100000-Math.abs(c.count-target)*40+c.filled*2;
}

function generateBoard(W,H,target,seed,bud){
  var N=W*H,grid=new Int32Array(N),A=[],rand=makeRng(seed),tmp=new Int32Array(N),i;
  for(i=0;i<N;i++)grid[i]=-1;
  var cap=Math.max(64,N),depFirst=new Int32Array(cap),depNext=new Int32Array(cap),stack=new Int32Array(cap);
  var mark=new Int32Array(N),stamp=0,verifiedBest=null;
  function xOf(p){return p%W;} function yOf(p){return (p/W)|0;}
  function step(p,d){var x=xOf(p)+DX[d],y=yOf(p)+DY[d];if(x<0||y<0||x>=W||y>=H)return -1;return y*W+x;}
  function head(a){return a.cells[a.cells.length-1];}
  function dirBetween(p,q){var dx=xOf(q)-xOf(p),dy=yOf(q)-yOf(p);if(dy<0)return 0;if(dx>0)return 1;if(dy>0)return 2;return 3;}
  function dirOf(c){return dirBetween(c[c.length-2],c[c.length-1]);}
  function rayClear(p,d,g){var c=step(p,d);while(c>=0){if(g[c]>=0)return false;c=step(c,d);}return true;}
  function firstBlocker(a,g){var c=step(head(a),a.dir);while(c>=0){if(g[c]>=0)return g[c];c=step(c,d0(a));}return -1;}
  function d0(a){return a.dir;}
  /* 全盘可解性判定：固定迭代预算（按格数换算），与机器快慢无关 */
  function solvable(){
    if(bud.n<=0)return false;
    bud.n--;
    if(A.length+4>cap){cap=A.length*2+8;depFirst=new Int32Array(cap);depNext=new Int32Array(cap);stack=new Int32Array(cap);}
    tmp.set(grid);var alive=0,sp=0,k;
    for(k=0;k<A.length;k++)depFirst[k]=-1;
    for(k=0;k<A.length;k++){var a=A[k];if(a.dead)continue;alive++;var b=firstBlocker(a,tmp);
      if(b<0)stack[sp++]=k;else{depNext[k]=depFirst[b];depFirst[b]=k;}}
    var removed=0;
    while(sp>0){var id=stack[--sp];removed++;var ar=A[id],t;
      for(t=0;t<ar.cells.length;t++)tmp[ar.cells[t]]=-1;
      var j=depFirst[id];depFirst[id]=-1;
      while(j!==-1){var nj=depNext[j],bb=firstBlocker(A[j],tmp);
        if(bb<0)stack[sp++]=j;else{depNext[j]=depFirst[bb];depFirst[bb]=j;}
        j=nj;}
    }
    return removed===alive;
  }
  function aliveCount(){var c=0;for(var k=0;k<A.length;k++)if(!A[k].dead)c++;return c;}
  function openings(){var c=0;for(var k=0;k<A.length;k++){var a=A[k];if(a.dead)continue;if(step(head(a),a.dir)<0)c++;}return c;}
  function shootList(){var r=[];for(var k=0;k<A.length;k++){var a=A[k];if(a.dead)continue;if(rayClear(head(a),a.dir,grid))r.push(k);}return r;}
  function shootRatio(){var n=aliveCount();if(!n)return 0;return shootList().length/n;}
  function countTurns(c){var t=0,k;for(k=2;k<c.length;k++){if(dirBetween(c[k-2],c[k-1])!==dirBetween(c[k-1],c[k]))t++;}return t;}
  function commit(cells,dir){var id=A.length,a={cells:cells,dir:dir,dead:false};A.push(a);for(var k=0;k<cells.length;k++)grid[cells[k]]=id;return a;}
  function undoLast(){var a=A[A.length-1];for(var k=0;k<a.cells.length;k++)grid[a.cells[k]]=-1;A.pop();}
  /* 放置：提交前必须通过全盘可解验证，失败立即回滚 */
  function tryPlace(cells,dir){
    if(cells.length<2)return false;
    var hd=cells[cells.length-1];
    if(step(hd,dir)<0&&openings()>=3)return false;
    commit(cells,dir);
    if(solvable())return true;
    undoLast();return false;
  }
  function randEmpty(){for(var t=0;t<24;t++){var p=(rand()*N)|0;if(grid[p]<0)return p;}return -1;}
  function buildPath(startCell,len,maxTurns){
    stamp++;var cells=[startCell];mark[startCell]=stamp;
    var d=(rand()*4)|0,turns=0,k;
    for(k=1;k<len;k++){
      var cur=cells[k-1],cand=[],s=step(cur,d);
      if(s>=0&&grid[s]<0&&mark[s]!==stamp)cand.push(d);
      if(turns<maxTurns){var l=(d+3)%4,r=(d+1)%4,cl=step(cur,l),cr=step(cur,r);
        if(cl>=0&&grid[cl]<0&&mark[cl]!==stamp)cand.push(l);
        if(cr>=0&&grid[cr]<0&&mark[cr]!==stamp)cand.push(r);}
      if(!cand.length)return null;
      var nd;
      if(cand[0]===d&&rand()<0.68)nd=d;else nd=cand[(rand()*cand.length)|0];
      if(nd!==d)turns++;
      d=nd;var nc=step(cur,d);cells.push(nc);mark[nc]=stamp;
    }
    return {cells:cells,dir:d,turns:turns};
  }
  function exportArrows(){
    var out=[],k;
    for(k=0;k<A.length;k++){var a=A[k];if(a.dead||a.cells.length<2)continue;out.push({cells:a.cells.slice(),dir:a.dir});}
    return out;
  }
  function filledCount(){var c=0,k;for(k=0;k<N;k++)if(grid[k]>=0)c++;return c;}
  /* 阶段快照：只保留独立复核确认可解的中间盘面，用作最终兜底 */
  function snap(){
    if(bud.snapsLeft<=0)return;
    bud.snapsLeft--;
    var arr=exportArrows();
    if(!arr.length)return;
    var ck=boardCheck(W,H,arr);
    if(!ck.solvable)return;
    var cand={arrows:arr,count:arr.length,filled:filledCount(),shoot:ck.shoot,solvable:true};
    if(scoreOf(cand,target)>scoreOf(verifiedBest,target))verifiedBest=cand;
  }
  /* 1 长箭头：面积配额 20% */
  var loL=Math.max(6,Math.floor(0.8*W)),hiL=Math.max(loL+2,Math.floor(1.2*W));
  var covered=0,fails=0,quota=Math.floor(N*0.20);
  while(covered<quota&&fails<50&&bud.n>bud.reserve){
    var st=randEmpty();if(st<0){fails++;continue;}
    var p=buildPath(st,loL+((rand()*(hiL-loL+1))|0),8);
    if(p&&tryPlace(p.cells,p.dir)){if(p.cells.length>=loL)covered+=p.cells.length;fails=0;}else fails++;
  }
  /* 2 中箭头：面积配额 25% + 难度阀门 */
  var mLo=Math.max(2,Math.floor(0.4*W)),mHi=Math.max(mLo,Math.floor(1.0*W));
  covered=0;fails=0;quota=Math.floor(N*0.25);
  while(covered<quota&&fails<50&&bud.n>bud.reserve){
    var st2=randEmpty();if(st2<0){fails++;continue;}
    var p2=buildPath(st2,mLo+((rand()*(mHi-mLo+1))|0),8);
    if(p2&&tryPlace(p2.cells,p2.dir)){
      if(A.length>10&&shootRatio()>0.3&&rand()<0.3){undoLast();fails++;}
      else{covered+=p2.cells.length;fails=0;}
    }else fails++;
  }
  /* 3 短箭头 */
  fails=0;var soft=0;
  while(fails<100&&bud.n>bud.reserve){
    var st3=randEmpty();if(st3<0)break;
    var hi=soft>20?3:5,len=2+((rand()*(hi-1))|0);
    var p3=buildPath(st3,len,8);
    if(p3&&tryPlace(p3.cells,p3.dir))fails=0;else{fails++;soft++;}
  }
  snap();
  /* 4 合并至目标箭头数（每次合并前后都验证可解） */
  function tryMerge(){
    for(var t=0;t<24;t++){
      var ai=(rand()*A.length)|0,a=A[ai];if(!a||a.dead)continue;
      var tail=rand()<0.5,endCell=tail?a.cells[0]:a.cells[a.cells.length-1];
      var d=(rand()*4)|0,c=step(endCell,d);if(c<0)continue;
      var bi=grid[c];if(bi<0||bi===ai)continue;var b=A[bi];if(b.dead)continue;
      var comb=null,bFirst=b.cells[0]===c,bLast=b.cells[b.cells.length-1]===c;
      if(!tail){if(bFirst)comb=a.cells.concat(b.cells);else if(bLast)comb=a.cells.concat(b.cells.slice().reverse());}
      else{if(bFirst)comb=b.cells.slice().reverse().concat(a.cells);else if(bLast)comb=b.cells.concat(a.cells);}
      if(!comb)continue;
      var oc=a.cells,od=a.dir,k;
      a.cells=comb;a.dir=dirOf(comb);b.dead=true;
      for(k=0;k<b.cells.length;k++)grid[b.cells[k]]=ai;
      if(solvable())return true;
      for(k=0;k<b.cells.length;k++)grid[b.cells[k]]=bi;
      b.dead=false;a.cells=oc;a.dir=od;
    }
    return false;
  }
  /* 拆分：箭头数不足目标时把一条长箭头拆成两条（每段 ≥2 格） */
  function trySplit(){
    for(var t=0;t<80;t++){
      var ai=(rand()*A.length)|0,a=A[ai];
      if(!a||a.dead||a.cells.length<4)continue;
      var pos=2+((rand()*(a.cells.length-3))|0);
      if(pos<2||a.cells.length-pos<2)continue;
      var c1=a.cells.slice(0,pos),c2=a.cells.slice(pos),k;
      var oc=a.cells,od=a.dir;
      a.cells=c1;a.dir=dirOf(c1);
      var nid=A.length;A.push({cells:c2,dir:dirOf(c2),dead:false});
      for(k=0;k<c2.length;k++)grid[c2[k]]=nid;
      if(openings()<=3&&solvable())return true;
      for(k=0;k<c2.length;k++)grid[c2[k]]=ai;
      A.pop();a.cells=oc;a.dir=od;
    }
    return false;
  }
  var rounds=0;
  while(aliveCount()>target&&rounds<2000&&bud.n>bud.reserve){rounds++;if(!tryMerge())break;}
  /* 5 延长（每格延伸都先验证可解） */
  function extendPass(){
    var progress=false;
    for(var k=0;k<A.length&&bud.n>bud.reserve;k++){
      var a=A[k];if(a.dead)continue;
      for(var side=0;side<2;side++){
        var atHead=side===0,ei=atHead?a.cells.length-1:0;
        if(a.cells.length<2)continue;
        var prev=atHead?a.cells[a.cells.length-2]:a.cells[1];
        var ed=dirBetween(prev,a.cells[ei]);
        var opts=[ed,(ed+1)%4,(ed+3)%4],d=opts[(rand()*3)|0];
        var c=step(a.cells[ei],d);if(c<0||grid[c]>=0)continue;
        if(a.cells.length+1>15&&d!==ed&&countTurns(a.cells)>=8)continue;
        var od=a.dir;
        if(atHead){a.cells.push(c);a.dir=d;}else{a.cells.unshift(c);}
        grid[c]=k;
        if(solvable())progress=true;
        else{grid[c]=-1;if(atHead){a.cells.pop();a.dir=od;}else a.cells.shift();}
      }
    }
    return progress;
  }
  for(var rr=0;rr<100&&bud.n>bud.reserve;rr++){if(!extendPass())break;}
  snap();
  /* 6 收口：把“开局可直接射出”的箭头压到 3 条以内 */
  function isShootable(k){var a=A[k];return !a.dead&&rayClear(head(a),a.dir,grid);}
  function rayEmpties(a){var out=[],c=step(head(a),a.dir);while(c>=0){if(grid[c]<0)out.push(c);c=step(c,a.dir);}return out;}
  function tryBlockRay(ai){
    var a=A[ai],sp=rayEmpties(a),t,s,d;
    if(sp.length){
      for(t=0;t<3&&bud.n>0;t++){
        var cell=sp[(rand()*sp.length)|0];
        if(grid[cell]>=0)continue;
        var pp=buildPath(cell,2+((rand()*3)|0),2);
        if(pp&&tryPlace(pp.cells,pp.dir)&&!rayClear(head(a),a.dir,grid))return true;
      }
      for(s=0;s<sp.length&&s<6&&bud.n>0;s++){
        var e=sp[s];if(grid[e]>=0)continue;
        for(d=0;d<4;d++){
          var nb=step(e,d);if(nb<0)continue;var bi=grid[nb];if(bi<0)continue;var b=A[bi];if(b.dead)continue;
          var isH=b.cells[b.cells.length-1]===nb,isT=b.cells[0]===nb;
          if(!isH&&!isT)continue;
          var od=b.dir;
          if(isH){b.cells.push(e);b.dir=dirOf(b.cells);}else b.cells.unshift(e);
          grid[e]=bi;
          if(solvable()&&!rayClear(head(a),a.dir,grid))return true;
          grid[e]=-1;if(isH){b.cells.pop();b.dir=od;}else b.cells.shift();
        }
      }
    }
    return false;
  }
  function tryReverse(ai){
    var a=A[ai];if(a.dead||a.cells.length<2)return false;
    var oc=a.cells,od=a.dir,rc=oc.slice().reverse();
    a.cells=rc;a.dir=dirOf(rc);
    if(!rayClear(head(a),a.dir,grid)&&solvable())return true;
    a.cells=oc;a.dir=od;return false;
  }
  function tryMergeHead(ai){
    var a=A[ai];if(a.dead)return false;
    if(aliveCount()<=Math.floor(target*0.8))return false;
    var hd=head(a),base=(rand()*4)|0,t;
    for(t=0;t<4;t++){
      var d=(base+t)%4,c=step(hd,d);
      if(c<0)continue;
      var bi=grid[c];if(bi<0||bi===ai)continue;
      var b=A[bi];if(b.dead)continue;
      var comb=null;
      if(b.cells[0]===c)comb=a.cells.concat(b.cells);
      else if(b.cells[b.cells.length-1]===c)comb=a.cells.concat(b.cells.slice().reverse());
      if(!comb)continue;
      var oc=a.cells,od=a.dir,k;
      a.cells=comb;a.dir=dirOf(comb);b.dead=true;
      for(k=0;k<b.cells.length;k++)grid[b.cells[k]]=ai;
      if(!rayClear(head(a),a.dir,grid)&&solvable())return true;
      for(k=0;k<b.cells.length;k++)grid[b.cells[k]]=bi;
      b.dead=false;a.cells=oc;a.dir=od;
    }
    return false;
  }
  function reduceShoot(limit,maxR){
    var stall=0;
    for(var r=0;r<maxR&&bud.n>0;r++){
      var sh=shootList();
      if(sh.length<=limit)return true;
      var ok=false,off=(rand()*sh.length)|0;
      for(var s=0;s<sh.length&&!ok&&bud.n>0;s++){
        var ai=sh[(s+off)%sh.length];
        if(!isShootable(ai))continue;
        ok=tryBlockRay(ai)||tryReverse(ai)||tryMergeHead(ai);
      }
      if(!ok){stall++;if(stall>=2)break;}else stall=0;
    }
    return shootList().length<=limit;
  }
  reduceShoot(3,300);
  /* 7 填满（每次延伸/拆分都验证可解，失败回滚） */
  var lastEmpty=1e9;
  for(var round=0;round<50&&bud.n>bud.reserve;round++){
    var empties=[],i2;
    for(i2=0;i2<N;i2++)if(grid[i2]<0)empties.push(i2);
    if(!empties.length)break;
    for(i2=empties.length-1;i2>0;i2--){var j2=(rand()*(i2+1))|0,tv=empties[i2];empties[i2]=empties[j2];empties[j2]=tv;}
    var progress=false;
    for(var q=0;q<empties.length&&bud.n>bud.reserve;q++){
      var e2=empties[q];if(grid[e2]>=0)continue;var done=false,t2,d2;
      for(t2=0;t2<3&&!done&&bud.n>0;t2++){
        var sp3=buildPath(e2,2+((rand()*3)|0),2);
        if(sp3&&tryPlace(sp3.cells,sp3.dir))done=true;
      }
      for(d2=0;d2<4&&!done&&bud.n>0;d2++){
        var nb2=step(e2,d2);if(nb2<0)continue;var bi2=grid[nb2];if(bi2<0)continue;var b2=A[bi2];
        var isH2=b2.cells[b2.cells.length-1]===nb2,isT2=b2.cells[0]===nb2;
        if(!isH2&&!isT2)continue;
        var od2=b2.dir;
        if(isH2){b2.cells.push(e2);b2.dir=dirOf(b2.cells);}else b2.cells.unshift(e2);
        grid[e2]=bi2;
        if(solvable())done=true;
        else{grid[e2]=-1;if(isH2){b2.cells.pop();b2.dir=od2;}else b2.cells.shift();}
      }
      for(d2=0;d2<4&&!done&&bud.n>0;d2++){
        var nb3=step(e2,d2);if(nb3<0)continue;var bi3=grid[nb3];if(bi3<0)continue;var b3=A[bi3];
        var pos2=b3.cells.indexOf(nb3);if(pos2<1||pos2>b3.cells.length-2)continue;
        var c1b=b3.cells.slice(0,pos2+1).concat([e2]),c2b=b3.cells.slice(pos2+1);
        if(c1b.length<2||c2b.length<2)continue;
        var oc3=b3.cells,od3=b3.dir,k3;
        b3.cells=c1b;b3.dir=dirOf(c1b);grid[e2]=bi3;
        var nid2=A.length;A.push({cells:c2b,dir:dirOf(c2b),dead:false});
        for(k3=0;k3<c2b.length;k3++)grid[c2b[k3]]=nid2;
        if(solvable())done=true;
        else{for(k3=0;k3<c2b.length;k3++)grid[c2b[k3]]=bi3;A.pop();grid[e2]=-1;b3.cells=oc3;b3.dir=od3;}
      }
      if(done)progress=true;
    }
    if(!progress){
      extendPass();
      var left2=0;for(i2=0;i2<N;i2++)if(grid[i2]<0)left2++;
      if(left2>=lastEmpty)break;lastEmpty=left2;
    }
  }
  snap();
  /* 8 再收口 */
  reduceShoot(3,300);
  /* 9 箭头数对齐目标：多则合并，少则拆分（每步仍验证可解） */
  var g=0;
  while(aliveCount()>target&&g<4000&&bud.n>0){g++;if(!tryMerge())break;}
  g=0;
  while(aliveCount()<target&&g<4000&&bud.n>0){g++;if(!trySplit())break;}
  /* 10 最终收口：交付前把直射数再压回 3 条以内 */
  reduceShoot(3,400);
  snap();

  return {arrows:exportArrows(),filled:filledCount(),cells:N,verifiedBest:verifiedBest};
}

/* 绝对兜底：整行同向短箭头，结构上必然可解（仅在所有种子都失败时使用） */
function fallbackBoard(W,H,target){
  var arrows=[],y,x,seg=Math.max(2,Math.round(W*H/Math.max(1,target)));
  for(y=0;y<H;y++){
    x=0;
    while(x<W){
      var rem=W-x,len=Math.min(seg,rem);
      if(rem-len===1)len=rem;
      if(len<2)len=rem;
      var cells=[];
      for(var k=0;k<len;k++)cells.push(y*W+x+k);
      arrows.push({cells:cells,dir:1});
      x+=len;
    }
  }
  var ck=boardCheck(W,H,arrows);
  return {arrows:arrows,count:arrows.length,filled:W*H,shoot:ck.shoot,solvable:ck.solvable};
}

var levelCache={};
function buildLevel(L){
  if(levelCache[L])return levelCache[L];
  var cfg=LEVELS[L-1],N=cfg.w*cfg.h;
  /* 迭代预算只由棋盘格数决定，同一关号在任何设备上得到完全相同的盘面 */
  var per=Math.max(1200,Math.min(6000,Math.round(8e6/N))),total=per*4,best=null,attempt;
  for(attempt=0;attempt<8&&total>0;attempt++){
    var seed=(((100000*L+1)>>>0)^(Math.imul(attempt+1,2654435761)>>>0))>>>0;
    var give=Math.min(per,total);
    var bud={n:give,reserve:Math.round(give*0.3),snapsLeft:6};
    var res=generateBoard(cfg.w,cfg.h,cfg.n,seed%233280,bud);
    total-=give-Math.max(0,bud.n);
    var ck=boardCheck(cfg.w,cfg.h,res.arrows);
    var cand={arrows:res.arrows,count:res.arrows.length,filled:res.filled,shoot:ck.shoot,solvable:ck.solvable};
    if(scoreOf(cand,cfg.n)>scoreOf(best,cfg.n))best=cand;
    if(res.verifiedBest&&scoreOf(res.verifiedBest,cfg.n)>scoreOf(best,cfg.n))best=res.verifiedBest;
    if(best&&best.solvable&&best.shoot<=3&&best.count>=Math.floor(cfg.n*0.85))break;
  }
  if(!best||!best.solvable)best=fallbackBoard(cfg.w,cfg.h,cfg.n);
  var arrows=best.arrows.map(function(a,i){return {cells:a.cells.slice(),dir:a.dir,color:i%20};});
  levelCache[L]={w:cfg.w,h:cfg.h,shape:cfg.shape,target:cfg.n,arrows:arrows,openMoves:best.shoot};
  return levelCache[L];
}

/* ============ 运行时状态 ============ */
var body=document.body,stage=document.getElementById("stage");
var cv=document.getElementById("game-canvas"),ctx=cv.getContext("2d");
var fx=document.getElementById("fx"),fxc=fx.getContext("2d");
var elLvl=document.getElementById("lvl"),elTime=document.getElementById("time"),elHearts=document.getElementById("hearts"),
    elStreak=document.getElementById("streak"),elHome=document.getElementById("home"),elOverlay=document.getElementById("overlay"),
    elOvPanel=document.getElementById("ovpanel"),elSettings=document.getElementById("settings"),elBanner=document.getElementById("banner");
var dpr=1;
var G={level:1,W:0,H:0,shape:"rect",grid:null,arrows:[],alive:0,lives:4,timeLeft:0,timeLimit:0,
  streak:0,lastBlocked:-1,flying:[],snapshot:null,failureReason:null,cursor:0,dirty:true,
  scale:1,offx:0,offy:0,base:8,panned:false,winAt:0,openMoves:0};
var save={bestLevel:1,lastLevel:1,bestStreak:0};
var settings={sfx:true,music:false,vib:true,dark:false,bold:false};
var selLevel=1;

function loadSave(){
  try{
    var s=store.getItem("arrowescape.save");
    if(s){var o=JSON.parse(s);if(o&&typeof o==="object"){save.bestLevel=o.bestLevel||1;save.lastLevel=o.lastLevel||1;save.bestStreak=o.bestStreak||0;}}
    var t=store.getItem("arrowescape.settings");
    if(t){var q=JSON.parse(t);if(q&&typeof q==="object"){for(var k in settings)if(k in q)settings[k]=!!q[k];}}
  }catch(e){}
}
function writeSave(){try{store.setItem("arrowescape.save",JSON.stringify(save));}catch(e){}}
function writeSettings(){try{store.setItem("arrowescape.settings",JSON.stringify(settings));}catch(e){}}

function setState(s){
  if(body.dataset.gameState===s)return;
  body.dataset.gameState=s;
  window.dispatchEvent(new CustomEvent("game:state-change",{detail:{state:s}}));
}

/* ============ 音频 ============ */
var AC=null;
function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){AC=null;}}return AC;}
function tone(freq,dur,type,vol,delay,ctxVol){
  if(!settings.sfx&&!ctxVol)return;
  var a=ac();if(!a)return;
  var t0=a.currentTime+(delay||0);
  var o=a.createOscillator(),g=a.createGain();
  o.type=type||"sine";o.frequency.setValueAtTime(freq,t0);
  g.gain.setValueAtTime(0.0001,t0);
  g.gain.exponentialRampToValueAtTime(vol||0.12,t0+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(g);g.connect(a.destination);o.start(t0);o.stop(t0+dur+0.03);
}
var SCALE=[523.25,587.33,659.25,783.99,880,1046.5,1174.7,1318.5];
var shootStep=0,lastShootAt=0,lastVib=0;
function sndShoot(){
  var now=performance.now();
  if(now-lastShootAt<900)shootStep=Math.min(7,shootStep+1);else shootStep=0;
  lastShootAt=now;
  tone(SCALE[shootStep],0.16,"triangle",0.13,0);
}
function sndBlocked(){tone(120,0.18,"square",0.10,0);tone(84,0.22,"square",0.09,0.02);}
function sndWin(tier){
  var base=[523.25,659.25,783.99,1046.5,1318.5],i;
  for(i=0;i<base.length;i++)tone(base[i],0.34,"triangle",0.12,i*0.09);
  for(var L=0;L<tier;L++)for(i=0;i<3;i++)tone(base[i+1]*(1+0.25*L),0.28,"sine",0.07,0.45+L*0.16+i*0.05);
}
function vib(p){
  if(!settings.vib||!navigator.vibrate)return;
  var now=performance.now();if(now-lastVib<40)return;lastVib=now;
  try{navigator.vibrate(p);}catch(e){}
}
var bgmTimer=null,bar=0;
function bgmBar(){
  var a=ac();if(!a)return;
  var roots=[130.81,110,87.31,98],r=roots[bar%4],i;
  tone(r,0.9,"sine",0.05,0,true);
  var mel=[0,4,7,12,7,4,7,2];
  for(i=0;i<8;i++){
    if(i===3&&Math.random()<0.4)continue;
    tone(r*2*Math.pow(2,mel[i]/12),0.25,"triangle",0.035,i*0.42,true);
  }
  bar++;
}
function startBgm(){if(bgmTimer||!settings.music)return;bgmBar();bgmTimer=setInterval(bgmBar,3360);}
function stopBgm(){if(bgmTimer){clearInterval(bgmTimer);bgmTimer=null;}}

/* ============ 视图 ============ */
function resize(){
  dpr=Math.min(2,window.devicePixelRatio||1);
  var w=stage.clientWidth,h=stage.clientHeight;
  cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
  fx.width=cv.width;fx.height=cv.height;
  computeBase();clampView();G.dirty=true;
}
function computeBase(){
  var w=stage.clientWidth,h=stage.clientHeight;
  if(!G.W)return;
  G.base=Math.max(4,Math.min((w-28)/G.W,(h-28)/G.H));
}
function cellSize(){return G.base*G.scale;}
function clampView(){
  var vw=stage.clientWidth,vh=stage.clientHeight,cs=cellSize(),cw=G.W*cs,ch=G.H*cs;
  var slack=G.panned?100:0;
  if(cw<=vw){var c=(vw-cw)/2;G.offx=Math.max(c-slack,Math.min(c+slack,G.offx));}
  else G.offx=Math.max(vw-cw-30-slack,Math.min(30+slack,G.offx));
  if(ch<=vh){var c2=(vh-ch)/2;G.offy=Math.max(c2-slack,Math.min(c2+slack,G.offy));}
  else G.offy=Math.max(vh-ch-30-slack,Math.min(30+slack,G.offy));
}
function fitView(){
  G.scale=1;G.panned=false;computeBase();
  var cs=cellSize();
  G.offx=(stage.clientWidth-G.W*cs)/2;G.offy=(stage.clientHeight-G.H*cs)/2;
  clampView();G.dirty=true;
}
function zoomAt(px,py,f){
  var old=G.scale,ns=Math.max(1,Math.min(3,old*f));
  if(ns===old)return;
  var k=ns/old;
  G.offx=px-(px-G.offx)*k;G.offy=py-(py-G.offy)*k;
  G.scale=ns;clampView();G.dirty=true;
}

/* ============ 绘制 ============ */
function lineWidthFor(cs){return Math.max(2.2,0.26*cs)*(settings.bold?1.35:1);}
/* 形状标记参与绘制：ellipse 仅保留内接椭圆内的点阵；square 为满格点阵并勾一圈方形轮廓；rect 为满格点阵 */
function dotVisible(x,y){
  if(G.shape==="ellipse"){
    var a1=2*(x-(G.W-1)/2)/G.W,b1=2*(y-(G.H-1)/2)/G.H;
    return a1*a1+b1*b1<=1;
  }
  return true;
}
function headTriangle(cx,cy,ux,uy,cs){
  var tipx=cx+ux*0.42*cs,tipy=cy+uy*0.42*cs;
  var bx=cx-ux*0.2*cs,by=cy-uy*0.2*cs,px=-uy,py=ux,hw=0.33*cs;
  ctx.beginPath();
  ctx.moveTo(tipx,tipy);ctx.lineTo(bx+px*hw,by+py*hw);ctx.lineTo(bx-px*hw,by-py*hw);ctx.closePath();
  ctx.lineWidth=Math.max(1,0.04*cs)*2;ctx.stroke();ctx.fill();
}
/* 静止箭头：直接按格心折线绘制 */
function drawArrow(a,cs,color){
  var i,x,y;
  ctx.strokeStyle=color;ctx.fillStyle=color;
  ctx.lineWidth=lineWidthFor(cs);ctx.lineCap="round";ctx.lineJoin="round";
  ctx.beginPath();
  for(i=0;i<a.cells.length;i++){
    var c=a.cells[i];x=(c%G.W+0.5)*cs;y=(((c/G.W)|0)+0.5)*cs;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.stroke();
  var hc=a.cells[a.cells.length-1];
  headTriangle((hc%G.W+0.5)*cs,(((hc/G.W)|0)+0.5)*cs,DX[a.dir],DY[a.dir],cs);
}
/* 飞出中的箭头：整条折线沿自身路径滑行（尾巴跟着路径过弯），头部出口后沿朝向直行 */
var FP=[0,0],FQ=[0,0];
function flyPoint(f,u,out){
  var m=f.traj.length;
  if(u>=m-1){var b=f.traj[m-1],d=u-(m-1);out[0]=b[0]+DX[f.dir]*d;out[1]=b[1]+DY[f.dir]*d;return out;}
  if(u<=0){out[0]=f.traj[0][0];out[1]=f.traj[0][1];return out;}
  var i=Math.floor(u),fr=u-i,p=f.traj[i],q=f.traj[i+1];
  out[0]=p[0]+(q[0]-p[0])*fr;out[1]=p[1]+(q[1]-p[1])*fr;return out;
}
function drawFly(f,cs,now){
  var t=(now-f.start)/f.dur;if(t<0)t=0;if(t>1)t=1;
  var s=t*f.total,L=f.len,u1=s+L-1,i;
  ctx.strokeStyle=f.color;ctx.fillStyle=f.color;
  ctx.lineWidth=lineWidthFor(cs);ctx.lineCap="round";ctx.lineJoin="round";
  ctx.beginPath();
  flyPoint(f,s,FP);ctx.moveTo(FP[0]*cs,FP[1]*cs);
  for(i=Math.floor(s)+1;i<u1-1e-6;i++){
    if(i<=s+1e-6)continue;
    flyPoint(f,i,FP);ctx.lineTo(FP[0]*cs,FP[1]*cs);
  }
  flyPoint(f,u1,FQ);ctx.lineTo(FQ[0]*cs,FQ[1]*cs);
  ctx.stroke();
  flyPoint(f,Math.max(0,u1-0.08),FP);
  var hx=FQ[0]-FP[0],hy=FQ[1]-FP[1],hl=Math.sqrt(hx*hx+hy*hy);
  var ux,uy;
  if(hl<1e-6){ux=DX[f.dir];uy=DY[f.dir];}else{ux=hx/hl;uy=hy/hl;}
  headTriangle(FQ[0]*cs,FQ[1]*cs,ux,uy,cs);
}
function draw(){
  var w=cv.width,h=cv.height,cs=cellSize();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,w,h);
  var css=getComputedStyle(body);
  ctx.fillStyle=css.getPropertyValue("--paper").trim()||"#fff";
  ctx.fillRect(0,0,w,h);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.translate(G.offx,G.offy);
  if(!G.W){ctx.setTransform(1,0,0,1,0,0);return;}
  var dotCol=css.getPropertyValue("--dot").trim()||"#ccc";
  var r=Math.max(1,0.075*cs),x,y;
  if(G.shape==="square"){
    ctx.strokeStyle=dotCol;ctx.lineWidth=Math.max(1,0.06*cs);ctx.setLineDash([cs*0.5,cs*0.35]);
    ctx.strokeRect(cs*0.2,cs*0.2,G.W*cs-cs*0.4,G.H*cs-cs*0.4);
    ctx.setLineDash([]);
  }
  ctx.fillStyle=dotCol;
  var vw=stage.clientWidth,vh=stage.clientHeight;
  for(y=0;y<G.H;y++){
    var cy=(y+0.5)*cs+G.offy;if(cy<-cs||cy>vh+cs)continue;
    for(x=0;x<G.W;x++){
      var cx=(x+0.5)*cs+G.offx;if(cx<-cs||cx>vw+cs)continue;
      if(!dotVisible(x,y))continue;
      ctx.beginPath();ctx.arc((x+0.5)*cs,(y+0.5)*cs,r,0,6.2832);ctx.fill();
    }
  }
  var now=performance.now(),i;
  for(i=0;i<G.arrows.length;i++){
    var a=G.arrows[i];if(a.dead)continue;
    var col=PAL[a.color];
    if(a.dark)col=settings.dark?"#8a94a6":"#1a1a1a";
    if(a.flashUntil&&now<a.flashUntil)col=(Math.floor(now/80)%2)?"#e03a2a":col;
    drawArrow(a,cs,col);
  }
  for(i=0;i<G.flying.length;i++)drawFly(G.flying[i],cs,now);
  if(G.cursor>=0&&body.dataset.gameState==="playing"){
    var cx2=(G.cursor%G.W)*cs,cy2=((G.cursor/G.W)|0)*cs;
    ctx.strokeStyle=css.getPropertyValue("--ink").trim()||"#000";
    ctx.lineWidth=2;ctx.setLineDash([4,3]);
    ctx.strokeRect(cx2+1,cy2+1,cs-2,cs-2);ctx.setLineDash([]);
  }
  ctx.setTransform(1,0,0,1,0,0);
}

/* ============ 纸屑 ============ */
var conf=[],confUntil=0;
var GOLD=["#e8c35a","#f0d98a","#c9a23a","#fff0b8","#d9b44a"];
function confetti(tier){
  var counts=[150,190,240,320,420],durs=[2800,3000,3200,3600,4200];
  var n=counts[tier],dur=durs[tier],W=stage.clientWidth,H=stage.clientHeight;
  conf=[];
  for(var i=0;i<n;i++){
    var left=i%2===0;
    conf.push({x:left?-10:W+10,y:H*(0.3+Math.random()*0.4),
      vx:(left?1:-1)*(3.5+Math.random()*(5.5+tier)),vy:-(6+Math.random()*(5+tier)),
      w:5+Math.random()*6,h:7+Math.random()*8,rot:Math.random()*6.28,vr:(Math.random()-0.5)*0.35,
      c:(tier===4?GOLD:PAL)[(Math.random()*(tier===4?5:20))|0]});
  }
  confUntil=performance.now()+dur;
}
function drawConf(){
  fxc.setTransform(1,0,0,1,0,0);fxc.clearRect(0,0,fx.width,fx.height);
  if(!conf.length)return;
  fxc.setTransform(dpr,0,0,dpr,0,0);
  for(var i=0;i<conf.length;i++){
    var p=conf[i];
    p.vy+=0.17;p.vx*=0.992;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;
    fxc.save();fxc.translate(p.x,p.y);fxc.rotate(p.rot);
    fxc.fillStyle=p.c;fxc.fillRect(-p.w/2,-p.h/2,p.w,p.h);fxc.restore();
  }
  if(performance.now()>confUntil){conf=[];fxc.setTransform(1,0,0,1,0,0);fxc.clearRect(0,0,fx.width,fx.height);}
}

/* ============ HUD ============ */
function renderHud(){
  elLvl.textContent="第 "+G.level+" 关";
  if(G.timeLimit<=0){elTime.textContent="—";elTime.classList.remove("warn");}
  else{
    var s=Math.max(0,Math.ceil(G.timeLeft));
    elTime.textContent=Math.floor(s/60)+":"+(s%60<10?"0":"")+(s%60);
    elTime.classList.toggle("warn",s<=60);
  }
  var html="";
  for(var i=0;i<4;i++)html+='<span class="'+(i<G.lives?"":"off")+'">'+(i<G.lives?"♥":"♡")+"</span>";
  elHearts.innerHTML=html;
  if(G.streak>=2){elStreak.classList.remove("hide");elStreak.textContent="连胜×"+G.streak;}
  else elStreak.classList.add("hide");
}
function shakeStreak(){
  if(G.streak>=2){elStreak.classList.add("shake");setTimeout(function(){elStreak.classList.remove("shake");},420);}
}

/* ============ 关卡流程 ============ */
function applyLevel(L){
  var d=buildLevel(L);
  G.level=L;G.W=d.w;G.H=d.h;G.shape=d.shape;G.openMoves=d.openMoves||0;
  G.grid=new Int32Array(G.W*G.H);
  for(var i=0;i<G.grid.length;i++)G.grid[i]=-1;
  G.arrows=[];
  for(i=0;i<d.arrows.length;i++){
    var s=d.arrows[i],a={cells:s.cells.slice(),dir:s.dir,color:s.color,dead:false,dark:false,flashUntil:0,id:i};
    G.arrows.push(a);
    for(var k=0;k<a.cells.length;k++)G.grid[a.cells[k]]=i;
  }
  G.alive=G.arrows.length;
  G.snapshot=d.arrows.map(function(s){return {cells:s.cells.slice(),dir:s.dir,color:s.color};});
  G.timeLimit=timeLimitOf(L);G.timeLeft=G.timeLimit;
  G.lives=4;G.lastBlocked=-1;G.flying=[];G.failureReason=null;
  G.cursor=(((G.H/2)|0)*G.W+((G.W/2)|0));
  save.lastLevel=L;if(L>save.bestLevel)save.bestLevel=L;writeSave();
  fitView();renderHud();
}
function beginLevel(L,resetStreak){
  L=Math.max(1,Math.min(20,L|0));
  if(resetStreak){if(G.streak>=2)shakeStreak();G.streak=0;}
  applyLevel(L);
  hideOverlay();elHome.style.display="none";elBanner.style.display="none";
  conf=[];fxc.setTransform(1,0,0,1,0,0);fxc.clearRect(0,0,fx.width,fx.height);
  setState("playing");
  G.dirty=true;renderHud();
}
function restoreSnapshot(){
  for(var i=0;i<G.grid.length;i++)G.grid[i]=-1;
  G.arrows=[];
  for(i=0;i<G.snapshot.length;i++){
    var s=G.snapshot[i],a={cells:s.cells.slice(),dir:s.dir,color:s.color,dead:false,dark:false,flashUntil:0,id:i};
    G.arrows.push(a);
    for(var k=0;k<a.cells.length;k++)G.grid[a.cells[k]]=i;
  }
  G.alive=G.arrows.length;G.flying=[];G.lives=4;G.lastBlocked=-1;
  G.timeLimit=timeLimitOf(G.level);G.timeLeft=G.timeLimit;G.failureReason=null;
}
function retryLevel(){
  if(G.streak>=2)shakeStreak();
  G.streak=0;
  restoreSnapshot();hideOverlay();elBanner.style.display="none";
  setState("playing");G.dirty=true;renderHud();
}

/* ============ 交互规则 ============ */
function stepIdx(i,d){var x=i%G.W+DX[d],y=((i/G.W)|0)+DY[d];if(x<0||y<0||x>=G.W||y>=G.H)return -1;return y*G.W+x;}
function rayClearLive(a){
  var c=stepIdx(a.cells[a.cells.length-1],a.dir);
  while(c>=0){if(G.grid[c]>=0)return false;c=stepIdx(c,a.dir);}
  return true;
}
function tapCell(idx){
  if(body.dataset.gameState!=="playing"||paused())return;
  if(idx<0||idx>=G.grid.length)return;
  var id=G.grid[idx];if(id<0)return;
  var a=G.arrows[id];if(!a||a.dead)return;
  if(rayClearLive(a))shoot(a);else blocked(a);
}
function shoot(a){
  var hd=a.cells[a.cells.length-1],x=hd%G.W,y=(hd/G.W)|0,steps,k;
  if(a.dir===0)steps=y+1;else if(a.dir===2)steps=G.H-y;else if(a.dir===1)steps=G.W-x;else steps=x+1;
  var ext=steps+2;
  for(k=0;k<a.cells.length;k++)G.grid[a.cells[k]]=-1;
  a.dead=true;G.alive--;
  /* 轨迹 = 原折线格心 + 头部沿朝向延伸 ext 格；整条箭头沿该轨迹滑行 */
  var traj=[];
  for(k=0;k<a.cells.length;k++){var c=a.cells[k];traj.push([(c%G.W)+0.5,(((c/G.W)|0)+0.5)]);}
  var last=traj[traj.length-1];
  for(k=1;k<=ext;k++)traj.push([last[0]+DX[a.dir]*k,last[1]+DY[a.dir]*k]);
  var pts=traj.length;
  G.flying.push({traj:traj,len:a.cells.length,dir:a.dir,
    color:a.dark?(settings.dark?"#8a94a6":"#1a1a1a"):PAL[a.color],
    start:performance.now(),dur:Math.max(120,(pts-1)*70),total:pts-1});
  G.lastBlocked=-1;sndShoot();vib(35);G.dirty=true;
}
function blocked(a){
  if(G.lastBlocked!==a.id){G.lives--;G.lastBlocked=a.id;}
  a.dark=true;a.flashUntil=performance.now()+320;
  sndBlocked();vib([50,40,50]);G.dirty=true;renderHud();
  if(G.lives<=0){setTimeout(function(){if(body.dataset.gameState==="playing")lose("lives-exhausted");},320);}
}
function paused(){return elOverlay.style.display==="flex"||elSettings.style.display==="flex"||elHome.style.display!=="none";}

function win(){
  if(body.dataset.gameState==="won")return;
  G.streak++;
  var newBest=false;
  if(G.streak>save.bestStreak){save.bestStreak=G.streak;newBest=true;}
  if(G.level+1>save.bestLevel&&G.level<20)save.bestLevel=Math.max(save.bestLevel,G.level);
  writeSave();
  var tier=G.streak>=15?4:G.streak>=10?3:G.streak>=5?2:G.streak>=3?1:0;
  var milestone=(G.level===10||G.level===20);
  if(milestone)tier=4;
  setState("won");renderHud();
  sndWin(tier);
  var pats=[[0,90],[0,55,45,80],[0,55,45,55,45,110],[0,60,40,60,40,60,40,130],[0,70,40,70,40,70,40,70,40,160]];
  vib(pats[tier]);
  confetti(tier);
  var titles=["关卡完成！","势头正好！","相当漂亮！","势不可挡！","传奇表现！"];
  var title=titles[tier];
  if(tier===4&&G.streak>=20&&G.streak%5===0)title="传奇表现！×"+G.streak;
  if(milestone)title="抵达第 "+G.level+" 关！";
  if(tier>=1||milestone){
    elBanner.querySelector("b").textContent=title;
    elBanner.querySelector("i").textContent=(newBest&&!milestone)?"新纪录":"";
    elBanner.classList.toggle("gold",milestone);
    elBanner.style.display="block";
  }
  setTimeout(function(){
    if(body.dataset.gameState!=="won")return;
    elBanner.style.display="none";
    if(G.level>=20){
      showOverlay("全部 20 关通过！","最佳连胜 "+save.bestStreak+" · 本关误判 "+(4-G.lives)+" 次",
        [{t:"再玩一次第 20 关",f:function(){beginLevel(20,true);}},{t:"返回首页",f:goHome}]);
    }else{
      showOverlay("第 "+G.level+" 关完成","连胜 "+G.streak+" · 剩余生命 "+G.lives+(G.timeLimit>0?(" · 剩余 "+Math.ceil(G.timeLeft)+" 秒"):""),
        [{t:"下一关",f:function(){beginLevel(G.level+1,false);}},{t:"重玩本关",f:function(){beginLevel(G.level,true);}},{t:"返回首页",f:goHome}]);
    }
  },700);
}
function lose(reason){
  G.failureReason=reason;
  setState("lost");renderHud();
  vib([0,90,70,140]);
  var title=reason==="time-up"?"时间到":reason==="lives-exhausted"?"生命耗尽":"本关中断";
  var sub=reason==="time-up"?"倒计时归零，本关中断。":reason==="lives-exhausted"?"四颗心都用完了：被挡的箭头需要先让前面的箭头离场。":"原因："+reason;
  var btns=[];
  if(reason==="time-up")btns.push({t:"补时 +120 秒",f:function(){G.timeLeft=120;hideOverlay();setState("playing");renderHud();}});
  else btns.push({t:"补 1 颗心继续",f:function(){G.lives=1;G.lastBlocked=-1;hideOverlay();setState("playing");renderHud();}});
  btns.push({t:"重试本关",f:retryLevel});
  btns.push({t:"返回首页",f:goHome});
  showOverlay(title,sub,btns);
}
function goHome(){
  hideOverlay();elBanner.style.display="none";
  selLevel=G.level;syncHome();
  elHome.style.display="block";
  setState("idle");
}

/* ============ 浮层 ============ */
function showOverlay(title,sub,buttons){
  var h='<h3>'+title+"</h3><p>"+sub+"</p>";
  elOvPanel.innerHTML=h;
  buttons.forEach(function(b){
    var btn=document.createElement("button");
    btn.className="sk";btn.type="button";btn.textContent=b.t;
    btn.addEventListener("click",b.f);
    elOvPanel.appendChild(btn);
  });
  elOverlay.style.display="flex";
}
function hideOverlay(){elOverlay.style.display="none";elOvPanel.innerHTML="";}

/* ============ 输入 ============ */
var pointers={},panStart=null,pinchStart=null,downInfo=null;
cv.addEventListener("pointerdown",function(e){
  cv.setPointerCapture(e.pointerId);
  pointers[e.pointerId]={x:e.clientX,y:e.clientY};
  var ids=Object.keys(pointers);
  if(ids.length===1){
    downInfo={x:e.clientX,y:e.clientY,moved:false,id:e.pointerId};
    panStart={x:e.clientX,y:e.clientY,ox:G.offx,oy:G.offy};
  }else if(ids.length===2){
    var a=pointers[ids[0]],b=pointers[ids[1]];
    pinchStart={d:Math.hypot(a.x-b.x,a.y-b.y),s:G.scale,
      cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,ox:G.offx,oy:G.offy};
    downInfo=null;
  }
  ensureAudio();
});
cv.addEventListener("pointermove",function(e){
  if(!pointers[e.pointerId])return;
  pointers[e.pointerId]={x:e.clientX,y:e.clientY};
  var ids=Object.keys(pointers);
  if(ids.length>=2&&pinchStart){
    var a=pointers[ids[0]],b=pointers[ids[1]],d=Math.hypot(a.x-b.x,a.y-b.y);
    if(d>4){
      var ns=Math.max(1,Math.min(3,pinchStart.s*(d/pinchStart.d)));
      var rect=cv.getBoundingClientRect(),px=pinchStart.cx-rect.left,py=pinchStart.cy-rect.top;
      var k=ns/G.scale;
      G.offx=px-(px-G.offx)*k;G.offy=py-(py-G.offy)*k;G.scale=ns;
      G.panned=true;clampView();G.dirty=true;
    }
    return;
  }
  if(downInfo&&e.pointerId===downInfo.id&&panStart){
    var dx=e.clientX-downInfo.x,dy=e.clientY-downInfo.y;
    if(!downInfo.moved&&dx*dx+dy*dy>81)downInfo.moved=true;
    if(downInfo.moved){
      G.panned=true;
      G.offx=panStart.ox+(e.clientX-panStart.x);
      G.offy=panStart.oy+(e.clientY-panStart.y);
      clampView();G.dirty=true;
    }
  }
});
function endPointer(e){
  if(downInfo&&e.pointerId===downInfo.id&&!downInfo.moved){
    var rect=cv.getBoundingClientRect(),cs=cellSize();
    var gx=Math.floor((e.clientX-rect.left-G.offx)/cs),gy=Math.floor((e.clientY-rect.top-G.offy)/cs);
    if(gx>=0&&gy>=0&&gx<G.W&&gy<G.H){G.cursor=gy*G.W+gx;tapCell(G.cursor);}
  }
  delete pointers[e.pointerId];
  if(Object.keys(pointers).length<2)pinchStart=null;
  if(downInfo&&e.pointerId===downInfo.id){downInfo=null;panStart=null;}
}
cv.addEventListener("pointerup",endPointer);
cv.addEventListener("pointercancel",function(e){delete pointers[e.pointerId];downInfo=null;panStart=null;pinchStart=null;});
cv.addEventListener("wheel",function(e){
  e.preventDefault();
  var rect=cv.getBoundingClientRect();
  zoomAt(e.clientX-rect.left,e.clientY-rect.top,e.deltaY<0?1.12:0.89);
},{passive:false});

document.getElementById("zin").addEventListener("click",function(){zoomAt(stage.clientWidth/2,stage.clientHeight/2,1.25);});
document.getElementById("zout").addEventListener("click",function(){zoomAt(stage.clientWidth/2,stage.clientHeight/2,0.8);});

window.addEventListener("keydown",function(e){
  if(e.key==="Escape"){toggleSettings();e.preventDefault();return;}
  if(body.dataset.gameState!=="playing"||paused())return;
  var k=e.key,moved=-1;
  if(k==="ArrowUp")moved=0;else if(k==="ArrowRight")moved=1;else if(k==="ArrowDown")moved=2;else if(k==="ArrowLeft")moved=3;
  if(moved>=0){
    var n=stepIdx(G.cursor,moved);
    if(n>=0)G.cursor=n;
    keepCursorVisible();G.dirty=true;e.preventDefault();return;
  }
  if(k==="Enter"||k===" "){ensureAudio();tapCell(G.cursor);e.preventDefault();return;}
  if(k==="+"||k==="="){zoomAt(stage.clientWidth/2,stage.clientHeight/2,1.25);e.preventDefault();}
  if(k==="-"||k==="_"){zoomAt(stage.clientWidth/2,stage.clientHeight/2,0.8);e.preventDefault();}
});
function keepCursorVisible(){
  var cs=cellSize(),x=(G.cursor%G.W)*cs+G.offx,y=((G.cursor/G.W)|0)*cs+G.offy;
  var vw=stage.clientWidth,vh=stage.clientHeight,m=cs*1.5;
  if(x<m)G.offx+=m-x;if(x+cs>vw-m)G.offx-=(x+cs)-(vw-m);
  if(y<m)G.offy+=m-y;if(y+cs>vh-m)G.offy-=(y+cs)-(vh-m);
  G.panned=true;clampView();
}
function ensureAudio(){ac();if(settings.music)startBgm();}

/* ============ 首页 / 设置 ============ */
var elLevels=document.getElementById("levels"),elStart=document.getElementById("start"),elSaveInfo=document.getElementById("saveinfo");
function syncHome(){
  elStart.textContent="开始 第 "+selLevel+" 关";
  var kids=elLevels.children;
  for(var i=0;i<kids.length;i++)kids[i].setAttribute("aria-pressed",(i+1===selLevel)?"true":"false");
  elSaveInfo.textContent="最高抵达：第 "+save.bestLevel+" 关 ｜ 上次：第 "+save.lastLevel+" 关 ｜ 最佳连胜："+save.bestStreak;
}
(function buildLevelButtons(){
  for(var i=1;i<=20;i++){
    (function(n){
      var b=document.createElement("button");
      b.className="sk";b.type="button";b.textContent=n;
      b.setAttribute("aria-label","第 "+n+" 关");
      b.addEventListener("click",function(){selLevel=n;syncHome();});
      elLevels.appendChild(b);
    })(i);
  }
})();
elStart.addEventListener("click",function(){ensureAudio();beginLevel(selLevel,true);});
document.getElementById("restart").addEventListener("click",function(){
  ensureAudio();
  if(body.dataset.gameState==="idle")beginLevel(selLevel,true);
  else beginLevel(G.level,true);
});
document.getElementById("gear").addEventListener("click",toggleSettings);
document.getElementById("sclose").addEventListener("click",closeSettings);
document.getElementById("s-resume").addEventListener("click",closeSettings);
function toggleSettings(){if(elSettings.style.display==="flex")closeSettings();else{elSettings.style.display="flex";syncSettings();}}
function closeSettings(){elSettings.style.display="none";}
function syncSettings(){
  document.getElementById("t-sfx").setAttribute("aria-pressed",settings.sfx?"true":"false");
  document.getElementById("t-mus").setAttribute("aria-pressed",settings.music?"true":"false");
  document.getElementById("t-vib").setAttribute("aria-pressed",settings.vib?"true":"false");
  document.getElementById("t-wid").setAttribute("aria-pressed",settings.bold?"true":"false");
  document.getElementById("t-thm").textContent="主题："+(settings.dark?"夜间":"明亮");
}
document.getElementById("t-sfx").addEventListener("click",function(){settings.sfx=!settings.sfx;writeSettings();syncSettings();});
document.getElementById("t-mus").addEventListener("click",function(){settings.music=!settings.music;writeSettings();syncSettings();if(settings.music)startBgm();else stopBgm();});
document.getElementById("t-vib").addEventListener("click",function(){settings.vib=!settings.vib;writeSettings();syncSettings();if(settings.vib)vib(12);});
document.getElementById("t-wid").addEventListener("click",function(){settings.bold=!settings.bold;writeSettings();syncSettings();G.dirty=true;});
document.getElementById("t-thm").addEventListener("click",function(){
  settings.dark=!settings.dark;body.dataset.theme=settings.dark?"dark":"light";writeSettings();syncSettings();G.dirty=true;});
document.getElementById("s-retry").addEventListener("click",function(){closeSettings();beginLevel(G.level,true);});
document.getElementById("s-wipe").addEventListener("click",function(){
  closeSettings();
  showOverlay("清空进度？","将清除最高关、上次所在关与最佳连胜记录。",
   [{t:"确认清空",f:function(){save={bestLevel:1,lastLevel:1,bestStreak:0};G.streak=0;writeSave();hideOverlay();syncHome();renderHud();}},
    {t:"取消",f:function(){hideOverlay();}}]);
});

/* ============ 主循环 ============ */
var lastT=performance.now();
function loop(now){
  var dt=Math.min(0.1,(now-lastT)/1000);lastT=now;
  if(body.dataset.gameState==="playing"&&!paused()&&G.timeLimit>0){
    G.timeLeft-=dt;
    if(G.timeLeft<=0){G.timeLeft=0;renderHud();lose("time-up");}
    else if(Math.ceil(G.timeLeft)!==Math.ceil(G.timeLeft+dt))renderHud();
  }
  if(G.flying.length){
    for(var i=G.flying.length-1;i>=0;i--)if(now-G.flying[i].start>=G.flying[i].dur)G.flying.splice(i,1);
    G.dirty=true;
  }
  var flashing=false;
  for(var k=0;k<G.arrows.length;k++)if(G.arrows[k].flashUntil>now){flashing=true;break;}
  if(flashing)G.dirty=true;
  if(body.dataset.gameState==="playing"&&G.alive===0&&!G.flying.length&&!flashing)win();
  if(G.dirty){draw();G.dirty=false;}
  if(conf.length)drawConf();
  requestAnimationFrame(loop);
}

/* ============ 启动 ============ */
loadSave();
body.dataset.theme=settings.dark?"dark":"light";
selLevel=Math.max(1,Math.min(20,save.lastLevel||1));
var qlv=parseInt(qs.get("level"),10);
if(qlv)selLevel=Math.max(1,Math.min(20,qlv));
syncSettings();syncHome();renderHud();
window.addEventListener("resize",resize);
resize();
setState("idle");
requestAnimationFrame(loop);

if(PROBE){
  window.__GAME_DEBUG__={
    getState:function(){
      var cfg=LEVELS[G.level-1],tl=timeLimitOf(G.level);
      return {
        state:body.dataset.gameState,
        level:G.level,
        difficulty:{boardWidth:cfg.w,boardHeight:cfg.h,arrowCount:cfg.n,timeLimitSeconds:tl},
        contentVariant:VARIANT[G.level-1],
        runtimeSignature:"L"+G.level+"|"+cfg.w+"x"+cfg.h+"|a"+cfg.n+"|t"+tl+"|"+cfg.shape+
          ((G.level===10||G.level===20)?"|milestone":(G.level===1?"|untimed":"|timed")),
        mechanicsActive:["core-mechanic-1","core-mechanic-2"].concat(tl>0?["countdown"]:[]),
        lives:G.lives,timeLeft:Math.max(0,Math.ceil(G.timeLeft)),streak:G.streak,
        boardCells:G.W*G.H,arrowsOnBoard:G.arrows.length,openMoves:G.openMoves,
        arrowsLeft:G.alive,failureReason:G.failureReason
      };
    },
    setLevel:function(n){n=Math.max(1,Math.min(20,parseInt(n,10)||1));beginLevel(n,true);return n;},
    restart:function(){beginLevel(G.level||selLevel,true);},
    forceWin:function(){
      if(body.dataset.gameState!=="playing")beginLevel(G.level||selLevel,true);
      for(var i=0;i<G.arrows.length;i++){var a=G.arrows[i];if(a.dead)continue;
        for(var k=0;k<a.cells.length;k++)G.grid[a.cells[k]]=-1;a.dead=true;}
      G.alive=0;G.flying=[];win();
    },
    forceLose:function(cause){
      if(body.dataset.gameState!=="playing")beginLevel(G.level||selLevel,true);
      G.lives=0;lose(cause||"forced");
    }
  };
}
})();





/* forge-platform:begin */

;(() => {
  if (!/^\/(play|version)\//.test(location.pathname)) return;
  const identity = {"projectId":"98d0a327-d3ca-4fed-a027-ab320f6b99f1","versionId":"734c88a0-552a-43a6-8d11-dbb40fb8e293"};
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