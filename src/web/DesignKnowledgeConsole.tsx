import { useEffect, useMemo, useState } from "react";
import { Activity, BookOpen, Check, ChevronRight, ClipboardCheck, Download, ExternalLink, GitCommitVertical, Library, LoaderCircle, Plus, Radar, RotateCcw, Search, ShieldCheck, TrendingUp, Upload } from "lucide-react";
import type { ProjectSummary } from "../shared/contracts";
import { evaluateResearchPrototype } from "../shared/game-design-knowledge/research-evaluation";
import type { GameplayRadarView, GameplaySignal } from "../shared/game-design-knowledge/gameplay-radar";
import type { DesignKnowledgeChangeSet, DesignKnowledgeDecisionInput, DesignKnowledgeInsightSummary, DesignKnowledgeInsights, DesignKnowledgeRelease, DesignPlaytestInput, DesignResearchBrowserRunInput, DesignResearchCandidateInput, DesignResearchDecisionInput, DesignResearchPlaytestInput, DesignResearchProbeRunInput, DesignResearchResourceReviewInput, DesignResearchResourceSecurityReviewInput, DesignResearchResourceSubmissionInput, DesignResearchSourceInput, DesignResearchSynthesisInput, GameResearchTask } from "../server/design-knowledge-evidence";
import {
  addDesignResearchSource,
  addGameplayRadarSignal,
  attachDesignResearchCandidate,
  captureDesignKnowledgeReview,
  createDesignKnowledgeChangeSet,
  createDesignResearchChangeSet,
  createDesignResearchEvaluation,
  createDesignResearchResourceAcquisitionTask,
  createDesignResearchTask,
  decideDesignResearchTask,
  exportDesignKnowledgeChangeSet,
  getDesignKnowledgeChangeSets,
  getDesignKnowledgeInsights,
  getMechanicAtlas,
  getDesignKnowledgeReleases,
  getDesignKnowledgeReviews,
  getDesignResearchTasks,
  getGameplayRadar,
  getDesignPlaytests,
  getProjects,
  intakeApprovedDesignResearchResources,
  publishDesignKnowledgeChangeSet,
  promoteDesignResearchResourceFamilies,
  recordDesignKnowledgeDecision,
  recordDesignPlaytest,
  recordDesignResearchBrowserRun,
  recordDesignResearchPlaytest,
  recordDesignResearchProbeRun,
  reviewDesignResearchResourceWork,
  reviewDesignResearchResourceIntake,
  rollbackDesignKnowledgeRelease,
  startGameplayRadarResearch,
  runDesignResearchEvaluation,
  submitDesignResearchResourceWork,
  reviewDesignKnowledgeChangeSet,
  submitDesignResearchSynthesis,
  type DesignKnowledgeReviewSnapshot,
  type MechanicAtlasResponse,
} from "./api";
import { SiteHeader } from "./SiteHeader";

type ConsoleData = {
  reviews: DesignKnowledgeReviewSnapshot[];
  playtests: Awaited<ReturnType<typeof getDesignPlaytests>>;
  changeSets: Awaited<ReturnType<typeof getDesignKnowledgeChangeSets>>;
  releases: Awaited<ReturnType<typeof getDesignKnowledgeReleases>>;
  insights: DesignKnowledgeInsights;
  projects: ProjectSummary[];
  researchTasks: GameResearchTask[];
  radar: GameplayRadarView[];
  atlas: MechanicAtlasResponse;
};

const EMPTY_INSIGHTS: DesignKnowledgeInsights = { generatedAt: "", trends: [], playtests: [] };
const EMPTY_ATLAS: MechanicAtlasResponse = { summary: { schemaVersion: "mechanic-atlas-summary-v2", total: 0, modifiers: 0, combinationCapacity: 0, byFamily: {}, byModifierCategory: {}, boundary: "机制卡独立计数，组合配方不计入机制数量。" }, localSources: { schemaVersion: "local-design-source-summary-v1", indexed: 0, bytes: 0, byRole: {}, sourceRootHint: "", policy: "仅保存摘要。" }, result: { schemaVersion: "mechanic-atlas-search-v1", total: 0, matched: 0, offset: 0, limit: 12, entries: [], officialPromotionRequired: true } };
const EMPTY_DATA: ConsoleData = { reviews: [], playtests: [], changeSets: [], releases: [], insights: EMPTY_INSIGHTS, projects: [], researchTasks: [], radar: [], atlas: EMPTY_ATLAS };
const recommendationLabels = {
  "insufficient-evidence": "证据不足",
  retain: "保持当前等级",
  "promotion-review": "建议晋级复核",
  "manual-review": "需要人工判断",
  "demotion-review": "建议降级复核",
} as const;
const outcomeLabels = { retain: "保持", promote: "晋级", demote: "降级", retest: "补充测试" } as const;
const statusLabels = { pending: "待审核", approved: "可发布", rejected: "已拒绝", published: "已发布" } as const;
const evidenceOptions: Array<{ id: DesignKnowledgeDecisionInput["evidence"][number]; label: string }> = [
  { id: "telemetry", label: "匿名运行数据" },
  { id: "playtest", label: "真人试玩" },
  { id: "contract", label: "设计合同" },
  { id: "solver", label: "规则/求解验证" },
  { id: "browser", label: "真实浏览器" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

const radarFreshnessLabels = { fresh: "新鲜", aging: "即将复核", stale: "需要更新" } as const;

function GameplayRadarForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (input: GameplaySignal) => Promise<void> }) {
  const today = new Date().toISOString().slice(0, 10);
  return <form className="decision-form radar-signal-form" role="dialog" aria-modal="true" aria-label="登记玩法信号" onKeyDown={(event) => { if (event.key === "Escape") onCancel(); }} onSubmit={(event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const list = (name: string) => String(form.get(name) ?? "").split(/[，,]/).map((item) => item.trim()).filter(Boolean);
    void onSave({
      gameTitle: String(form.get("gameTitle")), sourceTitle: String(form.get("sourceTitle")), sourceUrl: String(form.get("sourceUrl")),
      sourceType: String(form.get("sourceType")) as GameplaySignal["sourceType"], platform: String(form.get("platform")) as GameplaySignal["platform"],
      observedAt: String(form.get("observedAt")), publishedAt: String(form.get("publishedAt") || "") || null,
      signalSummary: String(form.get("signalSummary")), playerVerbs: list("playerVerbs"), mechanicTags: list("mechanicTags"),
    });
  }}>
    <header><span>市场观察，不是采用结论</span><h2>登记玩法信号</h2></header>
    <label><span>游戏名称</span><input name="gameTitle" autoFocus required /></label>
    <div className="research-field-pair"><label><span>来源标题</span><input name="sourceTitle" required /></label><label><span>来源网址</span><input name="sourceUrl" type="url" required /></label></div>
    <div className="research-field-pair"><label><span>来源类型</span><select name="sourceType" defaultValue="editorial-list"><option value="editorial-list">编辑榜单</option><option value="annual-award">年度奖项</option><option value="store-ranking">商店排名</option><option value="developer-update">开发者更新</option><option value="community-ranking">社区排名</option></select></label><label><span>平台</span><select name="platform" defaultValue="cross-platform"><option value="cross-platform">跨平台</option><option value="web">网页</option><option value="mobile">手机</option><option value="desktop">桌面</option></select></label></div>
    <div className="research-field-pair"><label><span>观察日期</span><input name="observedAt" type="date" defaultValue={today} required /></label><label><span>发布日期（可选）</span><input name="publishedAt" type="date" /></label></div>
    <label><span>可核验的热度/评选事实</span><textarea name="signalSummary" required /></label>
    <div className="research-field-pair"><label><span>玩家动作（逗号分隔）</span><input name="playerVerbs" placeholder="观察，推理，翻译" required /></label><label><span>机制标签（逗号分隔）</span><input name="mechanicTags" placeholder="puzzle，deduction" required /></label></div>
    <footer><button type="button" onClick={onCancel}>取消</button><button className="knowledge-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15}/> : <Plus size={15}/>}保存信号</button></footer>
  </form>;
}

function GameplayRadar({ clusters, busy, onAdd, onResearch }: { clusters: GameplayRadarView[]; busy: boolean; onAdd: () => void; onResearch: (cluster: GameplayRadarView) => void }) {
  return <section className="gameplay-radar" aria-labelledby="radar-title">
    <header><div><span><Radar size={14}/> 玩法雷达</span><h2 id="radar-title">先发现变化，再决定是否研究</h2><p>跨榜同名项目自动合并；过期信号会提醒复核。这里的任何内容都不会直接进入正式玩法库。</p></div><button onClick={onAdd}><Plus size={15}/>登记信号</button></header>
    {!clusters.length ? <p className="knowledge-empty">暂无市场信号。登记官方榜单、开发者更新或社区排名后，系统会归并并检查近邻。</p> : <div className="radar-cluster-list">{clusters.map((cluster) => <article key={cluster.id} className={`radar-cluster is-${cluster.freshness}`}>
      <header><div><span className="radar-freshness">{radarFreshnessLabels[cluster.freshness]}</span><h3>{cluster.gameTitle}</h3></div><strong>{cluster.signals.length}<small>条信号</small></strong></header>
      <div className="radar-meta"><span>{cluster.distinctSourceCount} 个独立站点</span><span>有效至 {cluster.refreshAfter}</span><span>{cluster.researchTaskIds.length ? `已关联 ${cluster.researchTaskIds.length} 次研究` : "尚未研究"}</span></div>
      <p className="radar-match"><b>{cluster.match.kind === "research-task" ? "合并建议" : cluster.match.kind === "knowledge-pattern" ? "已知近邻" : "独立研究"}</b><span>{cluster.match.label}</span><small>{cluster.match.reason}</small></p>
      <ul>{cluster.signals.slice(0, 2).map((signal) => <li key={signal.sourceUrl}><a href={signal.sourceUrl} target="_blank" rel="noreferrer">{signal.sourceTitle}<ExternalLink size={11}/></a><span>{signal.signalSummary}</span></li>)}</ul>
      <footer><button className="knowledge-primary" disabled={busy} onClick={() => onResearch(cluster)}>{cluster.freshness === "stale" ? "重新研究" : cluster.match.kind === "research-task" ? "合并到现有研究" : cluster.researchTaskIds.length ? "继续研究" : "进入研究"}<ChevronRight size={14}/></button></footer>
    </article>)}</div>}
  </section>;
}

const atlasFamilyLabels: Record<string, string> = { movement: "移动", spatial: "空间", matching: "匹配", economy: "经济", combat: "战斗", collection: "收集", construction: "建造", information: "信息", timing: "时机", "social-simulation": "社会模拟", progression: "成长", "risk-reward": "风险回报", physics: "物理", stealth: "潜行", narrative: "叙事", simulation: "模拟", strategy: "策略", survival: "生存", multiplayer: "多人", creation: "创作" };
function MechanicAtlasExplorer({ initial }: { initial: MechanicAtlasResponse }) {
  const [result, setResult] = useState(initial); const [query, setQuery] = useState(""); const [family, setFamily] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  useEffect(() => setResult(initial), [initial]);
  const search = async (offset = 0) => { setLoading(true); setError(""); try { setResult(await getMechanicAtlas({ query, family, offset, limit: 12 })); } catch (caught) { setError(readableError(caught)); } finally { setLoading(false); } };
  return <section className="mechanic-atlas" aria-labelledby="mechanic-atlas-title">
    <header><div><span><BookOpen size={14}/> 独立机制库</span><h2 id="mechanic-atlas-title">{result.summary.total.toLocaleString("zh-CN")} 张独立机制卡</h2><p>每张卡只表示一个玩家动作、状态变化和可观察结果。设计修饰器与组合配方分开保存，不计入机制数量。</p></div><strong>{result.summary.total}<small>独立机制</small><i>+</i>{result.summary.modifiers}<small>设计修饰器</small></strong></header>
    <form onSubmit={(event) => { event.preventDefault(); void search(0); }}><label><span>搜索</span><input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="例如：旋转、侦察、立即重试" /></label><label><span>机制领域</span><select value={family} onChange={(event) => setFamily(event.currentTarget.value)}><option value="">全部领域</option>{Object.entries(atlasFamilyLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><button className="knowledge-primary" disabled={loading}>{loading ? <LoaderCircle className="spin" size={15}/> : <Search size={15}/>}检索</button></form>
    {error && <p role="alert" className="knowledge-message is-error">{error}</p>}
    <div className="atlas-reading"><span>找到 <b>{result.result.matched}</b> 张 · 已索引本地资料 <b>{result.localSources.indexed}</b> 份</span><small>{result.summary.boundary}</small></div>
    <div className="atlas-card-list">{result.result.entries.map((entry) => <article key={entry.id}><header><span>{atlasFamilyLabels[entry.family]}</span><small>独立机制</small></header><h3>{entry.label}</h3><p>{entry.playerVerb}</p><dl><dt>状态变化</dt><dd>{entry.state} → {entry.outcome}</dd><dt>制作规则</dt><dd>{entry.productionRule}</dd><dt>验收信号</dt><dd>{entry.acceptanceSignals.join(" · ")}</dd></dl><footer>参考候选 · 需要原型验证</footer></article>)}</div>
    <footer className="atlas-pagination"><button disabled={loading || result.result.offset === 0} onClick={() => void search(Math.max(0, result.result.offset - result.result.limit))}>上一页</button><span>{result.result.matched ? `${result.result.offset + 1}–${Math.min(result.result.offset + result.result.entries.length, result.result.matched)} / ${result.result.matched}` : "没有匹配结果"}</span><button disabled={loading || result.result.offset + result.result.entries.length >= result.result.matched} onClick={() => void search(result.result.offset + result.result.limit)}>下一页</button></footer>
  </section>;
}

const segmentLabels: Record<string, string> = {
  novice: "新手", casual: "休闲玩家", experienced: "熟练玩家", expert: "专家",
  desktop: "桌面", mobile: "手机", tablet: "平板",
  keyboard: "键盘", pointer: "鼠标/指针", touch: "触控", gamepad: "手柄",
};

function Sparkline({ points, color, label }: { points: number[]; color: string; label: string }) {
  const plotted = points.map((value, index) => `${points.length === 1 ? 50 : (index / (points.length - 1)) * 100},${40 - value * 36}`).join(" ");
  return <svg className="knowledge-sparkline" viewBox="0 0 100 44" role="img" aria-label={label} preserveAspectRatio="none"><line x1="0" y1="40" x2="100" y2="40" /><polyline points={plotted} style={{ stroke: color }} /></svg>;
}

function SummaryCell({ label, summary }: { label: string; summary: DesignKnowledgeInsightSummary }) {
  return <div className="insight-summary-cell"><strong>{label}</strong><span>{summary.sampleCount} 次 · 完成 {percent(summary.completionRate)}</span><span>重玩 {percent(summary.replayRate)} · 趣味 {summary.ratings.funRating.toFixed(1)}</span></div>;
}

function EvidenceInsights({ insights }: { insights: DesignKnowledgeInsights }) {
  const patternIds = [...new Set([...insights.trends.map(({ patternId }) => patternId), ...insights.playtests.map(({ patternId }) => patternId)])];
  const [selected, setSelected] = useState(patternIds[0] ?? "");
  useEffect(() => { if (!patternIds.includes(selected)) setSelected(patternIds[0] ?? ""); }, [patternIds, selected]);
  if (!patternIds.length) return null;
  const trend = insights.trends.find(({ patternId }) => patternId === selected);
  const breakdown = insights.playtests.find(({ patternId }) => patternId === selected);
  const latest = trend?.points.at(-1);
  const previous = trend?.points.at(-2);
  const delta = latest && previous ? latest.completionRate - previous.completionRate : null;
  return <section className="knowledge-insights" aria-labelledby="knowledge-insights-title">
    <header><div><span><TrendingUp size={14} /> 跨周期证据</span><h2 id="knowledge-insights-title">趋势与试玩细分</h2></div><label>查看玩法<select value={selected} onChange={(event) => setSelected(event.currentTarget.value)}>{patternIds.map((id) => <option value={id} key={id}>{insights.trends.find((item) => item.patternId === id)?.label ?? id}</option>)}</select></label></header>
    <div className="insight-track">
      <div className="trend-panel"><div className="trend-reading"><span>最新完成率</span><strong>{latest ? percent(latest.completionRate) : "—"}</strong><small>{delta === null ? "至少两个复核期后显示变化" : `${delta >= 0 ? "上升" : "下降"} ${Math.abs(Math.round(delta * 100))} 个百分点`}</small></div>{trend?.points.length ? <div className="trend-lines"><Sparkline points={trend.points.map(({ completionRate }) => completionRate)} color="#65c99f" label="各复核期完成率"/><Sparkline points={trend.points.map(({ exitRate }) => exitRate)} color="#ef805b" label="各复核期退出率"/><footer><span><i className="is-complete"/>完成率</span><span><i className="is-exit"/>退出率</span><b>{trend.points.length} 个复核期</b></footer></div> : <p className="knowledge-empty">生成复核快照后显示跨周期变化。</p>}</div>
      <div className="playtest-breakdown"><header><span>真人试玩切片</span><strong>{breakdown?.overall.sampleCount ?? 0} 次结构化记录</strong></header>{breakdown ? <><div className="overall-ratings"><span>教学 <b>{breakdown.overall.ratings.onboardingClarity.toFixed(1)}</b></span><span>操作 <b>{breakdown.overall.ratings.controlClarity.toFixed(1)}</b></span><span>趣味 <b>{breakdown.overall.ratings.funRating.toFixed(1)}</b></span><span>公平 <b>{breakdown.overall.ratings.fairnessRating.toFixed(1)}</b></span></div><div className="breakdown-groups"><section><h3>玩家经验</h3>{Object.entries(breakdown.byTesterSegment).map(([key, value]) => <SummaryCell key={key} label={segmentLabels[key] ?? key} summary={value}/>)}</section><section><h3>设备</h3>{Object.entries(breakdown.byDeviceClass).map(([key, value]) => <SummaryCell key={key} label={segmentLabels[key] ?? key} summary={value}/>)}</section><section><h3>输入方式</h3>{Object.entries(breakdown.byInputMode).map(([key, value]) => <SummaryCell key={key} label={segmentLabels[key] ?? key} summary={value}/>)}</section></div></> : <p className="knowledge-empty">记录真人试玩后显示细分对比。</p>}</div>
    </div>
  </section>;
}

function readableError(caught: unknown) {
  if (caught instanceof Error && caught.name === "ZodError") return "服务数据版本不一致，请刷新页面或重新启动本地服务。";
  return caught instanceof Error ? caught.message : "操作没有完成。";
}

function Rail({ data }: { data: ConsoleData }) {
  const nodes = [
    { icon: Activity, label: "真人试玩", value: data.playtests.length, ready: data.playtests.length > 0 },
    { icon: ClipboardCheck, label: "季度复核", value: data.reviews.length, ready: data.reviews.length > 0 },
    { icon: GitCommitVertical, label: "版本变更", value: data.changeSets.length, ready: data.changeSets.some(({ status }) => status !== "rejected") },
    { icon: Library, label: "知识发布", value: data.releases.length, ready: data.releases.length > 0 },
  ];
  return (
    <ol className="knowledge-rail" aria-label="知识更新流程">
      {nodes.map(({ icon: Icon, label, value, ready }, index) => (
        <li className={ready ? "is-ready" : ""} key={label}>
          <span className="rail-node"><Icon size={17} aria-hidden="true" /></span>
          <span><small>阶段 {index + 1}</small><strong>{label}</strong></span>
          <b>{value}</b>
        </li>
      ))}
    </ol>
  );
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="knowledge-rating">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(Number(event.currentTarget.value))}>
        <option value={1}>1 · 很差</option><option value={2}>2 · 较差</option><option value={3}>3 · 一般</option><option value={4}>4 · 良好</option><option value={5}>5 · 很好</option>
      </select>
    </label>
  );
}

function PlaytestForm({ projects, busy, onSave }: { projects: ProjectSummary[]; busy: boolean; onSave: (input: DesignPlaytestInput) => Promise<void> }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const project = projects.find(({ id }) => id === projectId) ?? projects[0];
  const [outcome, setOutcome] = useState<DesignPlaytestInput["taskOutcome"]>("completed");
  const [ratings, setRatings] = useState({ onboardingClarity: 3, controlClarity: 3, perceivedDifficulty: 3, funRating: 3, fairnessRating: 3 });
  const [blockerCode, setBlockerCode] = useState<DesignPlaytestInput["blockerCode"]>("none");
  const [wouldReplay, setWouldReplay] = useState(true);
  useEffect(() => { if (!projectId && projects[0]) setProjectId(projects[0].id); }, [projectId, projects]);
  useEffect(() => { setBlockerCode(outcome === "completed" ? "none" : "onboarding"); }, [outcome]);
  if (!project) return <p className="knowledge-empty">先创建一个游戏，才能记录真人试玩。</p>;
  return (
    <form className="playtest-form" onSubmit={(event) => {
      event.preventDefault();
      void onSave({
        projectId: project.id, versionId: project.version.id, testerSegment: "novice", deviceClass: "desktop", inputMode: "pointer",
        taskOutcome: outcome, ...ratings, wouldReplay, completionSeconds: null, hintCount: 0, blockerCode,
      });
    }}>
      <label className="knowledge-field"><span>试玩哪个游戏</span><select value={project.id} onChange={(event) => setProjectId(event.currentTarget.value)}>{projects.map((item) => <option value={item.id} key={item.id}>{item.title} · v{item.version.number}</option>)}</select></label>
      <label className="knowledge-field"><span>首次任务结果</span><select value={outcome} onChange={(event) => setOutcome(event.currentTarget.value as typeof outcome)}><option value="completed">独立完成</option><option value="partial">部分完成</option><option value="blocked">遇到阻塞</option><option value="abandoned">主动退出</option></select></label>
      <div className="rating-grid">
        <Rating label="教学清晰" value={ratings.onboardingClarity} onChange={(value) => setRatings((state) => ({ ...state, onboardingClarity: value }))} />
        <Rating label="操作清晰" value={ratings.controlClarity} onChange={(value) => setRatings((state) => ({ ...state, controlClarity: value }))} />
        <Rating label="难度感受" value={ratings.perceivedDifficulty} onChange={(value) => setRatings((state) => ({ ...state, perceivedDifficulty: value }))} />
        <Rating label="趣味" value={ratings.funRating} onChange={(value) => setRatings((state) => ({ ...state, funRating: value }))} />
        <Rating label="公平性" value={ratings.fairnessRating} onChange={(value) => setRatings((state) => ({ ...state, fairnessRating: value }))} />
      </div>
      {outcome !== "completed" && <label className="knowledge-field"><span>主要卡点</span><select value={blockerCode} onChange={(event) => setBlockerCode(event.currentTarget.value as typeof blockerCode)}><option value="onboarding">没看懂教学</option><option value="controls">操作不清楚</option><option value="rules">规则不清楚</option><option value="difficulty">难度不合适</option><option value="resource">资源缺失</option><option value="performance">运行不流畅</option><option value="accessibility">可访问性问题</option></select></label>}
      <label className="replay-check"><input type="checkbox" checked={wouldReplay} onChange={(event) => setWouldReplay(event.currentTarget.checked)} /><span>愿意再玩一局</span></label>
      <button className="knowledge-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}保存试玩证据</button>
    </form>
  );
}

function DecisionForm({ target, busy, onCancel, onSave }: {
  target: { reviewId: string; patternId: string; label: string; recommendation: keyof typeof recommendationLabels };
  busy: boolean;
  onCancel: () => void;
  onSave: (input: DesignKnowledgeDecisionInput) => Promise<void>;
}) {
  const suggested = target.recommendation === "promotion-review" ? "promote" : target.recommendation === "demotion-review" ? "demote" : target.recommendation === "retain" ? "retain" : "retest";
  const [outcome, setOutcome] = useState<DesignKnowledgeDecisionInput["outcome"]>(suggested);
  const [rationale, setRationale] = useState("");
  const [evidence, setEvidence] = useState<DesignKnowledgeDecisionInput["evidence"]>(["telemetry", "playtest", "contract", "browser"]);
  return (
    <form className="decision-form" onSubmit={(event) => { event.preventDefault(); void onSave({ patternId: target.patternId, outcome, rationale, evidence }); }}>
      <header><span>人工决定</span><strong>{target.label}</strong></header>
      <label className="knowledge-field"><span>处理结果</span><select value={outcome} onChange={(event) => setOutcome(event.currentTarget.value as typeof outcome)}>{Object.entries(outcomeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <fieldset><legend>已经核对的证据</legend>{evidenceOptions.map((option) => <label key={option.id}><input type="checkbox" checked={evidence.includes(option.id)} onChange={(event) => setEvidence((items) => event.currentTarget.checked ? [...new Set([...items, option.id])] : items.filter((item) => item !== option.id))} /><span>{option.label}</span></label>)}</fieldset>
      <label className="knowledge-field"><span>判断理由</span><textarea rows={3} value={rationale} onChange={(event) => setRationale(event.currentTarget.value)} placeholder="说明为什么保持、晋级、降级或继续测试。" /></label>
      <footer><button type="button" onClick={onCancel}>取消</button><button className="knowledge-primary" type="submit" disabled={busy || rationale.trim().length < 8}>保存决定</button></footer>
    </form>
  );
}

type ResearchAction = { task: GameResearchTask; kind: "source" | "synthesis" | "candidate" | "probe" | "browser" | "prototype-playtest" | "decision" }
  | { task: GameResearchTask; kind: "resource-submit"; requirementId: string }
  | { task: GameResearchTask; kind: "resource-review"; requirementId: string; decision: "approve" | "return" }
  | { task: GameResearchTask; kind: "resource-intake-review" };
const splitTokens = (value: string) => value.split(/[\s,，]+/).map((item) => item.trim()).filter(Boolean);
const splitLines = (value: string) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);

function ResearchSourceForm({ task, busy, onCancel, onSave }: { task: GameResearchTask; busy: boolean; onCancel: () => void; onSave: (input: DesignResearchSourceInput) => Promise<void> }) {
  const [title, setTitle] = useState(""); const [url, setUrl] = useState(""); const [sourceType, setSourceType] = useState<DesignResearchSourceInput["sourceType"]>("official-product"); const [observation, setObservation] = useState("");
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="research-source-title" onSubmit={(event) => { event.preventDefault(); void onSave({ id: `source-${task.sources.length + 1}`, title, url, sourceType, observedAt: new Date().toISOString().slice(0, 10), gameplayObservations: [observation], onboardingObservations: [], progressionObservations: [], failureRecoveryObservations: [], doNotCopy: ["不复制名称、角色、美术、音频、文案、代码或具体关卡。"] }); }}>
    <header><span>研究证据护照</span><h2 id="research-source-title">登记外部来源</h2></header>
    <label className="knowledge-field"><span>来源标题</span><input value={title} onChange={(event) => setTitle(event.currentTarget.value)} placeholder="游戏规则、开发者说明或独立分析" /></label>
    <label className="knowledge-field"><span>来源网址</span><input type="url" value={url} onChange={(event) => setUrl(event.currentTarget.value)} placeholder="https://" /></label>
    <label className="knowledge-field"><span>来源性质</span><select value={sourceType} onChange={(event) => setSourceType(event.currentTarget.value as typeof sourceType)}><option value="official-product">官方产品页</option><option value="official-rules">官方规则</option><option value="developer-material">开发者材料</option><option value="store-listing">商店页面</option><option value="independent-analysis">独立分析</option><option value="player-evidence">玩家证据</option></select></label>
    <label className="knowledge-field"><span>可观察的玩法事实</span><textarea rows={4} value={observation} onChange={(event) => setObservation(event.currentTarget.value)} placeholder="只写玩家动作、状态变化和循环，不复制表现内容。" /></label>
    <footer><button type="button" onClick={onCancel}>取消</button><button className="knowledge-primary" disabled={busy || title.trim().length < 1 || observation.trim().length < 1 || !/^https?:\/\//.test(url)}>保存来源</button></footer>
  </form>;
}

function ResearchSynthesisForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (input: DesignResearchSynthesisInput) => Promise<void> }) {
  const [commonLoop, setCommonLoop] = useState(""); const [mechanics, setMechanics] = useState(""); const [relations, setRelations] = useState(""); const [verification, setVerification] = useState(""); const [risks, setRisks] = useState("");
  const ready = [commonLoop, mechanics, relations, verification, risks].every((value) => value.trim().length > 0);
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="research-synthesis-title" onSubmit={(event) => { event.preventDefault(); void onSave({ commonLoop, mechanicHypotheses: splitLines(mechanics), relationshipHypotheses: splitLines(relations), verificationPlan: splitLines(verification), rejectionRisks: splitLines(risks) }); }}>
    <header><span>研究证据护照</span><h2 id="research-synthesis-title">提炼共同玩法结构</h2></header>
    <label className="knowledge-field"><span>共同核心循环</span><textarea rows={2} value={commonLoop} onChange={(event) => setCommonLoop(event.currentTarget.value)} /></label>
    <label className="knowledge-field"><span>机制假设（每行一项）</span><textarea rows={3} value={mechanics} onChange={(event) => setMechanics(event.currentTarget.value)} /></label>
    <label className="knowledge-field"><span>机制关系（每行一项）</span><textarea rows={3} value={relations} onChange={(event) => setRelations(event.currentTarget.value)} /></label>
    <label className="knowledge-field"><span>验证计划（每行一项）</span><textarea rows={3} value={verification} onChange={(event) => setVerification(event.currentTarget.value)} /></label>
    <label className="knowledge-field"><span>拒绝风险（每行一项）</span><textarea rows={3} value={risks} onChange={(event) => setRisks(event.currentTarget.value)} /></label>
    <footer><button type="button" onClick={onCancel}>取消</button><button className="knowledge-primary" disabled={busy || !ready}>提交综合评审</button></footer>
  </form>;
}

function ResearchCandidateForm({ task, busy, onCancel, onSave }: { task: GameResearchTask; busy: boolean; onCancel: () => void; onSave: (input: DesignResearchCandidateInput) => Promise<void> }) {
  const [kind, setKind] = useState<DesignResearchCandidateInput["kind"]>("mechanic"); const [family, setFamily] = useState<"movement" | "spatial" | "matching" | "economy" | "combat" | "collection" | "construction" | "information" | "timing" | "social-simulation" | "progression" | "risk-reward">("information"); const [id, setId] = useState(""); const [label, setLabel] = useState(""); const [verb, setVerb] = useState(""); const [detail, setDetail] = useState(""); const [signals, setSignals] = useState(""); const [mechanics, setMechanics] = useState("");
  const save = () => {
    if (kind === "mechanic") return onSave({ kind, artifact: { id, label, family, playerVerb: verb, state: splitTokens(detail), inputs: ["choose"], outputs: ["state-changed"], capabilityIds: ["game-lifecycle", "onboarding", "failure-assistance"], relations: [], tunableDimensions: ["cognition", "combination"], probeSignals: splitTokens(signals) } });
    return onSave({ kind, artifact: { id, label, summary: detail, scope: { dimensions: ["2d"], sessionMinutes: [2, 10], inputs: ["pointer", "touch"] }, tags: splitTokens(signals), coreCapabilityIds: ["game-lifecycle", "onboarding", "difficulty-plan", "failure-assistance"], coreMechanicIds: splitTokens(mechanics), optionalMechanicIds: [], compositionRules: task.synthesis?.relationshipHypotheses ?? ["所有组合规则必须可复现。"], knownRisks: task.synthesis?.rejectionRisks ?? ["仍需运行原型验证。"], evidence: task.sources.slice(0, 2).map((source) => ({ sourceUrl: source.url, observedAt: source.observedAt, signal: "design-analysis" as const, note: source.gameplayObservations[0]! })), lifecycle: "candidate", evaluationVersion: 1 } });
  };
  const ready = id.trim().length > 1 && label.trim().length > 1 && detail.trim().length > 1 && signals.trim().length > 1 && (kind === "mechanic" ? verb.trim().length > 1 : mechanics.trim().length > 1);
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="research-candidate-title" onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <header><span>研究证据护照</span><h2 id="research-candidate-title">形成结构化候选</h2></header>
    <label className="knowledge-field"><span>候选类型</span><select value={kind} onChange={(event) => setKind(event.currentTarget.value as typeof kind)}><option value="mechanic">单一机制</option><option value="pattern">完整玩法模式</option></select></label>
    <div className="research-field-pair"><label className="knowledge-field"><span>稳定 ID</span><input value={id} onChange={(event) => setId(event.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="gravity-switch" /></label><label className="knowledge-field"><span>中文名称</span><input value={label} onChange={(event) => setLabel(event.currentTarget.value)} /></label></div>
    {kind === "mechanic" && <div className="research-field-pair"><label className="knowledge-field"><span>机制族</span><select value={family} onChange={(event) => setFamily(event.currentTarget.value as typeof family)}><option value="spatial">空间</option><option value="matching">匹配</option><option value="movement">移动</option><option value="economy">经济</option><option value="combat">战斗</option><option value="collection">收集</option><option value="construction">建造</option><option value="information">信息</option><option value="timing">时机</option><option value="progression">成长</option><option value="risk-reward">风险收益</option><option value="social-simulation">社会模拟</option></select></label><label className="knowledge-field"><span>玩家动词</span><input value={verb} onChange={(event) => setVerb(event.currentTarget.value)} placeholder="选择规则并观察状态变化" /></label></div>}
    <label className="knowledge-field"><span>{kind === "mechanic" ? "关键状态（逗号分隔）" : "玩法摘要"}</span><textarea rows={3} value={detail} onChange={(event) => setDetail(event.currentTarget.value)} /></label>
    <label className="knowledge-field"><span>{kind === "mechanic" ? "探针成功信号（逗号分隔）" : "玩法标签（逗号分隔）"}</span><input value={signals} onChange={(event) => setSignals(event.currentTarget.value)} /></label>
    {kind === "pattern" && <label className="knowledge-field"><span>复用机制 ID（逗号分隔）</span><input value={mechanics} onChange={(event) => setMechanics(event.currentTarget.value)} /></label>}
    <footer><button type="button" onClick={onCancel}>取消</button><button className="knowledge-primary" disabled={busy || !ready}>保存候选草案</button></footer>
  </form>;
}

function ResearchDecisionForm({ task, busy, onCancel, onSave }: { task: GameResearchTask; busy: boolean; onCancel: () => void; onSave: (input: DesignResearchDecisionInput) => Promise<void> }) {
  const accepted = task.candidateDraft?.kind === "pattern" ? "candidate-pattern" : "candidate-mechanic"; const ready = Boolean(task.evaluation && evaluateResearchPrototype(task.evaluation).ready); const [outcome, setOutcome] = useState<DesignResearchDecisionInput["outcome"]>(ready ? accepted : "no-adoption"); const [rationale, setRationale] = useState("");
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="research-decision-title" onSubmit={(event) => { event.preventDefault(); void onSave({ outcome, rationale }); }}><header><span>独立人工结论</span><h2 id="research-decision-title">决定是否进入候选库</h2></header>{!ready && <p className="evaluation-warning">运行证据尚未全部通过。当前只能停止研究，不能接受为候选。</p>}<label className="knowledge-field"><span>结论</span><select value={outcome} onChange={(event) => setOutcome(event.currentTarget.value as typeof outcome)}>{ready && <option value={accepted}>接受为{task.candidateDraft?.kind === "pattern" ? "候选玩法" : "候选机制"}</option>}<option value="no-adoption">不采用</option></select></label><label className="knowledge-field"><span>判断理由</span><textarea rows={4} value={rationale} onChange={(event) => setRationale(event.currentTarget.value)} /></label><footer><button type="button" onClick={onCancel}>取消</button><button className="knowledge-primary" disabled={busy || rationale.trim().length < 8}>保存人工结论</button></footer></form>;
}

function ResearchResourceSubmissionForm({ task, requirementId, busy, onCancel, onSave }: { task: GameResearchTask; requirementId: string; busy: boolean; onCancel: () => void; onSave: (input: DesignResearchResourceSubmissionInput) => Promise<void> }) {
  const item = task.evaluation!.resourceAcquisitionTask!.items.find((candidate) => candidate.requirementId === requirementId)!;
  const [note, setNote] = useState(""); const [artifact, setArtifact] = useState(""); const [generatedOutput, setGeneratedOutput] = useState(""); const [visual, setVisual] = useState(""); const [runtime, setRuntime] = useState(""); const [licenseRecord, setLicenseRecord] = useState(""); const [licenseId, setLicenseId] = useState(""); const [sourceUrl, setSourceUrl] = useState(""); const [obligations, setObligations] = useState("");
  const procedural = item.route === "procedural-generate"; const procure = item.route === "procure";
  const ready = note.trim().length >= 8 && artifact.trim() && (!procedural || generatedOutput.trim()) && visual.trim() && runtime.trim() && (!procure || (licenseRecord.trim() && licenseId.trim() && /^https?:\/\//.test(sourceUrl)));
  const save = () => onSave({ note, evidence: [{ kind: procedural ? "generator-config" : "resource-file", reference: artifact, note: procedural ? "生成配置已经归档" : "资源文件已经归档" }, ...(procedural ? [{ kind: "resource-file" as const, reference: generatedOutput, note: "实际生成产物已经归档" }] : []), ...(procure ? [{ kind: "license-record" as const, reference: licenseRecord, note: "许可记录已经独立归档" }] : []), { kind: "visual-review", reference: visual, note: "视觉复核结果已经归档" }, { kind: "runtime-report", reference: runtime, note: "运行时验收结果已经归档" }], verifiedLicense: procure ? { licenseId, sourceUrl, obligations: splitLines(obligations) } : undefined });
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="resource-submit-title" onSubmit={(event) => { event.preventDefault(); void save(); }}><header><span>资源成果护照</span><h2 id="resource-submit-title">{item.submissions.length ? "修正后重新提交" : "提交资源成果"}</h2><small>{item.title}</small></header><label className="knowledge-field"><span>{procedural ? "生成配置引用" : "资源文件引用"}</span><input value={artifact} onChange={(event) => setArtifact(event.currentTarget.value)} placeholder="_studio/evidence/resource.json" /></label>{procedural && <label className="knowledge-field"><span>实际生成产物引用</span><input value={generatedOutput} onChange={(event) => setGeneratedOutput(event.currentTarget.value)} placeholder="assets/generated/output.png" /></label>}{procure && <><label className="knowledge-field"><span>许可记录引用</span><input value={licenseRecord} onChange={(event) => setLicenseRecord(event.currentTarget.value)} placeholder="_studio/licenses/source.json" /></label><div className="research-field-pair"><label className="knowledge-field"><span>许可标识</span><input value={licenseId} onChange={(event) => setLicenseId(event.currentTarget.value)} placeholder="CC-BY-4.0" /></label><label className="knowledge-field"><span>官方来源</span><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.currentTarget.value)} placeholder="https://" /></label></div><label className="knowledge-field"><span>履行义务（每行一项）</span><textarea rows={2} value={obligations} onChange={(event) => setObligations(event.currentTarget.value)} /></label></>}<div className="research-field-pair"><label className="knowledge-field"><span>视觉复核引用</span><input value={visual} onChange={(event) => setVisual(event.currentTarget.value)} placeholder="_studio/reviews/visual.json" /></label><label className="knowledge-field"><span>运行报告引用</span><input value={runtime} onChange={(event) => setRuntime(event.currentTarget.value)} placeholder="_studio/reports/runtime.json" /></label></div><label className="knowledge-field"><span>本次成果说明</span><textarea rows={3} value={note} onChange={(event) => setNote(event.currentTarget.value)} placeholder="说明完成内容和本轮修正。" /></label><footer><button type="button" onClick={onCancel}>取消</button><button className="knowledge-primary" disabled={busy || !ready}>提交独立复核</button></footer></form>;
}

function ResearchResourceReviewForm({ task, requirementId, decision, busy, onCancel, onSave }: { task: GameResearchTask; requirementId: string; decision: "approve" | "return"; busy: boolean; onCancel: () => void; onSave: (input: DesignResearchResourceReviewInput) => Promise<void> }) {
  const item = task.evaluation!.resourceAcquisitionTask!.items.find((candidate) => candidate.requirementId === requirementId)!; const [rationale, setRationale] = useState("");
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="resource-review-title" onSubmit={(event) => { event.preventDefault(); void onSave({ decision, rationale }); }}><header><span>独立资源复核</span><h2 id="resource-review-title">{decision === "approve" ? "批准资源成果" : "退回资源成果"}</h2><small>{item.title} · 第 {item.submissions.length} 次提交</small></header><p className="resource-review-notice">{decision === "approve" ? "批准后该工作项才计入完成。" : "退回不会删除本次提交，修正后可以重新提交。"}</p><label className="knowledge-field"><span>复核理由</span><textarea rows={4} value={rationale} onChange={(event) => setRationale(event.currentTarget.value)} placeholder="记录证据核对结果和判断依据。" /></label><footer><button type="button" onClick={onCancel}>取消</button><button className="knowledge-primary" disabled={busy || rationale.trim().length < 8}>{decision === "approve" ? "确认批准" : "确认退回"}</button></footer></form>;
}

function ResearchResourceSecurityReviewForm({ task, busy, onCancel, onSave }: { task: GameResearchTask; busy: boolean; onCancel: () => void; onSave: (input: DesignResearchResourceSecurityReviewInput) => Promise<void> }) {
  const batch = task.evaluation!.resourceIntakeBatch!; const [reviewer, setReviewer] = useState(""); const [malware, setMalware] = useState(true); const [sensitiveContent, setSensitiveContent] = useState(true); const [rationale, setRationale] = useState("");
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="resource-security-title" onSubmit={(event) => { event.preventDefault(); void onSave({ reviewer, malware: malware ? "pass" : "fail", sensitiveContent: sensitiveContent ? "pass" : "fail", rationale }); }}><header><span>隔离区独立复核</span><h2 id="resource-security-title">确认真实文件安全状态</h2><small>{batch.summary.files} 个文件 · {batch.summary.bytes} 字节</small></header><label className="knowledge-field"><span>复核人或复核角色</span><input value={reviewer} onChange={(event) => setReviewer(event.currentTarget.value)} placeholder="安全复核员" /></label><fieldset><legend>逐文件检查结论</legend><label><input type="checkbox" checked={malware} onChange={(event) => setMalware(event.currentTarget.checked)} /><span>恶意内容检查通过</span></label><label><input type="checkbox" checked={sensitiveContent} onChange={(event) => setSensitiveContent(event.currentTarget.checked)} /><span>敏感内容检查通过</span></label></fieldset>{(!malware || !sensitiveContent) && <p className="evaluation-warning">任一检查失败都会拒绝整批，所有绑定继续保持未批准。</p>}<label className="knowledge-field"><span>安全复核依据</span><textarea rows={4} value={rationale} onChange={(event) => setRationale(event.currentTarget.value)} placeholder="记录扫描工具、人工检查范围和结论。" /></label><footer><button type="button" onClick={onCancel}>取消</button><button className="knowledge-primary" disabled={busy || reviewer.trim().length < 1 || rationale.trim().length < 8}>{malware && sensitiveContent ? "批准正式绑定" : "拒绝整批资源"}</button></footer></form>;
}

function ResearchProbeForm({ task, busy, onCancel, onSave }: { task: GameResearchTask; busy: boolean; onCancel: () => void; onSave: (input: DesignResearchProbeRunInput) => Promise<void> }) {
  const evaluation = task.evaluation!; const [signalId, setSignalId] = useState(evaluation.requiredProbeSignals[0] ?? ""); const [status, setStatus] = useState<DesignResearchProbeRunInput["status"]>("passed"); const [observation, setObservation] = useState("");
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="research-probe-title" onSubmit={(event) => { event.preventDefault(); void onSave({ signalId, status, observation }); }}><header><span>原型评估沙箱</span><h2 id="research-probe-title">记录规则探针</h2></header><label className="knowledge-field"><span>验证信号</span><select value={signalId} onChange={(event) => setSignalId(event.currentTarget.value)}>{evaluation.requiredProbeSignals.map((signal) => <option key={signal}>{signal}</option>)}</select></label><label className="knowledge-field"><span>运行结果</span><select value={status} onChange={(event) => setStatus(event.currentTarget.value as typeof status)}><option value="passed">通过：结果可复现</option><option value="failed">失败：规则或状态不一致</option></select></label><label className="knowledge-field"><span>观察记录</span><textarea rows={4} value={observation} onChange={(event) => setObservation(event.currentTarget.value)} placeholder="说明输入、预期状态和实际状态。" /></label><footer><button type="button" onClick={onCancel}>取消</button><button className="knowledge-primary" disabled={busy || observation.trim().length < 1}>保存探针结果</button></footer></form>;
}

function ResearchBrowserForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (input: DesignResearchBrowserRunInput) => Promise<void> }) {
  const [deviceClass, setDeviceClass] = useState<DesignResearchBrowserRunInput["deviceClass"]>("desktop"); const [url, setUrl] = useState(""); const [status, setStatus] = useState<DesignResearchBrowserRunInput["status"]>("passed"); const [interactionCompleted, setInteractionCompleted] = useState(true); const [consoleErrorCount, setConsoleErrorCount] = useState(0); const [accessibilityViolationCount, setAccessibilityViolationCount] = useState(0); const [observation, setObservation] = useState("");
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="research-browser-title" onSubmit={(event) => { event.preventDefault(); void onSave({ deviceClass, url, viewport: deviceClass === "desktop" ? "1280x800" : "390x844", status, interactionCompleted, consoleErrorCount, accessibilityViolationCount, observation }); }}><header><span>原型评估沙箱</span><h2 id="research-browser-title">登记真实浏览器运行</h2></header><div className="research-field-pair"><label className="knowledge-field"><span>设备</span><select value={deviceClass} onChange={(event) => setDeviceClass(event.currentTarget.value as typeof deviceClass)}><option value="desktop">桌面 1280 × 800</option><option value="mobile">手机 390 × 844</option></select></label><label className="knowledge-field"><span>结果</span><select value={status} onChange={(event) => setStatus(event.currentTarget.value as typeof status)}><option value="passed">通过</option><option value="failed">失败</option></select></label></div><label className="knowledge-field"><span>原型地址</span><input type="url" value={url} onChange={(event) => setUrl(event.currentTarget.value)} placeholder="https:// 或本地可访问地址" /></label><label className="replay-check"><input type="checkbox" checked={interactionCompleted} onChange={(event) => setInteractionCompleted(event.currentTarget.checked)} /><span>已在真实浏览器完成教学与一次核心循环</span></label><div className="research-field-pair"><label className="knowledge-field"><span>控制台错误数</span><input type="number" min="0" value={consoleErrorCount} onChange={(event) => setConsoleErrorCount(Number(event.currentTarget.value))} /></label><label className="knowledge-field"><span>无障碍违规数</span><input type="number" min="0" value={accessibilityViolationCount} onChange={(event) => setAccessibilityViolationCount(Number(event.currentTarget.value))} /></label></div><label className="knowledge-field"><span>观察记录</span><textarea rows={3} value={observation} onChange={(event) => setObservation(event.currentTarget.value)} /></label><footer><button type="button" onClick={onCancel}>取消</button><button className="knowledge-primary" disabled={busy || !/^https?:\/\//.test(url) || observation.trim().length < 1}>保存浏览器证据</button></footer></form>;
}

function ResearchPlaytestForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (input: DesignResearchPlaytestInput) => Promise<void> }) {
  const [testerSegment, setTesterSegment] = useState<DesignResearchPlaytestInput["testerSegment"]>("novice"); const [taskOutcome, setTaskOutcome] = useState<DesignResearchPlaytestInput["taskOutcome"]>("completed"); const [ratings, setRatings] = useState({ onboardingClarity: 3, controlClarity: 3, funRating: 3, fairnessRating: 3 }); const [wouldReplay, setWouldReplay] = useState(true); const [blockerCode, setBlockerCode] = useState<DesignResearchPlaytestInput["blockerCode"]>("none");
  useEffect(() => setBlockerCode(taskOutcome === "completed" ? "none" : "onboarding"), [taskOutcome]);
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="research-playtest-title" onSubmit={(event) => { event.preventDefault(); void onSave({ testerSegment, taskOutcome, ...ratings, wouldReplay, blockerCode }); }}><header><span>原型评估沙箱</span><h2 id="research-playtest-title">记录匿名原型试玩</h2></header><div className="research-field-pair"><label className="knowledge-field"><span>玩家经验</span><select value={testerSegment} onChange={(event) => setTesterSegment(event.currentTarget.value as typeof testerSegment)}><option value="novice">新手</option><option value="casual">休闲玩家</option><option value="experienced">熟练玩家</option></select></label><label className="knowledge-field"><span>首次任务结果</span><select value={taskOutcome} onChange={(event) => setTaskOutcome(event.currentTarget.value as typeof taskOutcome)}><option value="completed">独立完成</option><option value="partial">部分完成</option><option value="blocked">遇到阻塞</option><option value="abandoned">主动退出</option></select></label></div><div className="prototype-rating-grid"><Rating label="教学" value={ratings.onboardingClarity} onChange={(value) => setRatings((state) => ({ ...state, onboardingClarity: value }))}/><Rating label="操作" value={ratings.controlClarity} onChange={(value) => setRatings((state) => ({ ...state, controlClarity: value }))}/><Rating label="趣味" value={ratings.funRating} onChange={(value) => setRatings((state) => ({ ...state, funRating: value }))}/><Rating label="公平" value={ratings.fairnessRating} onChange={(value) => setRatings((state) => ({ ...state, fairnessRating: value }))}/></div>{taskOutcome !== "completed" && <label className="knowledge-field"><span>主要卡点</span><select value={blockerCode} onChange={(event) => setBlockerCode(event.currentTarget.value as typeof blockerCode)}><option value="onboarding">教学</option><option value="controls">操作</option><option value="rules">规则</option><option value="difficulty">难度</option><option value="resource">资源</option><option value="performance">性能</option><option value="accessibility">可访问性</option></select></label>}<label className="replay-check"><input type="checkbox" checked={wouldReplay} onChange={(event) => setWouldReplay(event.currentTarget.checked)} /><span>愿意再玩一次</span></label><footer><button type="button" onClick={onCancel}>取消</button><button className="knowledge-primary" disabled={busy}>保存试玩证据</button></footer></form>;
}

const acquisitionRouteLabel = { "reuse-existing": "已有可复用", "procedural-generate": "程序生成", procure: "需要采购", create: "需要创作" } as const;
const acquisitionTaskStateLabel = { "prototype-ready": "原型已准备", "awaiting-binding-approval": "待绑定批准", "awaiting-license-review": "待许可复核", "awaiting-asset-review": "待资产复核", "submitted-for-review": "待独立复核", approved: "已批准", returned: "已退回" } as const;
const resourceRoleLabel = { player: "角色", background: "背景", obstacle: "障碍", collectible: "收集物", effect: "机制表现", interface: "界面", audio: "音频", font: "字体", model: "模型" } as const;

function ResearchTaskCard({ task, hasChangeSet, busy, onAction, onCreateEvaluation, onCreateAcquisition, onIntakeResources, onPromoteResources, onRunEvaluation, onCreateChangeSet }: { task: GameResearchTask; hasChangeSet: boolean; busy: boolean; onAction: (action: ResearchAction) => void; onCreateEvaluation: (task: GameResearchTask) => void; onCreateAcquisition: (task: GameResearchTask) => void; onIntakeResources: (task: GameResearchTask) => void; onPromoteResources: (task: GameResearchTask) => void; onRunEvaluation: (task: GameResearchTask) => void; onCreateChangeSet: (task: GameResearchTask) => void }) {
  const stamps = [{ label: "来源", done: task.sources.length >= 3, value: `${task.sources.length}/3` }, { label: "拆解", done: Boolean(task.synthesis), value: task.synthesis ? "完成" : "待办" }, { label: "候选", done: Boolean(task.candidateDraft), value: task.candidateDraft?.kind === "pattern" ? "玩法" : task.candidateDraft ? "机制" : "待办" }, { label: "结论", done: Boolean(task.decision), value: task.status === "accepted" ? "接受" : task.status === "rejected" ? "拒绝" : "待办" }];
  const readiness = task.evaluation ? evaluateResearchPrototype(task.evaluation) : null;
  const latestProbes = new Map(task.evaluation?.probeRuns.filter(({ recordedBy }) => recordedBy === "automatic").map((run) => [run.signalId, run]));
  const latestBrowsers = new Map(task.evaluation?.browserRuns.filter(({ recordedBy }) => recordedBy === "automatic").map((run) => [run.deviceClass, run]));
  const prototypeUrl = [...latestBrowsers.values()].at(-1)?.url;
  const gates = task.evaluation ? [{ label: "合同", done: true, value: "已生成" }, { label: "资源范围", done: readiness!.resources, value: task.evaluation.resourceGapSummary ? `${task.evaluation.resourceGapSummary.total} 项` : "兼容" }, { label: "规则探针", done: readiness!.probes, value: `${[...latestProbes.values()].filter(({ status }) => status === "passed").length}/${task.evaluation.requiredProbeSignals.length}` }, { label: "双端运行", done: readiness!.browser, value: `${[...latestBrowsers.values()].filter(({ status, interactionCompleted, consoleErrorCount, accessibilityViolationCount }) => status === "passed" && interactionCompleted && consoleErrorCount === 0 && accessibilityViolationCount === 0).length}/2` }, { label: "原型试玩", done: readiness!.playtest, value: `${Math.min(task.evaluation.playtests.length, 3)}/3` }] : [];
  const resourceGap = task.evaluation?.resourceGapSummary;
  const resourcePlan = task.evaluation?.resourceAcquisitionPlan;
  const acquisitionTask = task.evaluation?.resourceAcquisitionTask;
  const intakeBatch = task.evaluation?.resourceIntakeBatch;
  const promotedFamilyIds = task.evaluation?.promotedResourceFamilyIds ?? [];
  return <article className={`research-passport status-${task.status}`}>
    <header><div><span>{task.status === "accepted" ? "已接受" : task.status === "rejected" ? "不采用" : task.status === "review" ? "待评审" : "研究中"}</span><h3>{task.queryIntent}</h3><small>{task.id}</small></div><BookOpen size={20}/></header>
    <div className="passport-stamps">{stamps.map((stamp) => <div className={stamp.done ? "is-done" : ""} key={stamp.label}><span>{stamp.label}</span><strong>{stamp.value}</strong></div>)}</div>
    {task.evaluation && <div className="evaluation-gates" role="group" aria-label="原型采用门禁">{gates.map((gate) => <div className={gate.done ? "is-done" : ""} key={gate.label}><span>{gate.done ? <Check size={12}/> : <i/>}{gate.label}</span><strong>{gate.value}</strong></div>)}{readiness?.ready ? <b>可以提交人工采用结论</b> : <small>{readiness?.reasons[0]}</small>}</div>}
    {resourceGap && <div className="research-resource-ledger" role="group" aria-label="研究资源缺口">
      <span>资源账本</span>
      <dl><div><dt>原型</dt><dd>{resourceGap.prototypeReady ? "可占位" : `${resourceGap.prototypeRequired} 项缺口`}</dd></div><div><dt>评审前</dt><dd>{resourceGap.reviewMissing} 项</dd></div><div><dt>发布前</dt><dd>{resourceGap.publishMissing} 项</dd></div></dl>
      {resourcePlan && <div className="research-acquisition-summary"><strong>取得方案</strong><p><span>复用 {resourcePlan.summary.reuseExisting}</span><span>程序生成 {resourcePlan.summary.proceduralGenerate}</span><span>采购 {resourcePlan.summary.procure}</span><span>创作 {resourcePlan.summary.create}</span></p><small>{resourcePlan.summary.licenseReview > 0 ? `${resourcePlan.summary.licenseReview} 项许可待人工复核` : "库内候选许可已核验"}</small><details><summary>查看 {resourcePlan.summary.total} 项具体方案</summary><ul>{resourcePlan.decisions.map((decision) => <li key={decision.requirementId}><div><strong>{resourceRoleLabel[decision.role]}</strong><span>{acquisitionRouteLabel[decision.route]}</span></div><small>{decision.selectedFamilyId ? `${decision.route === "create" ? "结构参考" : "资源族"} ${decision.selectedFamilyId} · ` : ""}{decision.license.status === "verified" ? `${decision.license.licenseId} 已核验` : decision.license.status === "pending" ? "许可待复核" : "平台自有或程序生成"}</small></li>)}</ul></details></div>}
      {acquisitionTask && <div className="research-acquisition-task"><strong><Check size={13}/>资源执行任务：{acquisitionTask.status === "completed" ? "全部完成" : "持续跟踪"}</strong><p><span>已提交 {acquisitionTask.summary.submitted}</span><span>已批准 {acquisitionTask.summary.approved}</span><span>已退回 {acquisitionTask.summary.returned}</span><span>总计 {acquisitionTask.summary.total}</span></p><details><summary>查看 {acquisitionTask.summary.total} 项执行任务</summary><ul>{acquisitionTask.items.map((item) => <li key={item.id}><div><strong>{item.title}</strong><span>{acquisitionTaskStateLabel[item.state]}</span></div><small>{item.checklist[0]}；完成条件：{item.completionRule}</small>{item.submissions.length > 0 && <small>已提交 {item.submissions.length} 次 · 已复核 {item.reviews.length} 次</small>}<div className="resource-work-actions">{item.state !== "submitted-for-review" && item.state !== "approved" && <button type="button" onClick={() => onAction({ task, kind: "resource-submit", requirementId: item.requirementId })}>{item.state === "returned" ? "修正后重提" : "提交成果"}</button>}{item.state === "submitted-for-review" && <><button type="button" className="knowledge-primary" onClick={() => onAction({ task, kind: "resource-review", requirementId: item.requirementId, decision: "approve" })}>批准</button><button type="button" onClick={() => onAction({ task, kind: "resource-review", requirementId: item.requirementId, decision: "return" })}>退回</button></>}</div></li>)}</ul></details><small>{acquisitionTask.safetyBoundaries[0]}</small></div>}
      {intakeBatch && <div className={`research-intake-batch status-${intakeBatch.status}`}><strong>{intakeBatch.status === "approved" ? "隔离资源与正式绑定已批准" : intakeBatch.status === "rejected" ? "隔离资源批次已拒绝" : "隔离入库批次已建立"}</strong><p>{intakeBatch.summary.files} 个真实文件 · {intakeBatch.summary.awaitingSecurityReview} 个待安全复核 · {intakeBatch.summary.approvedBindings} 个正式绑定</p><small>哈希、格式、体积、来源和许可已核对；恶意内容与敏感内容复核通过前不会成为 approved 绑定。</small>{intakeBatch.status === "awaiting-security-review" && <button type="button" onClick={() => onAction({ task, kind: "resource-intake-review" })}>执行独立安全复核</button>}</div>}
      {promotedFamilyIds.length > 0 && <div className="research-promoted-families"><strong>已晋升 {promotedFamilyIds.length} 个可检索资源族</strong><small>当前保持 reviewed；完成黄金游戏验证前不会自动绑定。</small></div>}
      <small>取得方案不等于素材已入库；原型通过也不代表正式素材已经获得。</small>
    </div>}
    {task.sources.length > 0 && <div className="research-sources">{task.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>{source.title}<ExternalLink size={11}/></a>)}{prototypeUrl && <a className="prototype-link" href={prototypeUrl} target="_blank" rel="noreferrer">打开隔离原型<ExternalLink size={11}/></a>}</div>}
    <footer>
      {(task.status === "queued" || task.status === "researching") && <button onClick={() => onAction({ task, kind: "source" })}>登记来源</button>}
      {task.status === "researching" && task.sources.length >= 3 && <button onClick={() => onAction({ task, kind: "synthesis" })}>提交拆解</button>}
      {task.status === "review" && !task.candidateDraft && <button onClick={() => onAction({ task, kind: "candidate" })}>形成候选</button>}
      {task.status === "review" && task.candidateDraft && !task.evaluation && <button className="knowledge-primary" disabled={busy} onClick={() => onCreateEvaluation(task)}>建立评估沙箱</button>}
      {task.status === "review" && task.evaluation && <><button className="knowledge-primary" disabled={busy} onClick={() => onRunEvaluation(task)}>{readiness?.probes && readiness.browser ? "重新自动验收" : "生成原型并自动验收"}</button><button onClick={() => onAction({ task, kind: "prototype-playtest" })}>记录试玩</button></>}
      {task.status === "review" && resourcePlan && !acquisitionTask && <button disabled={busy} onClick={() => onCreateAcquisition(task)}>生成资源执行任务</button>}
      {acquisitionTask && <span className="decision-saved"><Check size={14}/>资源任务已准备</span>}
      {acquisitionTask?.status === "completed" && !intakeBatch && <button className="knowledge-primary" disabled={busy} onClick={() => onIntakeResources(task)}>执行隔离入库</button>}
      {intakeBatch?.status === "approved" && promotedFamilyIds.length === 0 && <button className="knowledge-primary" disabled={busy} onClick={() => onPromoteResources(task)}>晋升可检索资源族</button>}
      {task.status === "review" && task.candidateDraft && <button onClick={() => onAction({ task, kind: "decision" })}>{readiness?.ready ? "人工采用结论" : "停止研究"}</button>}
      {task.status === "accepted" && !hasChangeSet && <button className="knowledge-primary" disabled={busy} onClick={() => onCreateChangeSet(task)}>生成知识变更</button>}
      {hasChangeSet && <span className="decision-saved"><Check size={14}/>已进入审核发布区</span>}
    </footer>
  </article>;
}

function ChangeSetCard({ changeSet, busy, onReview, onExport, onPublish }: {
  changeSet: DesignKnowledgeChangeSet;
  busy: boolean;
  onReview: (changeSet: DesignKnowledgeChangeSet, decision: "approve" | "reject") => void;
  onExport: (changeSet: DesignKnowledgeChangeSet) => void;
  onPublish: (changeSet: DesignKnowledgeChangeSet) => void;
}) {
  return (
    <article className={`change-set-card status-${changeSet.status}`}>
      <header><span>{statusLabels[changeSet.status]}</span><time>{formatDate(changeSet.createdAt)}</time></header>
      <h3>{changeSet.changes.length} 项知识调整</h3>
      <ul>{changeSet.changes.map((change) => {
        if ("kind" in change && change.kind === "add-mechanic") return <li key={`mechanic:${change.mechanic.id}`}><strong>{change.mechanic.label}</strong><span>外部研究 <ChevronRight size={13}/> 候选机制</span></li>;
        if ("kind" in change && change.kind === "add-pattern") return <li key={`pattern:${change.pattern.id}`}><strong>{change.pattern.label}</strong><span>外部研究 <ChevronRight size={13}/> 候选玩法</span></li>;
        return <li key={change.patternId}><strong>{change.patternId}</strong><span>{change.fromLifecycle} <ChevronRight size={13} /> {change.toLifecycle}</span></li>;
      })}</ul>
      <footer>
        {changeSet.status === "pending" && <><button onClick={() => onReview(changeSet, "reject")} disabled={busy}>拒绝</button><button className="knowledge-primary" onClick={() => onReview(changeSet, "approve")} disabled={busy}>审核通过</button></>}
        {(changeSet.status === "approved" || changeSet.status === "published") && <button onClick={() => onExport(changeSet)} disabled={busy}><Download size={15} />导出</button>}
        {changeSet.status === "approved" && <button className="knowledge-primary" onClick={() => onPublish(changeSet)} disabled={busy}><Upload size={15} />发布知识版本</button>}
      </footer>
    </article>
  );
}

function RollbackForm({ release, busy, onCancel, onSave }: { release: DesignKnowledgeRelease; busy: boolean; onCancel: () => void; onSave: (rationale: string) => Promise<void> }) {
  const [rationale, setRationale] = useState("");
  return <form className="decision-form rollback-form" role="dialog" aria-modal="true" aria-labelledby="rollback-title" onSubmit={(event) => { event.preventDefault(); void onSave(rationale); }}>
    <header><span>恢复历史知识</span><h2 id="rollback-title">从当前版本恢复到 R{release.sequence} 的内容</h2></header>
    <p>系统会创建一个新的发布版本，现有历史不会被覆盖。之后创建的游戏将使用恢复后的知识内容。</p>
    <label className="knowledge-field"><span>恢复理由</span><textarea rows={4} value={rationale} onChange={(event) => setRationale(event.currentTarget.value)} placeholder="说明当前版本的问题、选择这个历史版本的依据，以及恢复后如何复核。" /></label>
    <footer><button type="button" onClick={onCancel}>取消</button><button className="knowledge-primary" type="submit" disabled={busy || rationale.trim().length < 8}><RotateCcw size={15}/>创建恢复发布</button></footer>
  </form>;
}

export function DesignKnowledgeConsole() {
  const [data, setData] = useState<ConsoleData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPlaytest, setShowPlaytest] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState<Parameters<typeof DecisionForm>[0]["target"] | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<DesignKnowledgeRelease | null>(null);
  const [showRadarForm, setShowRadarForm] = useState(false);
  const [researchIdea, setResearchIdea] = useState("");
  const [researchAction, setResearchAction] = useState<ResearchAction | null>(null);
  const latestReview = data.reviews[0] ?? null;
  const latestRelease = data.releases[0] ?? null;
  const changeSetByReview = useMemo(() => new Map(data.changeSets.map((item) => [item.reviewId, item])), [data.changeSets]);
  const changeSetByResearch = useMemo(() => new Map(data.changeSets.filter(({ researchTaskId }) => researchTaskId).map((item) => [item.researchTaskId!, item])), [data.changeSets]);

  const reload = async () => {
    const [reviews, playtests, changeSets, releases, insights, projects, researchTasks, radar, atlas] = await Promise.all([getDesignKnowledgeReviews(), getDesignPlaytests(), getDesignKnowledgeChangeSets(), getDesignKnowledgeReleases(), getDesignKnowledgeInsights(), getProjects(), getDesignResearchTasks(), getGameplayRadar(), getMechanicAtlas({ limit: 12 })]);
    setData({ reviews, playtests, changeSets, releases, insights, projects, researchTasks, radar, atlas });
  };
  useEffect(() => { let active = true; reload().catch((caught) => { if (active) setError(readableError(caught)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  useEffect(() => { document.title = "策划知识发布台 · 造界"; return () => { document.title = "造界 · AI 游戏工坊"; }; }, []);

  const run = async (key: string, action: () => Promise<void>, success: string) => {
    setBusy(key); setError(""); setNotice("");
    try { await action(); await reload(); setNotice(success); }
    catch (caught) { setError(readableError(caught)); }
    finally { setBusy(""); }
  };

  const downloadExport = async (changeSet: DesignKnowledgeChangeSet) => {
    await run(`export:${changeSet.id}`, async () => {
      const payload = await exportDesignKnowledgeChangeSet(changeSet.id);
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `design-knowledge-${changeSet.id}.json`; anchor.click(); URL.revokeObjectURL(url);
    }, "知识版本候选已导出。");
  };

  if (loading) return <div className="knowledge-console-state" role="status"><LoaderCircle className="spin" />正在读取设计证据…</div>;
  return (
    <div className="app-shell knowledge-console-shell">
      <SiteHeader active="knowledge" />
      <main className="knowledge-console" id="main-content" tabIndex={-1}>
        <header className="knowledge-hero">
          <div><p className="eyebrow">内部策划 · 版本化知识</p><h1>把试玩证据变成<br />下一版设计能力</h1><p>系统只提出建议。真人试玩、人工决定和独立审核齐全后，新的玩法等级才会影响之后创建的游戏。</p></div>
          <aside aria-label="当前知识版本"><span>当前知识版本</span><strong>{latestRelease ? `R${latestRelease.sequence}` : "内置基线"}</strong><small>{latestRelease ? `${formatDate(latestRelease.publishedAt)} · ${latestRelease.checksum.slice(0, 10)}` : "尚未发布数据库覆盖版本"}</small><ShieldCheck size={28} aria-hidden="true" /></aside>
        </header>
        <Rail data={data} />
        {(error || notice) && <div className={error ? "knowledge-message is-error" : "knowledge-message is-success"} role={error ? "alert" : "status"}>{error || notice}</div>}

        <div className="knowledge-action-row">
          <div><strong>先积累证据，再生成季度复核</strong><span>试玩记录不保存测试者身份和自由文本。</span></div>
          <button onClick={() => setShowPlaytest((value) => !value)}><Plus size={16} />记录真人试玩</button>
          <button className="knowledge-primary" disabled={Boolean(busy)} onClick={() => void run("capture", async () => { await captureDesignKnowledgeReview(); }, "新的季度复核快照已保存。")}>{busy === "capture" ? <LoaderCircle className="spin" size={16} /> : <ClipboardCheck size={16} />}生成复核快照</button>
        </div>
        {showPlaytest && <section className="knowledge-form-panel"><header><span>结构化试玩</span><button onClick={() => setShowPlaytest(false)}>关闭</button></header><PlaytestForm projects={data.projects} busy={busy === "playtest"} onSave={(input) => run("playtest", async () => { await recordDesignPlaytest(input); setShowPlaytest(false); }, "真人试玩证据已保存。")}/></section>}

        <MechanicAtlasExplorer initial={data.atlas}/>
        <GameplayRadar clusters={data.radar} busy={Boolean(busy)} onAdd={() => setShowRadarForm(true)} onResearch={(cluster) => void run(`radar-research:${cluster.id}`, async () => { await startGameplayRadarResearch(cluster.id, cluster.freshness === "stale"); }, cluster.freshness === "stale" ? "新的复核研究任务已经建立。" : cluster.match.kind === "research-task" ? "信号已经合并到现有研究任务。" : "玩法信号已经进入研究队列。")} />

        <section className="research-workbench" aria-labelledby="research-title">
          <header><div><span><Search size={14}/> 外部相似游戏研究</span><h2 id="research-title">先登记证据，再提炼候选</h2><p>来源和拆解完成后，系统生成隔离短局原型，并自动运行规则探针、桌面与手机回归；真人试玩和最终采用仍由人决定。</p></div><form onSubmit={(event) => { event.preventDefault(); void run("research-create", async () => { await createDesignResearchTask({ idea: researchIdea }); setResearchIdea(""); }, "外部研究任务已经创建。"); }}><label><span>库外创意或机制</span><input value={researchIdea} onChange={(event) => setResearchIdea(event.currentTarget.value)} placeholder="描述目前知识库无法解释的核心动作" /></label><button className="knowledge-primary" disabled={Boolean(busy) || researchIdea.trim().length < 3}><Plus size={15}/>创建研究</button></form></header>
          {!data.researchTasks.length ? <p className="knowledge-empty">没有待研究任务。已能由现有玩法库解释的创意不会重复进入这里。</p> : <div className="research-passport-list">{data.researchTasks.map((task) => <ResearchTaskCard key={task.id} task={task} hasChangeSet={changeSetByResearch.has(task.id)} busy={Boolean(busy)} onAction={setResearchAction} onCreateEvaluation={(item) => void run(`research-evaluation:${item.id}`, async () => { await createDesignResearchEvaluation(item.id); }, "最小设计合同已经生成，可以开始隔离评估。") } onCreateAcquisition={(item) => void run(`research-acquisition:${item.id}`, async () => { await createDesignResearchResourceAcquisitionTask(item.id); }, "资源取得计划已转换为可追踪的执行任务。") } onIntakeResources={(item) => void run(`research-intake:${item.id}`, async () => { await intakeApprovedDesignResearchResources(item.id); }, "已批准成果已写入隔离资源区，等待安全复核。") } onPromoteResources={(item) => void run(`research-promotion:${item.id}`, async () => { await promoteDesignResearchResourceFamilies(item.id); }, "已批准资源已晋升为可检索资源族，等待黄金游戏验证。") } onRunEvaluation={(item) => void run(`research-run:${item.id}`, async () => { await runDesignResearchEvaluation(item.id); }, "隔离原型已生成，规则探针和双端浏览器验收已回填。") } onCreateChangeSet={(item) => void run(`research-change:${item.id}`, async () => { await createDesignResearchChangeSet(item.id); }, "候选已经进入独立审核发布区。")}/>)}</div>}
        </section>

        <EvidenceInsights insights={data.insights}/>

        <div className="knowledge-grid">
          <section className="knowledge-review-panel">
            <header><div><span>最新季度复核</span><h2>{latestReview ? formatDate(latestReview.createdAt) : "尚无快照"}</h2></div>{latestReview && <small>{latestReview.report.patterns.length} 个有运行证据的玩法</small>}</header>
            {!latestReview || !latestReview.report.patterns.length ? <p className="knowledge-empty">还没有足够的运行事件。先试玩已发布游戏，再生成复核快照。</p> : (
              <div className="pattern-review-list">{latestReview.report.patterns.map((pattern) => {
                const decision = latestReview.decisions.find(({ patternId }) => patternId === pattern.patternId);
                return <article key={pattern.patternId}>
                  <header><div><span className={`recommendation recommendation-${pattern.recommendation}`}>{recommendationLabels[pattern.recommendation]}</span><h3>{pattern.label}</h3><small>{pattern.patternId}</small></div><strong>{percent(pattern.metrics.completionRate)}<small>完成率</small></strong></header>
                  <dl><div><dt>匿名玩家</dt><dd>{pattern.samples.distinctPlayers}</dd></div><div><dt>开始</dt><dd>{pattern.samples.starts}</dd></div><div><dt>退出</dt><dd>{percent(pattern.metrics.exitRate)}</dd></div><div><dt>平均帧率</dt><dd>{pattern.metrics.averageFps ?? "—"}</dd></div></dl>
                  <p>{pattern.rationale}</p>
                  <footer>{decision ? <span className="decision-saved"><Check size={14} />已决定：{outcomeLabels[decision.outcome]}</span> : <button onClick={() => setDecisionTarget({ reviewId: latestReview.id, patternId: pattern.patternId, label: pattern.label, recommendation: pattern.recommendation })}>记录人工决定</button>}</footer>
                </article>;
              })}</div>
            )}
            {latestReview && latestReview.decisions.some(({ outcome }) => outcome === "promote" || outcome === "demote") && !changeSetByReview.has(latestReview.id) && <button className="create-change-set" disabled={Boolean(busy)} onClick={() => void run("change-set", async () => { await createDesignKnowledgeChangeSet(latestReview.id); }, "待发布知识变更已经生成。")}>根据已批准决定生成版本变更 <ChevronRight size={16} /></button>}
          </section>

          <aside className="knowledge-release-panel" aria-label="知识变更与发布">
            <header><span>变更与发布</span><h2>每一步都留下证据</h2></header>
            {!data.changeSets.length ? <p className="knowledge-empty">人工决定包含晋级或降级后，这里会出现待审核变更。</p> : data.changeSets.map((changeSet) => <ChangeSetCard key={changeSet.id} changeSet={changeSet} busy={Boolean(busy)} onExport={(item) => void downloadExport(item)} onPublish={(item) => { if (window.confirm("发布后，之后创建的新游戏将使用这个知识版本。确认发布？")) void run(`publish:${item.id}`, async () => { await publishDesignKnowledgeChangeSet(item.id); }, "新知识版本已经发布并开始用于后续创作。"); }} onReview={(item, decision) => { const defaultReason = decision === "approve" ? "证据链与变更内容已经复核，批准进入发布候选。" : "当前证据不足或变更风险未解决，拒绝本次发布候选。"; if (window.confirm(decision === "approve" ? "确认这份变更已经独立复核？" : "确认拒绝这份变更？")) void run(`review:${item.id}`, async () => { await reviewDesignKnowledgeChangeSet(item.id, decision, defaultReason); }, decision === "approve" ? "变更集审核通过，可以导出或发布。" : "变更集已拒绝，不会影响知识库。"); }} />)}
            {data.releases.length > 0 && <div className="release-history"><h3>发布历史</h3>{data.releases.map((release, index) => <div className={index === 0 ? "is-current" : ""} key={release.id}><span>R{release.sequence}</span><div><strong>{index === 0 ? "当前生效" : release.kind === "rollback" ? "恢复发布" : "知识变更"}</strong><small>{formatDate(release.publishedAt)} · {release.checksum.slice(0, 10)}</small></div>{index > 0 && <button type="button" onClick={() => setRollbackTarget(release)} disabled={Boolean(busy)}><RotateCcw size={13}/>恢复</button>}</div>)}</div>}
          </aside>
        </div>
      </main>
      {decisionTarget && <div className="knowledge-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDecisionTarget(null); }}><DecisionForm target={decisionTarget} busy={busy === "decision"} onCancel={() => setDecisionTarget(null)} onSave={(input) => run("decision", async () => { await recordDesignKnowledgeDecision(decisionTarget.reviewId, input); setDecisionTarget(null); }, "人工决定已保存。")}/></div>}
      {rollbackTarget && <div className="knowledge-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRollbackTarget(null); }}><RollbackForm release={rollbackTarget} busy={busy === "rollback"} onCancel={() => setRollbackTarget(null)} onSave={(rationale) => run("rollback", async () => { await rollbackDesignKnowledgeRelease(rollbackTarget.id, rationale); setRollbackTarget(null); }, `已经创建新的恢复发布，内容来自 R${rollbackTarget.sequence}。`)}/></div>}
      {showRadarForm && <div className="knowledge-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowRadarForm(false); }}><GameplayRadarForm busy={busy === "radar-signal"} onCancel={() => setShowRadarForm(false)} onSave={(input) => run("radar-signal", async () => { await addGameplayRadarSignal(input); setShowRadarForm(false); }, "玩法信号已归并到雷达。")}/></div>}
      {researchAction && <div className="knowledge-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setResearchAction(null); }}>
        {researchAction.kind === "source" && <ResearchSourceForm task={researchAction.task} busy={busy === "research-source"} onCancel={() => setResearchAction(null)} onSave={(input) => run("research-source", async () => { await addDesignResearchSource(researchAction.task.id, input); setResearchAction(null); }, "研究来源已经登记。")}/>} 
        {researchAction.kind === "synthesis" && <ResearchSynthesisForm busy={busy === "research-synthesis"} onCancel={() => setResearchAction(null)} onSave={(input) => run("research-synthesis", async () => { await submitDesignResearchSynthesis(researchAction.task.id, input); setResearchAction(null); }, "共同玩法结构已提交评审。")}/>} 
        {researchAction.kind === "candidate" && <ResearchCandidateForm task={researchAction.task} busy={busy === "research-candidate"} onCancel={() => setResearchAction(null)} onSave={(input) => run("research-candidate", async () => { await attachDesignResearchCandidate(researchAction.task.id, input); setResearchAction(null); }, "结构化候选草案已保存。")}/>} 
        {researchAction.kind === "probe" && <ResearchProbeForm task={researchAction.task} busy={busy === "research-probe"} onCancel={() => setResearchAction(null)} onSave={(input) => run("research-probe", async () => { await recordDesignResearchProbeRun(researchAction.task.id, input); setResearchAction(null); }, "规则探针结果已保存。")}/>} 
        {researchAction.kind === "browser" && <ResearchBrowserForm busy={busy === "research-browser"} onCancel={() => setResearchAction(null)} onSave={(input) => run("research-browser", async () => { await recordDesignResearchBrowserRun(researchAction.task.id, input); setResearchAction(null); }, "真实浏览器证据已保存。")}/>} 
        {researchAction.kind === "prototype-playtest" && <ResearchPlaytestForm busy={busy === "research-prototype-playtest"} onCancel={() => setResearchAction(null)} onSave={(input) => run("research-prototype-playtest", async () => { await recordDesignResearchPlaytest(researchAction.task.id, input); setResearchAction(null); }, "匿名原型试玩已保存。")}/>} 
        {researchAction.kind === "decision" && <ResearchDecisionForm task={researchAction.task} busy={busy === "research-decision"} onCancel={() => setResearchAction(null)} onSave={(input) => run("research-decision", async () => { await decideDesignResearchTask(researchAction.task.id, input); setResearchAction(null); }, input.outcome === "no-adoption" ? "研究已归档为不采用。" : "研究已接受为候选，尚未影响当前知识库。")}/>} 
        {researchAction.kind === "resource-submit" && <ResearchResourceSubmissionForm task={researchAction.task} requirementId={researchAction.requirementId} busy={busy === "resource-submit"} onCancel={() => setResearchAction(null)} onSave={(input) => run("resource-submit", async () => { await submitDesignResearchResourceWork(researchAction.task.id, researchAction.requirementId, input); setResearchAction(null); }, "资源成果已提交，等待独立复核。")}/>} 
        {researchAction.kind === "resource-review" && <ResearchResourceReviewForm task={researchAction.task} requirementId={researchAction.requirementId} decision={researchAction.decision} busy={busy === "resource-review"} onCancel={() => setResearchAction(null)} onSave={(input) => run("resource-review", async () => { await reviewDesignResearchResourceWork(researchAction.task.id, researchAction.requirementId, input); setResearchAction(null); }, input.decision === "approve" ? "资源成果已批准。" : "资源成果已退回，可修正后重提。")}/>} 
        {researchAction.kind === "resource-intake-review" && <ResearchResourceSecurityReviewForm task={researchAction.task} busy={busy === "resource-intake-review"} onCancel={() => setResearchAction(null)} onSave={(input) => run("resource-intake-review", async () => { await reviewDesignResearchResourceIntake(researchAction.task.id, input); setResearchAction(null); }, input.malware === "pass" && input.sensitiveContent === "pass" ? "安全复核通过，正式资源绑定已批准。" : "安全复核未通过，整批资源已拒绝。")}/>} 
      </div>}
    </div>
  );
}
