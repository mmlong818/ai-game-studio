import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import type { SpriteSheetAnimation } from "../src/shared/generated-blueprint.js";
import { packAnimationSpriteSheet, replaceAnimationSpriteClip } from "../src/server/sprite-sheet.js";

const animation: SpriteSheetAnimation = {
  frameWidth: 64,
  frameHeight: 64,
  columns: 4,
  rows: 4,
  frameCount: 16,
  anchor: { x: 32, y: 58 },
  clips: [
    { id: "idle", startFrame: 0, frameCount: 4, fps: 6, loop: true },
    { id: "run", startFrame: 4, frameCount: 4, fps: 12, loop: true },
    { id: "hit", startFrame: 8, frameCount: 4, fps: 10, loop: false },
    { id: "effect", startFrame: 12, frameCount: 4, fps: 16, loop: false },
  ],
};

async function subjectFrame(red: number, width = 160, height = 120, radiusY = 44): Promise<Buffer> {
  const pixels = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height * 0.58;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inside = ((x - cx) / 34) ** 2 + ((y - cy) / radiusY) ** 2 <= 1;
      const offset = (y * width + x) * 4;
      pixels[offset] = red;
      pixels[offset + 1] = 60;
      pixels[offset + 2] = 180;
      pixels[offset + 3] = inside ? 255 : 0;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function cellPixels(sheet: Buffer, index: number): Promise<Buffer> {
  return sharp(sheet).extract({
    left: (index % animation.columns) * animation.frameWidth,
    top: Math.floor(index / animation.columns) * animation.frameHeight,
    width: animation.frameWidth,
    height: animation.frameHeight,
  }).ensureAlpha().raw().toBuffer();
}

function alphaBounds(raw: Buffer) {
  let minX = animation.frameWidth;
  let minY = animation.frameHeight;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < animation.frameHeight; y += 1) for (let x = 0; x < animation.frameWidth; x += 1) {
    if (raw[(y * animation.frameWidth + x) * 4 + 3]! > 8) {
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY };
}

test("逐帧等比适配后按 row-major 打包，四类动作尺寸、透明边缘与锚点正确", async () => {
  const frames = await Promise.all(Array.from({ length: 16 }, (_, index) => subjectFrame(90 + index * 6)));
  const packed = await packAnimationSpriteSheet(frames, animation);
  const metadata = await sharp(packed.bytes).metadata();
  assert.deepEqual({ width: metadata.width, height: metadata.height }, { width: 256, height: 256 });
  assert.equal(packed.providerFrames.length, 16);
  for (let index = 0; index < 16; index += 1) {
    const raw = await cellPixels(packed.bytes, index);
    const bounds = alphaBounds(raw);
    assert.ok(bounds.maxX >= bounds.minX && bounds.maxY >= bounds.minY, `第 ${index} 帧不能为空`);
    assert.ok(bounds.minX > 0 && bounds.maxX < 63 && bounds.minY > 0 && bounds.maxY < 63, `第 ${index} 帧不能触碰相邻格`);
    if (index < 12) assert.ok(Math.abs(bounds.maxY - (animation.anchor.y - 1)) <= 1, `角色第 ${index} 帧脚底必须对齐锚点`);
  }
});

test("只替换指定 run clip，其他动作格子的真实像素保持不变", async () => {
  const originalFrames = await Promise.all(Array.from({ length: 16 }, (_, index) => subjectFrame(40 + index * 5)));
  const original = await packAnimationSpriteSheet(originalFrames, animation);
  const replacement = await Promise.all(Array.from({ length: 4 }, () => subjectFrame(245)));
  const updated = await replaceAnimationSpriteClip(original.bytes, animation, "run", replacement);
  for (let index = 0; index < 16; index += 1) {
    const before = await cellPixels(original.bytes, index);
    const after = await cellPixels(updated.bytes, index);
    if (index >= 4 && index < 8) assert.notDeepEqual(after, before, `run 第 ${index - 4} 帧应被替换`);
    else assert.deepEqual(after, before, `非目标第 ${index} 格必须逐像素复用`);
  }
  assert.equal(updated.providerFrames.length, 4, "只记录新生成的目标动作帧");
});

test("同角色使用共同缩放因子，蹲伏帧保持真实高矮差且脚底仍对齐", async () => {
  const idleOnly: SpriteSheetAnimation = {
    frameWidth: 64, frameHeight: 64, columns: 4, rows: 2, frameCount: 4, anchor: { x: 32, y: 58 },
    clips: [{ id: "idle", startFrame: 0, frameCount: 4, fps: 6, loop: true }],
  };
  const frames = await Promise.all([44, 22, 44, 22].map(radius => subjectFrame(210, 160, 120, radius)));
  const packed = await packAnimationSpriteSheet(frames, idleOnly);
  const bounds = await Promise.all(Array.from({ length: 4 }, async (_, index) => {
    const raw = await sharp(packed.bytes).extract({ left: index * 64, top: 0, width: 64, height: 64 }).ensureAlpha().raw().toBuffer();
    return alphaBounds(raw);
  }));
  const tallHeight = bounds[0]!.maxY - bounds[0]!.minY + 1;
  const shortHeight = bounds[1]!.maxY - bounds[1]!.minY + 1;
  assert.ok(tallHeight / shortHeight > 1.7, `动作轮廓高矮差应保留，实际 ${tallHeight}/${shortHeight}`);
  for (const frame of bounds) assert.ok(Math.abs(frame.maxY - 57) <= 1, "所有角色帧脚底必须稳定在 y=58 锚点");
  const unusedRow = await sharp(packed.bytes).extract({ left: 0, top: 64, width: 256, height: 64 }).ensureAlpha().raw().toBuffer();
  assert.ok(Array.from({ length: unusedRow.length / 4 }, (_, index) => unusedRow[index * 4 + 3]).every(alpha => alpha === 0), "未使用网格必须保持全透明");
});

test("hit 与 effect 允许有意义的面积变化，不把受击收缩或特效扩散误判为身份漂移", async () => {
  const impact: SpriteSheetAnimation = {
    frameWidth: 64, frameHeight: 64, columns: 4, rows: 2, frameCount: 8, anchor: { x: 32, y: 58 },
    clips: [
      { id: "hit", startFrame: 0, frameCount: 4, fps: 10, loop: false },
      { id: "effect", startFrame: 4, frameCount: 4, fps: 16, loop: false },
    ],
  };
  const frames = await Promise.all([14, 24, 34, 44, 10, 22, 34, 46].map(radius => subjectFrame(225, 160, 120, radius)));
  const packed = await packAnimationSpriteSheet(frames, impact);
  assert.deepEqual(await sharp(packed.bytes).metadata().then(({ width, height }) => ({ width, height })), { width: 256, height: 128 });
});

test("拒绝不透明帧与错误尺寸的来源sheet，不对整张网格cover或contain", async () => {
  const opaque = await sharp({ create: { width: 160, height: 120, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } } }).png().toBuffer();
  const valid = await subjectFrame(220);
  await assert.rejects(packAnimationSpriteSheet([opaque, ...Array(15).fill(valid)], animation), /真实透明背景/);
  const tooSmall = await subjectFrame(220, 32, 32, 9);
  await assert.rejects(packAnimationSpriteSheet(Array(16).fill(tooSmall), animation), /单格分辨率不足以无放大交付/);
  const wrongSheet = await sharp({ create: { width: 255, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  await assert.rejects(replaceAnimationSpriteClip(wrongSheet, animation, "idle", Array(4).fill(valid)), /尺寸必须为 256×256/);
});
