# OpenAI 图像提示与游戏素材映射

阅读日期：2026-09-11。

本文整理 OpenAI 官方图像提示与 Image API 文档，并映射到 AI Game Studio 的封面、背景、角色、局部资源替换和 Sprite Sheet 链路。本文是项目研究记录，不更改模型、API 参数或运行时配置；示例模板仍须结合具体素材槽位使用。

> 实施状态：本文“提示词落点”和“确证缺口”记录的是实施前阅读基线。2026-09-11 已按其中结论接入创作链，实际现状见 [105-creation-pipeline-design-enforcement.md](105-creation-pipeline-design-enforcement.md)。未来工作不得把下方历史缺口误读为当前能力。

## 官方来源

- [GPT Image 2.5 prompting guide](https://developers.openai.com/api/docs/guides/image-prompting)
- [Image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
- [GPT-Image-2.5 Sunburst model](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst)
- [Images API reference](https://developers.openai.com/api/reference/resources/images)
- [Responses create reference](https://developers.openai.com/api/reference/resources/responses/methods/create)

官方 prompting guide 的可运行完整示例仍固定使用 `gpt-image-2`。它用于展示工作流，不是 GPT Image 2.5 的参数样例；采用 2.5 时必须以当前模型页和 Image API 支持参数为准。

## 官方事实摘要

[提示基础](https://developers.openai.com/api/docs/guides/image-prompting#prompting-fundamentals)要求先写清产物用途、主体、构图、比例、可见细节和约束；人物补充取景、尺度、视线与动作。编辑时分开“只改变”与“必须保持”，给每张参考图指定主体、风格或背景等角色。逐轮只改一个条件并复述关键约束；必须像素不变的区域应本地合成。透明同时用 API 参数、PNG/WebP 和解码 alpha 验证；文字需引号、位置、次数并逐字验收。镜头描述只是外观线索，更高质量也不保证更好。

[结果检查](https://developers.openai.com/api/docs/guides/image-prompting#check-the-result)覆盖文字、关系、身份、几何、参考细节、编辑范围和 alpha。[限制](https://developers.openai.com/api/docs/guides/image-generation#limitations)仍包括文字、重复角色一致性和结构化构图精度。本次所读文档未提供 Sprite Sheet 专门协议或跨帧连续性保证，因此项目仍需自己的网格合同、像素门禁和真实播放评审。

## API 事实表

| 能力 | 当前官方接口事实 | 项目使用时的边界 |
|---|---|---|
| Image generations | 文本生成；模型、`quality`、`size`、`background`、格式是独立参数 | 不接收参考图或 mask |
| Image edits | Image guide 的实际示例使用 multipart `image`/`image[]` 文件上传，最多 16 张；Images resource reference 当前还描述 JSON 风格 `images:[{file_id,image_url}]` 与 `mask:{file_id,image_url}` | 官方页面存在请求形态差异；实施时以实际 SDK 版本和 endpoint schema 核验，禁止混用两套字段 |
| 局部 mask | 与编辑图同格式、同尺寸、均小于 50MB，并含 alpha；多输入时只作用于第一张图 | mask 是模型引导，不保证严格贴合形状；必须检查未选区域并在需要时本地合成 |
| Responses 图像工具 | 顶层使用支持工具的主模型；输入图用 JSON `input_image` 的 `file_id`、公网 URL 或 base64 data URL；2.5 放在 `image_generation` 工具的 `model`，支持 generate/edit 选择和 `previous_response_id` 多轮 | 模型页“Responses 不支持”指 2.5 不能作顶层 Responses 模型；顶层模型可能改写提示词，实际文本见 `revised_prompt` |
| GPT Image 2.5 输出 | `quality=auto/low/medium/high/xhigh/max`；尺寸可 `auto` 或自定义 | 自定义边长为 16 倍数、比例 1:3–3:1、单边≤3840、总像素 655,360–8,294,400；高于 2560×1440 像素量为实验范围 |
| 透明与压缩 | 透明需 PNG/WebP 和 `background=transparent`；`output_compression` 只用于 JPEG/WebP | 仍须解码检查真实 alpha；PNG 不传压缩参数 |
| 输入保真 | Responses tool reference 写 `input_fidelity=low/high` 且默认 low；Image guide 明确 `gpt-image-2` 不可传并固定高保真；2.5 Images edit reference 只列 low/high，没有确认默认值 | 不把旧模型例外或 Responses 默认值推断为 2.5 Images API 默认值 |
| Partial 与用量 | Images/Responses 均支持 `partial_images=0..3`；可能提前完成而少于请求数，每张 partial 另计 100 image output tokens | ImagesResponse reference 的 usage 注释与 2.5 guide 要求读取 `response.usage` 存在文档不同步；接入前以真实 2.5 响应和当前 SDK 类型核验 |

## 本项目的提示词落点（实施前基线）

当前主要实现在 `src/server/image-generator.ts`：

| 素材 | 当前提示词 | 已有本地约束 |
|---|---|---|
| 封面 | 用途、题材、玩家幻想、风格、中央安全区和可裁余量 | 根据游戏画幅选择 provider 尺寸；本地等比 cover；裁切保留不足 65% 时拒绝 |
| 局内背景 | 明确纯环境、无主角/棋盘/UI、低对比、边缘延展 | 本地等比 cover；防止背景干扰玩法主体 |
| 静态角色/道具 | 单一主体、角色提示、透明背景、约 8% 留白、小尺寸轮廓 | API 显式透明；PNG 解码与真实 alpha 检查；本地 contain 与透明补边 |
| 成套块面 | 每张共享文字风格锚点，整套同时生成/替换 | 任一失败则整套弃用，避免新旧混排 |
| Sprite Sheet | 固定行列、row-major、动作顺序、同一角色、固定脚底、安全边和一致性边界 | 单张草稿切格、逐帧共同尺度处理、固定锚点、再打包；真实透明/越界/面积/轮廓门禁；局部 clip 替换保留其他格像素 |

请求层当前只使用 `/v1/images/generations`。它发送模型、提示词、三种标准尺寸之一、PNG 格式，并只对透明主体发送透明背景参数；没有调用 image edit、reference images 或 mask。`quality` 未显式发送，因此采用服务端默认行为。

当前项目默认禁止素材内出现文字、字母、数字、Logo 或水印，因此官方“精确文字”技巧主要用于说明风险和未来明确需要烘焙文字的例外；游戏 HUD 与按钮文字应继续由 HTML/Canvas 代码绘制。

## 项目推导：以后编写素材提示词的顺序

下面是本项目的原创模板，不是官方原文，也不代表模型保证：

```text
用途：素材在游戏中的角色、最终显示尺寸和玩家需要读出的信息
画布：目标比例、交付 fit、透明或不透明、允许裁切的安全区
主体：数量、外形、材质、比例、取景范围、朝向、动作与辨识特征
构图：主体位置、相对尺度、前中后景、HUD/玩法覆盖区、必须留空区域
视觉语言：项目已有配色、笔触、光照、轮廓与参考素材的指定角色
只改变：本次明确改造的对象或动画 clip
必须保持：身份、几何、布局、相机、光照、未选资源和未选帧
禁止：文字、Logo、水印、多余主体、棋盘格伪透明、跨格污染
交付：文件格式、目标尺寸、alpha、Sprite Sheet 网格/帧序/锚点（如适用）
验收：真实像素尺寸、alpha、裁切保留、边缘、缩小可读性、与游戏实画面/动画播放
```

Sprite Sheet 需额外写明：单元格宽高、列/行、总帧数、动作片段与帧序、固定相机、角色共同尺度、脚底锚点、透明边界和未使用格透明。角色帧不能各自缩放到满格；蹲下、受击等真实轮廓变化必须保留。特效可自然改变面积，但不得污染邻格。即使提示完整，也只能称为候选动画草稿，必须经过逐格像素门禁和真实播放器人工预览。

## 已有优势、缺口与后续选择

### 已有优势

- 透明主体同时使用 API 参数、提示词和真实 alpha 解码检查。
- cover/contain 均为等比处理；背景有裁切保留门槛，主体使用透明补边。
- 部分资源替换会复制未选资源；Sprite Sheet 局部 clip 替换会保留未选格的源像素，符合“必须不变时本地合成”的思路。
- 动画提示已如实声明单次生成不能保证手工动画一致性，并要求真实播放预览。

### 实施前确证缺口

1. 部分资源替换只读取来源图片尺寸，没有把被替换图片作为参考图提交给编辑端点。因此身份、造型或原风格的保持依赖文字，不能宣称精确继承。
2. 多张成套块面和普通主体分别生成，只共享文字风格锚点；没有指定参考图角色，也没有用已通过的首张约束后续图，一致性仍需人工检查。
3. Sprite Sheet 采用一次生成整张草稿，适合减少跨请求角色漂移，但结构化网格正属于官方所说的布局敏感构图；本地切片和门禁能发现部分问题，不能证明动作自然或角色完全一致。
4. API 请求没有显式 `quality`，尺寸类型也只覆盖三种标准画幅，尚未利用 GPT Image 2.5 的自定义尺寸能力。是否调整需要先完成成本、模型支持、provider 兼容和代表性素材评测。
5. 当前没有 image edit/reference/mask 流程，也没有“上一结果作为下一次单目标编辑”的产品化迭代链路。引入前应先定义可回滚基线、请求预算和验收标准。

### 不应直接照搬

- 不把摄影镜头术语当作精确几何或物理保证。
- 不因更高 `quality` 就声称结果必然更好。
- 不把提示词中的“保持不变”当作像素级承诺。
- 不把单张漂亮 Sprite Sheet 当作动作一致性或播放质量证明。
- 不把官方样例固定的 `gpt-image-2` 代码直接改名后当作 2.5 已验证集成。
