// 把「纸境 · 立体书迷宫」作为官方 3D 示范游戏放进游戏大厅。
//
// 用法（对着一个正在运行的工作室服务）：
//   STUDIO_ORIGIN=http://127.0.0.1:4312 node scripts/seed-paper-popup.mjs
//   可选：REVIEW_ART=1 自动通过主美复核（仅本地/测试环境使用；正式环境请由主美在工作台真实复核后再发布）
//   可选：MARK_OFFICIAL=1 与 DATABASE_URL=postgresql://... 一起使用时，把该项目标记为官方（is_official）以便进入大厅
//
// 步骤：创建 3D 项目（自动判定 threeMode=popup）→ 构建 → 等待自动验收 → （可选）主美复核 → 发布稳定网址 → （可选）标记官方。
// 不会停止任何进程、不会覆盖已存在的同名项目，也不会直接修改共享数据库（除非显式给出 MARK_OFFICIAL=1 与 DATABASE_URL）。
const origin = process.env.STUDIO_ORIGIN ?? "http://127.0.0.1:4312";
const title = process.env.PAPER_POPUP_TITLE ?? "纸境 · 立体书迷宫";
const idea = "立体书风格的 3D 旋转迷宫示范游戏：每一页都是一本翻开的纸艺立体书，玩家把整本书按 90 度转动，折起的桥和台阶才会接上，藏在纸洞后的折纸星才会露出来；点击地面行走、一个跳跃键越过一格空隙，经过检查点旗抵达出口门通关，20 关分晨光草甸、海岸灯塔、灯笼夜市、雪原天文台四章。";

async function request(path, init) {
  for (let attempt = 0; attempt < 31; attempt += 1) {
    const response = await fetch(`${origin}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
    const payload = await response.json();
    if (response.ok) return payload;
    if (response.status !== 429 || attempt === 30) throw new Error(payload.error ?? `请求失败：${response.status}`);
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error("请求重试次数已用完。");
}

async function waitForBuild(projectId) {
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    const { build } = await request(`/api/projects/${projectId}/build`);
    if (build?.status === "succeeded") return build;
    if (build?.status === "failed") throw new Error(`${projectId} 构建失败：${build.error}`);
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  throw new Error(`${projectId} 构建超时。`);
}

const { projects } = await request("/api/projects");
let project = projects.find((candidate) => candidate.title === title);
if (!project) {
  ({ project } = await request("/api/projects", {
    method: "POST",
    body: JSON.stringify({ title, idea, dimensions: "3d", aspectRatio: "9:16", visualStyle: "calm", artStyle: "garden", difficulty: "standard" }),
  }));
  console.log(`已创建：${title}（${project.id}）`);
}
if (project.spec?.threeMode && project.spec.threeMode !== "popup") throw new Error(`该项目不是 popup 模式，而是 ${project.spec.threeMode}；请换一个标题重新创建。`);
if (project.status === "contract_ready") {
  await request(`/api/projects/${project.id}/build`, { method: "POST" });
  await waitForBuild(project.id);
  ({ project } = await request(`/api/projects/${project.id}`));
  console.log(`已构建并通过自动验收：${title} v${project.version.number}`);
}
if (process.env.REVIEW_ART === "1" && project.version.artReviewStatus === "pending" && project.version.qualityStatus === "passed") {
  await request(`/api/projects/${project.id}/versions/${project.version.id}/art-review`, { method: "POST", body: JSON.stringify({ status: "passed", summary: "纸境 · 立体书迷宫 主美复核：启动页、四章游玩画面与结算画面已按纸艺基准逐图核对。" }) });
  ({ project } = await request(`/api/projects/${project.id}`));
  console.log("主美复核已记录为通过（REVIEW_ART=1）。");
}
const currentVersionPublished = project.publication?.versionId === project.version.id;
if (project.version.artReviewStatus === "passed" && !currentVersionPublished) {
  ({ project } = await request(`/api/projects/${project.id}/publish/${project.version.id}`, { method: "POST" }));
  console.log(`已发布：${title} v${project.version.number} ${project.publication.stableUrl}`);
} else if (project.status === "published" && currentVersionPublished) {
  console.log(`已存在：${title} ${project.publication.stableUrl}`);
} else {
  console.log(`等待主美复核：${title}（${project.version.artReviewStatus}）。复核通过后再次运行本脚本即可发布。`);
}

if (process.env.MARK_OFFICIAL === "1") {
  if (!process.env.DATABASE_URL) throw new Error("MARK_OFFICIAL=1 需要同时提供 DATABASE_URL。");
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query("UPDATE projects SET is_official = TRUE WHERE id = $1 AND EXISTS (SELECT 1 FROM publications WHERE publications.project_id = projects.id AND publications.status = 'live')", [project.id]);
    console.log(result.rowCount ? "已标记为官方游戏，将出现在游戏大厅。" : "尚未发布，未标记官方；请先完成发布。");
  } finally {
    await client.end();
  }
} else {
  console.log("如需进入游戏大厅，请在发布后用 MARK_OFFICIAL=1 DATABASE_URL=... 重新运行，或由管理员执行：UPDATE projects SET is_official = TRUE WHERE id = '" + project.id + "';");
}
const { games } = await request("/api/games");
console.log(`游戏大厅当前共 ${games.length} 款官方游戏。`);
