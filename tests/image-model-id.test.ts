import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { inspectRasterAiArt } from "../src/server/art-policy.js";

const allowed = [
  "gpt-image-2.5-sunburst",
  "gpt-image-2.5-sunburst-2026-09-08",
  "gpt-image-2.5-flare",
  "gpt-image-2.5-flare-2026-09-08",
];

test("AI 位图清单接受精确的 2.5 Sunburst/Flare 型号与快照", () => {
  const root = mkdtempSync(join(tmpdir(), "image-model-manifest-"));
  try {
    mkdirSync(join(root, "assets"), { recursive: true });
    mkdirSync(join(root, "_studio"), { recursive: true });
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(600)]);
    writeFileSync(join(root, "assets", "cover.png"), png);
    writeFileSync(join(root, "assets", "background.png"), png);
    const entries = [
      { file: "assets/cover.png", role: "封面", bytes: png.length, prompt: "完整归档的封面图像生成提示词，长度足够用于溯源" },
      { file: "assets/background.png", role: "局内背景", bytes: png.length, prompt: "完整归档的背景图像生成提示词，长度足够用于溯源" },
    ];
    const writeManifest = (model: string) => writeFileSync(join(root, "_studio", "DYNAMIC_ART.json"), JSON.stringify({ schemaVersion: 2, model, generatedAt: new Date().toISOString(), entries }));
    for (const model of allowed) {
      writeManifest(model);
      assert.deepEqual(inspectRasterAiArt(root, 'background-image:url("./assets/background.png")'), [], model);
    }
    for (const model of ["gpt-image-2.5-sunburn", "gpt-image-2.5-flare-preview", "gpt-image-2.5-sunburst-extra-2026-09-08"]) {
      writeManifest(model);
      assert.ok(inspectRasterAiArt(root, 'background-image:url("./assets/background.png")').some((failure) => failure.includes("实际使用的 GPT Image 模型")), model);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
