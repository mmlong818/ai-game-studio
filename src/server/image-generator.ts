import { visualStyleOptions, type GameTemplate, type ProjectDetail, type RevisionAssetCandidate } from "../shared/contracts.js";
import type { SpriteAnimationClipId, SpriteSheetAnimation } from "../shared/generated-blueprint.js";
import { type OpenAISettings } from "./openai-settings.js";
import { packAnimationSpriteSheet, replaceAnimationSpriteClip, splitSpriteSheetDraft, SpriteSheetValidationError, type SpriteFrameSourceMetadata, type SpriteSheetWarning } from "./sprite-sheet.js";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import sharp from "sharp";
import { cancellationSignal, withTimeoutSignal } from "./cancellation.js";
import { BuildFailure, safeFailure } from "./build-failure.js";
import { reportImageRepair } from "./image-repair-progress.js";

const DEFAULT_ENDPOINT = "https://api.openai.com/v1/images/generations";
const DEFAULT_EDIT_ENDPOINT = "https://api.openai.com/v1/images/edits";
const DEFAULT_TIMEOUT_MS = 90_000;
const MAX_PROVIDER_ATTEMPTS_PER_RESOURCE = 3;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const MAX_IMAGE_PIXELS = 20_000_000;
const MIN_COVER_AXIS_RETENTION = 0.65;
export const IMAGE_TRANSFORM_VERSION = "deterministic-layout-v2" as const;

type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";
const IMAGE_QUALITY = "high" as const;
const IMAGE_OUTPUT_FORMAT = "png" as const;
export const IMAGE_PROMPT_VERSION = "game-assets-2026-09-11-auto-repair-1";

interface ImageAttemptBudget { used: number; max: number }
export interface ImageRepairAction { attempt: number; code: string; message: string }

export interface ImageRequestFingerprint {
  promptVersion: typeof IMAGE_PROMPT_VERSION;
  quality: typeof IMAGE_QUALITY;
  outputFormat: typeof IMAGE_OUTPUT_FORMAT;
  sizeStrategy: "standard-aspect-v1";
  transformVersion: typeof IMAGE_TRANSFORM_VERSION;
  sourceSha256: Record<string, string>;
  outputs: Readonly<Record<string, ImageOutputConstraint>>;
  presentations: Readonly<Record<string, Pick<SpritePresentationContract, "fit" | "anchor" | "safeInsetRatio" | "minSourcePixels">>>;
  clipId?: SpriteAnimationClipId;
}

export function imageRequestFingerprint(
  sources: Readonly<Record<string, Buffer>> = {},
  outputs: Readonly<Record<string, ImageOutputConstraint>> = {},
  clipId?: SpriteAnimationClipId,
  presentations: Readonly<Record<string, SpritePresentationContract>> = {},
): ImageRequestFingerprint {
  return {
    promptVersion: IMAGE_PROMPT_VERSION,
    quality: IMAGE_QUALITY,
    outputFormat: IMAGE_OUTPUT_FORMAT,
    sizeStrategy: "standard-aspect-v1",
    transformVersion: IMAGE_TRANSFORM_VERSION,
    sourceSha256: Object.fromEntries(Object.entries(sources).sort(([a], [b]) => a.localeCompare(b)).map(([file, bytes]) => [file, createHash("sha256").update(bytes).digest("hex")])),
    outputs: Object.fromEntries(Object.entries(outputs).sort(([a], [b]) => a.localeCompare(b))),
    // region/logicalSize affect runtime placement only. Excluding them prevents a
    // layout-only edit from spending another image request.
    presentations: Object.fromEntries(Object.entries(presentations).sort(([a], [b]) => a.localeCompare(b)).map(([file, presentation]) => [file, {
      fit: presentation.fit, anchor: presentation.anchor, safeInsetRatio: presentation.safeInsetRatio, minSourcePixels: presentation.minSourcePixels,
    }])),
    ...(clipId ? { clipId } : {}),
  };
}

export type ImageFit = "cover" | "contain";
export interface SpritePresentationContract {
  region: "playfield" | "hud" | "overlay";
  fit: "contain";
  logicalSize: { min: number; max: number };
  anchor: { x: number; y: number };
  safeInsetRatio: number;
  minSourcePixels: number;
}
export interface ImageOutputConstraint {
  width: number;
  height: number;
  fit: ImageFit;
  /** Normalized focal point for cover, or alignment within the safe area for contain. */
  anchor?: { x: number; y: number };
  /** Transparent inset reserved on every side for contained subjects. */
  safeInsetRatio?: number;
  /** Minimum useful source pixels on either axis; transparent subjects use their alpha bounds. */
  minSourcePixels?: number;
  requireAlpha?: boolean;
}
export interface ImageTransformMetadata {
  version: typeof IMAGE_TRANSFORM_VERSION;
  sourceSha256: string;
  anchor: { x: number; y: number };
  safeInsetRatio: number;
  minSourcePixels: number;
  requireAlpha: boolean;
  sourceContentBounds?: { left: number; top: number; width: number; height: number };
  resized: { width: number; height: number };
  placement: { left: number; top: number };
  crop?: { left: number; top: number; width: number; height: number };
}
export interface ImageDeliveryMetadata {
  providerSource: { width: number; height: number; hasAlpha: boolean; hasTransparency: boolean };
  providerFrames?: SpriteFrameSourceMetadata[];
  delivered: { width: number; height: number; fit: ImageFit | "sprite-sheet" };
  spriteSheet?: SpriteSheetAnimation;
  warnings?: SpriteSheetWarning[];
  repairs?: ImageRepairAction[];
  transform?: ImageTransformMetadata;
  presentation?: SpritePresentationContract;
}

const outputByAspect: Record<ProjectDetail["spec"]["aspectRatio"], ImageOutputConstraint> = {
  "16:9": { width: 1536, height: 864, fit: "cover" },
  "4:3": { width: 1360, height: 1020, fit: "cover" },
  "1:1": { width: 1024, height: 1024, fit: "cover" },
  "9:16": { width: 864, height: 1536, fit: "cover" },
};
const generatedMetadata = new WeakMap<Buffer, ImageDeliveryMetadata>();

function checkedConstraint(value: ImageOutputConstraint): Required<ImageOutputConstraint> {
  const { width, height, fit } = value;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 4096 || height > 4096 || width * height > MAX_IMAGE_PIXELS) {
    throw new Error(`图片交付尺寸无效：${width}×${height}。`);
  }
  if (fit !== "cover" && fit !== "contain") throw new Error(`图片交付 fit 无效：${String(fit)}。`);
  const anchor = value.anchor ?? { x: 0.5, y: 0.5 };
  const safeInsetRatio = value.safeInsetRatio ?? 0;
  const minSourcePixels = value.minSourcePixels ?? 1;
  const requireAlpha = value.requireAlpha ?? false;
  if (![anchor.x, anchor.y].every(number => Number.isFinite(number) && number >= 0 && number <= 1)) throw new Error("图片锚点必须位于 0 到 1 之间。");
  if (!Number.isFinite(safeInsetRatio) || safeInsetRatio < 0 || safeInsetRatio > 0.25) throw new Error("图片安全留白比例必须位于 0 到 0.25 之间。");
  if (!Number.isInteger(minSourcePixels) || minSourcePixels < 1 || minSourcePixels > 4096) throw new Error("图片最低源像素必须是 1 到 4096 的整数。");
  if (fit === "cover" && safeInsetRatio > 0) throw new Error("cover 会裁切画面，不能同时声明透明安全留白。");
  return { width, height, fit, anchor, safeInsetRatio, minSourcePixels, requireAlpha };
}

async function alphaContentBounds(bytes: Buffer, source: Awaited<ReturnType<typeof readPngDimensions>>) {
  if (!source.hasTransparency) return undefined;
  const { data, info } = await sharp(bytes, { failOn: "error", limitInputPixels: MAX_IMAGE_PIXELS }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    if (data[(y * info.width + x) * 4 + 3] === 0) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  return right < left ? undefined : { left, top, width: right - left + 1, height: bottom - top + 1 };
}

export async function readPngDimensions(bytes: Buffer): Promise<{ width: number; height: number; hasAlpha: boolean; hasTransparency: boolean }> {
  const image = sharp(bytes, { failOn: "error", limitInputPixels: MAX_IMAGE_PIXELS });
  const [metadata, stats] = await Promise.all([image.metadata(), image.clone().stats()]);
  if (metadata.format !== "png" || !metadata.width || !metadata.height) throw new Error("图像不是可解码的 PNG 文件。");
  return {
    width: metadata.width,
    height: metadata.height,
    hasAlpha: Boolean(metadata.hasAlpha),
    hasTransparency: Boolean(metadata.hasAlpha && !stats.isOpaque),
  };
}

export function generatedImageDelivery(bytes: Buffer): ImageDeliveryMetadata | null {
  return generatedMetadata.get(bytes) ?? null;
}

export async function adaptGeneratedPng(bytes: Buffer, rawConstraint: ImageOutputConstraint): Promise<{ bytes: Buffer; metadata: ImageDeliveryMetadata }> {
  const constraint = checkedConstraint(rawConstraint);
  const providerSource = await readPngDimensions(bytes);
  if (constraint.requireAlpha && !providerSource.hasTransparency) throw new Error("生图结果没有真实透明区域，不能满足透明主体交付合同。");
  const sourceContentBounds = await alphaContentBounds(bytes, providerSource);
  const usefulWidth = sourceContentBounds?.width ?? providerSource.width;
  const usefulHeight = sourceContentBounds?.height ?? providerSource.height;
  if (Math.min(usefulWidth, usefulHeight) < constraint.minSourcePixels) throw new Error(`生图主体有效源像素只有 ${usefulWidth}×${usefulHeight}，低于最低要求 ${constraint.minSourcePixels}px。`);
  let resizedWidth: number;
  let resizedHeight: number;
  let placement = { left: 0, top: 0 };
  let crop: ImageTransformMetadata["crop"];
  if (constraint.fit === "cover") {
    const scale = Math.max(constraint.width / providerSource.width, constraint.height / providerSource.height);
    if (scale > 1.0001) throw new Error(`生图结果只有 ${providerSource.width}×${providerSource.height}，不足以无损适配 ${constraint.width}×${constraint.height}。`);
    const visibleWidthRatio = constraint.width / scale / providerSource.width;
    const visibleHeightRatio = constraint.height / scale / providerSource.height;
    if (Math.min(visibleWidthRatio, visibleHeightRatio) < MIN_COVER_AXIS_RETENTION) {
      const retainedPercent = Math.round(Math.min(visibleWidthRatio, visibleHeightRatio) * 100);
      throw new Error(`生图结果比例 ${providerSource.width}:${providerSource.height} 与目标 ${constraint.width}:${constraint.height} 不符，等比裁切只能保留较短轴 ${retainedPercent}% 的画面（最低要求 ${MIN_COVER_AXIS_RETENTION * 100}%）；请按接近目标的画幅重新生成。`);
    }
    resizedWidth = Math.max(constraint.width, Math.round(providerSource.width * scale));
    resizedHeight = Math.max(constraint.height, Math.round(providerSource.height * scale));
    const overflowX = resizedWidth - constraint.width;
    const overflowY = resizedHeight - constraint.height;
    crop = { left: Math.round(overflowX * constraint.anchor.x), top: Math.round(overflowY * constraint.anchor.y), width: constraint.width, height: constraint.height };
  } else {
    const insetX = Math.round(constraint.width * constraint.safeInsetRatio);
    const insetY = Math.round(constraint.height * constraint.safeInsetRatio);
    const availableWidth = constraint.width - insetX * 2;
    const availableHeight = constraint.height - insetY * 2;
    const scale = Math.min(1, availableWidth / providerSource.width, availableHeight / providerSource.height);
    resizedWidth = Math.max(1, Math.round(providerSource.width * scale));
    resizedHeight = Math.max(1, Math.round(providerSource.height * scale));
    placement = {
      left: insetX + Math.round((availableWidth - resizedWidth) * constraint.anchor.x),
      top: insetY + Math.round((availableHeight - resizedHeight) * constraint.anchor.y),
    };
  }
  const resized = await sharp(bytes, { failOn: "error", limitInputPixels: MAX_IMAGE_PIXELS }).resize({ width: resizedWidth, height: resizedHeight, fit: "fill", kernel: sharp.kernel.lanczos3 }).png().toBuffer();
  const pipeline = constraint.fit === "cover"
    ? sharp(resized).extract(crop!)
    : sharp({ create: { width: constraint.width, height: constraint.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: resized, ...placement }]);
  const deliveredBytes = await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
  const delivered = await readPngDimensions(deliveredBytes);
  if (delivered.width !== constraint.width || delivered.height !== constraint.height) {
    throw new Error(`图片适配后尺寸为 ${delivered.width}×${delivered.height}，不符合目标 ${constraint.width}×${constraint.height}。`);
  }
  const metadata: ImageDeliveryMetadata = {
    providerSource,
    delivered: { width: delivered.width, height: delivered.height, fit: constraint.fit },
    transform: {
      version: IMAGE_TRANSFORM_VERSION,
      sourceSha256: createHash("sha256").update(bytes).digest("hex"),
      anchor: constraint.anchor,
      safeInsetRatio: constraint.safeInsetRatio,
      minSourcePixels: constraint.minSourcePixels,
      requireAlpha: constraint.requireAlpha,
      ...(sourceContentBounds ? { sourceContentBounds } : {}),
      resized: { width: resizedWidth, height: resizedHeight },
      placement,
      ...(crop ? { crop } : {}),
    },
  };
  generatedMetadata.set(deliveredBytes, metadata);
  return { bytes: deliveredBytes, metadata };
}

function providerSizeFor(constraint: ImageOutputConstraint): ImageSize {
  const ratio = constraint.width / constraint.height;
  return ratio > 1.2 ? "1536x1024" : ratio < 1 / 1.2 ? "1024x1536" : "1024x1024";
}

const spriteOutputRepairCodes = new Set([
  "SPRITE_FRAME_FORMAT", "SPRITE_FRAME_SUBJECT", "SPRITE_FRAME_TRANSPARENCY", "SPRITE_SHEET_FORMAT",
  "SPRITE_FRAME_RESOLUTION", "SPRITE_CLIP_AREA", "SPRITE_CLIP_ASPECT",
]);

function outputRepair(error: unknown): { code: string; feedback: string; message: string } | null {
  if (error instanceof SpriteSheetValidationError) {
    if (!spriteOutputRepairCodes.has(error.code)) return null;
    const feedback = error.code === "SPRITE_FRAME_SUBJECT" ? "每个网格都必须包含一个清晰可见的完整角色帧，不能有空格。"
      : error.code === "SPRITE_FRAME_TRANSPARENCY" || error.code === "SPRITE_SHEET_FORMAT" ? "输出必须是带真实透明背景的 PNG；不要绘制底色、棋盘格、格线或伪透明背景。"
        : error.code === "SPRITE_CLIP_AREA" || error.code === "SPRITE_CLIP_ASPECT" ? "保持同一角色在各帧中的身体比例和共同尺度稳定，只通过姿势变化表达动作。"
          : error.code === "SPRITE_FRAME_RESOLUTION" ? "每个网格中的角色帧必须有足够像素尺寸，完整占据网格主体区域并保留透明安全边。"
            : "严格输出可解码的透明 PNG Sprite Sheet，并保持每个网格边界清楚、内容完整。";
    return { code: error.code, feedback, message: `检测到动画草稿质量异常（${error.code}），系统已保留角色、画风、动作、网格和尺寸意图并重新生成该资源。` };
  }
  const message = error instanceof Error ? error.message : "";
  if (/交付尺寸无效/.test(message)) return null;
  if (/没有真实透明|透明区域|不足以无损适配|比例 .* 与目标 .* 不符|不是可解码的 PNG/.test(message)) {
    const feedback = /透明/.test(message)
      ? "输出必须是带真实 alpha 的透明 PNG；主体完整居中，四周保留透明安全边，不能绘制底色或棋盘格。"
      : "保持原有主体、画风和构图意图，按要求画幅输出足够分辨率的完整 PNG，并为等比适配保留安全裁切区域。";
    return { code: /透明/.test(message) ? "INVALID_ALPHA" : "INVALID_IMAGE_LAYOUT", feedback, message: "检测到图片透明度、分辨率或画幅不符合交付要求，系统已保留原有内容和画风意图并重新生成该资源。" };
  }
  return null;
}

function repairPrompt(original: string, repair: { code: string; feedback: string }, attempt: number): string {
  return [original, `自动纠错（第 ${attempt} 次交付尝试）：上一结果未通过 ${repair.code} 检查。`, repair.feedback,
    "必须保持：用户要求的角色身份、辨识特征、玩法用途、美术风格、目标画幅与尺寸意图；只纠正上述交付问题，不新增对象、文字、Logo 或水印。"].join("\n");
}

/** 单个可动态主题化的角色位图:只收方向无关、不承担成套结构的角色,避免与规则表意冲突。 */
export interface RoleArtSpec {
  file: string;
  role: string;
  hint: string;
  animation?: SpriteSheetAnimation;
  presentation?: SpritePresentationContract;
}

// Phase 1 的角色动态生图计划。成套块面(2048 数字块、俄罗斯方块、砖块三态)不在此列——
// 单独替换其中几张会造成同组风格断裂,整套生成属于后续阶段。
const roleArtPlan: Partial<Record<GameTemplate, RoleArtSpec[]>> = {
  snake: [
    { file: "assets/stage-c/snake-food-v2.png", role: "食物", hint: "蛇要收集的食物,单个主体、可爱诱人、轮廓清晰" },
    { file: "assets/stage-c/snake-obstacle-v2.png", role: "障碍物", hint: "致命的固定障碍物,单个主体、有明确危险感但不血腥" },
  ],
};

export function roleArtPlanFor(template: GameTemplate): RoleArtSpec[] {
  return roleArtPlan[template] ?? [];
}

/**
 * 成套块面计划(Phase 2):同组块面必须整套生成、整套替换——任何一张失败就整套弃用,
 * 绝不允许模板块与生成块混排造成风格断裂。anchor 是整套共享的风格锚点。
 */
export interface SpriteSetSpec {
  anchor: string;
  entries: RoleArtSpec[];
}

const spriteSetPlan: Partial<Record<GameTemplate, SpriteSetSpec>> = {
  "merge-2048": {
    anchor: "这是同一套六级数字块块面中的一张:六张共用完全相同的圆角方形轮廓、材质质感、光照方向与描边语言,只随等级递增亮度、饱和度与装饰华丽度;画面中绝对不能出现数字或文字(数字由游戏运行时叠加)",
    entries: [
      { file: "assets/sprites/sprite-02.png", role: "1 级块面", hint: "六级中的第 1 级:最朴素、色彩最浅、几乎无装饰" },
      { file: "assets/sprites/sprite-03.png", role: "2 级块面", hint: "六级中的第 2 级:略微升温的色彩,一点点装饰" },
      { file: "assets/sprites/sprite-04.png", role: "3 级块面", hint: "六级中的第 3 级:中等饱和度,装饰开始清晰" },
      { file: "assets/sprites/sprite-05.png", role: "4 级块面", hint: "六级中的第 4 级:色彩明快,装饰醒目" },
      { file: "assets/sprites/sprite-06.png", role: "5 级块面", hint: "六级中的第 5 级:华丽,带柔和内发光" },
      { file: "assets/sprites/sprite-07.png", role: "6 级块面", hint: "六级中的第 6 级(最高):最华丽,明显发光与高光点缀" },
    ],
  },
};

export function spriteSetPlanFor(template: GameTemplate): SpriteSetSpec | null {
  return spriteSetPlan[template] ?? null;
}

function styleOf(project: ProjectDetail) {
  return visualStyleOptions.find((option) => option.id === project.spec.visualStyle)!;
}

function themeLines(project: ProjectDetail): string[] {
  const style = styleOf(project);
  const design = project.spec.designProfile;
  return [
    `游戏名称:${project.title}。玩法类型:${design.genre}。`,
    `创意描述:${project.spec.vision}`,
    `画面风格:${style.label}——${style.description};细节密度:${style.detailLabel};题材方向:${project.spec.artStyle}。`,
    ...(project.spec.renovation && project.spec.renovation.revisionScope !== "gameplay" ? [`本次局部改造要求:${project.spec.renovation.request}。只落实明确点名的视觉或资源变化，未点名的对象保持原样。`] : []),
    "硬性禁止:画面中不得出现任何文字、字母、数字、Logo 或水印。",
  ];
}

function renovationReferenceLines(project: ProjectDetail, target: string): string[] {
  if (project.spec.renovation?.revisionScope !== "assets") return [];
  return [
    `参考图 1（来源素材）:这是当前游戏正在使用的${target}，必须作为身份、几何、比例、镜头、光照和既有美术语言的参考。`,
    `只改变:${project.spec.renovation.request}。`,
    "必须保持:参考图主体身份与辨识特征、原槽位用途、构图功能和未点名细节；不要增加新的对象、文字、Logo 或水印。",
  ];
}

export function coverPrompt(project: ProjectDetail): string {
  const design = project.spec.designProfile;
  return [
    `用途:为一款网页小游戏绘制主视觉封面插画。`,
    ...themeLines(project).slice(0, 2),
    `主体与体验:玩家幻想:${design.playerFantasy}`,
    ...themeLines(project).slice(2),
    ...renovationReferenceLines(project, "主视觉封面"),
    `构图与交付:最终将按 ${project.spec.aspectRatio} 画幅等比裁切；核心玩法主体放在中央安全区，四周保留可裁切余量；背景服务主体不喧宾夺主，色彩层次分明。`,
  ].join("\n");
}

function backgroundPrompt(project: ProjectDetail): string {
  return [
    `用途:为一款网页小游戏绘制局内棋盘背后的场景背景图。`,
    ...themeLines(project),
    ...renovationReferenceLines(project, "局内环境背景"),
    `构图与交付:最终将按 ${project.spec.aspectRatio} 画幅从中央等比裁切；纯环境氛围图，没有前景主角、没有棋盘或界面元素，边缘保留可裁切的延展场景；整体低对比、低饱和、细节柔和,`,
    "因为棋盘、角色和交互元素会覆盖在它上面——背景绝不能喧宾夺主或干扰前景可读性。",
  ].join("\n");
}

function roleBitmapPrompt(project: ProjectDetail, spec: RoleArtSpec, setAnchor: string | null = null): string {
  const design = project.spec.designProfile;
  return [
    `用途:为一款网页小游戏绘制一张游戏内角色或道具位图:${spec.role}。`,
    `主体:${spec.hint}。`,
    ...(setAnchor ? [`成套一致性(最高优先级):${setAnchor}。`] : []),
    ...themeLines(project),
    // 设计合同承载对话修订后的最新规则(如"桂花糕改成莲子"),创意描述是最初原文;
    // 两者冲突时必须以规则语境为准,否则角色位图会退回修订前的题材。
    `规则语境(优先于创意描述,冲突时以此为准):核心循环:${design.coreLoop.join("→")};胜利:${design.winCondition};失败:${design.failCondition}。`,
    ...renovationReferenceLines(project, spec.role),
    "构图与交付:单一主体居中，完全透明背景并保留约 8% 安全留白；后续只会等比缩放和透明补边，绝不拉伸主体；边缘干净无杂色,",
    "主体在缩小到棋盘格尺寸后仍轮廓清晰可辨。",
  ].join("\n");
}

function animationSheetPrompt(project: ProjectDetail, spec: RoleArtSpec & { animation: SpriteSheetAnimation }, clipId?: SpriteAnimationClipId): string {
  const clips = clipId ? spec.animation.clips.filter(clip => clip.id === clipId) : spec.animation.clips;
  const frameCount = clips.reduce((sum, clip) => sum + clip.frameCount, 0);
  const columns = clipId ? Math.min(4, frameCount) : spec.animation.columns;
  const rows = clipId ? Math.ceil(frameCount / columns) : spec.animation.rows;
  return [
    `用途:为网页小游戏绘制角色动画 Sprite Sheet：${spec.role}。主体:${spec.hint}。`,
    ...themeLines(project),
    ...renovationReferenceLines(project, `${spec.role}动画${clipId ? `的 ${clipId} 动作` : ""}`),
    `构图与交付:只输出一张完全透明背景的 PNG，严格 ${columns} 列 × ${rows} 行，row-major 共 ${frameCount} 个有内容的连续动作帧，不画格线、文字、标签或额外对象。`,
    `动作顺序：${clips.map(clip => `${clip.id} 连续 ${clip.frameCount} 帧`).join("；")}。每格只出现同一个角色的一帧，身份、服装、颜色、视角、线条和光照必须稳定。`,
    "所有角色帧脚底位于相同高度并留透明安全边；effect 帧围绕同一中心。帧之间表现连续运动，不得把同一姿势简单复制。",
    "输出仍会经过逐格透明性、越界、主体面积与轮廓跳变检查，并要求实际播放预览；单次生成不能保证达到手工动画的一致性。",
  ].join("\n");
}

export interface DynamicArtEntry {
  file: string;
  role: string;
  bytes: Buffer;
  prompt: string;
  image?: ImageDeliveryMetadata;
  expectedSpriteSheet?: SpriteSheetAnimation;
}

/** Pure plan for cache validation; never requests images or needs a key. */
/**
 * 生成式游戏的局内主体来自确认方案里的知识蓝图，与背景同批生成，
 * 因此代码生成时这些位图已经存在，可以直接绘制而不是用程序化图形自绘。
 * 同批主体共享一个风格锚点，避免几张图各自为政。
 */
export function blueprintSpriteSet(project: ProjectDetail): SpriteSetSpec | null {
  const blueprint = project.spec.template === "generated" ? project.spec.designProfile.generatedBlueprint : undefined;
  if (!blueprint) return null;
  return {
    anchor: `这是同一款游戏的一套局内主体位图之一，共 ${blueprint.sprites.length} 张：全部共用相同的笔触、描边语言、光照方向与配色体系，彼此并排出现时必须像同一位美术在同一天画的；每张只画本条描述的单一主体`,
    entries: blueprint.sprites.map(({ file, role, hint, animation, presentation }) => ({ file, role, hint, presentation, ...(animation ? { animation } : {}) })),
  };
}

export function spritePresentationContracts(project: ProjectDetail): Record<string, SpritePresentationContract> {
  return Object.fromEntries((blueprintSpriteSet(project)?.entries ?? []).filter(spec => spec.presentation).map(spec => [spec.file, spec.presentation!]));
}

export function imageOutputConstraintsForProject(project: ProjectDetail): Record<string, ImageOutputConstraint> {
  const outputs: Record<string, ImageOutputConstraint> = {
    "assets/cover.png": outputByAspect[project.spec.aspectRatio],
    "assets/background.png": outputByAspect[project.spec.aspectRatio],
  };
  for (const spec of [...roleArtPlanFor(project.spec.template), ...(spriteSetPlanFor(project.spec.template)?.entries ?? []), ...(blueprintSpriteSet(project)?.entries ?? [])]) {
    if (spec.animation) continue;
    outputs[spec.file] = { width: 1024, height: 1024, fit: "contain", requireAlpha: true,
      ...(spec.presentation ? { anchor: spec.presentation.anchor, safeInsetRatio: spec.presentation.safeInsetRatio, minSourcePixels: spec.presentation.minSourcePixels } : {}) };
  }
  return outputs;
}

function blueprintSpritePlan(project: ProjectDetail): Array<Omit<DynamicArtEntry, "bytes">> {
  const set = blueprintSpriteSet(project);
  if (!set) return [];
  return set.entries.map(spec => ({ file: spec.file, role: spec.role, prompt: spec.animation ? animationSheetPrompt(project, spec as RoleArtSpec & { animation: SpriteSheetAnimation }) : roleBitmapPrompt(project, spec, set.anchor), ...(spec.animation ? { expectedSpriteSheet: spec.animation } : {}) }));
}

export function dynamicArtPlan(project: ProjectDetail): Array<Omit<DynamicArtEntry, "bytes">> {
  if (project.spec.template === "generated" && ["reference-replica", "original-demo"].includes(project.spec.designProfile.creationMode)) {
    return blueprintSpritePlan(project);
  }
  const set = spriteSetPlanFor(project.spec.template);
  return [
    { file: "assets/background.png", role: "局内背景", prompt: backgroundPrompt(project) },
    ...roleArtPlanFor(project.spec.template).map(spec => ({ file: spec.file, role: spec.role, prompt: roleBitmapPrompt(project, spec) })),
    ...(set?.entries.map(spec => ({ file: spec.file, role: spec.role, prompt: roleBitmapPrompt(project, spec, set.anchor) })) ?? []),
    ...blueprintSpritePlan(project),
  ];
}

export interface AssetRenovationTarget {
  kind: "single" | "set";
  files: string[];
  label: string;
  clipId?: SpriteAnimationClipId;
}

type AssetTargetCandidate = AssetRenovationTarget & { aliases: string[] };

function assetTargetCandidates(project: ProjectDetail): AssetTargetCandidate[] {
  const spriteSet = spriteSetPlanFor(project.spec.template);
  const blueprintSet = blueprintSpriteSet(project);
  return [
    { kind: "single", files: ["assets/cover.png"], label: "游戏封面", aliases: ["封面", "封面图", "宣传图"] },
    { kind: "single", files: ["assets/background.png"], label: "局内背景", aliases: ["背景", "背景图", "场景背景", "环境背景"] },
    ...roleArtPlanFor(project.spec.template).map((entry): AssetTargetCandidate => ({
      kind: "single",
      files: [entry.file],
      label: entry.role,
      aliases: [entry.role],
    })),
    ...(spriteSet ? [{
      kind: "set" as const,
      files: spriteSet.entries.map(({ file }) => file),
      label: "整套数字块块面",
      aliases: ["块面", "数字块", "整套块面", "方块皮肤", ...spriteSet.entries.map(({ role }) => role)],
    }] : []),
    ...(blueprintSet?.entries.map((entry): AssetTargetCandidate => ({
      kind: "single",
      files: [entry.file],
      label: entry.role,
      aliases: [entry.role],
    })) ?? []),
  ];
}

const staticAnimationUnavailableReason = "来源运行时将此资源作为单张静态图片显示，未声明图集帧或播放器，不能升级为精灵动图。";

function staticAssetLabel(role: unknown, filename: string) {
  const semantic = `${typeof role === "string" ? role : ""} ${filename}`.toLowerCase();
  // This is keyed to a portable asset semantic from a manifest, never to a fixture
  // or project id. The visible name lets a Chinese request identify the source tile.
  if (/(?:match3[-_]tile[-_])?heart/.test(semantic)) return "心卡";
  return filename.replace(/\.png$/i, "").replace(/[-_]+/g, " ");
}

function staticAssetManifestCandidates(sourceRoot?: string): RevisionAssetCandidate[] {
  if (!sourceRoot) return [];
  const assetsRoot = join(sourceRoot, "assets");
  if (!existsSync(assetsRoot)) return [];
  const candidates: RevisionAssetCandidate[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) { visit(fullPath); continue; }
      if (entry.name !== "manifest.json") continue;
      try {
        const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as { assets?: Array<{ filename?: unknown; role?: unknown }> };
        for (const asset of parsed.assets ?? []) {
          if (typeof asset.filename !== "string" || !asset.filename.toLowerCase().endsWith(".png")) continue;
          const imagePath = join(directory, asset.filename);
          if (!existsSync(imagePath)) continue;
          const file = relative(sourceRoot, imagePath).replaceAll("\\", "/");
          if (!file.startsWith("assets/")) continue;
          candidates.push({
            file,
            label: staticAssetLabel(asset.role, asset.filename),
            kind: "other",
            recommended: false,
            supportsAnimation: false,
            animationUnavailableReason: staticAnimationUnavailableReason,
          });
        }
      } catch { /* An unrelated or malformed manifest cannot block revision planning. */ }
    }
  };
  try { visit(assetsRoot); } catch { return []; }
  return candidates;
}

export function revisionAssetCandidates(project: ProjectDetail, sourceRoot?: string): RevisionAssetCandidate[] {
  const planned = assetTargetCandidates(project).flatMap((candidate) => candidate.files.map((file) => {
    const label = candidate.files.length === 1 ? candidate.label : dynamicArtPlan(project).find((entry) => entry.file === file)?.role ?? candidate.label;
    const kind: RevisionAssetCandidate["kind"] = file === "assets/cover.png"
      ? "cover"
      : file === "assets/background.png"
        ? "background"
        : /唐僧|妖|主角|角色|玩家|敌人|怪物|蛇头|人物/.test(label)
          ? "role"
          : "other";
    const blueprint = project.spec.designProfile.generatedBlueprint?.sprites.find((entry) => entry.file === file);
    const supportsAnimation = kind === "role" && Boolean(blueprint);
    return {
      file, label, kind, recommended: false, supportsAnimation,
      ...(!supportsAnimation ? { animationUnavailableReason: staticAnimationUnavailableReason } : {}),
    };
  }));
  const knownFiles = new Set(planned.map((candidate) => candidate.file));
  return [...planned, ...staticAssetManifestCandidates(sourceRoot).filter((candidate) => !knownFiles.has(candidate.file))];
}

/** Resolve exactly one source-art slot before any paid image call. */
export function resolveAssetRenovationTarget(project: ProjectDetail): AssetRenovationTarget {
  const renovation = project.spec.renovation;
  if (!renovation || renovation.revisionScope !== "assets") throw new Error("当前任务不是部分资源替换，不能解析资源目标。");
  const request = renovation.request.trim();
  const actionClauses = request
    .split(/[，。；;\n]/)
    .map((clause) => clause.replace(/(?:并|同时)?(?:保留|保持|不要改|不改).*/, "").trim())
    .filter((clause) => /替换|换成|换掉|改成|重画|更新/.test(clause));
  const targetText = actionClauses.length ? actionClauses.join("，") : request;
  const candidates = assetTargetCandidates(project);
  const matches = candidates.filter(({ aliases }) => aliases.some((alias) => targetText.includes(alias)));
  if (matches.length === 1) {
    const { kind, files, label } = matches[0]!;
    return { kind, files: [...files], label };
  }
  if (matches.length > 1) throw new Error(`一次只能替换一个资源目标；当前同时提到了：${matches.map(({ label }) => label).join("、")}。请只保留其中一项。`);
  throw new Error(`没有识别出要替换的具体资源。请明确写出其中一项：${candidates.map(({ label }) => label).join("、")}。`);
}

interface CoverArtOptions {
  fetchImpl?: typeof fetch;
  endpoint?: string;
  editEndpoint?: string;
  timeoutMs?: number;
}

export class CoverArtGenerator {
  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;
  private readonly editEndpoint: string | null;
  private readonly timeoutMs: number;

  constructor(private readonly settings: OpenAISettings, options: CoverArtOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    this.editEndpoint = options.editEndpoint
      ?? (options.endpoint ? (options.endpoint.endsWith("/generations") ? `${options.endpoint.slice(0, -"/generations".length)}/edits` : null) : DEFAULT_EDIT_ENDPOINT);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  get model() { return this.settings.status().models.image; }

  /** 返回 PNG 封面字节；没有密钥或生成失败时返回 null，由构建门禁中断本次构建。 */
  async generate(project: ProjectDetail, output: ImageOutputConstraint = outputByAspect[project.spec.aspectRatio], sourceImage?: Buffer): Promise<Buffer | null> {
    this.requireRenovationReference(project, sourceImage, "封面");
    return this.tryImage("封面", {
      prompt: coverPrompt(project),
      size: providerSizeFor(output),
      output,
      resource: { file: "assets/cover.png", label: "封面" },
      ...(sourceImage ? { sourceImage } : {}),
    });
  }

  /** 局内场景背景（低对比氛围图）；失败返回 null，由构建门禁中断本次构建。 */
  async generateBackground(project: ProjectDetail, output: ImageOutputConstraint = outputByAspect[project.spec.aspectRatio], sourceImage?: Buffer): Promise<Buffer | null> {
    this.requireRenovationReference(project, sourceImage, "局内背景");
    return this.tryImage("局内背景", {
      prompt: backgroundPrompt(project),
      size: providerSizeFor(output),
      output,
      resource: { file: "assets/background.png", label: "局内背景" },
      ...(sourceImage ? { sourceImage } : {}),
    });
  }

  /** 透明底角色位图;失败返回 null 保留模板角色。 */
  async generateRoleBitmap(project: ProjectDetail, spec: RoleArtSpec, setAnchor: string | null = null, output: ImageOutputConstraint = { width: 1024, height: 1024, fit: "contain" }, sourceImage?: Buffer): Promise<Buffer | null> {
    this.requireRenovationReference(project, sourceImage, spec.role);
    const bytes = await this.tryImage(`角色位图(${spec.role})`, {
      prompt: roleBitmapPrompt(project, spec, setAnchor),
      size: providerSizeFor(output),
      transparent: true,
      output: { ...output, fit: "contain", requireAlpha: true },
      resource: { file: spec.file, label: spec.role },
      ...(sourceImage ? { sourceImage } : {}),
    });
    const metadata = bytes ? generatedImageDelivery(bytes) : null;
    if (metadata && spec.presentation) metadata.presentation = spec.presentation;
    return bytes;
  }

  /**
   * Generates one transparent multi-frame draft, then splits and normalizes every
   * cell before packing. A clip replacement preserves all non-target source cells.
   * The provider has no reference-image input on this endpoint, so visual
   * continuity remains subject to the measurable gates and playback review.
   */
  async generateAnimationSpriteSheet(
    project: ProjectDetail,
    spec: RoleArtSpec & { animation: SpriteSheetAnimation },
    options: { sourceSheet?: Buffer; clipId?: SpriteAnimationClipId } = {},
  ): Promise<DynamicArtEntry | null> {
    const apiKey = this.settings.getApiKey();
    if (!apiKey) throw this.missingImageConfiguration([{ file: spec.file, label: spec.role }], "sprite-sheet-edit");
    if (!options.sourceSheet && options.clipId) throw new Error("替换单个动画动作时必须同时提供来源 Sprite Sheet 与 clipId。");
    const selectedClip = options.clipId ? spec.animation.clips.find(({ id }) => id === options.clipId) : undefined;
    if (options.clipId && !selectedClip) throw new Error(`Sprite Sheet 不包含动作 ${options.clipId}。`);
    const frameCount = selectedClip?.frameCount ?? spec.animation.frameCount;
    const columns = selectedClip ? Math.min(4, frameCount) : spec.animation.columns;
    const rows = selectedClip ? Math.ceil(frameCount / columns) : spec.animation.rows;
    const prompt = animationSheetPrompt(project, spec, options.clipId);
    const budget: ImageAttemptBudget = { used: 0, max: MAX_PROVIDER_ATTEMPTS_PER_RESOURCE };
    const repairs: ImageRepairAction[] = [];
    try {
      let nextPrompt = prompt;
      while (budget.used < budget.max) {
        try {
          const draft = await this.requestImage({ prompt: nextPrompt,
            size: providerSizeFor({ width: spec.animation.frameWidth * columns, height: spec.animation.frameHeight * rows, fit: "contain" }),
            transparent: true, ...(options.sourceSheet ? { sourceImage: options.sourceSheet } : {}) }, apiKey, budget);
          const providerSource = await readPngDimensions(draft);
          if (!providerSource.hasTransparency) throw new Error("Sprite Sheet 草稿没有真实透明区域。");
          const frames = await splitSpriteSheetDraft(draft, { columns, rows, frameCount });
          const packed = options.sourceSheet && options.clipId
            ? await replaceAnimationSpriteClip(options.sourceSheet, spec.animation, options.clipId, frames, { minSourcePixels: spec.presentation?.minSourcePixels })
            : await packAnimationSpriteSheet(frames, spec.animation, { minSourcePixels: spec.presentation?.minSourcePixels });
          const delivered = await readPngDimensions(packed.bytes);
          const image: ImageDeliveryMetadata = { providerSource, providerFrames: packed.providerFrames,
            delivered: { width: delivered.width, height: delivered.height, fit: "sprite-sheet" }, spriteSheet: packed.animation,
            ...(spec.presentation ? { presentation: spec.presentation } : {}),
            ...(packed.warnings.length ? { warnings: packed.warnings } : {}), ...(repairs.length ? { repairs } : {}) };
          generatedMetadata.set(packed.bytes, image);
          return { file: spec.file, role: spec.role, bytes: packed.bytes, prompt, image };
        } catch (error) {
          if (cancellationSignal()?.aborted) throw error;
          const repair = outputRepair(error);
          if (!repair) throw error;
          if (budget.used >= budget.max) throw Object.assign(error instanceof Error ? error : new Error("动画草稿未通过质量检查。"), { autoRepairExhausted: true });
          repairs.push({ attempt: budget.used + 1, code: repair.code, message: repair.message });
          await reportImageRepair({ resource: { file: spec.file, label: spec.role }, attempt: budget.used + 1, maxAttempts: budget.max, code: repair.code, message: repair.message });
          nextPrompt = repairPrompt(prompt, repair, budget.used + 1);
        }
      }
      throw new Error("动画资源自动修复请求预算已用尽。");
    } catch (error) {
      if (cancellationSignal()?.aborted) throw error;
      throw new BuildFailure(`角色动画“${spec.role}”未生成可用图集。`, [safeFailure("asset", error, {
        resource: { file: spec.file, label: spec.role }, operation: "sprite-sheet-edit",
      })], error);
    }
  }

  /** 成套块面:并行生成整套;任何一张失败返回空数组(整套弃用,保持模板套装完整)。 */
  async generateSpriteSet(project: ProjectDetail, outputs: Readonly<Record<string, ImageOutputConstraint>> = {}, sourceImages: Readonly<Record<string, Buffer>> = {}): Promise<DynamicArtEntry[]> {
    const plan = spriteSetPlanFor(project.spec.template);
    if (!plan) return [];
    if (!this.settings.getApiKey()) throw this.missingImageConfiguration(plan.entries.map(({ file, role }) => ({ file, label: role })), "image-generation");
    const settled = await Promise.allSettled(plan.entries.map(async (spec) => {
      const bytes = await this.generateRoleBitmap(project, spec, plan.anchor, outputs[spec.file], sourceImages[spec.file]);
      return bytes ? { file: spec.file, role: spec.role, bytes, prompt: roleBitmapPrompt(project, spec, plan.anchor), image: generatedImageDelivery(bytes) ?? undefined } : null;
    }));
    if (cancellationSignal()?.aborted) throw cancellationSignal()!.reason;
    const failures = settled.flatMap(result => result.status === "rejected" ? result.reason instanceof BuildFailure ? result.reason.details : [safeFailure("asset", result.reason, { operation: "sprite-set-generation" })] : []);
    if (failures.length) throw new BuildFailure("成套资源未完整生成，已停止制作并保留来源版本。", failures);
    const results = settled.map(result => result.status === "fulfilled" ? result.value : null);
    if (results.some((entry) => entry === null)) {
      console.warn(`成套块面生成不完整(${results.filter(Boolean).length}/${plan.entries.length}),整套弃用以保持风格一致。`);
      return [];
    }
    return results as DynamicArtEntry[];
  }

  /**
   * 默认按完整计划并行生成动态美术；传入 files 时只生成已解析的目标槽位。
   * 只返回成功项；prompt 一并返回供产物溯源归档。封面由调用方单独生成。
   */
  async generateDynamicArt(project: ProjectDetail, files?: readonly string[], outputs: Readonly<Record<string, ImageOutputConstraint>> = {}, sourceImages: Readonly<Record<string, Buffer>> = {}): Promise<DynamicArtEntry[]> {
    const completePlan = dynamicArtPlan(project);
    if (completePlan.length === 0 && !files?.length) return [];
    const selectedFiles = files ? new Set(files) : null;
    if (selectedFiles) {
      const plannedFiles = new Set(completePlan.map(({ file }) => file));
      const unknown = [...selectedFiles].filter((file) => !plannedFiles.has(file));
      if (unknown.length) throw new Error(`指定的局内资源不在生成计划中：${unknown.join("、")}。`);
      const spriteSetFiles = spriteSetPlanFor(project.spec.template)?.entries.map(({ file }) => file) ?? [];
      const selectedSetCount = spriteSetFiles.filter((file) => selectedFiles.has(file)).length;
      if (selectedSetCount > 0 && selectedSetCount !== spriteSetFiles.length) throw new Error("成套块面必须整套替换，不能只生成其中一部分。");
      if (project.spec.renovation?.revisionScope === "assets") {
        const missingReferences = [...selectedFiles].filter((file) => !sourceImages[file]);
        if (missingReferences.length) throw new Error(`部分资源替换缺少已校验的来源图片：${missingReferences.join("、")}；已停止制作，不会退回无参考重画。`);
      }
    }
    if (!this.settings.getApiKey()) {
      const planned = completePlan.filter(({ file }) => !selectedFiles || selectedFiles.has(file));
      throw this.missingImageConfiguration(planned.map(({ file, role }) => ({ file, label: role })), "image-generation");
    }
    const selected = (file: string) => !selectedFiles || selectedFiles.has(file);
    const planned = new Set(completePlan.map(({ file }) => file));
    const jobs: Array<Promise<DynamicArtEntry | null>> = [
      ...(planned.has("assets/background.png") && selected("assets/background.png") ? [this.generateBackground(project, outputs["assets/background.png"], sourceImages["assets/background.png"]).then((bytes) => bytes
        ? { file: "assets/background.png", role: "局内背景", bytes, prompt: backgroundPrompt(project), image: generatedImageDelivery(bytes) ?? undefined }
        : null)] : []),
      ...roleArtPlanFor(project.spec.template).filter(({ file }) => planned.has(file) && selected(file)).map((spec) =>
        this.generateRoleBitmap(project, spec, null, outputs[spec.file], sourceImages[spec.file]).then((bytes) => bytes
          ? { file: spec.file, role: spec.role, bytes, prompt: roleBitmapPrompt(project, spec), image: generatedImageDelivery(bytes) ?? undefined }
          : null)),
    ];
    // 蓝图声明的局内主体必须真的生成；只进入计划而不生成会让每一次生成游戏的资源步骤必定中断。
    const blueprintSet = blueprintSpriteSet(project);
    const groups = await Promise.allSettled([
      Promise.allSettled(jobs).then(results => {
        if (cancellationSignal()?.aborted) throw cancellationSignal()!.reason;
        const failures = results.flatMap(result => result.status === "rejected" ? result.reason instanceof BuildFailure ? result.reason.details : [safeFailure("asset", result.reason, { operation: "asset-generation" })] : []);
        if (failures.length) throw new BuildFailure("部分必需局内资源未生成，已停止制作并保留来源版本。", failures);
        return results.map(result => result.status === "fulfilled" ? result.value : null);
      }),
      spriteSetPlanFor(project.spec.template)?.entries.some(({ file }) => selected(file))
        ? this.generateSpriteSet(project, outputs, sourceImages)
        : Promise.resolve([]),
      blueprintSet
        ? Promise.allSettled(blueprintSet.entries.filter(({ file }) => selected(file)).map(async (spec) => {
            if (spec.animation) return this.generateAnimationSpriteSheet(project, spec as RoleArtSpec & { animation: SpriteSheetAnimation }, sourceImages[spec.file] ? { sourceSheet: sourceImages[spec.file] } : {});
            const presentationOutput = spec.presentation ? { ...(outputs[spec.file] ?? { width: 1024, height: 1024, fit: "contain" as const }), fit: "contain" as const,
              anchor: spec.presentation.anchor, safeInsetRatio: spec.presentation.safeInsetRatio, minSourcePixels: spec.presentation.minSourcePixels, requireAlpha: true } : outputs[spec.file];
            const bytes = await this.generateRoleBitmap(project, spec, blueprintSet.anchor, presentationOutput, sourceImages[spec.file]);
            return bytes ? { file: spec.file, role: spec.role, bytes, prompt: roleBitmapPrompt(project, spec, blueprintSet.anchor), image: generatedImageDelivery(bytes) ?? undefined } : null;
          })).then(results => {
            if (cancellationSignal()?.aborted) throw cancellationSignal()!.reason;
            const failures = results.flatMap(result => result.status === "rejected"
              ? result.reason instanceof BuildFailure ? result.reason.details : [safeFailure("asset", result.reason, { operation: "asset-generation" })]
              : []);
            if (failures.length) throw new BuildFailure("部分必需局内资源未生成，已停止制作并保留来源版本。", failures);
            return results.map(result => result.status === "fulfilled" ? result.value : null);
          })
        : Promise.resolve([]),
    ]);
    // All concurrently-started groups must settle so their independent required
    // resource failures remain available to the build record. Cancellation wins.
    if (cancellationSignal()?.aborted) throw cancellationSignal()!.reason;
    const failures = groups.flatMap(result => result.status === "rejected"
      ? result.reason instanceof BuildFailure
        ? result.reason.details
        : [safeFailure("asset", result.reason, { operation: "asset-generation" })]
      : []);
    if (failures.length) throw new BuildFailure("部分必需局内资源未生成，已停止制作并保留来源版本。", failures);
    const [singles, spriteSet, blueprintSprites] = groups.map(result => result.status === "fulfilled" ? result.value : []) as [Array<DynamicArtEntry | null>, DynamicArtEntry[], Array<DynamicArtEntry | null>];
    // 顺序必须与 dynamicArtPlan 一致：图像检查点按下标比对计划与产物。
    return [
      ...singles.filter((entry): entry is DynamicArtEntry => entry !== null),
      ...spriteSet,
      ...blueprintSprites.filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    ];
  }

  /**
   * 边玩边改（/player-first）单张素材：不依赖项目蓝图，只按提示词与交付约束生图。
   * 与其它入口共用同一套提供方重试、透明校验与尺寸适配；没有密钥时抛 BuildFailure，不发起请求。
   */
  async generateAsset(label: string, request: { prompt: string; size?: ImageSize; transparent?: boolean; output: ImageOutputConstraint; resource: { file: string; label: string } }): Promise<Buffer> {
    const bytes = await this.tryImage(label, { ...request, size: request.size ?? "1024x1024" });
    if (!bytes) throw new BuildFailure(`${label}未生成可用图片。`, [safeFailure("asset", new Error("图像服务没有返回图片。"), { resource: request.resource, operation: "image-generation" })]);
    return bytes;
  }

  private requireRenovationReference(project: ProjectDetail, sourceImage: Buffer | undefined, label: string) {
    if (project.spec.renovation?.revisionScope === "assets" && !sourceImage) {
      throw new Error(`部分资源替换“${label}”缺少已校验的来源图片；已停止制作，不会退回无参考重画。`);
    }
  }

  private async tryImage(label: string, request: { prompt: string; size: ImageSize; transparent?: boolean; output: ImageOutputConstraint; sourceImage?: Buffer; resource: { file: string; label: string } }): Promise<Buffer | null> {
    const apiKey = this.settings.getApiKey();
    if (!apiKey) throw this.missingImageConfiguration([request.resource], request.sourceImage ? "image-edit" : "image-generation");
    const budget: ImageAttemptBudget = { used: 0, max: MAX_PROVIDER_ATTEMPTS_PER_RESOURCE };
    const repairs: ImageRepairAction[] = [];
    try {
      let nextPrompt = request.prompt;
      while (budget.used < budget.max) {
        try {
          const providerBytes = await this.requestImage({ ...request, prompt: nextPrompt }, apiKey, budget);
          const adapted = await adaptGeneratedPng(providerBytes, request.output);
          if (request.transparent && !adapted.metadata.providerSource.hasTransparency) throw new Error("生图结果没有真实透明区域，不能作为透明底角色素材。");
          if (repairs.length) { adapted.metadata.repairs = repairs; generatedMetadata.set(adapted.bytes, adapted.metadata); }
          return adapted.bytes;
        } catch (error) {
          if (cancellationSignal()?.aborted) throw error;
          const repair = outputRepair(error);
          if (!repair) throw error;
          if (budget.used >= budget.max) throw Object.assign(error instanceof Error ? error : new Error("图片未通过质量检查。"), { autoRepairExhausted: true });
          repairs.push({ attempt: budget.used + 1, code: repair.code, message: repair.message });
          await reportImageRepair({ resource: request.resource, attempt: budget.used + 1, maxAttempts: budget.max, code: repair.code, message: repair.message });
          nextPrompt = repairPrompt(request.prompt, repair, budget.used + 1);
        }
      }
      throw new Error("图片资源自动修复请求预算已用尽。");
    } catch (error) {
      if (cancellationSignal()?.aborted) throw error;
      throw new BuildFailure(`${label}未生成可用图片。`, [safeFailure("asset", error, { resource: request.resource, operation: request.sourceImage ? "image-edit" : "image-generation" })], error);
    }
  }

  private missingImageConfiguration(resources: Array<{ file: string; label: string }>, operation: string): BuildFailure {
    return new BuildFailure("图像服务未配置，未发起生成请求。", resources.map((resource) => safeFailure("asset", new Error("图像服务未配置。"), { resource, operation })));
  }

  private async requestImage(request: { prompt: string; size: ImageSize; transparent?: boolean; sourceImage?: Buffer }, apiKey: string, budget: ImageAttemptBudget): Promise<Buffer> {
    if (request.sourceImage) {
      if (!this.editEndpoint) throw new Error("当前自定义图像服务没有配置兼容的 Image edits 地址，已停止参考编辑。");
      const source = await readPngDimensions(request.sourceImage);
      if (request.sourceImage.length >= 50 * 1024 * 1024) throw new Error("来源图片超过 Image edits 的 50MB 限制。");
      if (request.transparent && !source.hasTransparency) throw new Error("透明主体的来源图片没有真实透明区域，已停止参考编辑。");
    }
    let lastError: unknown = null;
    while (budget.used < budget.max) {
      const attempt = ++budget.used;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const body = request.sourceImage
          ? (() => {
              const form = new FormData();
              form.set("model", this.settings.status().models.image);
              form.set("prompt", request.prompt);
              form.set("size", request.size);
              form.set("quality", IMAGE_QUALITY);
              form.set("output_format", IMAGE_OUTPUT_FORMAT);
              if (request.transparent) form.set("background", "transparent");
              form.append("image", new Blob([new Uint8Array(request.sourceImage)], { type: "image/png" }), "source.png");
              return form;
            })()
          : JSON.stringify({
              model: this.settings.status().models.image,
              prompt: request.prompt,
              size: request.size,
              quality: IMAGE_QUALITY,
              output_format: IMAGE_OUTPUT_FORMAT,
              ...(request.transparent ? { background: "transparent" } : {}),
            });
        const response = await this.fetchImpl(request.sourceImage ? this.editEndpoint! : this.endpoint, {
          method: "POST",
          headers: {
            ...(!request.sourceImage ? { "Content-Type": "application/json" } : {}),
            Authorization: `Bearer ${apiKey}`,
          },
          signal: withTimeoutSignal(controller.signal),
          body,
        });
        if (!response.ok) {
          // Inspect the provider body only to distinguish quota from temporary rate limiting;
          // it may contain request data, so never copy it into an Error, build, or response.
          const body = (await response.text().catch(() => "")).toLowerCase();
          const quota = response.status === 429 && /insufficient_quota|quota|余额|额度不足/.test(body);
          const error = Object.assign(new Error(quota ? "图像服务额度不足，未自动重试。" : `生图接口返回 ${response.status}。`), {
            failureMeta: { attempt, httpStatus: response.status, requestId: response.headers.get("x-request-id") ?? response.headers.get("openai-request-id") ?? undefined },
          });
          const retryable = !quota && (response.status === 429 || response.status >= 500);
          if (retryable && budget.used < budget.max) {
            lastError = error;
            continue;
          }
          throw error;
        }
        return await this.parseAnswer(await response.json());
      } catch (error) {
        if (cancellationSignal()?.aborted) throw error;
        if (error instanceof Error && error.name === "AbortError") {
          lastError = Object.assign(new Error(`生图接口在 ${this.timeoutMs}ms 内没有响应。`), { failureMeta: { attempt } });
          if (budget.used < budget.max) continue;
          throw lastError;
        }
        if (budget.used < budget.max && error instanceof TypeError) {
          lastError = error;
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("生图接口调用失败。");
  }

  private async parseAnswer(payload: unknown): Promise<Buffer> {
    const body = payload as { data?: Array<{ b64_json?: string | null }> };
    const encoded = body.data?.[0]?.b64_json;
    if (!encoded) throw new Error("生图接口没有返回图像数据。");
    const bytes = Buffer.from(encoded, "base64");
    if (!bytes.subarray(0, 4).equals(PNG_SIGNATURE)) {
      throw new Error("生图接口返回的内容不是有效的 PNG 图像。");
    }
    await readPngDimensions(bytes).catch(() => { throw new Error("生图接口返回的 PNG 无法完整解码。"); });
    return bytes;
  }
}
