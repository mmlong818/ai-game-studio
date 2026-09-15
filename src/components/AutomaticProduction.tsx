import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Play } from "lucide-react";
import type { StudioDraft } from "../domain/types";
import type { Build, GameDesignProfile, ProjectDetail, ProjectInput, RevisionPlan } from "../shared/contracts";
import { DOMAIN_TEMPLATE_ART } from "../domain/templateResolution";
import { gameTemplateSchema } from "../shared/contracts";
import { submitProduction, getProductionJob, watchProductionJob, getProject, getLatestBuild, retryProduction, startBuild, cancelProduction, getDemoReview, approveDemoReview, type ProductionJob } from "../web/api";
import { LiveExcerpt, WaitingActivity } from "./WaitingActivity";
import { BuildStageList } from "./BuildStageList";
import { FailureDetails } from "./FailureDetails";
import { failureDetailsFrom, type FailureDetail } from "../web/failure";
import { resolveEarlyStyleDirection } from "../shared/early-style";
import { LocalizedGameFrame } from "./LocalizedGameFrame";
import { useCentralMessages, useComponentLocale } from "./component-i18n";
import { automaticProductionCopy, pc, type AutomaticProductionCopy } from "./automatic-production-i18n";

const RECEIPTS_KEY = "studio-production-receipts-v1";
const PENDING_KEY = "studio-pending-production-v1";
export function getPendingProductionId(): string | null {
  try { return localStorage.getItem(PENDING_KEY); } catch { return null; }
}
function productionReceipt(input: ProjectInput): string {
  // Save before sending: a lost acceptance response must never cause a new paid job.
  const receipts = JSON.parse(localStorage.getItem(RECEIPTS_KEY) ?? "{}") as Record<string, string>;
  const fingerprint = JSON.stringify(input);
  if (receipts[fingerprint]) return receipts[fingerprint];
  const id = crypto.randomUUID();
  receipts[fingerprint] = id;
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
  return id;
}
function forgetProductionReceipt(id: string) {
  try {
    const receipts = JSON.parse(localStorage.getItem(RECEIPTS_KEY) ?? "{}") as Record<string, string>;
    const next = Object.fromEntries(Object.entries(receipts).filter(([, receipt]) => receipt !== id));
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(next));
  } catch { /* A later explicit submission still makes a fresh request in unavailable storage. */ }
}
function playableFrameUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, location.href);
    return ["http:", "https:"].includes(url.protocol) && url.origin !== location.origin ? url.href : null;
  } catch { return null; }
}

function isUserActionBlocked(detail: FailureDetail) {
  return ["authentication", "permission", "configuration"].includes(detail.category)
    || /(?:AUTH|PERMISSION|KEY|TOKEN|QUOTA|CREDIT|BILLING)/i.test(detail.code);
}

function isSystemImageFailure(detail: FailureDetail) {
  return detail.stage === "asset" && detail.category === "invalid-image";
}

function isSystemCodeRepair(detail: FailureDetail) {
  return (detail.stage === "code" || detail.stage === "browser")
    && detail.category === "validation"
    && ["BROWSER_VALIDATION", "VALIDATION", "AUTO_REPAIR_EXHAUSTED"].includes(detail.code);
}

function hasSystemContinuation(detail: FailureDetail) {
  return detail.continuation?.kind === "regenerate-resource"
    && detail.continuation.resourceFile === detail.resource?.file;
}

function ProductionFailureDetails({ error, details, fallback }: { error?: unknown; details?: Build["failureDetails"]; fallback: string }) {
  const locale=useComponentLocale(); const c=automaticProductionCopy[locale];
  const resolved = details ?? failureDetailsFrom(error);
  if (!resolved?.some(detail => isSystemImageFailure(detail) || isSystemCodeRepair(detail))) return <FailureDetails error={error} details={details} fallback={fallback} />;
  return <section className="failure-details" role="alert" aria-live="assertive"><strong>{c.failed}</strong><div className="failure-detail-list">
    {resolved.map((detail, index) => {
      if (isSystemImageFailure(detail)) { const label=detail.resource?.label?`“${detail.resource.label}”`:c.gameImage; const canContinue=detail.code==="SPRITE_FRAME_EDGE"||hasSystemContinuation(detail); const message=detail.code==="SPRITE_FRAME_EDGE"?pc(c.edge,{label}):hasSystemContinuation(detail)?pc(c.exhausted,{label}):pc(c.imageStopped,{label}); const next=detail.code==="SPRITE_FRAME_EDGE"?c.regenerate:hasSystemContinuation(detail)?c.continueImage:c.cannotImage; return <article key={`${detail.code}-${index}`}><header><strong>{c.assetCheck}</strong><span>{canContinue?c.continueSystem:c.repairSpent}</span></header><p>{message}</p><p className="failure-next">{pc(c.after,{text:next})}</p></article>; }
      if (isSystemCodeRepair(detail)) return <article key={`${detail.code}-${index}`}><header><strong>{c.codeCheck}</strong><span>{c.continueSystem}</span></header><p>{c.codeRetained}</p><p className="failure-next">{c.codeNext}</p></article>;
      return <article key={`${detail.code}-${index}`}><header><strong>{c.service}</strong><span>{detail.retryable&&!isUserActionBlocked(detail)?c.resubmit:c.resolveFirst}</span></header><details><summary>{c.service}</summary><p>{detail.message}</p><p>{detail.nextStep}</p></details><small>{pc(c.reference,{code:detail.code})}</small></article>;
    })}
  </div></section>;
}

function warningResourceLabel(text: string) {
  const warning = text.split("美术提醒：")[1]?.trim();
  if (!warning) return null;
  const label = warning.match(/^([^（(，,；;]+)/)?.[1]?.trim();
  return label && label.length <= 40 ? label : null;
}

function productionSteps(steps: Build["steps"], c:AutomaticProductionCopy, locale:string): Build["steps"] {
  return steps.map(step => {
    const realRepairProgress = step.status === "running" && step.detail.startsWith("正在自动修复“");
    const repairProgress = realRepairProgress
      ? step.detail.match(/^正在自动修复“([^”]{1,120})”（(\d{1,2}\/\d{1,2})）/)
      : null;
    if (repairProgress) return {
      ...step,
      detail: `正在自动修复“${repairProgress[1]}”（${repairProgress[2]}）：系统正在重新生成并检查这项图片`,
      excerpt: null,
    };
    if (step.kind !== "asset") return step;
    const repairCompleted = Boolean(step.output && /(?:系统已自动修复|自动修复后已通过|自动调整后已通过)/.test(step.output));
    const proceduralRoute = step.status === "succeeded" && /(?:未声明必须交付的位图|不调用图像模型)/.test(`${step.detail} ${step.output ?? ""}`);
    const generatedImageEvidence = step.status === "succeeded" && Boolean(step.output && /(?:位图|图片|图像|封面|局内美术|生图|美术资源)/.test(step.output));
    return {
      ...step,
      detail: locale==="zh-CN"?(proceduralRoute?"确认方案采用程序绘制，本轮无需生成游戏图片。":step.status==="failed"?"部分游戏图片未通过系统检查，自动处理已经停止。":generatedImageEvidence?"游戏图片已经生成并通过系统检查。":step.status==="succeeded"?"资源步骤已经完成；服务端未提供图片生成明细。":"系统正在生成并检查游戏图片。"):(proceduralRoute||generatedImageEvidence||step.status==="succeeded"?c.complete:step.status==="failed"?c.notComplete:c.assetCheck),
      output: proceduralRoute
        ? locale==="zh-CN"?"本轮未调用图像模型；游戏画面将由 CSS、Canvas 或内联 SVG 绘制。":c.checkpoint
        : repairCompleted
        ? locale==="zh-CN"?"系统已自动调整相关游戏图片，并再次检查通过。":c.repaired
        : step.output
          ? step.status === "failed" ? (locale==="zh-CN"?"这一步未能完成。":c.notComplete) : (locale==="zh-CN"?"这一步已经完成。":c.complete)
          : step.output,
      excerpt: null,
    };
  });
}

export function AutomaticProduction({ draft, confirmedPlan, confirmedDesignProfile, originalIdea, referenceFallback, revisionPlan }: { draft: StudioDraft; confirmedPlan?: string; confirmedDesignProfile?: GameDesignProfile; originalIdea?: string; referenceFallback?: ProjectInput["referenceFallback"]; revisionPlan?: RevisionPlan }) {
  const tm = useCentralMessages();
  const locale=useComponentLocale(); const c=automaticProductionCopy[locale];
  const [projectId, setProjectId] = useState(() => new URLSearchParams(location.search).get("production") ?? getPendingProductionId());
  const [build, setBuild] = useState<Build | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [job, setJob] = useState<ProductionJob | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [readError, setReadError] = useState<unknown>(null);
  const [busy, setBusy] = useState(!projectId);
  const [loaded, setLoaded] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const draftRef = useRef(draft);
  const creating = useRef(false);
  const activeRequestId = useRef<string | null>(projectId);
  const streamController = useRef<AbortController | null>(null);
  const stopRequested = useRef<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState<unknown>(null);
  const [demoApproved, setDemoApproved] = useState(false);
  const [reviewingDemo, setReviewingDemo] = useState(false);
  const [demoReviewError, setDemoReviewError] = useState<unknown>(null);
  const recovering = job?.status === "recovering";
  const preparing = job?.status === "queued" || job?.status === "creating";
  const working = recovering || preparing || build?.status === "queued" || build?.status === "running";
  // A persisted production receipt stays terminal after the user explicitly
  // starts a later build on its project. Once a build exists, it is authoritative.
  const cancelled = build ? build.status === "cancelled" : job?.status === "cancelled";
  useEffect(() => {
    if (projectId) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      if (creating.current) return;
      if (!confirmedPlan) {
        setBusy(false); setError(c.noPlan); return;
      }
      if (draftRef.current.creationMode === "mechanic-composition" && !draftRef.current.aspectRatio) {
        setBusy(false); setError(c.noAspect); return;
      }
      creating.current = true;
      let savedProjectId: string | null = null;
      try {
        const value = draftRef.current;
        const template = gameTemplateSchema.safeParse(value.creationMode === "template-remix" ? DOMAIN_TEMPLATE_ART[value.templateId ?? ""] : undefined);
        const templateId = template.success ? template.data : "generated";
        const styleDirection = resolveEarlyStyleDirection(originalIdea ?? confirmedPlan, templateId);
        const input: ProjectInput = {
          idea: originalIdea ?? confirmedPlan,
          template: template.success ? template.data : "auto",
          artStyle: styleDirection.artStyle,
          visualStyle: styleDirection.visualStyle,
          creationMode: confirmedDesignProfile?.creationMode ?? "original-demo",
          ...(referenceFallback ? { referenceFallback } : {}),
          ...(value.creationMode === "mechanic-composition" ? { spriteAnimation: value.spriteAnimation } : {}),
          ...(value.creationMode === "mechanic-composition" && value.aspectRatio ? { aspectRatio: value.aspectRatio } : {}),
          ...(value.creationMode === "template-remix" && value.sourceGame
            ? revisionPlan ? { sourceProjectId: value.sourceGame.id, revisionPlan } : { sourceProjectId: value.sourceGame.id, revisionScope: value.revisionScope }
            : {}),
          ...(confirmedDesignProfile ? { confirmedDesignProfile } : {}),
        };
        const id = productionReceipt(input);
        activeRequestId.current = id;
        localStorage.setItem(PENDING_KEY, id);
        const previous = await getProductionJob(id);
        const accepted = previous ?? await submitProduction({ ...input, requestId: id });
        if (stopRequested.current === id) return;
        savedProjectId = accepted.id;
        // This address identifies a persisted server task, even before project creation.
        const url = new URL(location.href); url.searchParams.set("production", accepted.id);
        history.replaceState(null, "", url);
        localStorage.removeItem(PENDING_KEY);
        if (active) { setJob(accepted); setProjectId(accepted.id); setRefresh(n => n + 1); }
      } catch (reason) {
        if (active) {
          if (savedProjectId) setProjectId(savedProjectId);
          setError(reason);
        }
      } finally { if (active) setBusy(false); }
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [projectId]);
  useEffect(() => {
    if (!projectId) return;
    // A Stop request closes the current stream. Do not reconnect it while the
    // durable cancellation endpoint is deciding the final state.
    if (stopRequested.current === projectId) return;
    let active = true;
    const abort = new AbortController();
    streamController.current = abort;
    let timer: number;
    const read = async () => {
      try {
        const task = await getProductionJob(projectId);
        if (!active) return;
        setJob(task);
        if (task) {
          if (getPendingProductionId() === projectId) {
            const url = new URL(location.href); url.searchParams.set("production", projectId);
            history.replaceState(null, "", url);
            localStorage.removeItem(PENDING_KEY);
          }
          if (task.status === "succeeded" || task.status === "failed" || task.status === "cancelled") {
            // A terminal production receipt can already own a project and build. The
            // job row only mirrors its terminal status, so load the build to recover
            // the actionable failure details without starting any new work.
            const latest = await getLatestBuild(projectId);
            if (!active) return;
            setBuild(latest);
            setLoaded(true); setReadError("");
            // The receipt remains terminal when the user explicitly starts a new
            // build on its saved project, so follow that newer build directly.
            if (latest?.status === "queued" || latest?.status === "running") timer = window.setTimeout(read, 1500);
            return;
          }
          await watchProductionJob(projectId, abort.signal, (current, currentBuild) => {
            if (!active) return;
            setJob(current); setBuild(currentBuild); setLoaded(true); setReadError("");
          });
          return;
        }
        const latest = await getLatestBuild(projectId);
        // A null build does not prove that its project exists.
        if (!latest) await getProject(projectId);
        if (!active) return;
        setBuild(latest); setLoaded(true); setReadError("");
        if (!latest || latest.status === "queued" || latest.status === "running") timer = window.setTimeout(read, 1500);
      } catch (reason) {
        if (abort.signal.aborted) return;
        if (active) { setReadError(reason); timer = window.setTimeout(read, 5000); }
      }
    };
    void read();
    return () => { active = false; window.clearTimeout(timer); abort.abort(); if (streamController.current === abort) streamController.current = null; };
  }, [projectId, refresh]);
  // 预览画幅与标题来自项目记录；读取失败只影响展示，不影响制作状态。
  const detailProjectId = build?.projectId ?? (job?.status === "building" ? projectId : null);
  useEffect(() => {
    if (!detailProjectId || project?.id === detailProjectId) return;
    let active = true;
    void (async () => {
      try {
        const next = await getProject(detailProjectId);
        if (active && next) setProject(next);
      } catch { /* 标题与画幅只是展示信息，读取失败不影响制作状态。 */ }
    })();
    return () => { active = false; };
  }, [detailProjectId, project?.id]);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<unknown>(null);
  const retry = async () => {
    if (!projectId || retrying) return;
    setRetrying(true); setRetryError(null);
    try {
      const next = await retryProduction(projectId);
      const url = new URL(location.href); url.searchParams.set("production", next.id);
      history.replaceState(null, "", url);
      setJob(next); setBuild(null); setLoaded(false); setProjectId(next.id); setRefresh(n => n + 1);
    } catch (reason) {
      setRetryError(reason);
    } finally { setRetrying(false); }
  };
  const stop = async () => {
    const id = projectId ?? activeRequestId.current ?? getPendingProductionId();
    if (!id || stopping) return;
    stopRequested.current = id;
    setStopping(true); setStopError(null);
    // Tear down the progress stream immediately, then wait for the durable server result.
    streamController.current?.abort();
    setRefresh(value => value + 1);
    try {
      const next = await cancelProduction(id);
      if (next.status === "cancelled") {
        forgetProductionReceipt(id);
        if (getPendingProductionId() === id) localStorage.removeItem(PENDING_KEY);
      }
      activeRequestId.current = id;
      setProjectId(id);
      setJob(next);
      setLoaded(true);
      if (next.status === "succeeded") {
        try { setBuild(await getLatestBuild(id)); } catch { /* The saved terminal job still tells the truth. */ }
      } else if (next.status === "cancelled") {
        setBuild(null);
        try {
          const latest = await getLatestBuild(id);
          if (latest?.status === "cancelled") setBuild(latest);
        } catch { /* A pre-project cancellation has no build to load. */ }
      }
    } catch (reason) {
      stopRequested.current = null;
      setStopError(reason);
      setRefresh(value => value + 1);
    } finally {
      setStopping(false);
    }
  };
  // 构建失败后的重试是用户的明确操作：沿用已确认方案与已生成的图片，重新走代码、验收与审核；平台自身从不自动重试付费调用。
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildError, setRebuildError] = useState<unknown>(null);
  const rebuild = async () => {
    const target = build?.projectId ?? projectId;
    if (!target || rebuilding) return;
    setRebuilding(true); setRebuildError(null);
    try {
      const next = await startBuild(target);
      setBuild(next); setLoaded(true); setReadError("");
      setRefresh(n => n + 1);
    } catch (reason) {
      setRebuildError(reason);
    } finally { setRebuilding(false); }
  };
  const step = build?.steps.find(item => item.status === "running");
  const visibleSteps = build ? productionSteps(build.steps,c,locale) : [];
  const previewUrl = playableFrameUrl(build?.previewUrl);
  const failureDetails = build?.failureDetails ?? job?.failureDetails ?? failureDetailsFrom(error);
  const canRetryFailure = Boolean(failureDetails?.length
    && failureDetails.every(detail => detail.retryable && !isUserActionBlocked(detail)));
  // A frame-edge gate rejects the generated pixels before the dynamic-art
  // checkpoint is committed. A user-requested new build can therefore safely
  // regenerate that failed sprite while retaining the project and valid work.
  const canRegenerateFailedSprite = Boolean(build?.status === "failed" && failureDetails?.length
    && !build.revisionPlan && !build.revisionScope
    && failureDetails.every(detail => detail.stage === "asset" && detail.category === "invalid-image" && detail.code === "SPRITE_FRAME_EDGE"));
  const canContinueSystemRepair = Boolean(build?.status === "failed" && failureDetails?.length
    && !build.revisionPlan && !build.revisionScope
    && failureDetails.every(detail => !isUserActionBlocked(detail) && hasSystemContinuation(detail)));
  const canContinueCodeRepair = Boolean(build?.status === "failed" && failureDetails?.length
    && !build.revisionPlan && !build.revisionScope
    && failureDetails.every(detail => !isUserActionBlocked(detail) && isSystemCodeRepair(detail)));
  const canRetryNonImageBuild = Boolean(failureDetails?.length
    && failureDetails.every(detail => detail.retryable && !isUserActionBlocked(detail) && !isSystemImageFailure(detail)));
  // startBuild only carries the saved project's current intent. A historical
  // revision build must not silently lose its revision plan on a generic retry.
  const canRetryBuild = Boolean(!recovering && !build?.revisionPlan && !build?.revisionScope
    && (canRetryNonImageBuild || canRegenerateFailedSprite || canContinueSystemRepair || canContinueCodeRepair));
  const jobFailedWithoutBuild = job?.status === "failed" && !build;
  const label = stopping?c.stopping:cancelled?c.cancelled:recovering?c.recovering:error||jobFailedWithoutBuild?c.notComplete:readError?c.readFailed:busy?c.submitting:preparing?c.accepted:working?c.queued:build?.status==="succeeded"?c.complete:build?.status==="failed"?c.notComplete:loaded?c.savedNoTask:c.restoring;
  const succeeded = !cancelled && build?.status === "succeeded";
  useEffect(() => {
    if (!succeeded || !build?.versionId) return;
    let active = true;
    void getDemoReview(build.projectId, build.versionId).then(review => { if (active) setDemoApproved(Boolean(review)); }).catch(() => { /* Approval remains visibly pending when status cannot be read. */ });
    return () => { active = false; };
  }, [succeeded, build?.projectId, build?.versionId]);
  const approveDemo = async () => {
    if (!build?.versionId || reviewingDemo) return;
    setReviewingDemo(true); setDemoReviewError(null);
    try { await approveDemoReview(build.projectId, build.versionId); setDemoApproved(true); }
    catch (reason) { setDemoReviewError(reason); }
    finally { setReviewingDemo(false); }
  };
  const completedStepText = succeeded ? build.steps.map(item => `${item.output ?? ""} ${item.detail ?? ""} ${item.excerpt ?? ""}`) : [];
  const artWarningText = completedStepText.find(text => text.includes("美术提醒："));
  const artWarningLabel = artWarningText ? warningResourceLabel(artWarningText) : null;
  const automaticRepairRecorded = completedStepText.some(text => /(?:自动修复|自动调整|系统已调整|重新生成后(?:已)?通过|修复后(?:已)?通过)/.test(text));
  const failed = !recovering && (build?.status === "failed" || jobFailedWithoutBuild || Boolean(error));
  const workspaceProjectId = build?.projectId ?? projectId ?? "";
  const totalSteps = build?.steps.length ?? 0;
  const finishedSteps = build?.steps.filter(item => item.status === "succeeded" || item.status === "failed").length ?? 0;
  const progressPercent = totalSteps ? Math.round((finishedSteps / totalSteps) * 100) : 0;
  const aspectRatio = project?.spec?.aspectRatio ?? draft.aspectRatio ?? "1:1";
  const [aspectWidth, aspectHeight] = aspectRatio.split(":").map(Number);
  const previewStyle = { "--preview-aspect": aspectRatio.replace(":", " / "), "--preview-ratio-value": aspectWidth / aspectHeight } as CSSProperties;
  const title = project?.title ?? ((originalIdea ?? confirmedPlan ?? "").split("\n")[0].slice(0, 28) || c.productionTitle);
  const liveState = stopping ? "stopping" : cancelled ? "cancelled" : failed ? "failed" : succeeded ? "succeeded" : working || busy ? "running" : preparing ? "queued" : "idle";
  const liveStateLabel = stopping ? tm("studio.building", "正在停止") : cancelled ? tm("studio.buildCancelled", "已停止") : failed ? tm("studio.buildFailed", "未完成") : succeeded ? tm("studio.buildReady", "可试玩") : working || busy ? tm("studio.building", "制作中") : preparing ? tm("studio.buildQueued", "准备中") : tm("studio.loading", "等待");
  const placeholderTitle=stopping?c.stopping:cancelled?c.cancelled:failed?c.notComplete:working?c.forming:preparing||busy?c.preparing:loaded?c.waitingTask:c.restoring;
  const placeholderDetail=stopping?c.stopPending:cancelled?c.cancelDetail:failed?c.failedDetail:working?c.serverWorking:preparing?c.accepted:c.appearsHere;
  return <main className="maker-workbench production-workbench" id="main-content" tabIndex={-1} aria-busy={busy || working}>
    <div className="workbench-body">
      <section className="workbench-preview" aria-label={tm("studio.play", "游戏预览")}>
        <header className="workbench-preview-toolbar">
          <div className="device-switch" aria-label={tm("studio.previewSize", "预览画幅")}><span className="designed-aspect">{tm("studio.aspect", "设计画幅 {ratio}", { ratio: aspectRatio })}</span></div>
          <div className="preview-toolbar-actions">
            <span className={`preview-runtime-status status-${build?.status ?? "idle"}`}><i /> {working || busy || preparing ? "BUILDING" : succeeded && previewUrl ? "PLAYABLE" : "WAITING"}</span>
          </div>
        </header>
        <div className="preview-stage" data-aspect={aspectRatio} style={previewStyle}>
          <div className="preview-canvas">
            {succeeded && previewUrl
              ? <LocalizedGameFrame className="game-preview-frame production-playable-frame" title={tm("studio.play", "游戏试玩")} source={previewUrl} sandbox="allow-scripts allow-same-origin" allow="autoplay; fullscreen" />
              : <div className={`preview-placeholder production-placeholder state-${liveState}`}>
                <span><Play size={25} fill="currentColor" aria-hidden="true" /></span>
                <strong>{placeholderTitle}</strong>
                <p>{placeholderDetail}</p>
                {working && step?.excerpt && <LiveExcerpt text={step.excerpt} />}
                 <small>{totalSteps ? `${pc(c.stepsCount,{done:finishedSteps,total:totalSteps})} · ` : ""}{succeeded ? "READY" : failed ? "STOPPED" : "BUILDING"}</small>
              </div>}
          </div>
        </div>
      </section>
      <aside className="workbench-panel" aria-labelledby="production-panel-heading">
        <header className="workbench-panel-header">
          <div className="panel-title"><h2 id="production-panel-heading">{title}</h2></div>
          <div className="panel-pulse"><span className={`panel-live-state state-${liveState}`}><i />{liveStateLabel}</span></div>
        </header>
        <section className="workbench-stream" aria-label={c.progress}>
          <section className="workspace-summary" aria-live="polite">
            <span>{c.current}</span>
            <h3 role="status">{label}</h3>
            {succeeded && <p>{c.playFirst}</p>}{automaticRepairRecorded && <p>{c.repaired}</p>}
            {artWarningText&&<div role="note"><strong>{c.artWarning}</strong><p>{pc(c.artMessage,{label:artWarningLabel?`“${artWarningLabel}”`:c.gameImage})}</p><p><a href={`/projects/${encodeURIComponent(workspaceProjectId)}`}>{c.artAction}</a>（{c.artUsage}）</p></div>}
            {busy&&<p>{c.submittedTruth}</p>}{working&&<p>{c.waitingStep}</p>}{recovering&&<p>{c.checkpoint}</p>}{working&&<p>{c.bounded}</p>}{working&&<p>{c.durable}</p>}
            {stopping&&<p role="status">{c.stopStatus}</p>}{cancelled&&<p role="status">{c.cancelStatus}</p>}{loaded&&!job&&!build&&!busy&&!readError&&<p>{c.lookup}</p>}
          </section>
          {succeeded&&!demoApproved&&<div className="review-actions" aria-label={c.acceptance}><button type="button" className="primary-action" disabled={reviewingDemo} onClick={()=>void approveDemo()}>{reviewingDemo?c.savingReview:c.approve}</button><p>{c.feedbackHint}</p><a href={`/projects/${encodeURIComponent(workspaceProjectId)}`}>{c.feedback}</a></div>}
          {succeeded&&demoApproved&&<section className="workspace-summary" aria-label={c.optional}><strong>{c.acceptedReview}</strong><p>{project?.spec.designProfile.creationMode==="reference-replica"?c.referenceOptions:c.originalOptions}</p><a href={`/projects/${encodeURIComponent(workspaceProjectId)}`}>{c.adjust}</a></section>}
          {Boolean(demoReviewError)&&<FailureDetails error={demoReviewError} fallback={c.reviewSaveFailed}/>}
          {succeeded && <nav className="completed-game-actions" aria-label={tm("studio.buildReady", "完成后的操作")}><a href={`/projects/${encodeURIComponent(workspaceProjectId)}`}>{tm("projects.continue", "继续完善这个游戏")}</a><a href="/projects">{tm("nav.projects", "查看我的游戏")}</a></nav>}
          {(busy||working||!loaded)&&!error&&!readError&&!jobFailedWithoutBuild&&<WaitingActivity startedAt={build?.startedAt??job?.events?.[0]?.createdAt} label={step?c.waitingCurrent:c.waitingNext}/>}
          {job?.status === "failed" && !build && <><ProductionFailureDetails error={job.failureDetails?.length ? job.error : undefined} details={job.failureDetails} fallback={c.historyFallback}/><p>{c.sameReceipt}</p>
            {!build&&canRetryFailure?<div className="review-actions"><button type="button" className="primary-action" disabled={retrying} onClick={retry}>{retrying?c.retrying:c.continueProduction}</button><p>{c.paidOnClick}</p>{Boolean(retryError)&&<FailureDetails error={retryError} fallback={c.retryFailed}/>}</div>:null}</>}
          {Boolean(error)&&<><ProductionFailureDetails error={error} fallback={c.requestFailed}/><p>{c.noPaidRetry}</p></>}{Boolean(readError)&&<FailureDetails error={readError} fallback={c.readFallback}/>} {Boolean(stopError)&&<FailureDetails error={stopError} fallback={c.stopFallback}/>} {build?.status==="failed"&&!recovering&&<ProductionFailureDetails error={build.failureDetails?.length?build.error:undefined} details={build.failureDetails} fallback={c.historyFallback}/>}
          {build?.status === "failed" && canRetryBuild ? <div className="production-retry">
            <button type="button" className="primary-action" disabled={rebuilding} onClick={rebuild}>{rebuilding?c.restarting:canRegenerateFailedSprite||canContinueSystemRepair?c.continueGenerate:c.continueProduction}</button>
            <p>{canRegenerateFailedSprite||canContinueSystemRepair?c.imageClick:canContinueCodeRepair?c.codeClick:c.buildClick}</p>{Boolean(rebuildError)&&<FailureDetails error={rebuildError} fallback={c.rebuildFailed}/>}
          </div> : null}
          {build?.status==="failed"&&<div className="review-actions"><a href={`/projects/${encodeURIComponent(workspaceProjectId)}`}>{c.viewSaved}</a></div>}
          {!!job?.events?.length&&!build&&<section className="production-lane" aria-label={c.prepProcess}>
            <header className="production-lane-heading"><h3>{c.prep}</h3><output>{job.status==="failed"?c.interrupted:c.inProgress}</output></header>
            <ol className="production-prep-events">{job.events.map((event,index)=><li key={index}><strong>{event.title}</strong><span>{job.status==="failed"&&index===job.events!.length-1?c.breakHere:c.recorded}</span></li>)}</ol>
          </section>}
          {build && <section className="production-lane" aria-label={tm("studio.steps", "制作步骤")}>
            <header className="production-lane-heading"><h3>{tm("studio.steps", "制作步骤")}</h3><output>{finishedSteps}/{totalSteps}</output></header>
            <BuildStageList steps={visibleSteps} showExcerpt={false} />
          </section>}
          {(working||busy)&&!cancelled&&<div className="review-actions"><button type="button" className="secondary-action stop-action" disabled={stopping} onClick={()=>void stop()}>{stopping?c.stopping:stopError?c.retryStop:c.stop}</button></div>}
        </section>
        {build && (build.status === "queued" || build.status === "running") ? (
          <div className="build-progress" role="status" aria-label={pc(c.progressAria,{value:progressPercent})}>
            <span>{build.status === "queued" ? tm("studio.buildQueued", "排队中") : tm("studio.building", "制作中")}</span>
            <div><i style={{ width: `${progressPercent}%` }} /></div>
            <output>{finishedSteps}/{totalSteps}</output>
          </div>
        ) : null}
      </aside>
    </div>
  </main>;
}
