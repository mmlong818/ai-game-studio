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
  return ["authentication", "permission", "rate-limit", "configuration"].includes(detail.category)
    || /(?:AUTH|PERMISSION|KEY|TOKEN|QUOTA|CREDIT|BILLING)/i.test(detail.code);
}

function isSystemImageFailure(detail: FailureDetail) {
  return detail.stage === "asset" && detail.category === "invalid-image";
}

function isSystemCodeRepair(detail: FailureDetail) {
  return detail.stage === "code" && detail.category === "validation" && detail.code === "BROWSER_VALIDATION";
}

function hasSystemContinuation(detail: FailureDetail) {
  return detail.continuation?.kind === "regenerate-resource"
    && detail.continuation.resourceFile === detail.resource?.file;
}

function imageFailureCopy(detail: FailureDetail) {
  const label = detail.resource?.label ? `“${detail.resource.label}”` : "一项游戏图片";
  if (detail.code === "SPRITE_FRAME_EDGE") {
    return {
      message: `系统检查发现${label}的效果可能需要再次确认。`,
      nextStep: "你可以选择让系统在下一轮重新生成并检查；无需自行修改资源。",
    };
  }
  if (hasSystemContinuation(detail)) {
    return {
      message: `${label}在本轮自动处理次数用尽后仍未通过系统检查。`,
      nextStep: "你可以选择继续让系统重新生成并检查这项资源；无需自行修改资源。",
    };
  }
  return {
    message: `${label}未通过系统检查，本轮自动处理已经停止。`,
    nextStep: "系统无法在当前流程中继续处理这项资源；无需自行修改资源。",
  };
}

function ProductionFailureDetails({ error, details, fallback }: { error?: unknown; details?: Build["failureDetails"]; fallback: string }) {
  const resolved = details ?? failureDetailsFrom(error);
  if (!resolved?.some(detail => isSystemImageFailure(detail) || isSystemCodeRepair(detail))) return <FailureDetails error={error} details={details} fallback={fallback} />;
  return <section className="failure-details" role="alert" aria-live="assertive">
    <strong>本次未能完成</strong>
    <div className="failure-detail-list">
      {resolved.map((detail, index) => {
        if (isSystemImageFailure(detail)) {
          const copy = imageFailureCopy(detail);
          const canContinue = detail.code === "SPRITE_FRAME_EDGE" || hasSystemContinuation(detail);
          return <article key={`${detail.code}-${index}`}>
            <header><strong>资源生成 · 系统检查未通过</strong><span>{canContinue ? "可继续让系统处理" : "系统自动处理已用尽"}</span></header>
            <p>{copy.message}</p>
            <p className="failure-next">后续：{copy.nextStep}</p>
          </article>;
        }
        if (isSystemCodeRepair(detail)) return <article key={`${detail.code}-${index}`}>
          <header><strong>代码制作 · 浏览器检查未通过</strong><span>可继续让系统处理</span></header>
          <p>游戏代码没有通过自动试玩检查，原项目和已确认方案仍然保留。</p>
          <p className="failure-next">后续：你可以明确继续制作，由系统修复代码并重新验收；无需自行修改代码。</p>
        </article>;
        return <article key={`${detail.code}-${index}`}>
          <header><strong>制作服务 · 需要处理</strong><span>{detail.retryable && !isUserActionBlocked(detail) ? "可再次提交" : "请先解决原因"}</span></header>
          <p>{detail.message}</p>
          <p className="failure-next">下一步：{detail.nextStep}</p>
          <small>参考编号：{detail.code}</small>
        </article>;
      })}
    </div>
  </section>;
}

function warningResourceLabel(text: string) {
  const warning = text.split("美术提醒：")[1]?.trim();
  if (!warning) return null;
  const label = warning.match(/^([^（(，,；;]+)/)?.[1]?.trim();
  return label && label.length <= 40 ? label : null;
}

function productionSteps(steps: Build["steps"]): Build["steps"] {
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
    return {
      ...step,
      detail: step.status === "failed"
          ? "部分游戏图片未通过系统检查，自动处理已经停止。"
          : step.status === "succeeded"
            ? "游戏图片已经生成并通过系统检查。"
            : "系统正在生成并检查游戏图片。",
      output: repairCompleted
        ? "系统已自动调整相关游戏图片，并再次检查通过。"
        : step.output
          ? step.status === "failed" ? "这一步未能完成。" : "这一步已经完成。"
          : step.output,
      excerpt: null,
    };
  });
}

export function AutomaticProduction({ draft, confirmedPlan, confirmedDesignProfile, originalIdea, referenceFallback, revisionPlan }: { draft: StudioDraft; confirmedPlan?: string; confirmedDesignProfile?: GameDesignProfile; originalIdea?: string; referenceFallback?: ProjectInput["referenceFallback"]; revisionPlan?: RevisionPlan }) {
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
  const preparing = job?.status === "queued" || job?.status === "creating";
  const working = preparing || build?.status === "queued" || build?.status === "running";
  // A persisted production receipt stays terminal after the user explicitly
  // starts a later build on its project. Once a build exists, it is authoritative.
  const cancelled = build ? build.status === "cancelled" : job?.status === "cancelled";
  useEffect(() => {
    if (projectId) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      if (creating.current) return;
      if (!confirmedPlan) {
        setBusy(false); setError("尚未确认方案。请返回创作页确认方案后，再明确开始制作。"); return;
      }
      if (draftRef.current.creationMode === "mechanic-composition" && !draftRef.current.aspectRatio) {
        setBusy(false); setError("请返回创作页选择游戏画幅后，再开始制作。"); return;
      }
      creating.current = true;
      let savedProjectId: string | null = null;
      try {
        const value = draftRef.current;
        const template = gameTemplateSchema.safeParse(value.creationMode === "template-remix" ? DOMAIN_TEMPLATE_ART[value.templateId ?? ""] : undefined);
        const input: ProjectInput = {
          idea: originalIdea ?? confirmedPlan,
          template: template.success ? template.data : "auto",
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
  const visibleSteps = build ? productionSteps(build.steps) : [];
  const visibleStep = visibleSteps.find(item => item.status === "running");
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
  const canRetryBuild = Boolean(!build?.revisionPlan && !build?.revisionScope
    && (canRetryNonImageBuild || canRegenerateFailedSprite || canContinueSystemRepair || canContinueCodeRepair));
  const jobFailedWithoutBuild = job?.status === "failed" && !build;
  const label = stopping ? "正在停止制作" : cancelled ? "制作已停止" : error || jobFailedWithoutBuild ? "本次制作未完成" : readError ? "无法恢复制作记录" : busy ? "正在提交你确认的制作任务" : preparing ? (job?.events?.at(-1)?.title ?? "服务端已接收，等待开始处理") : working ? step?.title ?? "正在排队制作" : build?.status === "succeeded" ? "游戏制作已完成" : build?.status === "failed" ? "本次制作未完成" : loaded ? "项目已保存，尚未收到制作任务" : "正在恢复制作记录";
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
  const failed = build?.status === "failed" || jobFailedWithoutBuild || Boolean(error);
  const workspaceProjectId = build?.projectId ?? projectId ?? "";
  const totalSteps = build?.steps.length ?? 0;
  const finishedSteps = build?.steps.filter(item => item.status === "succeeded" || item.status === "failed").length ?? 0;
  const progressPercent = totalSteps ? Math.round((finishedSteps / totalSteps) * 100) : 0;
  const aspectRatio = project?.spec?.aspectRatio ?? draft.aspectRatio ?? "1:1";
  const [aspectWidth, aspectHeight] = aspectRatio.split(":").map(Number);
  const previewStyle = { "--preview-aspect": aspectRatio.replace(":", " / "), "--preview-ratio-value": aspectWidth / aspectHeight } as CSSProperties;
  const title = project?.title ?? ((originalIdea ?? confirmedPlan ?? "").split("\n")[0].slice(0, 28) || "游戏制作");
  const liveState = stopping ? "stopping" : cancelled ? "cancelled" : failed ? "failed" : succeeded ? "succeeded" : working || busy ? "running" : preparing ? "queued" : "idle";
  const liveStateLabel = stopping ? "正在停止" : cancelled ? "已停止" : failed ? "未完成" : succeeded ? "可试玩" : working || busy ? "制作中" : preparing ? "准备中" : "等待";
  const placeholderTitle = stopping ? "正在停止制作" : cancelled ? "本轮制作已停止" : failed ? "本次制作未完成" : working ? "游戏正在这里成形" : preparing || busy ? "正在准备制作" : loaded ? "等待制作任务" : "正在恢复制作记录";
  const placeholderDetail = stopping ? "正在等待服务端确认，不会再接收这轮制作的进度。" : cancelled ? "已停止后续制作；已有成果和上一个成功版本仍可查看。" : failed ? "已有项目记录保留，右侧会说明停下的位置、原因和下一步。" : working ? (visibleStep?.detail ?? "服务端正在处理，关闭页面也不会取消任务。") : preparing ? (job?.events?.at(-1)?.title ?? "服务端已接收，等待开始处理") : "制作完成后，游戏会直接出现在这里。";
  return <main className="maker-workbench production-workbench" id="main-content" tabIndex={-1} aria-busy={busy || working}>
    <div className="workbench-body">
      <section className="workbench-preview" aria-label="游戏预览">
        <header className="workbench-preview-toolbar">
          <div className="device-switch" aria-label="预览画幅"><span className="designed-aspect">设计画幅 {aspectRatio}</span></div>
          <div className="preview-toolbar-actions">
            <span className={`preview-runtime-status status-${build?.status ?? "idle"}`}><i /> {working || busy || preparing ? "BUILDING" : succeeded && previewUrl ? "PLAYABLE" : "WAITING"}</span>
          </div>
        </header>
        <div className="preview-stage" data-aspect={aspectRatio} style={previewStyle}>
          <div className="preview-canvas">
            {succeeded && previewUrl
              ? <iframe className="game-preview-frame production-playable-frame" title="游戏试玩" src={previewUrl} sandbox="allow-scripts allow-same-origin" allow="autoplay; fullscreen" />
              : <div className={`preview-placeholder production-placeholder state-${liveState}`}>
                <span><Play size={25} fill="currentColor" aria-hidden="true" /></span>
                <strong>{placeholderTitle}</strong>
                <p>{placeholderDetail}</p>
                {working && step?.excerpt && <LiveExcerpt text={step.excerpt} />}
                <small>{totalSteps ? `${finishedSteps}/${totalSteps} 步 · ` : ""}{succeeded ? "READY" : failed ? "STOPPED" : "BUILDING"}</small>
              </div>}
          </div>
        </div>
      </section>
      <aside className="workbench-panel" aria-labelledby="production-panel-heading">
        <header className="workbench-panel-header">
          <div className="panel-title"><h2 id="production-panel-heading">{title}</h2></div>
          <div className="panel-pulse"><span className={`panel-live-state state-${liveState}`}><i />{liveStateLabel}</span></div>
        </header>
        <section className="workbench-stream" aria-label="自动制作进度">
          <section className="workspace-summary" aria-live="polite">
            <span>当前进展</span>
            <h3 role="status">{label}</h3>
            {succeeded && <p>试玩版已经制作完成并保存。请先实际玩一局；制作完成不代表你已经验收通过。</p>}
            {automaticRepairRecorded && <p>制作记录显示，系统已在本轮完成自动调整并再次检查。</p>}
            {artWarningText && <div role="note"><strong>美术提醒</strong><p>系统检查发现{artWarningLabel ? `“${artWarningLabel}”` : "一项资源"}的效果可能需要进一步确认。本轮制作已经完成，你无需自行修改资源。</p><p><a href={`/projects/${encodeURIComponent(workspaceProjectId)}`}>让系统再次生成并检查</a>（进入项目后，由你明确提交才会调用图像模型）</p></div>}
            {busy && <p>你已明确提交本轮制作。收到服务端记录后，页面会显示真实阶段和步骤。</p>}
            {working && <p>{visibleStep?.detail ?? job?.events?.at(-1)?.title ?? "服务端已接收任务，正在等待实际步骤。"}</p>}
            {working && <p>系统会在同一轮制作内自动检查生成结果，并在允许次数内修复可处理的问题。这里仅显示服务端返回的阶段和步骤，不会根据等待时间推测进度。</p>}
            {working && <p>制作在服务端继续，关闭或刷新页面不会取消任务，也不会重复提交。</p>}
            {stopping && <p role="status">正在等待服务端确认停止。</p>}
            {cancelled && <p role="status">已停止后续制作；已发出的远程请求已尝试中止，但服务商可能已开始计费。</p>}
            {loaded && !job && !build && !busy && !readError && <p>已确认项目存在，正在查询是否收到制作任务。这里只查询状态，不会自动重新提交付费制作。</p>}
          </section>
          {succeeded && !demoApproved && <div className="review-actions" aria-label="试玩验收"><button type="button" className="primary-action" disabled={reviewingDemo} onClick={() => void approveDemo()}>{reviewingDemo ? "正在保存验收…" : "我已试玩，验收通过"}</button><p>如果有问题，进入项目直接说明复刻差异或需要修正的地方；修错无需先验收。</p><a href={`/projects/${encodeURIComponent(workspaceProjectId)}`}>反馈问题或复刻差异</a></div>}
          {succeeded && demoApproved && <section className="workspace-summary" aria-label="验收后的可选方向"><strong>试玩已验收</strong><p>{project?.spec.designProfile.creationMode === "reference-replica" ? "现在可以在保留已复刻玩法、关卡和局制的前提下，按需提出风格、底图、色调或难度微调。选择前系统不会自动改变。" : "现在可以继续保持玩法，按需提出风格、底图、色调或难度微调；也可以明确要求增加关卡。选择前系统不会自动扩展。"}</p><a href={`/projects/${encodeURIComponent(workspaceProjectId)}`}>提出一项可选调整</a></section>}
          {Boolean(demoReviewError) && <FailureDetails error={demoReviewError} fallback="试玩验收没有保存，请稍后重试。" />}
          {succeeded && <nav className="completed-game-actions" aria-label="完成后的操作"><a href={`/projects/${encodeURIComponent(workspaceProjectId)}`}>继续完善这个游戏</a><a href="/projects">查看我的游戏</a></nav>}
          {(busy || working || !loaded) && !error && !readError && !jobFailedWithoutBuild && <WaitingActivity startedAt={build?.startedAt ?? job?.events?.[0]?.createdAt} label={step ? "正在显示服务端返回的当前步骤。" : "正在等待服务端返回下一条记录。"} />}
          {job?.status === "failed" && !build && <><ProductionFailureDetails error={job.failureDetails?.length ? job.error : undefined} details={job.failureDetails} fallback="这份历史制作记录没有保存详细原因。请返回创作页重新分析修改需求，或到“我的项目”查看是否已保存项目。" /><p>此错误已保存，不会自动重新提交付费制作。</p>
            {!build && canRetryFailure ? <div className="review-actions"><button type="button" className="primary-action" disabled={retrying} onClick={retry}>{retrying ? "正在重新提交…" : "继续让系统制作"}</button><p>只有你点击后才会创建新一轮制作并使用模型用量。</p>{Boolean(retryError) && <FailureDetails error={retryError} fallback="重新提交没有被服务端确认，原记录保持不变。" />}</div> : null}</>}
          {Boolean(error) && <><ProductionFailureDetails error={error} fallback="制作请求没有被确认。当前没有自动重试或新的付费制作。" /><p>不会自动重试付费制作。</p></>}
          {Boolean(readError) && <FailureDetails error={readError} fallback="无法读取制作记录；正在尝试恢复连接，不会重新提交制作。" />}
          {Boolean(stopError) && <FailureDetails error={stopError} fallback="停止请求没有被服务端确认。可在确认服务连接后手动重试停止。" />}
          {build?.status === "failed" && <ProductionFailureDetails error={build.failureDetails?.length ? build.error : undefined} details={build.failureDetails} fallback="这份历史构建记录没有保存详细原因。请查看失败步骤后再决定是否新开一轮。" />}
          {build?.status === "failed" && canRetryBuild ? <div className="production-retry">
            <button type="button" className="primary-action" disabled={rebuilding} onClick={rebuild}>{rebuilding ? "正在重新开始…" : canRegenerateFailedSprite || canContinueSystemRepair ? "继续让系统生成并检查" : "继续让系统制作"}</button>
            <p>{canRegenerateFailedSprite || canContinueSystemRepair ? "只有你点击后，系统才会在已保存项目上开始新一轮生成和检查，并可能使用图像模型用量。" : canContinueCodeRepair ? "只有你点击后，系统才会在同一项目中沿用已确认方案继续制作；现有素材会保留，但新规则可能要求重新生成资源并使用模型用量。" : "只有你点击后，系统才会在已保存项目上开始新一轮制作。"}</p>
            {Boolean(rebuildError) && <FailureDetails error={rebuildError} fallback="重新制作没有被服务端确认，原记录保持不变。" />}
          </div> : null}
          {build?.status === "failed" && <div className="review-actions"><a href={`/projects/${encodeURIComponent(workspaceProjectId)}`}>查看已保存的项目</a></div>}
          {!!job?.events?.length && !build && <section className="production-lane" aria-label="项目准备过程">
            <header className="production-lane-heading"><h3>准备阶段</h3><output>{job.status === "failed" ? "已中断" : "进行中"}</output></header>
            <ol className="production-prep-events">{job.events.map((event, index) => <li key={index}><strong>{event.title}</strong><span>{job.status === "failed" && index === job.events!.length - 1 ? "此处中断" : "服务端已记录"}</span></li>)}</ol>
          </section>}
          {build && <section className="production-lane" aria-label="制作步骤">
            <header className="production-lane-heading"><h3>制作步骤</h3><output>{finishedSteps}/{totalSteps}</output></header>
            <BuildStageList steps={visibleSteps} showExcerpt={false} />
          </section>}
          {(working || busy) && !cancelled && <div className="review-actions"><button type="button" className="secondary-action stop-action" disabled={stopping} onClick={() => void stop()}>{stopping ? "正在停止…" : stopError ? "重试停止" : "停止制作"}</button></div>}
        </section>
        {build && (build.status === "queued" || build.status === "running") ? (
          <div className="build-progress" role="status" aria-label={`制作进度 ${progressPercent}%`}>
            <span>{build.status === "queued" ? "排队中" : "制作中"}</span>
            <div><i style={{ width: `${progressPercent}%` }} /></div>
            <output>{finishedSteps}/{totalSteps}</output>
          </div>
        ) : null}
      </aside>
    </div>
  </main>;
}
