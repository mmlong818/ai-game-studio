import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { getOrGenerateArtCheckpoint, type ArtCheckpointIdentity } from "../src/server/art-checkpoint";

const bytes = readFileSync("assets/starter/signal-studio/cover.png");
const identity: ArtCheckpointIdentity = { projectId: "project-a", model: "test-image", runtimeTarget: "web-2d", aspectRatio: "9:16", group: "cover", plan: [{ file: "assets/cover.png", role: "封面", prompt: "原始确认提示词" }] };

test("图像成功结果单独持久化；另一组失败后只补失败组", async () => {
  const root = mkdtempSync(join(tmpdir(), "image-checkpoint-"));
  let coverCalls = 0, backgroundCalls = 0;
  const cover = async () => { coverCalls++; return [{ ...identity.plan[0], bytes }]; };
  const background: ArtCheckpointIdentity = { ...identity, group: "dynamic", plan: [{ file: "assets/background.png", role: "局内背景", prompt: "背景" }] };
  try {
    const first = await getOrGenerateArtCheckpoint(root, identity, cover);
    await getOrGenerateArtCheckpoint(root, background, async () => { backgroundCalls++; return []; });
    const recovered = await getOrGenerateArtCheckpoint(root, identity, cover);
    await getOrGenerateArtCheckpoint(root, background, async () => { backgroundCalls++; return [{ ...background.plan[0], bytes }]; });
    assert.equal(coverCalls, 1); assert.equal(backgroundCalls, 2);
    assert.equal(recovered.cacheHit, true); assert.equal(recovered.generatedAt, first.generatedAt);
    assert.deepEqual(recovered.entries[0].bytes, bytes);
  } finally { if (dirname(root) === tmpdir()) rmSync(root, { recursive: true, force: true }); }
});

test("检查点绑定项目、模型、画幅和完整提示词；损坏字节不能复用", async () => {
  const root = mkdtempSync(join(tmpdir(), "image-checkpoint-boundary-"));
  try {
    const generate = async () => [{ ...identity.plan[0], bytes }];
    await getOrGenerateArtCheckpoint(root, identity, generate);
    for (const change of [{ projectId: "project-b" }, { model: "other" }, { aspectRatio: "16:9" }, { plan: [{ ...identity.plan[0], prompt: "已修改" }] }]) {
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
