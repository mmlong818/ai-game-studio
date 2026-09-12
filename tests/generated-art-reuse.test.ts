import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDesignProfile, gameDesignProfileSchema, generateGameSpec, type ProjectDetail } from "../src/shared/contracts";
import { coverPrompt, dynamicArtPlan } from "../src/server/image-generator";
import { readReusableGeneratedArt } from "../src/server/generated-art-reuse";
import { DESIGN_MODIFIERS, MECHANIC_ATLAS } from "../src/shared/game-design-knowledge/mechanic-atlas";

// 生成游戏的局内位图只来自知识蓝图声明的精灵；没有蓝图就没有可复用的动态美术。
const profile = gameDesignProfileSchema.parse({
  ...createDesignProfile("generated", "standard"),
  generatedBlueprint: {
    mechanicIds: [MECHANIC_ATLAS[0].id], modifierIds: [DESIGN_MODIFIERS[0].id],
    coreDecision: "先翻哪一张牌决定能否凑齐记忆中的花朵配对。", tension: "翻错会暴露位置给自己却浪费步数。", masterySignal: "熟练玩家用更少翻牌完成全部配对。",
    sprites: [
      { file: "assets/flower-card.png", role: "花朵牌", hint: "圆角卡牌，正面是水彩花朵" },
      { file: "assets/garden-basket.png", role: "花篮", hint: "浅色编织花篮，正面开口" },
    ],
  },
});
const project = { id: "garden-project", title: "花园记忆", spec: generateGameSpec({ idea: "翻开花朵牌，找出相同花朵即可配对成功", template: "generated" }, null, profile) } as ProjectDetail;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9S8AAAAASUVORK5CYII=", "base64");
function fixture(run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "forge-art-reuse-"));
  try {
    mkdirSync(join(root, "assets")); mkdirSync(join(root, "_studio"));
    const entries = [{ file: "assets/cover.png", role: "封面", prompt: coverPrompt(project) }, ...dynamicArtPlan(project)].map(entry => ({ ...entry, bytes: png.length }));
    for (const entry of entries) writeFileSync(join(root, entry.file), png);
    writeFileSync(join(root, "game-manifest.json"), JSON.stringify({ template: "generated", aspectRatio: project.spec.aspectRatio, runtimeTarget: project.spec.runtimeTarget }));
    writeFileSync(join(root, "_studio/DYNAMIC_ART.json"), JSON.stringify({ schemaVersion: 2, model: "image-model", generatedAt: "2026-09-06T00:00:00.000Z", entries }));
    run(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}
const candidate = (root: string) => ({ root, projectId: project.id, buildId: "previous-build", status: "succeeded" });

test("复用同项目成功产物，保留原始时间模型及完整来源文本", () => fixture(root => {
  const result = readReusableGeneratedArt(project, "image-model", candidate(root))!;
  assert.ok(result.cover.equals(png)); assert.equal(result.dynamicArt.length, dynamicArtPlan(project).length);
  assert.equal(result.provenance.generatedAt, "2026-09-06T00:00:00.000Z");
  assert.equal(result.provenanceJson, readFileSync(join(root, "_studio/DYNAMIC_ART.json"), "utf8"));
  assert.equal(result.sourceBuildId, "previous-build");
}));
test("模型、项目、成功状态或画幅改变均拒绝复用", () => fixture(root => {
  assert.equal(readReusableGeneratedArt(project, "other-model", candidate(root)), null);
  assert.equal(readReusableGeneratedArt(project, "image-model", { ...candidate(root), projectId: "other" }), null);
  assert.equal(readReusableGeneratedArt(project, "image-model", { ...candidate(root), status: "failed" }), null);
  assert.equal(readReusableGeneratedArt({ ...project, spec: { ...project.spec, aspectRatio: "1:1" } }, "image-model", candidate(root)), null);
}));
test("prompt变化或文件损坏不得伪称可复用", () => fixture(root => {
  assert.equal(readReusableGeneratedArt({ ...project, title: "另一种美术" }, "image-model", candidate(root)), null);
  writeFileSync(join(root, "assets/flower-card.png"), Buffer.alloc(png.length));
  assert.equal(readReusableGeneratedArt(project, "image-model", candidate(root)), null);
}));
test("不完整来源、字节数量不一致与路径穿越拒绝", () => fixture(root => {
  const path = join(root, "_studio/DYNAMIC_ART.json");
  const original = JSON.parse(readFileSync(path, "utf8"));
  for (const change of [
    { ...original, entries: original.entries.slice(0, 1) },
    { ...original, entries: original.entries.map((entry: object) => ({ ...entry, bytes: 24 })) },
    { ...original, entries: [...original.entries.slice(0, 1), { ...original.entries[1], file: "../secret.png" }] },
  ]) { writeFileSync(path, JSON.stringify(change)); assert.equal(readReusableGeneratedArt(project, "image-model", candidate(root)), null); }
}));
