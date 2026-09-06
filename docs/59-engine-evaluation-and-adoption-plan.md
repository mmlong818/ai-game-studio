# 引擎评估与引入方案

> 状态：实施中；候选清单、评分门禁、B1/B2/B3 夹具与 PlayCanvas 基线已完成
> 决策对象：PlayCanvas、LayaAir、GDevelop、Cocos Engine、Godot、Babylon.js、Phaser、microStudio
> 当前基线：PlayCanvas 2.21.4 + GameProjectV3

## 1. 结论先行

所有引擎首先服务于“非专业用户最小操作获得高完成度小游戏”。引擎、项目格式、构建器和发布器都属于平台内部实现，默认不得要求用户理解运行时、组件、坐标、资源格式或构建参数，也不得让用户在多个引擎之间作技术选择。

当前不更换 PlayCanvas，也不把任何完整 IDE 嵌入平台。下一阶段只做可重复的引擎基准和适配器验证：

- PlayCanvas 保持默认 Web 3D 运行时。
- LayaAir 进入第一优先级验证，目标是确认抖音/微信小游戏、单页 HTML、CLI 与无界面构建是否能显著降低发布成本。
- GDevelop 进入第一优先级架构对照，重点验证结构化对象、行为、事件和扩展的成熟边界；默认不引入其完整编辑器或运行时。
- Phaser 仅作为轻量 2D 运行时候选；Babylon.js 仅作为高阶 Web 3D 能力候选。
- Cocos、Godot、microStudio 维持观察或专项验证，不进入主链迁移。

引擎只有在“新增不可替代发布能力或显著降低实现成本”时才引入。画面能运行、Demo 丰富或宣传支持 AI 都不是引入理由。

## 2. 分层评估，禁止混为一谈

每个候选必须分别判断：

1. **运行时**：渲染、物理、动画、输入、音频、资源与性能。
2. **工程格式**：场景、对象、预制体、行为、规则是否稳定、可生成、可 diff。
3. **编辑器**：是否开放、能否自动操作、是否必须登录。
4. **自动化**：CLI、无头构建、版本锁、CI、测试接口。
5. **发布器**：Web、单页 HTML、小游戏、Native 的真实产物和限制。
6. **云服务**：AI、素材商店、协作和托管是否可替换、自托管及导出。
7. **许可**：引擎代码、编辑器、示例代码、示例资源和商店资源分别审查。

“引擎开源”不能推导出“编辑器、AI 平台和资源可自由使用”。

## 3. 统一基准工程

所有候选使用同一份 GameProjectV3 输入、同一批本地资源和同一套验收，不为候选重写需求。

### B1：2D 动作短局

证明键盘/触控、连续移动、碰撞、对象池、波次、受击、胜负、重开、音效和手机性能。

### B2：2D 逻辑关卡

证明确定性规则、撤销、提示、可解性、关卡数据、存档、无效输入和可访问状态。

### B3：有限 3D 收集机关

证明 glTF、灯光、相机、物理或网格碰撞、动画状态机、检查点、机关规则、性能降级和 Web 发布。

每个基准必须从干净环境执行：`创建工程 → 导入资源 → 编译 → 运行探针 → 多浏览器 → 导出 → 离线启动`。

## 4. 量化评分与硬门禁

| 维度 | 权重 | 硬门禁 |
| --- | ---: | --- |
| GameProjectV3 可映射性 | 20 | 不允许核心规则只能存在于不可 diff 的二进制文件中 |
| 无头构建与确定性 | 15 | 同输入、同版本连续构建的逻辑文件与清单哈希稳定 |
| Web 运行质量 | 15 | 三浏览器可启动，目标手机能完成核心循环 |
| Agent 可控性 | 15 | 能创建场景、绑定资源、构建、取日志和运行测试，无需模拟鼠标完成主链 |
| 发布能力增量 | 10 | 至少新增一个当前无法可靠交付的目标，或显著降低维护成本 |
| 资源与包体 | 10 | 无运行时远程依赖；未使用资源可裁剪；许可清单完整 |
| 开放性与退出成本 | 10 | 项目、源码和发布物可完整导出，停止云服务后仍可构建 |
| 维护与生态 | 5 | 有稳定版本、迁移说明、活跃维护和可复现问题跟踪 |

任一候选出现以下情况直接停止：

- 必须把用户项目或密钥写入不可控云端才能构建。
- 无法冻结引擎版本，或生成结果不能脱离编辑器运行。
- 正式发布包包含未声明远程资源、追踪脚本或不兼容许可。
- 无法把错误映射回对象、行为、规则或资源 ID。
- 为接入一个引擎需要绕过现有质量门禁。
- 需要普通用户手工选择引擎、处理项目结构、补装工具或理解构建错误才能完成默认创作链路。

## 5. 候选定位

| 候选 | 首要价值 | 当前判断 |
| --- | --- | --- |
| PlayCanvas | WebGL2/WebGPU、glTF、WebXR、JS/TS 与 npm 原生 | 保持基线；最适合当前浏览器优先和 Agent 编译模式 |
| LayaAir | 国内小游戏、试玩广告、完整 2D/3D IDE、CLI/MCP | 做第二运行时 PoC；LayaIdea 云平台不作为开源依赖 |
| GDevelop | 完整 MIT 编辑器/引擎、对象/行为/事件结构 | 继续吸收架构；只有导出器或项目格式带来明确收益时再接入 |
| Phaser | 轻量 HTML5 2D、生态大、代码生成直接 | 当 Canvas 2D 自研运行时维护成本过高时验证 |
| Babylon.js | 高阶 WebGPU/3D 工具链 | 只在 PlayCanvas 缺少明确高级能力时验证 |
| Cocos Engine | 国内多端与小游戏生态 | 重新核对具体版本、编辑器开放性和许可后再进入 PoC |
| Godot | 引擎与编辑器完整 MIT、通用 2D/3D | 不适合当前纯 Web 生成主链；作为桌面/Native 长期候选 |
| microStudio | 可自托管网页版创作平台 | 借鉴协作与教学体验，不作为高质量 3D 底座 |

依据：[PlayCanvas Engine](https://github.com/playcanvas/engine)、[LayaAir](https://github.com/layabox/LayaAir)、[GDevelop](https://github.com/4ian/GDevelop)、[Godot](https://github.com/godotengine/godot)、[microStudio](https://github.com/pmgl/microstudio)。

## 6. 适配器边界

新增统一 `EngineAdapter`，而不是在业务代码中散布引擎判断：

```ts
interface EngineAdapter {
  id: string;
  version: string;
  capabilities(): EngineCapabilityManifest;
  validate(project: GameProjectV3): EngineDiagnostic[];
  compile(project: GameProjectV3, target: BuildTarget): Promise<BuildArtifact>;
  createProbeContract(project: GameProjectV3): ProbeContract;
  inspectArtifact(root: string): Promise<ArtifactInspection>;
}
```

适配器只负责运行时映射和产物生成；设计合同、资源来源、规则语义、质量证据、版本和发布指针继续归平台所有。

## 7. 实施阶段

1. **E0 基线冻结**：记录三款基准在 PlayCanvas/现有 2D 运行时的包体、启动、帧率、内存、构建时间和测试结果。
2. **E1 LayaAir PoC**：只实现 B3 和单页 Web；若成功，再验证一个小游戏发布目标。
3. **E2 GDevelop 对照**：用同一 B1/B2 验证对象、行为和事件映射，输出差异报告，不先做产品集成。
4. **E3 轻量 2D 决策**：比较现有 Canvas 2D 与 Phaser 的包体、实现量和探针能力。
5. **E4 决策评审**：只有总分达到 80/100、全部硬门禁通过且维护收益大于新增复杂度，才进入正式适配器。

## 8. 本轮交付定义

- 一份机器可读的候选能力清单和许可证清单。
- 三个固定 GameProjectV3 基准夹具。
- PlayCanvas 基线报告。
- LayaAir PoC 报告及完整导出包。
- GDevelop 架构差异报告。
- 明确的采用、观察或拒绝结论；“以后可能有用”不能视为采用。

## 9. 2026-09-05 实施结果

- 已建立 `src/shared/engine-evaluation/`：8 个候选的能力、自动化、导出边界与逐组件许可清单。
- 已实现 8 维 100 分评分、7 项硬门禁和 `adopt/evaluate/observe/reject` 判定；未知门禁不能采用，任一硬门禁失败直接拒绝。
- 已建立 B1 2D 动作、B2 2D 逻辑、B3 有限 3D 三个可通过 GameProjectV3 校验的固定夹具。
- PlayCanvas 2.21.4 当前静态基线为 87.7/100，硬门禁通过；B3 已有真实引擎证据，B1/B2 明确标记为 `not-run`，不伪装为通过。
- 已提供 `scripts/generate-engine-evaluation-report.ts`，可输出机器可读 JSON 或 Markdown。
- 尚未完成：真实手机与三浏览器性能采样、LayaAir B3/单页 Web 隔离 PoC、GDevelop B1/B2 结构映射。完成这些证据前不引入新生产运行时。
