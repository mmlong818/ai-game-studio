export function generatedDesignHtml(_legacySignal = "shot-fired") {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>生成游戏设计验收样例</title><style>
html,body{margin:0;min-height:100%;overflow-x:hidden;background:#101827;color:white}body{background-image:url("./assets/background.png");background-size:cover}button{min-width:88px;min-height:48px}#game-canvas{display:block;width:min(90vw,720px);height:auto;aspect-ratio:4/3;background:#17243a}
</style></head><body><button id="start">开始</button><button id="restart">重新开始</button><canvas id="game-canvas" width="720" height="540"></canvas><script>
let state="idle",pressureClock=0,shots=0,currentLevel=1,failureReason="",currentRules=null;
const stageNames=["基础瞄准","移动目标","护盾取舍","连锁射击","风暴决战"];
function rulesFor(level){
  const safeLevel=Math.max(1,Math.min(20,Math.round(Number(level)||1)));
  const stage=Math.floor((safeLevel-1)/4);
  const contentVariant=stageNames[stage];
  const difficulty={
    goalMultiplier:Number((1+(safeLevel-1)*0.04).toFixed(2)),
    speedMultiplier:Number((1+(safeLevel-1)*0.03).toFixed(2)),
    densityMultiplier:Number((1+(safeLevel-1)*0.025).toFixed(3))
  };
  const targetCount=3+safeLevel+stage*2;
  const enemyPattern=["fixed","patrol","shielded","chain","storm"][stage];
  return {level:safeLevel,difficulty,contentVariant,targetCount,enemyPattern,mechanicsActive:["aim","shoot",enemyPattern],runtimeSignature:JSON.stringify({contentVariant,targetCount,enemyPattern,laneCount:stage+1})};
}
function applyLevel(level){currentRules=rulesFor(level);currentLevel=currentRules.level;shots=0;failureReason="";document.body.dataset.contentVariant=currentRules.contentVariant;}
function setState(next){state=next;document.body.dataset.gameState=next;dispatchEvent(new CustomEvent("game:state-change",{detail:{state:next}}));}
function fireShot(){shots+=currentRules.enemyPattern==="chain"?2:1;}
function restart(){applyLevel(currentLevel);setState("playing");}
setInterval(()=>{if(state==="playing")pressureClock+=currentRules.speedMultiplier;},80);
document.querySelector("#start").addEventListener("click",()=>{applyLevel(currentLevel);setState("playing");});
document.querySelector("#restart").addEventListener("click",()=>setState("idle"));
applyLevel(1);setState("idle");
if(new URLSearchParams(location.search).has("probe")){window.__GAME_DEBUG__={
  getState:()=>({state,score:shots,level:currentLevel,pressureClock,failureReason,difficulty:{...currentRules.difficulty},contentVariant:currentRules.contentVariant,runtimeSignature:currentRules.runtimeSignature,mechanicsActive:[...currentRules.mechanicsActive],targetCount:currentRules.targetCount}),
  setLevel:(level)=>applyLevel(level),restart,
  forceWin:()=>setState("won"),
  forceLose:(cause="目标未完成")=>{failureReason=String(cause);setState("lost");},
  fireShot
};}
safeStorage.setItem("generated-design-fixture","1");
</script></body></html>`;
}
