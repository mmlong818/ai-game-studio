const origin = process.env.STUDIO_ORIGIN ?? "http://127.0.0.1:4312";

const showcases = [
  { title: "折光堆叠", template: "tetris", artStyle: "geometric", visualStyle: "color-block", idea: "做一个构成主义风格的俄罗斯方块，完成 10 条消行获胜，支持键盘和触控。" },
  { title: "植光拼图", template: "puzzle", artStyle: "botanical", visualStyle: "fashion", idea: "做一个植物标本室风格的经典拖拽拼图，玩家可以上传横图、竖图或方图，拼块开局排在画板外围，完成后播放庆祝声。" },
  { title: "漆海碎星", template: "breakout", artStyle: "lacquer", visualStyle: "classic", idea: "做一个漆艺海面风格的打砖块游戏，击碎全部矿物砖获胜，支持鼠标、键盘和触控。" },
  { title: "朱门华容", template: "klotski", artStyle: "ink", visualStyle: "line-art", idea: "做一个东方木艺华容道，移动木块让曹操从底部中央离开，动作要有真实木块声音。" },
  { title: "苔径迷庭", template: "maze", artStyle: "garden", visualStyle: "calm", idea: "做一个苔石庭院迷宫，每局自动生成路线，从左上走到右下的金色灯火。" },
  { title: "青玉长游", template: "snake", artStyle: "jade", visualStyle: "cute", idea: "做一个青玉花园贪吃蛇，收集 12 枚朱果获胜，支持键盘和触控。" },
  { title: "数织矩阵", template: "merge-2048", artStyle: "geometric", visualStyle: "fashion", idea: "做一个时尚编辑风格的 2048 数字合成游戏，标准难度目标为 1024，支持滑动、键盘和触控方向键。" },
  { title: "星环突围", template: "space-shooter", artStyle: "lacquer", visualStyle: "color-block", idea: "做一个俯视太空射击游戏，飞船自动开火，玩家左右规避敌机并完成目标击破数。" },
  { title: "软糖拼岛", template: "polyomino-fit", artStyle: "botanical", visualStyle: "cute", idea: "做一个软萌软糖岛屿拼块游戏，旋转并安放不同拼块，完整填满目标轮廓。" },
  { title: "果冻填阵", template: "block-place", artStyle: "geometric", visualStyle: "color-block", idea: "做一个果冻材质的方块填阵游戏，从三块中选择并放进 8×8 棋盘，通过横竖消行达到目标分数。" },
  { title: "星灵巡格", template: "region-logic", artStyle: "garden", visualStyle: "cute", idea: "做一个星灵区域逻辑游戏，每行、每列和每个区域各放一个星灵，并且星灵不能相邻。" },
  { title: "月港雀旅", template: "mahjong-roguelite", artStyle: "playful", visualStyle: "cute", idea: "做一个软萌月港风格的肉鸽麻将接龙，配对两张自由牌清空层叠牌阵，并在航段之间选择遗物。" },
];

async function request(path, init) {
  for (let attempt = 0; attempt < 31; attempt += 1) {
    const response = await fetch(`${origin}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const payload = await response.json();
    if (response.ok) return payload;
    if (response.status !== 429 || attempt === 30) {
      throw new Error(payload.error ?? `请求失败：${response.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error("请求重试次数已用完。");
}

async function waitForBuild(projectId) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const { build } = await request(`/api/projects/${projectId}/build`);
    if (build?.status === "succeeded") return build;
    if (build?.status === "failed") throw new Error(`${projectId} 构建失败：${build.error}`);
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`${projectId} 构建超时。`);
}

const { projects: existingProjects } = await request("/api/projects");
for (const showcase of showcases) {
  let project = existingProjects.find((candidate) => candidate.title === showcase.title);
  if (!project) {
    ({ project } = await request("/api/projects", {
      method: "POST",
      body: JSON.stringify({ ...showcase, dimensions: "2d", difficulty: "standard" }),
    }));
    console.log(`已创建：${showcase.title}`);
  }
  if (project.status === "contract_ready") {
    await request(`/api/projects/${project.id}/build`, { method: "POST" });
    await waitForBuild(project.id);
    ({ project } = await request(`/api/projects/${project.id}`));
    console.log(`已构建：${showcase.title}`);
  }
  const currentVersionPublished = project.publication?.versionId === project.version.id;
  if (project.version.artReviewStatus === "passed" && !currentVersionPublished) {
    ({ project } = await request(`/api/projects/${project.id}/publish/${project.version.id}`, { method: "POST" }));
    console.log(`已发布新版：${showcase.title} v${project.version.number} ${project.publication.stableUrl}`);
  } else if (project.status === "published" && currentVersionPublished) {
    console.log(`已存在：${showcase.title} ${project.publication.stableUrl}`);
  } else {
    console.log(`等待主美复核：${showcase.title}（${project.version.artReviewStatus}）`);
  }
}

const { games } = await request("/api/games");
console.log(`游戏大厅当前共 ${games.length} 款已发布游戏。`);
