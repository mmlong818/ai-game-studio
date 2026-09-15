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

import * as THREE from "./vendor/three.module.js";

/* ================= 基础工具 ================= */
const $ = (id)=>document.getElementById(id);
const boardEl=$('board'), canvas=$('game-canvas');
const fxTrail=$('fxTrail'), fxBlocked=$('fxBlocked');
const remainEl=$('remain'), statsEl=$('stats'), toastEl=$('goalToast'), stuckEl=$('stuckHint');
const startScreen=$('startScreen'), resultScreen=$('resultScreen');
const resTitle=$('resTitle'), resReason=$('resReason'), resStats=$('resStats');
const btnStart=$('start'), btnRestart=$('restart'), btnAgain=$('again'), btnNext=$('next');
const LOCALES=new Set(['zh-CN','zh-TW','en','ja']);
let locale=new URLSearchParams(location.search).get('lang');if(!LOCALES.has(locale))locale='zh-CN';
const TEXT={
  'zh-CN':{title:'箭头魔方 · 100 关战役',stuck:'看得见的方块都推不动了 · 点「重开本关」',remain:'剩余方块',stats:(l,m,x)=>`第 ${l}/100 关 · 步数 ${m} · 无效 ${x}`,restart:'重开本关',introTitle:'把魔方一路推空',intro1:'点一个小方块，它沿着面上箭头的方向直线滑动：',intro1b:'前方一路空',intro1c:'就滑出去消失；被挡住则贴着障碍停下，变成新的障碍。',intro2:'推空当前一关进入下一关，共 100 关，最后是 5×5×5 的巨方。拖动画面或方向键/WASD 转视角，回正复位，空格换一块，回车推出。',tags:['无倒计时','顺序即解法','卡死可秒重开'],start:'开始',pad:'操作按键',left:'视角左转',up:'视角上转',down:'视角下转',right:'视角右转',home:'回正',homeAria:'回正视角',cycle:'换一块',cycleAria:'切换选中的方块',go:'推出',goAria:'推动选中的方块',won:l=>`第 ${l} 关清空！`,allWon:'百关全通关！',rankBest:'大师级：几乎没有无效点击',rankGood:'不错：顺序读得挺准',rankPass:'通过：多留意箭头前方的通路',cleared:(n,r)=>`${n} 块都被推出了立方体 · ${r}`,finalCleared:(n,r)=>`最终关 ${n} 块全部推出立方体 · ${r}`,steps:(label,m,x)=>`${label} · 步数 ${m} · 无效点击 ${x}`,next:'下一关',againAll:'从第 1 关再来',replay:'重玩本关',lost:'卡死了',noMove:'没有任何一块还能移动',lostReason:(l,n)=>`第 ${l} 关剩余 ${n} 块的箭头前方全被挡死，没有任何一块还能移动（卡死）`,lostStats:(l,label,m,n)=>`第 ${l} 关 ${label} · 步数 ${m} · 剩余 ${n}`,retry:'重来本关',goal:(l,n,label)=>`第 ${l}/100 关 · ${n} 块 · ${label} · 沿箭头推空`,pieces:n=>`${n} 块`,structures:{base:'基础阵列',cuboid:'层叠长方体',carved:'异形层塔',notched:'缺角镂空'}},
  'zh-TW':{title:'箭頭魔方 · 100 關戰役',stuck:'看得見的方塊都推不動了 · 點「重開本關」',remain:'剩餘方塊',stats:(l,m,x)=>`第 ${l}/100 關 · 步數 ${m} · 無效 ${x}`,restart:'重開本關',introTitle:'把魔方一路推空',intro1:'點一個小方塊，它會沿著表面箭頭直線滑動：',intro1b:'前方一路淨空',intro1c:'就會滑出去消失；被擋住則停在障礙旁，成為新的障礙。',intro2:'推空目前關卡即可進入下一關，共 100 關，最後是 5×5×5 巨方。拖動畫面或方向鍵/WASD 轉視角，回正復位，空白鍵換一塊，Enter 推出。',tags:['無倒數計時','順序就是解法','卡死可立即重開'],start:'開始',pad:'操作按鍵',left:'視角左轉',up:'視角上轉',down:'視角下轉',right:'視角右轉',home:'回正',homeAria:'回正視角',cycle:'換一塊',cycleAria:'切換選取的方塊',go:'推出',goAria:'推動選取的方塊',won:l=>`第 ${l} 關清空！`,allWon:'百關全通關！',rankBest:'大師級：幾乎沒有無效點擊',rankGood:'不錯：順序判讀很準',rankPass:'通過：多留意箭頭前方的通路',cleared:(n,r)=>`${n} 塊都推出立方體了 · ${r}`,finalCleared:(n,r)=>`最終關 ${n} 塊全部推出立方體 · ${r}`,steps:(label,m,x)=>`${label} · 步數 ${m} · 無效點擊 ${x}`,next:'下一關',againAll:'從第 1 關再來',replay:'重玩本關',lost:'卡死了',noMove:'沒有任何一塊還能移動',lostReason:(l,n)=>`第 ${l} 關剩餘 ${n} 塊的箭頭前方全被擋住，沒有任何一塊還能移動（卡死）`,lostStats:(l,label,m,n)=>`第 ${l} 關 ${label} · 步數 ${m} · 剩餘 ${n}`,retry:'重來本關',goal:(l,n,label)=>`第 ${l}/100 關 · ${n} 塊 · ${label} · 沿箭頭推空`,pieces:n=>`${n} 塊`,structures:{base:'基礎陣列',cuboid:'層疊長方體',carved:'異形層塔',notched:'缺角鏤空'}},
  en:{title:'Arrow Cube · 100-Level Campaign',stuck:'No visible cube can move · select Restart level',remain:'Cubes remaining',stats:(l,m,x)=>`Level ${l}/100 · Moves ${m} · Misses ${x}`,restart:'Restart level',introTitle:'Push every cube clear',intro1:'Select a small cube. It slides in the direction of its arrow: if the ',intro1b:'whole path ahead is clear',intro1c:', it exits and disappears. If blocked, it stops at the obstacle and becomes a new obstacle.',intro2:'Clear each level to advance through 100 levels, ending with a 5×5×5 giant cube. Drag or use arrows/WASD to rotate, Home to reset, Space to select, and Enter to push.',tags:['No timer','Order is the solution','Restart instantly if stuck'],start:'Start',pad:'Game controls',left:'Rotate view left',up:'Rotate view up',down:'Rotate view down',right:'Rotate view right',home:'Reset',homeAria:'Reset view',cycle:'Next cube',cycleAria:'Select the next cube',go:'Push out',goAria:'Push the selected cube',won:l=>`Level ${l} cleared!`,allWon:'All 100 levels cleared!',rankBest:'Master: almost no missed moves',rankGood:'Great: you read the order well',rankPass:'Cleared: watch the path ahead of each arrow',cleared:(n,r)=>`All ${n} cubes left the block · ${r}`,finalCleared:(n,r)=>`All ${n} cubes cleared from the final level · ${r}`,steps:(label,m,x)=>`${label} · Moves ${m} · Misses ${x}`,next:'Next level',againAll:'Play again from Level 1',replay:'Replay level',lost:'Stuck',noMove:'No cube can move',lostReason:(l,n)=>`Level ${l} has ${n} cubes left, and every arrow path is blocked`,lostStats:(l,label,m,n)=>`Level ${l} · ${label} · Moves ${m} · ${n} remaining`,retry:'Retry level',goal:(l,n,label)=>`Level ${l}/100 · ${n} cubes · ${label} · Push along the arrows`,pieces:n=>`${n} cubes`,structures:{base:'Starter array',cuboid:'Layered cuboid',carved:'Carved tower',notched:'Hollow notched form'}},
  ja:{title:'矢印キューブ · 100ステージ',stuck:'見えているキューブは動かせません · 「ステージをやり直す」を選択',remain:'残りキューブ',stats:(l,m,x)=>`ステージ ${l}/100 · 手数 ${m} · ミス ${x}`,restart:'ステージをやり直す',introTitle:'キューブをすべて押し出そう',intro1:'小さなキューブを選ぶと、表面の矢印方向へ直進します：',intro1b:'前方がすべて空いていれば',intro1c:'外へ滑り出して消えます。遮られると障害物の手前で止まり、新しい障害物になります。',intro2:'現在のステージを空にすると次へ進みます。全100ステージ、最後は5×5×5の巨大キューブです。ドラッグまたは矢印/WASDで回転、Homeで視点リセット、Spaceで選択、Enterで押し出します。',tags:['時間制限なし','順番が解法','詰んだらすぐ再開'],start:'スタート',pad:'操作ボタン',left:'視点を左へ回転',up:'視点を上へ回転',down:'視点を下へ回転',right:'視点を右へ回転',home:'正面',homeAria:'視点をリセット',cycle:'次のキューブ',cycleAria:'選択キューブを切り替え',go:'押し出す',goAria:'選択したキューブを押す',won:l=>`ステージ ${l} クリア！`,allWon:'100ステージ完全クリア！',rankBest:'マスター：ミスがほとんどありません',rankGood:'いい読みです：順番は正確でした',rankPass:'クリア：矢印の前方をよく見よう',cleared:(n,r)=>`${n}個すべてを押し出しました · ${r}`,finalCleared:(n,r)=>`最終ステージの${n}個をすべて押し出しました · ${r}`,steps:(label,m,x)=>`${label} · 手数 ${m} · ミス ${x}`,next:'次のステージ',againAll:'ステージ1からもう一度',replay:'このステージをもう一度',lost:'行き詰まり',noMove:'動かせるキューブがありません',lostReason:(l,n)=>`ステージ ${l} は残り${n}個。すべての矢印の前がふさがれています`,lostStats:(l,label,m,n)=>`ステージ ${l} · ${label} · 手数 ${m} · 残り ${n}`,retry:'ステージをやり直す',goal:(l,n,label)=>`ステージ ${l}/100 · ${n}個 · ${label} · 矢印方向へ押し出そう`,pieces:n=>`${n}個`,structures:{base:'基本配置',cuboid:'積層直方体',carved:'変形タワー',notched:'切り欠き中空形'}}
};
const tr=key=>TEXT[locale][key];

/* 方向索引与 BoxGeometry 面顺序一致：0=+X 1=-X 2=+Y 3=-Y 4=+Z 5=-Z */
const DIRS=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
/* 默认镜头在 -X/+Y/+Z 一侧，这三个面朝向玩家（题目生成的可见性基准） */
const CAM_DIRS=[1,2,4];
const FACE_BASIS=[
  {r:[0,0,-1],u:[0,1,0]},{r:[0,0,1],u:[0,1,0]},
  {r:[1,0,0],u:[0,0,-1]},{r:[1,0,0],u:[0,0,1]},
  {r:[1,0,0],u:[0,1,0]},{r:[-1,0,0],u:[0,1,0]}
];
const CANDY=[
  {h:345,s:78,l:81},{h:288,s:58,l:81},{h:258,s:62,l:83},{h:205,s:78,l:79},{h:152,s:52,l:77},
  {h:48, s:84,l:77},{h:180,s:52,l:77},{h:222,s:68,l:81},{h:28, s:84,l:78},{h:8,  s:78,l:78}
];
const SHADE=[-8,-8,10,-18,0,0];
const SEED=20260914, GAP=1.02, BS=0.94;
const POOL=130;

/* 默认等轴测视角：左前上方，俯角约 35°，弱透视 */
const CAM_FOV=25, PITCH0=35*Math.PI/180, YAW0=-Math.PI/4;

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hslStr=(h,s,l)=>`hsl(${h} ${clamp(s,0,100)}% ${clamp(l,0,100)}%)`;

/* ================= 关卡协议：100 关 =================
   唯一难度维度 blockCount 逐关严格变多，永不重复也永不回落：
     1–8 关沿用原配置 4,6,9,12,13,18,22,27；
     9–99 关为 27+(n-8)，即 28…118；第 100 关 120 块（终局）。
   摆放盒随块数增长，始终大于等于当关块数：
     9–20 关 4×3×4；21–45 关 4×4×4（第 45 关正好填满 64）；
     46–50 关 4×4×5；51–100 关 5×5×5。
   结构循环：完整层叠长方体 / 单层多层异形 / 缺角镂空。                      */
const MAX_LEVEL=100;
const BASE_DEFS=[
  {n:1,nx:2,ny:1,nz:2,label:'2×2×1 四块',variant:'single-layer-grid',milestone:true},
  {n:2,nx:3,ny:1,nz:2,label:'3×2×1 六块',variant:'single-layer-grid',milestone:false},
  {n:3,nx:3,ny:1,nz:3,label:'3×3×1 九块',variant:'single-layer-grid',milestone:false},
  {n:4,nx:3,ny:2,nz:2,label:'3×2×2 两排两层',variant:'dual-layer-grid',milestone:true},
  {n:5,nx:5,ny:1,nz:5,label:'单层十字 13 块',variant:'single-layer-cross',milestone:true,
   mask:(x,y,z)=>(Math.abs(x-2)<=1&&Math.abs(z-2)<=1)||(x===2&&(z===0||z===4))||(z===2&&(x===0||x===4))},
  {n:6,nx:3,ny:2,nz:3,label:'3×3×2 三行两层',variant:'dual-layer-wide',milestone:true},
  {n:7,nx:3,ny:2,nz:4,label:'双层异形 22 块',variant:'dual-layer-notched',milestone:false,
   mask:(x,y,z)=>!(y===1&&((x===0&&z===0)||(x===2&&z===3)))},
  {n:8,nx:3,ny:3,nz:3,label:'3×3×3 完整立方体',variant:'full-cube',milestone:true}
];
const BASE_COUNT=[4,6,9,12,13,18,22,27];
const KIND_LABEL={cuboid:'层叠长方体',carved:'异形层塔',notched:'缺角镂空'};
/* 结构里程碑：每关样式与题面各不相同 */
const MILESTONES={
  10:{kind:'carved', variant:'terrace-slab',  label:'阶梯露台'},
  15:{kind:'notched',variant:'hollow-ring',   label:'镂空环塔'},
  20:{kind:'cuboid', variant:'stacked-tower', label:'层叠方塔'},
  30:{kind:'carved', variant:'cross-vault',   label:'十字拱层'},
  40:{kind:'notched',variant:'pillared-hall', label:'立柱厅'},
  50:{kind:'cuboid', variant:'quad-slab-445', label:'四层巨塔'},
  60:{kind:'carved', variant:'spiral-terrace',label:'旋阶露台'},
  70:{kind:'notched',variant:'hollow-core',   label:'空心巨核'},
  80:{kind:'cuboid', variant:'grand-slab',    label:'巨型层叠'},
  90:{kind:'carved', variant:'canyon-cut',    label:'峡谷切面'},
  100:{kind:'notched',variant:'grand-cube-5', label:'5×5×5 终局巨方'}
};
/* 块数：严格单调递增，任意相邻两关都不相等 */
function countFor(n){
  if(n<=8) return BASE_COUNT[n-1];
  if(n<=99) return 27+(n-8);
  return 120;
}
/* 摆放盒：随块数阶梯放大，且单元格数始终 >= countFor(n) */
function boxFor(n){
  if(n<=20) return [4,3,4];
  if(n<=45) return [4,4,4];
  if(n<=50) return [4,4,5];
  return [5,5,5];
}
/* 按 kind 给每格一个保留优先级，取前 count 个 —— 同一 blockCount 下形状随结构类型变化 */
function shapeCells(nx,ny,nz,count,kind,seed){
  const rnd=mulberry32(seed>>>0);
  const cx=(nx-1)/2, cy=(ny-1)/2, cz=(nz-1)/2;
  const list=[]; let i=0;
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)for(let z=0;z<nz;z++){
    const faces=(x===0||x===nx-1?1:0)+(y===0||y===ny-1?1:0)+(z===0||z===nz-1?1:0);
    const dx=Math.abs(x-cx), dz=Math.abs(z-cz), dcy=Math.abs(y-cy);
    let p;
    if(kind==='cuboid'){
      p=-(y*10000+z*100+x);
    }else if(kind==='carved'){
      const cross=(y%2===0)?((dx<0.6?3:0)+(dz<0.6?3:0)):((dx<=1?2:0)+(dz<=1?2:0));
      p=12+cross*2-(dx+dz)*1.6-y*1.3+rnd()*0.5;
    }else{
      const corner=(faces===3)?1:0, deep=(faces===0)?1:0;
      p=10-corner*6-deep*(4-(dx+dcy+dz)*0.5)+rnd()*0.4;
    }
    list.push({x,y,z,p,i:i++});
  }
  list.sort((a,b)=>(b.p-a.p)||(a.i-b.i));
  return list.slice(0,Math.min(count,list.length)).map(o=>[o.x,o.y,o.z]);
}
function buildLevelSpec(n){
  n=clamp(Math.round(n)||1,1,MAX_LEVEL);
  const seed=(SEED+n*1013904223)>>>0;
  const count=countFor(n);
  let nx,ny,nz,variant,label,milestone,kind,fixedCells=null;
  if(n<=8){
    const d=BASE_DEFS[n-1];
    nx=d.nx;ny=d.ny;nz=d.nz;variant=d.variant;label=d.label;milestone=d.milestone;kind='base';
    fixedCells=[];
    for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)for(let z=0;z<nz;z++){
      if(!d.mask||d.mask(x,y,z)) fixedCells.push([x,y,z]);
    }
  }else{
    const b=boxFor(n); nx=b[0];ny=b[1];nz=b[2];
    const ms=MILESTONES[n];
    kind=ms?ms.kind:['cuboid','carved','notched'][n%3];
    variant=ms?ms.variant:`${kind}-${nx}x${ny}x${nz}`;
    label=`${nx}×${ny}×${nz} ${ms?ms.label:KIND_LABEL[kind]} ${count} 块`;
    milestone=!!ms;
  }
  const dirs=[];
  for(let i=0;i<6;i++){
    const ax=i>>1;
    if(ax===0&&nx>1) dirs.push(i);
    else if(ax===1&&ny>1) dirs.push(i);
    else if(ax===2&&nz>1) dirs.push(i);
  }
  return {
    n,nx,ny,nz,dirs,label,variant,milestone,seed,kind,blockCount:count,
    signature:`lv${n}-${variant}-${nx}x${ny}x${nz}-b${count}-s${seed}`,
    cellsFor:(a)=>{
      if(fixedCells) return fixedCells.map(c=>c.slice());
      const k=(a===0)?kind:['cuboid','carved','notched'][(['cuboid','carved','notched'].indexOf(kind)+a)%3];
      return shapeCells(nx,ny,nz,count,k,(seed+a*7919)>>>0);
    }
  };
}
function levelLabel(spec=LV){return `${spec.nx}×${spec.ny}×${spec.nz} ${TEXT[locale].structures[spec.kind]||TEXT[locale].structures.base} · ${tr('pieces')(spec.blockCount)}`;}

let level=1;
let LV=null;
const idxOf=(x,y,z)=>(x*LV.ny+y)*LV.nz+z;
const inBox=(x,y,z)=>x>=0&&x<LV.nx&&y>=0&&y<LV.ny&&z>=0&&z<LV.nz;

/* ================= 音频（首次交互后创建） ================= */
let actx=null;
function ac(){
  if(!actx){ try{ actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ actx=null; } }
  if(actx&&actx.state==='suspended') actx.resume();
  return actx;
}
function blip(f,dur,type,vol,to){
  const c=ac(); if(!c) return;
  const o=c.createOscillator(), g=c.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(f,c.currentTime);
  if(to) o.frequency.exponentialRampToValueAtTime(to,c.currentTime+dur);
  g.gain.setValueAtTime(0.0001,c.currentTime);
  g.gain.exponentialRampToValueAtTime(vol||0.15,c.currentTime+0.015);
  g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+dur);
  o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime+dur+0.03);
}
const sfx={
  slide:()=>blip(300,0.22,'sine',0.10,620),
  stop:()=>blip(180,0.16,'triangle',0.14,110),
  out:()=>{blip(660,0.14,'triangle',0.14,990);setTimeout(()=>blip(990,0.16,'sine',0.10),80);},
  bad:()=>blip(150,0.22,'sawtooth',0.09,90),
  pick:()=>blip(520,0.07,'sine',0.07),
  turn:()=>blip(420,0.05,'sine',0.045),
  win:()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>blip(f,0.3,'triangle',0.13),i*110)),
  lose:()=>[392,330,262].forEach((f,i)=>setTimeout(()=>blip(f,0.32,'sine',0.13),i*140))
};

/* ================= 程序绘制的面贴图（无任何图片文件） ================= */
const TILE=64, A_COLS=3, A_ROWS=2;
const axisOf=(i)=>i>>1;
/* 箭头刻在与箭头方向平行的四个连续面上，端面保持纯色 */
function faceHasArrow(dir,face){ return axisOf(face)!==axisOf(dir); }
function arrowPath(g,S){
  const k=S;
  g.beginPath();
  g.moveTo(0.50*k,0.13*k); g.lineTo(0.82*k,0.47*k); g.lineTo(0.645*k,0.47*k);
  g.lineTo(0.645*k,0.87*k); g.lineTo(0.355*k,0.87*k); g.lineTo(0.355*k,0.47*k);
  g.lineTo(0.18*k,0.47*k); g.closePath();
}
function drawFace(g,S,ci,dir,face){
  const p=CANDY[ci];
  g.fillStyle=hslStr(p.h,p.s,p.l+SHADE[face]);
  g.fillRect(0,0,S,S);
  g.lineJoin='miter';
  g.lineWidth=Math.max(2,Math.round(S*0.03));
  g.strokeStyle=hslStr(p.h,p.s+6,p.l+SHADE[face]-26);
  const o=g.lineWidth/2;
  g.strokeRect(o,o,S-g.lineWidth,S-g.lineWidth);
  if(!faceHasArrow(dir,face)) return;
  const b=FACE_BASIS[face], d=DIRS[dir];
  const a=d[0]*b.r[0]+d[1]*b.r[1]+d[2]*b.r[2];
  const v=d[0]*b.u[0]+d[1]*b.u[1]+d[2]*b.u[2];
  const ang=Math.atan2(a,v);
  const gs=S*0.66;
  g.save();
  g.translate(S/2,S/2); g.rotate(ang); g.translate(-gs/2,-gs/2);
  arrowPath(g,gs);
  g.fillStyle=hslStr(p.h,p.s+8,p.l+SHADE[face]-24); g.fill();
  g.lineJoin='round';
  g.lineWidth=Math.max(1.5,gs*0.03);
  g.strokeStyle=hslStr(p.h,p.s+10,p.l+SHADE[face]-36); g.stroke();
  g.save();
  arrowPath(g,gs); g.clip();
  g.translate(gs*0.02,gs*0.02); arrowPath(g,gs);
  g.lineWidth=Math.max(1.5,gs*0.035);
  g.strokeStyle=hslStr(p.h,p.s,p.l+SHADE[face]+13); g.stroke();
  g.restore();
  g.restore();
}
function buildAtlas(ci,dir){
  const c=document.createElement('canvas');
  c.width=TILE*A_COLS; c.height=TILE*A_ROWS;
  const g=c.getContext('2d');
  for(let f=0;f<6;f++){
    g.save(); g.translate((f%A_COLS)*TILE,Math.floor(f/A_COLS)*TILE);
    drawFace(g,TILE,ci,dir,f); g.restore();
  }
  return c;
}
const matCache=new Map();
function matFor(ci,dir){
  const key=ci*6+dir;
  let m=matCache.get(key);
  if(!m){
    const tex=new THREE.CanvasTexture(buildAtlas(ci,dir));
    if('colorSpace' in tex) tex.colorSpace=THREE.SRGBColorSpace;
    tex.generateMipmaps=false;
    tex.minFilter=THREE.LinearFilter; tex.magFilter=THREE.LinearFilter;
    tex.anisotropy=1;
    m=new THREE.MeshBasicMaterial({map:tex});
    matCache.set(key,m);
  }
  return m;
}

/* ================= three.js 场景 ================= */
const renderer=new THREE.WebGLRenderer({antialias:true,canvas});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xFBF7FB);
const camera=new THREE.PerspectiveCamera(CAM_FOV,1,0.1,140);
/* 全自发光材质，场景不需要任何光源与阴影 */

/* 单张图集 + 重映射 UV：一个方块只占一次绘制调用 */
function makeAtlasGeo(){
  const geo=new THREE.BoxGeometry(BS,BS,BS);
  const uv=geo.attributes.uv;
  const eu=0.5/(TILE*A_COLS), ev=0.5/(TILE*A_ROWS);
  for(let f=0;f<6;f++){
    const cx=f%A_COLS, ry=Math.floor(f/A_COLS);
    const u0=cx/A_COLS+eu, u1=(cx+1)/A_COLS-eu;
    const v0=1-(ry+1)/A_ROWS+ev, v1=1-ry/A_ROWS-ev;
    for(let k=0;k<4;k++){
      const i=f*4+k, u=uv.getX(i), v=uv.getY(i);
      uv.setXY(i,u0+u*(u1-u0),v0+v*(v1-v0));
    }
  }
  uv.needsUpdate=true;
  geo.clearGroups();
  return geo;
}
const blockGeo=makeAtlasGeo();

/* ---- 相机：只改变观察角度，不影响任何规则 ---- */
let camYaw=YAW0, camPitch=PITCH0, camDist=12;
function applyCamera(){
  camera.position.set(
    camDist*Math.cos(camPitch)*Math.sin(camYaw),
    camDist*Math.sin(camPitch),
    camDist*Math.cos(camPitch)*Math.cos(camYaw)
  );
  camera.lookAt(0,0,0);
  camera.updateMatrixWorld();
}
function frameCamera(){
  const rx=LV.nx*GAP, ry=LV.ny*GAP, rz=LV.nz*GAP;
  const radius=0.5*Math.sqrt(rx*rx+ry*ry+rz*rz)+0.35;
  const hf=CAM_FOV*Math.PI/360;
  const asp=Math.min(1,camera.aspect||1);
  camDist=Math.max(6,radius/(Math.tan(hf)*asp)*1.15);
  applyCamera();
}
function rotateView(dy,dp){
  camYaw+=dy;
  camPitch=clamp(camPitch+dp,-1.32,1.32);
  applyCamera();
}
function resetView(){ camYaw=YAW0; camPitch=PITCH0; applyCamera(); sfx.turn(); }

const cubeGroup=new THREE.Group(); scene.add(cubeGroup);
const outline=new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(BS*1.1,BS*1.1,BS*1.1)),
  new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.95,depthTest:false})
);
outline.renderOrder=20; outline.visible=false; cubeGroup.add(outline);
const selArrow=new THREE.Mesh(
  new THREE.ConeGeometry(0.15,0.32,14),
  new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.96,depthTest:false})
);
selArrow.renderOrder=21; selArrow.visible=false; cubeGroup.add(selArrow);
const CONE_UP=new THREE.Vector3(0,1,0);

const blocks=[];
for(let i=0;i<POOL;i++){
  const mesh=new THREE.Mesh(blockGeo,matFor(0,0));
  mesh.visible=false; cubeGroup.add(mesh);
  blocks.push({id:i,mesh,cell:[0,0,0],dir:0,colorIdx:0,alive:false});
}
const grid=new Int16Array(200);
const worldOf=(c)=>new THREE.Vector3(
  (c[0]-(LV.nx-1)/2)*GAP,
  (c[1]-(LV.ny-1)/2)*GAP,
  (c[2]-(LV.nz-1)/2)*GAP
);

/* ================= 盘面生成（逐块倒推放置，保证有解且每步都看得见） =================
   放置顺序 p1..pN 反过来就是清除顺序：清除 p_k 时，场上正好是放置 p_k 那一刻的占位。
   放置时校验三件事：
   1) 箭头方向到盘面外一路全空（保证能推出去）；
   2) 默认视角的三个面（-X/+Y/+Z）里至少一个方向到盘面外全空（那一刻看得见）；
   3) 沿 X/Y/Z 任一直线禁止 3 个紧挨且箭头同向的方块 —— 硬约束，任何分支输出前都全盘复查。 */
const AXES=[[1,0,0],[0,1,0],[0,0,1]];
function genPuzzle(seed,L,deadline){
  const cells=L.cells,N=cells.length,dirs=L.dirs;
  const size=L.nx*L.ny*L.nz;
  const idx=(x,y,z)=>(x*L.ny+y)*L.nz+z;
  const inb=(x,y,z)=>x>=0&&x<L.nx&&y>=0&&y<L.ny&&z>=0&&z<L.nz;
  const rayClear=(occ,x,y,z,d)=>{
    const v=DIRS[d]; let cx=x+v[0],cy=y+v[1],cz=z+v[2];
    while(inb(cx,cy,cz)){ if(occ[idx(cx,cy,cz)]) return false; cx+=v[0];cy+=v[1];cz+=v[2]; }
    return true;
  };
  const rayLen=(x,y,z,d)=>{
    const v=DIRS[d]; let cx=x+v[0],cy=y+v[1],cz=z+v[2],n=0;
    while(inb(cx,cy,cz)){ n++; cx+=v[0];cy+=v[1];cz+=v[2]; }
    return n;
  };
  const camVisible=(occ,x,y,z)=>{
    for(const d of CAM_DIRS) if(rayClear(occ,x,y,z,d)) return true;
    return false;
  };
  const camDepth=(x,y,z)=>Math.min(x,L.ny-1-y,L.nz-1-z);
  const shellDepth=(x,y,z)=>Math.min(x,L.nx-1-x,y,L.ny-1-y,z,L.nz-1-z);
  const touch=(x,y,z)=>(x===0||x===L.nx-1?1:0)+(y===0||y===L.ny-1?1:0)+(z===0||z===L.nz-1?1:0);
  const tripleWith=(occ,dirAt,x,y,z,d)=>{
    const same=(ax,ay,az)=>inb(ax,ay,az)&&occ[idx(ax,ay,az)]===1&&dirAt[idx(ax,ay,az)]===d;
    for(const v of AXES){
      for(let k=-2;k<=0;k++){
        let ok=true;
        for(let t=0;t<3;t++){
          const o=k+t;
          if(o===0) continue;
          if(!same(x+v[0]*o,y+v[1]*o,z+v[2]*o)){ ok=false; break; }
        }
        if(ok) return true;
      }
    }
    return false;
  };
  const boardHasTriple=(occ,dirAt)=>{
    for(const v of AXES){
      for(let x=0;x<L.nx;x++)for(let y=0;y<L.ny;y++)for(let z=0;z<L.nz;z++){
        const i0=idx(x,y,z);
        if(occ[i0]!==1) continue;
        const d=dirAt[i0];
        let run=true;
        for(let t=1;t<3;t++){
          const ax=x+v[0]*t,ay=y+v[1]*t,az=z+v[2]*t;
          if(!(inb(ax,ay,az)&&occ[idx(ax,ay,az)]===1&&dirAt[idx(ax,ay,az)]===d)){ run=false; break; }
        }
        if(run) return true;
      }
    }
    return false;
  };
  const layoutHasTriple=(seq)=>{
    const occ=new Uint8Array(size), dirAt=new Int8Array(size).fill(-1);
    for(const p of seq){ const i=idx(p.x,p.y,p.z); occ[i]=1; dirAt[i]=p.d; }
    return boardHasTriple(occ,dirAt);
  };
  const lineDiff=(occ,dirAt,x,y,z,d)=>{
    let s=0;
    for(const v of AXES)for(const sg of [-1,1]){
      const ax=x+v[0]*sg,ay=y+v[1]*sg,az=z+v[2]*sg;
      if(!inb(ax,ay,az)) continue;
      const i=idx(ax,ay,az);
      if(occ[i]!==1) continue;
      s+=(dirAt[i]===d)?-3:1;
    }
    return s;
  };
  const collect=(occ,dirAt,requireVis)=>{
    const cands=[];
    for(const cell of cells){
      const x=cell[0],y=cell[1],z=cell[2];
      if(occ[idx(x,y,z)]) continue;
      if(requireVis&&!camVisible(occ,x,y,z)) continue;
      for(const d of dirs){
        if(!rayClear(occ,x,y,z,d)) continue;
        if(tripleWith(occ,dirAt,x,y,z,d)) continue;
        cands.push({x,y,z,d,score:rayLen(x,y,z,d)+shellDepth(x,y,z)*4+camDepth(x,y,z)*6
          +(3-touch(x,y,z))*1.5+lineDiff(occ,dirAt,x,y,z,d)*2});
      }
    }
    return cands;
  };
  const greedy=(sd,requireVis)=>{
    const rnd=mulberry32(sd>>>0);
    const occ=new Uint8Array(size), dirAt=new Int8Array(size).fill(-1), seq=[];
    for(let k=0;k<N;k++){
      const cands=collect(occ,dirAt,requireVis);
      if(!cands.length) return null;
      let best=-1e9; for(const c of cands) if(c.score>best) best=c.score;
      const pool=cands.filter(c=>c.score>=best-1e-6);
      const pick=pool[Math.floor(rnd()*pool.length)|0];
      const i=idx(pick.x,pick.y,pick.z);
      occ[i]=1; dirAt[i]=pick.d; seq.push(pick);
    }
    if(boardHasTriple(occ,dirAt)) return null;
    return seq.reverse();
  };
  const search=(sd,requireVis,budget)=>{
    const rnd=mulberry32(sd>>>0);
    const occ=new Uint8Array(size), dirAt=new Int8Array(size).fill(-1), seq=[];
    let nodes=0, dead=false;
    const step=(k)=>{
      if(k===N) return !boardHasTriple(occ,dirAt);
      if(++nodes>budget) return false;
      if((nodes&63)===0&&performance.now()>deadline){ dead=true; return false; }
      const cands=collect(occ,dirAt,requireVis);
      for(const c of cands) c.j=c.score+rnd()*0.9;
      cands.sort((a,b)=>b.j-a.j);
      for(const c of cands){
        const i=idx(c.x,c.y,c.z);
        occ[i]=1; dirAt[i]=c.d; seq.push(c);
        if(step(k+1)) return true;
        occ[i]=0; dirAt[i]=-1; seq.pop();
        if(dead||nodes>budget) return false;
      }
      return false;
    };
    return step(0)?seq.slice().reverse():null;
  };
  /* 兜底：严格按“离表面越深越早放”的剥壳顺序构造，射线必然畅通，只需避开三连 */
  const shellBuild=(sd)=>{
    const rnd=mulberry32(sd>>>0);
    const occ=new Uint8Array(size), dirAt=new Int8Array(size).fill(-1), seq=[];
    const order=cells.map(c=>({x:c[0],y:c[1],z:c[2],k:shellDepth(c[0],c[1],c[2])*10+camDepth(c[0],c[1],c[2])*3+rnd()}));
    order.sort((a,b)=>b.k-a.k);
    for(const c of order){
      let bestD=-1,bestS=-1e9;
      for(const d of dirs){
        if(!rayClear(occ,c.x,c.y,c.z,d)) continue;
        if(tripleWith(occ,dirAt,c.x,c.y,c.z,d)) continue;
        const s=lineDiff(occ,dirAt,c.x,c.y,c.z,d)*2-rayLen(c.x,c.y,c.z,d)+rnd();
        if(s>bestS){ bestS=s; bestD=d; }
      }
      if(bestD<0) return null;
      const i=idx(c.x,c.y,c.z);
      occ[i]=1; dirAt[i]=bestD; seq.push({x:c.x,y:c.y,z:c.z,d:bestD});
    }
    if(boardHasTriple(occ,dirAt)) return null;
    return seq.reverse();
  };

  const tries=N<=30?240:(N<=64?48:18);
  for(let i=0;i<tries;i++){
    if(performance.now()>deadline) break;
    const s=greedy(seed+i*7919,true); if(s&&!layoutHasTriple(s)) return s;
  }
  for(let i=0;i<tries;i++){
    if(performance.now()>deadline) break;
    const s=greedy(seed+i*104729,false); if(s&&!layoutHasTriple(s)) return s;
  }
  const budget=N<=30?30000:(N<=64?6000:1800);
  for(let i=0;i<4;i++){
    if(performance.now()>deadline) break;
    const s=search(seed+i*1299721,true,budget); if(s&&!layoutHasTriple(s)) return s;
  }
  for(let i=0;i<4;i++){
    if(performance.now()>deadline) break;
    const s=search(seed+i*15485863,false,budget); if(s&&!layoutHasTriple(s)) return s;
  }
  for(let i=0;i<40;i++){
    const s=shellBuild(seed+i*2246822519); if(s&&!layoutHasTriple(s)) return s;
  }
  return null;
}

let layoutSeed=SEED, LAYOUT=[];
const layoutCache=new Map();
function buildLayout(){
  const cached=layoutCache.get(level);
  if(cached){ LV=cached.lv; LAYOUT=cached.layout; layoutSeed=LV.seed>>>0; frameCamera(); return; }
  const spec=buildLevelSpec(level);
  layoutSeed=spec.seed>>>0;
  let lv=null, layout=null;
  for(let a=0;a<4&&!layout;a++){
    const cells=spec.cellsFor(a);
    const cand=Object.assign({},spec,{cells,blockCount:cells.length});
    const deadline=performance.now()+(cells.length>64?520:380);
    const out=genPuzzle((spec.seed+a*2654435761)>>>0,cand,deadline);
    if(out){ lv=cand; layout=out; }
  }
  if(!layout){ const cells=spec.cellsFor(0); lv=Object.assign({},spec,{cells,blockCount:cells.length}); layout=[]; }
  LV=lv; LAYOUT=layout;
  layoutCache.set(level,{lv,layout});
  frameCamera();
}

/* ================= 局面状态 ================= */
let state='idle', moves=0, misses=0;
let failureReason='', selected=-1, anim=null;

function setupBoard(){
  grid.fill(0);
  const n=LAYOUT.length;
  const perm=[]; for(let i=0;i<POOL;i++) perm.push(i);
  const prnd=mulberry32((layoutSeed^0x9E3779B9)>>>0);
  for(let i=perm.length-1;i>0;i--){
    const j=Math.floor(prnd()*(i+1));
    const t=perm[i]; perm[i]=perm[j]; perm[j]=t;
  }
  blocks.forEach(b=>{ b.alive=false; b.mesh.visible=false; b.mesh.scale.set(1,1,1); });
  for(let i=0;i<n;i++){
    const p=LAYOUT[i], b=blocks[perm[i]];
    b.cell=[p.x,p.y,p.z]; b.dir=p.d; b.alive=true;
    b.colorIdx=(p.x*3+p.y*5+p.z*7+(layoutSeed>>>3))%CANDY.length;
    b.mesh.material=matFor(b.colorIdx,p.d);
    b.mesh.position.copy(worldOf(b.cell));
    b.mesh.scale.set(1,1,1); b.mesh.visible=true;
    grid[idxOf(p.x,p.y,p.z)]=b.id+1;
  }
  anim=null; selected=-1; outline.visible=false; selArrow.visible=false;
  fxTrail.style.display='none'; fxBlocked.style.display='none';
  updateStuckHint();
}
const aliveCount=()=>blocks.reduce((n,b)=>n+(b.alive?1:0),0);

function canStep(b){
  const d=DIRS[b.dir], n=[b.cell[0]+d[0],b.cell[1]+d[1],b.cell[2]+d[2]];
  if(!inBox(n[0],n[1],n[2])) return true;
  return grid[idxOf(n[0],n[1],n[2])]===0;
}
function resolvePath(b){
  const d=DIRS[b.dir]; let cur=b.cell.slice(); let steps=0, exit=false;
  for(;;){
    const n=[cur[0]+d[0],cur[1]+d[1],cur[2]+d[2]];
    if(!inBox(n[0],n[1],n[2])){ exit=true; break; }
    if(grid[idxOf(n[0],n[1],n[2])]!==0) break;
    cur=n; steps++;
  }
  return {target:cur,steps,exit};
}
/* 当前镜头朝向的三个轴向：旋转视角后，看得见的面随之变化 */
function camFaceDirs(){
  const v=camera.position;
  const out=[];
  if(v.x>0.05) out.push(0); else if(v.x<-0.05) out.push(1);
  if(v.y>0.05) out.push(2); else if(v.y<-0.05) out.push(3);
  if(v.z>0.05) out.push(4); else if(v.z<-0.05) out.push(5);
  return out.length?out:CAM_DIRS;
}
function hasVisibleFace(b){
  const x=b.cell[0],y=b.cell[1],z=b.cell[2];
  for(const d of camFaceDirs()){
    const v=DIRS[d]; let cx=x+v[0],cy=y+v[1],cz=z+v[2],ok=true;
    while(inBox(cx,cy,cz)){
      if(grid[idxOf(cx,cy,cz)]!==0){ ok=false; break; }
      cx+=v[0];cy+=v[1];cz+=v[2];
    }
    if(ok) return true;
  }
  return false;
}
function countTripleSameDir(){
  let n=0;
  const live=blocks.filter(b=>b.alive);
  const at=new Map();
  for(const b of live) at.set(b.cell.join(','),b.dir);
  for(const b of live){
    for(const v of AXES){
      let run=true;
      for(let t=1;t<3;t++){
        const key=[b.cell[0]+v[0]*t,b.cell[1]+v[1]*t,b.cell[2]+v[2]*t].join(',');
        if(at.get(key)!==b.dir){ run=false; break; }
      }
      if(run) n++;
    }
  }
  return n;
}

/* ================= 交互反馈层 ================= */
let blockedFX=null, trailFX=null;
function projectToBoard(v){
  const p=v.clone().applyMatrix4(cubeGroup.matrixWorld).project(camera);
  const w=boardEl.clientWidth,h=boardEl.clientHeight;
  return {x:(p.x*0.5+0.5)*w,y:(-p.y*0.5+0.5)*h};
}
function fxSizes(){
  const s=Math.min(boardEl.clientWidth,boardEl.clientHeight);
  const m=Math.round(s*0.085);
  fxBlocked.style.width=fxBlocked.style.height=m+'px';
  fxTrail.style.width=Math.round(s*0.24)+'px';
  fxTrail.style.height=Math.round(s*0.055)+'px';
}
function updateFX(now){
  if(blockedFX){
    const k=(now-blockedFX.t0)/650;
    if(k>=1){ blockedFX=null; fxBlocked.style.display='none'; }
    else{
      const p=projectToBoard(blockedFX.pos), sc=1+0.35*Math.sin(Math.min(k*3.2,Math.PI));
      const w=fxBlocked.offsetWidth||40;
      fxBlocked.style.display='block';
      fxBlocked.style.transform=`translate(${p.x-w/2}px,${p.y-w/2}px) scale(${sc})`;
      fxBlocked.style.opacity=String(1-Math.max(0,k-0.6)/0.4);
    }
  }
  if(trailFX){
    const k=(now-trailFX.t0)/trailFX.dur;
    if(k>=1){ trailFX=null; fxTrail.style.display='none'; }
    else{
      const a=projectToBoard(trailFX.a), b=projectToBoard(trailFX.b);
      const cx=(a.x+b.x)/2, cy=(a.y+b.y)/2;
      const ang=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
      const w=fxTrail.offsetWidth||60, h=fxTrail.offsetHeight||14;
      fxTrail.style.display='block';
      fxTrail.style.transform=`translate(${cx-w/2}px,${cy-h/2}px) rotate(${ang}deg)`;
      fxTrail.style.opacity=String(0.9*(1-k));
    }
  }
}

/* ================= 移动 ================= */
function activate(bIndex){
  if(state!=='playing'||anim) return;
  const b=blocks[bIndex]; if(!b||!b.alive) return;
  selected=bIndex;
  const res=resolvePath(b);
  if(res.steps===0&&!res.exit){
    misses++; sfx.bad();
    blockedFX={pos:worldOf(b.cell),t0:performance.now()};
    updateStats(); return;
  }
  const from=worldOf(b.cell).clone();
  let to=worldOf(res.target).clone();
  if(res.exit){ const d=DIRS[b.dir]; to.add(new THREE.Vector3(d[0],d[1],d[2]).multiplyScalar(GAP*2.6)); }
  const dur=Math.max(230,(res.steps+(res.exit?1.6:0))*110);
  grid[idxOf(b.cell[0],b.cell[1],b.cell[2])]=0;
  anim={b,from,to,t0:performance.now(),dur,exit:res.exit,target:res.target};
  trailFX={a:from.clone(),b:to.clone(),t0:performance.now(),dur:dur+280};
  moves++; sfx.slide(); updateStats();
}
function finishMove(){
  const a=anim; anim=null;
  const b=a.b;
  if(a.exit){
    b.alive=false; b.mesh.visible=false; sfx.out();
    if(selected===b.id) selected=-1;
  }else{
    b.cell=a.target.slice();
    grid[idxOf(b.cell[0],b.cell[1],b.cell[2])]=b.id+1;
    b.mesh.position.copy(worldOf(b.cell));
    sfx.stop();
  }
  updateStats();
  if(aliveCount()===0){ setState('won'); sfx.win(); return; }
  const movable=blocks.some(x=>x.alive&&canStep(x));
  if(!movable){
    failureReason='stuck';
    setState('lost'); sfx.lose();
    return;
  }
  updateStuckHint();
}

/* ================= 选中 ================= */
const _ray=new THREE.Raycaster();
function visibleAlive(){
  cubeGroup.updateMatrixWorld();
  const live=blocks.filter(b=>b.alive);
  if(!live.length) return [];
  const vis=live.filter(hasVisibleFace);
  const use=vis.length?vis:live;
  return use.map(b=>{
    const sp=projectToBoard(b.mesh.position);
    return {id:b.id,x:sp.x,y:sp.y};
  });
}
function cycleSel(){
  if(state!=='playing'||anim) return;
  const list=visibleAlive(); if(!list.length) return;
  const h=Math.max(1,boardEl.clientHeight), band=h/7;
  const arr=list.slice().map(o=>({id:o.id,x:o.x,y:o.y,row:Math.floor(o.y/band)}));
  arr.sort((a,b)=>{
    if(a.row!==b.row) return a.row-b.row;
    if(Math.abs(a.x-b.x)>0.5) return a.x-b.x;
    return a.y-b.y;
  });
  const i=arr.findIndex(o=>o.id===selected);
  selected=arr[(i+1)%arr.length].id; sfx.pick();
}

/* ================= 输入 ================= */
let drag=null;
canvas.addEventListener('pointerdown',(e)=>{
  ac();
  try{ canvas.setPointerCapture(e.pointerId); }catch(_){}
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:0};
});
canvas.addEventListener('pointermove',(e)=>{
  if(!drag||e.pointerId!==drag.id) return;
  const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  drag.x=e.clientX; drag.y=e.clientY;
  drag.moved+=Math.abs(dx)+Math.abs(dy);
  if(drag.moved>8) rotateView(-dx*0.0075,dy*0.006);
});
canvas.addEventListener('pointerup',(e)=>{
  if(!drag) return;
  const moved=drag.moved; drag=null;
  if(moved>14) return;
  if(state!=='playing'||anim) return;
  const r=canvas.getBoundingClientRect();
  const nx=((e.clientX-r.left)/r.width)*2-1, ny=-((e.clientY-r.top)/r.height)*2+1;
  _ray.setFromCamera({x:nx,y:ny},camera);
  const hits=_ray.intersectObjects(blocks.filter(b=>b.alive).map(b=>b.mesh),false);
  if(hits.length){
    const m=hits[0].object, b=blocks.find(x=>x.mesh===m);
    if(b) activate(b.id);
  }
});
canvas.addEventListener('pointercancel',()=>{drag=null;});

const TURN=0.13;
window.addEventListener('keydown',(e)=>{
  const k=e.key;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter'].includes(k)) e.preventDefault();
  ac();
  if(k==='ArrowLeft'||k==='a'||k==='A'){ rotateView(TURN,0); sfx.turn(); return; }
  if(k==='ArrowRight'||k==='d'||k==='D'){ rotateView(-TURN,0); sfx.turn(); return; }
  if(k==='ArrowUp'||k==='w'||k==='W'){ rotateView(0,TURN*0.8); sfx.turn(); return; }
  if(k==='ArrowDown'||k==='s'||k==='S'){ rotateView(0,-TURN*0.8); sfx.turn(); return; }
  if(k==='q'||k==='Q'||k==='Home'){ resetView(); return; }
  if(state==='idle'){ if(k==='Enter'||k===' ') startGame(); return; }
  if(state==='won'){ if(k==='Enter'||k===' ') advance(); else if(k==='r'||k==='R') startLevel(); return; }
  if(state==='lost'){ if(k==='Enter'||k===' '||k==='r'||k==='R') startLevel(); return; }
  if(k===' '||k==='Tab'){ cycleSel(); }
  else if(k==='Enter'){ if(selected>=0) activate(selected); else cycleSel(); }
  else if(k==='r'||k==='R'){ startLevel(); }
});

function bindHold(el,fn){
  let t=0,iv=0;
  const stop=()=>{ clearTimeout(t); clearInterval(iv); iv=0; };
  el.addEventListener('pointerdown',(e)=>{
    e.preventDefault(); ac(); fn(); stop();
    t=setTimeout(()=>{ iv=setInterval(fn,70); },260);
  });
  ['pointerup','pointerleave','pointercancel'].forEach(k=>el.addEventListener(k,stop));
}
bindHold($('bLeft'),()=>rotateView(TURN,0));
bindHold($('bRight'),()=>rotateView(-TURN,0));
bindHold($('bUp'),()=>rotateView(0,TURN*0.8));
bindHold($('bDown'),()=>rotateView(0,-TURN*0.8));
$('bHome').addEventListener('click',()=>{ac(); resetView();});
$('bCycle').addEventListener('click',()=>{ac(); cycleSel();});
$('bGo').addEventListener('click',()=>{ac(); if(state==='playing'){ if(selected<0) cycleSel(); else activate(selected);} });

btnStart.addEventListener('click',()=>{ac();startGame();});
btnRestart.addEventListener('click',()=>{ac();startLevel();});
btnAgain.addEventListener('click',()=>{ac();startLevel();});
btnNext.addEventListener('click',()=>{ac();advance();});

/* ================= 状态机 ================= */
function applyLocale(){
  document.documentElement.lang=locale;document.title=tr('title');
  document.querySelector('.titlechip').innerHTML=`<span class="dot"></span>${tr('title')}<span class="dot b"></span>`;
  stuckEl.textContent=tr('stuck');remainEl.setAttribute('aria-label',tr('remain'));btnRestart.textContent=tr('restart');
  const intro=startScreen.querySelector('.pscroll');intro.querySelector('h1').textContent=tr('introTitle');
  const paragraphs=intro.querySelectorAll(':scope > p');paragraphs[0].innerHTML='';paragraphs[0].append(document.createTextNode(tr('intro1')));const bold=document.createElement('b');bold.textContent=tr('intro1b');paragraphs[0].append(bold,document.createTextNode(tr('intro1c')));paragraphs[1].textContent=tr('intro2');
  intro.querySelectorAll('.tag').forEach((tag,index)=>tag.textContent=tr('tags')[index]);btnStart.textContent=tr('start');
  const pad=$('pad');pad.setAttribute('aria-label',tr('pad'));for(const [id,key]of[['bLeft','left'],['bUp','up'],['bDown','down'],['bRight','right'],['bHome','homeAria'],['bCycle','cycleAria'],['bGo','goAria']])$(id).setAttribute('aria-label',tr(key));
  $('bHome').textContent=tr('home');$('bCycle').textContent=tr('cycle');$('bGo').textContent=tr('go');
  toastEl.classList.remove('show');renderUI(state);
}
addEventListener('message',event=>{let parentOrigin='';try{parentOrigin=new URL(document.referrer).origin;}catch{}if(event.source!==window.parent||!parentOrigin||event.origin!==parentOrigin||event.data?.type!=='forge:locale'||!LOCALES.has(event.data.locale))return;locale=event.data.locale;applyLocale();});
function setState(s){
  state=s;
  document.body.dataset.gameState=s;
  if(s==='lost') document.body.dataset.failureReason=failureReason==='stuck'?tr('lostReason')(level,aliveCount()):(failureReason||tr('noMove'));
  window.dispatchEvent(new CustomEvent('game:state-change',{detail:{state:s}}));
  renderUI(s);
}
function renderUI(s){
  const idle=(s==='idle');
  startScreen.classList.toggle('hidden',!idle);
  btnRestart.classList.toggle('hidden',idle);
  const over=(s==='won'||s==='lost');
  resultScreen.classList.toggle('hidden',!over);
  if(over){
    if(s==='won'){
      const final=(level>=MAX_LEVEL);
      const rank=(misses<=2)?tr('rankBest'):(misses<=6?tr('rankGood'):tr('rankPass'));
      resTitle.textContent=final?tr('allWon'):tr('won')(level);
      resReason.textContent=final
        ? tr('finalCleared')(LV.blockCount,rank)
        : tr('cleared')(LV.blockCount,rank);
      resStats.textContent=tr('steps')(levelLabel(),moves,misses);
      btnNext.classList.remove('hidden');
      btnNext.textContent=final?tr('againAll'):tr('next');
      btnAgain.textContent=tr('replay');
    }else{
      resTitle.textContent=tr('lost');
      resReason.textContent=failureReason==='stuck'?tr('lostReason')(level,aliveCount()):(failureReason||tr('noMove'));
      resStats.textContent=tr('lostStats')(level,levelLabel(),moves,aliveCount());
      btnNext.classList.add('hidden');
      btnAgain.textContent=tr('retry');
    }
  }
  updateStats();
  updateStuckHint();
}
function updateStats(){
  remainEl.textContent=String(aliveCount());
  statsEl.textContent=tr('stats')(level,moves,misses);
}
function updateStuckHint(){
  let stuck=false;
  if(state==='playing'&&!anim&&aliveCount()>0){
    stuck=!blocks.some(b=>b.alive&&hasVisibleFace(b)&&canStep(b));
  }
  stuckEl.classList.toggle('show',stuck);
  btnRestart.classList.toggle('alert',stuck);
  if(stuck) toastEl.classList.remove('show');
}
let toastTimer=0;
function showGoalToast(){
  toastEl.textContent=tr('goal')(level,LAYOUT.length,levelLabel());
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toastEl.classList.remove('show'),1800);
}
function startLevel(){
  moves=0; misses=0; failureReason='';
  delete document.body.dataset.failureReason;
  blockedFX=null; trailFX=null;
  fxBlocked.style.display='none'; fxTrail.style.display='none';
  stuckEl.classList.remove('show'); btnRestart.classList.remove('alert');
  buildLayout(); setupBoard(); showGoalToast(); setState('playing');
}
function startGame(){ level=1; startLevel(); }
function advance(){
  if(level>=MAX_LEVEL) level=1; else level+=1;
  startLevel();
}

/* ================= 尺寸与渲染 ================= */
function resize(){
  const w=Math.max(1,boardEl.clientWidth), h=Math.max(1,boardEl.clientHeight);
  renderer.setSize(w,h,false);
  camera.aspect=w/h; camera.updateProjectionMatrix();
  frameCamera();
  fxSizes();
}
window.addEventListener('resize',resize);
if(window.ResizeObserver){ new ResizeObserver(resize).observe(boardEl); }

let quality=1.5, frameAcc=0, frameN=0, lastAdjust=0, prev=performance.now();
function tick(now){
  const dt=Math.min(0.05,(now-prev)/1000); prev=now;

  if(anim){
    const k=Math.min(1,(now-anim.t0)/anim.dur);
    const e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
    anim.b.mesh.position.lerpVectors(anim.from,anim.to,e);
    if(anim.exit){ const s=Math.max(0.02,1-Math.max(0,k-0.62)/0.38); anim.b.mesh.scale.set(s,s,s); }
    if(k>=1) finishMove();
  }
  const sb=selected>=0?blocks[selected]:null;
  if(sb&&sb.alive&&state==='playing'){
    outline.visible=true;
    outline.position.copy(sb.mesh.position);
    const p=1+0.05*Math.sin(now*0.006);
    outline.scale.set(p,p,p);
    const d=DIRS[sb.dir];
    const dv=new THREE.Vector3(d[0],d[1],d[2]);
    selArrow.visible=true;
    selArrow.position.copy(sb.mesh.position).addScaledVector(dv,BS*0.72+0.06*Math.sin(now*0.008));
    selArrow.quaternion.setFromUnitVectors(CONE_UP,dv);
  }else{ outline.visible=false; selArrow.visible=false; }

  cubeGroup.updateMatrixWorld();
  updateFX(now);
  renderer.render(scene,camera);

  frameAcc+=dt*1000; frameN++;
  if(frameN>=60){
    const avg=frameAcc/frameN; frameAcc=0; frameN=0;
    if(avg>42&&quality>0.75&&now-lastAdjust>2500){
      quality=quality>1.0?1.0:0.75; renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,quality)); resize(); lastAdjust=now;
    }
  }
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden) renderer.setAnimationLoop(null);
  else { prev=performance.now(); renderer.setAnimationLoop(tick); }
});

/* ================= 启动 ================= */
buildLayout();
setupBoard();
resize();
setState('idle');
applyLocale();
renderer.setAnimationLoop(tick);

/* ================= 探针 ================= */
if(new URLSearchParams(location.search).has('probe')){
  window.__GAME_DEBUG__={
    getState:()=>({
      state,level,maxLevel:MAX_LEVEL,seed:layoutSeed,
      difficulty:{blockCount:LV.blockCount},
      contentVariant:LV.variant,
      runtimeSignature:LV.signature,
      mechanicsActive:['perspective-align'],
      milestone:LV.milestone,
      box:{nx:LV.nx,ny:LV.ny,nz:LV.nz},
      view:{yaw:camYaw,pitch:camPitch},
      remaining:aliveCount(),blockCount:LV.blockCount,moves,misses,failureReason,
      visibleAlive:blocks.filter(b=>b.alive&&hasVisibleFace(b)).length,
      visibleMovable:blocks.filter(b=>b.alive&&hasVisibleFace(b)&&canStep(b)).length,
      tripleSameDir:countTripleSameDir(),
      layout:blocks.filter(b=>b.alive).map(b=>({x:b.cell[0],y:b.cell[1],z:b.cell[2],dir:b.dir}))
    }),
    setLevel:(n)=>{ level=clamp(Math.round(Number(n))||1,1,MAX_LEVEL); startLevel(); return level; },
    restart:()=>{ startLevel(); return true; },
    forceWin:()=>{ anim=null; blocks.forEach(b=>{b.alive=false;b.mesh.visible=false;}); grid.fill(0); setState('won'); return true; },
    forceLose:(cause)=>{ anim=null; failureReason=cause||'stuck'; setState('lost'); return true; }
  };
}

/* forge-platform:begin */

;(() => {
  if (!/^\/(play|version)\//.test(location.pathname)) return;
  const identity = {"projectId":"6c230413-7c83-43b8-bb11-f0349d73e0de","versionId":"9af83569-741c-4970-ae1c-5894c011a5a5"};
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
