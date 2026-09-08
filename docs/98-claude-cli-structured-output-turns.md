# Claude CLI 结构化输出的纠错轮与错误透出

2026-09-08。本文描述代码行为；模型是否每次都能在纠错轮内给出合格输出，以实际调用记录为准。

## 现象

创作页第一步"看看游戏方案"长时间停在"正在根据你的想法设计玩法"，8 分钟无结果。服务端日志同一时段有 31 次 `设计合同 LLM 生成失败`，其中 19 次原因只有一句"模型流式输出失败"，其余 12 次是 zod 拒绝 `generated_campaign.difficultyKeys`（超过 6 个、不符合 `^[a-z][a-zA-Z0-9]{0,39}$`）或 `milestones` 不递增。Claude CLI 本身可用（订阅额度 5 小时窗口用量 26%），微型探测 2.3 秒返回。

## 根因

用服务端实际使用的命令行原样复现一次：80 秒后 CLI 以退出码 1 结束，结果事件为 `subtype: error_max_turns`、`is_error: true`、`num_turns: 2`、`errors: ["Reached maximum number of turns (1)"]`，没有 `structured_output`。

事件序列说明了机制：CLI 在 `--json-schema` 模式下给模型挂一个 `StructuredOutput` 工具，答案必须写进工具参数；这一次模型把整份 JSON 当成字符串塞进了 `parameters` 字段，CLI 按 schema 校验失败，把错误作为 `tool_result` 返回要求重写——但适配器传的是 `--max-turns 1`，重写轮被掐断，整次调用报错。这是模型偶发的格式失误，所以同一天早些时候的方案生成能成功，之后连续失败。

适配器随后把 `is_error` 且 `result` 不是字符串的结果统一写成"Claude CLI 返回错误。"，设计合同层再压成"模型流式输出失败。"，真实原因在两层里都被丢掉，日志无法定位。

另一半失败（zod 拒绝 `difficultyKeys`）的原因是传给 CLI 的 JSON Schema 里没有写 `maxItems` 与 `pattern`，CLI 校验放行了 zod 会拒绝的输出，而且同样没有重写机会。

前端在失败后不会自动重试；页面之所以显示等待 8 分钟，是多次手动"重新生成"叠加，每次都要等 CLI 跑满一轮再失败。

## 修复

`src/server/claude-cli-text-provider.ts`：

- 带 schema 的请求 `--max-turns 3`（首轮 + 两次按校验错误重写），纯文本请求仍为 1。
- 流式模式监听 `user` 事件里 `is_error` 的 `tool_result`：这表示 CLI 拒绝了上一次结构化输出，适配器清空已转发增量并发出 `{ reset: true }` 事件；最终 `structured_output` 是唯一权威，与已转发增量语义不同时也用 reset + 全文替换。只有空白或键序差异不触发 reset。
- 错误文本改为 `Claude CLI 返回错误（<subtype>）：<errors>`，`error_max_turns` 这类没有 `result` 文本的失败也能说明原因。

调用方逐层接住 reset：`design-contract.ts` 与 `game-generator.ts` 收到 reset 后从头累积文本；`/api/design-preview` 把它转成 `{ type: "reset" }`；前端 `api.ts`/`designPreviewCache.ts` 清空已显示的半截预览。设计合同的错误信息现在带上提供方原文。

`design-contract.ts` 的 JSON Schema 补上 `difficultyKeys.maxItems: 6`、`items.pattern` 与 `milestones.maxItems: 20`，与 zod 一致，让 CLI 在纠错轮内就能要求模型修正。

## 验证

- `src/server/claude-cli-text-provider.test.ts` 新增：纯文本单轮、结构化请求三轮、被拒绝后 reset 且只保留最终结果、同义 JSON 不 reset、`error_max_turns` 错误文本可读。
- 修复后用同一句创意、按创作页相同参数（`template: generated`）真实调用 `/api/design-preview`：192 秒返回 `done`，中途发生 1 次 CLI 拒绝重写；结果含 `collect-set`/`risk-push` 机制、`simultaneous-cycle`/`scarce-budget` 修饰器、5 个局内主体，`difficultyKeys` 5 个且全部合规。这是一次调用的记录，不是成功率。

## 边界

- 纠错轮会拉长单次方案生成时间（本次 192 秒，之前成功的一次约 90 秒），并消耗更多订阅额度；上限 3 轮仍可能失败，失败时错误原文会进入日志与页面。
- 未改动前端的请求去重：反复点"重新生成"仍会并行发起多次 CLI 调用，旧请求不会被取消。
