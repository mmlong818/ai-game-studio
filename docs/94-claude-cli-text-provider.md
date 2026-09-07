# 文本模型接入本机 Claude Code CLI

2026-09-07。本文描述代码行为；某次任务实际使用了哪个模型，以该版本 `_studio/GENERATED_CODE.json` 的 `model` 字段和服务端日志为准。

## 目的

用户授权用付费额度跑通完整创作流程，其中文本部分使用 Claude Code CLI 的订阅额度，而不是另购 Anthropic API Key；图片继续由 OpenAI Key（gpt-image-2）承载。

## 行为

- 环境变量 `STUDIO_TEXT_PROVIDER=claude-cli` 打开该模式；`STUDIO_CLAUDE_MODEL`（默认 `opus`）选择 CLI 模型；`STUDIO_CLAUDE_CLI` 可指定可执行文件路径（默认 `claude`）。
- 创意分析、实时方案（含流式预览）、修改方案、规则审核和游戏代码生成四类文本调用统一通过 `src/server/claude-cli-text-provider.ts` 转发。适配器实现为一个 `fetch` 兼容函数：接收平台原有的 chat-completions 请求体，以 `claude -p` 执行，把结果还原成 chat.completion JSON 或 `text/event-stream`。各生成器的提示词、zod 校验、重试与超时逻辑不变。
- 每次调用都是独立的一轮：`--max-turns 1`、`--tools ""`（不开任何工具）、`--strict-mcp-config`（不加载 MCP）、`--setting-sources ""`（不加载用户与项目设置）、`--no-session-persistence`（不落会话文件）。系统提示通过临时文件传入，结束后删除；用户提示走标准输入。结构化输出使用 `--json-schema`；当命令行放不下 schema 时改由系统提示承载约束，输出仍经 zod 校验。
- 流式模式把 `StructuredOutput` 的 JSON 增量转发为 content 增量；最终以 `finish_reason: stop` 与 `[DONE]` 结束。CLI 报错时非流式返回 4xx/5xx（登录失效为 401，不触发调用方重试），流式发送 `error` 事件而不是伪造完成。请求中止会终止子进程。
- CLI 冷启动较慢，该模式下文本调用超时放宽：创意分析 90 秒、方案 300 秒、代码生成 1200 秒。重试次数与代码生成 3 次请求上限不变。
- 设置面板状态显示“文本模型：本机 Claude CLI 订阅额度（模型）· 图片仍用 OpenAI”，文本模型选择被固定为 `claude-cli:<model>`，图片模型与 Key 逻辑不变。`GENERATED_CODE.json` 与 `game-manifest.json` 记录的模型名同样为 `claude-cli:<model>`。

## 边界

- 依赖本机已登录的 Claude Code；未登录时所有文本调用失败，不回退到 OpenAI 文本模型。
- 不做金额级预算；CLI 返回的费用字段不采集。
- 未验证 `--bare` 模式（会跳过登录凭据，已明确不使用）。
- 单元测试使用假进程模拟 CLI 输出，不消耗额度；真实调用只在用户授权的端到端验收中发生。
