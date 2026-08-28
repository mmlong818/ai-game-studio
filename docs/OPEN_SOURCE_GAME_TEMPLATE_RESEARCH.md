# 开源小游戏模板筛选与接入记录

核验日期：2026-08-27

## 选择标准

- 许可证必须可以明确核验，优先 MIT / BSD / Apache；许可证冲突或资产来源不清的项目不直接接入。
- 玩法必须有完整核心循环、失败或完成条件、重开能力，并能改造成键盘与触控双输入。
- 上游代码和上游媒体资产分开审核。即使代码可用，也不默认复制图片、音乐或音效。
- 老项目只借成熟机制，不照搬旧版界面、构建链和视觉风格。

## 已接入的可玩模板

| 平台模板 | 上游 | 许可证 | 接入方式 | 进入本平台的内容 | 未复制的内容 |
| --- | --- | --- | --- | --- | --- |
| 数字合成 | [Gabriele Cirulli / 2048](https://github.com/gabrielecirulli/2048) | MIT | 代码结构移植 | 四向遍历、单次合并、移动后生成新块、无可用移动判定 | HTML/CSS、字体、视觉和声音 |
| 平台跳跃 | [Phaser Examples](https://github.com/phaserjs/examples) | MIT（代码） | 架构模式适配 | 场景循环、重力、平台落地、收集物和终点状态 | 上游明确排除授权的示例资产；也没有引入 Phaser 依赖 |
| 太空射击 | [Jack Rugile / Radius Raid js13k](https://github.com/jackrugile/radius-raid-js13k) | MIT | 代码结构移植 | 帧循环、波次生成、弹体碰撞、生命与击破目标 | 图像、音效、压缩构建代码和原版界面 |

三类模板都已适配本平台的玩法合同、难度参数、触控按钮、自动测试探针、gpt-image-2 主视觉、程序化音乐和独立交付网址。

## 已通过初审、等待独立重制的候选

| 候选玩法 | 上游 | 代码许可 | 可借鉴内容 | 必须重制的内容 | 结论 |
| --- | --- | --- | --- | --- | --- |
| 多格拼块 | [MkThingsHQ / mkgame-poly](https://github.com/MkThingsHQ/mkgame-poly) | MIT（仅作者独立编写的代码） | 8×8 占位规则、旋转、合法落点与吸附、提示、计分、章节解锁、键盘/触控交互、单元测试结构 | 原 APK 的 1,010 关、已知解、16 种拼块数据、全部图像、音乐和音效 | 适合作为一个新玩法模板，不适合作为平台生成器内核；只能以原创关卡、原创拼块和原创视听资产接入 |
| 方块填阵 | [MkThingsHQ / mkgame-blocks](https://github.com/MkThingsHQ/mkgame-blocks) | MIT（源代码） | 三选拼块、8×8 自由放置、横竖消行、连击计分、无解判定、种子随机、每日挑战、局面恢复、拖拽预览和完整浏览器测试 | 从 Android 应用提取的全部音频、TanStarter 派生图标与品牌素材 | 适合新增独立的“方块填阵”模板；不能替换俄罗斯方块，因为两者的空间规则和节奏不同 |
| 区域独占逻辑 | [MkThingsHQ / mkgame-sudoku](https://github.com/MkThingsHQ/mkgame-sudoku) | MIT（源代码） | 每行/每列/每区域唯一、相邻禁放、自动标记、撤销、提示、失误次数、唯一解验证思路、每日题和进度恢复 | MimoDoku 吉祥物、应用图标、宣传图和来源不明的游戏音乐 | 适合作为新的逻辑放置模板，但不应称为传统数独；需要原创题目生成器和求解器，不能宣传“80 个手工题” |

`mkgame-poly` 核验固定在上游提交 `b464c50150b2a39fa6fcda10c15ff183a7c5c988`，详见 [mkgame-poly 接入审查](./10-mkgame-poly-integration-review.md)。`mkgame-blocks` 核验固定在上游提交 `9ca9d7c2e9fd6c23112aeda8044330c403fafd01`，详见 [mkgame-blocks 接入审查](./11-mkgame-blocks-integration-review.md)。`mkgame-sudoku` 核验固定在上游提交 `2f8af39a365f328f8420d658cd595b79ecf92d14`，详见 [mkgame-sudoku 接入审查](./12-mkgame-sudoku-integration-review.md)。

## 3D 候选与边界

- [three.js](https://github.com/mrdoob/three.js) 是 MIT 许可证、持续维护的 WebGL/WebGPU 基础库，适合作为正式 3D 运行时基础。
- [HexGL](https://github.com/BKcore/HexGL) 是完整的 MIT 浏览器 3D 竞速参考，但代码以旧版 Three.js 和 CoffeeScript 为主，仓库也明确处于暂停维护状态。可借鉴竞速相机、赛道、计时与重放结构，不应原样放进当前生产构建。
- 当前版本仍不会用 2D 画布伪装 3D。正式接入需要独立完成资源加载、场景生命周期、碰撞、性能预算和移动端降级。

## 明确排除的项目

- Clumsy Bird 的旧 `package.json` 曾写 MIT，但仓库当前许可证页面显示 GPL-3.0，元数据存在冲突。本平台不直接复制其代码，也不会把它标成 MIT 模板。
- Phaser Examples 的 README 明确说明源代码是 MIT，但示例资产不在该许可范围内，因此本平台只借代码模式，所有媒体资产重新制作。

## 专业游戏设计要求

每个新项目的 `GAME_DESIGN.md` 必须包含：产品定位、目标玩家、玩家幻想、单局时长、核心循环、胜负条件、局内推进、难度曲线、手感与反馈、新手引导、无障碍、制作风险、开源来源和验收清单。仅有一句玩法描述或静态界面不再视为模板完成。
