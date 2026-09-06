// 按官方游戏登记表（src/shared/official-games）把模板游戏与 3D 游戏作为示范项目建进工作室并发布。
//
// 用法（对着一个正在运行的工作室服务）：
//   npm run seed:showcases                         # 全部模板型与 3D 型登记
//   npm run seed:showcases -- tetris puzzle       # 只处理指定登记 id
//   STUDIO_ORIGIN=http://127.0.0.1:4312 / REVIEW_ART=1（仅本地或测试环境：自动通过主美复核）
//
// 固定游戏（fixture）由 API 服务启动时的 ensureOfficialFixtures() 自动注册，不走这里。
// 发布后的项目会在下一次服务启动（或 syncOfficialCatalog）时按登记表标记官方并进入大厅对应位置，不再需要手工 SQL。
import { OFFICIAL_GAMES, type OfficialGameDefinition } from "../src/shared/official-games/index.js";

const origin = process.env.STUDIO_ORIGIN ?? "http://127.0.0.1:4312";
const onlyIds = new Set(process.argv.slice(2).filter((argument) => !argument.startsWith("-")));

type ProjectPayload = {
  id: string;
  title: string;
  status: string;
  spec?: { threeMode?: string | null };
  version: { id: string; number: number; artReviewStatus: string; qualityStatus: string };
  publication?: { versionId: string; stableUrl: string } | null;
};

async function request<T = Record<string, unknown>>(path: string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; attempt < 31; attempt += 1) {
    const response = await fetch(`${origin}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string> | undefined) },
    });
    const payload = await response.json() as T & { error?: string };
    if (response.ok) return payload;
    if (response.status !== 429 || attempt === 30) throw new Error(payload.error ?? `请求失败：${response.status}`);
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error("请求重试次数已用完。");
}

async function waitForBuild(projectId: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { build } = await request<{ build: { status: string; error?: string } | null }>(`/api/projects/${projectId}/build`);
    if (build?.status === "succeeded") return build;
    if (build?.status === "failed") throw new Error(`${projectId} 构建失败：${build.error}`);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`${projectId} 构建超时。`);
}

function seedInput(game: OfficialGameDefinition) {
  if (!game.seed) throw new Error(`${game.id} 没有 seed 定义。`);
  const base = { title: game.title, idea: game.seed.idea, artStyle: game.seed.artStyle, visualStyle: game.seed.visualStyle, difficulty: "standard" };
  if (game.kind === "three") return { ...base, dimensions: "3d", aspectRatio: "9:16" };
  return { ...base, dimensions: "2d", template: game.serverTemplate };
}

const showcases = OFFICIAL_GAMES
  .filter((game) => (game.stage ?? "live") === "live")
  .filter((game) => game.kind !== "fixture")
  .filter((game) => onlyIds.size === 0 || onlyIds.has(game.id));

const { projects: existingProjects } = await request<{ projects: ProjectPayload[] }>("/api/projects");
for (const showcase of showcases) {
  let project = existingProjects.find((candidate) => candidate.title === showcase.title);
  if (!project) {
    ({ project } = await request<{ project: ProjectPayload }>("/api/projects", { method: "POST", body: JSON.stringify(seedInput(showcase)) }));
    console.log(`已创建：${showcase.title}（${project.id}）`);
  }
  if (showcase.kind === "three" && project.spec?.threeMode && project.spec.threeMode !== showcase.threeMode) {
    throw new Error(`${showcase.title} 不是 ${showcase.threeMode} 模式，而是 ${project.spec.threeMode}；请检查登记的 seed.idea。`);
  }
  if (project.status === "contract_ready") {
    await request(`/api/projects/${project.id}/build`, { method: "POST" });
    await waitForBuild(project.id, showcase.kind === "three" ? 10 * 60_000 : 30_000);
    ({ project } = await request<{ project: ProjectPayload }>(`/api/projects/${project.id}`));
    console.log(`已构建：${showcase.title} v${project.version.number}`);
  }
  if (process.env.REVIEW_ART === "1" && project.version.artReviewStatus === "pending" && project.version.qualityStatus === "passed") {
    await request(`/api/projects/${project.id}/versions/${project.version.id}/art-review`, {
      method: "POST",
      body: JSON.stringify({ status: "passed", summary: `${showcase.title} 主美复核：由 seed 脚本在本地环境自动通过（REVIEW_ART=1）。` }),
    });
    ({ project } = await request<{ project: ProjectPayload }>(`/api/projects/${project.id}`));
    console.log(`主美复核已记录为通过：${showcase.title}`);
  }
  const currentVersionPublished = project.publication?.versionId === project.version.id;
  if (project.version.artReviewStatus === "passed" && !currentVersionPublished) {
    ({ project } = await request<{ project: ProjectPayload }>(`/api/projects/${project.id}/publish/${project.version.id}`, { method: "POST" }));
    console.log(`已发布新版：${showcase.title} v${project.version.number} ${project.publication?.stableUrl}`);
  } else if (project.status === "published" && currentVersionPublished) {
    console.log(`已存在：${showcase.title} ${project.publication?.stableUrl}`);
  } else {
    console.log(`等待主美复核：${showcase.title}（${project.version.artReviewStatus}）`);
  }
}

const { games } = await request<{ games: Array<{ title: string; fixtureKind: string | null }> }>("/api/games");
console.log(`游戏大厅当前共 ${games.length} 款已发布游戏。`);
for (const fixture of OFFICIAL_GAMES.filter((game) => game.kind === "fixture")) {
  if (!games.some((game) => game.fixtureKind === fixture.fixtureKind)) {
    console.warn(`固定游戏 ${fixture.id} 尚未出现在大厅：请确认 API 服务已用包含该 fixture 的代码重启，或检查 studio_meta 中的初始化标记。`);
  }
}
for (const showcase of showcases) {
  if (!games.some((game) => game.title === showcase.title)) {
    console.log(`${showcase.title} 已发布但尚未进入大厅：重启 API 服务（或调用 syncOfficialCatalog）后会按登记表自动标记官方并排到第 ${showcase.lobbyRank} 位。`);
  }
}
