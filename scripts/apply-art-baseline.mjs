const origin = process.env.STUDIO_ORIGIN ?? "http://127.0.0.1:4312";

const decisions = new Map([
  ["月港雀旅", ["passed", "主美复核通过：牌阵仍是第一视觉焦点，新版桌面与手机布局无退化，月港主题与牌面层级一致。"]],
  ["星灵巡格", ["passed", "主美复核通过：区域棋盘占据主要视野，分区、星灵落点和背景层级在新版中保持清楚。"]],
  ["果冻填阵", ["passed", "主美复核通过：低明度棋盘与暖色候选区层级稳定，果冻块具备清楚的描边、材质和选择状态。"]],
  ["软糖拼岛", ["passed", "主美复核通过：目标格轮廓、已落拼块与候选块形成三层对比，紧角与空位在手机画幅中可快速识别。"]],
  ["星环突围", ["passed", "主美复核通过：玩家机体、放大的敌机和入场预警均从星空背景中明确分离，HUD 不遮挡交战区。"]],
  ["数织矩阵", ["passed", "主美复核通过：数字块采用实体底板、内高光与清晰数字对比，棋盘空位、合并块和任务区层级完整。"]],
  ["青玉长游", ["passed", "主美复核通过：加深后的棋盘网格、双层蛇身、朱果和障碍在浅色庭园中均可清楚辨认。"]],
  ["苔径迷庭", ["passed", "主美复核通过：迷宫路径在手机画幅中清楚、居中且占比充足，新版回归未发现入口出口层级退化。"]],
  ["朱门华容", ["passed", "主美复核通过：华容道牌面居中并撑满主要游戏区域，新版回归保持木艺主题和清楚的角色牌层级。"]],
  ["漆海碎星", ["passed", "主美复核通过：砖块增加贝壳纹理、内高光和损伤层，挡板、球体与海底背景的前后关系清楚。"]],
  ["植光拼图", ["passed", "主美复核通过：散落拼块采用实体阴影和深色描边，画板底图保持提示感而不抢过可操作拼块。"]],
  ["折光堆叠", ["passed", "主美复核通过：深色高对比棋盘压低背景干扰，落块、堆叠块、投影位置与预览队列均清楚突出。"]],
]);

async function request(path, init) {
  const response = await fetch(`${origin}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? `请求失败：${response.status}`);
  return payload;
}

const { projects } = await request("/api/projects");
for (const project of projects) {
  const decision = decisions.get(project.title);
  if (!decision) continue;
  const [status, summary] = decision;
  await request(`/api/projects/${project.id}/versions/${project.version.id}/art-review`, {
    method: "POST",
    body: JSON.stringify({ status, summary }),
  });
  console.log(`${status} ${project.title} v${project.version.number}`);
}
