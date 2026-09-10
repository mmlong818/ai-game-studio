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
}

export interface SpriteSheetDraftGrid { columns: number; rows: number; frameCount: number }

type RawFrame = { data: Buffer; width: number; height: number; channels: number };
type DecodedFrame = Awaited<ReturnType<typeof decodeFrame>>;

function clipForFrame(animation: SpriteSheetAnimation, frameIndex: number) {
  return animation.clips.find(({ startFrame, frameCount }) => frameIndex >= startFrame && frameIndex < startFrame + frameCount);
}

async function decodeFrame(bytes: Buffer): Promise<RawFrame & { source: SpriteFrameSourceMetadata; bounds: { left: number; top: number; width: number; height: number } }> {
  const image = sharp(bytes, { failOn: "error", limitInputPixels: MAX_SHEET_PIXELS });
  const metadata = await image.metadata();
  if (metadata.format !== "png" || !metadata.width || !metadata.height) throw new Error("动画帧必须是可完整解码的 PNG。");
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
  if (maxX < minX || maxY < minY) throw new Error("动画帧没有可见主体。");
  if (transparentPixels / (info.width * info.height) < 0.01) throw new Error("动画帧没有足够的真实透明背景，不能安全打包。");
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
    throw new Error("Sprite Sheet 草稿网格无效。");
  }
  const metadata = await sharp(bytes, { failOn: "error", limitInputPixels: MAX_SHEET_PIXELS }).metadata();
  if (metadata.format !== "png" || !metadata.width || !metadata.height || !metadata.hasAlpha) throw new Error("Sprite Sheet 草稿必须是带透明通道的 PNG。");
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
  if (width < 1 || height < 1) throw new Error(`动画锚点 ${anchor.x},${anchor.y} 没有给主体留出安全绘制区域。`);
  return { width, height };
}

function sharedScale(frames: readonly DecodedFrame[], envelope: { width: number; height: number }) {
  const maxWidth = Math.max(...frames.map(({ bounds }) => bounds.width));
  const maxHeight = Math.max(...frames.map(({ bounds }) => bounds.height));
  return Math.min(1, envelope.width / maxWidth, envelope.height / maxHeight);
}

async function prepareFrame(decoded: DecodedFrame, animation: SpriteSheetAnimation, scale: number): Promise<{ cell: Buffer; source: SpriteFrameSourceMetadata; subject: { area: number; aspect: number } }> {
  const edgeMargin = Math.max(1, Math.round(Math.min(decoded.width, decoded.height) * 0.01));
  if (decoded.bounds.left < edgeMargin || decoded.bounds.top < edgeMargin
    || decoded.bounds.left + decoded.bounds.width > decoded.width - edgeMargin
    || decoded.bounds.top + decoded.bounds.height > decoded.height - edgeMargin) {
    throw new Error("动画帧主体触碰了草稿格边缘，可能与相邻帧串格。");
  }
  const { frameWidth, frameHeight, anchor } = animation;
  const targetWidth = Math.max(1, Math.round(decoded.bounds.width * scale));
  const targetHeight = Math.max(1, Math.round(decoded.bounds.height * scale));
  const cropped = await sharp(decoded.data, { raw: { width: decoded.width, height: decoded.height, channels: decoded.channels as 1 | 2 | 3 | 4 } })
    .extract(decoded.bounds)
    .resize({ width: targetWidth, height: targetHeight, fit: "inside", withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  const size = await sharp(cropped).metadata();
  if (!size.width || !size.height) throw new Error("动画帧等比适配失败。");
  const left = Math.round(anchor.x - size.width / 2);
  const top = Math.round(anchor.y - size.height);
  if (left < 0 || top < 0 || left + size.width > frameWidth || top + size.height > frameHeight) throw new Error("动画帧按锚点放置后越出单帧边界。");
  const cell = await sharp({ create: { width: frameWidth, height: frameHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: cropped, left, top }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  return { cell, source: decoded.source, subject: { area: decoded.bounds.width * decoded.bounds.height, aspect: decoded.bounds.width / decoded.bounds.height } };
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
    if (Math.max(...areas) / Math.max(1, Math.min(...areas)) > 3) throw new Error(`动作 ${clip.id} 的主体面积跳变过大，需要重新生成并人工预览连续性。`);
    if (Math.max(...aspects) / Math.max(0.001, Math.min(...aspects)) > 2.5) throw new Error(`动作 ${clip.id} 的主体轮廓比例跳变过大，需要重新生成并人工预览连续性。`);
  }
}

async function packCells(cells: readonly Buffer[], animation: SpriteSheetAnimation): Promise<Buffer> {
  const width = animation.frameWidth * animation.columns;
  const height = animation.frameHeight * animation.rows;
  const sheet = Buffer.alloc(width * height * 4);
  await Promise.all(cells.map(async (cell, index) => {
    const { data, info } = await sharp(cell).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== animation.frameWidth || info.height !== animation.frameHeight || info.channels !== 4) throw new Error("待打包动画格尺寸不符合合同。");
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
  if (metadata.width !== width || metadata.height !== height) throw new Error(`Sprite Sheet 交付尺寸错误，应为 ${width}×${height}。`);
  return bytes;
}

/** Each input is adapted inside its own cell before row-major packing. */
export async function packAnimationSpriteSheet(rawFrames: readonly Buffer[], rawAnimation: SpriteSheetAnimation): Promise<PackedSpriteSheet> {
  const animation = spriteSheetAnimationSchema.parse(rawAnimation);
  if (rawFrames.length !== animation.frameCount) throw new Error(`Sprite Sheet 需要 ${animation.frameCount} 帧，实际收到 ${rawFrames.length} 帧。`);
  const decoded = await Promise.all(rawFrames.map(bytes => decodeFrame(bytes)));
  if (decoded.some(frame => frame.width < animation.frameWidth || frame.height < animation.frameHeight)) {
    throw new Error(`Sprite Sheet 草稿单格分辨率不足以无放大交付 ${animation.frameWidth}×${animation.frameHeight} 帧。`);
  }
  const characterFrames = decoded.filter((_, index) => clipForFrame(animation, index)?.id !== "effect");
  const effectFrames = decoded.filter((_, index) => clipForFrame(animation, index)?.id === "effect");
  const characterScale = characterFrames.length ? sharedScale(characterFrames, availableEnvelope(animation)) : 1;
  const effectScale = effectFrames.length ? sharedScale(effectFrames, availableEnvelope(animation)) : 1;
  const prepared = await Promise.all(decoded.map(async (frame, index) => {
    const clip = clipForFrame(animation, index);
    if (!clip) throw new Error(`第 ${index} 帧没有归属任何动作，第一版不允许未分配帧。`);
    return prepareFrame(frame, animation, clip.id === "effect" ? effectScale : characterScale);
  }));
  assertClipConsistency(animation, prepared);
  return {
    bytes: await packCells(prepared.map(({ cell }) => cell), animation),
    animation,
    providerFrames: prepared.map(({ source }) => source),
  };
}

/** Replaces one clip while preserving every non-target cell byte-for-byte at pixel level. */
export async function replaceAnimationSpriteClip(sourceSheet: Buffer, rawAnimation: SpriteSheetAnimation, clipId: SpriteAnimationClipId, replacementFrames: readonly Buffer[]): Promise<PackedSpriteSheet> {
  const animation = spriteSheetAnimationSchema.parse(rawAnimation);
  const clip = animation.clips.find(({ id }) => id === clipId);
  if (!clip) throw new Error(`来源 Sprite Sheet 不包含动作 ${clipId}。`);
  if (replacementFrames.length !== clip.frameCount) throw new Error(`动作 ${clipId} 需要 ${clip.frameCount} 帧，实际收到 ${replacementFrames.length} 帧。`);
  const metadata = await sharp(sourceSheet, { failOn: "error", limitInputPixels: MAX_SHEET_PIXELS }).metadata();
  const expectedWidth = animation.frameWidth * animation.columns;
  const expectedHeight = animation.frameHeight * animation.rows;
  if (metadata.format !== "png" || metadata.width !== expectedWidth || metadata.height !== expectedHeight) {
    throw new Error(`来源 Sprite Sheet 尺寸必须为 ${expectedWidth}×${expectedHeight}，不能对整张图集裁切或补边。`);
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
  const decodedReplacement = await Promise.all(replacementFrames.map(bytes => decodeFrame(bytes)));
  if (decodedReplacement.some(frame => frame.width < animation.frameWidth || frame.height < animation.frameHeight)) {
    throw new Error(`替换动作的草稿单格分辨率不足以无放大交付 ${animation.frameWidth}×${animation.frameHeight} 帧。`);
  }
  const sourceClipFrames = await Promise.all(cells.slice(clip.startFrame, clip.startFrame + clip.frameCount).map(cell => decodeFrame(cell)));
  const sourceEnvelope = {
    width: Math.max(...sourceClipFrames.map(({ bounds }) => bounds.width)),
    height: Math.max(...sourceClipFrames.map(({ bounds }) => bounds.height)),
  };
  const scale = sharedScale(decodedReplacement, sourceEnvelope);
  const prepared = await Promise.all(decodedReplacement.map(frame => prepareFrame(frame, animation, scale)));
  assertClipConsistency(animation, prepared, clip.startFrame);
  prepared.forEach(({ cell }, offset) => { cells[clip.startFrame + offset] = Buffer.from(cell); });
  return {
    bytes: await packCells(cells, animation),
    animation,
    providerFrames: prepared.map(({ source }) => source),
  };
}
