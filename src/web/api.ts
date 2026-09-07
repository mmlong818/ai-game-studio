import {
  artReviewHistoryResponseSchema,
  buildSchema,
  gameDesignProfileSchema,
  openAISettingsStatusSchema,
  playActivitiesResponseSchema,
  projectDetailSchema,
  projectMessagesResponseSchema,
  projectVersionsResponseSchema,
  projectsResponseSchema,
  publishedGamesResponseSchema,
  type Build,
  type OpenAISettingsStatus,
  type ProjectDetail,
  type ProjectInput,
  type ProjectMessage,
  type ProjectSummary,
  type ProjectVersion,
  type PlayActivity,
} from "../shared/contracts";
import { streamLines } from "../shared/stream-lines";
import type { DesignKnowledgeReviewReport } from "../server/design-knowledge-review";
import type { GameplayRadarView, GameplaySignal } from "../shared/game-design-knowledge/gameplay-radar";
import type { MECHANIC_ATLAS_SUMMARY, searchMechanicAtlas } from "../shared/game-design-knowledge/mechanic-atlas";
import type {
  DesignKnowledgeChangeSet,
  DesignKnowledgeDecision,
  DesignKnowledgeDecisionInput,
  DesignKnowledgeRelease,
  DesignKnowledgeInsights,
  DesignResearchCandidateInput,
  DesignResearchBrowserRunInput,
  DesignResearchCreateInput,
  DesignResearchDecisionInput,
  DesignResearchPlaytestInput,
  DesignResearchProbeRunInput,
  DesignResearchSourceInput,
  DesignResearchSynthesisInput,
  DesignResearchResourceSubmissionInput,
  DesignResearchResourceReviewInput,
  DesignResearchResourceSecurityReviewInput,
  GameResearchTask,
  DesignPlaytest,
  DesignPlaytestInput,
} from "../server/design-knowledge-evidence";

export type DesignKnowledgeReviewSnapshot = {
  id: string;
  createdAt: string;
  report: DesignKnowledgeReviewReport;
  decisions: DesignKnowledgeDecision[];
};

// 服务端设置 STUDIO_ACCESS_TOKEN 后 API 需要令牌;创作者在浏览器控制台执行
// localStorage.setItem("forge-access-token", "<令牌>") 即可解锁工作台。
function accessToken(): string | null {
  try {
    return localStorage.getItem("forge-access-token");
  } catch {
    return null;
  }
}

async function apiRequest(path: string, init?: RequestInit) {
  const token = accessToken();
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("无法连接本地制作服务，请确认服务已经启动。");
  }
  const raw = await response.text();
  let payload: { error?: string; issues?: Array<{ message: string }>; [key: string]: unknown } = {};
  if (raw) {
    try { payload = JSON.parse(raw) as typeof payload; }
    catch {
      if (!response.ok) throw new Error("本地制作服务暂时不可用，请稍后重试。");
      throw new Error("本地制作服务返回了无法识别的数据。");
    }
  }
  if (!response.ok) {
    const issue = payload.issues?.[0]?.message;
    throw new Error(issue ?? payload.error ?? (response.status >= 500 ? "本地制作服务暂时不可用，请稍后重试。" : "请求没有完成，请稍后重试。"));
  }
  return payload;
}

export async function getProjects(): Promise<ProjectSummary[]> {
  return projectsResponseSchema.parse(await apiRequest("/api/projects")).projects;
}

export async function getArchivedProjects(): Promise<ProjectSummary[]> {
  return projectsResponseSchema.parse(await apiRequest("/api/projects/archived")).projects;
}

export async function archiveProject(projectId: string): Promise<ProjectDetail> {
  const payload = await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/archive`, { method: "POST" }) as { project: unknown };
  return projectDetailSchema.parse(payload.project);
}

export async function restoreProject(projectId: string): Promise<ProjectDetail> {
  const payload = await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/restore`, { method: "POST" }) as { project: unknown };
  return projectDetailSchema.parse(payload.project);
}

export async function deleteArchivedProject(projectId: string): Promise<void> {
  await apiRequest(`/api/projects/${encodeURIComponent(projectId)}`, { method: "DELETE" });
}

export async function getOpenAISettings(): Promise<OpenAISettingsStatus> {
  return openAISettingsStatusSchema.parse(await apiRequest("/api/settings/openai"));
}

export async function saveOpenAIKey(apiKey: string, models?: OpenAISettingsStatus["models"]): Promise<OpenAISettingsStatus> {
  return openAISettingsStatusSchema.parse(await apiRequest("/api/settings/openai", {
    method: "PUT",
    body: JSON.stringify({ apiKey, models }),
  }));
}

export async function getOpenAIModels(apiKey: string, signal?: AbortSignal) {
  const { openAIModelCatalogSchema } = await import("../shared/contracts");
  return openAIModelCatalogSchema.parse(await apiRequest("/api/settings/openai/models", {
    method: "POST", body: JSON.stringify({ apiKey }), signal,
  }));
}

export async function clearOpenAIKey(): Promise<OpenAISettingsStatus> {
  return openAISettingsStatusSchema.parse(await apiRequest("/api/settings/openai", {
    method: "DELETE",
  }));
}

export async function getPublishedGames(): Promise<ProjectSummary[]> {
  return publishedGamesResponseSchema.parse(await apiRequest("/api/games")).games;
}

export async function getPlayActivities(playerId: string): Promise<PlayActivity[]> {
  return playActivitiesResponseSchema.parse(await apiRequest(`/api/play-activity/${encodeURIComponent(playerId)}`)).activities;
}

export async function getProject(projectId: string): Promise<ProjectDetail> {
  const payload = (await apiRequest(`/api/projects/${encodeURIComponent(projectId)}`)) as {
    project: unknown;
  };
  return projectDetailSchema.parse(payload.project);
}

export async function createProject(input: ProjectInput): Promise<ProjectDetail> {
  const payload = (await apiRequest("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  })) as { project: unknown };
  return projectDetailSchema.parse(payload.project);
}

export type ProductionJob = { id: string; status: "queued" | "creating" | "building" | "failed"; error: string | null; events?: { title: string; createdAt: string }[] };
export async function submitProduction(input: ProjectInput): Promise<ProductionJob> {
  const payload = await apiRequest("/api/production-jobs", { method: "POST", body: JSON.stringify(input) });
  return payload.job as ProductionJob;
}
export async function getProductionJob(id: string): Promise<ProductionJob | null> {
  const payload = await apiRequest("/api/production-jobs/" + encodeURIComponent(id));
  return payload.job as ProductionJob | null;
}

export async function watchProductionJob(id: string, signal: AbortSignal, onUpdate: (job: ProductionJob, build: Build | null) => void) {
  const token = accessToken();
  const response = await fetch("/api/production-jobs/" + encodeURIComponent(id) + "/stream", {
    signal, headers: token ? { Authorization: "Bearer " + token } : {},
  });
  if (!response.ok || !response.body) throw new Error("无法连接制作进度流。");
  let terminal = false;
  for await (const line of streamLines(response.body)) {
    if (!line.trim()) continue;
    const event = JSON.parse(line);
    if (event.type === "heartbeat") continue;
    if (event.error || !event.job) throw new Error(event.error ?? "任务不存在。");
    const build = event.build ? buildSchema.parse(event.build) : null;
    onUpdate(event.job, build);
    terminal = event.job.status === "failed" || build?.status === "succeeded" || build?.status === "failed";
  }
  if (!terminal) throw new Error("进度连接已断开，正在重新连接；不会重新制作。");
}

export async function getLatestBuild(projectId: string): Promise<Build | null> {
  const payload = (await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/build`)) as {
    build: unknown;
  };
  return payload.build === null ? null : buildSchema.parse(payload.build);
}

export async function generateDesignPreview(input: ProjectInput, signal?: AbortSignal, onDelta?: (text: string) => void) {
  if (onDelta) {
    const token = accessToken();
    const response = await fetch("/api/design-preview", {
      method: "POST", signal, body: JSON.stringify(input),
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson", ...(token ? { Authorization: "Bearer " + token } : {}) },
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      throw new Error(failure.error ?? "无法开始流式方案生成。");
    }
    if (!response.body) throw new Error("服务端未返回输出流。");
    for await (const line of streamLines(response.body)) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === "delta" && typeof event.text === "string") onDelta(event.text);
      if (event.type === "error") throw new Error(event.error);
      if (event.type === "done") return gameDesignProfileSchema.parse(event.profile);
    }
    throw new Error("输出连接中断，方案尚未完成。");
  }
  const result = await apiRequest("/api/design-preview", { method: "POST", body: JSON.stringify(input), signal });
  if (result.source !== "llm") throw new Error("未获得实时模型方案。");
  return gameDesignProfileSchema.parse(result.profile);
}

export async function getPlayableBuild(projectId: string): Promise<Build | null> {
  const payload = await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/playable-build`);
  return payload.build == null ? null : buildSchema.parse(payload.build);
}

export async function startBuild(projectId: string): Promise<Build> {
  const payload = (await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/build`, {
    method: "POST",
  })) as { build: unknown };
  return buildSchema.parse(payload.build);
}

export async function submitProjectRevision(projectId: string, input: { requestId: string; content: string }): Promise<Build> {
  const payload = await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/revisions`, { method: "POST", body: JSON.stringify(input) });
  return buildSchema.parse(payload.build);
}

export async function getProjectRevision(projectId: string, requestId: string): Promise<Build | null> {
  const payload = await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/revisions/${encodeURIComponent(requestId)}`);
  return payload.build == null ? null : buildSchema.parse(payload.build);
}

export async function publishProject(projectId: string): Promise<ProjectDetail> {
  const payload = (await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/publish`, {
    method: "POST",
  })) as { project: unknown };
  return projectDetailSchema.parse(payload.project);
}

export async function getProjectVersions(projectId: string): Promise<ProjectVersion[]> {
  return projectVersionsResponseSchema.parse(
    await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/versions`),
  ).versions;
}

export async function getArtReviewHistory(projectId: string, versionId: string, signal?: AbortSignal) {
  const payload = await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}/art-review`, { signal });
  const reviews = artReviewHistoryResponseSchema.parse(payload).reviews;
  if (reviews.some(review => review.projectId !== projectId || review.versionId !== versionId)) throw new Error("审核记录与当前版本不一致。");
  return reviews;
}

export async function publishProjectVersion(projectId: string, versionId: string): Promise<ProjectDetail> {
  const payload = (await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/publish/${encodeURIComponent(versionId)}`, {
    method: "POST",
  })) as { project: unknown };
  return projectDetailSchema.parse(payload.project);
}

export async function reviewVersionArt(projectId: string, versionId: string, status: "passed" | "failed", summary: string): Promise<ProjectVersion[]> {
  return projectVersionsResponseSchema.parse(await apiRequest(
    `/api/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}/art-review`,
    { method: "POST", body: JSON.stringify({ status, summary }) },
  )).versions;
}

export async function getProjectMessages(projectId: string): Promise<ProjectMessage[]> {
  return projectMessagesResponseSchema.parse(
    await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/messages`),
  ).messages;
}

export async function sendProjectMessage(projectId: string, content: string, clientMessageId?: string): Promise<ProjectMessage[]> {
  return projectMessagesResponseSchema.parse(await apiRequest(
    `/api/projects/${encodeURIComponent(projectId)}/messages`,
    { method: "POST", body: JSON.stringify({ content, clientMessageId }) },
  )).messages;
}

export async function getDesignKnowledgeReviews(): Promise<DesignKnowledgeReviewSnapshot[]> {
  return (await apiRequest("/api/design-knowledge/reviews") as { reviews: DesignKnowledgeReviewSnapshot[] }).reviews;
}

export async function captureDesignKnowledgeReview(): Promise<DesignKnowledgeReviewSnapshot> {
  return (await apiRequest("/api/design-knowledge/reviews", { method: "POST", body: "{}" }) as { review: DesignKnowledgeReviewSnapshot }).review;
}

export async function recordDesignKnowledgeDecision(reviewId: string, input: DesignKnowledgeDecisionInput): Promise<DesignKnowledgeDecision> {
  return (await apiRequest(`/api/design-knowledge/reviews/${encodeURIComponent(reviewId)}/decisions`, {
    method: "POST",
    body: JSON.stringify(input),
  }) as { decision: DesignKnowledgeDecision }).decision;
}

export async function createDesignKnowledgeChangeSet(reviewId: string): Promise<DesignKnowledgeChangeSet> {
  return (await apiRequest(`/api/design-knowledge/reviews/${encodeURIComponent(reviewId)}/change-set`, {
    method: "POST",
    body: "{}",
  }) as { changeSet: DesignKnowledgeChangeSet }).changeSet;
}

export async function getDesignKnowledgeChangeSets(): Promise<DesignKnowledgeChangeSet[]> {
  return (await apiRequest("/api/design-knowledge/change-sets") as { changeSets: DesignKnowledgeChangeSet[] }).changeSets;
}

export async function reviewDesignKnowledgeChangeSet(changeSetId: string, decision: "approve" | "reject", rationale: string): Promise<DesignKnowledgeChangeSet> {
  return (await apiRequest(`/api/design-knowledge/change-sets/${encodeURIComponent(changeSetId)}/review`, {
    method: "POST",
    body: JSON.stringify({ decision, rationale }),
  }) as { changeSet: DesignKnowledgeChangeSet }).changeSet;
}

export async function exportDesignKnowledgeChangeSet(changeSetId: string): Promise<unknown> {
  return (await apiRequest(`/api/design-knowledge/change-sets/${encodeURIComponent(changeSetId)}/export`) as { export: unknown }).export;
}

export async function publishDesignKnowledgeChangeSet(changeSetId: string): Promise<DesignKnowledgeRelease> {
  return (await apiRequest(`/api/design-knowledge/change-sets/${encodeURIComponent(changeSetId)}/publish`, {
    method: "POST",
    body: "{}",
  }) as { release: DesignKnowledgeRelease }).release;
}

export async function getDesignKnowledgeReleases(): Promise<DesignKnowledgeRelease[]> {
  return (await apiRequest("/api/design-knowledge/releases") as { releases: DesignKnowledgeRelease[] }).releases;
}

export async function rollbackDesignKnowledgeRelease(sourceReleaseId: string, rationale: string): Promise<DesignKnowledgeRelease> {
  return (await apiRequest("/api/design-knowledge/releases/rollback", {
    method: "POST",
    body: JSON.stringify({ sourceReleaseId, rationale }),
  }) as { release: DesignKnowledgeRelease }).release;
}

export async function getDesignKnowledgeInsights(): Promise<DesignKnowledgeInsights> {
  return (await apiRequest("/api/design-knowledge/insights") as { insights: DesignKnowledgeInsights }).insights;
}

export type MechanicAtlasResponse = { summary: typeof MECHANIC_ATLAS_SUMMARY; localSources: { schemaVersion: "local-design-source-summary-v1"; indexed: number; bytes: number; byRole: Record<string, number>; sourceRootHint: string; policy: string }; result: ReturnType<typeof searchMechanicAtlas> };
export async function getMechanicAtlas(input: { query?: string; family?: string; offset?: number; limit?: number } = {}): Promise<MechanicAtlasResponse> {
  const parameters = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => { if (value !== undefined && value !== "") parameters.set(key, String(value)); });
  return await apiRequest(`/api/design-knowledge/mechanic-atlas?${parameters.toString()}`) as MechanicAtlasResponse;
}

export async function getGameplayRadar(): Promise<GameplayRadarView[]> {
  return (await apiRequest("/api/design-knowledge/radar") as { clusters: GameplayRadarView[] }).clusters;
}

export async function addGameplayRadarSignal(input: GameplaySignal): Promise<void> {
  await apiRequest("/api/design-knowledge/radar", { method: "POST", body: JSON.stringify(input) });
}

export async function startGameplayRadarResearch(clusterId: string, refresh: boolean): Promise<GameResearchTask> {
  return (await apiRequest(`/api/design-knowledge/radar/${encodeURIComponent(clusterId)}/research`, {
    method: "POST", body: JSON.stringify({ refresh }),
  }) as { task: GameResearchTask }).task;
}

export async function getDesignResearchTasks(): Promise<GameResearchTask[]> {
  return (await apiRequest("/api/design-knowledge/research") as { tasks: GameResearchTask[] }).tasks;
}

export async function createDesignResearchTask(input: DesignResearchCreateInput): Promise<GameResearchTask> {
  return (await apiRequest("/api/design-knowledge/research", { method: "POST", body: JSON.stringify(input) }) as { task: GameResearchTask }).task;
}

async function updateDesignResearchTask(taskId: string, action: string, input: unknown): Promise<GameResearchTask> {
  return (await apiRequest(`/api/design-knowledge/research/${encodeURIComponent(taskId)}/${action}`, { method: "POST", body: JSON.stringify(input) }) as { task: GameResearchTask }).task;
}

export const addDesignResearchSource = (taskId: string, input: DesignResearchSourceInput) => updateDesignResearchTask(taskId, "sources", input);
export const submitDesignResearchSynthesis = (taskId: string, input: DesignResearchSynthesisInput) => updateDesignResearchTask(taskId, "synthesis", input);
export const attachDesignResearchCandidate = (taskId: string, input: DesignResearchCandidateInput) => updateDesignResearchTask(taskId, "candidate", input);
export const decideDesignResearchTask = (taskId: string, input: DesignResearchDecisionInput) => updateDesignResearchTask(taskId, "decision", input);
export const createDesignResearchEvaluation = (taskId: string) => updateDesignResearchTask(taskId, "evaluation", {});
export async function runDesignResearchEvaluation(taskId: string): Promise<{ task: GameResearchTask; playUrl: string }> {
  return await apiRequest(`/api/design-knowledge/research/${encodeURIComponent(taskId)}/evaluation/run`, { method: "POST", body: "{}" }) as { task: GameResearchTask; playUrl: string };
}
export const createDesignResearchResourceAcquisitionTask = (taskId: string) => updateDesignResearchTask(taskId, "evaluation/acquisition", {});
export const submitDesignResearchResourceWork = (taskId: string, requirementId: string, input: DesignResearchResourceSubmissionInput) => updateDesignResearchTask(taskId, `evaluation/acquisition/${encodeURIComponent(requirementId)}/submit`, input);
export const reviewDesignResearchResourceWork = (taskId: string, requirementId: string, input: DesignResearchResourceReviewInput) => updateDesignResearchTask(taskId, `evaluation/acquisition/${encodeURIComponent(requirementId)}/review`, input);
export async function intakeApprovedDesignResearchResources(taskId: string): Promise<GameResearchTask> {
  return (await apiRequest(`/api/design-knowledge/research/${encodeURIComponent(taskId)}/evaluation/resource-intake`, { method: "POST", body: "{}" }) as { task: GameResearchTask }).task;
}
export const reviewDesignResearchResourceIntake = (taskId: string, input: DesignResearchResourceSecurityReviewInput) => updateDesignResearchTask(taskId, "evaluation/resource-intake/review", input);
export async function promoteDesignResearchResourceFamilies(taskId: string): Promise<GameResearchTask> {
  return (await apiRequest(`/api/design-knowledge/research/${encodeURIComponent(taskId)}/evaluation/resource-promotion`, { method: "POST", body: "{}" }) as { task: GameResearchTask }).task;
}
export const recordDesignResearchProbeRun = (taskId: string, input: DesignResearchProbeRunInput) => updateDesignResearchTask(taskId, "evaluation/probes", input);
export const recordDesignResearchBrowserRun = (taskId: string, input: DesignResearchBrowserRunInput) => updateDesignResearchTask(taskId, "evaluation/browser", input);
export const recordDesignResearchPlaytest = (taskId: string, input: DesignResearchPlaytestInput) => updateDesignResearchTask(taskId, "evaluation/playtests", input);

export async function createDesignResearchChangeSet(taskId: string): Promise<DesignKnowledgeChangeSet> {
  return (await apiRequest(`/api/design-knowledge/research/${encodeURIComponent(taskId)}/change-set`, { method: "POST", body: "{}" }) as { changeSet: DesignKnowledgeChangeSet }).changeSet;
}

export async function getDesignPlaytests(): Promise<DesignPlaytest[]> {
  return (await apiRequest("/api/design-knowledge/playtests") as { playtests: DesignPlaytest[] }).playtests;
}

export async function recordDesignPlaytest(input: DesignPlaytestInput): Promise<DesignPlaytest> {
  return (await apiRequest("/api/design-knowledge/playtests", {
    method: "POST",
    body: JSON.stringify(input),
  }) as { playtest: DesignPlaytest }).playtest;
}
