import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import type { ProjectDetail } from "../src/shared/contracts";
import { animatedRenovationSpec, applyRevisionPlanAnimationUpgrades, assertSourceSpriteSheetProvenance, BuildOrchestrator, generateAnimationClipReplacement, sourceImageOutputConstraints, sourceImageReferences } from "../src/server/build-orchestrator";
import { dynamicArtPlan } from "../src/server/image-generator";
import { openTestDatabase } from "../src/server/database";
import { StudioRepository } from "../src/server/studio-repository";
import type { GameCodeGenerator } from "../src/server/game-generator";
import { MECHANIC_ATLAS, DESIGN_MODIFIERS } from "../src/shared/game-design-knowledge/mechanic-atlas";
import { generatedDesignHtml } from "./generated-design-fixture";

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

test("同一计划把全部角色静态槽升级为统一Sprite Sheet合同，不改未选道具", () => {
  const sprites: Array<{ file: string; role: string; hint: string; animation?: import("../src/shared/generated-blueprint").SpriteSheetAnimation }> = [
    { file: "assets/monk-tang.png", role: "唐僧", hint: "僧人" },
    { file: "assets/spirit-green.png", role: "青衣小妖", hint: "女妖" },
    { file: "assets/spirit-red.png", role: "红衣厉妖", hint: "女妖" },
    { file: "assets/prayer-bead.png", role: "护身念珠", hint: "道具" },
  ];
  const project = { spec: { designProfile: { generatedBlueprint: { sprites } } } } as unknown as ProjectDetail;
  const content = "角色需要是精灵动图，墨量消耗减半";
  const plan = {
    sourceProjectId: "source",
    sourceVersionId: "v3",
    content,
    operations: [
      { scope: "assets" as const, content, targets: sprites.slice(0, 3).map(({ file, role: label }) => ({ file, label, animation: "sprite-sheet" as const })) },
      { scope: "gameplay" as const, content },
    ],
  };
  assert.deepEqual([...applyRevisionPlanAnimationUpgrades(project, plan)], sprites.slice(0, 3).map(({ file }) => file));
  for (const sprite of sprites.slice(0, 3)) {
    assert.equal(sprite.animation?.columns, 4);
    assert.equal(sprite.animation?.frameCount, 16);
    assert.deepEqual(sprite.animation?.clips.map((clip) => clip.id), ["idle", "run", "hit", "effect"]);
  }
  assert.equal(sprites[3]!.animation, undefined);
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
    assert.equal(failed.failureDetails?.[0]?.stage, "asset");
    assert.equal(failed.failureDetails?.[0]?.retryable, false);
    assert.equal((await repository.listVersions(project.id)).length, versionsBeforeFailure, "失败 edit 不得发布新版本");
  } finally {
    rmSync(artifactRoot, { recursive: true, force: true });
    await database.close();
  }
});

test("混合计划在同一构建升级全部角色动画并把选中的玩法意见交给代码生成", { timeout: 20_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://localhost:4312");
  const artifactRoot = mkdtempSync(join(tmpdir(), "mixed-role-animation-"));
  const staticRole = await sharp({ create: { width: 256, height: 256, channels: 4, background: "#77aaee88" } }).png().toBuffer();
  const background = await sharp({ create: { width: 576, height: 1024, channels: 4, background: "#223344ff" } }).png().toBuffer();
  const cover = await sharp({ create: { width: 1024, height: 1536, channels: 4, background: "#334455ff" } }).png().toBuffer();
  const sheet = await sharp({ create: { width: 512, height: 512, channels: 4, background: "#00000000" } })
    .composite(Array.from({ length: 16 }, (_, index) => ({ input: { create: { width: 72, height: 100 - (index % 4) * 4, channels: 4, background: index % 2 ? "#ee8844dd" : "#55aadddd" } }, left: (index % 4) * 128 + 28, top: Math.floor(index / 4) * 128 + 20 + (index % 4) * 4 })))
    .png().toBuffer();
  const roleFiles = ["assets/monk-tang.png", "assets/spirit-green.png", "assets/spirit-red.png"];
  let observedFiles: readonly string[] = [];
  let observedSources: Readonly<Record<string, Buffer>> = {};
  let codeProject: ProjectDetail | null = null;
  const codeGenerator = {
    async generate(project: ProjectDetail) {
      codeProject = project;
      const animation = JSON.stringify(project.spec.designProfile.generatedBlueprint!.sprites[0]!.animation);
      const bindings = roleFiles.map((file, index) => `const image${index}=new Image();image${index}.src='./${file}';const player${index}=window.__FORGE_SPRITES__.create(image${index},${animation},'idle');player${index}.play('idle');player${index}.draw(document.querySelector('#game-canvas').getContext('2d'),${80 + index * 120},220,1,performance.now());`).join("\n");
      const html = generatedDesignHtml("mechanic-1-completed").replace("<script>", `<script>\nconst inkCost = 10 * 0.5;\n${bindings}\nconst beadImage=new Image();beadImage.src='./assets/prayer-bead.png';\nconst bgImage=new Image();bgImage.src='./assets/background.png';`);
      return { html, designNotes: "只升级角色动画并调整墨量消耗", rounds: 1 };
    },
  } as unknown as GameCodeGenerator;
  try {
    let project = await repository.create({ idea: "画圈围住追逐唐僧的妖精，保护唐僧直到完成目标", template: "generated" });
    const sprites = [
      { file: roleFiles[0]!, role: "唐僧", hint: "红黄袈裟的奔跑僧人" },
      { file: roleFiles[1]!, role: "青衣小妖", hint: "青衣飘带的追逐女妖" },
      { file: roleFiles[2]!, role: "红衣厉妖", hint: "红衣铁甲的追逐女妖" },
      { file: "assets/prayer-bead.png", role: "护身念珠", hint: "深棕木纹护身念珠" },
    ];
    const spec = structuredClone(project.spec);
    spec.designSource = "llm";
    spec.designProfile.generatedBlueprint = {
      mechanicIds: [MECHANIC_ATLAS[0]!.id], modifierIds: [DESIGN_MODIFIERS[0]!.id],
      coreDecision: "决定何时收笔围住妖精", tension: "墨量有限且妖精持续追逐", masterySignal: "用更少墨量围住更多妖精", sprites,
    };
    const baseline = await repository.createBuild(project.id);
    await repository.markBuildRunning(baseline.id);
    await repository.completeBuild(baseline.id, spec, { status: "passed", summary: "fixture", checkedAt: new Date().toISOString(), checks: [{ id: "fixture", label: "fixture", status: "passed", evidence: "fixture" }] });
    project = (await repository.get(project.id))!;
    const sourceRoot = join(artifactRoot, baseline.id);
    mkdirSync(join(sourceRoot, "assets"), { recursive: true });
    mkdirSync(join(sourceRoot, "_studio"), { recursive: true });
    writeFileSync(join(sourceRoot, "index.html"), generatedDesignHtml("mechanic-1-completed"));
    writeFileSync(join(sourceRoot, "app.js"), "window.sourceRuntime=true;");
    writeFileSync(join(sourceRoot, "styles.css"), "body{margin:0}");
    writeFileSync(join(sourceRoot, "assets", "cover.png"), cover);
    writeFileSync(join(sourceRoot, "assets", "background.png"), background);
    for (const file of [...roleFiles, "assets/prayer-bead.png"]) writeFileSync(join(sourceRoot, file), staticRole);
    writeFileSync(join(sourceRoot, "_studio", "DYNAMIC_ART.json"), JSON.stringify({ schemaVersion: 2, entries: [
      { file: "assets/cover.png", role: "封面", bytes: cover.length, prompt: "测试夹具使用的完整封面提示词，明确主体构图、画幅、安全区与不得出现文字。" },
      { file: "assets/background.png", role: "局内背景", bytes: background.length, prompt: "测试夹具使用的完整背景提示词，明确交互安全区、纵向画幅与主体对比度。" },
      ...sprites.map((sprite) => ({ file: sprite.file, role: sprite.role, bytes: staticRole.length, prompt: `测试夹具使用的${sprite.role}完整提示词，明确角色轮廓、透明背景、固定相机与安全留白。` })),
    ] }));
    const content = "角色需要是精灵动图，墨量消耗减半";
    const revisionPlan = {
      sourceProjectId: project.id, sourceVersionId: project.version.id, content,
      operations: [
        { scope: "assets" as const, content, targets: sprites.slice(0, 3).map(({ file, role: label }) => ({ file, label, animation: "sprite-sheet" as const })) },
        { scope: "gameplay" as const, content },
      ],
    };
    const art = {
      model: "gpt-image-2",
      generate: async () => cover,
      generateDynamicArt: async (next: ProjectDetail, files?: readonly string[], _outputs?: Readonly<Record<string, unknown>>, sources?: Readonly<Record<string, Buffer>>) => {
        observedFiles = files ?? [];
        observedSources = sources ?? {};
        return next.spec.designProfile.generatedBlueprint!.sprites.filter((sprite) => files?.includes(sprite.file)).map((sprite) => ({
          file: sprite.file, role: sprite.role, bytes: sheet, prompt: `测试夹具使用的${sprite.role}动画提示词，明确四乘四帧序、透明背景、统一角色比例与脚底锚点。`,
          image: { providerSource: { width: 512, height: 512, hasAlpha: true, hasTransparency: true }, delivered: { width: 512, height: 512, fit: "sprite-sheet" as const }, spriteSheet: sprite.animation! },
        }));
      },
    };
    const revisionId = randomUUID();
    await new BuildOrchestrator(repository, artifactRoot, { coverArt: art as never, codeGenerator, browserAudit: false }).start(project.id, { requestId: revisionId, content, revisionPlan });
    const build = await waitForBuild(repository, project.id);
    assert.equal(build.status, "succeeded", build.error ?? undefined);
    assert.deepEqual([...observedFiles].sort(), [...roleFiles].sort());
    for (const file of roleFiles) assert.deepEqual(observedSources[file], staticRole, `${file}必须使用来源静态角色作reference`);
    assert.ok(codeProject, "动画升级与玩法修改必须进入代码生成");
    for (const sprite of codeProject!.spec.designProfile.generatedBlueprint!.sprites.slice(0, 3)) assert.equal(sprite.animation?.frameCount, 16);
    assert.deepEqual(readFileSync(join(artifactRoot, revisionId, "assets", "prayer-bead.png")), staticRole, "未选念珠必须保持来源字节");
  } finally {
    rmSync(artifactRoot, { recursive: true, force: true });
    await database.close();
  }
});
