const origin = process.env.STUDIO_ORIGIN ?? "http://127.0.0.1:4312";

const decisions = new Map([
  ["月港雀旅", ["passed", "主美复核通过：牌阵为第一视觉焦点，局内位图、面板、背景和月港主题一致，手机画幅层级清楚。"]],
  ["星灵巡格", ["passed", "主美复核通过：区域棋盘占据主要视野，分区颜色和星灵落点清楚，背景未压过玩法主体。"]],
  ["果冻填阵", ["failed", "主美复核未通过：高饱和黄底与黑色粗框过度抢眼，候选块和棋盘缺少材质层次，整体像调试界面。"]],
  ["软糖拼岛", ["failed", "主美复核未通过：目标轮廓与拼块对比过低，核心拼合信息几乎不可见，背景装饰强于玩法主体。"]],
  ["星环突围", ["failed", "主美复核未通过：太空背景完成度较好，但玩家飞船与敌机在 9:16 画幅中过小，主体辨识度不足。"]],
  ["云脊跃迁", ["failed", "主美复核未通过：场景插画质量尚可，但角色和可落脚平台相对背景过小，真实玩法信息没有成为第一焦点。"]],
  ["数织矩阵", ["failed", "主美复核未通过：局内数字块仍是模糊半透明占位质感，与宣传图的设计感不一致，棋盘层级和数字可读性不足。"]],
  ["青玉长游", ["failed", "主美复核未通过：蛇身、果实和棋盘在浅色叠层中接近不可见，背景明显压过核心游戏资源。"]],
  ["苔径迷庭", ["passed", "主美复核通过：迷宫路径在手机画幅中清楚、居中且占比充足，入口出口与背景层级可区分；操作问题留待游戏设计复核。"]],
  ["朱门华容", ["passed", "主美复核通过：华容道牌面居中并撑满主要游戏区域，木艺主题与角色牌视觉统一，主体层级清楚。"]],
  ["漆海碎星", ["failed", "主美复核未通过：海底场景完整，但顶部砖块仍偏通用矩形素材，层级与特效不足，和背景精细度不匹配。"]],
  ["植光拼图", ["failed", "主美复核未通过：拼图画板和拼块透明度过低，繁花背景干扰轮廓识别，核心拼图不够突出。"]],
  ["折光堆叠", ["failed", "主美复核未通过：9:16 棋盘内方块占比过小，游戏中第一视觉焦点不够突出；背景装饰强于核心落块。"]],
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
