import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectDetail } from "../shared/contracts";
import { getProject } from "../web/api";
import { failureMessage } from "../web/failure";
import { FailureDetails } from "./FailureDetails";
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
import { getTemplate } from "../domain/templates";
import { resolveTemplateForGame } from "../domain/templateResolution";
import { LocalizedGameFrame } from "./LocalizedGameFrame";
import { useSimplePlayerMessages, useSimplePlayerOptions } from "./simple-player-i18n";

type FlowMode = "remix" | "new-game";
type FlowPhase = "playing" | "input" | "analyzing" | "choices" | "producing" | "validating" | "ready" | "testing" | "published" | "failed" | "stopped";
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

const STORAGE_KEY = "ai-game-studio:simple-flow:v2";

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

const isVisualRequest = (request: string) =>
  /画面|美[术術]|风格|風格|颜色|顏色|背景|可爱|可愛|丑|造型|封面|visual|art|style|colou?r|background|cute|cover|見た目|絵|色|かわい|デザイン/i.test(request) &&
  !/操作|碰撞|判定|范围|範圍|速度|节奏|節奏|难度|難度|障碍|障礙|规则|規則|control|collision|speed|pace|difficulty|obstacle|rule|操作|当たり判定|速度|テンポ|難易度|障害|ルール/i.test(request);

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

const readFlow = (storageKey: string): SimpleFlowState => {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? { ...INITIAL_FLOW, ...JSON.parse(raw) as SimpleFlowState } : INITIAL_FLOW;
  } catch {
    return INITIAL_FLOW;
  }
};

const embeddableGameUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (!import.meta.env.DEV) return url;
  const parsed = new URL(url);
  return `/__game${parsed.pathname}${parsed.search}${parsed.hash}`;
};

export function SimpleStudioApp() {
  const t = useSimplePlayerMessages();
  const localizedOptions = useSimplePlayerOptions();
  useEffect(() => { document.title = t("documentTitle"); }, [t]);
  const sourceGameId = new URLSearchParams(window.location.search).get("game")?.trim() || null;
  const flowStorageKey = sourceGameId ? `${STORAGE_KEY}:${sourceGameId}` : STORAGE_KEY;
  const [flow, setFlow] = useState<SimpleFlowState>(() => readFlow(flowStorageKey));
  const [sourceGame, setSourceGame] = useState<ProjectDetail | null>(null);
  const [sourceLoading, setSourceLoading] = useState(Boolean(sourceGameId));
  const [sourceError, setSourceError] = useState(false);
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
    localStorage.setItem(flowStorageKey, JSON.stringify(flow));
  }, [flow]);

  useEffect(() => {
    if (!sourceGameId) return;
    let active = true;
    getProject(sourceGameId)
      .then((project) => {
        if (!active) return;
        setSourceGame(project);
        setFlow((current) => current.requestHistory.length > 0 || current.projectId
          ? current
          : { ...current, revision: project.publication?.versionNumber ?? project.version.number });
      })
      .catch(() => {
        if (active) setSourceError(true);
      })
      .finally(() => {
        if (active) setSourceLoading(false);
      });
    return () => { active = false; };
  }, []);

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
  const sourceTemplateId = sourceGame ? resolveTemplateForGame(sourceGame)?.id ?? null : null;
  const sourceTemplate = getTemplate(sourceTemplateId);
  const fallbackSpec = useMemo(() => buildGameSpec(flow.mode === "new-game" ? {
    ...INITIAL_DRAFT,
    creationMode: "mechanic-composition",
    templateId: null,
    newGameBrief: flow.request || "一款三分钟内可以理解和反复挑战的单人小游戏",
    selectedMechanicIds: recommendedMechanicIds,
    changeLevel: "R3",
  } : {
    ...INITIAL_DRAFT,
    templateId: sourceTemplateId,
    selectedSuggestionIds: sourceTemplateId ? [`${sourceTemplateId}-world`] : [],
    creationMode: sourceTemplateId ? "template-remix" : "mechanic-composition",
    newGameBrief: sourceGame?.idea ?? "改造当前单人网页游戏",
    selectedMechanicIds: sourceTemplateId ? [] : recommendMechanics(sourceGame?.idea ?? "单人网页游戏").slice(0, 2).map((item) => item.id),
  }), [flow.mode, flow.request, recommendedMechanicIds, sourceGame?.idea, sourceTemplateId]);

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

  const suggestions = flow.mode === "new-game"
    ? [...localizedOptions.fresh]
    : sourceTemplate
      ? [
          ...sourceTemplate.suggestions.slice(0, 2).map((item) => `${item.title}：${item.description}`),
          ...localizedOptions.remix.slice(1, 3),
        ]
      : [...localizedOptions.remix];
  const choices = (isVisualRequest(flow.request) ? visualChoices : designChoices).map((choice, index) => ({ ...choice, label: localizedOptions[isVisualRequest(flow.request) ? "visual" : "design"][index][0], note: localizedOptions[isVisualRequest(flow.request) ? "visual" : "design"][index][1] }));
  const gameTitle = flow.mode === "new-game" ? localizedOptions.newPreview : sourceGame?.title ?? localizedOptions.loadingGame;
  const showGeneratedRevision = Boolean(activeProject && ["testing", "published"].includes(flow.phase));
  const displayEvent = (event: ProcessEvent) => {
    if (event.author === "user") {
      if (event.id.startsWith("choice-")) return `${t("chooseKicker")}：${choices.find(choice => choice.id === flow.selectedDirection)?.label ?? flow.selectedDirection}`;
      return event.text;
    }
    if (event.id.startsWith("received-")) return t("analyzing");
    if (event.id.startsWith("analysis-")) return t("decisionDetail");
    if (event.id.startsWith("stopped-")) return t("stoppedDetail");
    if (event.id.startsWith("browser-") || event.id.startsWith("testing-")) return t("checking");
    if (event.id.startsWith("publishing-")) return t("validating");
    if (event.id.startsWith("published-")) return t("publishedDetail");
    if (event.id.startsWith("bundle-")) return t("download");
    if (event.id.startsWith("work-")) return t("producing");
    if (event.id.includes("failed-")) return t("failedFallback");
    return event.text;
  };

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
      templateId: sourceTemplateId,
      freeRequest: flow.request,
      changeLevel: level,
      selectedSuggestionIds: sourceTemplateId ? [`${sourceTemplateId}-world`] : [],
      creationMode: sourceTemplateId ? "template-remix" as const : "mechanic-composition" as const,
      newGameBrief: sourceGame?.idea ?? flow.request,
      selectedMechanicIds: sourceTemplateId ? [] : recommendMechanics(`${sourceGame?.idea ?? ""} ${flow.request}`).slice(0, 2).map((item) => item.id),
    };
    try {
      const result = await buildSimplePlayableRevision({
        draft,
        goal: flow.request,
        visualDirection: choice?.label ?? id,
        existingProject: flow.projectId ? loadProject(flow.projectId) : null,
        signal: controller.signal,
        onProgress: ({ stage, message }) => setFlow((current) => {
          if (controller.signal.aborted || current.activityId !== activityId) return current;
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
      setFlow((current) => current.activityId !== activityId ? current : ({
        ...current,
        projectId: result.project.id,
        phase: result.errors.length === 0 ? "ready" : "failed",
        revision: result.errors.length === 0 ? current.revision + 1 : current.revision,
        lastError: result.errors.join("；"),
      }));
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = failureMessage(error, "资源和代码制作没有完成。当前可玩版本保持不变。");
      setFlow((current) => current.activityId !== activityId ? current : ({
        ...current,
        phase: "failed",
        lastError: message,
        events: [...current.events, { id: `failed-${activityId}`, author: "studio", text: `制作没有覆盖旧版本：${message}` }],
      }));
    } finally {
      if (productionController.current === controller) productionController.current = null;
    }
  };

  const stopCurrentWork = () => {
    productionController.current?.abort();
    productionController.current = null;
    setFlow((current) => !["analyzing", "producing", "validating"].includes(current.phase) ? current : ({
      ...current,
      phase: "stopped",
      activityId: current.activityId + 1,
      events: [...current.events, { id: `stopped-${current.activityId}`, author: "studio", text: "已停止本轮制作。当前可玩版本和已保存成果保持不变。" }],
    }));
  };

  const startTesting = async () => {
    const project = flow.projectId ? loadProject(flow.projectId) : null;
    if (!project) return;
    const activityId = flow.activityId;
    setFlow((current) => ({
      ...current,
      phase: "validating",
      events: [...current.events, { id: `browser-${current.activityId}`, author: "studio", text: "正在用桌面、手机横屏和手机竖屏检查同一份构建。" }],
    }));
    try {
      const result = await verifySimplePlayableRevision(project);
      setFlow((current) => current.activityId !== activityId ? current : ({
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
      const message = failureMessage(error, "浏览器检查没有完成。当前可玩版本保持不变。");
      setFlow((current) => current.activityId !== activityId ? current : ({ ...current, phase: "failed", lastError: message, events: [...current.events, { id: `audit-failed-${activityId}`, author: "studio", text: message }] }));
    }
  };

  const publishVersion = async () => {
    const project = flow.projectId ? loadProject(flow.projectId) : null;
    if (!project) return;
    const activityId = flow.activityId;
    setFlow((current) => ({ ...current, phase: "validating", events: [...current.events, { id: `publishing-${current.activityId}`, author: "studio", text: "正在绑定试玩确认并切换稳定玩家网址。" }] }));
    try {
      const result = await publishSimplePlayableRevision(project);
      setFlow((current) => current.activityId !== activityId ? current : ({
        ...current,
        phase: "published",
        publishedUrl: result.url,
        events: [...current.events, { id: `published-${current.activityId}`, author: "studio", text: `版本 ${current.revision} 已发布，之后仍可继续提出改造意见。` }],
      }));
    } catch (error) {
      const message = failureMessage(error, "发布没有完成。当前已保存版本不会被覆盖。");
      setFlow((current) => current.activityId !== activityId ? current : ({ ...current, phase: "failed", lastError: message, events: [...current.events, { id: `publish-failed-${activityId}`, author: "studio", text: `发布没有完成：${message}` }] }));
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
      const message = failureMessage(error, "开源包下载没有完成。当前已保存版本保持不变。");
      setFlow((current) => ({ ...current, lastError: message, events: [...current.events, { id: `bundle-failed-${current.activityId}`, author: "studio", text: message }] }));
    }
  };

  if (!sourceGameId) {
    return (
      <main className="player-first-app game-choice-page">
        <section className="game-choice-message">
          <span className="player-brand">{t("brand")}</span><h1>{t("chooseTitle")}</h1><p>{t("chooseDetail")}</p><a href="/games">{t("choose")}</a>
        </section>
      </main>
    );
  }

  if (sourceLoading || !sourceGame) {
    return (
      <main className="player-first-app game-choice-page">
        <section className="game-choice-message" role={sourceError ? "alert" : "status"}>
          <span className="player-brand">{t("brand")}</span><h1>{t(sourceError ? "unavailable" : "opening")}</h1><p>{t(sourceError ? "unavailable" : "loading")}</p>{sourceError && <a href="/games">{t("back")}</a>}
        </section>
      </main>
    );
  }

  return (
    <main className={`player-first-app${showGeneratedRevision ? " player-first-app--generated-preview" : ""}`}>
      {showGeneratedRevision && <nav className="game-lobby-bar" aria-label={t("navigation")}><a href="/games">{t("backShort")}</a></nav>}
      <section className="game-stage" aria-label={t("stage")}>
        {showGeneratedRevision ? <iframe key={`${sourceGame.id}-${flow.revision}-${flow.phase}`} title={t("frame", { title: gameTitle })} srcDoc={runtime} /> : (() => {
          const source = embeddableGameUrl(sourceGame.publication?.stableUrl ?? sourceGame.publication?.versionUrl);
          return source ? <LocalizedGameFrame key={`${sourceGame.id}-${flow.revision}`} title={t("frame", { title: gameTitle })} source={source} /> : null;
        })()}
      </section>

      {/* 游戏内的修改不是独立流程：直接进入创作页的“改一个现有游戏”步骤，并预选当前游戏。 */}
      {sourceTemplateId && <a className="remix-edge-button" href={`/create?game=${encodeURIComponent(sourceGame.id)}`}>
        <span aria-hidden="true">＋</span> {t("remix")}
      </a>}

      {flow.requestHistory.length > 0 && flow.phase !== "input" && flow.phase !== "playing" && (
        <section className={`process-chat ${processOpen ? "is-open" : "is-collapsed"}`} aria-live="polite">
          <header>
            <span className={["analyzing", "producing", "validating"].includes(flow.phase) ? "status-pulse" : "status-dot"} aria-hidden="true" />
            <div><strong>{t("process")}</strong><small>{t(flow.phase === "analyzing" ? "analyzing" : flow.phase === "producing" ? "producing" : flow.phase === "validating" ? "validating" : flow.phase === "stopped" ? "stopped" : flow.phase === "published" ? "completed" : flow.phase === "failed" ? "needsAction" : "update")}</small></div>
            <button type="button" aria-label={t(processOpen ? "collapseProcess" : "expandProcess")} onClick={() => setProcessOpen((open) => !open)}>{t(processOpen ? "collapse" : "view")}</button>
          </header>
          {processOpen && (
            <div className="process-chat-body" ref={processBody}>
              {flow.events.map((event) => <div className={`chat-line ${event.author === "user" ? "is-user" : "is-studio"}`} key={event.id}><span>{event.author === "user" ? t("you") : t("brand")}</span><p>{displayEvent(event)}</p></div>)}
              {flow.phase === "analyzing" && <div className="thinking-line"><i /><i /><i /><span>{t("analyzingScope")}</span></div>}
              {flow.phase === "analyzing" && <div className="chat-notice compact"><span>{t("addNow")}</span><button type="button" className="quiet-action" onClick={() => openRequest(flow.mode)}>{t("add")}</button><button type="button" className="quiet-action stop-action" onClick={stopCurrentWork}>{t("stop")}</button></div>}
              {(flow.phase === "producing" || flow.phase === "validating") && <div className="thinking-line"><i /><i /><i /><span>{t(flow.phase === "producing" ? "producingArt" : "checking")}</span></div>}
              {(flow.phase === "producing" || flow.phase === "validating") && <div className="chat-notice compact"><span>{t("addStops")}</span><button type="button" className="quiet-action" onClick={() => openRequest(flow.mode)}>{t("addAdjust")}</button><button type="button" className="quiet-action stop-action" onClick={stopCurrentWork}>{t("stop")}</button></div>}
              {flow.phase === "choices" && <div className="chat-notice"><strong>{t("decision")}</strong><span>{t("decisionDetail")}</span><div><button type="button" onClick={() => setSheetView("choices")}>{t("choices")}</button><button type="button" className="quiet-action" onClick={() => openRequest(flow.mode)}>{t("add")}</button></div></div>}
              {flow.phase === "ready" && <div className="chat-notice"><strong>{t("ready")}</strong><span>{t("readyDetail", { revision: flow.revision })}</span><div><button type="button" className="quiet-action" onClick={() => openRequest(flow.mode)}>{t("add")}</button><button type="button" onClick={startTesting}>{t("test")}</button></div></div>}
              {flow.phase === "testing" && <div className="chat-notice"><strong>{t("testing")}</strong><span>{t("testingDetail")}</span><div><button type="button" className="quiet-action" onClick={() => openRequest(flow.mode)}>{t("continueFeedback")}</button><button type="button" onClick={publishVersion}>{t("publish")}</button></div></div>}
              {flow.phase === "published" && <div className="chat-notice"><strong>{t("published")}</strong><span>{t("publishedDetail")}</span>{flow.publishedUrl && <a className="published-link" href={flow.publishedUrl} target="_blank" rel="noreferrer">{t("openPlayer")}</a>}<div><button type="button" className="quiet-action" onClick={downloadBundle}>{t("download")}</button><button type="button" className="quiet-action" onClick={() => openRequest(flow.mode)}>{t("continueRemix")}</button></div></div>}
              {flow.phase === "failed" && <div className="chat-notice is-error"><strong>{t("failed")}</strong><FailureDetails fallback={t("failedFallback")} /><button type="button" onClick={() => openRequest(flow.mode)}>{t("retry")}</button></div>}
              {flow.phase === "stopped" && <div className="chat-notice"><strong>{t("stoppedTitle")}</strong><span>{t("stoppedDetail")}</span><button type="button" onClick={() => openRequest(flow.mode)}>{t("restart")}</button></div>}
            </div>
          )}
        </section>
      )}

      {sheetView && (
        <div className="sheet-layer" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSheetView(null);
        }}>
          <section className="request-sheet" role="dialog" aria-modal="true" aria-labelledby="request-title">
            <button type="button" className="sheet-close" aria-label={t("close")} onClick={() => {
              setSheetView(null);
              if (flow.phase === "input") setFlow((current) => ({ ...current, phase: "playing" }));
            }}>×</button>

            {sheetView === "request" ? (
              <>
                <span className="sheet-kicker">{t(flow.mode === "new-game" ? "newGame" : "gameRemix")}</span><h1 id="request-title">{t(flow.mode === "new-game" ? "newQuestion" : "remixQuestion")}</h1><p>{t(flow.mode === "new-game" ? "newHelp" : "remixHelp")}</p><div className="quick-prompts" aria-label={t("suggestions")}>
                  {suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => setDraftRequest(suggestion)}>{suggestion}</button>)}
                </div>
                <label className="simple-prompt">
                  <span>{t(flow.mode === "new-game" ? "gameRequest" : "feedback")}</span><textarea value={draftRequest} onChange={(event) => setDraftRequest(event.target.value)} rows={4} placeholder={t(flow.mode === "new-game" ? "newPlaceholder" : "remixPlaceholder")} />
                </label>
                <button type="button" className="submit-request" disabled={!draftRequest.trim()} onClick={submitRequest}>{t("submit")}</button>
              </>
            ) : (
              <>
                <span className="sheet-kicker">{t("chooseKicker")}</span><h1 id="request-title">{t(isVisualRequest(flow.request) ? "visualQuestion" : "scopeQuestion")}</h1><p>{t("choiceHelp")}</p>
                <div className="direction-list">
                  {choices.map((choice) => (
                    <button type="button" key={choice.id} onClick={() => chooseDirection(choice.id)}>
                      <span><strong>{choice.label}</strong>{choice.recommended && <small>{t("recommended")}</small>}</span>
                      <p>{choice.note}</p>
                      <span>{t("useChoice")}</span>
                    </button>
                  ))}
                </div>
                <button type="button" className="choice-revise" onClick={() => openRequest(flow.mode)}>{t("reviseChoice")}</button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
