import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Play } from "lucide-react";
import type { StudioDraft } from "../domain/types";
import type { Build, GameDesignProfile, ProjectDetail, ProjectInput, RevisionPlan } from "../shared/contracts";
import { DOMAIN_TEMPLATE_ART } from "../domain/templateResolution";
import { gameTemplateSchema } from "../shared/contracts";
import { submitProduction, getProductionJob, watchProductionJob, getProject, getLatestBuild, retryProduction, startBuild, cancelProduction, type ProductionJob } from "../web/api";
import { LiveExcerpt, WaitingActivity } from "./WaitingActivity";
import { BuildStageList } from "./BuildStageList";
import { FailureDetails } from "./FailureDetails";
import { failureDetailsFrom } from "../web/failure";

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

export function AutomaticProduction({ draft, confirmedPlan, confirmedDesignProfile, originalIdea, revisionPlan }: { draft: StudioDraft; confirmedPlan?: string; confirmedDesignProfile?: GameDesignProfile; originalIdea?: string; revisionPlan?: RevisionPlan }) {
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
  const preparing = job?.status === "queued" || job?.status === "creating";
  const working = preparing || build?.status === "queued" || build?.status === "running";
  const cancelled = job?.status === "cancelled" || build?.status === "cancelled";
  useEffect(() => {
    if (projectId) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      if (creating.current) return;
      if (!confirmedPlan) {
        setBusy(false); setError("尚未确认方案。请返回创作页确认方案后，再明确开始制作。"); return;
      }
      creating.current = true;
      let savedProjectId: string | null = null;
      try {
        const value = draftRef.current;
        const template = gameTemplateSchema.safeParse(value.creationMode === "template-remix" ? DOMAIN_TEMPLATE_ART[value.templateId ?? ""] : undefined);
        const input: ProjectInput = {
          idea: originalIdea ?? confirmedPlan,
          template: template.success ? template.data : "auto",
          ...(value.creationMode === "mechanic-composition" ? { spriteAnimation: value.spriteAnimation } : {}),
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
            setLoaded(true); setReadError(""); return;
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
  const previewUrl = playableFrameUrl(build?.previewUrl);
  const failureDetails = build?.failureDetails ?? job?.failureDetails ?? failureDetailsFrom(error);
  const canRetryFailure = Boolean(failureDetails?.length && failureDetails.every(detail => detail.retryable));
  const label = stopping ? "正在停止制作" : cancelled ? "制作已停止" : error || job?.status === "failed" ? "本次制作未完成" : readError ? "无法恢复制作记录" : busy ? "正在提交制作任务" : preparing ? (job?.events?.at(-1)?.title ?? "服务端已接收，等待开始处理") : working ? step?.title ?? "正在排队制作" : build?.status === "succeeded" ? "游戏制作已完成" : build?.status === "failed" ? "本次制作未完成" : loaded ? "项目已保存，尚未收到制作任务" : "正在恢复制作记录";
  const succeeded = !cancelled && build?.status === "succeeded";
  const failed = build?.status === "failed" || job?.status === "failed" || Boolean(error);
  const workspaceProjectId = build?.projectId ?? projectId ?? "";
  const totalSteps = build?.steps.length ?? 0;
  const finishedSteps = build?.steps.filter(item => item.status === "succeeded" || item.status === "failed").length ?? 0;
  const progressPercent = totalSteps ? Math.round((finishedSteps / totalSteps) * 100) : 0;
  const aspectRatio = project?.spec?.aspectRatio ?? "9:16";
  const [aspectWidth, aspectHeight] = aspectRatio.split(":").map(Number);
  const device = aspectHeight > aspectWidth ? "mobile" : "desktop";
  const previewStyle = { "--preview-aspect": aspectRatio.replace(":", " / "), "--preview-ratio-value": aspectWidth / aspectHeight } as CSSProperties;
  const title = project?.title ?? ((originalIdea ?? confirmedPlan ?? "").split("\n")[0].slice(0, 28) || "游戏制作");
  const liveState = stopping ? "stopping" : cancelled ? "cancelled" : failed ? "failed" : succeeded ? "succeeded" : working || busy ? "running" : preparing ? "queued" : "idle";
  const liveStateLabel = stopping ? "正在停止" : cancelled ? "已停止" : failed ? "未完成" : succeeded ? "可试玩" : working || busy ? "制作中" : preparing ? "准备中" : "等待";
  const placeholderTitle = stopping ? "正在停止制作" : cancelled ? "本轮制作已停止" : failed ? "本次制作未完成" : working ? "游戏正在这里成形" : preparing || busy ? "正在准备制作" : loaded ? "等待制作任务" : "正在恢复制作记录";
  const placeholderDetail = stopping ? "正在等待服务端确认，不会再接收这轮制作的进度。" : cancelled ? "已停止后续制作；已有成果和上一个成功版本仍可查看。" : failed ? "已有项目记录保留，右侧会说明停下的位置、原因和下一步。" : working ? (step?.detail ?? "服务端正在处理，关闭页面也不会取消任务。") : preparing ? (job?.events?.at(-1)?.title ?? "服务端已接收，等待开始处理") : "制作完成后，游戏会直接出现在这里。";
  return <main className="maker-workbench production-workbench" id="main-content" tabIndex={-1} aria-busy={busy || working}>
    <div className="workbench-body">
      <section className="workbench-preview" aria-label="游戏预览">
        <header className="workbench-preview-toolbar">
          <div className="device-switch" aria-label="预览画幅"><span className="designed-aspect">设计画幅 {aspectRatio} · {device === "mobile" ? "手机" : "桌面"}</span></div>
          <div className="preview-toolbar-actions">
            <span className={`preview-runtime-status status-${build?.status ?? "idle"}`}><i /> {working || busy || preparing ? "BUILDING" : succeeded && previewUrl ? "PLAYABLE" : "WAITING"}</span>
          </div>
        </header>
        <div className="preview-stage" data-device={device} data-aspect={aspectRatio} style={previewStyle}>
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
            {succeeded && <p>制作已完成，可以直接试玩，结果已保存到“我的项目”。本页不会自动发布或再次制作。</p>}
            {working && <p>{step?.detail ?? "服务端正在处理，关闭页面也不会取消任务。"}</p>}
            {working && <p>制作在服务端继续，关闭或刷新页面不会取消任务，也不会重复提交。</p>}
            {stopping && <p role="status">正在等待服务端确认停止。</p>}
            {cancelled && <p role="status">已停止后续制作；已发出的远程请求已尝试中止，但服务商可能已开始计费。</p>}
            {loaded && !job && !build && !busy && !readError && <p>已确认项目存在，正在查询是否收到制作任务。这里只查询状态，不会自动重新提交付费制作。</p>}
          </section>
          {succeeded && <nav className="completed-game-actions" aria-label="完成后的操作"><a href={`/projects/${encodeURIComponent(workspaceProjectId)}`}>继续完善这个游戏</a><a href="/projects">查看我的游戏</a></nav>}
          {(busy || working || !loaded) && !error && !readError && job?.status !== "failed" && <WaitingActivity startedAt={build?.startedAt ?? job?.events?.[0]?.createdAt} label={working ? "步骤正在推进，右侧与左侧会同步更新。" : "正在等待服务端响应，请稍候。"} />}
          {job?.status === "failed" && <><FailureDetails error={job.failureDetails?.length ? job.error : undefined} details={job.failureDetails} fallback="这份历史制作记录没有保存详细原因。请查看下方当前步骤或重新分析修改需求。" /><p>此错误已保存，不会自动重新提交付费制作。</p>
            {!build && canRetryFailure ? <div className="review-actions"><button type="button" className="primary-action" disabled={retrying} onClick={retry}>{retrying ? "正在重新提交…" : "手动重新制作"}</button><p>这会创建一轮新的制作并使用模型用量。</p>{Boolean(retryError) && <FailureDetails error={retryError} fallback="重新提交没有被服务端确认，原记录保持不变。" />}</div> : null}</>}
          {Boolean(error) && <><FailureDetails error={error} fallback="制作请求没有被确认。当前没有自动重试或新的付费制作。" /><p>不会自动重试付费制作。</p></>}
          {Boolean(readError) && <FailureDetails error={readError} fallback="无法读取制作记录；正在尝试恢复连接，不会重新提交制作。" />}
          {Boolean(stopError) && <FailureDetails error={stopError} fallback="停止请求没有被服务端确认。可在确认服务连接后手动重试停止。" />}
          {build?.status === "failed" && <FailureDetails error={build.failureDetails?.length ? build.error : undefined} details={build.failureDetails} fallback="这份历史构建记录没有保存详细原因。请查看失败步骤后再决定是否新开一轮。" />}
          {build?.status === "failed" && canRetryFailure ? <div className="production-retry">
            <button type="button" className="primary-action" disabled={rebuilding} onClick={rebuild}>{rebuilding ? "正在重新开始…" : "手动重新制作"}</button>
            <p>这会新开一轮制作。平台不会自动重试；请先按上面的下一步处理不可重试的问题。</p>
            {Boolean(rebuildError) && <FailureDetails error={rebuildError} fallback="重新制作没有被服务端确认，原记录保持不变。" />}
            <a href={`/projects/${encodeURIComponent(workspaceProjectId)}`}>查看已保存的项目与问题</a>
          </div> : null}
          {!!job?.events?.length && !build && <section className="production-lane" aria-label="项目准备过程">
            <header className="production-lane-heading"><h3>准备阶段</h3><output>{job.status === "failed" ? "已中断" : "进行中"}</output></header>
            <ol className="production-prep-events">{job.events.map((event, index) => <li key={index}><strong>{event.title}</strong><span>{index < job.events!.length - 1 || job.status === "building" ? "已进入下一阶段" : job.status === "failed" ? "此处中断" : "进行中"}</span></li>)}</ol>
          </section>}
          {build && <section className="production-lane" aria-label="制作步骤">
            <header className="production-lane-heading"><h3>制作步骤</h3><output>{finishedSteps}/{totalSteps}</output></header>
            <BuildStageList steps={build.steps} showExcerpt={false} />
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
