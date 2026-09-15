# 18 款官方游戏统一入库报告

完成时间：2026-09-15（Asia/Shanghai）。

## 结果

官方 registry、启动初始化与大厅现统一为 18 款，不再区分新旧：箭头逃脱、箭头魔方、星梦对决、植光拼图、月港雀旅、空档接龙、果冻填阵、数织矩阵、星灵巡格、软糖拼岛、星环突围、青玉长游、朱门华容、漆海碎星、折光堆叠、椰风海岛、牧野小火车、无限三消。

其中 7 款保持 fixture；11 款保持 template 与原 `spec.template`，仍可进入“改造这个游戏”流程。11 款可移植 bundle 使用 legacy 当前 live publication 的 project/version/spec/build 元数据与发布产物，保留固定 ID；没有模型调用、用户项目、玩家记录或凭据。bundle 共 374 个文件、150,810,425 bytes，`catalog.json` 记录每个文件的大小与 SHA-256；仅剔除了未被运行时使用的 `_studio` 报告/质量截图，页面实际引用的 11 个 `_studio/runtime-inspector.js` 全部保留。

## 数据迁移

- dry-run：主库活动 build/job 均为 0；11 个 project、35 个 spec、35 个 version、24 个 succeeded build、144 个 build step、11 个 live publication 全部不存在于主库，无 slug 冲突。
- apply：事务插入 260 行；第二次 apply 插入 0 行。
- 最终主库：18 个官方项目、18 个唯一 lobby rank、11 个 template；三个用户明确删除的 ID 均不存在。
- 不迁入 play event/player progress 等用户数据；不恢复 legacy 中的 6 个重复 fixture 项目。

## 初始化与身份边界

服务启动从 registry 初始化 7 个 fixture，并从 `official-bundles` 初始化完整 11 个 template。缺目录、缺文件、hash 不匹配、固定 project ID 内容不一致或 live publication/version 不一致都会在写 DB 前明确失败。官方 template 的受信 project ID 写入 `studio_meta`，目录同步只认该映射；更早创建的同名同 template 用户 live 项目不会被升级为官方。

空 PostgreSQL 隔离库运行构建后的真实服务得到 18 款、18 个唯一 rank、11 个 template、0 个已删除用户 ID；第二次启动仍为 18，行数保持 projects/specs/versions/builds/publications 各 18、build_steps 108、template mapping 11。隔离库验证后已按精确库名删除。

## 验证

- 定向 Node tests：6/6 通过，包括空库初始化、二次幂等、缺 bundle 明确失败、稳定路径唯一、runtime inspector 存在，以及“更老同名同 template 用户项目仍非官方”。
- `npm run typecheck` 通过；`npm run build` 通过。
- 全 18 款 stable URL 与 version URL 均为 HTTP 200；对 18 个当前发布版本的全部文件在 stable/version 双路径逐一请求，共 1,408 次资源请求，失败 0。
- 浏览器：主大厅真实渲染 18 张卡片且顺序与 registry 一致；恢复的《植光拼图》和《漆海碎星》均进入可操作界面，console 无输出错误；《植光拼图》的玩家页显示“改造这个游戏”。
- 主服务：4311 preview 运行；4312 studio 与 4313 game origin 由同一无 watch 构建进程运行；活动 build/job 均为 0。

大厅四语言标题与简介继续使用已有 catalog copy。11 个 legacy 游戏本体没有在本任务中扩展为完整四语言运行时；本次只统一官方入库与可玩发布，不改写其游戏内容。
