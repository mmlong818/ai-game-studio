import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import type { ProjectDetail } from "../src/shared/contracts";
import { animatedRenovationSpec, assertSourceSpriteSheetProvenance, BuildOrchestrator, generateAnimationClipReplacement, sourceImageOutputConstraints, sourceImageReferences } from "../src/server/build-orchestrator";
import { dynamicArtPlan } from "../src/server/image-generator";
import { openTestDatabase } from "../src/server/database";
import { StudioRepository } from "../src/server/studio-repository";

async function waitForBuild(repository: StudioRepository, projectId: string) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    const build = await repository.latestBuild(projectId);
    if (build?.status === "succeeded" || build?.status === "failed") return build;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error("等待资源改造构建超时。");
}

test("资源改造复制选中来源的运行时，不回退默认模板", async () => {
  const artifactRoot = mkdtempSync(join(tmpdir(), "renovation-source-"));
  try {
    const sourceRoot = join(artifactRoot, "source-build");
    const targetRoot = join(artifactRoot, "target-build");
    mkdirSync(join(sourceRoot, "assets"), { recursive: true });
    mkdirSync(targetRoot, { recursive: true });
    writeFileSync(join(sourceRoot, "index.html"), "<main>source-custom-layout<img src=\"./assets/custom.dat\"></main>");
    writeFileSync(join(sourceRoot, "app.js"), "window.sourceCustomRule=true");
    writeFileSync(join(sourceRoot, "assets", "custom.dat"), "source-asset");
    const repository = { recentReusableBuilds: async (projectId: string) => projectId === "selected-source" ? [{ id: "source-build" }] : [] };
    const orchestrator = new BuildOrchestrator(repository as never, artifactRoot);
    const project = { spec: { renovation: { sourceProjectId: "selected-source", revisionScope: "assets", request: "只换主角" } } } as ProjectDetail;
    const copied = await (orchestrator as unknown as { reuseSourceRuntime(project: ProjectDetail, root: string): Promise<string | null> }).reuseSourceRuntime(project, targetRoot);
    assert.equal(copied, "source-build");
    assert.match(readFileSync(join(targetRoot, "index.html"), "utf8"), /source-custom-layout/);
    assert.match(readFileSync(join(targetRoot, "index.html"), "utf8"), /\.\/assets\/custom\.dat/);
    assert.match(readFileSync(join(targetRoot, "app.js"), "utf8"), /sourceCustomRule/);
    assert.equal(readFileSync(join(targetRoot, "assets", "custom.dat"), "utf8"), "source-asset");
  } finally { rmSync(artifactRoot, { recursive: true, force: true }); }
});

test("动作替换只允许已有动画播放器的唯一槽位，并把来源sheet与clip传给生成器", async () => {
  const sourceSheet = await sharp({ create: { width: 256, height: 64, channels: 4, background: "#ffffff00" } }).png().toBuffer();
  const animation = { frameWidth: 64, frameHeight: 64, columns: 4, rows: 1, frameCount: 4, anchor: { x: 32, y: 58 }, clips: [{ id: "run" as const, startFrame: 0, frameCount: 4, fps: 10, loop: true }] };
  const project = { spec: { designProfile: { generatedBlueprint: { sprites: [{ file: "assets/hero.png", role: "主角", hint: "清晰的奔跑角色主体", animation }] } } } } as unknown as ProjectDetail;
  const target = { files: ["assets/hero.png"], clipId: "run" as const };
  assert.throws(() => animatedRenovationSpec(project, target, "const hero = image;"), /尚未接入 Sprite Sheet 播放器/);
  assert.throws(() => animatedRenovationSpec(project, { files: ["assets/other.png"], clipId: "run" }, "__FORGE_SPRITES__.create();player.draw("), /没有为目标资源声明 run/);
  const spec = animatedRenovationSpec(project, target, "const player=__FORGE_SPRITES__.create(image,animation);player.draw(ctx,0,0);")!;
  let observed: unknown = null;
  const entry = { file: spec.file, role: spec.role, bytes: sourceSheet, prompt: "run", image: { providerSource: { width: 256, height: 64, hasAlpha: true, hasTransparency: true }, delivered: { width: 256, height: 64, fit: "sprite-sheet" as const }, spriteSheet: animation } };
  const generated = await generateAnimationClipReplacement({ generateAnimationSpriteSheet: async (_project, _spec, options) => { observed = options; return entry; } } as never, project, spec, sourceSheet, "run");
  assert.equal(generated, entry);
  assert.deepEqual(observed, { sourceSheet, clipId: "run" });
});

test("动作替换只接受与蓝图一致且尺寸可复验的来源 Sprite Sheet 溯源", async () => {
  const root = mkdtempSync(join(tmpdir(), "sprite-provenance-"));
  const animation = { frameWidth: 64, frameHeight: 64, columns: 4, rows: 1, frameCount: 4, anchor: { x: 32, y: 58 }, clips: [{ id: "run" as const, startFrame: 0, frameCount: 4, fps: 10, loop: true }] };
  try {
    mkdirSync(join(root, "assets"), { recursive: true });
    mkdirSync(join(root, "_studio"), { recursive: true });
    const sprite = await sharp({ create: { width: 256, height: 64, channels: 4, background: "#ffffff00" } }).png().toBuffer();
    writeFileSync(join(root, "assets", "hero.png"), sprite);
    const image = { providerSource: { width: 256, height: 64, hasAlpha: true, hasTransparency: true }, delivered: { width: 256, height: 64, fit: "sprite-sheet" }, spriteSheet: animation };
    writeFileSync(join(root, "_studio", "DYNAMIC_ART.json"), JSON.stringify({ schemaVersion: 2, entries: [{ file: "assets/hero.png", image }] }));
    await assertSourceSpriteSheetProvenance(root, "assets/hero.png", animation);
    delete (image as { spriteSheet?: unknown }).spriteSheet;
    writeFileSync(join(root, "_studio", "DYNAMIC_ART.json"), JSON.stringify({ schemaVersion: 2, entries: [{ file: "assets/hero.png", image }] }));
    await assert.rejects(assertSourceSpriteSheetProvenance(root, "assets/hero.png", animation), /没有与动画蓝图一致/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("部分资源替换继承来源槽位尺寸并按资源角色选择适配", async () => {
  const root = mkdtempSync(join(tmpdir(), "renovation-image-size-"));
  try {
    mkdirSync(join(root, "assets", "sprites"), { recursive: true });
    const landscape = await sharp({ create: { width: 320, height: 180, channels: 4, background: "#335577" } }).png().toBuffer();
    const role = await sharp({ create: { width: 160, height: 240, channels: 4, background: "#ffffff00" } }).png().toBuffer();
    writeFileSync(join(root, "assets", "background.png"), landscape);
    writeFileSync(join(root, "assets", "sprites", "hero.png"), role);
    const outputs = await sourceImageOutputConstraints(root, ["assets/background.png", "assets/sprites/hero.png"]);
    const references = await sourceImageReferences(root, ["assets/background.png", "assets/sprites/hero.png"]);
    assert.deepEqual(outputs["assets/background.png"], { width: 320, height: 180, fit: "cover" });
    assert.deepEqual(outputs["assets/sprites/hero.png"], { width: 160, height: 240, fit: "contain" });
    assert.deepEqual(references["assets/background.png"], landscape);
    assert.deepEqual(references["assets/sprites/hero.png"], role);
    await assert.rejects(sourceImageOutputConstraints(root, ["assets/missing.png"]), /缺少待替换图片/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("Orchestrator 从已复制来源读取目标 PNG 并只把该字节传给局部资源生成器", async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://localhost:4312");
  const artifactRoot = mkdtempSync(join(tmpdir(), "renovation-reference-integration-"));
  const cover = await sharp({ create: { width: 1536, height: 1024, channels: 4, background: "#334455" } }).png().toBuffer();
  const background = await sharp({ create: { width: 1536, height: 1024, channels: 4, background: "#557799" } }).png().toBuffer();
  const textured = async (width: number, height: number, seed: number) => {
    const pixels = Buffer.alloc(width * height * 4);
    for (let index = 0; index < width * height; index += 1) {
      pixels[index * 4] = (index * 17 + seed) % 255;
      pixels[index * 4 + 1] = (index * 29 + seed) % 255;
      pixels[index * 4 + 2] = (index * 41 + seed) % 255;
      pixels[index * 4 + 3] = index % 7 ? 255 : 80;
    }
    return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
  };
  const food = await textured(96, 96, 13);
  const obstacle = await textured(112, 112, 71);
  let observed: { files?: readonly string[]; outputs?: Readonly<Record<string, unknown>>; sources?: Readonly<Record<string, Buffer>> } | null = null;
  let failReplacement = false;
  const art = {
    model: "gpt-image-2",
    generate: async () => cover,
    generateDynamicArt: async (project: ProjectDetail, files?: readonly string[], outputs?: Readonly<Record<string, unknown>>, sources?: Readonly<Record<string, Buffer>>) => {
      const plan = dynamicArtPlan(project);
      if (files) {
        observed = { files, outputs, sources };
        if (failReplacement) return [];
        return plan.filter(entry => files.includes(entry.file)).map(entry => ({ ...entry, bytes: food }));
      }
      return plan.map(entry => ({ ...entry, bytes: entry.file === "assets/background.png" ? background : entry.file.includes("food") ? food : obstacle }));
    },
  };
  try {
    const project = await repository.create({ idea: "小蛇在庭院收集食物并避开障碍", template: "snake" });
    await new BuildOrchestrator(repository, artifactRoot, { coverArt: art as never, browserAudit: false }).start(project.id);
    assert.equal((await waitForBuild(repository, project.id)).status, "succeeded");
    const revisionId = randomUUID();
    await new BuildOrchestrator(repository, artifactRoot, { coverArt: art as never, browserAudit: false }).start(project.id, { requestId: revisionId, revisionScope: "assets", content: "只替换食物，保留其他素材" });
    const deadline = Date.now() + 8_000;
    let revision = await repository.buildById(revisionId);
    while (revision.status !== "succeeded" && revision.status !== "failed" && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 40));
      revision = await repository.buildById(revisionId);
    }
    assert.equal(revision.status, "succeeded", revision.error ?? undefined);
    assert.deepEqual(observed?.files, ["assets/stage-c/snake-food-v2.png"]);
    assert.deepEqual(observed?.sources?.["assets/stage-c/snake-food-v2.png"], food);
    assert.deepEqual(observed?.outputs?.["assets/stage-c/snake-food-v2.png"], { width: 96, height: 96, fit: "contain" });
    assert.deepEqual(readFileSync(join(artifactRoot, revisionId, "assets", "stage-c", "snake-obstacle-v2.png")), obstacle, "未选障碍资源必须逐字节复用来源");

    const versionsBeforeFailure = (await repository.listVersions(project.id)).length;
    failReplacement = true;
    const failedId = randomUUID();
    await new BuildOrchestrator(repository, artifactRoot, { coverArt: art as never, browserAudit: false }).start(project.id, { requestId: failedId, revisionScope: "assets", content: "只替换食物颜色，保留其他素材" });
    let failed = await repository.buildById(failedId);
    const failureDeadline = Date.now() + 8_000;
    while (failed.status !== "succeeded" && failed.status !== "failed" && Date.now() < failureDeadline) {
      await new Promise(resolve => setTimeout(resolve, 40));
      failed = await repository.buildById(failedId);
    }
    assert.equal(failed.status, "failed");
    assert.match(failed.error ?? "", /参考编辑未完整返回目标/);
    assert.equal((await repository.listVersions(project.id)).length, versionsBeforeFailure, "失败 edit 不得发布新版本");
  } finally {
    rmSync(artifactRoot, { recursive: true, force: true });
    await database.close();
  }
});
