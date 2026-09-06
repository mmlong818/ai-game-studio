import { z } from "zod";
import type { GameDesignKnowledgeLibrary } from "./index.js";
import { gameResearchTaskSchema, type GameResearchTask } from "./research-queue.js";

const id = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const text = z.string().trim().min(1).max(500);

export const gameplaySignalSchema = z.object({
  gameTitle: z.string().trim().min(1).max(160),
  sourceTitle: text,
  sourceUrl: z.string().url(),
  sourceType: z.enum(["annual-award", "editorial-list", "store-ranking", "developer-update", "community-ranking"]),
  platform: z.enum(["web", "mobile", "desktop", "cross-platform"]),
  observedAt: z.string().date(),
  publishedAt: z.string().date().nullable().default(null),
  signalSummary: text,
  playerVerbs: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
  mechanicTags: z.array(z.string().trim().min(1).max(40)).min(1).max(16),
}).strict();

export const gameplayRadarClusterSchema = z.object({
  schemaVersion: z.literal("gameplay-radar-cluster-v1"),
  id,
  gameTitle: z.string().trim().min(1).max(160),
  normalizedTitle: z.string().min(1).max(160),
  state: z.enum(["watching", "researching", "linked", "dismissed"]),
  signals: z.array(gameplaySignalSchema).min(1),
  researchTaskIds: z.array(id),
  linkedPatternId: id.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export const gameplayRadarResearchInputSchema = z.object({ refresh: z.boolean().default(false) }).strict();

export type GameplaySignal = z.infer<typeof gameplaySignalSchema>;
export type GameplayRadarCluster = z.infer<typeof gameplayRadarClusterSchema>;
export type GameplayRadarFreshness = "fresh" | "aging" | "stale";
export type GameplayRadarMatch = { kind: "research-task" | "knowledge-pattern" | "none"; id: string | null; label: string; score: number; reason: string };
export type GameplayRadarView = GameplayRadarCluster & {
  freshness: GameplayRadarFreshness;
  newestEvidenceAt: string;
  refreshAfter: string;
  distinctSourceCount: number;
  match: GameplayRadarMatch;
};

const freshnessDays: Record<GameplaySignal["sourceType"], number> = {
  "store-ranking": 90,
  "community-ranking": 90,
  "developer-update": 180,
  "editorial-list": 270,
  "annual-award": 420,
};

function stableHash(value: string) {
  return value.split("").reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16_777_619) >>> 0, 2_166_136_261).toString(16).toUpperCase().padStart(8, "0");
}

export function normalizeGameplayTitle(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US").replace(/[\s\p{P}\p{S}]+/gu, "");
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toLocaleLowerCase("en-US")).filter(Boolean))];
}

export function createGameplayRadarCluster(rawSignal: z.input<typeof gameplaySignalSchema>, now = new Date()): GameplayRadarCluster {
  const signal = gameplaySignalSchema.parse(rawSignal);
  const normalizedTitle = normalizeGameplayTitle(signal.gameTitle);
  const timestamp = now.toISOString();
  return gameplayRadarClusterSchema.parse({
    schemaVersion: "gameplay-radar-cluster-v1",
    id: `RADAR-${stableHash(normalizedTitle)}`,
    gameTitle: signal.gameTitle,
    normalizedTitle,
    state: "watching",
    signals: [signal],
    researchTaskIds: [],
    linkedPatternId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function mergeGameplaySignal(cluster: GameplayRadarCluster, rawSignal: z.input<typeof gameplaySignalSchema>, now = new Date()): GameplayRadarCluster {
  const signal = gameplaySignalSchema.parse(rawSignal);
  if (normalizeGameplayTitle(signal.gameTitle) !== cluster.normalizedTitle) throw new Error("玩法信号标题与观察簇不一致");
  const existing = cluster.signals.find(({ sourceUrl }) => sourceUrl === signal.sourceUrl);
  if (existing && JSON.stringify(existing) === JSON.stringify(signal)) return cluster;
  const signals = [...cluster.signals.filter(({ sourceUrl }) => sourceUrl !== signal.sourceUrl), signal]
    .sort((left, right) => right.observedAt.localeCompare(left.observedAt) || left.sourceUrl.localeCompare(right.sourceUrl));
  return gameplayRadarClusterSchema.parse({ ...cluster, signals, updatedAt: now.toISOString() });
}

function effectiveDate(signal: GameplaySignal) {
  return signal.publishedAt ?? signal.observedAt;
}

export function gameplayRadarFreshness(cluster: GameplayRadarCluster, now = new Date()) {
  const latest = cluster.signals.reduce((best, signal) => {
    const expiresAt = new Date(`${effectiveDate(signal)}T00:00:00.000Z`).getTime() + freshnessDays[signal.sourceType] * 86_400_000;
    return expiresAt > best.expiresAt ? { signal, expiresAt } : best;
  }, { signal: cluster.signals[0]!, expiresAt: Number.NEGATIVE_INFINITY });
  const remaining = latest.expiresAt - now.getTime();
  const freshness: GameplayRadarFreshness = remaining < 0 ? "stale" : remaining <= 30 * 86_400_000 ? "aging" : "fresh";
  const newestEvidenceAt = cluster.signals.map(effectiveDate).sort((left, right) => right.localeCompare(left))[0]!;
  return {
    freshness,
    newestEvidenceAt,
    refreshAfter: new Date(latest.expiresAt).toISOString().slice(0, 10),
    distinctSourceCount: new Set(cluster.signals.map(({ sourceUrl }) => new URL(sourceUrl).hostname)).size,
  };
}

function scoreOverlap(left: string[], right: string[]) {
  const a = new Set(unique(left));
  const b = new Set(unique(right));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  a.forEach((value) => { if (b.has(value)) overlap += 1; });
  return overlap / Math.max(a.size, b.size);
}

export function recommendGameplayRadarMatch(cluster: GameplayRadarCluster, tasks: GameResearchTask[], library: GameDesignKnowledgeLibrary): GameplayRadarMatch {
  const verbs = unique(cluster.signals.flatMap(({ playerVerbs }) => playerVerbs));
  const tags = unique(cluster.signals.flatMap(({ mechanicTags }) => mechanicTags));
  const taskMatches = tasks.filter(({ status }) => status === "queued" || status === "researching" || status === "review").map((task) => {
    const score = Math.round(scoreOverlap(verbs, task.playerVerbs) * 70 + scoreOverlap(tags, task.constraints) * 30);
    return { task, score };
  }).sort((a, b) => b.score - a.score);
  const bestTask = taskMatches[0];
  if (bestTask && bestTask.score >= 40) return { kind: "research-task", id: bestTask.task.id, label: bestTask.task.queryIntent, score: bestTask.score, reason: "关键动作与现有研究任务重合，优先合并证据。" };

  const patternMatches = library.patterns.map((pattern) => {
    const mechanics = pattern.coreMechanicIds.flatMap((mechanicId) => {
      const mechanic = library.mechanics.find(({ id: candidate }) => candidate === mechanicId);
      return mechanic ? [mechanic.id, mechanic.family, mechanic.playerVerb] : [mechanicId];
    });
    const score = Math.round(scoreOverlap(tags, [...pattern.tags, ...mechanics]) * 80 + scoreOverlap(verbs, mechanics) * 20);
    return { pattern, score };
  }).sort((a, b) => b.score - a.score);
  const bestPattern = patternMatches[0];
  if (bestPattern && bestPattern.score >= 35) return { kind: "knowledge-pattern", id: bestPattern.pattern.id, label: bestPattern.pattern.label, score: bestPattern.score, reason: "机制标签接近已知玩法；只研究差异，不重复建库。" };
  return { kind: "none", id: null, label: "未发现可靠近邻", score: 0, reason: "需要建立独立研究任务，并从外部来源验证。" };
}

export function buildGameplayRadarView(cluster: GameplayRadarCluster, tasks: GameResearchTask[], library: GameDesignKnowledgeLibrary, now = new Date()): GameplayRadarView {
  return { ...cluster, ...gameplayRadarFreshness(cluster, now), match: recommendGameplayRadarMatch(cluster, tasks, library) };
}

export function createRadarResearchTask(cluster: GameplayRadarCluster, match: GameplayRadarMatch, now = new Date()): GameResearchTask {
  const cycle = now.toISOString().slice(0, 7);
  const timestamp = now.toISOString();
  const tags = unique(cluster.signals.flatMap(({ mechanicTags }) => mechanicTags));
  const verbs = unique(cluster.signals.flatMap(({ playerVerbs }) => playerVerbs));
  return gameResearchTaskSchema.parse({
    schemaVersion: "game-research-task-v1",
    id: `RESEARCH-RADAR-${stableHash(`${cluster.id}:${cycle}`)}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "queued",
    queryIntent: `研究 ${cluster.gameTitle} 的公开玩法信号，提炼 ${tags.join("、")} 的可复用变化`,
    playerVerbs: verbs,
    constraints: ["市场信号只证明值得研究", "不得复制名称、角色、美术、音频、文案、代码或具体关卡", "短局", ...tags],
    candidatePatternIds: match.kind === "knowledge-pattern" && match.id ? [match.id] : [],
    sources: [], synthesis: null, candidateDraft: null, evaluation: null, decision: null,
  });
}

export function linkGameplayRadarResearch(cluster: GameplayRadarCluster, taskId: string, linkedPatternId: string | null, now = new Date()): GameplayRadarCluster {
  return gameplayRadarClusterSchema.parse({
    ...cluster,
    state: linkedPatternId ? "linked" : "researching",
    researchTaskIds: [...new Set([...cluster.researchTaskIds, taskId])],
    linkedPatternId,
    updatedAt: now.toISOString(),
  });
}
