# 《箭头魔方》资源说明

- 来源项目：`6c230413-7c83-43b8-bb11-f0349d73e0de`，晋升版本见 `game-manifest.json` 的 `sourceProject.versionId`（2026-09-14）。
- 画面：方块、箭头、描边、HUD 与结算面板由 `app.js` 用 three.js（本地 `vendor/`）与 Canvas / CSS 程序绘制；音效由 Web Audio 合成。
- 封面 `assets/cover.png`：第 50 关运行画面截图（Playwright，裁切 `#stage` 区域）。
- 规则与关卡结构的依据记录在 `GAME_DESIGN_CONTRACT.json` 与 docs/106。
