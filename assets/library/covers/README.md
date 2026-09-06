# 官方游戏大厅插画

2026-09-06：用户确认使用 OPENAI_API_KEY API 方式，以 imagegen 技能的原版 image_gen.py generate-batch 生成，模型 gpt-image-2，medium，1536×1024。通过 Pillow 缩至 960×640，WebP quality=86，供大厅快速加载。

| 文件 | 主题 |
| --- | --- |
| puzzle-v1.webp | 阳光植物园里的木质拼图、蕨叶与雏菊 |
| island-kart-v1.webp | 热带海岸赛道上的红、蓝、黄三辆赛车 |
| meadow-railway-v1.webp | 田园溪流与石桥上的绿色蒸汽火车 |

原图仅本机保留于 output/imagegen/lobby-covers/；完整最终提示词随正式资源保存在 prompts.jsonl。

这些图片是独立大厅宣传插画，不是游戏运行截图，不宣称游戏实机效果。通过官方登记表 lobbyCover 绑定，只有官方项目使用；原有 cover 以及游戏内部资源保持原样。浏览器测试截图只写到 output，禁止覆盖正式封面。更换图片时使用新的版本文件名，避免 immutable 缓存返回旧图。

验证：登记表和 GameLibrary 共 12 项测试通过；前后端 TypeScript 检查通过；首页第四张为空档接龙；三张封面接口均返回 200 image/webp，未登记资源返回 404；已人工查看生成图片与首页全页截图，3D 标签保留。
