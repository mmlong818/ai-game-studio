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
import { useDesignKnowledgeCopy } from "./DesignKnowledgeConsole.copy";
import { usePreferences } from "./preferences";

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
const EMPTY_ATLAS: MechanicAtlasResponse = { summary: { schemaVersion: "mechanic-atlas-summary-v2", total: 0, modifiers: 0, combinationCapacity: 0, byFamily: {}, byModifierCategory: {}, boundary: "" }, localSources: { schemaVersion: "local-design-source-summary-v1", indexed: 0, bytes: 0, byRole: {}, sourceRootHint: "", policy: "" }, result: { schemaVersion: "mechanic-atlas-search-v1", total: 0, matched: 0, offset: 0, limit: 12, entries: [], officialPromotionRequired: true } };
const EMPTY_DATA: ConsoleData = { reviews: [], playtests: [], changeSets: [], releases: [], insights: EMPTY_INSIGHTS, projects: [], researchTasks: [], radar: [], atlas: EMPTY_ATLAS };
const recommendationLabels = {
  "insufficient-evidence": null,
  retain: null,
  "promotion-review": null,
  "manual-review": null,
  "demotion-review": null,
} as const;
const outcomeLabels = { retain: null, promote: null, demote: null, retest: null } as const;
const evidenceOptions: DesignKnowledgeDecisionInput["evidence"] = ["telemetry", "playtest", "contract", "solver", "browser"];

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function GameplayRadarForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (input: GameplaySignal) => Promise<void> }) {
  const c = useDesignKnowledgeCopy();
  const today = new Date().toISOString().slice(0, 10);
  return <form className="decision-form radar-signal-form" role="dialog" aria-modal="true" aria-label={c("radar.formLabel")} onKeyDown={(event) => { if (event.key === "Escape") onCancel(); }} onSubmit={(event) => {
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
    <header><span>{c("radar.formEyebrow")}</span><h2>{c("radar.formLabel")}</h2></header>
    <label><span>{c("radar.game")}</span><input name="gameTitle" autoFocus required /></label>
    <div className="research-field-pair"><label><span>{c("radar.sourceTitle")}</span><input name="sourceTitle" required /></label><label><span>{c("radar.sourceUrl")}</span><input name="sourceUrl" type="url" required /></label></div>
    <div className="research-field-pair"><label><span>{c("radar.sourceType")}</span><select name="sourceType" defaultValue="editorial-list"><option value="editorial-list">{c("radar.editorial")}</option><option value="annual-award">{c("radar.award")}</option><option value="store-ranking">{c("radar.store")}</option><option value="developer-update">{c("radar.developer")}</option><option value="community-ranking">{c("radar.community")}</option></select></label><label><span>{c("radar.platform")}</span><select name="platform" defaultValue="cross-platform"><option value="cross-platform">{c("radar.cross")}</option><option value="web">{c("radar.web")}</option><option value="mobile">{c("radar.mobile")}</option><option value="desktop">{c("radar.desktop")}</option></select></label></div>
    <div className="research-field-pair"><label><span>{c("radar.observed")}</span><input name="observedAt" type="date" defaultValue={today} required /></label><label><span>{c("radar.published")}</span><input name="publishedAt" type="date" /></label></div>
    <label><span>{c("radar.summary")}</span><textarea name="signalSummary" required /></label>
    <div className="research-field-pair"><label><span>{c("radar.verbs")}</span><input name="playerVerbs" required /></label><label><span>{c("radar.tags")}</span><input name="mechanicTags" placeholder="puzzle, deduction" required /></label></div>
    <footer><button type="button" onClick={onCancel}>{c("common.cancel")}</button><button className="knowledge-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15}/> : <Plus size={15}/>} {c("radar.save")}</button></footer>
  </form>;
}

function GameplayRadar({ clusters, busy, onAdd, onResearch }: { clusters: GameplayRadarView[]; busy: boolean; onAdd: () => void; onResearch: (cluster: GameplayRadarView) => void }) {
  const c = useDesignKnowledgeCopy();
  return <section className="gameplay-radar" aria-labelledby="radar-title">
    <header><div><span><Radar size={14}/> {c("radar.eyebrow")}</span><h2 id="radar-title">{c("radar.title")}</h2><p>{c("radar.detail")}</p></div><button onClick={onAdd}><Plus size={15}/>{c("radar.add")}</button></header>
    {!clusters.length ? <p className="knowledge-empty">{c("radar.empty")}</p> : <div className="radar-cluster-list">{clusters.map((cluster) => <article key={cluster.id} className={`radar-cluster is-${cluster.freshness}`}>
      <header><div><span className="radar-freshness">{c(cluster.freshness === "fresh" ? "radar.fresh" : cluster.freshness === "aging" ? "radar.aging" : "radar.stale")}</span><h3>{cluster.gameTitle}</h3></div><strong>{c("common.signals",{count:cluster.signals.length})}</strong></header>
      <div className="radar-meta"><span>{c("radar.sites",{count:cluster.distinctSourceCount})}</span><span>{c("radar.validUntil",{date:cluster.refreshAfter})}</span><span>{cluster.researchTaskIds.length ? c("radar.linked",{count:cluster.researchTaskIds.length}) : c("radar.unresearched")}</span></div>
      <p className="radar-match"><b>{cluster.match.kind === "research-task" ? c("radar.merge") : cluster.match.kind === "knowledge-pattern" ? c("radar.neighbor") : c("radar.independent")}</b><span>{cluster.match.label}</span><small>{cluster.match.reason}</small></p>
      <ul>{cluster.signals.slice(0, 2).map((signal) => <li key={signal.sourceUrl}><a href={signal.sourceUrl} target="_blank" rel="noreferrer">{signal.sourceTitle}<ExternalLink size={11}/></a><span>{signal.signalSummary}</span></li>)}</ul>
      <footer><button className="knowledge-primary" disabled={busy} onClick={() => onResearch(cluster)}>{cluster.freshness === "stale" ? c("radar.reresearch") : cluster.match.kind === "research-task" ? c("radar.mergeExisting") : cluster.researchTaskIds.length ? c("radar.continue") : c("radar.enter")}<ChevronRight size={14}/></button></footer>
    </article>)}</div>}
  </section>;
}

const atlasFamilyKeys: Record<string, "movement" | "spatial" | "matching" | "economy" | "combat" | "collection" | "construction" | "information" | "timing" | "social" | "progression" | "risk" | "physics" | "stealth" | "narrative" | "simulation" | "strategy" | "survival" | "multiplayer" | "creation"> = { movement: "movement", spatial: "spatial", matching: "matching", economy: "economy", combat: "combat", collection: "collection", construction: "construction", information: "information", timing: "timing", "social-simulation": "social", progression: "progression", "risk-reward": "risk", physics: "physics", stealth: "stealth", narrative: "narrative", simulation: "simulation", strategy: "strategy", survival: "survival", multiplayer: "multiplayer", creation: "creation" };
function MechanicAtlasExplorer({ initial }: { initial: MechanicAtlasResponse }) {
  const c = useDesignKnowledgeCopy();
  const [result, setResult] = useState(initial); const [query, setQuery] = useState(""); const [family, setFamily] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  useEffect(() => setResult(initial), [initial]);
  const search = async (offset = 0) => { setLoading(true); setError(""); try { setResult(await getMechanicAtlas({ query, family, offset, limit: 12 })); } catch (caught) { setError(readableError(caught, c)); } finally { setLoading(false); } };
  return <section className="mechanic-atlas" aria-labelledby="mechanic-atlas-title">
    <header><div><span><BookOpen size={14}/> {c("atlas.eyebrow")}</span><h2 id="mechanic-atlas-title">{c("atlas.title",{count:result.summary.total.toLocaleString()})}</h2><p>{c("atlas.detail")}</p></div><strong>{result.summary.total}<small>{c("atlas.mechanics")}</small><i>+</i>{result.summary.modifiers}<small>{c("atlas.modifiers")}</small></strong></header>
    <form onSubmit={(event) => { event.preventDefault(); void search(0); }}><label><span>{c("atlas.search")}</span><input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder={c("atlas.placeholder")} /></label><label><span>{c("atlas.family")}</span><select value={family} onChange={(event) => setFamily(event.currentTarget.value)}><option value="">{c("atlas.all")}</option>{Object.entries(atlasFamilyKeys).map(([id, key]) => <option key={id} value={id}>{c(`atlas.family.${key}`)}</option>)}</select></label><button className="knowledge-primary" disabled={loading}>{loading ? <LoaderCircle className="spin" size={15}/> : <Search size={15}/>} {c("atlas.submit")}</button></form>
    {error && <p role="alert" className="knowledge-message is-error">{error}</p>}
    <div className="atlas-reading"><span>{c("atlas.found",{matched:result.result.matched,indexed:result.localSources.indexed})}</span><small>{result.summary.boundary}</small></div>
    <div className="atlas-card-list">{result.result.entries.map((entry) => <article key={entry.id}><header><span>{c(`atlas.family.${atlasFamilyKeys[entry.family]}`)}</span><small>{c("atlas.card")}</small></header><h3>{entry.label}</h3><p>{entry.playerVerb}</p><dl><dt>{c("atlas.state")}</dt><dd>{entry.state} → {entry.outcome}</dd><dt>{c("atlas.rule")}</dt><dd>{entry.productionRule}</dd><dt>{c("atlas.acceptance")}</dt><dd>{entry.acceptanceSignals.join(" · ")}</dd></dl><footer>{c("atlas.footer")}</footer></article>)}</div>
    <footer className="atlas-pagination"><button disabled={loading || result.result.offset === 0} onClick={() => void search(Math.max(0, result.result.offset - result.result.limit))}>{c("common.previous")}</button><span>{result.result.matched ? `${result.result.offset + 1}–${Math.min(result.result.offset + result.result.entries.length, result.result.matched)} / ${result.result.matched}` : c("common.none")}</span><button disabled={loading || result.result.offset + result.result.entries.length >= result.result.matched} onClick={() => void search(result.result.offset + result.result.limit)}>{c("common.next")}</button></footer>
  </section>;
}

const segmentKeys = new Set(["novice", "casual", "experienced", "expert", "desktop", "mobile", "tablet", "keyboard", "pointer", "touch", "gamepad"]);

function Sparkline({ points, color, label }: { points: number[]; color: string; label: string }) {
  const plotted = points.map((value, index) => `${points.length === 1 ? 50 : (index / (points.length - 1)) * 100},${40 - value * 36}`).join(" ");
  return <svg className="knowledge-sparkline" viewBox="0 0 100 44" role="img" aria-label={label} preserveAspectRatio="none"><line x1="0" y1="40" x2="100" y2="40" /><polyline points={plotted} style={{ stroke: color }} /></svg>;
}

function SummaryCell({ label, summary }: { label: string; summary: DesignKnowledgeInsightSummary }) {
  const c = useDesignKnowledgeCopy();
  return <div className="insight-summary-cell"><strong>{label}</strong><span>{c("insights.summary",{count:summary.sampleCount,completion:percent(summary.completionRate)})}</span><span>{c("insights.replay",{replay:percent(summary.replayRate),fun:summary.ratings.funRating.toFixed(1)})}</span></div>;
}

function EvidenceInsights({ insights }: { insights: DesignKnowledgeInsights }) {
  const c = useDesignKnowledgeCopy();
  const patternIds = [...new Set([...insights.trends.map(({ patternId }) => patternId), ...insights.playtests.map(({ patternId }) => patternId)])];
  const [selected, setSelected] = useState(patternIds[0] ?? "");
  useEffect(() => { if (!patternIds.includes(selected)) setSelected(patternIds[0] ?? ""); }, [patternIds, selected]);
  if (!patternIds.length) return null;
  const trend = insights.trends.find(({ patternId }) => patternId === selected);
  const breakdown = insights.playtests.find(({ patternId }) => patternId === selected);
  const latest = trend?.points.at(-1);
  const previous = trend?.points.at(-2);
  const delta = latest && previous ? latest.completionRate - previous.completionRate : null;
  const segmentLabel = (key: string) => segmentKeys.has(key) ? c(`label.segment.${key}` as never) : key;
  return <section className="knowledge-insights" aria-labelledby="knowledge-insights-title">
    <header><div><span><TrendingUp size={14} /> {c("insights.eyebrow")}</span><h2 id="knowledge-insights-title">{c("insights.title")}</h2></div><label>{c("insights.select")}<select value={selected} onChange={(event) => setSelected(event.currentTarget.value)}>{patternIds.map((id) => <option value={id} key={id}>{insights.trends.find((item) => item.patternId === id)?.label ?? id}</option>)}</select></label></header>
    <div className="insight-track">
      <div className="trend-panel"><div className="trend-reading"><span>{c("insights.latest")}</span><strong>{latest ? percent(latest.completionRate) : "—"}</strong><small>{delta === null ? c("insights.needPeriods") : `${delta >= 0 ? c("insights.rise") : c("insights.fall")} ${c("insights.points",{count:Math.abs(Math.round(delta * 100))})}`}</small></div>{trend?.points.length ? <div className="trend-lines"><Sparkline points={trend.points.map(({ completionRate }) => completionRate)} color="#65c99f" label={c("insights.completion")}/><Sparkline points={trend.points.map(({ exitRate }) => exitRate)} color="#ef805b" label={c("insights.exit")}/><footer><span><i className="is-complete"/>{c("insights.completion")}</span><span><i className="is-exit"/>{c("insights.exit")}</span><b>{c("common.reviews",{count:trend.points.length})}</b></footer></div> : <p className="knowledge-empty">{c("insights.empty")}</p>}</div>
      <div className="playtest-breakdown"><header><span>{c("insights.playtest")}</span><strong>{c("insights.records",{count:breakdown?.overall.sampleCount ?? 0})}</strong></header>{breakdown ? <><div className="overall-ratings"><span>{c("insights.onboarding")} <b>{breakdown.overall.ratings.onboardingClarity.toFixed(1)}</b></span><span>{c("insights.controls")} <b>{breakdown.overall.ratings.controlClarity.toFixed(1)}</b></span><span>{c("insights.fun")} <b>{breakdown.overall.ratings.funRating.toFixed(1)}</b></span><span>{c("insights.fairness")} <b>{breakdown.overall.ratings.fairnessRating.toFixed(1)}</b></span></div><div className="breakdown-groups"><section><h3>{c("insights.experience")}</h3>{Object.entries(breakdown.byTesterSegment).map(([key, value]) => <SummaryCell key={key} label={segmentLabel(key)} summary={value}/>)}</section><section><h3>{c("insights.device")}</h3>{Object.entries(breakdown.byDeviceClass).map(([key, value]) => <SummaryCell key={key} label={segmentLabel(key)} summary={value}/>)}</section><section><h3>{c("insights.input")}</h3>{Object.entries(breakdown.byInputMode).map(([key, value]) => <SummaryCell key={key} label={segmentLabel(key)} summary={value}/>)}</section></div></> : <p className="knowledge-empty">{c("insights.noPlaytest")}</p>}</div>
    </div>
  </section>;
}

function readableError(caught: unknown, c: ReturnType<typeof useDesignKnowledgeCopy>) {
  if (caught instanceof Error && caught.name === "ZodError") return c("common.versionError");
  return caught instanceof Error ? caught.message : c("common.error");
}

function Rail({ data }: { data: ConsoleData }) {
  const c = useDesignKnowledgeCopy();
  const nodes = [
    { icon: Activity, label: c("main.playtests"), value: data.playtests.length, ready: data.playtests.length > 0 },
    { icon: ClipboardCheck, label: c("main.quarterly"), value: data.reviews.length, ready: data.reviews.length > 0 },
    { icon: GitCommitVertical, label: c("main.changes"), value: data.changeSets.length, ready: data.changeSets.some(({ status }) => status !== "rejected") },
    { icon: Library, label: c("main.releases"), value: data.releases.length, ready: data.releases.length > 0 },
  ];
  return (
    <ol className="knowledge-rail" aria-label={c("main.flow")}>
      {nodes.map(({ icon: Icon, label, value, ready }, index) => (
        <li className={ready ? "is-ready" : ""} key={label}>
          <span className="rail-node"><Icon size={17} aria-hidden="true" /></span>
          <span><small>{c("main.stage", { number: index + 1 })}</small><strong>{label}</strong></span>
          <b>{value}</b>
        </li>
      ))}
    </ol>
  );
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const c = useDesignKnowledgeCopy();
  return (
    <label className="knowledge-rating">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(Number(event.currentTarget.value))}>
        <option value={1}>{c("common.rating1")}</option><option value={2}>{c("common.rating2")}</option><option value={3}>{c("common.rating3")}</option><option value={4}>{c("common.rating4")}</option><option value={5}>{c("common.rating5")}</option>
      </select>
    </label>
  );
}

function PlaytestForm({ projects, busy, onSave }: { projects: ProjectSummary[]; busy: boolean; onSave: (input: DesignPlaytestInput) => Promise<void> }) {
  const c = useDesignKnowledgeCopy();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const project = projects.find(({ id }) => id === projectId) ?? projects[0];
  const [outcome, setOutcome] = useState<DesignPlaytestInput["taskOutcome"]>("completed");
  const [ratings, setRatings] = useState({ onboardingClarity: 3, controlClarity: 3, perceivedDifficulty: 3, funRating: 3, fairnessRating: 3 });
  const [blockerCode, setBlockerCode] = useState<DesignPlaytestInput["blockerCode"]>("none");
  const [wouldReplay, setWouldReplay] = useState(true);
  useEffect(() => { if (!projectId && projects[0]) setProjectId(projects[0].id); }, [projectId, projects]);
  useEffect(() => { setBlockerCode(outcome === "completed" ? "none" : "onboarding"); }, [outcome]);
  if (!project) return <p className="knowledge-empty">{c("playtest.empty")}</p>;
  return (
    <form className="playtest-form" onSubmit={(event) => {
      event.preventDefault();
      void onSave({
        projectId: project.id, versionId: project.version.id, testerSegment: "novice", deviceClass: "desktop", inputMode: "pointer",
        taskOutcome: outcome, ...ratings, wouldReplay, completionSeconds: null, hintCount: 0, blockerCode,
      });
    }}>
      <label className="knowledge-field"><span>{c("playtest.game")}</span><select value={project.id} onChange={(event) => setProjectId(event.currentTarget.value)}>{projects.map((item) => <option value={item.id} key={item.id}>{item.title} · v{item.version.number}</option>)}</select></label>
      <label className="knowledge-field"><span>{c("playtest.outcome")}</span><select value={outcome} onChange={(event) => setOutcome(event.currentTarget.value as typeof outcome)}><option value="completed">{c("playtest.completed")}</option><option value="partial">{c("playtest.partial")}</option><option value="blocked">{c("playtest.blocked")}</option><option value="abandoned">{c("playtest.abandoned")}</option></select></label>
      <div className="rating-grid">
        <Rating label={c("playtest.onboarding")} value={ratings.onboardingClarity} onChange={(value) => setRatings((state) => ({ ...state, onboardingClarity: value }))} />
        <Rating label={c("playtest.controls")} value={ratings.controlClarity} onChange={(value) => setRatings((state) => ({ ...state, controlClarity: value }))} />
        <Rating label={c("playtest.difficulty")} value={ratings.perceivedDifficulty} onChange={(value) => setRatings((state) => ({ ...state, perceivedDifficulty: value }))} />
        <Rating label={c("playtest.fun")} value={ratings.funRating} onChange={(value) => setRatings((state) => ({ ...state, funRating: value }))} />
        <Rating label={c("playtest.fairness")} value={ratings.fairnessRating} onChange={(value) => setRatings((state) => ({ ...state, fairnessRating: value }))} />
      </div>
      {outcome !== "completed" && <label className="knowledge-field"><span>{c("playtest.blocker")}</span><select value={blockerCode} onChange={(event) => setBlockerCode(event.currentTarget.value as typeof blockerCode)}><option value="onboarding">{c("playtest.onboardingBlock")}</option><option value="controls">{c("playtest.controlsBlock")}</option><option value="rules">{c("playtest.rulesBlock")}</option><option value="difficulty">{c("playtest.difficultyBlock")}</option><option value="resource">{c("playtest.resourceBlock")}</option><option value="performance">{c("playtest.performanceBlock")}</option><option value="accessibility">{c("playtest.a11yBlock")}</option></select></label>}
      <label className="replay-check"><input type="checkbox" checked={wouldReplay} onChange={(event) => setWouldReplay(event.currentTarget.checked)} /><span>{c("playtest.replay")}</span></label>
      <button className="knowledge-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{c("playtest.save")}</button>
    </form>
  );
}

function DecisionForm({ target, busy, onCancel, onSave }: {
  target: { reviewId: string; patternId: string; label: string; recommendation: keyof typeof recommendationLabels };
  busy: boolean;
  onCancel: () => void;
  onSave: (input: DesignKnowledgeDecisionInput) => Promise<void>;
}) {
  const c = useDesignKnowledgeCopy();
  const suggested = target.recommendation === "promotion-review" ? "promote" : target.recommendation === "demotion-review" ? "demote" : target.recommendation === "retain" ? "retain" : "retest";
  const [outcome, setOutcome] = useState<DesignKnowledgeDecisionInput["outcome"]>(suggested);
  const [rationale, setRationale] = useState("");
  const [evidence, setEvidence] = useState<DesignKnowledgeDecisionInput["evidence"]>(["telemetry", "playtest", "contract", "browser"]);
  return (
    <form className="decision-form" onSubmit={(event) => { event.preventDefault(); void onSave({ patternId: target.patternId, outcome, rationale, evidence }); }}>
      <header><span>{c("decision.eyebrow")}</span><strong>{target.label}</strong></header>
      <label className="knowledge-field"><span>{c("decision.outcome")}</span><select value={outcome} onChange={(event) => setOutcome(event.currentTarget.value as typeof outcome)}>{Object.keys(outcomeLabels).map((value) => <option key={value} value={value}>{c(`label.outcome.${value}` as never)}</option>)}</select></label>
      <fieldset><legend>{c("decision.evidence")}</legend>{evidenceOptions.map((option) => <label key={option}><input type="checkbox" checked={evidence.includes(option)} onChange={(event) => setEvidence((items) => event.currentTarget.checked ? [...new Set([...items, option])] : items.filter((item) => item !== option))} /><span>{c(`label.evidence.${option}` as never)}</span></label>)}</fieldset>
      <label className="knowledge-field"><span>{c("decision.reason")}</span><textarea rows={3} value={rationale} onChange={(event) => setRationale(event.currentTarget.value)} placeholder={c("decision.placeholder")} /></label>
      <footer><button type="button" onClick={onCancel}>{c("decision.cancel")}</button><button className="knowledge-primary" type="submit" disabled={busy || rationale.trim().length < 8}>{c("decision.save")}</button></footer>
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
  const c = useDesignKnowledgeCopy();
  const [title, setTitle] = useState(""); const [url, setUrl] = useState(""); const [sourceType, setSourceType] = useState<DesignResearchSourceInput["sourceType"]>("official-product"); const [observation, setObservation] = useState("");
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="research-source-title" onSubmit={(event) => { event.preventDefault(); void onSave({ id: `source-${task.sources.length + 1}`, title, url, sourceType, observedAt: new Date().toISOString().slice(0, 10), gameplayObservations: [observation], onboardingObservations: [], progressionObservations: [], failureRecoveryObservations: [], doNotCopy: ["不复制名称、角色、美术、音频、文案、代码或具体关卡。"] }); }}>
    <header><span>{c("researchSource.eyebrow")}</span><h2 id="research-source-title">{c("researchSource.title")}</h2></header>
    <label className="knowledge-field"><span>{c("researchSource.sourceTitle")}</span><input value={title} onChange={(event) => setTitle(event.currentTarget.value)} placeholder={c("researchSource.titlePlaceholder")} /></label>
    <label className="knowledge-field"><span>{c("researchSource.url")}</span><input type="url" value={url} onChange={(event) => setUrl(event.currentTarget.value)} placeholder="https://" /></label>
    <label className="knowledge-field"><span>{c("researchSource.type")}</span><select value={sourceType} onChange={(event) => setSourceType(event.currentTarget.value as typeof sourceType)}><option value="official-product">{c("researchSource.officialProduct")}</option><option value="official-rules">{c("researchSource.officialRules")}</option><option value="developer-material">{c("researchSource.developer")}</option><option value="store-listing">{c("researchSource.store")}</option><option value="independent-analysis">{c("researchSource.analysis")}</option><option value="player-evidence">{c("researchSource.player")}</option></select></label>
    <label className="knowledge-field"><span>{c("researchSource.observation")}</span><textarea rows={4} value={observation} onChange={(event) => setObservation(event.currentTarget.value)} placeholder={c("researchSource.placeholder")} /></label>
    <footer><button type="button" onClick={onCancel}>{c("researchSource.cancel")}</button><button className="knowledge-primary" disabled={busy || title.trim().length < 1 || observation.trim().length < 1 || !/^https?:\/\//.test(url)}>{c("researchSource.save")}</button></footer>
  </form>;
}

function ResearchSynthesisForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (input: DesignResearchSynthesisInput) => Promise<void> }) {
  const c = useDesignKnowledgeCopy();
  const [commonLoop, setCommonLoop] = useState(""); const [mechanics, setMechanics] = useState(""); const [relations, setRelations] = useState(""); const [verification, setVerification] = useState(""); const [risks, setRisks] = useState("");
  const ready = [commonLoop, mechanics, relations, verification, risks].every((value) => value.trim().length > 0);
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="research-synthesis-title" onSubmit={(event) => { event.preventDefault(); void onSave({ commonLoop, mechanicHypotheses: splitLines(mechanics), relationshipHypotheses: splitLines(relations), verificationPlan: splitLines(verification), rejectionRisks: splitLines(risks) }); }}>
    <header><span>{c("synthesis.eyebrow")}</span><h2 id="research-synthesis-title">{c("synthesis.title")}</h2></header>
    <label className="knowledge-field"><span>{c("synthesis.loop")}</span><textarea rows={2} value={commonLoop} onChange={(event) => setCommonLoop(event.currentTarget.value)} /></label>
    <label className="knowledge-field"><span>{c("synthesis.mechanics")}</span><textarea rows={3} value={mechanics} onChange={(event) => setMechanics(event.currentTarget.value)} /></label>
    <label className="knowledge-field"><span>{c("synthesis.relations")}</span><textarea rows={3} value={relations} onChange={(event) => setRelations(event.currentTarget.value)} /></label>
    <label className="knowledge-field"><span>{c("synthesis.verification")}</span><textarea rows={3} value={verification} onChange={(event) => setVerification(event.currentTarget.value)} /></label>
    <label className="knowledge-field"><span>{c("synthesis.risks")}</span><textarea rows={3} value={risks} onChange={(event) => setRisks(event.currentTarget.value)} /></label>
    <footer><button type="button" onClick={onCancel}>{c("synthesis.cancel")}</button><button className="knowledge-primary" disabled={busy || !ready}>{c("synthesis.save")}</button></footer>
  </form>;
}

function ResearchCandidateForm({ task, busy, onCancel, onSave }: { task: GameResearchTask; busy: boolean; onCancel: () => void; onSave: (input: DesignResearchCandidateInput) => Promise<void> }) {
  const c = useDesignKnowledgeCopy();
  const [kind, setKind] = useState<DesignResearchCandidateInput["kind"]>("mechanic"); const [family, setFamily] = useState<"movement" | "spatial" | "matching" | "economy" | "combat" | "collection" | "construction" | "information" | "timing" | "social-simulation" | "progression" | "risk-reward">("information"); const [id, setId] = useState(""); const [label, setLabel] = useState(""); const [verb, setVerb] = useState(""); const [detail, setDetail] = useState(""); const [signals, setSignals] = useState(""); const [mechanics, setMechanics] = useState("");
  const save = () => {
    if (kind === "mechanic") return onSave({ kind, artifact: { id, label, family, playerVerb: verb, state: splitTokens(detail), inputs: ["choose"], outputs: ["state-changed"], capabilityIds: ["game-lifecycle", "onboarding", "failure-assistance"], relations: [], tunableDimensions: ["cognition", "combination"], probeSignals: splitTokens(signals) } });
    return onSave({ kind, artifact: { id, label, summary: detail, scope: { dimensions: ["2d"], sessionMinutes: [2, 10], inputs: ["pointer", "touch"] }, tags: splitTokens(signals), coreCapabilityIds: ["game-lifecycle", "onboarding", "difficulty-plan", "failure-assistance"], coreMechanicIds: splitTokens(mechanics), optionalMechanicIds: [], compositionRules: task.synthesis?.relationshipHypotheses ?? ["所有组合规则必须可复现。"], knownRisks: task.synthesis?.rejectionRisks ?? ["仍需运行原型验证。"], evidence: task.sources.slice(0, 2).map((source) => ({ sourceUrl: source.url, observedAt: source.observedAt, signal: "design-analysis" as const, note: source.gameplayObservations[0]! })), lifecycle: "candidate", evaluationVersion: 1 } });
  };
  const ready = id.trim().length > 1 && label.trim().length > 1 && detail.trim().length > 1 && signals.trim().length > 1 && (kind === "mechanic" ? verb.trim().length > 1 : mechanics.trim().length > 1);
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="research-candidate-title" onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <header><span>{c("candidate.eyebrow")}</span><h2 id="research-candidate-title">{c("candidate.title")}</h2></header>
    <label className="knowledge-field"><span>{c("candidate.kind")}</span><select value={kind} onChange={(event) => setKind(event.currentTarget.value as typeof kind)}><option value="mechanic">{c("candidate.mechanic")}</option><option value="pattern">{c("candidate.pattern")}</option></select></label>
    <div className="research-field-pair"><label className="knowledge-field"><span>{c("candidate.id")}</span><input value={id} onChange={(event) => setId(event.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="gravity-switch" /></label><label className="knowledge-field"><span>{c("candidate.label")}</span><input value={label} onChange={(event) => setLabel(event.currentTarget.value)} /></label></div>
    {kind === "mechanic" && <div className="research-field-pair"><label className="knowledge-field"><span>{c("candidate.family")}</span><select value={family} onChange={(event) => setFamily(event.currentTarget.value as typeof family)}><option value="spatial">{c("atlas.family.spatial")}</option><option value="matching">{c("atlas.family.matching")}</option><option value="movement">{c("atlas.family.movement")}</option><option value="economy">{c("atlas.family.economy")}</option><option value="combat">{c("atlas.family.combat")}</option><option value="collection">{c("atlas.family.collection")}</option><option value="construction">{c("atlas.family.construction")}</option><option value="information">{c("atlas.family.information")}</option><option value="timing">{c("atlas.family.timing")}</option><option value="progression">{c("atlas.family.progression")}</option><option value="risk-reward">{c("atlas.family.risk")}</option><option value="social-simulation">{c("atlas.family.social")}</option></select></label><label className="knowledge-field"><span>{c("candidate.verb")}</span><input value={verb} onChange={(event) => setVerb(event.currentTarget.value)} placeholder={c("candidate.verbPlaceholder")} /></label></div>}
    <label className="knowledge-field"><span>{kind === "mechanic" ? c("candidate.state") : c("candidate.summary")}</span><textarea rows={3} value={detail} onChange={(event) => setDetail(event.currentTarget.value)} /></label>
    <label className="knowledge-field"><span>{kind === "mechanic" ? c("candidate.signal") : c("candidate.tags")}</span><input value={signals} onChange={(event) => setSignals(event.currentTarget.value)} /></label>
    {kind === "pattern" && <label className="knowledge-field"><span>{c("candidate.mechanicIds")}</span><input value={mechanics} onChange={(event) => setMechanics(event.currentTarget.value)} /></label>}
    <footer><button type="button" onClick={onCancel}>{c("candidate.cancel")}</button><button className="knowledge-primary" disabled={busy || !ready}>{c("candidate.save")}</button></footer>
  </form>;
}

function ResearchDecisionForm({ task, busy, onCancel, onSave }: { task: GameResearchTask; busy: boolean; onCancel: () => void; onSave: (input: DesignResearchDecisionInput) => Promise<void> }) {
  const c = useDesignKnowledgeCopy();
  const accepted = task.candidateDraft?.kind === "pattern" ? "candidate-pattern" : "candidate-mechanic"; const ready = Boolean(task.evaluation && evaluateResearchPrototype(task.evaluation).ready); const [outcome, setOutcome] = useState<DesignResearchDecisionInput["outcome"]>(ready ? accepted : "no-adoption"); const [rationale, setRationale] = useState("");
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="research-decision-title" onSubmit={(event) => { event.preventDefault(); void onSave({ outcome, rationale }); }}><header><span>{c("researchDecision.eyebrow")}</span><h2 id="research-decision-title">{c("researchDecision.title")}</h2></header>{!ready && <p className="evaluation-warning">{c("researchDecision.warning")}</p>}<label className="knowledge-field"><span>{c("researchDecision.outcome")}</span><select value={outcome} onChange={(event) => setOutcome(event.currentTarget.value as typeof outcome)}>{ready && <option value={accepted}>{c(task.candidateDraft?.kind === "pattern" ? "researchDecision.acceptPattern" : "researchDecision.acceptMechanic")}</option>}<option value="no-adoption">{c("researchDecision.reject")}</option></select></label><label className="knowledge-field"><span>{c("researchDecision.reason")}</span><textarea rows={4} value={rationale} onChange={(event) => setRationale(event.currentTarget.value)} /></label><footer><button type="button" onClick={onCancel}>{c("researchDecision.cancel")}</button><button className="knowledge-primary" disabled={busy || rationale.trim().length < 8}>{c("researchDecision.save")}</button></footer></form>;
}

function ResearchResourceSubmissionForm({ task, requirementId, busy, onCancel, onSave }: { task: GameResearchTask; requirementId: string; busy: boolean; onCancel: () => void; onSave: (input: DesignResearchResourceSubmissionInput) => Promise<void> }) {
  const c = useDesignKnowledgeCopy();
  const item = task.evaluation!.resourceAcquisitionTask!.items.find((candidate) => candidate.requirementId === requirementId)!;
  const [note, setNote] = useState(""); const [artifact, setArtifact] = useState(""); const [generatedOutput, setGeneratedOutput] = useState(""); const [visual, setVisual] = useState(""); const [runtime, setRuntime] = useState(""); const [licenseRecord, setLicenseRecord] = useState(""); const [licenseId, setLicenseId] = useState(""); const [sourceUrl, setSourceUrl] = useState(""); const [obligations, setObligations] = useState("");
  const procedural = item.route === "procedural-generate"; const procure = item.route === "procure";
  const ready = note.trim().length >= 8 && artifact.trim() && (!procedural || generatedOutput.trim()) && visual.trim() && runtime.trim() && (!procure || (licenseRecord.trim() && licenseId.trim() && /^https?:\/\//.test(sourceUrl)));
  const save = () => onSave({ note, evidence: [{ kind: procedural ? "generator-config" : "resource-file", reference: artifact, note: procedural ? "生成配置已经归档" : "资源文件已经归档" }, ...(procedural ? [{ kind: "resource-file" as const, reference: generatedOutput, note: "实际生成产物已经归档" }] : []), ...(procure ? [{ kind: "license-record" as const, reference: licenseRecord, note: "许可记录已经独立归档" }] : []), { kind: "visual-review", reference: visual, note: "视觉复核结果已经归档" }, { kind: "runtime-report", reference: runtime, note: "运行时验收结果已经归档" }], verifiedLicense: procure ? { licenseId, sourceUrl, obligations: splitLines(obligations) } : undefined });
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="resource-submit-title" onSubmit={(event) => { event.preventDefault(); void save(); }}><header><span>{c("resourceSubmit.eyebrow")}</span><h2 id="resource-submit-title">{c(item.submissions.length ? "resourceSubmit.resubmit" : "resourceSubmit.title")}</h2><small>{item.title}</small></header><label className="knowledge-field"><span>{c(procedural ? "resourceSubmit.generatorRef" : "resourceSubmit.fileRef")}</span><input value={artifact} onChange={(event) => setArtifact(event.currentTarget.value)} placeholder="_studio/evidence/resource.json" /></label>{procedural && <label className="knowledge-field"><span>{c("resourceSubmit.outputRef")}</span><input value={generatedOutput} onChange={(event) => setGeneratedOutput(event.currentTarget.value)} placeholder="assets/generated/output.png" /></label>}{procure && <><label className="knowledge-field"><span>{c("resourceSubmit.licenseRef")}</span><input value={licenseRecord} onChange={(event) => setLicenseRecord(event.currentTarget.value)} placeholder="_studio/licenses/source.json" /></label><div className="research-field-pair"><label className="knowledge-field"><span>{c("resourceSubmit.licenseId")}</span><input value={licenseId} onChange={(event) => setLicenseId(event.currentTarget.value)} placeholder="CC-BY-4.0" /></label><label className="knowledge-field"><span>{c("resourceSubmit.officialSource")}</span><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.currentTarget.value)} placeholder="https://" /></label></div><label className="knowledge-field"><span>{c("resourceSubmit.obligations")}</span><textarea rows={2} value={obligations} onChange={(event) => setObligations(event.currentTarget.value)} /></label></>}<div className="research-field-pair"><label className="knowledge-field"><span>{c("resourceSubmit.visualRef")}</span><input value={visual} onChange={(event) => setVisual(event.currentTarget.value)} placeholder="_studio/reviews/visual.json" /></label><label className="knowledge-field"><span>{c("resourceSubmit.runtimeRef")}</span><input value={runtime} onChange={(event) => setRuntime(event.currentTarget.value)} placeholder="_studio/reports/runtime.json" /></label></div><label className="knowledge-field"><span>{c("resourceSubmit.resultNote")}</span><textarea rows={3} value={note} onChange={(event) => setNote(event.currentTarget.value)} placeholder={c("resourceSubmit.resultPlaceholder")} /></label><footer><button type="button" onClick={onCancel}>{c("resourceSubmit.cancel")}</button><button className="knowledge-primary" disabled={busy || !ready}>{c("resourceSubmit.save")}</button></footer></form>;
}

function ResearchResourceReviewForm({ task, requirementId, decision, busy, onCancel, onSave }: { task: GameResearchTask; requirementId: string; decision: "approve" | "return"; busy: boolean; onCancel: () => void; onSave: (input: DesignResearchResourceReviewInput) => Promise<void> }) {
  const c = useDesignKnowledgeCopy();
  const item = task.evaluation!.resourceAcquisitionTask!.items.find((candidate) => candidate.requirementId === requirementId)!; const [rationale, setRationale] = useState("");
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="resource-review-title" onSubmit={(event) => { event.preventDefault(); void onSave({ decision, rationale }); }}><header><span>{c("resourceReview.eyebrow")}</span><h2 id="resource-review-title">{c(decision === "approve" ? "resourceReview.approveTitle" : "resourceReview.returnTitle")}</h2><small>{item.title} · {c("resourceReview.submission", { count: item.submissions.length })}</small></header><p className="resource-review-notice">{c(decision === "approve" ? "resourceReview.approveNotice" : "resourceReview.returnNotice")}</p><label className="knowledge-field"><span>{c("resourceReview.reason")}</span><textarea rows={4} value={rationale} onChange={(event) => setRationale(event.currentTarget.value)} placeholder={c("resourceReview.reasonPlaceholder")} /></label><footer><button type="button" onClick={onCancel}>{c("resourceReview.cancel")}</button><button className="knowledge-primary" disabled={busy || rationale.trim().length < 8}>{c(decision === "approve" ? "resourceReview.confirmApprove" : "resourceReview.confirmReturn")}</button></footer></form>;
}

function ResearchResourceSecurityReviewForm({ task, busy, onCancel, onSave }: { task: GameResearchTask; busy: boolean; onCancel: () => void; onSave: (input: DesignResearchResourceSecurityReviewInput) => Promise<void> }) {
  const c = useDesignKnowledgeCopy();
  const batch = task.evaluation!.resourceIntakeBatch!; const [reviewer, setReviewer] = useState(""); const [malware, setMalware] = useState(true); const [sensitiveContent, setSensitiveContent] = useState(true); const [rationale, setRationale] = useState("");
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="resource-security-title" onSubmit={(event) => { event.preventDefault(); void onSave({ reviewer, malware: malware ? "pass" : "fail", sensitiveContent: sensitiveContent ? "pass" : "fail", rationale }); }}><header><span>{c("security.eyebrow")}</span><h2 id="resource-security-title">{c("security.title")}</h2><small>{c("security.files", { files: batch.summary.files, bytes: batch.summary.bytes })}</small></header><label className="knowledge-field"><span>{c("security.reviewer")}</span><input value={reviewer} onChange={(event) => setReviewer(event.currentTarget.value)} placeholder={c("security.reviewerPlaceholder")} /></label><fieldset><legend>{c("security.checks")}</legend><label><input type="checkbox" checked={malware} onChange={(event) => setMalware(event.currentTarget.checked)} /><span>{c("security.malware")}</span></label><label><input type="checkbox" checked={sensitiveContent} onChange={(event) => setSensitiveContent(event.currentTarget.checked)} /><span>{c("security.sensitive")}</span></label></fieldset>{(!malware || !sensitiveContent) && <p className="evaluation-warning">{c("security.warning")}</p>}<label className="knowledge-field"><span>{c("security.rationale")}</span><textarea rows={4} value={rationale} onChange={(event) => setRationale(event.currentTarget.value)} placeholder={c("security.rationalePlaceholder")} /></label><footer><button type="button" onClick={onCancel}>{c("security.cancel")}</button><button className="knowledge-primary" disabled={busy || reviewer.trim().length < 1 || rationale.trim().length < 8}>{c(malware && sensitiveContent ? "security.save" : "security.reject")}</button></footer></form>;
}

function ResearchProbeForm({ task, busy, onCancel, onSave }: { task: GameResearchTask; busy: boolean; onCancel: () => void; onSave: (input: DesignResearchProbeRunInput) => Promise<void> }) {
  const c = useDesignKnowledgeCopy();
  const evaluation = task.evaluation!; const [signalId, setSignalId] = useState(evaluation.requiredProbeSignals[0] ?? ""); const [status, setStatus] = useState<DesignResearchProbeRunInput["status"]>("passed"); const [observation, setObservation] = useState("");
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="research-probe-title" onSubmit={(event) => { event.preventDefault(); void onSave({ signalId, status, observation }); }}><header><span>{c("probe.eyebrow")}</span><h2 id="research-probe-title">{c("probe.title")}</h2></header><label className="knowledge-field"><span>{c("probe.signal")}</span><select value={signalId} onChange={(event) => setSignalId(event.currentTarget.value)}>{evaluation.requiredProbeSignals.map((signal) => <option key={signal}>{signal}</option>)}</select></label><label className="knowledge-field"><span>{c("probe.result")}</span><select value={status} onChange={(event) => setStatus(event.currentTarget.value as typeof status)}><option value="passed">{c("probe.pass")}</option><option value="failed">{c("probe.fail")}</option></select></label><label className="knowledge-field"><span>{c("probe.observation")}</span><textarea rows={4} value={observation} onChange={(event) => setObservation(event.currentTarget.value)} placeholder={c("probe.placeholder")} /></label><footer><button type="button" onClick={onCancel}>{c("probe.cancel")}</button><button className="knowledge-primary" disabled={busy || observation.trim().length < 1}>{c("probe.save")}</button></footer></form>;
}

function ResearchBrowserForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (input: DesignResearchBrowserRunInput) => Promise<void> }) {
  const c = useDesignKnowledgeCopy();
  const [deviceClass, setDeviceClass] = useState<DesignResearchBrowserRunInput["deviceClass"]>("desktop"); const [url, setUrl] = useState(""); const [status, setStatus] = useState<DesignResearchBrowserRunInput["status"]>("passed"); const [interactionCompleted, setInteractionCompleted] = useState(true); const [consoleErrorCount, setConsoleErrorCount] = useState(0); const [accessibilityViolationCount, setAccessibilityViolationCount] = useState(0); const [observation, setObservation] = useState("");
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="research-browser-title" onSubmit={(event) => { event.preventDefault(); void onSave({ deviceClass, url, viewport: deviceClass === "desktop" ? "1280x800" : "390x844", status, interactionCompleted, consoleErrorCount, accessibilityViolationCount, observation }); }}><header><span>{c("browser.eyebrow")}</span><h2 id="research-browser-title">{c("browser.title")}</h2></header><div className="research-field-pair"><label className="knowledge-field"><span>{c("browser.device")}</span><select value={deviceClass} onChange={(event) => setDeviceClass(event.currentTarget.value as typeof deviceClass)}><option value="desktop">{c("browser.desktop")}</option><option value="mobile">{c("browser.mobile")}</option></select></label><label className="knowledge-field"><span>{c("browser.status")}</span><select value={status} onChange={(event) => setStatus(event.currentTarget.value as typeof status)}><option value="passed">{c("browser.pass")}</option><option value="failed">{c("browser.fail")}</option></select></label></div><label className="knowledge-field"><span>{c("browser.url")}</span><input type="url" value={url} onChange={(event) => setUrl(event.currentTarget.value)} placeholder={c("browser.placeholder")} /></label><label className="replay-check"><input type="checkbox" checked={interactionCompleted} onChange={(event) => setInteractionCompleted(event.currentTarget.checked)} /><span>{c("browser.interaction")}</span></label><div className="research-field-pair"><label className="knowledge-field"><span>{c("browser.console")}</span><input type="number" min="0" value={consoleErrorCount} onChange={(event) => setConsoleErrorCount(Number(event.currentTarget.value))} /></label><label className="knowledge-field"><span>{c("browser.a11y")}</span><input type="number" min="0" value={accessibilityViolationCount} onChange={(event) => setAccessibilityViolationCount(Number(event.currentTarget.value))} /></label></div><label className="knowledge-field"><span>{c("browser.observation")}</span><textarea rows={3} value={observation} onChange={(event) => setObservation(event.currentTarget.value)} /></label><footer><button type="button" onClick={onCancel}>{c("browser.cancel")}</button><button className="knowledge-primary" disabled={busy || !/^https?:\/\//.test(url) || observation.trim().length < 1}>{c("browser.save")}</button></footer></form>;
}

function ResearchPlaytestForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (input: DesignResearchPlaytestInput) => Promise<void> }) {
  const c = useDesignKnowledgeCopy();
  const [testerSegment, setTesterSegment] = useState<DesignResearchPlaytestInput["testerSegment"]>("novice"); const [taskOutcome, setTaskOutcome] = useState<DesignResearchPlaytestInput["taskOutcome"]>("completed"); const [ratings, setRatings] = useState({ onboardingClarity: 3, controlClarity: 3, funRating: 3, fairnessRating: 3 }); const [wouldReplay, setWouldReplay] = useState(true); const [blockerCode, setBlockerCode] = useState<DesignResearchPlaytestInput["blockerCode"]>("none");
  useEffect(() => setBlockerCode(taskOutcome === "completed" ? "none" : "onboarding"), [taskOutcome]);
  return <form className="decision-form research-form" role="dialog" aria-modal="true" aria-labelledby="research-playtest-title" onSubmit={(event) => { event.preventDefault(); void onSave({ testerSegment, taskOutcome, ...ratings, wouldReplay, blockerCode }); }}><header><span>{c("researchPlaytest.eyebrow")}</span><h2 id="research-playtest-title">{c("researchPlaytest.title")}</h2></header><div className="research-field-pair"><label className="knowledge-field"><span>{c("researchPlaytest.experience")}</span><select value={testerSegment} onChange={(event) => setTesterSegment(event.currentTarget.value as typeof testerSegment)}><option value="novice">{c("researchPlaytest.novice")}</option><option value="casual">{c("researchPlaytest.casual")}</option><option value="experienced">{c("researchPlaytest.experienced")}</option></select></label><label className="knowledge-field"><span>{c("researchPlaytest.outcome")}</span><select value={taskOutcome} onChange={(event) => setTaskOutcome(event.currentTarget.value as typeof taskOutcome)}><option value="completed">{c("researchPlaytest.completed")}</option><option value="partial">{c("researchPlaytest.partial")}</option><option value="blocked">{c("researchPlaytest.blocked")}</option><option value="abandoned">{c("researchPlaytest.abandoned")}</option></select></label></div><div className="prototype-rating-grid"><Rating label={c("researchPlaytest.onboarding")} value={ratings.onboardingClarity} onChange={(value) => setRatings((state) => ({ ...state, onboardingClarity: value }))}/><Rating label={c("researchPlaytest.controls")} value={ratings.controlClarity} onChange={(value) => setRatings((state) => ({ ...state, controlClarity: value }))}/><Rating label={c("researchPlaytest.fun")} value={ratings.funRating} onChange={(value) => setRatings((state) => ({ ...state, funRating: value }))}/><Rating label={c("researchPlaytest.fairness")} value={ratings.fairnessRating} onChange={(value) => setRatings((state) => ({ ...state, fairnessRating: value }))}/></div>{taskOutcome !== "completed" && <label className="knowledge-field"><span>{c("researchPlaytest.blocker")}</span><select value={blockerCode} onChange={(event) => setBlockerCode(event.currentTarget.value as typeof blockerCode)}><option value="onboarding">{c("researchPlaytest.onboarding")}</option><option value="controls">{c("researchPlaytest.controls")}</option><option value="rules">{c("researchPlaytest.rules")}</option><option value="difficulty">{c("researchPlaytest.difficulty")}</option><option value="resource">{c("researchPlaytest.resource")}</option><option value="performance">{c("researchPlaytest.performance")}</option><option value="accessibility">{c("researchPlaytest.a11y")}</option></select></label>}<label className="replay-check"><input type="checkbox" checked={wouldReplay} onChange={(event) => setWouldReplay(event.currentTarget.checked)} /><span>{c("researchPlaytest.replay")}</span></label><footer><button type="button" onClick={onCancel}>{c("researchPlaytest.cancel")}</button><button className="knowledge-primary" disabled={busy}>{c("researchPlaytest.save")}</button></footer></form>;
}

function ResearchTaskCard({ task, hasChangeSet, busy, onAction, onCreateEvaluation, onCreateAcquisition, onIntakeResources, onPromoteResources, onRunEvaluation, onCreateChangeSet }: { task: GameResearchTask; hasChangeSet: boolean; busy: boolean; onAction: (action: ResearchAction) => void; onCreateEvaluation: (task: GameResearchTask) => void; onCreateAcquisition: (task: GameResearchTask) => void; onIntakeResources: (task: GameResearchTask) => void; onPromoteResources: (task: GameResearchTask) => void; onRunEvaluation: (task: GameResearchTask) => void; onCreateChangeSet: (task: GameResearchTask) => void }) {
  const c = useDesignKnowledgeCopy();
  const stamps = [{ label: c("task.stamp.sources"), done: task.sources.length >= 3, value: `${task.sources.length}/3` }, { label: c("task.stamp.synthesis"), done: Boolean(task.synthesis), value: c(task.synthesis ? "task.stamp.done" : "task.stamp.todo") }, { label: c("task.stamp.candidate"), done: Boolean(task.candidateDraft), value: c(task.candidateDraft?.kind === "pattern" ? "task.stamp.pattern" : task.candidateDraft ? "task.stamp.mechanic" : "task.stamp.todo") }, { label: c("task.stamp.decision"), done: Boolean(task.decision), value: c(task.status === "accepted" ? "task.stamp.accepted" : task.status === "rejected" ? "task.stamp.rejected" : "task.stamp.todo") }];
  const readiness = task.evaluation ? evaluateResearchPrototype(task.evaluation) : null;
  const latestProbes = new Map(task.evaluation?.probeRuns.filter(({ recordedBy }) => recordedBy === "automatic").map((run) => [run.signalId, run]));
  const latestBrowsers = new Map(task.evaluation?.browserRuns.filter(({ recordedBy }) => recordedBy === "automatic").map((run) => [run.deviceClass, run]));
  const prototypeUrl = [...latestBrowsers.values()].at(-1)?.url;
  const gates = task.evaluation ? [{ label: c("task.gate.contract"), done: true, value: c("task.gate.generated") }, { label: c("task.gate.resources"), done: readiness!.resources, value: task.evaluation.resourceGapSummary ? c("common.count", { count: task.evaluation.resourceGapSummary.total }) : c("task.gate.compatible") }, { label: c("task.gate.probes"), done: readiness!.probes, value: `${[...latestProbes.values()].filter(({ status }) => status === "passed").length}/${task.evaluation.requiredProbeSignals.length}` }, { label: c("task.gate.browser"), done: readiness!.browser, value: `${[...latestBrowsers.values()].filter(({ status, interactionCompleted, consoleErrorCount, accessibilityViolationCount }) => status === "passed" && interactionCompleted && consoleErrorCount === 0 && accessibilityViolationCount === 0).length}/2` }, { label: c("task.gate.playtest"), done: readiness!.playtest, value: `${Math.min(task.evaluation.playtests.length, 3)}/3` }] : [];
  const resourceGap = task.evaluation?.resourceGapSummary;
  const resourcePlan = task.evaluation?.resourceAcquisitionPlan;
  const acquisitionTask = task.evaluation?.resourceAcquisitionTask;
  const intakeBatch = task.evaluation?.resourceIntakeBatch;
  const promotedFamilyIds = task.evaluation?.promotedResourceFamilyIds ?? [];
  return <article className={`research-passport status-${task.status}`}>
    <header><div><span>{c(task.status === "accepted" ? "task.status.accepted" : task.status === "rejected" ? "task.status.rejected" : task.status === "review" ? "task.status.review" : "task.status.researching")}</span><h3>{task.queryIntent}</h3><small>{task.id}</small></div><BookOpen size={20}/></header>
    <div className="passport-stamps">{stamps.map((stamp) => <div className={stamp.done ? "is-done" : ""} key={stamp.label}><span>{stamp.label}</span><strong>{stamp.value}</strong></div>)}</div>
    {task.evaluation && <div className="evaluation-gates" role="group" aria-label={c("task.gate.aria")}>{gates.map((gate) => <div className={gate.done ? "is-done" : ""} key={gate.label}><span>{gate.done ? <Check size={12}/> : <i/>}{gate.label}</span><strong>{gate.value}</strong></div>)}{readiness?.ready ? <b>{c("task.gate.ready")}</b> : <small>{readiness?.reasons[0]}</small>}</div>}
    {resourceGap && <div className="research-resource-ledger" role="group" aria-label={c("task.resource.aria")}>
      <span>{c("task.resource.ledger")}</span>
      <dl><div><dt>{c("task.resource.prototype")}</dt><dd>{resourceGap.prototypeReady ? c("task.resource.placeholder") : c("task.resource.gap", { count: resourceGap.prototypeRequired })}</dd></div><div><dt>{c("task.resource.beforeReview")}</dt><dd>{c("common.count", { count: resourceGap.reviewMissing })}</dd></div><div><dt>{c("task.resource.beforePublish")}</dt><dd>{c("common.count", { count: resourceGap.publishMissing })}</dd></div></dl>
      {resourcePlan && <div className="research-acquisition-summary"><strong>{c("task.resource.plan")}</strong><p><span>{c("task.resource.reuse", { count: resourcePlan.summary.reuseExisting })}</span><span>{c("task.resource.procedural", { count: resourcePlan.summary.proceduralGenerate })}</span><span>{c("task.resource.procure", { count: resourcePlan.summary.procure })}</span><span>{c("task.resource.create", { count: resourcePlan.summary.create })}</span></p><small>{resourcePlan.summary.licenseReview > 0 ? c("task.resource.licensePending", { count: resourcePlan.summary.licenseReview }) : c("task.resource.licenseVerified")}</small><details><summary>{c("task.resource.details", { count: resourcePlan.summary.total })}</summary><ul>{resourcePlan.decisions.map((decision) => <li key={decision.requirementId}><div><strong>{c(`label.resourceRole.${decision.role}` as never)}</strong><span>{c(`label.acquisitionRoute.${decision.route === "reuse-existing" ? "reuse" : decision.route === "procedural-generate" ? "procedural" : decision.route}` as never)}</span></div><small>{decision.selectedFamilyId ? `${c(decision.route === "create" ? "task.resource.structureReference" : "task.resource.family")} ${decision.selectedFamilyId} · ` : ""}{decision.license.status === "verified" ? `${decision.license.licenseId} ${c("task.resource.verified")}` : decision.license.status === "pending" ? c("task.resource.pending") : c("task.resource.owned")}</small></li>)}</ul></details></div>}
      {acquisitionTask && <div className="research-acquisition-task"><strong><Check size={13}/>{c("task.resource.taskTitle")}：{c(acquisitionTask.status === "completed" ? "task.resource.completed" : "task.resource.tracking")}</strong><p><span>{c("task.resource.submitted", { count: acquisitionTask.summary.submitted })}</span><span>{c("task.resource.approved", { count: acquisitionTask.summary.approved })}</span><span>{c("task.resource.returned", { count: acquisitionTask.summary.returned })}</span><span>{c("task.resource.total", { count: acquisitionTask.summary.total })}</span></p><details><summary>{c("task.resource.tasks", { count: acquisitionTask.summary.total })}</summary><ul>{acquisitionTask.items.map((item) => <li key={item.id}><div><strong>{item.title}</strong><span>{c(`label.acquisitionState.${item.state === "prototype-ready" ? "prototype" : item.state === "awaiting-binding-approval" ? "binding" : item.state === "awaiting-license-review" ? "license" : item.state === "awaiting-asset-review" ? "asset" : item.state === "submitted-for-review" ? "review" : item.state}` as never)}</span></div><small>{item.checklist[0]}；{c("task.resource.completionRule", { rule: item.completionRule })}</small>{item.submissions.length > 0 && <small>{c("task.resource.submissionCount", { submissions: item.submissions.length, reviews: item.reviews.length })}</small>}<div className="resource-work-actions">{item.state !== "submitted-for-review" && item.state !== "approved" && <button type="button" onClick={() => onAction({ task, kind: "resource-submit", requirementId: item.requirementId })}>{c(item.state === "returned" ? "task.resource.resubmit" : "task.resource.submit")}</button>}{item.state === "submitted-for-review" && <><button type="button" className="knowledge-primary" onClick={() => onAction({ task, kind: "resource-review", requirementId: item.requirementId, decision: "approve" })}>{c("task.resource.approve")}</button><button type="button" onClick={() => onAction({ task, kind: "resource-review", requirementId: item.requirementId, decision: "return" })}>{c("task.resource.return")}</button></>}</div></li>)}</ul></details><small>{acquisitionTask.safetyBoundaries[0]}</small></div>}
      {intakeBatch && <div className={`research-intake-batch status-${intakeBatch.status}`}><strong>{c(intakeBatch.status === "approved" ? "task.resource.intakeApproved" : intakeBatch.status === "rejected" ? "task.resource.intakeRejected" : "task.resource.intakeCreated")}</strong><p>{c("task.resource.intakeSummary", { files: intakeBatch.summary.files, security: intakeBatch.summary.awaitingSecurityReview, bindings: intakeBatch.summary.approvedBindings })}</p><small>{c("task.resource.intakeDetail")}</small>{intakeBatch.status === "awaiting-security-review" && <button type="button" onClick={() => onAction({ task, kind: "resource-intake-review" })}>{c("task.resource.securityReview")}</button>}</div>}
      {promotedFamilyIds.length > 0 && <div className="research-promoted-families"><strong>{c("task.resource.promoted", { count: promotedFamilyIds.length })}</strong><small>{c("task.resource.promotedDetail")}</small></div>}
      <small>{c("task.resource.boundary")}</small>
    </div>}
    {task.sources.length > 0 && <div className="research-sources">{task.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>{source.title}<ExternalLink size={11}/></a>)}{prototypeUrl && <a className="prototype-link" href={prototypeUrl} target="_blank" rel="noreferrer">{c("task.resource.openPrototype")}<ExternalLink size={11}/></a>}</div>}
    <footer>
      {(task.status === "queued" || task.status === "researching") && <button onClick={() => onAction({ task, kind: "source" })}>{c("task.resource.source")}</button>}
      {task.status === "researching" && task.sources.length >= 3 && <button onClick={() => onAction({ task, kind: "synthesis" })}>{c("task.resource.synthesis")}</button>}
      {task.status === "review" && !task.candidateDraft && <button onClick={() => onAction({ task, kind: "candidate" })}>{c("task.resource.candidate")}</button>}
      {task.status === "review" && task.candidateDraft && !task.evaluation && <button className="knowledge-primary" disabled={busy} onClick={() => onCreateEvaluation(task)}>{c("task.resource.evaluation")}</button>}
      {task.status === "review" && task.evaluation && <><button className="knowledge-primary" disabled={busy} onClick={() => onRunEvaluation(task)}>{c(readiness?.probes && readiness.browser ? "task.resource.rerun" : "task.resource.run")}</button><button onClick={() => onAction({ task, kind: "prototype-playtest" })}>{c("task.resource.playtest")}</button></>}
      {task.status === "review" && resourcePlan && !acquisitionTask && <button disabled={busy} onClick={() => onCreateAcquisition(task)}>{c("task.resource.createAcquisition")}</button>}
      {acquisitionTask && <span className="decision-saved"><Check size={14}/>{c("task.resource.acquisitionReady")}</span>}
      {acquisitionTask?.status === "completed" && !intakeBatch && <button className="knowledge-primary" disabled={busy} onClick={() => onIntakeResources(task)}>{c("task.resource.intake")}</button>}
      {intakeBatch?.status === "approved" && promotedFamilyIds.length === 0 && <button className="knowledge-primary" disabled={busy} onClick={() => onPromoteResources(task)}>{c("task.resource.promote")}</button>}
      {task.status === "review" && task.candidateDraft && <button onClick={() => onAction({ task, kind: "decision" })}>{c(readiness?.ready ? "task.resource.adopt" : "task.resource.stop")}</button>}
      {task.status === "accepted" && !hasChangeSet && <button className="knowledge-primary" disabled={busy} onClick={() => onCreateChangeSet(task)}>{c("task.resource.createChange")}</button>}
      {hasChangeSet && <span className="decision-saved"><Check size={14}/>{c("task.resource.enteredRelease")}</span>}
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
  const c = useDesignKnowledgeCopy();
  const { locale } = usePreferences();
  return (
    <article className={`change-set-card status-${changeSet.status}`}>
      <header><span>{c(`label.status.${changeSet.status}` as never)}</span><time>{formatDate(changeSet.createdAt, locale)}</time></header>
      <h3>{c("change.title", { count: changeSet.changes.length })}</h3>
      <ul>{changeSet.changes.map((change) => {
        if ("kind" in change && change.kind === "add-mechanic") return <li key={`mechanic:${change.mechanic.id}`}><strong>{change.mechanic.label}</strong><span>{c("change.externalResearch")} <ChevronRight size={13}/> {c("change.candidateMechanic")}</span></li>;
        if ("kind" in change && change.kind === "add-pattern") return <li key={`pattern:${change.pattern.id}`}><strong>{change.pattern.label}</strong><span>{c("change.externalResearch")} <ChevronRight size={13}/> {c("change.candidatePattern")}</span></li>;
        return <li key={change.patternId}><strong>{change.patternId}</strong><span>{change.fromLifecycle} <ChevronRight size={13} /> {change.toLifecycle}</span></li>;
      })}</ul>
      <footer>
        {changeSet.status === "pending" && <><button onClick={() => onReview(changeSet, "reject")} disabled={busy}>{c("change.reject")}</button><button className="knowledge-primary" onClick={() => onReview(changeSet, "approve")} disabled={busy}>{c("change.approve")}</button></>}
        {(changeSet.status === "approved" || changeSet.status === "published") && <button onClick={() => onExport(changeSet)} disabled={busy}><Download size={15} />{c("change.export")}</button>}
        {changeSet.status === "approved" && <button className="knowledge-primary" onClick={() => onPublish(changeSet)} disabled={busy}><Upload size={15} />{c("change.publish")}</button>}
      </footer>
    </article>
  );
}

function RollbackForm({ release, busy, onCancel, onSave }: { release: DesignKnowledgeRelease; busy: boolean; onCancel: () => void; onSave: (rationale: string) => Promise<void> }) {
  const c = useDesignKnowledgeCopy();
  const [rationale, setRationale] = useState("");
  return <form className="decision-form rollback-form" role="dialog" aria-modal="true" aria-labelledby="rollback-title" onSubmit={(event) => { event.preventDefault(); void onSave(rationale); }}>
    <header><span>{c("rollback.eyebrow")}</span><h2 id="rollback-title">{c("rollback.title", { sequence: release.sequence })}</h2></header>
    <p>{c("rollback.detail")}</p>
    <label className="knowledge-field"><span>{c("rollback.reason")}</span><textarea rows={4} value={rationale} onChange={(event) => setRationale(event.currentTarget.value)} placeholder={c("rollback.placeholder")} /></label>
    <footer><button type="button" onClick={onCancel}>{c("rollback.cancel")}</button><button className="knowledge-primary" type="submit" disabled={busy || rationale.trim().length < 8}><RotateCcw size={15}/>{c("rollback.save")}</button></footer>
  </form>;
}

export function DesignKnowledgeConsole() {
  const c = useDesignKnowledgeCopy();
  const { locale } = usePreferences();
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
  useEffect(() => { let active = true; reload().catch((caught) => { if (active) setError(readableError(caught, c)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  useEffect(() => { document.title = c("main.documentTitle"); return () => { document.title = c("main.defaultTitle"); }; }, [c, locale]);

  const run = async (key: string, action: () => Promise<void>, success: string) => {
    setBusy(key); setError(""); setNotice("");
    try { await action(); await reload(); setNotice(success); }
    catch (caught) { setError(readableError(caught, c)); }
    finally { setBusy(""); }
  };

  const downloadExport = async (changeSet: DesignKnowledgeChangeSet) => {
    await run(`export:${changeSet.id}`, async () => {
      const payload = await exportDesignKnowledgeChangeSet(changeSet.id);
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `design-knowledge-${changeSet.id}.json`; anchor.click(); URL.revokeObjectURL(url);
    }, c("main.notice.export"));
  };

  if (loading) return <div className="knowledge-console-state" role="status"><LoaderCircle className="spin" />{c("common.loading")}</div>;
  return (
    <div className="app-shell knowledge-console-shell">
      <SiteHeader active="knowledge" />
      <main className="knowledge-console" id="main-content" tabIndex={-1}>
        <header className="knowledge-hero">
          <div><p className="eyebrow">{c("main.eyebrow")}</p><h1>{c("main.title")}</h1><p>{c("main.detail")}</p></div>
          <aside aria-label={c("main.currentVersion")}><span>{c("main.currentVersion")}</span><strong>{latestRelease ? `R${latestRelease.sequence}` : c("main.builtinBaseline")}</strong><small>{latestRelease ? `${formatDate(latestRelease.publishedAt, locale)} · ${latestRelease.checksum.slice(0, 10)}` : c("main.noPublishedVersion")}</small><ShieldCheck size={28} aria-hidden="true" /></aside>
        </header>
        <Rail data={data} />
        {(error || notice) && <div className={error ? "knowledge-message is-error" : "knowledge-message is-success"} role={error ? "alert" : "status"}>{error || notice}</div>}

        <div className="knowledge-action-row">
          <div><strong>{c("main.actionTitle")}</strong><span>{c("main.actionPrivacy")}</span></div>
          <button onClick={() => setShowPlaytest((value) => !value)}><Plus size={16} />{c("main.recordPlaytest")}</button>
          <button className="knowledge-primary" disabled={Boolean(busy)} onClick={() => void run("capture", async () => { await captureDesignKnowledgeReview(); }, c("main.notice.capture"))}>{busy === "capture" ? <LoaderCircle className="spin" size={16} /> : <ClipboardCheck size={16} />}{c("main.capture")}</button>
        </div>
        {showPlaytest && <section className="knowledge-form-panel"><header><span>{c("main.structuredPlaytest")}</span><button onClick={() => setShowPlaytest(false)}>{c("main.close")}</button></header><PlaytestForm projects={data.projects} busy={busy === "playtest"} onSave={(input) => run("playtest", async () => { await recordDesignPlaytest(input); setShowPlaytest(false); }, c("main.notice.playtest"))}/></section>}

        <MechanicAtlasExplorer initial={data.atlas}/>
        <GameplayRadar clusters={data.radar} busy={Boolean(busy)} onAdd={() => setShowRadarForm(true)} onResearch={(cluster) => void run(`radar-research:${cluster.id}`, async () => { await startGameplayRadarResearch(cluster.id, cluster.freshness === "stale"); }, c(cluster.freshness === "stale" ? "main.notice.radarFresh" : cluster.match.kind === "research-task" ? "main.notice.radarMerge" : "main.notice.radarQueue"))} />

        <section className="research-workbench" aria-labelledby="research-title">
          <header><div><span><Search size={14}/> {c("main.researchEyebrow")}</span><h2 id="research-title">{c("main.researchTitle")}</h2><p>{c("main.researchDetail")}</p></div><form onSubmit={(event) => { event.preventDefault(); void run("research-create", async () => { await createDesignResearchTask({ idea: researchIdea }); setResearchIdea(""); }, c("main.notice.researchCreate")); }}><label><span>{c("main.researchIdea")}</span><input value={researchIdea} onChange={(event) => setResearchIdea(event.currentTarget.value)} placeholder={c("main.researchPlaceholder")} /></label><button className="knowledge-primary" disabled={Boolean(busy) || researchIdea.trim().length < 3}><Plus size={15}/>{c("main.createResearch")}</button></form></header>
          {!data.researchTasks.length ? <p className="knowledge-empty">{c("main.researchEmpty")}</p> : <div className="research-passport-list">{data.researchTasks.map((task) => <ResearchTaskCard key={task.id} task={task} hasChangeSet={changeSetByResearch.has(task.id)} busy={Boolean(busy)} onAction={setResearchAction} onCreateEvaluation={(item) => void run(`research-evaluation:${item.id}`, async () => { await createDesignResearchEvaluation(item.id); }, c("main.notice.evaluation")) } onCreateAcquisition={(item) => void run(`research-acquisition:${item.id}`, async () => { await createDesignResearchResourceAcquisitionTask(item.id); }, c("main.notice.acquisition")) } onIntakeResources={(item) => void run(`research-intake:${item.id}`, async () => { await intakeApprovedDesignResearchResources(item.id); }, c("main.notice.intake")) } onPromoteResources={(item) => void run(`research-promotion:${item.id}`, async () => { await promoteDesignResearchResourceFamilies(item.id); }, c("main.notice.promotion")) } onRunEvaluation={(item) => void run(`research-run:${item.id}`, async () => { await runDesignResearchEvaluation(item.id); }, c("main.notice.run")) } onCreateChangeSet={(item) => void run(`research-change:${item.id}`, async () => { await createDesignResearchChangeSet(item.id); }, c("main.notice.change"))}/>)}</div>}
        </section>

        <EvidenceInsights insights={data.insights}/>

        <div className="knowledge-grid">
          <section className="knowledge-review-panel">
            <header><div><span>{c("main.latestReview")}</span><h2>{latestReview ? formatDate(latestReview.createdAt, locale) : c("main.noSnapshot")}</h2></div>{latestReview && <small>{c("main.evidencedPatterns", { count: latestReview.report.patterns.length })}</small>}</header>
            {!latestReview || !latestReview.report.patterns.length ? <p className="knowledge-empty">{c("main.reviewEmpty")}</p> : (
              <div className="pattern-review-list">{latestReview.report.patterns.map((pattern) => {
                const decision = latestReview.decisions.find(({ patternId }) => patternId === pattern.patternId);
                return <article key={pattern.patternId}>
                  <header><div><span className={`recommendation recommendation-${pattern.recommendation}`}>{c(`label.recommendation.${pattern.recommendation === "insufficient-evidence" ? "insufficient" : pattern.recommendation === "promotion-review" ? "promotion" : pattern.recommendation === "manual-review" ? "manual" : pattern.recommendation === "demotion-review" ? "demotion" : "retain"}` as never)}</span><h3>{pattern.label}</h3><small>{pattern.patternId}</small></div><strong>{percent(pattern.metrics.completionRate)}<small>{c("main.completion")}</small></strong></header>
                  <dl><div><dt>{c("main.anonymousPlayers")}</dt><dd>{pattern.samples.distinctPlayers}</dd></div><div><dt>{c("main.starts")}</dt><dd>{pattern.samples.starts}</dd></div><div><dt>{c("main.exits")}</dt><dd>{percent(pattern.metrics.exitRate)}</dd></div><div><dt>{c("main.averageFps")}</dt><dd>{pattern.metrics.averageFps ?? "—"}</dd></div></dl>
                  <p>{pattern.rationale}</p>
                  <footer>{decision ? <span className="decision-saved"><Check size={14} />{c("main.decided", { outcome: c(`label.outcome.${decision.outcome}` as never) })}</span> : <button onClick={() => setDecisionTarget({ reviewId: latestReview.id, patternId: pattern.patternId, label: pattern.label, recommendation: pattern.recommendation })}>{c("main.recordDecision")}</button>}</footer>
                </article>;
              })}</div>
            )}
            {latestReview && latestReview.decisions.some(({ outcome }) => outcome === "promote" || outcome === "demote") && !changeSetByReview.has(latestReview.id) && <button className="create-change-set" disabled={Boolean(busy)} onClick={() => void run("change-set", async () => { await createDesignKnowledgeChangeSet(latestReview.id); }, c("main.notice.change"))}>{c("main.createChange")} <ChevronRight size={16} /></button>}
          </section>

          <aside className="knowledge-release-panel" aria-label={c("main.releaseAria")}>
            <header><span>{c("main.releaseEyebrow")}</span><h2>{c("main.releaseTitle")}</h2></header>
            {!data.changeSets.length ? <p className="knowledge-empty">{c("main.releaseEmpty")}</p> : data.changeSets.map((changeSet) => <ChangeSetCard key={changeSet.id} changeSet={changeSet} busy={Boolean(busy)} onExport={(item) => void downloadExport(item)} onPublish={(item) => { if (window.confirm(c("main.publishConfirm"))) void run(`publish:${item.id}`, async () => { await publishDesignKnowledgeChangeSet(item.id); }, c("main.notice.publish")); }} onReview={(item, decision) => { const defaultReason = c(decision === "approve" ? "main.reviewApproveReason" : "main.reviewRejectReason"); if (window.confirm(c(decision === "approve" ? "main.approveConfirm" : "main.rejectConfirm"))) void run(`review:${item.id}`, async () => { await reviewDesignKnowledgeChangeSet(item.id, decision, defaultReason); }, c(decision === "approve" ? "main.notice.reviewApproved" : "main.notice.reviewRejected")); }} />)}
            {data.releases.length > 0 && <div className="release-history"><h3>{c("main.releaseHistory")}</h3>{data.releases.map((release, index) => <div className={index === 0 ? "is-current" : ""} key={release.id}><span>R{release.sequence}</span><div><strong>{c(index === 0 ? "main.current" : release.kind === "rollback" ? "main.rollbackRelease" : "main.knowledgeChange")}</strong><small>{formatDate(release.publishedAt, locale)} · {release.checksum.slice(0, 10)}</small></div>{index > 0 && <button type="button" onClick={() => setRollbackTarget(release)} disabled={Boolean(busy)}><RotateCcw size={13}/>{c("main.restore")}</button>}</div>)}</div>}
          </aside>
        </div>
      </main>
      {decisionTarget && <div className="knowledge-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDecisionTarget(null); }}><DecisionForm target={decisionTarget} busy={busy === "decision"} onCancel={() => setDecisionTarget(null)} onSave={(input) => run("decision", async () => { await recordDesignKnowledgeDecision(decisionTarget.reviewId, input); setDecisionTarget(null); }, c("main.notice.decision"))}/></div>}
      {rollbackTarget && <div className="knowledge-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRollbackTarget(null); }}><RollbackForm release={rollbackTarget} busy={busy === "rollback"} onCancel={() => setRollbackTarget(null)} onSave={(rationale) => run("rollback", async () => { await rollbackDesignKnowledgeRelease(rollbackTarget.id, rationale); setRollbackTarget(null); }, c("main.notice.rollback", { sequence: rollbackTarget.sequence }))}/></div>}
      {showRadarForm && <div className="knowledge-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowRadarForm(false); }}><GameplayRadarForm busy={busy === "radar-signal"} onCancel={() => setShowRadarForm(false)} onSave={(input) => run("radar-signal", async () => { await addGameplayRadarSignal(input); setShowRadarForm(false); }, c("main.notice.radarSignal"))}/></div>}
      {researchAction && <div className="knowledge-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setResearchAction(null); }}>
        {researchAction.kind === "source" && <ResearchSourceForm task={researchAction.task} busy={busy === "research-source"} onCancel={() => setResearchAction(null)} onSave={(input) => run("research-source", async () => { await addDesignResearchSource(researchAction.task.id, input); setResearchAction(null); }, c("main.notice.source"))}/>}
        {researchAction.kind === "synthesis" && <ResearchSynthesisForm busy={busy === "research-synthesis"} onCancel={() => setResearchAction(null)} onSave={(input) => run("research-synthesis", async () => { await submitDesignResearchSynthesis(researchAction.task.id, input); setResearchAction(null); }, c("main.notice.synthesis"))}/>}
        {researchAction.kind === "candidate" && <ResearchCandidateForm task={researchAction.task} busy={busy === "research-candidate"} onCancel={() => setResearchAction(null)} onSave={(input) => run("research-candidate", async () => { await attachDesignResearchCandidate(researchAction.task.id, input); setResearchAction(null); }, c("main.notice.candidate"))}/>}
        {researchAction.kind === "probe" && <ResearchProbeForm task={researchAction.task} busy={busy === "research-probe"} onCancel={() => setResearchAction(null)} onSave={(input) => run("research-probe", async () => { await recordDesignResearchProbeRun(researchAction.task.id, input); setResearchAction(null); }, c("main.notice.probe"))}/>}
        {researchAction.kind === "browser" && <ResearchBrowserForm busy={busy === "research-browser"} onCancel={() => setResearchAction(null)} onSave={(input) => run("research-browser", async () => { await recordDesignResearchBrowserRun(researchAction.task.id, input); setResearchAction(null); }, c("main.notice.browser"))}/>}
        {researchAction.kind === "prototype-playtest" && <ResearchPlaytestForm busy={busy === "research-prototype-playtest"} onCancel={() => setResearchAction(null)} onSave={(input) => run("research-prototype-playtest", async () => { await recordDesignResearchPlaytest(researchAction.task.id, input); setResearchAction(null); }, c("main.notice.prototypePlaytest"))}/>}
        {researchAction.kind === "decision" && <ResearchDecisionForm task={researchAction.task} busy={busy === "research-decision"} onCancel={() => setResearchAction(null)} onSave={(input) => run("research-decision", async () => { await decideDesignResearchTask(researchAction.task.id, input); setResearchAction(null); }, c(input.outcome === "no-adoption" ? "main.notice.researchRejected" : "main.notice.researchAccepted"))}/>}
        {researchAction.kind === "resource-submit" && <ResearchResourceSubmissionForm task={researchAction.task} requirementId={researchAction.requirementId} busy={busy === "resource-submit"} onCancel={() => setResearchAction(null)} onSave={(input) => run("resource-submit", async () => { await submitDesignResearchResourceWork(researchAction.task.id, researchAction.requirementId, input); setResearchAction(null); }, c("main.notice.resourceSubmit"))}/>}
        {researchAction.kind === "resource-review" && <ResearchResourceReviewForm task={researchAction.task} requirementId={researchAction.requirementId} decision={researchAction.decision} busy={busy === "resource-review"} onCancel={() => setResearchAction(null)} onSave={(input) => run("resource-review", async () => { await reviewDesignResearchResourceWork(researchAction.task.id, researchAction.requirementId, input); setResearchAction(null); }, c(input.decision === "approve" ? "main.notice.resourceApproved" : "main.notice.resourceReturned"))}/>}
        {researchAction.kind === "resource-intake-review" && <ResearchResourceSecurityReviewForm task={researchAction.task} busy={busy === "resource-intake-review"} onCancel={() => setResearchAction(null)} onSave={(input) => run("resource-intake-review", async () => { await reviewDesignResearchResourceIntake(researchAction.task.id, input); setResearchAction(null); }, c(input.malware === "pass" && input.sensitiveContent === "pass" ? "main.notice.intakeApproved" : "main.notice.intakeRejected"))}/>}
      </div>}
    </div>
  );
}
