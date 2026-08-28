import {
  buildSchema,
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
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as { error?: string; issues?: Array<{ message: string }> };
  if (!response.ok) {
    const issue = payload.issues?.[0]?.message;
    throw new Error(issue ?? payload.error ?? "请求没有完成，请稍后重试。");
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

export async function saveOpenAIKey(apiKey: string): Promise<OpenAISettingsStatus> {
  return openAISettingsStatusSchema.parse(await apiRequest("/api/settings/openai", {
    method: "PUT",
    body: JSON.stringify({ apiKey }),
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

export async function getLatestBuild(projectId: string): Promise<Build | null> {
  const payload = (await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/build`)) as {
    build: unknown;
  };
  return payload.build === null ? null : buildSchema.parse(payload.build);
}

export async function startBuild(projectId: string): Promise<Build> {
  const payload = (await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/build`, {
    method: "POST",
  })) as { build: unknown };
  return buildSchema.parse(payload.build);
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

export async function sendProjectMessage(projectId: string, content: string): Promise<ProjectMessage[]> {
  return projectMessagesResponseSchema.parse(await apiRequest(
    `/api/projects/${encodeURIComponent(projectId)}/messages`,
    { method: "POST", body: JSON.stringify({ content }) },
  )).messages;
}
