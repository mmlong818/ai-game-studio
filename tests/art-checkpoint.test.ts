import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { getOrGenerateArtCheckpoint, type ArtCheckpointIdentity } from "../src/server/art-checkpoint";
import { imageRequestFingerprint, readPngDimensions } from "../src/server/image-generator";
import { runWithCancellation } from "../src/server/cancellation";

const bytes = readFileSync("assets/starter/signal-studio/cover.png");
const dimensions = await readPngDimensions(bytes);
const baseDelivery = { providerSource: { ...dimensions }, delivered: { width: dimensions.width, height: dimensions.height, fit: "cover" as const } };
const identity: ArtCheckpointIdentity = { projectId: "project-a", model: "test-image", runtimeTarget: "web-2d", aspectRatio: "9:16", group: "cover", plan: [{ file: "assets/cover.png", role: "封面", prompt: "原始确认提示词" }], request: imageRequestFingerprint() };

test("图像成功结果单独持久化；另一组失败后只补失败组", async () => {
  const root = mkdtempSync(join(tmpdir(), "image-checkpoint-"));
  let coverCalls = 0, backgroundCalls = 0;
  const actual = await readPngDimensions(bytes);
  const delivery = { providerSource: { width: 1024, height: 1536, hasAlpha: false, hasTransparency: false }, delivered: { width: actual.width, height: actual.height, fit: "cover" as const } };
  const cover = async () => { coverCalls++; return [{ ...identity.plan[0], bytes, image: delivery }]; };
  const background: ArtCheckpointIdentity = { ...identity, group: "dynamic", plan: [{ file: "assets/background.png", role: "局内背景", prompt: "背景" }] };
  try {
    const first = await getOrGenerateArtCheckpoint(root, identity, cover);
    await getOrGenerateArtCheckpoint(root, background, async () => { backgroundCalls++; return []; });
    const recovered = await getOrGenerateArtCheckpoint(root, identity, cover);
    await getOrGenerateArtCheckpoint(root, background, async () => { backgroundCalls++; return [{ ...background.plan[0], bytes }]; });
    assert.equal(coverCalls, 1); assert.equal(backgroundCalls, 2);
    assert.equal(recovered.cacheHit, true); assert.equal(recovered.generatedAt, first.generatedAt);
    assert.deepEqual(recovered.entries[0].bytes, bytes);
    assert.deepEqual(recovered.entries[0].image, delivery);
  } finally { if (dirname(root) === tmpdir()) rmSync(root, { recursive: true, force: true }); }
});

test("检查点绑定项目、模型、画幅和完整提示词；损坏字节不能复用", async () => {
  const root = mkdtempSync(join(tmpdir(), "image-checkpoint-boundary-"));
  try {
    const generate = async () => [{ ...identity.plan[0], bytes, image: baseDelivery }];
    await getOrGenerateArtCheckpoint(root, identity, generate);
    for (const change of [{ projectId: "project-b" }, { model: "other" }, { aspectRatio: "16:9" }, { plan: [{ ...identity.plan[0], prompt: "已修改" }] }, { request: imageRequestFingerprint({ "assets/cover.png": Buffer.from("different-source") }, {}, "run") }]) {
      const updated = { ...identity, ...change };
      const result = await getOrGenerateArtCheckpoint(root, updated, async () => [{ ...updated.plan[0], bytes }]);
      assert.equal(result.cacheHit, false);
    }
    for (const file of readdirSync(root)) {
      const path = join(root, file); const saved = JSON.parse(readFileSync(path, "utf8"));
      saved.entries[0].base64 = Buffer.from("corrupt").toString("base64"); writeFileSync(path, JSON.stringify(saved));
    }
    assert.equal((await getOrGenerateArtCheckpoint(root, identity, generate)).cacheHit, false);
  } finally { if (dirname(root) === tmpdir()) rmSync(root, { recursive: true, force: true }); }
});

test("普通图片检查点丢失 delivery metadata 时必须重新生成", async () => {
  const root = mkdtempSync(join(tmpdir(), "image-checkpoint-metadata-"));
  let calls = 0;
  const generate = async () => { calls += 1; return [{ ...identity.plan[0], bytes, image: baseDelivery }]; };
  try {
    await getOrGenerateArtCheckpoint(root, identity, generate);
    const path = join(root, readdirSync(root)[0]);
    const saved = JSON.parse(readFileSync(path, "utf8"));
    delete saved.entries[0].image;
    writeFileSync(path, JSON.stringify(saved));
    assert.equal((await getOrGenerateArtCheckpoint(root, identity, generate)).cacheHit, false);
    assert.equal(calls, 2);
  } finally { if (dirname(root) === tmpdir()) rmSync(root, { recursive: true, force: true }); }
});

test("Sprite Sheet 检查点缺失或篡改动画元数据时不能恢复", async () => {
  const root = mkdtempSync(join(tmpdir(), "sprite-checkpoint-"));
  const animation = { frameWidth: 32, frameHeight: 32, columns: 4, rows: 1, frameCount: 4, anchor: { x: 16, y: 30 }, clips: [{ id: "idle" as const, startFrame: 0, frameCount: 4, fps: 8, loop: true }] };
  const spriteBytes = await sharp({ create: { width: 128, height: 32, channels: 4, background: "#55aa88ff" } }).png().toBuffer();
  const spriteIdentity: ArtCheckpointIdentity = { ...identity, group: "dynamic", plan: [{ file: "assets/hero.png", role: "主角", prompt: "四帧待机", expectedSpriteSheet: animation }] };
  const image = { providerSource: { width: 128, height: 32, hasAlpha: true, hasTransparency: false }, delivered: { width: 128, height: 32, fit: "sprite-sheet" as const }, spriteSheet: animation };
  let calls = 0;
  const generate = async () => { calls += 1; return [{ ...spriteIdentity.plan[0], bytes: spriteBytes, image }]; };
  try {
    await getOrGenerateArtCheckpoint(root, spriteIdentity, generate);
    assert.equal((await getOrGenerateArtCheckpoint(root, spriteIdentity, generate)).cacheHit, true);
    const path = join(root, readdirSync(root)[0]);
    const saved = JSON.parse(readFileSync(path, "utf8"));
    delete saved.entries[0].image.spriteSheet;
    writeFileSync(path, JSON.stringify(saved));
    assert.equal((await getOrGenerateArtCheckpoint(root, spriteIdentity, generate)).cacheHit, false);
    assert.equal(calls, 2);
  } finally { if (dirname(root) === tmpdir()) rmSync(root, { recursive: true, force: true }); }
});

test("取消发生在图片返回后时不写成功检查点或临时文件", async () => {
  const root = mkdtempSync(join(tmpdir(), "cancelled-checkpoint-"));
  const controller = new AbortController();
  try {
    await assert.rejects(runWithCancellation(controller.signal, () => getOrGenerateArtCheckpoint(root, identity, async () => {
      controller.abort();
      return [{ ...identity.plan[0], bytes }];
    })), { name: "AbortError" });
    assert.deepEqual(readdirSync(root), []);
  } finally { if (dirname(root) === tmpdir()) rmSync(root, { recursive: true, force: true }); }
});
