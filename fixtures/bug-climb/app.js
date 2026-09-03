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

(function(){
'use strict';
var canvas=document.getElementById('game-canvas'),ctx=canvas.getContext('2d');
var aiBackground=new Image(),aiLadybug=new Image(),aiBackgroundReady=false,aiLadybugReady=false;
var aiSprites={dew:new Image(),seed:new Image(),knot:new Image(),resin:new Image()},spriteReady={dew:false,seed:false,knot:false,resin:false};
aiBackground.decoding='async';aiLadybug.decoding='async';
aiBackground.addEventListener('load',function(){aiBackgroundReady=true});aiLadybug.addEventListener('load',function(){aiLadybugReady=true});
aiBackground.src='./assets/background.png?v=topdown-v10';aiLadybug.src='./assets/ladybug.png?v=body-v13';
Object.keys(aiSprites).forEach(function(key){var image=aiSprites[key];image.decoding='async';image.addEventListener('load',function(){spriteReady[key]=true});image.src='./assets/'+({dew:'dew.png',seed:'seed.png',knot:'tree-knot.png',resin:'amber-resin.png'}[key])});
var overlay=document.getElementById('overlay'),modal=document.getElementById('modal'),toast=document.getElementById('toast');
var ui={score:document.getElementById('score'),multi:document.getElementById('multi'),time:document.getElementById('time'),timerPanel:document.getElementById('timerPanel'),laneLabel:document.getElementById('laneLabel'),speed:document.getElementById('speed'),speedState:document.getElementById('speedState'),level:document.getElementById('level'),hp:document.getElementById('hpFill'),nitro:document.getElementById('nitroFill'),route:document.getElementById('route'),routeText:document.getElementById('routeText'),restart:document.getElementById('restart'),flash:document.getElementById('flash')};
var state='idle',score=0,level=0,lane=1,visualLane=1,climbY=540,visualClimbY=540,legPhase=0,hp=3,maxHp=3,nitro=0,nitroMax=100,mult=1,timeLeft=34,segment=0,entities=[],spawnMeter=0,boosting=false,boostMix=0,startedMove=false,freeze=0,invuln=0,last=performance.now(),checkpointSave=null,totalRemaining=0,nearMisses=0,collisions=0,selectedCar=0,finishAward=0,soundOn=true,audio=null,toastTimer=0,firstPattern=true,shake=0,steerKick=0,speedFx=0,nearPulse=0,damagePulse=0,impactText='',impactColor='#fff',impactLife=0,particles=[],roadTravel=0,sceneScaleX=1,reducedMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var speeds=[82,102,124,148],segmentLength=2000,carDefs=[{name:'圆点瓢虫',desc:'轻巧均衡',need:0},{name:'橡果甲虫',desc:'+1体力',need:8},{name:'微光萤火虫',desc:'露珠强化',need:20}];
function storeGet(k,d){try{if(window.safeStorage){var v=window.safeStorage.getItem(k);return v==null?d:v}}catch(e){}return d}
function storeSet(k,v){try{if(window.safeStorage)window.safeStorage.setItem(k,String(v))}catch(e){}}
var shards=parseInt(storeGet('forest_seeds',storeGet('neon_shards','0')),10)||0;
function setState(s){if(state===s)return;state=s;document.body.dataset.gameState=s;window.dispatchEvent(new CustomEvent('game:state-change',{detail:{state:s}}));}
window.dispatchEvent(new CustomEvent('game:state-change',{detail:{state:'idle'}}));
function initAudio(){if(!soundOn)return;try{if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume()}catch(e){}}
function tone(freq,dur,type,vol,delay){if(!soundOn)return;initAudio();if(!audio)return;var o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+(delay||0),safeType=type==='triangle'?'triangle':'sine',gain=Math.min(.045,vol||.032),release=Math.max(.08,dur);o.type=safeType;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(80,freq*.96),t+release);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+release);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+release+.04)}
function chord(){tone(440,.24,'sine',.032);tone(554,.28,'triangle',.026,.07);tone(659,.34,'sine',.022,.14)}
function showToast(t,ms){toast.textContent=t;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){toast.classList.remove('show')},ms||1300)}
function flash(){ui.flash.classList.remove('go');void ui.flash.offsetWidth;ui.flash.classList.add('go')}
function kickText(text,color,life){impactText=text;impactColor=color;impactLife=life||.72}
function burstAt(l,d,color,count,power){var q=projection(l,d),amount=reducedMotion?Math.min(7,count):count;for(var i=0;i<amount;i++){var a=Math.PI*2*i/amount+Math.random()*.35,s=(30+Math.random()*110)*(power||1);particles.push({x:q.x,y:q.y-q.scale*28,vx:Math.cos(a)*s,vy:Math.sin(a)*s-45,life:.42+Math.random()*.34,max:.76,size:2+Math.random()*4,color:color})}}
function updateEffects(dt){var targetBoost=boosting&&nitro>0?1:0;boostMix+=(targetBoost-boostMix)*Math.min(1,dt*(targetBoost?10:5));var baseIntensity=startedMove?.5+level*.12:0;speedFx+=(Math.min(1.55,baseIntensity+boostMix*1.05)-speedFx)*Math.min(1,dt*7);steerKick*=Math.exp(-dt*11);nearPulse=Math.max(0,nearPulse-dt*2.7);damagePulse=Math.max(0,damagePulse-dt*2.4);if(impactLife>0)impactLife=Math.max(0,impactLife-dt);for(var i=particles.length-1;i>=0;i--){var p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=110*dt;p.vx*=Math.pow(.12,dt);if(p.life<=0)particles.splice(i,1)}}
function carsHTML(){return carDefs.map(function(c,i){var locked=shards<c.need;return '<button class="car '+(selectedCar===i?'selected ':'')+(locked?'locked':'')+'" data-car="'+i+'"><span class="carStatus">'+(locked?'需 '+c.need+' 颗种子':c.name)+'</span><small>'+c.desc+'</small></button>'}).join('')}
function showIdle(){overlay.classList.remove('hidden');ui.restart.hidden=true;modal.innerHTML='<span class="eyebrow">树冠远足队</span><h1>虫虫攀枝</h1><div class="goal">惊险躲过树瘤，头部碰到露珠即可吸收；能量充足时加速冲破琥珀树脂，一路爬向树冠。</div><div class="carList">'+carsHTML()+'</div><div class="settings"><button class="toggle" data-set="high">高对比</button><button class="toggle" data-set="colorblind">色觉辅助</button><button class="toggle" data-set="noFlash">柔和动效</button></div><p class="mini">使用上下左右在树皮上爬动。水滴碰到头部会爆开并转成露珠能量；树瘤要绕开，琥珀树脂需要按住冲刺撞碎。</p><button class="primary" id="start">开始爬树</button>';
}
function resetValues(){score=0;level=0;lane=1;visualLane=1;climbY=540;visualClimbY=540;legPhase=0;maxHp=selectedCar===1?4:3;hp=maxHp;nitro=0;nitroMax=selectedCar===2?125:100;mult=1;timeLeft=34;segment=0;entities=[];spawnMeter=0;boosting=false;boostMix=0;startedMove=false;freeze=0;invuln=0;checkpointSave=null;totalRemaining=0;nearMisses=0;collisions=0;firstPattern=true;finishAward=0;shake=0;steerKick=0;speedFx=0;nearPulse=0;damagePulse=0;impactLife=0;particles=[];roadTravel=0;document.body.classList.remove('boosting');}
function beginFresh(){initAudio();resetValues();setState('playing');overlay.classList.add('hidden');ui.restart.hidden=false;showToast('使用上下左右开始爬动',2600);tone(392,.12,'sine',.025);updateUI();}
function resumeCheckpoint(){if(!checkpointSave)return;var s=checkpointSave;score=s.score;level=s.level;lane=s.lane;visualLane=s.lane;climbY=s.climbY||540;visualClimbY=climbY;hp=s.hp;maxHp=s.maxHp;nitro=s.nitro;nitroMax=s.nitroMax;mult=s.mult;timeLeft=s.timeLeft;segment=0;entities=[];spawnMeter=0;startedMove=true;freeze=.22;invuln=1;firstPattern=false;collisions=s.collisions;nearMisses=s.nearMisses;totalRemaining=s.totalRemaining;speedFx=.55;kickText('回到树干',palette().white,.8);setState('playing');overlay.classList.add('hidden');ui.restart.hidden=false;showToast('树层 '+level+'：继续向上爬',1200);chord();updateUI();}
function startMoving(){if(startedMove)return;startedMove=true;speedFx=.7;kickText('出发啦！',palette().yellow,.9);shake=reducedMotion?0:.18;showToast('开始攀爬！头部碰到露珠即可吸收',1500);tone(294,.2,'sine',.028);tone(440,.2,'triangle',.018,.06);spawnTutorial()}
function changeLane(dir){if(state!=='playing')return;var old=lane;lane=Math.max(0,Math.min(2,lane+dir));if(old!==lane){steerKick=dir;tone(430+level*38,.08,'triangle',.022);startMoving()}}
function changeDepth(dir){if(state!=='playing')return;var old=climbY;climbY=Math.max(430,Math.min(590,climbY+dir*55));if(old!==climbY){tone(dir<0?520:360,.08,'triangle',.02);startMoving()}}
function spawnTutorial(){entities.push({kind:'chip',lane:lane,d:520,res:false},{kind:'chip',lane:lane,d:600,res:false},{kind:'chip',lane:lane,d:680,res:false},{kind:'chip',lane:lane,d:760,res:false});var blocked=lane===1?0:1;entities.push({kind:'normal',lane:blocked,d:850,res:false,moving:false,warn:false});firstPattern=false;}
function addEntity(kind,l,d,moving){entities.push({kind:kind,lane:l,d:d,res:false,moving:!!moving,base:l,phase:Math.random()*6.28,warn:false})}
function spawnPattern(){var gaps=[315,285,255,225],gap=gaps[level];spawnMeter-=gap;var safe=Math.floor(Math.random()*3),doubleBlock=level>=2&&Math.random()<.44;var danger=level>=1&&Math.random()<.32;var lanes=[0,1,2].filter(function(x){return x!==safe});var count=doubleBlock?2:1;for(var i=0;i<count;i++){var red=Math.random()<(level*.12+.13);addEntity(red?'red':'normal',lanes[i],920+i*15,level>=1&&Math.random()<.25)}var chipLane=danger?lanes[Math.floor(Math.random()*lanes.length)]:safe;addEntity('chip',chipLane,790,false);if(Math.random()<.6)addEntity('chip',chipLane,850,false);if(danger&&Math.random()<.45)addEntity('shard',chipLane,875,false);}
function currentSpeed(){return speeds[level]*(1+boostMix*.88)}
function opticMultiplier(){return 1.75+boostMix*.72}
function checkpoint(){level++;timeLeft=34;segment=0;entities=[];spawnMeter=0;freeze=.22;score+=500*mult;totalRemaining+=timeLeft;checkpointSave={score:score,level:level,lane:lane,climbY:climbY,hp:hp,maxHp:maxHp,nitro:nitro,nitroMax:nitroMax,mult:mult,timeLeft:34,collisions:collisions,nearMisses:nearMisses,totalRemaining:totalRemaining};speedFx=1.1;nearPulse=1;shake=reducedMotion?0:.32;kickText('抵达树层 '+level+' · 越爬越快',palette().yellow,1.15);chord();flash();showToast('树层 '+level+'/3 · 攀爬速度提升',1400);if(navigator.vibrate)navigator.vibrate([35,30,60]);}
function lose(reason){if(state!=='playing')return;boosting=false;setState('lost');ui.restart.hidden=false;overlay.classList.remove('hidden');tone(196,.32,'sine',.03);tone(147,.38,'triangle',.018,.08);modal.innerHTML='<span class="eyebrow">抱紧树皮</span><h1>滑下来啦</h1><div class="goal">'+reason+'</div><div class="resultGrid"><div>树层<strong>'+level+'/3</strong></div><div>花粉<strong>'+Math.floor(score)+'</strong></div><div>最近落脚点<strong>'+(checkpointSave?'树层 '+checkpointSave.level:'无')+'</strong></div></div><p>可以从最近树层恢复当时的体力、露珠、花粉与剩余时间。</p>'+(checkpointSave?'<button class="continueBtn" id="continue">从树层继续</button>':'<span class="mini">还没到达落脚点，请重新出发。</span>');}
function win(){if(state!=='playing'||level<3||hp<=0||timeLeft<=0)return;boosting=false;totalRemaining+=timeLeft;var scoreBonus=Math.min(5,Math.floor(score/2200)),timeBonus=Math.min(3,Math.floor(totalRemaining/36)),healthBonus=hp;finishAward=2+scoreBonus+timeBonus+healthBonus;shards+=finishAward;storeSet('forest_seeds',shards);setState('won');ui.restart.hidden=false;overlay.classList.remove('hidden');chord();setTimeout(chord,260);flash();modal.innerHTML='<span class="eyebrow">欢迎来到树冠</span><h1>登顶成功！</h1><div class="goal">已穿过3个树层并抵达树冠，体力仍然充足。</div><div class="resultGrid"><div>花粉表现<strong>+'+scoreBonus+'</strong></div><div>剩余时间<strong>+'+timeBonus+'</strong></div><div>体力表现<strong>+'+healthBonus+'</strong></div></div><p><b>金色种子：基础2 + 表现'+(scoreBonus+timeBonus+healthBonus)+' = '+finishAward+'</b><br>当前累计 '+shards+' 颗，可在重新出发时解锁新昆虫。</p>';}
function collide(e){if(e.res)return;e.res=true;var colors=palette();if(e.kind==='chip'){nitro=Math.min(nitroMax,nitro+25);score+=80*mult;burstAt(e.lane,e.d,colors.cyan,20,1.25);nearPulse=Math.max(nearPulse,.55);kickText('露珠爆开 +25',colors.cyan,.58);tone(620+nitro*2,.13,'sine',.032);tone(930,.16,'triangle',.017,.05);showToast('头部吸收露珠 +25',520);return}if(e.kind==='shard'){score+=250*mult;burstAt(e.lane,e.d,colors.yellow,15,1);kickText('金色种子 +250',colors.yellow,.62);tone(784,.18,'triangle',.032);tone(1047,.2,'sine',.019,.06);showToast('发现一颗金色种子',620);return}if(e.kind==='red'&&boosting&&nitro>0){score+=300*mult;nearPulse=1;burstAt(e.lane,e.d,colors.red,28,1.75);kickText('树脂碎开 +300',colors.white,.86);flash();tone(220,.16,'triangle',.04);tone(330,.18,'sine',.025,.05);showToast('冲破树脂 · 连续保持',720);if(navigator.vibrate)navigator.vibrate([35,22,65]);return}if(invuln>0)return;hp--;collisions++;mult=1;invuln=1.15;damagePulse=1;burstAt(e.lane,e.d,colors.red,18,1.25);kickText('撞到啦 · 连续清零',colors.red,.9);tone(174,.26,'triangle',.036);tone(131,.3,'sine',.022,.06);showToast(e.kind==='red'?'露珠不足，树脂挡住了去路':'撞到树瘤！请及时换树纹',900);if(navigator.vibrate)navigator.vibrate(90);if(hp<=0)lose('体力降到0。树瘤要绕开，琥珀树脂需要按住冲刺撞碎。');}
function entityWidth(e){var q=projection(e.lane,e.d);return(13+q.scale*73)*(sceneScaleX<.7?.78:1)}
function entityTouchesPlayer(e){var q=projection(e.lane,e.d),w=entityWidth(e),scale=carVisualScale();if(e.kind==='chip'||e.kind==='shard'){var pickupCenter=q.y-w*.56,headCenter=visualClimbY-64*scale.y;return Math.abs(pickupCenter-headCenter)<Math.max(26,w*.46)}var obstacleCenter=q.y-w*.52,bodyCenter=visualClimbY-19*scale.y;return Math.abs(obstacleCenter-bodyCenter)<Math.max(31,w*.48)}
function entityPassedPlayer(e){return projection(e.lane,e.d).y>visualClimbY+68}
function update(dt){
  if(state!=='playing')return;
  visualLane+=(lane-visualLane)*Math.min(1,dt*(selectedCar===0?20:24));
  visualClimbY+=(climbY-visualClimbY)*Math.min(1,dt*15);
  if(startedMove)legPhase+=dt*(8+speedFx*6+boostMix*7);
  if(!startedMove)return;
  if(freeze>0){freeze-=dt;return}
  if(invuln>0)invuln-=dt;
  if(boosting&&nitro>0){nitro=Math.max(0,nitro-dt*(selectedCar===2?21:27));if(nitro<=0)boosting=false}
  timeLeft-=dt;
  if(timeLeft<=0){timeLeft=0;lose(level<3?'没能在倒计时内抵达下一个树层。':'没能在倒计时内爬到树冠。');return}
  var adv=currentSpeed()*dt;
  segment+=adv;
  roadTravel+=adv*opticMultiplier();
  spawnMeter+=adv;
  if(spawnMeter>[315,285,255,225][level])spawnPattern();
  for(var i=entities.length-1;i>=0;i--){
    var e=entities[i];
    e.d-=adv;
    if(e.moving&&!e.res)e.lane=Math.max(0,Math.min(2,e.base+Math.sin(performance.now()/440+e.phase)*.68));
    var warnLead=currentSpeed()*([1.35,1.15,1,0.9][level])+180;
    if(!e.warn&&(e.kind==='normal'||e.kind==='red')&&e.d<warnLead&&e.d>80){e.warn=true;if(navigator.vibrate)navigator.vibrate(22);tone(e.kind==='red'?330:392,.08,'triangle',.014)}
    if(!e.res&&Math.abs(e.lane-visualLane)<.3&&entityTouchesPlayer(e))collide(e);
    if(!e.res&&entityPassedPlayer(e)&&(e.kind==='normal'||e.kind==='red')){
      e.res=true;
      var diff=Math.abs(e.lane-visualLane);
      if(diff<1.2){nearMisses++;mult=Math.min(5,mult+1);nitro=Math.min(nitroMax,nitro+12);score+=120*mult;nearPulse=1;burstAt(e.lane,20,palette().cyan,14,1.1);kickText('惊险躲过 · 露珠 +12 · ×'+mult,palette().cyan,.82);flash();tone(698,.1,'triangle',.027);tone(988,.12,'sine',.019,.07);showToast('惊险躲过 · 连续 ×'+mult,650)}
    }
    if(e.d<-100)entities.splice(i,1)
  }
  score+=adv*.12*mult;
  if(segment>=segmentLength){if(level<3)checkpoint();else win()}
  if(shake>0)shake-=dt;
}
var ROAD={top:-72,bottom:620,half:330,far:920};
function palette(){var blind=document.body.classList.contains('colorblind');return{cyan:blind?'#8ed5ff':'#83dbe2',yellow:'#f8cf55',red:blind?'#d86ba5':'#e7953d',violet:blind?'#68b9e9':'#ef8969',white:'#fff4d6',road:'#9a5833',roadAlt:'#b66b3c',leaf:blind?'#65b9e8':'#67b85c',leafDark:blind?'#286b94':'#2e6f3b',barkDark:'#4b2b1e',cream:'#ffe8b1'}}
function roadGeometry(d){var p=Math.max(0,Math.min(1,1-d/ROAD.far));return{p:p,depth:p,y:ROAD.bottom-(d/ROAD.far)*(ROAD.bottom-ROAD.top),half:ROAD.half,scale:.82}}
function projection(l,d){var r=roadGeometry(d);return{x:450+(l-1)*(ROAD.half*2/3),y:r.y,p:r.p,depth:r.depth,half:ROAD.half,scale:r.scale}}
function roadPoint(n,d){var r=roadGeometry(d);return{x:450+n*r.half,y:r.y}}
function mobileX(x){return 450+(x-450)*sceneScaleX}
function polygon(points,fill,stroke,width){ctx.beginPath();points.forEach(function(p,i){if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)});ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width||1;ctx.stroke()}}
function quad(a,b,c,d,fill){polygon([a,b,c,d],fill)}
function drawLeaf(x,y,size,angle,color){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-size);ctx.bezierCurveTo(size*.9,-size*.45,size*.86,size*.55,0,size);ctx.bezierCurveTo(-size*.86,size*.55,-size*.9,-size*.45,0,-size);ctx.fill();ctx.strokeStyle='rgba(46,91,48,.48)';ctx.lineWidth=Math.max(1,size*.08);ctx.beginPath();ctx.moveTo(0,-size*.72);ctx.lineTo(0,size*.72);ctx.stroke();ctx.restore()}
function drawTrackMarker(side,d,colors){var base=roadPoint(side*1.1,d),r=roadGeometry(d),h=13+r.scale*40,w=4+r.scale*8;ctx.save();ctx.translate(base.x,base.y);ctx.rotate(side*.08);ctx.strokeStyle=colors.barkDark;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,3);ctx.lineTo(-side*w*.4,-h);ctx.stroke();drawLeaf(-side*w*1.2,-h*.72,w*1.45,-side*.65,colors.leaf);drawLeaf(side*w*.7,-h*.48,w*1.25,side*.62,colors.yellow);ctx.restore()}
function drawFinishGate(d,colors){if(d>ROAD.far||d<-40)return;var left=roadPoint(-1.02,d),right=roadPoint(1.02,d),r=roadGeometry(d),h=28+r.scale*120,beam=5+r.scale*12;ctx.save();ctx.strokeStyle=colors.barkDark;ctx.lineWidth=beam*1.8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(left.x,left.y);ctx.quadraticCurveTo(left.x+beam*.5,left.y-h,right.x,right.y-h*.92);ctx.stroke();ctx.beginPath();ctx.moveTo(right.x,right.y);ctx.quadraticCurveTo(right.x-beam*.5,right.y-h,left.x,left.y-h*.92);ctx.stroke();for(var i=0;i<9;i++){var x=left.x+(right.x-left.x)*i/8,y=left.y-h+Math.sin(i*.9)*beam*1.5;drawLeaf(x,y,beam*1.1,(i%2?1:-1)*.7,i%3===0?colors.yellow:colors.leaf)}ctx.fillStyle=colors.cream;ctx.strokeStyle=colors.barkDark;ctx.lineWidth=Math.max(1.5,r.scale*3);ctx.beginPath();ctx.roundRect(450-56*r.scale,left.y-h+beam*.2,112*r.scale,30*r.scale,10*r.scale);ctx.fill();ctx.stroke();ctx.fillStyle=colors.barkDark;ctx.font='900 '+Math.max(10,17*r.scale)+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('树冠到了！',450,left.y-h+beam*.2+15*r.scale);ctx.restore()}
function drawAiBackground(){if(!aiBackgroundReady)return;var sourceWidth=aiBackground.naturalWidth||aiBackground.width,sourceHeight=aiBackground.naturalHeight||aiBackground.height,tileHeight=900*sourceHeight/sourceWidth,travel=roadTravel*1.16,cycle=Math.floor(travel/tileHeight),offset=travel-cycle*tileHeight;for(var k=-1;k<=1;k++){var y=offset+k*tileHeight,tileIndex=k-cycle;ctx.save();if(Math.abs(tileIndex)%2===1){ctx.translate(0,y+tileHeight);ctx.scale(1,-1);ctx.drawImage(aiBackground,0,-1,900,tileHeight+2)}else ctx.drawImage(aiBackground,0,y-1,900,tileHeight+2);ctx.restore()}}
function drawRoad(t){
  var colors=palette();
  drawAiBackground();
  if(!aiBackgroundReady){var fallback=ctx.createLinearGradient(0,0,0,675);fallback.addColorStop(0,'#b9d991');fallback.addColorStop(.32,'#6e9b57');fallback.addColorStop(1,'#345c39');ctx.fillStyle=fallback;ctx.fillRect(0,0,900,675)}
  ctx.save();

  var sceneShade=ctx.createRadialGradient(450,390,175,450,350,620);sceneShade.addColorStop(0,'rgba(255,246,195,0)');sceneShade.addColorStop(.7,'rgba(22,51,30,.03)');sceneShade.addColorStop(1,'rgba(8,29,17,.3)');ctx.fillStyle=sceneShade;ctx.fillRect(0,0,900,675);

  [-1/3,1/3].forEach(function(n){
    var x=roadPoint(n,0).x;ctx.strokeStyle='rgba(35,48,26,.36)';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x,-10);ctx.lineTo(x,685);ctx.stroke();ctx.strokeStyle='rgba(204,226,139,.34)';ctx.lineWidth=2;ctx.stroke();
  });

  var fleckStep=96,travel=roadTravel*1.55;
  for(var fi=0;fi<14;fi++){
    var y=((fi*fleckStep+travel)%760)-45,x=132+((fi*173)%636),longMark=fi%4===0,len=(longMark?22:10)*(1+boostMix*1.2);ctx.strokeStyle=longMark?'rgba(255,238,176,'+(.12+boostMix*.12)+')':'rgba(175,211,122,.12)';ctx.lineWidth=longMark?2:1;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y-len);ctx.lineTo(x,y+len);ctx.stroke();
  }
  for(var li=0;li<3;li++){var lp=projection(li,0),active=li===lane;ctx.beginPath();ctx.roundRect(lp.x-(active?30:17),640,active?60:34,7,5);ctx.fillStyle=active?'rgba(255,223,111,.92)':'rgba(255,244,214,.3)';ctx.fill()}
  if(level===3&&segment>1020)drawFinishGate(segmentLength-segment,colors);
  ctx.restore();
}
function drawCollectible(e,q,w,colors){
  var isShard=e.kind==='shard',spin=performance.now()/650,sprite=isShard?aiSprites.seed:aiSprites.dew,ready=isShard?spriteReady.seed:spriteReady.dew;ctx.save();ctx.rotate(Math.sin(spin)*.07);
  if(ready){var spriteSize=w*(isShard?1.16:1.08);ctx.drawImage(sprite,-spriteSize*.5,-spriteSize*1.03,spriteSize,spriteSize);ctx.restore();return}
  if(isShard){
    ctx.fillStyle=colors.yellow;ctx.strokeStyle=colors.barkDark;ctx.lineWidth=Math.max(1.5,q.scale*3);ctx.beginPath();ctx.ellipse(0,-w*.48,w*.24,w*.42,.18,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff2ac';ctx.beginPath();ctx.ellipse(-w*.07,-w*.62,w*.065,w*.13,.18,0,Math.PI*2);ctx.fill();
    drawLeaf(w*.18,-w*.82,w*.12,.7,colors.leaf);
  }else{
    var drop=ctx.createLinearGradient(-w*.2,-w*.85,w*.22,-w*.1);drop.addColorStop(0,'#e8ffff');drop.addColorStop(.35,colors.cyan);drop.addColorStop(1,'#3c9fa9');ctx.fillStyle=drop;ctx.strokeStyle='#245c5e';ctx.lineWidth=Math.max(1.5,q.scale*3);
    ctx.beginPath();ctx.moveTo(0,-w*.94);ctx.bezierCurveTo(w*.14,-w*.67,w*.34,-w*.44,w*.34,-w*.27);ctx.bezierCurveTo(w*.34,w*.02,-w*.34,w*.02,-w*.34,-w*.27);ctx.bezierCurveTo(-w*.34,-w*.44,-w*.14,-w*.67,0,-w*.94);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.ellipse(-w*.11,-w*.48,w*.07,w*.13,-.3,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function drawBarrier(e,q,w,colors){
  var h=w*.72;ctx.save();if(e.res){ctx.globalAlpha=.22;ctx.rotate((e.lane-1)*.12)}
  var obstacle=e.kind==='red'?aiSprites.resin:aiSprites.knot,obstacleReady=e.kind==='red'?spriteReady.resin:spriteReady.knot;
  if(obstacleReady){var obstacleSize=w*(e.kind==='red'?1.17:1.28);ctx.drawImage(obstacle,-obstacleSize*.5,-obstacleSize,obstacleSize,obstacleSize);ctx.restore();return}
  if(e.kind==='red'){
    var resin=ctx.createLinearGradient(-w*.4,-h,w*.4,0);resin.addColorStop(0,'#ffe48d');resin.addColorStop(.42,'#f1a83d');resin.addColorStop(1,'#b86424');ctx.fillStyle=resin;ctx.strokeStyle='#7a441f';ctx.lineWidth=Math.max(2,q.scale*4);
    ctx.beginPath();ctx.moveTo(-w*.42,-h*.55);ctx.bezierCurveTo(-w*.56,-h*.94,-w*.15,-h*1.08,w*.05,-h*.85);ctx.bezierCurveTo(w*.35,-h*1.08,w*.58,-h*.68,w*.43,-h*.42);ctx.bezierCurveTo(w*.58,-h*.05,w*.16,w*.08,-w*.06,-h*.08);ctx.bezierCurveTo(-w*.34,h*.08,-w*.56,-h*.2,-w*.42,-h*.55);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(255,255,224,.72)';ctx.beginPath();ctx.ellipse(-w*.13,-h*.7,w*.09,h*.16,-.45,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffcc55';ctx.beginPath();ctx.arc(w*.22,-h*.3,w*.08,0,Math.PI*2);ctx.fill();
  }else{
    ctx.fillStyle='#6e3d28';ctx.strokeStyle='#3e291d';ctx.lineWidth=Math.max(2,q.scale*4);ctx.beginPath();ctx.ellipse(0,-h*.35,w*.48,h*.48,-.08,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#b87648';ctx.lineWidth=Math.max(1.5,q.scale*3);ctx.beginPath();ctx.ellipse(0,-h*.35,w*.25,h*.24,-.08,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(-w*.03,-h*.35,w*.08,0,Math.PI*1.6);ctx.stroke();
    ctx.fillStyle='#f1d89a';ctx.strokeStyle='#68452c';ctx.lineWidth=Math.max(1,q.scale*2);ctx.beginPath();ctx.ellipse(-w*.24,-h*.88,w*.25,h*.15,-.08,Math.PI,Math.PI*2);ctx.lineTo(0,-h*.75);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#e8b15b';ctx.fillRect(-w*.27,-h*.74,w*.09,h*.32);
    if(e.moving){ctx.strokeStyle='#4d732e';ctx.lineWidth=Math.max(2,q.scale*4);ctx.beginPath();ctx.moveTo(w*.15,-h*.74);ctx.lineTo(w*.52,-h*1.08);ctx.lineTo(w*.36,-h*.7);ctx.stroke();drawLeaf(w*.48,-h*1.04,w*.13,.65,colors.leaf)}
  }
  ctx.restore();
}
function drawEntity(e){if(e.d>ROAD.far+10||e.d<-80||e.res&&(e.kind==='chip'||e.kind==='shard'))return;var colors=palette(),q=projection(e.lane,e.d),w=entityWidth(e);ctx.save();ctx.translate(mobileX(q.x),q.y);if(e.kind==='chip'||e.kind==='shard')drawCollectible(e,q,w,colors);else drawBarrier(e,q,w,colors);ctx.restore()}
function carVisualScale(){return sceneScaleX<.7?{x:.5,y:.6}:{x:.88,y:.82}}
function carTemplateMetrics(){var laneWidth=roadGeometry(112).half*2/3*sceneScaleX,baseWidth=selectedCar===1?120:112,scale=carVisualScale(),carWidth=baseWidth*.82*scale.x,speed=currentSpeed();return{camera:'orthographic-topdown',backgroundScroll:true,verticalMovement:true,headPickup:true,backgroundPixelsPerSecond:speed*opticMultiplier()*1.16,carWidth:carWidth,laneWidth:laneWidth,widthRatio:carWidth/laneWidth,heightRatio:88*scale.y/675,opticMultiplier:opticMultiplier(),opticalSpeed:speed*opticMultiplier(),speed:speed,lane:lane,visualLane:visualLane,playerY:Math.round(visualClimbY),warningSeconds:([1.35,1.15,1,.9][level]*speed+180)/speed}}
function drawScaledCar(){var q=projection(visualLane,112),x=mobileX(q.x),y=visualClimbY,scale=carVisualScale();ctx.save();ctx.translate(x,y);ctx.scale(scale.x,scale.y);ctx.translate(-x,-y);drawCar();ctx.restore()}
function drawBugLegs(w,step,ink){var rootY=[-76,-49,-17],rootX=[.25,.34,.39],endX=[.39,.5,.5],endOffset=[-12,0,14],warm='#8a5033';ctx.lineCap='round';ctx.lineJoin='round';for(var side=-1;side<=1;side+=2){for(var i=0;i<3;i++){var phase=step+i*2.1+(side>0?Math.PI:0),swing=startedMove?Math.sin(phase)*6:0,retract=startedMove?Math.cos(phase)*2:0,rx=side*w*rootX[i],ry=rootY[i],ex=side*w*(endX[i]+retract/w),ey=ry+endOffset[i]+swing,kx=side*w*(rootX[i]+endX[i])*.52,ky=ry+endOffset[i]*.42-swing*.35;ctx.strokeStyle=ink;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(rx,ry);ctx.quadraticCurveTo(kx,ky,ex,ey);ctx.stroke();ctx.strokeStyle=warm;ctx.lineWidth=2.1;ctx.beginPath();ctx.moveTo(rx,ry);ctx.quadraticCurveTo(kx,ky,ex,ey);ctx.stroke();ctx.fillStyle=ink;ctx.beginPath();ctx.arc(ex,ey,2.5,0,Math.PI*2);ctx.fill()}}}
function drawBugFace(w,ink){ctx.fillStyle='#fffdf0';ctx.strokeStyle=ink;ctx.lineWidth=3;[-1,1].forEach(function(side){ctx.beginPath();ctx.ellipse(side*w*.105,-63,w*.095,12,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=ink;ctx.beginPath();ctx.arc(side*w*.08,-61,3.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fffdf0'});ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-56,8,.24,Math.PI-.24);ctx.stroke()}
function drawCar(){
  var colors=palette(),q=projection(visualLane,112),x=mobileX(q.x),y=visualClimbY,w=selectedCar===1?120:112,ink='#3d2c22',step=legPhase;
  if(shake>0&&!reducedMotion)x+=(Math.random()-.5)*18;
  ctx.save();ctx.translate(x,y+Math.sin(step)*speedFx*1.5);ctx.rotate(-steerKick*.055);
  ctx.fillStyle='rgba(58,34,22,.34)';ctx.beginPath();ctx.ellipse(0,39,w*.48,15,0,0,Math.PI*2);ctx.fill();
  if(boostMix>.04){
    ctx.globalAlpha=.45+.4*boostMix;for(var trail=0;trail<4;trail++){var ty=48+trail*18+boostMix*28,tx=(trail%2?1:-1)*(8+trail*5);drawLeaf(tx,ty,8+trail*1.5,(trail%2?1:-1)*.45,trail%2?colors.cyan:colors.leaf)}ctx.globalAlpha=1;
  }
  drawBugLegs(w,step,ink);
  if(aiLadybugReady){ctx.save();ctx.globalAlpha=invuln>0&&Math.floor(invuln*12)%2?.42:1;if(selectedCar===1)ctx.filter='sepia(.5) saturate(.75) hue-rotate(340deg)';if(selectedCar===2)ctx.filter='sepia(.35) saturate(.8) hue-rotate(70deg)';ctx.drawImage(aiLadybug,-w*.7,-w*1.05,w*1.4,w*1.4);ctx.restore();ctx.restore();return}
  if(selectedCar===2){ctx.globalAlpha=.72;ctx.fillStyle='#dff3ca';ctx.strokeStyle='#4f7952';ctx.lineWidth=3;[-1,1].forEach(function(side){ctx.beginPath();ctx.ellipse(side*w*.33,-21,w*.23,39,side*.32,0,Math.PI*2);ctx.fill();ctx.stroke()});ctx.globalAlpha=1}
  ctx.fillStyle=invuln>0&&Math.floor(invuln*12)%2?colors.white:(selectedCar===0?'#e85f45':selectedCar===1?'#9f6338':'#5eb978');ctx.strokeStyle=ink;ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(0,-12,w*.38,53,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  if(selectedCar===0){ctx.strokeStyle=ink;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-62);ctx.lineTo(0,39);ctx.stroke();ctx.fillStyle=ink;[-1,1].forEach(function(side){[-30,4,25].forEach(function(dy,idx){ctx.beginPath();ctx.arc(side*w*(idx===1?.19:.22),dy,5+idx,0,Math.PI*2);ctx.fill()})})}
  if(selectedCar===1){ctx.fillStyle='#c98b4c';ctx.beginPath();ctx.ellipse(0,-12,w*.16,45,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-54);ctx.lineTo(0,35);ctx.stroke();ctx.fillStyle='#f0c36c';ctx.beginPath();ctx.moveTo(0,-81);ctx.lineTo(-10,-64);ctx.lineTo(10,-64);ctx.closePath();ctx.fill();ctx.stroke()}
  if(selectedCar===2){ctx.fillStyle='#f7d85b';ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,17,w*.23,24,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff4aa';ctx.beginPath();ctx.ellipse(-6,10,6,11,-.3,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle=selectedCar===1?'#755039':'#394f37';ctx.strokeStyle=ink;ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,-64,w*.26,24,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle=ink;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-w*.12,-79);ctx.quadraticCurveTo(-w*.3,-97,-w*.38,-90);ctx.moveTo(w*.12,-79);ctx.quadraticCurveTo(w*.3,-97,w*.38,-90);ctx.stroke();
  drawBugFace(w,ink);ctx.restore();
}
function drawVelocity(){if(!startedMove||speedFx<.05)return;var colors=palette(),count=reducedMotion?8:22+Math.floor(boostMix*20);ctx.save();for(var i=0;i<count;i++){var laneBand=(i%5)/4,x=75+((i*191)%750),y=((roadTravel*(2.1+(i%4)*.18)+i*83)%780)-55,len=(18+laneBand*36)*(1+boostMix*2),alpha=(.05+laneBand*.12)*Math.min(1.4,speedFx);ctx.strokeStyle=i%4===0?'rgba(255,241,190,'+alpha+')':'rgba(154,213,116,'+(alpha*.82)+')';ctx.lineWidth=1+laneBand*1.6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y-len);ctx.lineTo(x,y+len);ctx.stroke();if(i%7===0){ctx.globalAlpha=alpha*1.2;drawLeaf(x,y,4+laneBand*5,.1,i%14===0?colors.yellow:colors.leaf);ctx.globalAlpha=1}}ctx.restore()}
function drawParticles(){ctx.save();particles.forEach(function(p,i){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();if(i%3===0)ctx.ellipse(mobileX(p.x),p.y,p.size*.7,p.size*1.5,.5,0,Math.PI*2);else ctx.arc(mobileX(p.x),p.y,p.size*.65,0,Math.PI*2);ctx.fill()});ctx.restore()}
function drawFeedback(){var colors=palette();if(nearPulse>0||damagePulse>0||boostMix>.08){var edge=ctx.createRadialGradient(450,355,130,450,355,535);edge.addColorStop(0,'rgba(0,0,0,0)');if(damagePulse>0)edge.addColorStop(1,'rgba(216,83,57,'+(.12+damagePulse*.25)+')');else edge.addColorStop(1,'rgba(241,218,112,'+(.025+boostMix*.1+nearPulse*.11)+')');ctx.fillStyle=edge;ctx.fillRect(0,0,900,675)}if(impactLife>0){var life=Math.min(1,impactLife/.28),rise=(1-Math.min(1,impactLife/.82))*26;ctx.save();ctx.globalAlpha=Math.min(1,impactLife*2.2);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 '+(26+life*9)+'px Arial';ctx.lineWidth=8;ctx.lineJoin='round';ctx.strokeStyle='rgba(57,42,28,.82)';ctx.strokeText(impactText,450,235-rise);ctx.fillStyle=impactColor;ctx.fillText(impactText,450,235-rise);ctx.restore()}}
function draw(){
  var stageWidth=canvas.parentElement.clientWidth,stageHeight=canvas.parentElement.clientHeight;
  sceneScaleX=window.innerWidth<=760&&stageHeight>stageWidth?Math.max(.38,Math.min(1,.75*stageWidth/stageHeight)):1;
  var jitter=shake>0&&!reducedMotion?shake*8:0,zoom=1+(reducedMotion?0:boostMix*.045);
  ctx.save();
  ctx.translate(450,337.5);
  ctx.rotate(reducedMotion?0:-steerKick*.014);
  ctx.scale(zoom,zoom);
  ctx.translate(-450+steerKick*7+(Math.random()-.5)*jitter,-337.5+(Math.random()-.5)*jitter);
  ctx.save();
  ctx.translate(450,0);
  ctx.scale(sceneScaleX,1);
  ctx.translate(-450,0);
  drawRoad(performance.now());
  drawVelocity();
  ctx.restore();
  entities.slice().sort(function(a,b){return b.d-a.d}).forEach(drawEntity);
  drawScaledCar();
  drawParticles();
  ctx.restore();
  drawFeedback();
}
function updateUI(){ui.score.textContent=Math.floor(score);ui.multi.textContent=mult;ui.time.textContent=timeLeft.toFixed(1);ui.timerPanel.classList.toggle('urgent',timeLeft<=10&&state==='playing');ui.laneLabel.textContent=['左纹','中纹','右纹'][lane]+' · '+(climbY<485?'上位':climbY>550?'下位':'中位');ui.speed.textContent=startedMove?Math.floor(currentSpeed()*4.2):0;ui.speedState.textContent=!startedMove?'准备出发':boostMix>.32?'露珠冲刺':mult>=4?'轻盈连跳':mult>=2?'险避连续':'稳稳攀爬';ui.level.textContent=level;ui.hp.style.width=(hp/maxHp*100)+'%';ui.nitro.style.width=(nitro/nitroMax*100)+'%';document.body.classList.toggle('boosting',boostMix>.18&&state==='playing');Array.prototype.forEach.call(ui.route.children,function(x,i){x.classList.toggle('on',i<level||(level===3&&i===3&&segment/segmentLength>.45))});ui.routeText.textContent=level<3?'树层 '+level+'/3 · 还要向上 '+Math.max(0,Math.ceil(segmentLength-segment))+'厘米':'树层 3/3 · 距离树冠 '+Math.max(0,Math.ceil(segmentLength-segment))+'厘米';}
function loop(now){var dt=Math.min(.033,(now-last)/1000);last=now;updateEffects(dt);update(dt);draw();updateUI();requestAnimationFrame(loop)}
modal.addEventListener('click',function(e){var c=e.target.closest('[data-car]');if(c){var i=+c.dataset.car;if(shards>=carDefs[i].need){selectedCar=i;showIdle()}return}var s=e.target.closest('[data-set]');if(s){document.body.classList.toggle(s.dataset.set);s.classList.toggle('on');return}if(e.target.id==='start')beginFresh();if(e.target.id==='continue')resumeCheckpoint()});
ui.restart.addEventListener('click',function(){boosting=false;setState('idle');showIdle()});
document.getElementById('sound').addEventListener('click',function(e){soundOn=!soundOn;e.target.textContent='自然音：'+(soundOn?'开':'关');if(soundOn){initAudio();tone(523,.12,'sine',.02)}});
document.getElementById('left').addEventListener('pointerdown',function(e){e.preventDefault();initAudio();changeLane(-1)});document.getElementById('right').addEventListener('pointerdown',function(e){e.preventDefault();initAudio();changeLane(1)});document.getElementById('up').addEventListener('pointerdown',function(e){e.preventDefault();initAudio();changeDepth(-1)});document.getElementById('down').addEventListener('pointerdown',function(e){e.preventDefault();initAudio();changeDepth(1)});
var boostBtn=document.getElementById('boost');function setBoost(v){if(state!=='playing')return;initAudio();var was=boosting;boosting=v&&nitro>0;boostBtn.classList.toggle('active',boosting);if(v&&!boosting&&!was){showToast('露珠不足：收集露珠或完成险避',700);tone(247,.1,'sine',.016)}if(boosting&&!was){speedFx=Math.max(speedFx,.9);nearPulse=.55;shake=reducedMotion?0:.16;kickText('露珠冲刺！',palette().cyan,.62);tone(392,.16,'triangle',.028);tone(587,.19,'sine',.019,.05);if(navigator.vibrate)navigator.vibrate(28)}}boostBtn.addEventListener('pointerdown',function(e){e.preventDefault();boostBtn.setPointerCapture(e.pointerId);setBoost(true)});boostBtn.addEventListener('pointerup',function(){setBoost(false)});boostBtn.addEventListener('pointercancel',function(){setBoost(false)});
var pointerStart=null;canvas.addEventListener('pointerdown',function(e){initAudio();pointerStart={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointerup',function(e){if(!pointerStart||state!=='playing')return;var dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y,rect=canvas.parentElement.getBoundingClientRect();if(Math.abs(dy)>28&&Math.abs(dy)>Math.abs(dx))changeDepth(dy>0?1:-1);else if(Math.abs(dx)>28)changeLane(dx>0?1:-1);else{var target=Math.max(0,Math.min(2,Math.floor((e.clientX-rect.left)/rect.width*3)));if(target!==lane)changeLane(target>lane?1:-1)}pointerStart=null});
window.addEventListener('keydown',function(e){if((e.key==='ArrowLeft'||e.key==='a'||e.key==='A')){e.preventDefault();changeLane(-1)}if((e.key==='ArrowRight'||e.key==='d'||e.key==='D')){e.preventDefault();changeLane(1)}if((e.key==='ArrowUp'||e.key==='w'||e.key==='W')){e.preventDefault();changeDepth(-1)}if((e.key==='ArrowDown'||e.key==='s'||e.key==='S')){e.preventDefault();changeDepth(1)}if(e.code==='Space'){e.preventDefault();setBoost(true)}if(e.key==='Enter'&&state==='idle'){var b=document.getElementById('start');if(b)b.click()}});window.addEventListener('keyup',function(e){if(e.code==='Space')setBoost(false)});
window.__GAME_TEMPLATE_METRICS__=carTemplateMetrics;
var debugParams=new URLSearchParams(location.search);if(debugParams.has('probe')){window.__GAME_DEBUG__={getState:function(){return{state:state,score:Math.floor(score),level:level,nitro:Math.floor(nitro),multiplier:mult,boosting:boostMix>.25,camera:'orthographic-topdown',roadTravel:Math.floor(roadTravel),playerY:Math.round(visualClimbY),targetY:climbY,legPhase:Number(legPhase.toFixed(2)),liveDrops:entities.filter(function(e){return e.kind==='chip'&&!e.res}).length,particles:particles.length}},showcase:function(){resetValues();level=2;lane=1;visualLane=1;startedMove=true;timeLeft=28;segment=420;roadTravel=360;nitro=84;boosting=true;boostMix=.9;speedFx=1.15;impactText='露珠冲刺！';impactColor=palette().cyan;impactLife=.9;entities=[{kind:'normal',lane:0,d:250,res:false,moving:false,warn:true},{kind:'chip',lane:1,d:205,res:false,moving:false,warn:false},{kind:'red',lane:2,d:310,res:false,moving:false,warn:true},{kind:'shard',lane:1,d:470,res:false,moving:false,warn:false}];setState('playing');overlay.classList.add('hidden');ui.restart.hidden=false;updateUI()},pickupTest:function(){resetValues();lane=1;visualLane=1;startedMove=true;timeLeft=28;var w=entityWidth({lane:1,d:80}),scale=carVisualScale(),desiredBase=visualClimbY-64*scale.y+w*.56,d=(ROAD.bottom-desiredBase)*ROAD.far/(ROAD.bottom-ROAD.top);entities=[{kind:'chip',lane:1,d:d,res:false,moving:false,warn:false}];setState('playing');overlay.classList.add('hidden');ui.restart.hidden=false;updateUI()},moveDepth:function(dir){changeDepth(dir)},forceWin:function(){level=3;hp=Math.max(1,hp);timeLeft=Math.max(1,timeLeft);win()},forceLose:function(){lose('调试探针触发失败。')}};if(debugParams.get('scene')==='showcase')setTimeout(window.__GAME_DEBUG__.showcase,0);if(debugParams.get('scene')==='pickup')setTimeout(window.__GAME_DEBUG__.pickupTest,0)}
showIdle();requestAnimationFrame(loop);
})();

/* forge-platform:begin */

;(() => {
  if (!/^\/(play|version)\//.test(location.pathname)) return;
  const identity = {"projectId":"78eeb515-a711-4c7d-9720-621a94924a8e","versionId":"f5eb5f58-a945-46a9-be17-562ffbcc8bf8"};
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
