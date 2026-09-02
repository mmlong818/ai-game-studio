import { useEffect, useMemo, useRef, useState } from "react";
import { generateProjectImage } from "../domain/imageGenerationClient";
import { runtimeAssetPaths } from "../domain/assets";
import { buildGameSpec } from "../domain/gameSpec";
import { classifyChange } from "../domain/classifyChange";
import { loadProject } from "../domain/projectStorage";
import { createReferenceDossier, recommendMechanics } from "../domain/research";
import { generateRuntimeFiles } from "../domain/runtimeGenerator";
import { buildSimplePlayableRevision } from "../domain/simpleProduction";
import { downloadSimpleOpenSourceBundle, publishSimplePlayableRevision, verifySimplePlayableRevision } from "../domain/simpleRelease";
import { INITIAL_DRAFT } from "../domain/storage";

type FlowMode = "remix" | "new-game";
type FlowPhase = "playing" | "input" | "analyzing" | "choices" | "producing" | "validating" | "ready" | "testing" | "published" | "failed";
type SheetView = "request" | "choices";

interface ProcessEvent {
  id: string;
  author: "user" | "studio";
  text: string;
}

interface SimpleFlowState {
  mode: FlowMode;
  phase: FlowPhase;
  request: string;
  requestHistory: string[];
  selectedDirection: string;
  revision: number;
  activityId: number;
  events: ProcessEvent[];
  projectId: string | null;
  lastError: string;
  publishedUrl: string;
}

const STORAGE_KEY = "ai-game-studio:simple-flow:v1";

const INITIAL_FLOW: SimpleFlowState = {
  mode: "remix",
  phase: "playing",
  request: "",
  requestHistory: [],
  selectedDirection: "",
  revision: 1,
  activityId: 0,
  events: [],
  projectId: null,
  lastError: "",
  publishedUrl: "",
};

const REMIX_SUGGESTIONS = [
  "画面更可爱，角色更有辨识度",
  "操作反馈再明显一点",
  "手机版按钮不要挡住画面",
  "节奏快一点，但不要突然变难",
];

const NEW_GAME_SUGGESTIONS = [
  "小昆虫在树干上收集露珠并躲避障碍",
  "轻松的三分钟合成小游戏",
  "可以反复挑战的短局解谜游戏",
];

const isVisualRequest = (request: string) =>
  /画面|美术|风格|颜色|背景|可爱|丑|造型|封面/.test(request) &&
  !/操作|碰撞|判定|范围|速度|节奏|难度|障碍|规则/.test(request);

const visualChoices = [
  { id: "storybook", label: "绘本森林", note: "轮廓清楚、颜色克制，最适合手机", recommended: true },
  { id: "toy", label: "Q 版玩具", note: "角色更圆润，反馈更活泼", recommended: false },
  { id: "paper", label: "纸艺拼贴", note: "层次明显，视觉更有手工感", recommended: false },
];

const designChoices = [
  { id: "focused", label: "小幅调整", note: "保留现有玩法，只解决你指出的问题", recommended: true },
  { id: "balanced", label: "体验增强", note: "同时调整反馈、节奏和手机操作", recommended: false },
  { id: "explore", label: "重新构思", note: "变化更大，试玩前需要更长制作时间", recommended: false },
];

const readFlow = (): SimpleFlowState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...INITIAL_FLOW, ...JSON.parse(raw) as SimpleFlowState } : INITIAL_FLOW;
  } catch {
    return INITIAL_FLOW;
  }
};

export function SimpleStudioApp() {
  const [flow, setFlow] = useState<SimpleFlowState>(readFlow);
  const [draftRequest, setDraftRequest] = useState("");
  const [sheetView, setSheetView] = useState<SheetView | null>(flow.phase === "input" ? "request" : null);
  const [processOpen, setProcessOpen] = useState(true);
  const productionController = useRef<AbortController | null>(null);
  const processBody = useRef<HTMLDivElement | null>(null);
  const recommendedMechanicIds = useMemo(
    () => recommendMechanics(flow.request || "短局单人网页游戏").slice(0, 2).map((mechanic) => mechanic.id),
    [flow.request],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flow));
  }, [flow]);

  useEffect(() => {
    if (!processOpen) return;
    if (processBody.current) processBody.current.scrollTop = processBody.current.scrollHeight;
  }, [flow.events.length, flow.phase, processOpen]);

  useEffect(() => {
    if (flow.phase !== "analyzing") return;
    const timer = window.setTimeout(() => {
      setFlow((current) => ({
        ...current,
        phase: "choices",
        events: [...current.events, {
          id: `analysis-${current.activityId}`,
          author: "studio",
          text: current.mode === "new-game"
            ? `分析完成。我从已验证能力中优先匹配了：${recommendMechanics(current.request).slice(0, 2).map((mechanic) => mechanic.name).join("、")}。`
            : "分析完成。我保留了当前版本，并整理出少量适合这次改造的方向。",
        }],
      }));
      setSheetView((current) => current === "request" ? current : "choices");
    }, 900);
    return () => window.clearTimeout(timer);
  }, [flow.phase, flow.activityId]);

  const activeProject = useMemo(() => flow.projectId ? loadProject(flow.projectId) : null, [flow.projectId, flow.revision, flow.phase]);
  const fallbackSpec = useMemo(() => buildGameSpec(flow.mode === "new-game" ? {
    ...INITIAL_DRAFT,
    creationMode: "mechanic-composition",
    templateId: null,
    newGameBrief: flow.request || "一款三分钟内可以理解和反复挑战的单人小游戏",
    selectedMechanicIds: recommendedMechanicIds,
    changeLevel: "R3",
  } : {
    ...INITIAL_DRAFT,
    selectedSuggestionIds: ["merge-2048-world"],
  }), [flow.mode, flow.request, recommendedMechanicIds]);

  const spec = activeProject?.spec ?? fallbackSpec;

  const runtime = useMemo(() => {
    const assetPaths = activeProject ? runtimeAssetPaths(activeProject, (path) => `/generated/${path.split("/").pop()}`) : {};
    const files = generateRuntimeFiles(spec, assetPaths);
    const revisionCss = flow.phase === "testing" || flow.phase === "published"
      ? flow.selectedDirection === "toy"
        ? ".game{filter:saturate(1.18);background:#f7d87b}.cell{border-radius:18px}"
        : flow.selectedDirection === "paper"
          ? ".game{filter:saturate(.82);background:#d9c8a2}.cell{border-radius:3px;box-shadow:3px 4px 0 #173f2a33}"
          : ".game{background:#cfe3c5}.cell{box-shadow:0 3px 10px #173f2a18}"
      : "";
    return files["index.html"]
      .replace('<link rel="stylesheet" href="./styles.css" />', `<style>${files["styles.css"]}${revisionCss}</style>`)
      .replace('<script type="module" src="./app.js"></script>', `<script>${files["app.js"]}</script>`);
  }, [activeProject, flow.phase, flow.selectedDirection, spec]);

  const suggestions = flow.mode === "new-game" ? NEW_GAME_SUGGESTIONS : REMIX_SUGGESTIONS;
  const choices = isVisualRequest(flow.request) ? visualChoices : designChoices;
  const gameTitle = flow.mode === "new-game" ? "新游戏试玩" : "果林合成";

  const openRequest = (mode: FlowMode = flow.mode) => {
    setFlow((current) => ({ ...current, mode, phase: current.phase === "input" ? "playing" : current.phase }));
    setDraftRequest("");
    setSheetView("request");
  };

  const submitRequest = () => {
    const request = draftRequest.trim();
    if (!request) return;
    productionController.current?.abort();
    productionController.current = null;
    setFlow((current) => ({
      ...current,
      request,
      requestHistory: [...current.requestHistory, request],
      selectedDirection: "",
      phase: "analyzing",
      lastError: "",
      activityId: current.activityId + 1,
      events: [
        ...current.events,
        { id: `user-${current.activityId + 1}`, author: "user", text: request },
        { id: `received-${current.activityId + 1}`, author: "studio", text: "意见已收到。我正在判断它影响画面、操作还是玩法，并检查手机版表现。" },
      ],
    }));
    setSheetView(null);
    setProcessOpen(true);
  };

  const chooseDirection = async (id: string) => {
    const choice = choices.find((item) => item.id === id);
    const activityId = flow.activityId;
    setFlow((current) => ({
      ...current,
      selectedDirection: id,
      phase: "producing",
      events: [
        ...current.events,
        { id: `choice-${current.activityId}`, author: "user", text: `选择：${choice?.label ?? id}` },
      ],
    }));
    setSheetView(null);
    const controller = new AbortController();
    productionController.current = controller;
    const level = flow.mode === "new-game" ? "R3" : classifyChange(flow.request).level;
    const selectedMechanicIds = flow.mode === "new-game" ? recommendedMechanicIds : [];
    const draft = flow.mode === "new-game" ? {
      ...INITIAL_DRAFT,
      creationMode: "mechanic-composition" as const,
      templateId: null,
      newGameBrief: flow.request,
      selectedMechanicIds,
      changeLevel: "R3" as const,
      referenceDossier: createReferenceDossier(flow.request, selectedMechanicIds),
    } : {
      ...INITIAL_DRAFT,
      freeRequest: flow.request,
      changeLevel: level,
      selectedSuggestionIds: ["merge-2048-world"],
    };
    try {
      const result = await buildSimplePlayableRevision({
        draft,
        goal: flow.request,
        visualDirection: choice?.label ?? id,
        existingProject: flow.projectId ? loadProject(flow.projectId) : null,
        signal: controller.signal,
        onProgress: ({ stage, message }) => setFlow((current) => {
          const eventId = `work-${activityId}-${stage}`;
          if (current.events.some((event) => event.id === eventId)) return current;
          return {
            ...current,
            phase: stage === "building" || stage === "probing" ? "validating" : current.phase,
            events: [...current.events, { id: eventId, author: "studio", text: message }],
          };
        }),
      }, { generateImage: generateProjectImage });
      if (controller.signal.aborted) return;
      setFlow((current) => ({
        ...current,
        projectId: result.project.id,
        phase: result.errors.length === 0 ? "ready" : "failed",
        revision: result.errors.length === 0 ? current.revision + 1 : current.revision,
        lastError: result.errors.join("；"),
      }));
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : "制作失败";
      setFlow((current) => ({
        ...current,
        phase: "failed",
        lastError: message,
        events: [...current.events, { id: `failed-${activityId}`, author: "studio", text: `制作没有覆盖旧版本：${message}` }],
      }));
    } finally {
      if (productionController.current === controller) productionController.current = null;
    }
  };

  const startTesting = async () => {
    const project = flow.projectId ? loadProject(flow.projectId) : null;
    if (!project) return;
    setFlow((current) => ({
      ...current,
      phase: "validating",
      events: [...current.events, { id: `browser-${current.activityId}`, author: "studio", text: "正在用桌面、手机横屏和手机竖屏检查同一份构建。" }],
    }));
    try {
      const result = await verifySimplePlayableRevision(project);
      setFlow((current) => ({
        ...current,
        phase: result.errors.length === 0 ? "testing" : "failed",
        lastError: result.errors.join("；"),
        events: [...current.events, {
          id: `testing-${current.activityId}`,
          author: "studio",
          text: result.errors.length === 0 ? "多设备自动检查通过，试玩版已经切换到游戏画面。" : `多设备检查未通过：${result.errors.join("；")}`,
        }],
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "多设备检查失败";
      setFlow((current) => ({ ...current, phase: "failed", lastError: message, events: [...current.events, { id: `audit-failed-${current.activityId}`, author: "studio", text: message }] }));
    }
  };

  const publishVersion = async () => {
    const project = flow.projectId ? loadProject(flow.projectId) : null;
    if (!project) return;
    setFlow((current) => ({ ...current, phase: "validating", events: [...current.events, { id: `publishing-${current.activityId}`, author: "studio", text: "正在绑定试玩确认并切换稳定玩家网址。" }] }));
    try {
      const result = await publishSimplePlayableRevision(project);
      setFlow((current) => ({
        ...current,
        phase: "published",
        publishedUrl: result.url,
        events: [...current.events, { id: `published-${current.activityId}`, author: "studio", text: `版本 ${current.revision} 已发布，之后仍可继续提出改造意见。` }],
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "发布失败";
      setFlow((current) => ({ ...current, phase: "failed", lastError: message, events: [...current.events, { id: `publish-failed-${current.activityId}`, author: "studio", text: `发布没有完成：${message}` }] }));
    }
  };

  const downloadBundle = async () => {
    const project = flow.projectId ? loadProject(flow.projectId) : null;
    if (!project) return;
    try {
      const bundle = await downloadSimpleOpenSourceBundle(project);
      const blob = new Blob([bundle.bytes.slice().buffer], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = bundle.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setFlow((current) => ({ ...current, events: [...current.events, { id: `bundle-${current.activityId}`, author: "studio", text: "开源包已经下载，包含当前运行时、全部本地位图、规格、来源和质量证据。" }] }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "开源包下载失败";
      setFlow((current) => ({ ...current, lastError: message, events: [...current.events, { id: `bundle-failed-${current.activityId}`, author: "studio", text: message }] }));
    }
  };

  return (
    <main className="player-first-app">
      <header className="player-bar">
        <div>
          <span className="player-brand">游造</span>
          <span className="player-divider" aria-hidden="true" />
          <strong>{gameTitle}</strong>
          <small>版本 {flow.revision}</small>
        </div>
        <nav aria-label="游戏操作">
          <button type="button" onClick={() => openRequest("new-game")}>做一个新游戏</button>
          <a href="?advanced=1">高级制作</a>
        </nav>
      </header>

      <section className="game-stage" aria-label="游戏试玩区">
        <iframe key={`${flow.mode}-${flow.revision}-${flow.phase}`} title={`${gameTitle}游戏画面`} srcDoc={runtime} />
      </section>

      <button type="button" className="remix-edge-button" onClick={() => openRequest(flow.mode)} aria-haspopup="dialog">
        <span aria-hidden="true">＋</span> 改造这个游戏
      </button>

      {flow.requestHistory.length > 0 && flow.phase !== "input" && flow.phase !== "playing" && (
        <section className={`process-chat ${processOpen ? "is-open" : "is-collapsed"}`} aria-live="polite">
          <header>
            <span className={["analyzing", "producing", "validating"].includes(flow.phase) ? "status-pulse" : "status-dot"} aria-hidden="true" />
            <div><strong>开发过程</strong><small>{flow.phase === "analyzing" ? "正在分析你的意见" : flow.phase === "producing" ? "正在生成 AI 位图" : flow.phase === "validating" ? "正在构建并验证" : flow.phase === "published" ? "已完成" : flow.phase === "failed" ? "需要处理" : "有新进展"}</small></div>
            <button type="button" aria-label={processOpen ? "收起开发过程" : "展开开发过程"} onClick={() => setProcessOpen((open) => !open)}>{processOpen ? "收起" : "查看"}</button>
          </header>
          {processOpen && (
            <div className="process-chat-body" ref={processBody}>
              {flow.events.map((event) => <div className={`chat-line ${event.author === "user" ? "is-user" : "is-studio"}`} key={event.id}><span>{event.author === "user" ? "你" : "游造"}</span><p>{event.text}</p></div>)}
              {flow.phase === "analyzing" && <div className="thinking-line"><i /><i /><i /><span>正在分析相似玩法和改造范围</span></div>}
              {flow.phase === "analyzing" && <div className="chat-notice compact"><span>想到新的要求，可以现在补充，不需要等待。</span><button type="button" className="quiet-action" onClick={() => openRequest(flow.mode)}>补充意见</button></div>}
              {(flow.phase === "producing" || flow.phase === "validating") && <div className="thinking-line"><i /><i /><i /><span>{flow.phase === "producing" ? "正在生成并绑定游戏位图" : "正在执行构建和玩法规则检查"}</span></div>}
              {(flow.phase === "producing" || flow.phase === "validating") && <div className="chat-notice compact"><span>补充新要求会安全停止本轮制作，当前可玩版本不会被覆盖。</span><button type="button" className="quiet-action" onClick={() => openRequest(flow.mode)}>补充并调整</button></div>}
              {flow.phase === "choices" && <div className="chat-notice"><strong>有一项需要你决定</strong><span>我准备了少量选项，并标出了推荐方案。</span><div><button type="button" onClick={() => setSheetView("choices")}>查看选项</button><button type="button" className="quiet-action" onClick={() => openRequest(flow.mode)}>补充意见</button></div></div>}
              {flow.phase === "ready" && <div className="chat-notice"><strong>新版本已经做好</strong><span>按你的意见完成了第 {flow.revision} 版，可以直接试玩。</span><div><button type="button" className="quiet-action" onClick={() => openRequest(flow.mode)}>补充意见</button><button type="button" onClick={startTesting}>试玩新版本</button></div></div>}
              {flow.phase === "testing" && <div className="chat-notice"><strong>你正在试玩新版本</strong><span>不满意就继续提意见；确认目标清楚、操作舒适后再发布。</span><div><button type="button" className="quiet-action" onClick={() => openRequest(flow.mode)}>继续提意见</button><button type="button" onClick={publishVersion}>试玩满意，发布版本</button></div></div>}
              {flow.phase === "published" && <div className="chat-notice"><strong>这个版本已发布</strong><span>以后仍然可以从游戏边缘继续改造。</span>{flow.publishedUrl && <a className="published-link" href={flow.publishedUrl} target="_blank" rel="noreferrer">打开玩家网址</a>}<div><button type="button" className="quiet-action" onClick={downloadBundle}>下载开源包</button><button type="button" className="quiet-action" onClick={() => openRequest(flow.mode)}>继续改造</button></div></div>}
              {flow.phase === "failed" && <div className="chat-notice is-error"><strong>这次没有覆盖旧版本</strong><span>{flow.lastError || "制作或验收没有通过。"}</span><button type="button" onClick={() => openRequest(flow.mode)}>调整意见后重试</button></div>}
            </div>
          )}
        </section>
      )}

      {sheetView && (
        <div className="sheet-layer" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSheetView(null);
        }}>
          <section className="request-sheet" role="dialog" aria-modal="true" aria-labelledby="request-title">
            <button type="button" className="sheet-close" aria-label="关闭" onClick={() => {
              setSheetView(null);
              if (flow.phase === "input") setFlow((current) => ({ ...current, phase: "playing" }));
            }}>×</button>

            {sheetView === "request" ? (
              <>
                <span className="sheet-kicker">{flow.mode === "new-game" ? "新游戏" : "游戏改造"}</span>
                <h1 id="request-title">{flow.mode === "new-game" ? "你想玩什么？" : "哪里不满意？"}</h1>
                <p>{flow.mode === "new-game" ? "用一句话说清玩家要做什么。其他事情交给我们。" : "说一句最想改变的地方。提交后可以关掉面板继续玩。"}</p>
                <div className="quick-prompts" aria-label="一句话建议">
                  {suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => setDraftRequest(suggestion)}>{suggestion}</button>)}
                </div>
                <label className="simple-prompt">
                  <span>{flow.mode === "new-game" ? "游戏需求" : "你的意见"}</span>
                  <textarea value={draftRequest} onChange={(event) => setDraftRequest(event.target.value)} rows={4} placeholder={flow.mode === "new-game" ? "例如：小昆虫在树干上收集露珠并躲避障碍…" : "例如：角色太大了，障碍根本躲不过去…"} />
                </label>
                <button type="button" className="submit-request" disabled={!draftRequest.trim()} onClick={submitRequest}>提交，开始改造</button>
              </>
            ) : (
              <>
                <span className="sheet-kicker">需要你选一下</span>
                <h1 id="request-title">{isVisualRequest(flow.request) ? "你更喜欢哪种画面？" : "这次改到什么程度？"}</h1>
                <p>我们已经先排除了不适合当前玩法的方向。推荐项最稳妥。</p>
                <div className="direction-list">
                  {choices.map((choice) => (
                    <button type="button" key={choice.id} onClick={() => chooseDirection(choice.id)}>
                      <span><strong>{choice.label}</strong>{choice.recommended && <small>推荐</small>}</span>
                      <p>{choice.note}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
