# 海岛卡丁车资源溯源

- 参考：用户提供的 `600d24ac008b92d8ae710bc1793763a5.mp4`，80.37 秒，1200×680。
- 用途：观察第三人称卡丁车、海岛色彩、木桥、八车竞速、道具与 HUD。没有提取视频帧作为运行时纹理，没有使用原视频的角色、商标、模型或音频。
- 当前车辆、角色、棕榈树、灌木、花与礁石：Kenney CC0 模型，经本项目离线转换和配色适配；详见下方清单。道路、海岸、小屋、门架、木桥、帆船、道具和云朵仍为本项目原创程序化网格。不是 AI 生成位图；不需要图像 API 或密钥。
- 封面：本项目真实运行场景的截图，不冒充 AI 位图或原视频截图。
- 音效：本项目 Web Audio 振荡器合成；默认静音，点击音符可开启。
- 引擎：项目已安装的 Three.js 0.185.1，独立复制到 `vendor`，许可证保存在 `vendor/THREE-LICENSE.txt`。不访问 CDN，不新增引擎依赖。
- 原视频仅在本地用于需求分析，不随游戏产物分发。
# 近景模型修订（2026-09-06）

上一轮圆角车身与平滑头盔是原创程序化版本，本轮已被下述授权模型替换。门架和道具继续复用原创圆角建模方法。

## 当前授权模型（2026-09-06）

- 来源：[Kenney Car Kit](https://kenney.nl/assets/car-kit)、[Kenney Nature Kit](https://kenney.nl/assets/nature-kit)，作者 Kenney，CC0-1.0；包内许可证明确允许商用。
- 实际使用：kart-oopi、kart-oodi、kart-oobi、tree_palmDetailedTall、tree_palmBend、plant_bushDetailed、rock_smallC、rock_largeA、flower_redA。
- `assets/models/manifest.json` 记录每个模型的来源、OBJ SHA-256 和三角形数；同目录保存两份原包 License.txt 副本。
- `scripts/prepare-island-models.mjs` 在开发阶段读取 OBJ/MTL/调色板，烘焙顶点色并调整头盔、车身和植被颜色，输出本地 ES 模块。不在玩家浏览器加载源压缩包、解析 OBJ 或访问外部网站。
- 车轮保留独立网格，运行时重建局部旋转中心；赛车统一按 2.45 倍缩放，不修改原有规则碰撞区域。
- 完整下载源包在项目 `assets/source-packs/kenney/`，仅用于开发，不随 fixture 加载。已下载不等于全部使用。
