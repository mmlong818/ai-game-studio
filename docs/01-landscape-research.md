# 同类产品与开源能力研究

> 研究日期：2026-08-26。产品能力、价格和开源活跃度会变化，实施前需要重新核对。  
> 研究目标：找出能够直接借鉴的工作流和可评估的开源能力，不做表面功能罗列。

## 1. 研究问题

我们需要回答五件事：

1. 同类产品如何从模糊想法走到可玩版本？
2. 它们如何让用户理解和控制 AI 的修改？
3. 哪些产品解决了代码、素材、测试、版本和发布中的一部分？
4. 哪些开源项目可以作为架构、协议或实现参考？
5. 哪些能力应该自己做，哪些可以在审计后复用？

## 2. 商业产品

| 产品 | 公开定位与能力 | 最值得借鉴 | 不应直接照搬 |
|---|---|---|---|
| MakePlay | 用户描述和持续指导；AI 处理代码、美术、音乐、测试；支持构建中排队或插入意见、浏览器试玩、发布快照、版本和回滚；官方称 2D 使用 PixiJS、3D 使用 three.js、物理使用 Rapier | “导演而非配置”的低门槛入口；构建事件流；每次构建都以可玩版本结束；发布快照与回滚 | 私有提示词、内部工具、专有资源和未公开接口；其条款对竞争服务和逆向工程有限制 |
| Rosebud | 自然语言生成代码、美术和声音；浏览器试玩、聊天迭代、发布和重混；生成 JavaScript 可查看编辑；公开支持 2D、Three.js 3D 和 Windows 导出 | 保留代码逃生口；一体化素材；生成后仍可编辑；创作和分发相连 | 首版不要承诺全类型、3D、多人和商业发行同时成熟 |
| GDevelop | AI Agent 直接修改真实项目中的场景、对象、变量和事件；先给计划、逐步执行，可暂停检查；强调小步请求和可见可编辑逻辑；编辑器和运行时开源 | 结构化项目比自由写文件更可控；聊天答疑与实际执行分开；每次改动可见、可暂停、可继续手工编辑 | 完整通用引擎和跨平台发布生态过重，不适合首版照搬 |
| Astrocade | 文本生成互动世界，自动生成美术、动画、特效、音乐、声音和玩法；同时经营作品发现、分析、创作者基金和游戏 Jam | 把“做出来”与“有人玩”视为两个问题；分析和分发是后续留存能力 | 社区、基金、增长和变现不是首版生成可靠性的替代品 |
| Ludo.ai | 更偏前期设计与素材生产：创意卡片、完整 GDD、概念图、2D 图像、精灵动画、3D、音频和视频；素材可通过收藏作为后续生成的风格锚点；提供 API/MCP | 先形成结构化游戏概念；显式生成参数；用锚点图保持素材一致；素材产物带类型与导出格式 | 它不是完整的“生成并运行游戏”闭环，不能把素材能力当成玩法实现 |
| Buildbox 4 | 在可视化引擎中通过提示加入资产、动画、场景、关卡和逻辑节点 | AI 改结构化场景和节点，而不是永远重写整份代码 | 桌面引擎工作流和节点编辑器会显著扩大首版范围 |

主要来源：

- [MakePlay AI Game Builder](https://makeplay.ai/ai-game-builder)
- [Rosebud AI Game Creator](https://rosebud.ai/ai-game-creator)
- [GDevelop AI Agent](https://gdevelop.io/blog/make-games-with-ai-agent-gdevelop-automated-prompt)
- [GDevelop 对 AI 原型与完整引擎的说明](https://gdevelop.io/blog/why-use-gdevelop-when-you-can-use-ai)
- [Astrocade About](https://www.astrocade.com/about-us)
- [Astrocade Creators](https://www.astrocade.com/creators)
- [Ludo Game Ideator](https://ludo.ai/docs/game-ideator)
- [Ludo Game Asset Generation](https://ludo.ai/docs/game-asset-generation)
- [Buildbox 4 AI Features](https://www.buildbox.com/buildbox-4-is-now-available-make-games-with-ai/)

## 3. 开源应用和基础能力

### 3.1 可以直接研究的完整工作流

| 项目 | 公开能力 | 许可证/成熟度信号 | 我们的使用判断 |
|---|---|---|---|
| [OpenGame](https://github.com/leigest519/OpenGame) | 一句话生成网页游戏；Template Skill 选择 Canvas、Phaser、three.js 等骨架；Debug Skill 构建、运行和修复；OpenGame-Bench 计划从 Build Health、Visual Usability、Intent Alignment 评估 | Apache-2.0；2026-04 首次公开；仓库仍很新，README 明确说部分评估管线尚待发布 | 重点研究“模板技能 + 调试技能 + 动态评估”，不把未发布评估能力当成现成依赖 |
| [GameSmith](https://github.com/AbdulHannan031/gamesmith-ai-game-generator) | 浏览器 AI 游戏工作台；SSE 工具事件；按需加载 15 个游戏技能；写入前检查语法/模块；模拟一分钟试玩；真实 Chrome 截图审美检查；不透明 iframe；发布快照 | MIT；架构说明具体，可直接运行 | 首要参考。优先借鉴事件流、按需技能、state 调试钩子、不透明预览和不可变发布 |
| [Funplay](https://github.com/FunplayAI/Funplay) | 本地优先桌面工作台；多模型、工具权限、检查点、回放日志、资源生成、Unity/Cocos/Godot 适配；UI、日志和验证都投影自同一个事件流 | MIT；功能广但项目仍处早期 | 借鉴“单一权威事件账本”、工具风险元数据和检查点，不引入其桌面多引擎范围 |
| [swipi-engine](https://github.com/Citronetic/swipi-engine) | 分类玩法类型 → 脚手架 → GDD → 资源 → 配置 → 代码 → 验证；提供 TypeScript 库、REST API 和 SSE；有五种玩法骨架 | Apache-2.0；项目很新 | 借鉴清晰阶段 API、玩法分类和 REST/SSE 合同，不立即采用依赖 |
| [Prompt-N-Click](https://github.com/2coderok/prompt-n-click) | 完全本地的剧情点击游戏流水线；每步可暂停、恢复、重试、从某步重跑，并自动使下游失效；LLM、ComfyUI、TTS、Phaser 组合 | MIT；当前生态和样本较小，且类型非常专一 | 借鉴“步骤可恢复 + 依赖失效 + 风格锚点”，不采用其重型本地 GPU 部署作为网站首版 |

### 3.2 可以作为底层的成熟组件

| 组件 | 能力 | 判断 |
|---|---|---|
| [Phaser](https://github.com/phaserjs/phaser) | 开源 HTML5 2D 游戏框架，包含 Scene、资源加载、输入、动画、相机、瓦片地图和物理；官方仓库还提供面向编码代理的技能资料 | 作为首版默认运行时。它比单纯渲染库减少 AI 重复发明输入、场景和物理的概率 |
| [PixiJS](https://github.com/pixijs/pixijs) | 高性能 WebGL/WebGPU 2D 渲染、资源、触控、文本、遮罩和滤镜 | 适合高度定制的渲染和后续专用模板；不作为首版默认，因为它不是完整游戏框架 |
| [GDevelop](https://github.com/4ian/GDevelop) | MIT 的完整开源编辑器和 JS 运行时，包含事件、行为、扩展和发布生态 | 作为结构化项目模型与编辑器设计参考；暂不嵌入其庞大 IDE |
| [Playwright](https://playwright.dev/docs/browsers) | Chromium、Firefox、WebKit 浏览器自动化，设备参数、截图、输入、追踪 | 用于真实浏览器试玩、尺寸/DPR/触控回归和证据截图 |
| [E2B](https://github.com/e2b-dev/E2B) | Apache-2.0 的隔离云沙箱基础设施，可运行 AI 生成代码，也支持自托管 | 作为生产沙箱候选；本地样条可先用一次性容器，部署前比较成本和隔离强度 |

## 4. 跨产品模式

### 4.1 普通产品都在做什么

- 一句话输入。
- 聊天迭代。
- 浏览器预览。
- 图片或素材生成。
- 一键发布。
- 用“几分钟生成”降低首次使用门槛。

这些已经是入场条件，不足以形成差异。

### 4.2 更强的产品在做什么

1. **把 AI 接到真实项目结构**：GDevelop 改场景、对象和事件，避免只生成孤立文本。
2. **把生成声明变成测试证据**：GameSmith 和 OpenGame 都把动态试玩视为核心，不只检查语法。
3. **把构建变成可恢复流程**：Prompt-N-Click 支持按步骤恢复和下游失效，Funplay 保留检查点与回放。
4. **把发布变成不可变快照**：MakePlay 和 GameSmith 都把草稿与玩家正在玩的版本隔开。
5. **把技能知识按需加载**：GameSmith 只在需要时加载对应游戏技能，降低上下文成本。
6. **把素材一致性当成管线问题**：Ludo 用收藏的锚点图、固定风格和引用关系维持一致性。
7. **把创作和分发连起来**：Astrocade 强调分析、发现、游戏 Jam 和创作者收益。

## 5. 可借鉴清单

| 来源 | 具体做法 | 为什么有效 | 我们如何采用 |
|---|---|---|---|
| MakePlay | 构建中可排队补充，也可把紧急纠偏插入当前构建 | 用户不必等 AI 完成才表达新想法 | 设计“排队补充”和“立即纠偏”两种明确状态 |
| GDevelop | Agent 先总结计划，再逐步改真实项目，可暂停检查 | 降低失控感，结果仍可编辑 | 每个版本先产生变化合同；按文件和验收项显示动作 |
| GameSmith | 用一行技能摘要选择技能，完整内容按需加载 | 降低上下文和费用 | 建立游戏技能目录，只向规划器暴露索引 |
| GameSmith | 生成游戏暴露 state 钩子，试玩报告哪些关键状态从未发生 | 能发现“看起来在跑、规则其实没触发” | 规定所有运行时骨架实现受控只读调试协议 |
| GameSmith | 预览 iframe 不允许同源，存档通过消息桥接 | 阻止生成代码读取主站 Cookie 和 API | 采用独立预览来源和受限消息协议 |
| OpenGame | Template Skill 选择稳定骨架，Debug Skill 积累已验证修复 | 避免每次重新发明项目结构 | 首轮建立三个 2D 能力包和修复知识库，再扩展 Web 3D 能力包 |
| Prompt-N-Click | 任一步骤可重跑，变更后自动使依赖产物失效 | 节省资源，避免过期下游混入版本 | 资源和构建产物用内容哈希和依赖图追踪 |
| Funplay | UI、操作日志、验证和详情都来自同一事件流 | 避免前端显示、数据库状态和任务日志互相矛盾 | build_event 作为唯一构建账本 |
| Ludo | 选定一张锚点图，后续精灵、场景和动画沿用风格 | 比每张图单独提示更一致 | 资产计划必须有 style_anchor 和派生关系 |
| Rosebud | 非程序员不用看代码，懂代码的人可打开修改 | 同时保留低门槛和控制权 | 首版只读代码查看，后续加入受控编辑 |
| Astrocade | 创作者后台直接连接分析、评论和收益 | 解决“做完没人玩” | 放到 P2，在生成可靠性验证后再建设 |
| 本地三消 | 纯规则模块 + UI 动画 + PWA/APK +结构检查 | 同一玩法能跨网页和手机交付，规则可独立验证 | 作为首个黄金合同和回归基准 |

## 6. 采用与不采用

### 首版采用

- Phaser 作为第一个 2D 运行时适配器，不作为整个平台的引擎上限。
- Playwright 作为真实浏览器试玩。
- 受控玩法骨架和独立规则核心。
- 单一构建事件流。
- 按需技能目录。
- 玩法合同、验收 DSL、调试状态协议。
- 不可变版本和独立预览来源。
- 一次性构建沙箱；生产前再决定自托管容器或 E2B。

### 暂不采用

- M0 阶段的 3D、多人、Unity/Godot/Unreal 适配；这些属于明确的后续平台能力，不是永久排除项。
- 完整可视化场景编辑器。
- 本地 GPU 生成集群。
- 社区、金币、创作者基金和复杂商业分发。
- 自动自由协作的多 Agent 群。
- 未经过代码、依赖和许可证审计的第三方仓库代码。

## 7. 研究缺口

- Refero MCP 当前不可用，所以没有完成其要求的 50+ 界面截图和 5—10 个深度屏幕样本；本轮以官方功能页、官方仓库和本地设计规范完成工作流研究。
- 商业产品的宣传页面不能证明每次生成都达到其宣传质量，需要用真实用户提示进行独立对比测试。
- OpenGame、swipi-engine、Funplay 和 Prompt-N-Click 都较新；许可证允许不等于质量、依赖和安全风险已通过审计。
- 素材生成供应商、单次成本和商用授权尚未选定。
- 国内部署、内容审核、未成年人和生成内容权属需要在公测前进行专门合规评估。
