# 二次规划：游戏规格与规则合同 v2

## 1. 目标

`game-spec v2` 是产品、生成器、运行时、测试器和发布系统共同使用的唯一规则来源。它需要同时满足：

- 非程序员可以阅读关键内容。
- 程序可以校验字段完整性和相互关系。
- 每条重要规则可以生成测试或人工验收任务。
- 不强迫所有游戏使用相同关卡、胜负或进度结构。
- 新品类可以增加能力模块，不需要重写整个工作流。

## 2. 分层结构

### 2.1 产品意图层

回答“为什么做、为谁做、玩家想获得什么”：

```json
{
  "title": "游戏名称",
  "vision": "一句话玩家体验",
  "genre": "玩法类型",
  "targetPlayer": "目标玩家和主要动机",
  "playerFantasy": "玩家扮演什么并体验什么",
  "sessionLength": { "minimumMinutes": 2, "targetMinutes": 5, "maximumMinutes": 10 },
  "designPillars": ["速度感", "清晰预判", "高风险高收益"]
}
```

`designPillars` 最多 4 条。后续任何功能都必须能解释自己服务于哪一条支柱。

### 2.2 能力声明层

回答“需要什么运行时能力，平台是否支持”：

```json
{
  "dimensions": "2d",
  "perspective": "top-down",
  "simulation": ["arcade-collision"],
  "world": "single-stage",
  "progressionMode": "finite-campaign",
  "networkMode": "single-player",
  "deliveryTarget": "web",
  "inputs": ["keyboard", "pointer", "touch"],
  "requiredCapabilities": ["continuous-movement", "seeded-spawning", "checkpoint-save"]
}
```

构建前必须把能力声明与运行时能力表匹配：

- 全部支持：进入成熟通道。
- 存在实验适配器：进入实验通道并增加人工复核。
- 存在关键缺口：停止并显示暂不支持原因。

### 2.3 改造来源层

每个项目必须记录它是从哪里开始的：

```json
{
  "creationMode": "template-remix",
  "baseTemplateId": "merge-2048",
  "changeLevel": "R1-content-and-tuning",
  "lockedCoreRuleIds": ["RULE-SLIDE-ALL", "RULE-MERGE-EQUAL-ONCE", "RULE-SPAWN-AFTER-MOVE"],
  "borrowedCapabilityIds": ["undo-limited", "best-score"],
  "referenceDossierId": "REF-2048-2026-01",
  "researchRequired": false
}
```

`creationMode` 取值：

- `template-remix`：在成熟模板核心规则内改造。
- `mechanic-composition`：组合多个已验证机制，需要兼容性检查。
- `original-experimental`：没有成熟起点，必须先做同类玩法研究和实验验收。

模板改造级别：

- `R0-presentation`：世界观、角色、视觉、声音和文案。
- `R1-content-and-tuning`：关卡内容、数值、节奏、难度和已有模式组合。
- `R2-small-rule-extension`：只增加一种能够独立测试的小机制。
- `R3-core-rewrite`：改变主要动作、胜负或资源循环；不再视为原模板改造，转入新游戏流程。

### 2.4 生命周期层

平台顶层状态统一为：

- `loading`：加载必要资源。
- `ready`：启动页或本局准备完成。
- `playing`：接受玩法输入。
- `paused`：模拟停止，只接受恢复、设置和退出。
- `result`：本局、回合、阶段或章节已经结算。
- `error`：无法继续，提供可读原因和恢复方式。

结算结果单独记录：

- `completed`
- `failed`
- `draw`
- `abandoned`

具体游戏可以声明内部阶段，例如 `wave`、`route-choice`、`shop`、`dialogue`、`level-complete`。平台不再把所有玩法强制压缩成 `idle/playing/won/lost` 四个状态。

### 2.5 动作合同

每个主要动作必须声明：

```json
{
  "id": "ACT-BOOST",
  "label": "露珠冲刺",
  "availableWhen": ["state=playing", "dewEnergy>0"],
  "inputBindings": ["Space", "touch:boost"],
  "continuous": true,
  "effects": ["dewEnergy decreases", "scrollSpeed increases", "resin becomes breakable"],
  "feedback": ["speed-lines", "pitch-rise", "button-active", "optional-vibration"]
}
```

主要动作至少提供一条触控路径和一条桌面路径。不能只声明按键名称，必须说明动作在什么状态可用、改变什么以及玩家如何感知结果。

### 2.6 实体与资源合同

实体至少包含：

- ID 与角色类型。
- 碰撞或交互区域。
- 生成和销毁条件。
- 对玩家状态的影响。
- 视觉与声音识别要求。

资源至少包含：

- 初始值、上下限和单位。
- 获得与消耗规则。
- 是否跨关、跨局或永久保存。
- 归零或达到目标时触发什么。

### 2.7 规则合同

每条 P0/P1 规则采用统一结构：

```json
{
  "id": "RULE-DEW-PICKUP",
  "priority": "P0",
  "trigger": "dew overlaps ladybug head collider",
  "conditions": ["state=playing", "dew.resolved=false"],
  "effects": ["dew.resolved=true", "dew removed", "dewEnergy += 25"],
  "invariants": ["body-only overlap does not collect dew", "one dew resolves at most once"],
  "observable": ["dew disappears", "burst particles appear", "energy bar increases"],
  "failureMessage": "露珠没有由头部正确获取"
}
```

规则优先级：

- `P0`：核心玩法、胜负、用户硬约束、数据安全；失败即停止发布。
- `P1`：难度、技巧目标、引导、恢复和关键体验；默认阻止正式发布，可作为实验版待复核。
- `P2`：润色和非阻塞增强；可以进入后续迭代，但必须公开记录。

### 2.8 不变量合同

不变量描述任何时刻都不能被破坏的事实，例如：

- 可解谜题必须至少存在一个解。
- 玩家宽度必须小于有效通路净宽。
- 程序生成障碍必须至少保留一条可达路线。
- 同一个收集物只能结算一次。
- 失败不能解锁下一关。
- 历史最佳评价不能因重玩而下降。
- 暂停时计时器、物理和敌人 AI 不得继续运行。

确定性游戏使用求解器、状态遍历或属性测试验证；随机游戏使用固定种子、边界种子和批量抽样验证。

### 2.9 参考资料合同

需要研究的项目必须记录：

- 参考游戏或规则文档名称与网址。
- 来源类型：官方规则、官方产品页、原作者开源仓库、许可明确的实现或补充观察。
- 核验日期。
- 实际学习的规则、输入、节奏、风险收益或恢复设计。
- 明确不复制的品牌、美术、声音、文案和界面识别。
- 如果借鉴代码，记录许可证和实际使用范围。
- 本作最终采用、调整和拒绝了哪些参考要素，以及原因。

规则资料和代码许可分开记录。能够公开查看一款游戏，不等于可以复制其代码或媒体资源。

## 3. 进度模型

取消“所有游戏至少 20 关”的硬编码，改为六种模式：

| 模式 | 适用玩法 | 必须验证 |
| --- | --- | --- |
| `finite-campaign` | 益智、关卡动作 | 解锁、关卡差异、最终完成、最佳评价 |
| `endless` | 生存、高分、节奏 | 难度持续增长、无死循环、历史最佳、正常退出 |
| `run-based` | 肉鸽、短局构筑 | 种子、阶段、选择、失败重开、局外记录 |
| `round-based` | 回合制、棋盘对局 | 先后手、回合边界、结算、平局和重赛 |
| `chapter-based` | 叙事、探索 | 章节存档、选择后果、结局可达性 |
| `sandbox` | 模拟、创造 | 目标可选、状态保存、资源边界、无强制胜负 |

有限关卡仍推荐五阶段节奏，但关卡数量由内容目标决定。20 关可以作为成熟模板的质量目标，不再是通用规格的最低值。

## 4. 难度合同

难度必须区分以下轴线，禁止用单个 `easy/normal/hard` 文案代替真实参数：

- 信息复杂度。
- 操作窗口。
- 资源压力。
- 敌人或障碍密度。
- 决策后果。
- 恢复机会。
- 随机波动。

每次引入新机制时只允许同时提高一个主要压力轴。首次教学不能同时缩短反应时间、增加障碍密度和提高目标量。

## 5. 爽点与游戏感合同

每个游戏必须声明 1–3 个核心爽点，并把它们拆成可观察信号：

| 爽点 | 可观察设计信号 |
| --- | --- |
| 速度 | 背景位移、速度层次、视差/光流、音高、操控响应、碰撞余量 |
| 命中 | 命中停顿、位移冲击、受击反馈、伤害数字、音效瞬态 |
| 合成 | 运动轨迹、合并时序、数值跳变、生成节奏、连锁反馈 |
| 推理 | 信息完整、排除反馈、错误解释、提示理由、解法唯一性 |
| 收集 | 触碰判定、消失反馈、资源增长、稀有度、阶段奖励 |
| 构筑 | 选择可比较、协同可感知、冲突明确、路线后果可追踪 |

“看起来有特效”不是通过条件。必须证明玩家动作和反馈之间存在稳定的因果关系。

## 6. 运行时测试协议

所有运行时在探针模式提供统一接口：

```ts
interface GameProbe {
  getState(): PublicGameState;
  listActions(): AvailableAction[];
  performAction(actionId: string, payload?: unknown): Promise<ActionResult>;
  setSeed(seed: number): void;
  restart(options?: { checkpoint?: string }): void;
  snapshot(): SerializableGameSnapshot;
}
```

游戏可以额外提供专属探针，但不能只提供 `forceWin` 和 `forceLose`。强制状态钩子只验证结算 UI；核心规则必须通过 `performAction`、纯规则模拟器或求解器证明。

## 7. 验收计划结构

每个验收项必须包含：

```json
{
  "id": "AC-DEW-PICKUP-HEAD",
  "sourceRuleIds": ["RULE-DEW-PICKUP"],
  "priority": "P0",
  "setup": { "seed": 17, "scene": "pickup-test" },
  "actions": ["move-up"],
  "assertions": [
    "dew count decreases by 1",
    "energy increases by 25",
    "burst particle count > 0"
  ],
  "evidence": ["before-state", "after-state", "screenshot", "event-log"],
  "status": "pending"
}
```

验收状态只能由绑定该 ID 的检查更新。禁止因为整个构建没有报错，就把所有非视觉验收项统一改为通过。

## 8. 版本与证据绑定

以下文件必须共享同一组版本标识：

- 设计合同。
- 规则合同。
- 游戏代码。
- 资源清单。
- 自动检查报告。
- 人工复核报告。

最少记录：

```json
{
  "buildId": "不可变构建 ID",
  "specHash": "设计与规则合同哈希",
  "codeHash": "可执行代码哈希",
  "assetManifestHash": "资源清单哈希",
  "checkedAt": "验收时间",
  "checkerVersion": "验收器版本"
}
```

任何哈希变化都会让旧验收结果失效。报告不能只依赖游戏名称或版本标签关联。
