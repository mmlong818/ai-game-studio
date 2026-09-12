import sharp from "sharp";
import {
  spriteSheetAnimationSchema,
  type SpriteAnimationClipId,
  type SpriteSheetAnimation,
} from "../shared/generated-blueprint.js";

const MAX_SHEET_PIXELS = 20_000_000;
const ALPHA_VISIBLE_THRESHOLD = 8;

export interface SpriteFrameSourceMetadata {
  width: number;
  height: number;
  hasAlpha: boolean;
  hasTransparency: boolean;
}

export interface PackedSpriteSheet {
  bytes: Buffer;
  animation: SpriteSheetAnimation;
  providerFrames: SpriteFrameSourceMetadata[];
  warnings: SpriteSheetWarning[];
}

export interface SpriteSheetWarning {
  code: "SPRITE_FRAME_EDGE";
  frame: number;
  bounds: { left: number; top: number; width: number; height: number };
  source: { width: number; height: number };
  sides: Array<"left" | "top" | "right" | "bottom">;
  recommendedMargin: number;
  message: string;
}

export interface SpriteSheetDraftGrid { columns: number; rows: number; frameCount: number }

type RawFrame = { data: Buffer; width: number; height: number; channels: number };
type DecodedFrame = Awaited<ReturnType<typeof decodeFrame>>;

export type SpriteSheetFailureCode =
  | "SPRITE_FRAME_FORMAT" | "SPRITE_FRAME_SUBJECT" | "SPRITE_FRAME_TRANSPARENCY" | "SPRITE_GRID"
  | "SPRITE_SHEET_FORMAT" | "SPRITE_ANCHOR" | "SPRITE_FRAME_EDGE" | "SPRITE_FRAME_NORMALIZE"
  | "SPRITE_FRAME_BOUNDS" | "SPRITE_CLIP_AREA" | "SPRITE_CLIP_ASPECT" | "SPRITE_CELL_CONTRACT"
  | "SPRITE_DELIVERY_SIZE" | "SPRITE_FRAME_COUNT" | "SPRITE_FRAME_RESOLUTION" | "SPRITE_FRAME_CLIP"
  | "SPRITE_SOURCE_CLIP" | "SPRITE_SOURCE_FRAME_COUNT" | "SPRITE_SOURCE_SIZE" | "SPRITE_REPLACEMENT_RESOLUTION";

/** Safe, local validation detail. Its message is assembled only from contract values. */
export class SpriteSheetValidationError extends Error {
  constructor(readonly code: SpriteSheetFailureCode, message: string) {
    super(message);
    this.name = "SpriteSheetValidationError";
  }
}

const spriteFailure = (code: SpriteSheetFailureCode, message: string) => new SpriteSheetValidationError(code, message);

function clipForFrame(animation: SpriteSheetAnimation, frameIndex: number) {
  return animation.clips.find(({ startFrame, frameCount }) => frameIndex >= startFrame && frameIndex < startFrame + frameCount);
}

async function decodeFrame(bytes: Buffer, frameIndex: number): Promise<RawFrame & { source: SpriteFrameSourceMetadata; bounds: { left: number; top: number; width: number; height: number } }> {
  const image = sharp(bytes, { failOn: "error", limitInputPixels: MAX_SHEET_PIXELS });
  const metadata = await image.metadata();
  if (metadata.format !== "png" || !metadata.width || !metadata.height) throw spriteFailure("SPRITE_FRAME_FORMAT", `第 ${frameIndex + 1} 帧无法完整解码为 PNG（实际格式 ${metadata.format ?? "未知"}）。`);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let transparentPixels = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3]!;
      if (alpha <= ALPHA_VISIBLE_THRESHOLD) transparentPixels += 1;
      else {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX || maxY < minY) throw spriteFailure("SPRITE_FRAME_SUBJECT", `第 ${frameIndex + 1} 帧没有可见主体（实际可见像素 0）。`);
  const transparencyRatio = transparentPixels / (info.width * info.height);
  if (transparencyRatio < 0.01) throw spriteFailure("SPRITE_FRAME_TRANSPARENCY", `第 ${frameIndex + 1} 帧真实透明背景占比 ${(transparencyRatio * 100).toFixed(2)}%，低于要求 1.00%。`);
  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
    source: { width: info.width, height: info.height, hasAlpha: Boolean(metadata.hasAlpha), hasTransparency: transparentPixels > 0 },
    bounds: { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
  };
}

/** Splits a single provider draft into equal row-major cells; no whole-sheet resizing is allowed. */
export async function splitSpriteSheetDraft(bytes: Buffer, grid: SpriteSheetDraftGrid): Promise<Buffer[]> {
  if (!Number.isInteger(grid.columns) || !Number.isInteger(grid.rows) || !Number.isInteger(grid.frameCount)
    || grid.columns < 1 || grid.rows < 1 || grid.frameCount < 1 || grid.frameCount > grid.columns * grid.rows) {
    throw spriteFailure("SPRITE_GRID", `Sprite Sheet 草稿网格无效（列 ${grid.columns}、行 ${grid.rows}、帧 ${grid.frameCount}；要求帧数不超过列×行）。`);
  }
  const metadata = await sharp(bytes, { failOn: "error", limitInputPixels: MAX_SHEET_PIXELS }).metadata();
  if (metadata.format !== "png" || !metadata.width || !metadata.height || !metadata.hasAlpha) throw spriteFailure("SPRITE_SHEET_FORMAT", `Sprite Sheet 草稿必须是带透明通道的 PNG（实际 ${metadata.format ?? "未知"} ${metadata.width ?? 0}×${metadata.height ?? 0}，透明通道 ${metadata.hasAlpha ? "有" : "无"}）。`);
  const frames: Buffer[] = [];
  for (let index = 0; index < grid.frameCount; index += 1) {
    const column = index % grid.columns;
    const row = Math.floor(index / grid.columns);
    const left = Math.round(column * metadata.width / grid.columns);
    const top = Math.round(row * metadata.height / grid.rows);
    const right = Math.round((column + 1) * metadata.width / grid.columns);
    const bottom = Math.round((row + 1) * metadata.height / grid.rows);
    frames.push(await sharp(bytes).extract({ left, top, width: right - left, height: bottom - top }).png().toBuffer());
  }
  return frames;
}

function availableEnvelope(animation: SpriteSheetAnimation) {
  const { frameWidth, frameHeight, anchor } = animation;
  const margin = Math.max(2, Math.round(Math.min(frameWidth, frameHeight) * 0.04));
  const horizontalRadius = Math.min(anchor.x - margin, frameWidth - anchor.x - margin);
  const verticalRadius = anchor.y - margin;
  const width = Math.floor(horizontalRadius * 2);
  const height = Math.floor(verticalRadius);
  if (width < 1 || height < 1) throw spriteFailure("SPRITE_ANCHOR", `动画锚点 ${anchor.x},${anchor.y} 的可用区域为 ${width}×${height}，要求至少 1×1。`);
  return { width, height };
}

function sharedScale(frames: readonly DecodedFrame[], envelope: { width: number; height: number }) {
  const maxWidth = Math.max(...frames.map(({ bounds }) => bounds.width));
  const maxHeight = Math.max(...frames.map(({ bounds }) => bounds.height));
  return Math.min(1, envelope.width / maxWidth, envelope.height / maxHeight);
}

function assertMinimumSubjectPixels(frames: readonly DecodedFrame[], minimum: number) {
  if (!Number.isInteger(minimum) || minimum < 1) return;
  const undersized = frames.findIndex(frame => Math.min(frame.bounds.width, frame.bounds.height) < minimum);
  if (undersized >= 0) {
    const bounds = frames[undersized]!.bounds;
    throw spriteFailure("SPRITE_FRAME_RESOLUTION", `第 ${undersized + 1} 帧主体有效源像素 ${bounds.width}×${bounds.height}，短边低于显示合同要求 ${minimum}px。`);
  }
}

async function prepareFrame(decoded: DecodedFrame, animation: SpriteSheetAnimation, scale: number, frameIndex: number): Promise<{ cell: Buffer; source: SpriteFrameSourceMetadata; subject: { area: number; aspect: number }; warnings: SpriteSheetWarning[] }> {
  const edgeMargin = Math.max(1, Math.round(Math.min(decoded.width, decoded.height) * 0.01));
  const sides: SpriteSheetWarning["sides"] = [];
  if (decoded.bounds.left < edgeMargin) sides.push("left");
  if (decoded.bounds.top < edgeMargin) sides.push("top");
  if (decoded.bounds.left + decoded.bounds.width > decoded.width - edgeMargin) sides.push("right");
  if (decoded.bounds.top + decoded.bounds.height > decoded.height - edgeMargin) sides.push("bottom");
  // The provider draft edge is a visual-review heuristic: it may indicate that
  // the model cropped artwork, but it does not violate the delivered sheet's
  // runtime cell contract. Preserve all available pixels, normalize them into a
  // transparent destination cell, and keep the uncertainty as review metadata.
  const warnings: SpriteSheetWarning[] = sides.length ? [{
    code: "SPRITE_FRAME_EDGE",
    frame: frameIndex + 1,
    bounds: { ...decoded.bounds },
    source: { width: decoded.width, height: decoded.height },
    sides,
    recommendedMargin: edgeMargin,
    message: `第 ${frameIndex + 1} 帧主体边界 ${decoded.bounds.left},${decoded.bounds.top},${decoded.bounds.width}×${decoded.bounds.height} 未保留建议的 ${edgeMargin}px 草稿留白（${sides.join("、")}）；现有像素已安全装入交付格，但原图可能在边界处被截断，试玩时继续检查边界观感。`,
  }] : [];
  const { frameWidth, frameHeight, anchor } = animation;
  const targetWidth = Math.max(1, Math.round(decoded.bounds.width * scale));
  const targetHeight = Math.max(1, Math.round(decoded.bounds.height * scale));
  const cropped = await sharp(decoded.data, { raw: { width: decoded.width, height: decoded.height, channels: decoded.channels as 1 | 2 | 3 | 4 } })
    .extract(decoded.bounds)
    .resize({ width: targetWidth, height: targetHeight, fit: "inside", withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  const size = await sharp(cropped).metadata();
  if (!size.width || !size.height) throw spriteFailure("SPRITE_FRAME_NORMALIZE", `第 ${frameIndex + 1} 帧等比适配失败（目标 ${targetWidth}×${targetHeight}，实际 ${size.width ?? 0}×${size.height ?? 0}）。`);
  const left = Math.round(anchor.x - size.width / 2);
  const top = Math.round(anchor.y - size.height);
  if (left < 0 || top < 0 || left + size.width > frameWidth || top + size.height > frameHeight) throw spriteFailure("SPRITE_FRAME_BOUNDS", `第 ${frameIndex + 1} 帧按锚点放置为 ${left},${top},${size.width}×${size.height}，超出单帧 ${frameWidth}×${frameHeight}。`);
  const cell = await sharp({ create: { width: frameWidth, height: frameHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: cropped, left, top }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  return { cell, source: decoded.source, subject: { area: decoded.bounds.width * decoded.bounds.height, aspect: decoded.bounds.width / decoded.bounds.height }, warnings };
}

function assertClipConsistency(animation: SpriteSheetAnimation, prepared: readonly Awaited<ReturnType<typeof prepareFrame>>[], frameOffset = 0) {
  for (const clip of animation.clips) {
    if (clip.id === "hit" || clip.id === "effect") continue;
    const start = Math.max(clip.startFrame, frameOffset);
    const end = Math.min(clip.startFrame + clip.frameCount, frameOffset + prepared.length);
    if (end <= start) continue;
    const frames = prepared.slice(start - frameOffset, end - frameOffset);
    const areas = frames.map(({ subject }) => subject.area);
    const aspects = frames.map(({ subject }) => subject.aspect);
    const areaRatio = Math.max(...areas) / Math.max(1, Math.min(...areas));
    const aspectRatio = Math.max(...aspects) / Math.max(0.001, Math.min(...aspects));
    if (areaRatio > 3) throw spriteFailure("SPRITE_CLIP_AREA", `动作 ${clip.id} 在第 ${start + 1}–${end} 帧的主体面积倍率为 ${areaRatio.toFixed(2)}，上限为 3.00。`);
    if (aspectRatio > 2.5) throw spriteFailure("SPRITE_CLIP_ASPECT", `动作 ${clip.id} 在第 ${start + 1}–${end} 帧的主体宽高比倍率为 ${aspectRatio.toFixed(2)}，上限为 2.50。`);
  }
}

async function packCells(cells: readonly Buffer[], animation: SpriteSheetAnimation): Promise<Buffer> {
  const width = animation.frameWidth * animation.columns;
  const height = animation.frameHeight * animation.rows;
  const sheet = Buffer.alloc(width * height * 4);
  await Promise.all(cells.map(async (cell, index) => {
    const { data, info } = await sharp(cell).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== animation.frameWidth || info.height !== animation.frameHeight || info.channels !== 4) throw spriteFailure("SPRITE_CELL_CONTRACT", "待打包动画格尺寸不符合合同。");
    const cellLeft = (index % animation.columns) * animation.frameWidth;
    const cellTop = Math.floor(index / animation.columns) * animation.frameHeight;
    for (let row = 0; row < animation.frameHeight; row += 1) {
      const sourceStart = row * animation.frameWidth * 4;
      const targetStart = ((cellTop + row) * width + cellLeft) * 4;
      data.copy(sheet, targetStart, sourceStart, sourceStart + animation.frameWidth * 4);
    }
  }));
  const bytes = await sharp(sheet, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== width || metadata.height !== height) throw spriteFailure("SPRITE_DELIVERY_SIZE", `Sprite Sheet 交付尺寸错误，应为 ${width}×${height}。`);
  return bytes;
}

/** Each input is adapted inside its own cell before row-major packing. */
export async function packAnimationSpriteSheet(rawFrames: readonly Buffer[], rawAnimation: SpriteSheetAnimation, options: { minSourcePixels?: number } = {}): Promise<PackedSpriteSheet> {
  const animation = spriteSheetAnimationSchema.parse(rawAnimation);
  if (rawFrames.length !== animation.frameCount) throw spriteFailure("SPRITE_FRAME_COUNT", `Sprite Sheet 需要 ${animation.frameCount} 帧，实际收到 ${rawFrames.length} 帧。`);
  const decoded = await Promise.all(rawFrames.map((bytes, index) => decodeFrame(bytes, index)));
  assertMinimumSubjectPixels(decoded, options.minSourcePixels ?? 1);
  const undersized = decoded.findIndex(frame => frame.width < animation.frameWidth || frame.height < animation.frameHeight);
  if (undersized >= 0) {
    const frame = decoded[undersized]!;
    throw spriteFailure("SPRITE_FRAME_RESOLUTION", `第 ${undersized + 1} 帧实际 ${frame.width}×${frame.height}，单格分辨率不足以无放大交付要求 ${animation.frameWidth}×${animation.frameHeight}。`);
  }
  const characterFrames = decoded.filter((_, index) => clipForFrame(animation, index)?.id !== "effect");
  const effectFrames = decoded.filter((_, index) => clipForFrame(animation, index)?.id === "effect");
  const characterScale = characterFrames.length ? sharedScale(characterFrames, availableEnvelope(animation)) : 1;
  const effectScale = effectFrames.length ? sharedScale(effectFrames, availableEnvelope(animation)) : 1;
  const prepared = await Promise.all(decoded.map(async (frame, index) => {
    const clip = clipForFrame(animation, index);
    if (!clip) throw spriteFailure("SPRITE_FRAME_CLIP", `第 ${index} 帧没有归属任何动作，第一版不允许未分配帧。`);
    return prepareFrame(frame, animation, clip.id === "effect" ? effectScale : characterScale, index);
  }));
  assertClipConsistency(animation, prepared);
  return {
    bytes: await packCells(prepared.map(({ cell }) => cell), animation),
    animation,
    providerFrames: prepared.map(({ source }) => source),
    warnings: prepared.flatMap(({ warnings }) => warnings),
  };
}

/** Replaces one clip while preserving every non-target cell byte-for-byte at pixel level. */
export async function replaceAnimationSpriteClip(sourceSheet: Buffer, rawAnimation: SpriteSheetAnimation, clipId: SpriteAnimationClipId, replacementFrames: readonly Buffer[], options: { minSourcePixels?: number } = {}): Promise<PackedSpriteSheet> {
  const animation = spriteSheetAnimationSchema.parse(rawAnimation);
  const clip = animation.clips.find(({ id }) => id === clipId);
  if (!clip) throw spriteFailure("SPRITE_SOURCE_CLIP", `来源 Sprite Sheet 不包含动作 ${clipId}。`);
  if (replacementFrames.length !== clip.frameCount) throw spriteFailure("SPRITE_SOURCE_FRAME_COUNT", `动作 ${clipId} 需要 ${clip.frameCount} 帧，实际收到 ${replacementFrames.length} 帧。`);
  const metadata = await sharp(sourceSheet, { failOn: "error", limitInputPixels: MAX_SHEET_PIXELS }).metadata();
  const expectedWidth = animation.frameWidth * animation.columns;
  const expectedHeight = animation.frameHeight * animation.rows;
  if (metadata.format !== "png" || metadata.width !== expectedWidth || metadata.height !== expectedHeight) {
    throw spriteFailure("SPRITE_SOURCE_SIZE", `来源 Sprite Sheet 尺寸必须为 ${expectedWidth}×${expectedHeight}（实际 ${metadata.width ?? 0}×${metadata.height ?? 0}），不能整图裁切或补边。`);
  }
  const cells = await Promise.all(Array.from({ length: animation.frameCount }, (_, index) => sharp(sourceSheet)
    .extract({
      left: (index % animation.columns) * animation.frameWidth,
      top: Math.floor(index / animation.columns) * animation.frameHeight,
      width: animation.frameWidth,
      height: animation.frameHeight,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer()));
  const decodedReplacement = await Promise.all(replacementFrames.map((bytes, index) => decodeFrame(bytes, index)));
  assertMinimumSubjectPixels(decodedReplacement, options.minSourcePixels ?? 1);
  const undersized = decodedReplacement.findIndex(frame => frame.width < animation.frameWidth || frame.height < animation.frameHeight);
  if (undersized >= 0) {
    const frame = decodedReplacement[undersized]!;
    throw spriteFailure("SPRITE_REPLACEMENT_RESOLUTION", `替换动作第 ${undersized + 1} 帧实际 ${frame.width}×${frame.height}，单格分辨率不足以无放大交付要求 ${animation.frameWidth}×${animation.frameHeight}。`);
  }
  const sourceClipFrames = await Promise.all(cells.slice(clip.startFrame, clip.startFrame + clip.frameCount).map((cell, index) => decodeFrame(cell, clip.startFrame + index)));
  const sourceEnvelope = {
    width: Math.max(...sourceClipFrames.map(({ bounds }) => bounds.width)),
    height: Math.max(...sourceClipFrames.map(({ bounds }) => bounds.height)),
  };
  const scale = sharedScale(decodedReplacement, sourceEnvelope);
  const prepared = await Promise.all(decodedReplacement.map((frame, index) => prepareFrame(frame, animation, scale, clip.startFrame + index)));
  assertClipConsistency(animation, prepared, clip.startFrame);
  prepared.forEach(({ cell }, offset) => { cells[clip.startFrame + offset] = Buffer.from(cell); });
  return {
    bytes: await packCells(cells, animation),
    animation,
    providerFrames: prepared.map(({ source }) => source),
    warnings: prepared.flatMap(({ warnings }) => warnings),
  };
}
