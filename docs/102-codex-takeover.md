# Codex 接手记录

2026-09-08，基于 `feature/production-reliability` 的 `ed4ae47`。保留未跟踪的 `public/`，不合并main，不改部署包，不启动历史制作。

## 首项修复：方案生成请求去重

同一输入已有未完成请求时，普通访问与“重新生成”都返回同一Promise，继续接收实际流式输出；只有已完成结果才能被明确重新生成。缓存容量清理不能驱逐运行中的请求，否则返回该描述时会再启动模型调用。

这不是远端取消机制：不同描述、其他标签页和页面刷新后的运行中任务仍没有服务端统一去重，不宣称CLI调用可被完整取消。后续需将请求身份、断连处理与CLI子进程生命周期一起处理，不能只abort浏览器后认为费用已经停止。

## 验证

类型检查通过；方案缓存与实时方案组件共8项测试通过，覆盖运行中重复重新生成、完成后明确再生成、缓存容量不驱逐运行中请求。没有真实付费模型调用。

## 后续优先级

1. 服务端方案请求身份与取消生命周期，以及重复请求的端到端检查。
2. 失败帮助与结算的视觉关系、桌面画幅；只在新版本更新运行时，不覆写已交付版本。
3. 从真实制作记录统计修正轮数、失败类别、复用情况，不把默认6轮当作成功率证据。
4. 三浏览器与全量回归；主美审核、部署传输及真人趣味性试玩分别保留独立授权与证据边界。

## 第二项：方案预览断连传递取消

`POST /api/design-preview` 在响应非正常关闭时触发AbortController，传入设计生成器并与模型超时信号组合。外部取消直接退出，不当成超时重试；已取消的请求不会启动模型。普通返回仍使用前端缓存里的原请求，不主动断连。

已有Claude CLI适配器在收到abort时调用其子进程的kill；此次补上API到生成器的信号链。尚未验证Windows下全部后代进程退出，也不承诺远端已经发生的用量会撤回。游戏制作任务及其进度连接不受此取消逻辑影响。

验证：类型检查通过，设计合同20项、CLI适配器/缓存/方案组件18项专项通过，均无真实模型调用。跨标签页服务端任务去重与完整HTTP断连集成验证仍待补齐。

## 第三项：真实HTTP断连集成

方案预览处理抽为 `design-preview-http.ts`，生产路由与测试共用同一处理函数。测试启动随机端口本地HTTP服务，以实际fetch连接再断开，穿过DesignContractGenerator验证提供方收到abort且只请求一次；正常JSON及NDJSON完成均不取消。另对不遵从取消的提供方返回增加保护，断连后不发送结果。

类型检查与23项设计合同/HTTP测试通过，无真实模型调用。测试没有启动完整数据库应用，也没有验证实际Claude后代进程或远端计费撤回；跨标签页服务端去重仍未完成。测试监听器运行后关闭，不占用5312/5313。

## 第四项：流式方案输出的首字与空闲超时

用户原则：**持续产生有效方案文本的流不能按固定总时长截断；阶段反馈必须对应真实阶段，不能用伪造进度掩盖上游等待。**

设计合同生成器的流式请求现在分为两个有界等待，而没有总时长上限：首个非空 `delta.content` 前等待 `streamFirstContentTimeoutMs`，每次后续非空内容后等待 `streamIdleTimeoutMs`。两者默认均继承既有 `timeoutMs`，因此方案预览默认是 **首字 90 秒 / 空闲 90 秒**。空 delta、传输心跳和 reset 不会续期；用户断连取消仍立即传给提供方且不重试。完整响应到达后、本地 `parseDesign` 前才发出“正在校验”阶段；超时、取消、流未完成及提供方错误不会发该阶段。

代码生成器采用同一原则，默认是 **首字 300 秒 / 空闲 300 秒**。`[DONE]` 不是无条件成功：流式与非流式均拒绝 `finish_reason` 为 `length`、`content_filter` 或其他非 `stop` 的截断响应。共享流读取器在正常完成、abort 与异常路径都尝试 cancel 并 release lock，调用层在 finally 清除当前 timer。

非流式的意见审核和规则审核保持原有总等待与有限重试，并不伪装成可持续显示文本的流。设计合同生成器默认最多两次非流式尝试；带 `onDelta` 的流式预览固定一次。代码生成器的网络尝试固定一次；其“三轮”指安全扫描失败后可进行的独立代码生成轮次，不是网络重试。

### 真实复现证据与 OpenAI 调用边界

在修复前的本地 OpenAI 流式 preview 记录中，本地 NDJSON headers 于 23ms 返回（仅证明本地服务已 flush headers，不代表上游 headers）；首个**方案文本** delta 到达 84.320 秒，最后一个 delta 为 90.008 秒，累计 487 个 delta、734 个 JS 字符，90.040 秒后未收到完成结果而停止。服务端记录的是 90 秒总计时 abort；当时没有提交 production（没有 profile/production receipt），也没有上游 HTTP status/body 证据可将其断言为上游 503 或“上游没有响应”。在首字前，客户端可能已看到“模型请求已提交”状态，因此不能描述为“84 秒只能看动画”。

当前文本请求使用 OpenAI Chat Completions endpoint、`gpt-5.6` settings model、`stream: true` 和 strict JSON schema；未显式设置 `reasoning_effort`、`service_tier`、`max_completion_tokens`、temperature、top_p 或 seed。离线 fake-fetch 截获同一 preview 的当前请求体为 19,243 UTF-8 bytes（system 5,656、user 7,742、schema 5,476）；schema 有 12 个数组、其中仅 2 个含 `maxItems`。这说明 prompt/schema 与未受限数组可能增加完成时间风险，但不能单独解释 84 秒首字延迟，也不替代上游时序诊断。未迁移 API 或更换模型。

### 验证与边界

集成回归 **56/56 通过**，覆盖持续 delta 跨越旧总时限、首字超时、有效内容停止后的空闲超时、空事件不续期、取消不重试、reader cleanup，以及 `length`/`content_filter` 截断拒绝。没有在修复后重新发起真实付费 OpenAI 请求，没有重新提交 production，也没有部署。

## 第五项：原生 OpenAI 文本请求采用低推理强度

方案分析、设计方案生成/意见审核/规则审核和游戏代码生成统一从 `OpenAISettings.textRequestOptions()` 取得提供方感知的请求参数。当前明确启用 `reasoning_effort: "low"` 的稳定模型为 `gpt-5.2`、`gpt-5.4`、`gpt-5.4-mini`、`gpt-5.5`、`gpt-5.6`、`gpt-5.6-sol`、`gpt-5.6-terra`、`gpt-5.6-luna` 与 `gpt-6-astra`；当前默认 `gpt-5.6` 因而立即生效。未明确核验能力的其他可选模型和日期快照不附加该字段，本机 Claude CLI 文本提供方也不会收到 OpenAI 专属参数。

本次没有改模型名、API endpoint、密钥、图片生成、结构化输出 schema、流式空闲超时或重试预算，也未增加设置页面选项。专项测试会截获三个真实请求构造点的 mock HTTP body，验证原生支持模型携带 `low`、Claude CLI 省略该字段且 strict schema 保持开启；不发起真实模型调用。

## 第六项：规划、执行与审核模型角色路由

文本调用新增 provider-neutral 的 `planner`、`executor`、`reviewer` 三种角色。想法分析和设计方案由 planner 承担，游戏代码生成由 executor 承担，创作意见与规则落实审核由 reviewer 承担；用户保存的文本模型继续作为 planner/reviewer，保持原设置语义。

执行模型只从**当前生效 Key 已经获取并缓存的模型目录**与明确能力映射的交集中选择，不为路由额外请求模型服务：`gpt-6-astra` 优先路由至可用的 `gpt-5.6-sol`，再考虑 `gpt-5.6` 或 `gpt-5.6-terra`；`gpt-5.6`/`gpt-5.6-sol` 只路由至可用的 `gpt-5.6-terra`。暂不自动采用 Luna、mini 或 nano。目录未获取、目录属于旧 Key、规划模型未知或无合格执行模型时，三个角色使用同一已选模型，不跨提供方回退。Claude CLI 固定同一模型。

设置状态新增可选 `textRouting`，公开三个角色的实际模型、`split`/`same-model` 模式及可解释原因；旧客户端与 fixture 可继续省略该字段。切换会话 Key、清除设置或启用 Claude CLI 会使旧目录失效，避免把另一密钥的可见模型用于当前请求。智谱尚未启用：OpenAI-compatible endpoint 不足以证明 strict schema、流结束和思考参数完全兼容，后续必须使用独立 provider adapter 与兼容性测试。

模型目录的 60 秒期限只决定何时允许重新获取远端列表，不会让一次长制作在中途悄悄改变已经确认的 executor；角色快照持续绑定当前 Key，直到成功刷新目录、换 Key、清除设置或切换文本提供方。

如果同一 Key 的一次成功目录刷新明确确认用户已选 planner 已经消失，状态以 `planner-unavailable` 公开该事实，所有新 planner/executor/reviewer 请求都会在网络调用前停止并要求重新选择；系统不会猜测替换型号，也不会继续向已不可用型号产生付费请求。没有当前 Key 目录证据时仍保守沿用用户模型，不把“未发现”误判为“已下线”。
