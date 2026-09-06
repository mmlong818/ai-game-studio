import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join, relative } from "node:path";
import { chromium, type Browser } from "playwright";
import type { GameResearchTask } from "../shared/game-design-knowledge/research-queue.js";
import { createResearchPrototypeScenario } from "../shared/game-design-knowledge/research-prototype-family.js";
import type { DesignResearchBrowserRunInput, DesignResearchProbeRunInput } from "./design-knowledge-evidence.js";
import { closeServer, probeUrl, requireBrowserExecutable, startArtifactServer } from "./browser-quality.js";
import { materializeApprovedResearchResources } from "./research-resource-intake.js";
import type { ResearchResourceIntakeBatch } from "../shared/game-design-knowledge/research-resource-intake.js";
import { promoteApprovedResearchResourceFamilies } from "./research-resource-promotion.js";
import type { ResourceFamily } from "../shared/resource-library/index.js";
import { POCKET_WORKSHOP_RESEARCH_TASK_ID } from "../shared/game-design-knowledge/pocket-workshop-contract.js";
import { generatePocketWorkshopPrototype, inspectPocketWorkshopPrototype } from "./pocket-workshop-prototype.js";

type AutomaticPrototypeResult = {
  probeRuns: DesignResearchProbeRunInput[];
  browserRuns: DesignResearchBrowserRunInput[];
  screenshots: string[];
};

function safeJson(value: unknown) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function humanize(signal: string) {
  return signal.split(/[-_:]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function generateResearchPrototype(root: string, task: GameResearchTask) {
  if (!task.evaluation || !task.candidateDraft) throw new Error("研究任务还没有可执行的评估合同");
  const label = escapeHtml(task.candidateDraft.artifact.label);
  const queryIntent = escapeHtml(task.queryIntent);
  const signals = task.evaluation.requiredProbeSignals;
  const scenario = createResearchPrototypeScenario(task);
  mkdirSync(join(root, "_studio", "quality"), { recursive: true });
  writeFileSync(join(root, "_studio", "GAME_DESIGN_CONTRACT.json"), `${JSON.stringify(task.evaluation.contract, null, 2)}\n`, "utf8");
  if (task.evaluation.assetRequirements) writeFileSync(join(root, "_studio", "ASSET_REQUIREMENTS.json"), `${JSON.stringify(task.evaluation.assetRequirements, null, 2)}\n`, "utf8");
  if (task.evaluation.resourceGapSummary) writeFileSync(join(root, "_studio", "RESOURCE_GAPS.json"), `${JSON.stringify(task.evaluation.resourceGapSummary, null, 2)}\n`, "utf8");
  if (task.evaluation.resourceAcquisitionPlan) writeFileSync(join(root, "_studio", "RESOURCE_ACQUISITION_PLAN.json"), `${JSON.stringify(task.evaluation.resourceAcquisitionPlan, null, 2)}\n`, "utf8");
  if (task.evaluation.resourceAcquisitionTask) writeFileSync(join(root, "_studio", "RESOURCE_ACQUISITION_TASK.json"), `${JSON.stringify(task.evaluation.resourceAcquisitionTask, null, 2)}\n`, "utf8");
  if (task.evaluation.resourceIntakeBatch) writeFileSync(join(root, "_studio", "RESOURCE_INTAKE_BATCH.json"), `${JSON.stringify(task.evaluation.resourceIntakeBatch, null, 2)}\n`, "utf8");
  writeFileSync(join(root, "_studio", "PROTOTYPE_PROFILE.json"), `${JSON.stringify({ schemaVersion: "research-prototype-profile-v1", family: scenario.family, instruction: scenario.instruction, interactionSteps: scenario.interactionSteps }, null, 2)}\n`, "utf8");
  writeFileSync(join(root, "index.html"), `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${label} · 研究原型</title><link rel="stylesheet" href="./styles.css"></head>
<body data-game-state="idle" data-prototype-family="${scenario.family}"><main><header class="lab-head"><p>RESEARCH PROTOTYPE · ${task.id}</p><h1>${label}</h1><span>${queryIntent}</span></header><section class="brief" aria-labelledby="goal"><div><small>${escapeHtml(scenario.label)}</small><h2 id="goal">用真实操作证明规则因果</h2><p>${escapeHtml(scenario.instruction)} 这不是成品游戏，程序化占位只验证机制、可复现性与双端可操作性。</p></div><button id="start">开始验证</button></section><section class="board" aria-label="机制验证板"><div class="mechanic-stage"><div id="family-visual" class="family-visual" aria-live="polite"></div><div class="sequence" id="sequence"></div></div><div class="state-panel"><small>当前状态</small><strong id="state">等待开始</strong><output id="status" aria-live="polite">按“开始验证”进入安全练习。</output></div></section><section class="actions" aria-labelledby="actions-title"><header><small>玩家可见控件</small><h2 id="actions-title">完成一次真实核心动作</h2></header><div id="actions"></div></section><footer><button id="restart">重新验证</button><span>自动验收会点击这些可见控件，不用调试接口冒充玩家操作。</span></footer></main><script src="./app.js"></script><script src="./family.js"></script></body></html>`, "utf8");
  writeFileSync(join(root, "styles.css"), `:root{color-scheme:dark;font-family:"Microsoft YaHei",system-ui,sans-serif;background:#07100e;color:#ecf4ef;--acid:#ffd500;--mint:#62d4a3;--blue:#71b8ef;--line:#34443d}*{box-sizing:border-box}body{margin:0;min-height:100dvh;background:radial-gradient(circle at 75% 8%,#173329 0,transparent 34%),#07100e}button{min-width:44px;min-height:48px;border:1px solid #52645c;border-radius:6px;background:#15231e;color:#f1f6f3;font:700 14px inherit;cursor:pointer}button:focus-visible{outline:3px solid #86bff0;outline-offset:3px}button:disabled{cursor:not-allowed;opacity:.42}main{width:min(100% - 32px,980px);margin:auto;padding:38px 0 28px}.lab-head{padding:0 0 24px;border-bottom:3px solid var(--acid)}.lab-head p,.brief small,.actions small,.state-panel small{margin:0;color:#7fbda4;font:11px ui-monospace,monospace;letter-spacing:.08em}.lab-head h1{max-width:760px;margin:8px 0;font-size:clamp(34px,7vw,72px);line-height:.94;letter-spacing:-.06em}.lab-head span{color:#a8bbb1;line-height:1.6}.brief{display:grid;align-items:end;padding:24px 0;grid-template-columns:1fr auto;gap:24px}.brief h2,.actions h2{margin:5px 0 8px;font-size:22px}.brief p{max-width:66ch;margin:0;color:#a8bbb1;font-size:13px;line-height:1.7}.brief button{min-width:150px;background:var(--acid);color:#151a17;border-color:var(--acid)}.board{display:grid;min-height:320px;border:1px solid var(--line);grid-template-columns:1.35fr .65fr}.mechanic-stage{display:grid;align-content:center;padding:20px}.family-visual{display:grid;min-height:140px;place-items:center;padding:16px;border:1px solid #293c34;background:#091511}.family-grid{display:grid;width:min(260px,100%);grid-template-columns:repeat(3,1fr);gap:6px}.family-cell,.family-token,.family-target,.track-cell{display:grid;min-height:50px;place-items:center;border:1px solid #3c5148;background:#11201a;color:#9cb0a6;font:700 11px ui-monospace,monospace}.family-cell.is-current,.track-cell.is-current{border-color:var(--acid);background:#3b350b;color:#fff}.family-cell.is-trail,.family-token.is-done,.family-target.is-done{border-color:#398666;background:#0f2b20;color:var(--mint)}.family-track{display:grid;width:100%;grid-template-columns:repeat(var(--track-count),minmax(26px,1fr));gap:4px}.family-meter{display:grid;width:min(360px,100%);gap:10px}.family-meter strong{font-size:34px}.family-meter span{height:16px;border:1px solid #4b5b54;background:linear-gradient(90deg,var(--acid) var(--meter),#14211c var(--meter))}.family-targets{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}.sequence{display:grid;margin-top:14px;grid-template-columns:repeat(auto-fit,minmax(82px,1fr));gap:7px}.signal-cell{display:grid;min-height:64px;place-items:center;padding:8px;border:1px solid var(--line);background:#0d1814;color:#93a79d;text-align:center}.signal-cell.is-active{border-color:var(--acid);box-shadow:inset 0 -3px var(--acid);color:#fff}.signal-cell.is-done{border-color:#3f8f6e;background:#10261e;color:var(--mint)}.signal-cell b{font:10px ui-monospace,monospace}.signal-cell span{font-size:10px}.state-panel{display:grid;align-content:center;padding:28px;border-left:1px solid var(--line);background:#0a1511}.state-panel strong{margin:8px 0;font-size:27px}.state-panel output{color:#a8bbb1;font-size:12px;line-height:1.6}.actions{padding:26px 0}.actions>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}.actions button[data-action]{min-height:58px;padding:10px 12px}.actions button.is-suggested{border-color:var(--acid);box-shadow:inset 0 -3px var(--acid)}main>footer{display:flex;align-items:center;gap:15px;padding-top:18px;border-top:1px solid var(--line)}main>footer button{padding:0 18px}main>footer span{color:#81948b;font-size:11px}@media(max-width:620px){main{width:min(100% - 20px,980px);padding-top:22px}.lab-head h1{font-size:42px}.brief{grid-template-columns:1fr}.brief button{width:100%}.board{grid-template-columns:1fr}.mechanic-stage{padding:12px}.family-visual{min-height:120px}.sequence{grid-template-columns:repeat(2,1fr)}.state-panel{min-height:140px;border-top:1px solid var(--line);border-left:0}.actions>div{grid-template-columns:repeat(2,minmax(0,1fr))}main>footer{align-items:stretch;flex-direction:column}main>footer button{width:100%}}`, "utf8");
  writeFileSync(join(root, "app.js"), `const requiredSignals=${safeJson(signals)};const labels=${safeJson(Object.fromEntries(signals.map((signal) => [signal, humanize(signal)])))};const sequence=document.querySelector("#sequence");const stateLabel=document.querySelector("#state");const status=document.querySelector("#status");let model={phase:"idle",accepted:[]};function signature(){return JSON.stringify({requiredSignals,accepted:model.accepted,family:document.body.dataset.prototypeFamily})}function expected(){return requiredSignals[model.accepted.length]||null}function getState(){return{phase:model.phase,accepted:[...model.accepted],expected:expected(),signature:signature()}}function render(){document.body.dataset.gameState=model.phase;sequence.replaceChildren(...requiredSignals.map((signal,index)=>{const cell=document.createElement("div");cell.className="signal-cell"+(model.accepted.includes(signal)?" is-done":signal===expected()&&model.phase==="playing"?" is-active":"");cell.innerHTML="<b>"+(index+1)+"</b><span>"+labels[signal]+"</span>";return cell}));stateLabel.textContent=model.phase==="idle"?"等待开始":model.phase==="completed"?"规则链完成":"验证 "+(model.accepted.length+1)+" / "+requiredSignals.length;status.value=model.phase==="completed"?"全部规则信号已按顺序产生，可以重复验证确定性。":model.phase==="playing"?"下一步："+labels[expected()]:"按“开始验证”进入安全练习。";window.__RESEARCH_FAMILY__?.render()}function start(){model={phase:"playing",accepted:[]};window.__RESEARCH_FAMILY__?.reset();render();return getState()}function applySignal(signal){if(model.phase!=="playing"||signal!==expected())return{accepted:false,state:getState()};model.accepted.push(signal);dispatchEvent(new CustomEvent("research:signal",{detail:{signal}}));if(model.accepted.length===requiredSignals.length)model.phase="completed";render();return{accepted:true,state:getState()}}function restart(){return start()}window.__RESEARCH_RUNTIME__={getState,start,restart,applySignal,expected,render};document.querySelector("#start").addEventListener("click",start);document.querySelector("#restart").addEventListener("click",restart);render();if(new URLSearchParams(location.search).has("probe"))window.__RESEARCH_DEBUG__={getState,restart,performSignal:applySignal,get interactionSteps(){return [...(window.__RESEARCH_FAMILY__?.interactionSteps||[])]},performAction:(action)=>window.__RESEARCH_FAMILY__?.performAction(action),runAll:()=>{restart();for(const action of window.__RESEARCH_FAMILY__.interactionSteps)window.__RESEARCH_FAMILY__.performAction(action);return getState()},requiredSignals:[...requiredSignals]};`, "utf8");
  writeFileSync(join(root, "family.js"), `const scenario=${safeJson(scenario)};const runtime=window.__RESEARCH_RUNTIME__;const visual=document.querySelector("#family-visual");const controls=document.querySelector("#actions");let familyState={};function reset(){if(scenario.family==="spatial")familyState={position:4,trail:[4]};else if(scenario.family==="matching")familyState={selected:null,matches:0};else if(scenario.family==="movement")familyState={position:0,max:scenario.interactionSteps.length};else if(scenario.family==="economy")familyState={budget:scenario.interactionSteps.length,spent:{focus:0,power:0,speed:0}};else if(scenario.family==="combat")familyState={alive:new Set(scenario.controls.map(({id})=>id)),hits:0};else familyState={actions:0};render()}function accept(){const signal=runtime.expected();return signal?runtime.applySignal(signal).accepted:false}function performAction(action){if(runtime.getState().phase!=="playing")return false;let valid=false;if(scenario.family==="spatial"){const next=Number(action.split("-")[1]);const row=Math.floor(familyState.position/3),col=familyState.position%3,nextRow=Math.floor(next/3),nextCol=next%3;valid=Math.abs(row-nextRow)+Math.abs(col-nextCol)===1;if(valid){familyState.position=next;familyState.trail.push(next)}}else if(scenario.family==="matching"){const pair=action.split("-")[1];if(!familyState.selected){familyState.selected={action,pair}}else{valid=familyState.selected.action!==action&&familyState.selected.pair===pair;familyState.selected=null;if(valid)familyState.matches++}}else if(scenario.family==="movement"){const delta=action==="move-right"?1:-1;const next=familyState.position+delta;valid=next>=0&&next<=familyState.max;if(valid)familyState.position=next}else if(scenario.family==="economy"){const upgrade=action.replace("upgrade-","");valid=familyState.budget>0&&upgrade in familyState.spent;if(valid){familyState.budget--;familyState.spent[upgrade]++}}else if(scenario.family==="combat"){valid=familyState.alive.has(action);if(valid){familyState.alive.delete(action);familyState.hits++}}else{valid=scenario.controls.some(({id})=>id===action);if(valid)familyState.actions++}if(valid)accept();render();return valid}function render(){if(scenario.family==="spatial")visual.innerHTML='<div class="family-grid">'+Array.from({length:9},(_,index)=>'<span class="family-cell '+(familyState.position===index?'is-current':familyState.trail?.includes(index)?'is-trail':'')+'">'+(index+1)+'</span>').join('')+'</div>';else if(scenario.family==="matching")visual.innerHTML='<div class="family-targets">'+scenario.controls.map(({id,label})=>'<span class="family-token '+(familyState.selected?.action===id?'is-done':'')+'">'+label+'</span>').join('')+'</div>';else if(scenario.family==="movement")visual.innerHTML='<div class="family-track" style="--track-count:'+(familyState.max+1)+'">'+Array.from({length:familyState.max+1},(_,index)=>'<span class="track-cell '+(familyState.position===index?'is-current':'')+'">'+(index===familyState.max?'目标':index+1)+'</span>').join('')+'</div>';else if(scenario.family==="economy")visual.innerHTML='<div class="family-meter"><strong>预算 '+familyState.budget+'</strong><span style="--meter:'+((familyState.budget/Math.max(1,scenario.interactionSteps.length))*100)+'%"></span><small>专注 '+familyState.spent.focus+' · 力量 '+familyState.spent.power+' · 速度 '+familyState.spent.speed+'</small></div>';else if(scenario.family==="combat")visual.innerHTML='<div class="family-targets">'+scenario.controls.map(({id,label})=>'<span class="family-target '+(!familyState.alive.has(id)?'is-done':'')+'">'+(!familyState.alive.has(id)?'已命中':label)+'</span>').join('')+'</div>';else visual.innerHTML='<strong>已完成 '+(familyState.actions||0)+' 次规则动作</strong>';const next=scenario.interactionSteps[runtime.getState().accepted.length];controls.querySelectorAll("[data-action]").forEach((button)=>button.classList.toggle("is-suggested",button.dataset.action===next))}scenario.controls.forEach(({id,label})=>{const button=document.createElement("button");button.dataset.action=id;button.textContent=label;button.addEventListener("click",()=>performAction(id));controls.append(button)});window.__RESEARCH_FAMILY__={interactionSteps:scenario.interactionSteps,performAction,reset,render};reset();runtime.render();`, "utf8");
  return { root, signals };
}

export async function inspectResearchPrototype(root: string, requiredSignals: string[], permanentUrl: string): Promise<AutomaticPrototypeResult> {
  const executablePath = requireBrowserExecutable("研究原型自动验收");
  const qualityRoot = join(root, "_studio", "quality");
  const screenshots: string[] = [];
  const browserRuns: DesignResearchBrowserRunInput[] = [];
  const signalFailures = new Map(requiredSignals.map((signal) => [signal, [] as string[]]));
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    for (const viewport of [{ deviceClass: "desktop" as const, width: 1280, height: 800 }, { deviceClass: "mobile" as const, width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const failures: string[] = [];
      const runtimeErrors: string[] = [];
      page.on("pageerror", (error) => runtimeErrors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) runtimeErrors.push(message.text()); });
      try {
        await page.goto(probeUrl(url), { waitUntil: "domcontentloaded", timeout: 10_000 });
        await page.waitForFunction(() => Boolean((window as any).__RESEARCH_DEBUG__), undefined, { timeout: 5_000 });
        const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, main: Boolean(document.querySelector("main")), live: Boolean(document.querySelector("[aria-live]")), unlabeledButtons: [...document.querySelectorAll("button")].filter((button) => !button.textContent?.trim() && !button.getAttribute("aria-label")).length, undersizedButtons: [...document.querySelectorAll("button")].filter((button) => { const box = button.getBoundingClientRect(); return box.width < 44 || box.height < 44; }).length }));
        const accessibilityViolationCount = Number(!layout.main) + Number(!layout.live) + layout.unlabeledButtons + layout.undersizedButtons;
        if (layout.overflow > 1) failures.push(`横向溢出 ${layout.overflow}px`);
        if (accessibilityViolationCount) failures.push(`基础无障碍检查发现 ${accessibilityViolationCount} 项问题`);
        const unknownAccepted = await page.evaluate(() => (window as any).__RESEARCH_DEBUG__.performSignal("__unknown__").accepted);
        if (unknownAccepted) failures.push("未登记信号被错误接受");
        await page.locator("#start").click();
        const interactionSteps = await page.evaluate(() => (window as any).__RESEARCH_DEBUG__.interactionSteps as string[]);
        if (!interactionSteps.length) failures.push("机制族没有声明可见交互步骤");
        for (const action of interactionSteps) await page.locator(`[data-action="${action}"]`).click();
        const first = await page.evaluate(() => (window as any).__RESEARCH_DEBUG__.getState());
        const observed = first.accepted as string[];
        await page.evaluate(() => (window as any).__RESEARCH_DEBUG__.restart());
        const second = await page.evaluate(() => (window as any).__RESEARCH_DEBUG__.runAll());
        const interactionCompleted = first.phase === "completed" && second.phase === "completed" && JSON.stringify(first.accepted) === JSON.stringify(requiredSignals) && first.signature === second.signature;
        if (!interactionCompleted) failures.push("规则链未完成或重复运行结果不一致");
        for (const signal of requiredSignals) if (!observed.includes(signal)) signalFailures.get(signal)?.push(`${viewport.deviceClass} 未观察到信号`);
        const screenshot = join(qualityRoot, `${viewport.deviceClass}-automatic.png`);
        await page.screenshot({ path: screenshot, fullPage: true }); screenshots.push(relative(root, screenshot).replaceAll("\\", "/"));
        browserRuns.push({ deviceClass: viewport.deviceClass, url: permanentUrl, viewport: `${viewport.width}x${viewport.height}`, status: failures.length || runtimeErrors.length ? "failed" : "passed", interactionCompleted, consoleErrorCount: runtimeErrors.length, accessibilityViolationCount, observation: failures.length || runtimeErrors.length ? [...failures, ...runtimeErrors].join("；") : "自动完成安全开局、全部规则信号、重复运行确定性、触控尺寸、横向溢出和基础无障碍检查。" });
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
        for (const signal of requiredSignals) signalFailures.get(signal)?.push(`${viewport.deviceClass} 验收中断`);
        browserRuns.push({ deviceClass: viewport.deviceClass, url: permanentUrl, viewport: `${viewport.width}x${viewport.height}`, status: "failed", interactionCompleted: false, consoleErrorCount: runtimeErrors.length, accessibilityViolationCount: 0, observation: failures.join("；") });
      } finally { await page.close(); }
    }
  } finally { await browser?.close(); await closeServer(server); }
  const probeRuns = requiredSignals.map((signalId) => ({ signalId, status: signalFailures.get(signalId)?.length ? "failed" as const : "passed" as const, observation: signalFailures.get(signalId)?.length ? signalFailures.get(signalId)!.join("；") : "桌面与手机均通过正常玩法处理器按序产生该信号，重复运行得到一致状态签名。" }));
  const report = { checkedAt: new Date().toISOString(), probeRuns, browserRuns, screenshots };
  writeFileSync(join(root, "_studio", "AUTOMATIC_EVALUATION.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

type ResearchPrototypeRepository = {
  getDesignResearchTask(taskId: string): Promise<GameResearchTask | null>;
  createDesignResearchEvaluation?(taskId: string): Promise<GameResearchTask>;
  recordAutomaticDesignResearchProbeRun(taskId: string, input: DesignResearchProbeRunInput): Promise<GameResearchTask>;
  recordAutomaticDesignResearchBrowserRun(taskId: string, input: DesignResearchBrowserRunInput): Promise<GameResearchTask>;
  recordDesignResearchResourceIntake?(taskId: string, batch: ResearchResourceIntakeBatch): Promise<GameResearchTask>;
  recordDesignResearchResourcePromotion?(taskId: string, families: ResourceFamily[]): Promise<GameResearchTask>;
};

export class ResearchPrototypeService {
  private readonly inFlight = new Map<string, Promise<{ task: GameResearchTask; playUrl: string }>>();
  constructor(private readonly repository: ResearchPrototypeRepository, private readonly root: string, private readonly gameOrigin: string, private readonly inspect = inspectResearchPrototype, private readonly promotedLibraryRoot = join(root, "_promoted-library")) {}

  run(taskId: string) {
    const running = this.inFlight.get(taskId);
    if (running) return running;
    const operation = this.execute(taskId).finally(() => this.inFlight.delete(taskId));
    this.inFlight.set(taskId, operation);
    return operation;
  }

  async intake(taskId: string) {
    let task = await this.repository.getDesignResearchTask(taskId);
    if (!task?.evaluation?.assetRequirements || !task.evaluation.resourceAcquisitionTask || task.status !== "review" || task.decision) throw new Error("研究沙箱尚未具备资源隔离入库条件");
    if (task.evaluation.resourceIntakeBatch) return { task, batch: task.evaluation.resourceIntakeBatch };
    if (!this.repository.recordDesignResearchResourceIntake) throw new Error("研究仓储尚未启用资源隔离入库");
    const sourceUrl = [...task.evaluation.browserRuns].reverse().find(({ recordedBy }) => recordedBy === "automatic")?.url;
    const artifactId = sourceUrl?.match(/\/research-prototype\/([0-9a-f-]{36})\//i)?.[1];
    if (!artifactId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(artifactId)) throw new Error("找不到承载资源证据的最新自动验收沙箱");
    const sourceRoot = join(this.root, artifactId);
    const batch = await materializeApprovedResearchResources(task.evaluation.resourceAcquisitionTask, task.evaluation.assetRequirements, sourceRoot, join(this.root, "_resource-quarantine"));
    task = await this.repository.recordDesignResearchResourceIntake(task.id, batch);
    mkdirSync(join(sourceRoot, "_studio"), { recursive: true });
    writeFileSync(join(sourceRoot, "_studio", "RESOURCE_INTAKE_BATCH.json"), `${JSON.stringify(batch, null, 2)}\n`, "utf8");
    return { task, batch };
  }

  async promoteResources(taskId: string) {
    let task = await this.repository.getDesignResearchTask(taskId);
    const evaluation = task?.evaluation;
    if (!task || task.status !== "review" || task.decision || !evaluation?.resourceIntakeBatch || !evaluation.assetRequirements) throw new Error("研究沙箱尚未具备资源族晋升条件");
    if ((evaluation.promotedResourceFamilyIds ?? []).length > 0) return { task, familyIds: evaluation.promotedResourceFamilyIds! };
    if (!this.repository.recordDesignResearchResourcePromotion) throw new Error("研究仓储尚未启用资源族晋升");
    const families = await promoteApprovedResearchResourceFamilies(evaluation.resourceIntakeBatch, evaluation.assetRequirements, join(this.root, "_resource-quarantine"), this.promotedLibraryRoot);
    task = await this.repository.recordDesignResearchResourcePromotion(task.id, families);
    return { task, familyIds: families.map(({ profile }) => profile.familyId) };
  }

  private async execute(taskId: string) {
    let task = this.repository.createDesignResearchEvaluation
      ? await this.repository.createDesignResearchEvaluation(taskId)
      : await this.repository.getDesignResearchTask(taskId);
    if (!task?.evaluation || task.status !== "review" || task.decision) throw new Error("只有待评审且已建立合同的研究沙箱可以自动运行");
    const artifactId = randomUUID();
    const taskRoot = join(this.root, artifactId);
    const playUrl = `${this.gameOrigin.replace(/\/$/, "")}/research-prototype/${artifactId}/`;
    const pocketWorkshop = task.id === POCKET_WORKSHOP_RESEARCH_TASK_ID;
    if (pocketWorkshop) generatePocketWorkshopPrototype(taskRoot); else generateResearchPrototype(taskRoot, task);
    const result = pocketWorkshop
      ? await inspectPocketWorkshopPrototype(taskRoot, task.evaluation.requiredProbeSignals, playUrl)
      : await this.inspect(taskRoot, task.evaluation.requiredProbeSignals, playUrl);
    for (const probe of result.probeRuns) task = await this.repository.recordAutomaticDesignResearchProbeRun(task.id, probe);
    for (const browser of result.browserRuns) task = await this.repository.recordAutomaticDesignResearchBrowserRun(task.id, browser);
    return { task, playUrl };
  }
}
