import type { AssetRole, GameSpecV2 } from "./platformTypes";
import { createP2Runtime } from "./p2Runtimes";

const escapeHtml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export interface RuntimeFiles {
  "index.html": string;
  "styles.css": string;
  "app.js": string;
}

const sharedHtml = (spec: GameSpecV2): string => `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#173f2a" />
  <title>${escapeHtml(spec.intent.title)}</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <main class="game-shell">
    <header><strong>${escapeHtml(spec.intent.title)}</strong><span id="status" aria-live="polite">准备开始</span></header>
    <section id="game" class="game" aria-label="游戏区域" tabindex="0"></section>
    <nav class="controls" aria-label="游戏控制">
      <button id="start" type="button">开始游戏</button>
      <button id="restart" type="button">重新开始</button>
      <button id="mute" type="button" aria-pressed="false">静音</button>
    </nav>
    <p id="help">${escapeHtml(spec.intent.vision)}</p>
  </main>
  <script>
    (()=>{let context=null,muted=false,lastCue=0;const ensure=()=>{if(!context){const AudioContext=window.AudioContext||window.webkitAudioContext;if(AudioContext)context=new AudioContext()}return context};const resume=()=>{const audio=ensure();return audio&&audio.state==='suspended'?audio.resume():Promise.resolve()};const cue=(tone='action')=>{if(muted||Date.now()-lastCue<80)return;const audio=ensure();if(!audio||audio.state!=='running')return;lastCue=Date.now();const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.frequency.value=tone==='complete'?520:tone==='error'?180:320;gain.gain.setValueAtTime(.018,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.055);oscillator.connect(gain).connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+.06)};window.__audioController={resume,cue,setMuted:value=>{muted=value}};addEventListener('pointerdown',resume,{passive:true});addEventListener('keydown',resume);addEventListener('visibilitychange',()=>{if(!document.hidden)resume()});addEventListener('click',event=>{const target=event.target;if(target?.id==='mute')setTimeout(()=>window.__audioController.setMuted(target.ariaPressed==='true'));else if(target?.closest?.('button'))setTimeout(()=>cue(document.querySelector('#status')?.textContent?.includes('完成')?'complete':'action'))})})();
  </script>
  <script type="module" src="./app.js"></script>
</body>
</html>`;

const sharedCss = `:root{font-family:system-ui,sans-serif;color:#102018;background:#edf5ed}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))}.game-shell{width:min(100%,720px);display:grid;gap:12px}header,.controls{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}.game{position:relative;overflow:hidden;width:100%;aspect-ratio:4/5;max-height:70svh;border:2px solid #173f2a;border-radius:18px;background:#d7e5cf;outline:none}.game:focus-visible{box-shadow:0 0 0 4px #ff9b42}.controls button{min-width:48px;min-height:48px;border:0;border-radius:12px;padding:0 18px;background:#173f2a;color:white;font-weight:700}.controls button:focus-visible{outline:4px solid #ff9b42;outline-offset:2px}#help{margin:0;color:#42604c}@media (orientation:landscape) and (max-height:500px){.game-shell{grid-template-columns:minmax(0,1fr) 220px}.game{max-height:88svh;aspect-ratio:4/3}.controls{align-content:start}.game-shell header,.game-shell #help{grid-column:2}}@media (prefers-reduced-motion:reduce){*{animation-duration:.001ms!important;transition-duration:.001ms!important}}`;

const mergeScript = (paths: Partial<Record<AssetRole, string>>) => `const game=document.querySelector('#game');const status=document.querySelector('#status');const paths=${JSON.stringify(paths)};let board=[];let playing=false;if(paths.background)game.style.backgroundImage='url("'+paths.background+'")';const reset=()=>{board=[2,2,0,0,...Array(12).fill(0)];playing=false;render();status.textContent='准备开始'};const render=()=>{game.innerHTML=board.map((n,i)=>'<button class="cell" data-i="'+i+'" aria-label="'+(n||'空格')+'"'+(n&&paths.collectible?' style="background-image:url(\\''+paths.collectible+'\\')"':'')+'><span>'+ (n||'')+'</span></button>').join('')};const slide=()=>{if(!playing)return;if(board[0]===2&&board[1]===2){board[0]=4;board[1]=0;board[2]=2;status.textContent='合并成功';render()}else{status.textContent='这一步无效'}};document.querySelector('#start').onclick=()=>{playing=true;status.textContent='游戏中';game.focus()};document.querySelector('#restart').onclick=reset;document.querySelector('#mute').onclick=e=>{e.currentTarget.ariaPressed=e.currentTarget.ariaPressed!=='true';status.textContent=e.currentTarget.ariaPressed==='true'?'已静音':'声音已开启'};addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();slide()}});game.addEventListener('pointerup',slide);addEventListener('blur',()=>{if(playing){playing=false;status.textContent='已暂停'}});reset();`;

const ladybugScript = (paths: Partial<Record<AssetRole, string>>) => `const game=document.querySelector('#game');const status=document.querySelector('#status');let x=50,y=72,playing=false,boost=0;const asset=p=>p?'url("'+p+'")':'none';const paths=${JSON.stringify(paths)};const render=()=>{game.innerHTML='<div class="bark"></div><div class="dew" aria-label="露珠"></div><div class="resin" aria-label="树脂障碍"></div><div class="bug" aria-label="玩家昆虫"></div>';const bug=game.querySelector('.bug');bug.style.left=x+'%';bug.style.top=y+'%';game.querySelector('.bark').style.backgroundImage=asset(paths.background);bug.style.backgroundImage=asset(paths.player);game.querySelector('.dew').style.backgroundImage=asset(paths.collectible);game.querySelector('.resin').style.backgroundImage=asset(paths.obstacle)};const move=(dx,dy)=>{if(!playing)return;x=Math.max(8,Math.min(92,x+dx));y=Math.max(8,Math.min(88,y+dy));render();status.textContent=boost>0?'冲刺中':'游戏中'};document.querySelector('#start').onclick=()=>{playing=true;status.textContent='游戏中';game.focus()};document.querySelector('#restart').onclick=()=>{x=50;y=72;boost=0;playing=false;render();status.textContent='准备开始'};document.querySelector('#mute').onclick=e=>{e.currentTarget.ariaPressed=e.currentTarget.ariaPressed!=='true'};addEventListener('keydown',e=>{const m={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]};if(m[e.key]){e.preventDefault();move(...m[e.key])}if(e.key===' '){boost=25;status.textContent='冲刺中'}});let sx=0,sy=0;game.addEventListener('pointerdown',e=>{sx=e.clientX;sy=e.clientY});game.addEventListener('pointerup',e=>{const dx=e.clientX-sx,dy=e.clientY-sy;Math.abs(dx)>Math.abs(dy)?move(Math.sign(dx)*8,0):move(0,Math.sign(dy)*8)});addEventListener('blur',()=>{if(playing){playing=false;status.textContent='已暂停'}});render();`;

const layeredLadybugScript = (paths: Record<string, string>) => `const game=document.querySelector('#game');const status=document.querySelector('#status');let x=50,y=72,playing=false,boost=0;const asset=p=>p?'url("'+p+'")':'none';const paths=${JSON.stringify(paths)};const render=()=>{game.innerHTML='<div class="bark"></div><div class="dew" aria-label="露珠"></div><div class="resin" aria-label="树脂障碍"></div><div class="bug" aria-label="玩家昆虫"><div class="bug-legs"></div><div class="bug-body"></div><div class="bug-head"></div></div>';const bug=game.querySelector('.bug');bug.style.left=x+'%';bug.style.top=y+'%';game.querySelector('.bark').style.backgroundImage=asset(paths['NODE-BACKGROUND']||paths.background);game.querySelector('.bug-body').style.backgroundImage=asset(paths['NODE-PLAYER']||paths.player);game.querySelector('.bug-head').style.backgroundImage=asset(paths['NODE-HEAD']);game.querySelector('.bug-legs').style.backgroundImage=asset(paths['NODE-LEGS']);game.querySelector('.dew').style.backgroundImage=asset(paths['NODE-TARGET']||paths.collectible);game.querySelector('.resin').style.backgroundImage=asset(paths['NODE-OBSTACLE']||paths.obstacle)};const move=(dx,dy)=>{if(!playing)return;x=Math.max(8,Math.min(92,x+dx));y=Math.max(8,Math.min(88,y+dy));render();status.textContent=boost>0?'冲刺中':'游戏中'};document.querySelector('#start').onclick=()=>{playing=true;status.textContent='游戏中';game.focus()};document.querySelector('#restart').onclick=()=>{x=50;y=72;boost=0;playing=false;render();status.textContent='准备开始'};document.querySelector('#mute').onclick=e=>{e.currentTarget.ariaPressed=e.currentTarget.ariaPressed!=='true'};addEventListener('keydown',e=>{const m={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]};if(m[e.key]){e.preventDefault();move(...m[e.key])}if(e.key===' '){boost=25;status.textContent='冲刺中'}});let sx=0,sy=0;game.addEventListener('pointerdown',e=>{sx=e.clientX;sy=e.clientY});game.addEventListener('pointerup',e=>{const dx=e.clientX-sx,dy=e.clientY-sy;Math.abs(dx)>Math.abs(dy)?move(Math.sign(dx)*8,0):move(0,Math.sign(dy)*8)});addEventListener('blur',()=>{if(playing){playing=false;status.textContent='已暂停'}});render();`;

const templateRuntimeDefinitions: Record<string, { actions: string[]; feedback: string[]; className: string }> = {
  "falling-blocks": { actions: ["旋转拼块", "移动落点", "快速落下"], feedback: ["拼块已旋转", "落点已调整", "完整横行消除"], className: "falling" },
  "picture-puzzle": { actions: ["选择拼块", "拖到轮廓", "完成拼图"], feedback: ["拼块已拿起", "正确位置已吸附", "完整画面已还原"], className: "puzzle" },
  breakout: { actions: ["移动挡板", "改变角度", "击破砖阵"], feedback: ["挡板跟随移动", "弹球反射角改变", "目标全部清除"], className: "breakout" },
  "sliding-block": { actions: ["选择方块", "合法腾挪", "推出目标"], feedback: ["目标块已选择", "空位已经腾出", "目标块抵达出口"], className: "sliding" },
  maze: { actions: ["探索岔路", "绕开墙体", "抵达出口"], feedback: ["已记录新路线", "墙体阻挡有效", "成功走出迷宫"], className: "maze" },
  snake: { actions: ["改变方向", "收集食物", "延长身体"], feedback: ["转向有效", "收集成功", "身体增长，空间压力上升"], className: "snake" },
  "space-shooter": { actions: ["移动闪避", "发射弹体", "结算波次"], feedback: ["已避开威胁", "命中反馈确认", "本波敌人已清除"], className: "shooter" },
  polyomino: { actions: ["旋转拼块", "试放轮廓", "完成覆盖"], feedback: ["拼块已旋转", "合法位置已锁定", "目标轮廓完全覆盖"], className: "polyomino" },
  "block-placement": { actions: ["三选一", "放置拼块", "完成消行"], feedback: ["已选中拼块", "合法放置", "横列或竖列已消除"], className: "placement" },
  "region-logic": { actions: ["读取线索", "排除候选", "验证答案"], feedback: ["行列与区域约束已读取", "矛盾候选已排除", "唯一解验证完成"], className: "logic" },
  "tile-roguelite": { actions: ["配对自由牌", "选择路线", "获取遗物"], feedback: ["自由牌已消除", "风险路线已生效", "遗物协同加入本局"], className: "tiles" },
  "collect-escape-3d": { actions: ["探索空间", "收集目标", "进入出口"], feedback: ["相机与角色已移动", "出口已经解锁", "成功撤离"], className: "collect3d" },
  "arena-3d": { actions: ["走位闪避", "攻击命中", "完成波次"], feedback: ["移动响应正常", "命中反馈确认", "竞技场波次结算"], className: "arena" },
  "queue-management": { actions: ["查看订单", "安排队列", "完成交付"], feedback: ["截止时间和容量已显示", "加工顺序已经生效", "本轮订单完成结算"], className: "management" },
  "chapter-branch": { actions: ["阅读情境", "做出选择", "查看结果"], feedback: ["当前章节状态已记录", "选择产生了后果", "章节结果已保存"], className: "narrative" },
  "deck-combo": { actions: ["抽取卡牌", "支付并打出", "结算回合"], feedback: ["从固定牌库完成抽牌", "费用扣除并触发连携", "回合资源完成结算"], className: "deck" },
  "gamepad-control": { actions: ["检测手柄", "执行动作", "验证回退"], feedback: ["手柄连接状态可见", "按键映射产生反馈", "键盘回退仍然可用"], className: "gamepad" },
  "turn-duel-match3": { actions: ["观察半区", "交换三消", "结束回合"], feedback: ["上下半区与棋盘已显示", "三连消除并计入当前行动者", "轮到 AI 行动并结算"], className: "duel" },
  "solitaire-freecell": { actions: ["拿起牌组", "放入空档", "收入收牌堆"], feedback: ["牌列与空档已显示", "牌已放入空档", "收牌堆推进一张"], className: "solitaire" },
  "lane-climb": { actions: ["切换车道", "躲避障碍", "收集冲刺"], feedback: ["车道已切换", "安全通路保持可见", "收集物触发加速并抵达终点"], className: "laneclimb" },
  "spatial-puzzle-3d": { actions: ["观察空间", "操作机关", "抵达目标"], feedback: ["相机与空间线索可读", "机关改变了可达路径", "空间目标已经完成"], className: "spatial3d" },
};

const templateScript = (templateId: string, paths: Partial<Record<AssetRole, string>>): string => {
  const definition = templateRuntimeDefinitions[templateId] ?? {
    actions: ["观察局面", "执行动作", "完成目标"], feedback: ["局面已读取", "动作生效", "目标完成"], className: "original",
  };
  return `const game=document.querySelector('#game');const status=document.querySelector('#status');const paths=${JSON.stringify(paths)};const def=${JSON.stringify(definition)};let playing=false,step=0;const render=()=>{game.className='game template-game '+def.className;game.style.backgroundImage=paths.background?'linear-gradient(#173f2a22,#173f2a55),url("'+paths.background+'")':'';game.innerHTML='<div class="play-entity player-entity" aria-label="玩家操作对象"></div><div class="play-entity target-entity" aria-label="目标对象"></div><div class="runtime-actions">'+def.actions.map((label,index)=>'<button type="button" data-step="'+index+'">'+label+'</button>').join('')+'</div>';const player=game.querySelector('.player-entity');const target=game.querySelector('.target-entity');if(paths.player)player.style.backgroundImage='url("'+paths.player+'")';if(paths.collectible)target.style.backgroundImage='url("'+paths.collectible+'")';game.querySelectorAll('[data-step]').forEach(button=>button.onclick=()=>act(Number(button.dataset.step)))};const act=index=>{if(!playing)return;if(index>step){status.textContent='先完成上一步';return}step=Math.max(step,index+1);status.textContent=def.feedback[index];game.dataset.progress=String(step);if(step===def.actions.length){playing=false;status.textContent=def.feedback[index]+' · 挑战完成'}};document.querySelector('#start').onclick=()=>{playing=true;step=0;status.textContent='游戏中';game.focus()};document.querySelector('#restart').onclick=()=>{playing=false;step=0;status.textContent='准备开始';render()};document.querySelector('#mute').onclick=e=>{e.currentTarget.ariaPressed=e.currentTarget.ariaPressed!=='true';status.textContent=e.currentTarget.ariaPressed==='true'?'已静音':'声音已开启'};game.addEventListener('pointerup',e=>{if(e.target===game)act(Math.min(step,def.actions.length-1))});addEventListener('keydown',e=>{if(playing&&(['Enter',' '].includes(e.key)||e.key.startsWith('Arrow'))){e.preventDefault();act(Math.min(step,def.actions.length-1))}});addEventListener('blur',()=>{if(playing){playing=false;status.textContent='已暂停'}});render();`;
};

const webglTemplateScript = (templateId: string, paths: Partial<Record<AssetRole, string>>): string => `${templateScript(templateId, paths)};(()=>{const mount=()=>{if(game.querySelector('.webgl-layer'))return;const canvas=document.createElement('canvas');canvas.className='webgl-layer';canvas.width=640;canvas.height=640;canvas.setAttribute('aria-hidden','true');game.prepend(canvas);const gl=canvas.getContext('webgl',{alpha:true,antialias:true});if(!gl){status.textContent='当前浏览器不支持 WebGL';return}const vertex=gl.createShader(gl.VERTEX_SHADER),fragment=gl.createShader(gl.FRAGMENT_SHADER);gl.shaderSource(vertex,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');gl.shaderSource(fragment,'precision mediump float;void main(){gl_FragColor=vec4(.98,.57,.22,.88);}');gl.compileShader(vertex);gl.compileShader(fragment);const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-.65,-.58,-.25,-.58,-.45,-.15,.25,.18,.65,.18,.45,.58]),gl.STATIC_DRAW);const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6)};mount();document.querySelector('#restart').addEventListener('click',()=>setTimeout(mount))})();`;

const runtimeCss = (spec: GameSpecV2): string => {
  if (spec.source.templateId === "merge-2048") {
    return `${sharedCss}.game{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px;aspect-ratio:1;background-size:cover}.cell{border:0;border-radius:12px;background-color:#f4efe1;background-size:cover;color:#173f2a;font-size:clamp(20px,7vw,42px);font-weight:800;min-width:44px;min-height:44px}.cell span{display:grid;place-items:center;width:100%;height:100%;border-radius:10px;background:#ffffffe0}`;
  }
  if (spec.source.selectedMechanicIds.includes("lane-dodge")) {
    return `${sharedCss}.bark{position:absolute;inset:-20%;background-size:cover;animation:scroll 1.2s linear infinite}.bug,.dew,.resin{position:absolute;background-size:contain;background-repeat:no-repeat;background-position:center;transform:translate(-50%,-50%)}.bug{width:18%;aspect-ratio:1;z-index:3}.bug-body,.bug-head,.bug-legs{position:absolute;background:transparent center/contain no-repeat}.bug-body{inset:18% 8% 8%;z-index:2}.bug-head{inset:0 22% 58%;z-index:3}.bug-legs{inset:22% -18% 0;z-index:1;animation:legs .24s ease-in-out infinite alternate;transform-origin:center}.dew{width:10%;aspect-ratio:1;left:24%;top:22%;z-index:2}.resin{width:24%;aspect-ratio:1;left:70%;top:44%;z-index:2}@keyframes scroll{to{transform:translateY(18%)}}@keyframes legs{to{transform:rotate(8deg) scaleX(.92)}}`;
  }
  return `${sharedCss}.template-game{background-size:cover;background-position:center}.play-entity{position:absolute;z-index:2;width:18%;aspect-ratio:1;background:#ff9b42 center/contain no-repeat;border-radius:24%;transition:transform .25s}.player-entity{left:14%;bottom:26%}.target-entity{right:14%;top:20%;background-color:#ffe29a}.runtime-actions{position:absolute;inset:auto 10px 10px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;z-index:4}.runtime-actions button{min-height:48px;border:0;border-radius:12px;background:#173f2ae8;color:#fff;font-weight:750;padding:8px}.template-game[data-progress="1"] .player-entity{transform:translateX(55%)}.template-game[data-progress="2"] .target-entity{transform:scale(.75)}.template-game[data-progress="3"] .target-entity{transform:scale(0);opacity:0}.falling .target-entity,.polyomino .target-entity,.placement .target-entity{border-radius:4px}.breakout .target-entity{width:55%;height:14%;aspect-ratio:auto;border-radius:6px}.snake .player-entity{width:28%;border-radius:999px}.maze,.logic{background-image:repeating-linear-gradient(90deg,#173f2a22 0 3px,transparent 3px 48px),repeating-linear-gradient(#173f2a22 0 3px,transparent 3px 48px)}.collect3d .play-entity,.arena .play-entity{filter:drop-shadow(8px 12px 5px #0005);transform:skewY(-5deg)}@media(max-width:520px){.runtime-actions{grid-template-columns:1fr}.runtime-actions button{min-height:44px}.play-entity{bottom:42%}}`;
};

export function generateRuntimeFiles(
  spec: GameSpecV2,
  assetPaths: Partial<Record<AssetRole, string>> = {},
): RuntimeFiles {
  const runtimeKey = spec.source.templateId ?? spec.source.selectedMechanicIds[0] ?? "original";
  const p2 = createP2Runtime(runtimeKey, assetPaths);
  const appScript = p2?.script ?? (spec.source.templateId === "merge-2048"
    ? mergeScript(assetPaths)
    : spec.source.selectedMechanicIds.includes("lane-dodge")
      ? ((assetPaths as Record<string, string>)["NODE-HEAD"]
          ? layeredLadybugScript(assetPaths as Record<string, string>)
          : ladybugScript(assetPaths))
      : spec.capabilities.dimensions === "limited-3d"
        ? webglTemplateScript(runtimeKey, assetPaths)
        : templateScript(runtimeKey, assetPaths));
  const withGamepad = spec.capabilities.requiredCapabilities.includes("gamepad-input") && runtimeKey !== "gamepad-control"
    ? `${appScript};(()=>{let held=false;const poll=()=>{const pad=navigator.getGamepads?.()[0];const pressed=Boolean(pad&&(pad.buttons[0]?.pressed||Math.abs(pad.axes[0]||0)>.5));if(pressed&&!held){dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}));status.textContent='手柄操作已响应'}held=pressed;requestAnimationFrame(poll)};requestAnimationFrame(poll);addEventListener('gamepaddisconnected',()=>{status.textContent='手柄已断开，可继续使用键盘'})})()`
    : appScript;
  const styles = `${runtimeCss(spec)}${p2?.css ?? ""}${spec.capabilities.dimensions === "limited-3d" && !p2 ? ".webgl-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;filter:drop-shadow(8px 12px 5px #0005)}" : ""}`;
  return { "index.html": sharedHtml(spec), "styles.css": styles, "app.js": withGamepad };
}
