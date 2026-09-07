import { useEffect, useRef, useState } from "react";
import type { StudioDraft } from "../domain/types";
import type { Build, GameDesignProfile, ProjectInput } from "../shared/contracts";
import { DOMAIN_TEMPLATE_ART } from "../domain/templateResolution";
import { gameTemplateSchema } from "../shared/contracts";
import { submitProduction, getProductionJob, watchProductionJob, getProject, getLatestBuild, type ProductionJob } from "../web/api";
import { WaitingActivity } from "./WaitingActivity";

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
function playableFrameUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, location.href);
    return ["http:", "https:"].includes(url.protocol) && url.origin !== location.origin ? url.href : null;
  } catch { return null; }
}

function ProductionError({ message }: { message: string }) {
  const technical = /"(?:code|path|origin)"|stack trace|TypeError|expected string/i.test(message);
  return <div><p role="alert">{technical ? "制作资料未通过检查，本次任务已停止。原记录已保留，不会自动重新提交或再次收费。" : message}</p>{technical && <details><summary>查看问题详情</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message}</pre></details>}</div>;
}

export function AutomaticProduction({ draft, confirmedPlan, confirmedDesignProfile, originalIdea }: { draft: StudioDraft; confirmedPlan?: string; confirmedDesignProfile?: GameDesignProfile; originalIdea?: string }) {
  const [projectId, setProjectId] = useState(() => new URLSearchParams(location.search).get("production") ?? getPendingProductionId());
  const [build, setBuild] = useState<Build | null>(null);
  const [job, setJob] = useState<ProductionJob | null>(null);
  const [error, setError] = useState("");
  const [readError, setReadError] = useState("");
  const [busy, setBusy] = useState(!projectId);
  const [loaded, setLoaded] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const draftRef = useRef(draft);
  const creating = useRef(false);
  const preparing = job?.status === "queued" || job?.status === "creating";
  const working = preparing || build?.status === "queued" || build?.status === "running";
  useEffect(() => {
    if (projectId) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      if (creating.current) return;
      if (!confirmedPlan) {
        setBusy(false); setError("尚未确认实时生成的方案，请返回创作页生成并确认方案。"); return;
      }
      creating.current = true;
      let savedProjectId: string | null = null;
      try {
        const value = draftRef.current;
        const template = gameTemplateSchema.safeParse(value.creationMode === "template-remix" ? DOMAIN_TEMPLATE_ART[value.templateId ?? ""] : undefined);
        const input: ProjectInput = { idea: originalIdea ?? confirmedPlan, template: template.success ? template.data : "auto", ...(confirmedDesignProfile ? { confirmedDesignProfile } : {}) };
        const id = productionReceipt(input);
        localStorage.setItem(PENDING_KEY, id);
        const previous = await getProductionJob(id);
        const accepted = previous ?? await submitProduction({ ...input, requestId: id });
        savedProjectId = accepted.id;
        // This address identifies a persisted server task, even before project creation.
        const url = new URL(location.href); url.searchParams.set("production", accepted.id);
        history.replaceState(null, "", url);
        localStorage.removeItem(PENDING_KEY);
        if (active) { setJob(accepted); setProjectId(accepted.id); setRefresh(n => n + 1); }
      } catch (reason) {
        if (active) {
          if (savedProjectId) setProjectId(savedProjectId);
          setError(reason instanceof Error ? reason.message : "项目创建未完成，未开始制作。");
        }
      } finally { if (active) setBusy(false); }
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [projectId]);
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    const abort = new AbortController();
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
        if (active) { setReadError(reason instanceof Error ? reason.message : "读取制作记录失败。"); timer = window.setTimeout(read, 5000); }
      }
    };
    void read();
    return () => { active = false; window.clearTimeout(timer); abort.abort(); };
  }, [projectId, refresh]);
  const step = build?.steps.find(item => item.status === "running");
  const previewUrl = playableFrameUrl(build?.previewUrl);
  const label = error || job?.status === "failed" ? "本次制作未能开始" : readError ? "无法恢复制作记录" : busy ? "正在提交制作任务" : preparing ? (job?.events?.at(-1)?.title ?? "服务端已接收，等待开始处理") : working ? step?.title ?? "正在排队制作" : build?.status === "succeeded" ? "游戏制作已完成" : build?.status === "failed" ? "本次制作未完成" : loaded ? "项目已保存，尚未收到制作任务" : "正在恢复制作记录";
  return <main className={`review-screen production-status-page${build?.status === "succeeded" ? " production-complete" : ""}`} id="main-content" tabIndex={-1}>
    <header className="review-heading"><div><span className="eyebrow">{build?.status === "succeeded" ? "你的游戏" : "游戏制作"}</span><h1>{build?.status === "succeeded" ? "做好了，开始玩吧。" : "把想法做出来。"}</h1>{build?.status !== "succeeded" && <p>图片、组装与检查由平台处理，无需操作。刷新页面不会重新提交制作。</p>}</div></header>
    <section className="review-main" aria-label="自动制作进度" aria-busy={busy || working}>
      <h2 role="status">{label}</h2>
      {build?.status === "succeeded" && <><p>制作已完成，可以直接试玩，结果已保存到“我的项目”。本页不会自动发布或再次制作。</p>
        {previewUrl && <iframe className="production-playable-frame" title="游戏试玩" src={previewUrl} sandbox="allow-scripts allow-same-origin" allow="autoplay; fullscreen" />}
        <nav className="completed-game-actions" aria-label="完成后的操作"><a href={`/projects/${encodeURIComponent(build.projectId ?? projectId ?? "")}`}>继续完善这个游戏</a><a href="/projects">查看我的游戏</a></nav>
      </>}
      {(busy || working || !loaded) && !error && !readError && job?.status !== "failed" && <WaitingActivity startedAt={build?.startedAt ?? job?.events?.[0]?.createdAt} label={working ? step?.detail ?? job?.events?.at(-1)?.title ?? "服务端正在处理，关闭页面也不会取消任务。" : "正在等待服务端响应，请稍候。"} />}
      {working && <p>制作在服务端继续，关闭或刷新页面不会取消任务，也不会重复提交。</p>}
      {loaded && !job && !build && !busy && !readError && <p>已确认项目存在，正在查询是否收到制作任务。这里只查询状态，不会自动重新提交付费制作。</p>}
      {job?.status === "failed" && <><ProductionError message={job.error ?? "制作未能开始"} /><p>此错误已保存，不会自动重新提交付费制作。</p></>}
      {error && <><ProductionError message={error} /><p>不会自动重试付费制作。</p></>}
      {readError && <p role="alert">{readError} 正在尝试恢复连接，不会重新提交制作。</p>}
      {build?.error && <ProductionError message={build.error} />}
      <details open={build?.status !== "succeeded"}><summary>制作记录</summary>
      {!!job?.events?.length && <ol aria-label="项目准备过程">{job.events.map((event, index) => <li key={index}><strong>{event.title}</strong><span> · {index < job.events!.length - 1 || job.status === "building" ? "已进入下一阶段" : job.status === "failed" ? "此处中断" : "进行中"}</span></li>)}</ol>}
      <ol aria-label="制作步骤">{build?.steps.map(item => <li key={item.id}><strong>{item.title}</strong><span> · {{ pending: "等待中", running: "进行中", succeeded: "已完成", failed: "未完成" }[item.status]}</span><p>{item.detail}</p></li>)}</ol>
      </details>
      {build?.status === "failed" && <><p>本次制作已停止，已有项目记录保留。不会自动重试或启动新的付费请求。</p><a href={`/projects/${encodeURIComponent(build.projectId ?? projectId ?? "")}`}>查看已保存的项目与问题</a><p>此入口只查看记录，不会重新制作或收费。</p></>}
    </section>
  </main>;
}
