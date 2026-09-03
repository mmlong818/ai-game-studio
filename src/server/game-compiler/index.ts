import { createHash } from "node:crypto";
import { parseGameProjectV3, type GameProjectV3 } from "../../shared/project-schema/index.js";
import { validateRegisteredRules } from "../../shared/rules/index.js";

export type CompiledGameFiles = {
  "index.html": string;
  "styles.css": string;
  "app.js": string;
  "_studio/GAME_PROJECT_V3.json": string;
  "_studio/COMPILE_REPORT.json": string;
};

function assertCompilable(project: GameProjectV3) {
  const errors = validateRegisteredRules(project);
  const visualObjects = project.objects.filter(({ role }) => ["player", "hazard", "collectible", "background", "effect"].includes(role));
  visualObjects.forEach((object) => {
    if (object.resourceIds.length === 0) errors.push(`${object.name} 没有绑定 AI 位图资源`);
  });
  project.resources.forEach((resource) => {
    if (resource.mimeType === "image/svg+xml" || resource.path.toLowerCase().endsWith(".svg")) errors.push(`禁止 SVG 游戏美术：${resource.path}`);
    if (resource.provenance === "licensed" && !resource.license.trim()) errors.push(`授权资源缺少许可：${resource.path}`);
  });
  if (!project.controls.touch || !project.controls.keyboard) errors.push("1.1 游戏必须同时支持触控和键盘");
  if (errors.length) throw new Error(`GameProjectV3 编译前检查失败：${errors.join("；")}`);
}

export function compileGameProjectV3(input: GameProjectV3): CompiledGameFiles {
  const project = parseGameProjectV3(input);
  assertCompilable(project);
  const projectJson = JSON.stringify(project, null, 2);
  const runtimeProject = JSON.stringify(project).replaceAll("<", "\\u003c");
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${project.metadata.title}</title><link rel="stylesheet" href="styles.css"></head>
<body data-game-state="idle"><main><header><strong id="title"></strong><span id="status">准备开始</span><span id="score">0</span></header><section id="stage"><canvas id="game" width="900" height="1600" tabindex="0"></canvas><div id="result" hidden></div></section><nav id="touch-controls" aria-label="移动控制"><button data-direction="up">↑</button><button data-direction="left">←</button><button data-direction="down">↓</button><button data-direction="right">→</button></nav><footer><button id="start">开始</button><button id="restart">重新开始</button></footer></main><script src="app.js"></script></body></html>`;
  const css = `:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#101917;color:#fff}*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#101917}main{width:min(100%,720px);height:100dvh;display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;gap:10px;padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom))}header,footer{display:flex;align-items:center;justify-content:space-between;gap:10px}#stage{min-height:0;position:relative;overflow:hidden;border-radius:20px;background:#17231f}canvas{display:block;width:100%;height:100%;object-fit:contain;touch-action:none}button{min-width:48px;min-height:48px;border:0;border-radius:14px;background:#f3d66d;color:#17231f;font:700 16px inherit}#touch-controls{display:grid;grid-template-columns:repeat(3,54px);grid-template-areas:'. up .' 'left down right';justify-content:center;gap:6px}#touch-controls [data-direction=up]{grid-area:up}#touch-controls [data-direction=left]{grid-area:left}#touch-controls [data-direction=down]{grid-area:down}#touch-controls [data-direction=right]{grid-area:right}@media(pointer:fine){#touch-controls{display:none}}`;
  const script = `(() => {
const project=${runtimeProject};
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d'),status=document.querySelector('#status'),scoreNode=document.querySelector('#score'),start=document.querySelector('#start'),restart=document.querySelector('#restart');
document.querySelector('#title').textContent=project.metadata.title;
const resources=Object.fromEntries(project.resources.map(resource=>[resource.id,resource]));
const images={}; project.resources.filter(resource=>resource.mimeType.startsWith('image/')).forEach(resource=>{const image=new Image();image.src=resource.path;images[resource.id]=image});
const initial=()=>({gameState:'idle',variables:Object.fromEntries(project.variables.map(variable=>[variable.id,structuredClone(variable.initialValue)])),instances:Object.fromEntries(project.scenes.find(scene=>scene.id===project.startSceneId).instances.map(instance=>[instance.id,{...structuredClone(instance),active:true}])),last:performance.now()});
let state=initial(),runtimeParameters={'game-speed':1,'spawn-rate':1,'feedback-intensity':1};
const objectById=id=>project.objects.find(object=>object.id===id),instancesByObject=id=>Object.values(state.instances).filter(instance=>instance.objectId===id&&instance.active);
const emit=(type,detail)=>dispatchEvent(new CustomEvent(type,{detail}));
const applyAction=(action,signal)=>{const refs=action.references||[];if(action.type==='state.set')state.gameState=String(action.parameters.value);if(action.type==='variable.add'){const id=String(action.parameters.id);state.variables[id]=Number(state.variables[id]||0)+Number(action.parameters.value||0)}if(action.type==='variable.set')state.variables[String(action.parameters.id)]=action.parameters.value;if(action.type==='entity.destroy')refs.forEach(ref=>{const targets=ref.kind==='instance'?[state.instances[ref.id]]:instancesByObject(ref.id);targets.filter(Boolean).forEach(target=>target.active=false)});if(action.type==='movement.apply'&&signal.direction)refs.forEach(ref=>{const targets=ref.kind==='instance'?[state.instances[ref.id]]:instancesByObject(ref.id);targets.filter(Boolean).forEach(target=>{target.position.x+=signal.direction.x*Number(action.parameters.distance||1);target.position.y+=signal.direction.y*Number(action.parameters.distance||1)})});if(action.type==='feedback.emit')emit('forge:rule',{type:action.parameters.type||'generic'})};
const condition=(item,signal)=>{if(item.type==='state.is')return state.gameState===item.parameters.value;if(item.type==='input.received')return signal.type==='input'&&(!item.parameters.action||item.parameters.action===signal.action);if(item.type==='collision.overlap')return signal.type==='collision';if(item.type==='timer.elapsed')return signal.type==='timer'&&signal.elapsedMs>=Number(item.parameters.minimumMs||0);if(item.type==='variable.compare'){const actual=state.variables[String(item.parameters.id)],expected=item.parameters.value;return item.parameters.operator==='greater-or-equal'?Number(actual)>=Number(expected):actual===expected}return false};
const runRules=signal=>project.rules.filter(rule=>rule.enabled&&rule.when.every(item=>condition(item,signal))).forEach(rule=>{rule.then.forEach(action=>applyAction(action,signal));emit('forge:rule',{ruleId:rule.id})});
const move=direction=>{if(state.gameState!=='playing')return;const player=project.objects.find(object=>object.role==='player');if(!player)return;const behavior=player.behaviors.find(item=>/movement/.test(item.moduleId));const distance=Number(behavior?.parameters.speed||240)*runtimeParameters['game-speed']/30;instancesByObject(player.id).forEach(instance=>{instance.position.x=Math.max(0,Math.min(100,instance.position.x+direction.x*distance/10));instance.position.y=Math.max(0,Math.min(100,instance.position.y+direction.y*distance/10))});runRules({type:'input',direction});collisions()};
const collisions=()=>{const playerObject=project.objects.find(object=>object.role==='player'),player=playerObject&&instancesByObject(playerObject.id)[0];if(!player)return;for(const targetObject of project.objects.filter(object=>object.role==='collectible'||object.role==='hazard'))for(const target of instancesByObject(targetObject.id)){const hit=Math.abs(player.position.x-target.position.x)<(player.size.width+target.size.width)/2&&Math.abs(player.position.y-target.position.y)<(player.size.height+target.size.height)/2;if(hit){runRules({type:'collision',sourceId:playerObject.id,targetId:targetObject.id});emit('forge:collision',{sourceId:playerObject.id,targetId:targetObject.id})}}};
const draw=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);const scene=project.scenes.find(scene=>scene.id===project.startSceneId);[...scene.instances].sort((a,b)=>a.layer-b.layer).forEach(base=>{const instance=state.instances[base.id],object=objectById(base.objectId);if(!instance?.active||!instance.visible||!object||object.renderer==='dom')return;const resource=object.resourceIds.map(id=>resources[id]).find(Boolean),image=resource&&images[resource.id],x=instance.position.x/100*canvas.width,y=instance.position.y/100*canvas.height,w=instance.size.width/100*canvas.width,h=instance.size.height/100*canvas.height;if(image?.complete&&image.naturalWidth)ctx.drawImage(image,x-w*instance.anchor.x,y-h*instance.anchor.y,w,h)});scoreNode.textContent=String(state.variables['VARIABLE-SCORE']||0);document.body.dataset.gameState=state.gameState;requestAnimationFrame(draw)};
const reset=()=>{state=initial();status.textContent='准备开始'};start.onclick=()=>{state.gameState='playing';status.textContent='游戏进行中';canvas.focus()};restart.onclick=reset;
const directions={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};document.querySelectorAll('[data-direction]').forEach(button=>button.onclick=()=>move(directions[button.dataset.direction]));addEventListener('keydown',event=>{const key={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'}[event.key];if(key){event.preventDefault();move(directions[key])}});addEventListener('forge:hot-parameter',event=>{if(event.detail?.name in runtimeParameters)runtimeParameters[event.detail.name]=event.detail.value});reset();requestAnimationFrame(draw);
})();`;
  const report = {
    schemaVersion: 1,
    platformRelease: "1.1",
    projectHash: createHash("sha256").update(projectJson).digest("hex"),
    objectCount: project.objects.length,
    ruleCount: project.rules.length,
    resourceCount: project.resources.length,
    generatedFiles: ["index.html", "styles.css", "app.js", "_studio/GAME_PROJECT_V3.json"],
  };
  return { "index.html": html, "styles.css": css, "app.js": script, "_studio/GAME_PROJECT_V3.json": projectJson, "_studio/COMPILE_REPORT.json": JSON.stringify(report, null, 2) };
}
