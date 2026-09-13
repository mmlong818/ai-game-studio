# 《箭头逃脱》资源溯源

更新时间：2026-09-14。

## 结论先行

- 本作**没有 AI 位图**，也没有任何来自参考游戏的代码、美术、音频或关卡数据。棋盘点阵、折线箭头、箭尖三角、HUD 与结算浮层全部由 `app.js` 用 Canvas / CSS 程序绘制；音效由 Web Audio 振荡器合成。
- 封面 `assets/cover.png`：本项目第 1 关真实运行画面的截图（Playwright，1024 宽视口，裁切 `#stage` 区域），不冒充 AI 位图，不含参考游戏画面。

## 参考与边界

- 参考对象：公开网页游戏 Arrow Escape（`https://arrowescape.io/arrow-escape/`）。平台对其公开交付给浏览器的客户端脚本做了"核心玩法分析"，只提炼规则层事实：点击判定阈值、射线阻挡规则、防连点扣心、胜负、时限公式、关卡尺寸/数量公式、生成阶段与约束、几何比例、反馈时机。分析提示明令不得输出任何原代码、标识符、资源文件名或地址；档案保存在项目方案的 `referenceMechanics` 字段与 `GAME_DESIGN_CONTRACT.json`。
- 复刻的是规则与结构规律。代码由 Claude CLI 按设计合同独立生成（`GENERATED_CODE.json` 记录模型、哈希与实现说明），三轮真实浏览器验收与规则审核的记录在 `BROWSER_QUALITY_REPORT.json`、`RULE_FIDELITY.json`、`GENERATION_ATTEMPTS.jsonl`。
- 几何来自档案的规则描述：线宽 = max(2.2, 0.26×格边长)，圆角端与折角，箭尖三角 0.42 / 0.20 / 0.33 格，点阵半径 0.075 格，20 色索引调色。这些是比例关系，不是复制的图像。

## 来源项目

- 项目 `98d0a327-d3ca-4fed-a027-ab320f6b99f1`，晋升版本见 `game-manifest.json` 的 `sourceProject.versionId`；晋升日期 2026-09-14。
- 该版本经真人试玩后由 `/revisions` 玩法修订得到：前 20 关按原作关卡表规律（15×20/45 支起），射出动画沿自身折线滑行。
