# 创作流程设计方法与生图约束落地

日期：2026-09-11。本文记录 [103 游戏 UI 方法](103-game-ui-design-methodology.md) 与 [104 OpenAI 图像研究](104-openai-image-prompting-study.md) 在实际创作流程中的接入。它是工程记录，不证明付费模型的最终美术质量。

## 实际阶段与调用

| 阶段 | 实际字段或调用 | 失败处理 |
|---|---|---|
| 策划与设计合同 | 设计合同先确定核心玩点、现有状态、资源角色和验收信号；局部改造由可多选的 `revisionPlan.operations`、来源项目和保留基线约束 | 不为凑状态矩阵新增玩法；合同与用户范围冲突时不进入全量重做 |
| 简单创作资源规划 | `AssetDeliverySpec { fit, background, purpose, safeArea }` 随 role/label/prompt 进入 `/api/image-generation` | 返回尺寸、alpha 或角色合同不符时不写入可用资源 |
| 主构建提示 | `coverPrompt`、`backgroundPrompt`、`roleBitmapPrompt`、`animationSheetPrompt` 按用途、主体、构图与交付、只改变、必须保持组织 | 内部规则不进入玩家文案；缺少明确资源目标时构建停止 |
| 普通新生成 | `/v1/images/generations` JSON 请求，沿用已配置模型，显式 `quality=high`、合规标准 `size`、`output_format=png`；透明主体另传 `background=transparent` | 不改变模型，不以另一模型或占位图回退 |
| 局部资源替换 | 从来源构建复制运行时与资源；仅按内部解析出的目标路径读取本地 PNG，经真实解码后作为 multipart `image` 发送 `/v1/images/edits` | 缺来源、图片无效、自定义 provider 无兼容 edits 地址或 edit 失败时停止；绝不退回无参考 generations 重画 |
| 封面/背景/主体交付 | 来源目标尺寸决定最终槽位；背景等比 cover 并限制裁切保留，主体 contain、透明补边且不放大 | 尺寸不足、极端比例或透明主体没有真实 alpha 时拒绝 |
| 成套素材 | 新生成仍以共享文字锚点约束整套；局部成套替换对每个旧槽位分别使用对应来源图做 reference edit，并保持整套原子提交 | 任一项失败则整套不采用。新生成没有已批准首图时不强行串行引用，因此跨图一致性仍需人工评审 |
| Sprite Sheet | 新动画仍单次生成整张草稿；整套人物换皮和单动作替换都把已验证来源 sheet 作为 reference edit。整套结果按原网格逐格重排；单动作仅把目标 clip 合成回原图 | 未选 clip 像素保留；网格、透明、锚点、面积与轮廓门禁失败即停止。动作自然度和角色一致性仍需真实播放器人工检查 |
| 缓存与溯源 | checkpoint identity 写入 prompt 版本、质量、格式、size 策略、目标 outputs、来源 SHA-256 和 clipId；`IMAGE_GENERATION_RECEIPTS.json` 归档同一 request fingerprint | 任一来源、尺寸、质量、提示版本或 clip 变化都使用新键，不复用旧图 |
| 实际交付进入代码 | 解码后的实际宽高、资源角色和 `cover`/`contain`/`sprite-sheet` 写入项目 `hardConstraints`，代码生成按真实槽位与 `naturalWidth/naturalHeight` 接线 | 动态计划中明确要求的槽位须由新生成、来源复用或精选绑定之一实际落盘；缺项停止，不以程序图形或缺图页面发布 |
| 客观质量与定向修复 | 静态探针、设计合同验收、桌面/手机浏览器检查先报告具体失败项；Advanced 流程把失败证据送入定向 repair，再执行同类复验 | 几何、语义和接线自动检查不能代替 Canvas/WebGL 审美判断；修复后仍须重新验证，不因执行过 repair 就标记通过 |

主构建局部资源改造还会复制来源 `game-manifest.json`，保证复用运行时进入静态验收时具有完整工程清单；未选资源继续从来源构建逐字节保留。

## 验证证据

- mock 验证普通生成使用 JSON、显式质量与 PNG；局部替换使用 `/images/edits` multipart，不手写 `Content-Type`，上传字节与已校验来源 PNG 完全一致。
- mock 验证 reference edit 缺来源或返回错误时不调用 `/images/generations`。
- Orchestrator 集成测试完成“来源构建 → 复制运行时/资源 → 读取目标 PNG → 传入生成器 → 仅覆盖目标 → 未选资源逐字节不变”。
- Orchestrator 对目标 reference edit 的返回文件集合做精确完整比对；接口返回错误或少一项会使本次 build 失败，已发布来源版本保持不变。
- 真实像素测试继续覆盖 cover/contain 比例、透明边缘、裁切门槛、Sprite Sheet 网格和 clip 合成。
- 整套 Sprite Sheet 来源编辑测试核对 `/images/edits`、multipart 原始 sheet 字节、最终尺寸和完整网格元数据；单 clip 测试另核对未选格像素。
- checkpoint 测试验证项目、模型、画幅、prompt、来源哈希、quality、outputs 和 clip 变化使缓存失效；取消后不写成功检查点。

## 尚需人工或真实环境确认

- 本次没有调用付费图像模型，因此尚未验证当前 provider 对 multipart edits、`quality=high` 及指定模型组合的真实响应。
- 新生成的多张成套素材仍依赖文字锚点；模型跨图风格一致性没有自动保证。
- Sprite Sheet 的肢体动作、时间连续性、角色身份稳定和整体观感必须看真实播放，结构测试不能证明动画自然。
- Canvas/WebGL 的构图、HUD 层级、素材协调与整体设计感继续由桌面和手机真实截图人工评审。
