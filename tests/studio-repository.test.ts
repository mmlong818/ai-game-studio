import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { BuildOrchestrator } from "../src/server/build-orchestrator";
import { openTestDatabase } from "../src/server/database";
import { ProjectLifecycle } from "../src/server/project-lifecycle";
import { StudioRepository } from "../src/server/studio-repository";
import { loadCuratedResourceLibrary } from "../src/server/resource-library";
import { generateGameSpec } from "../src/shared/contracts";
import { officialFixtureGames } from "../src/shared/official-games";
import { createResourcePlanningForGameSpec } from "../src/shared/resource-planning";

async function createRepository() {
  const database = await openTestDatabase();
  return {
    database,
    repository: new StudioRepository(database, "http://127.0.0.1:4312"),
  };
}

async function waitForBuild(repository: StudioRepository, projectId: string) {
  const deadline = Date.now() + 8_000;
  let lastBuild = null;
  while (Date.now() < deadline) {
    const build = await repository.latestBuild(projectId);
    lastBuild = build;
    if (build?.status === "succeeded" || build?.status === "failed") return build;
    await new Promise((resolveWait) => setTimeout(resolveWait, 80));
  }
  throw new Error(`等待构建完成超时：${JSON.stringify(lastBuild)}`);
}

test("玩法雷达跨榜去重、持久化并以幂等方式进入研究队列", async () => {
  const { database, repository } = await createRepository();
  try {
    const seeded = await repository.ensureInitialGameplayRadarSignals();
    assert.equal(seeded.length, 3);
    const fauna = seeded.find(({ gameTitle }) => gameTitle === "Art of Fauna");
    assert.ok(fauna);
    assert.equal(fauna.signals.length, 2);

    const signal = {
      gameTitle: "Art of Fauna", sourceTitle: "独立平台复核", sourceUrl: "https://example.org/art-of-fauna",
      sourceType: "editorial-list" as const, platform: "mobile" as const, observedAt: "2026-09-05", publishedAt: null,
      signalSummary: "独立来源再次指出重排与辅助访问组合。", playerVerbs: ["重排", "阅读"], mechanicTags: ["puzzle", "accessibility", "reorder"],
    };
    await Promise.all([repository.ingestGameplayRadarSignal(signal), repository.ingestGameplayRadarSignal(signal)]);
    const restored = (await repository.listGameplayRadar()).find(({ id }) => id === fauna.id);
    assert.ok(restored);
    assert.equal(restored.signals.length, 3);
    assert.equal(restored.distinctSourceCount, 2);

    const [first, second] = await Promise.all([
      repository.startGameplayRadarResearch(fauna.id, { refresh: false }, new Date("2026-09-05T08:00:00Z")),
      repository.startGameplayRadarResearch(fauna.id, { refresh: false }, new Date("2026-09-05T08:00:00Z")),
    ]);
    assert.equal(first.task.id, second.task.id);
    assert.equal(first.task.status, "queued");
    assert.equal(first.task.candidateDraft, null);
    assert.equal((await repository.listDesignResearchTasks()).filter(({ id }) => id === first.task.id).length, 1);
  } finally {
    await database.close();
  }
});

const testAiPng = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(600)]);
const testCoverArt = {
  generate: async () => testAiPng,
  generateDynamicArt: async () => [{
    file: "assets/background.png",
    role: "局内背景",
    bytes: testAiPng,
    prompt: "为自动化测试游戏生成一张不含文字的局内场景背景位图。",
  }],
};

test("默认创作资源规划随项目规格持久化，重新读取仍保留候选与生成决策", async () => {
  const { database, repository } = await createRepository();
  const artifactRoot = mkdtempSync(join(tmpdir(), "resource-plan-artifact-"));
  try {
    const input = { title: "资源规划样本", dimensions: "2d" as const, idea: "玩家滑动彩色方块完成合并，在棋盘填满前获得目标分数。", template: "merge-2048" as const, visualStyle: "cute" as const };
    const resourceFamilies = await loadCuratedResourceLibrary(resolve("assets/library/curated"));
    const resourcePlanning = createResourcePlanningForGameSpec(generateGameSpec(input), resourceFamilies);
    const created = await repository.create(input, null, null, null, resourcePlanning);
    const restored = await repository.get(created.id);
    assert.ok(restored?.spec.designContract);
    assert.equal(restored.spec.designContract.projectId, created.id);
    assert.deepEqual(restored.spec.designContract.content.beats.map(({ pressure }) => pressure), ["safe", "normal", "high"]);
    assert.deepEqual(new Set(restored.spec.designContract.acceptance.map(({ kind }) => kind)), new Set(["onboarding", "progression", "assistance", "content-variation"]));
    assert.ok(restored?.spec.resourcePlanning);
    assert.equal(restored.spec.resourcePlanning.summary.total, restored.spec.resourcePlanning.requirements.length);
    assert.ok(restored.spec.resourcePlanning.decisions.some(({ selectedFamilyId }) => selectedFamilyId === "clean-blue-ui-2d"));
    assert.ok(restored.spec.resourcePlanning.decisions.some(({ selectedRecipeId, action }) => selectedRecipeId === "merge-2048-classic-puzzle-slots" && action === "reuse-approved"));
    assert.ok(restored.spec.resourcePlanning.decisions.some(({ action }) => action === "generate-missing-variants"));
    const orchestrator = new BuildOrchestrator(repository, artifactRoot, { coverArt: testCoverArt, browserAudit: false, resourceFamilies });
    await orchestrator.start(created.id);
    assert.equal((await waitForBuild(repository, created.id)).status, "succeeded");
    const built = await repository.get(created.id);
    assert.ok(built);
    const deliveredPlan = JSON.parse(readFileSync(join(artifactRoot, built.version.id, "_studio", "RESOURCE_PLAN.json"), "utf8"));
    const deliveredDesign = JSON.parse(readFileSync(join(artifactRoot, built.version.id, "_studio", "GAME_DESIGN_CONTRACT.json"), "utf8"));
    assert.deepEqual(deliveredDesign, built.spec.designContract);
    assert.equal(deliveredDesign.projectId, built.id);
    assert.equal(deliveredPlan.schemaVersion, "resource-planning-v1");
    assert.equal(deliveredPlan.decisions.length, built.spec.resourcePlanning?.decisions.length);
  } finally {
    rmSync(artifactRoot, { recursive: true, force: true });
    await database.close();
  }
});

test("2048 与打砖块构建会实际覆盖黄金精灵槽位，并把精选资源与 AI 来源分开归档", async () => {
  const { database, repository } = await createRepository();
  const artifactRoot = mkdtempSync(join(tmpdir(), "curated-golden-build-"));
  const conflictingArt = {
    generate: async () => testAiPng,
    generateDynamicArt: async () => [
      { file: "assets/background.png", role: "局内背景", bytes: testAiPng, prompt: "为自动化测试游戏生成一张不含文字的局内场景背景位图。" },
      { file: "assets/sprites/sprite-05.png", role: "角色精灵", bytes: testAiPng, prompt: "为自动化测试生成一个本应被精选资源覆盖的角色精灵位图。" },
    ],
  };
  try {
    const cases = [
      { title: "精选资源 2048", idea: "滑动数字方块合并到目标数字，并提供撤销与提示。", template: "merge-2048" as const, expectedAssets: 7 },
      { title: "精选资源打砖块", idea: "移动挡板反弹小球清除砖块，并提供渐进关卡。", template: "breakout" as const, expectedAssets: 3 },
    ];
    for (const item of cases) {
      const project = await repository.create({ ...item, dimensions: "2d", difficulty: "standard" });
      const orchestrator = new BuildOrchestrator(repository, artifactRoot, { browserAudit: false, coverArt: conflictingArt });
      await orchestrator.start(project.id);
      const build = await waitForBuild(repository, project.id);
      assert.equal(build.status, "succeeded");
      const completed = await repository.get(project.id);
      assert.ok(completed);
      const root = join(artifactRoot, completed.version.id);
      const curated = JSON.parse(readFileSync(join(root, "_studio", "CURATED_RESOURCES.json"), "utf8"));
      const dynamic = JSON.parse(readFileSync(join(root, "_studio", "DYNAMIC_ART.json"), "utf8"));
      assert.equal(curated.template, item.template);
      assert.equal(curated.schemaVersion, "curated-resource-bindings-v2");
      assert.equal(curated.bindings[0].familyId, "classic-puzzle-2d");
      assert.ok(curated.bindings[0].requirementIds.some((id: string) => id.startsWith("ASSET-MECHANIC-")));
      assert.equal(curated.assets.length, item.expectedAssets);
      assert.equal(dynamic.entries.some((entry: { file: string }) => entry.file === "assets/sprites/sprite-05.png"), false);
      const fifth = curated.assets.find((entry: { target: string }) => entry.target === "assets/sprites/sprite-05.png");
      assert.ok(fifth, `${item.template} 必须绑定第五精灵槽位`);
      assert.deepEqual(
        readFileSync(join(root, fifth.target)),
        readFileSync(resolve("assets/library/curated", fifth.familyId, fifth.source)),
      );
      assert.match(build.steps[3]?.output ?? "", /运行时槽位使用 classic-puzzle-2d 精选资源/);
    }
  } finally {
    rmSync(artifactRoot, { recursive: true, force: true });
    await database.close();
  }
});

test("黄金游戏会写入数据库并产生稳定网址与版本网址", async () => {
  const { database, repository } = await createRepository();
  try {
    const projectId = await repository.ensureGoldenFixture();
    const project = await repository.get(projectId);

    assert.ok(project);
    assert.equal(project.status, "published");
    assert.equal(project.fixtureKind, "star-dream-duel");
    assert.equal(project.isOfficial, true);
    assert.equal(project.spec.acceptanceCriteria.length, 17);
    assert.ok(project.spec.acceptanceCriteria.every((item) => item.status === "passed"));
    assert.equal(project.version.qualityStatus, "passed");
    assert.equal(project.version.artReviewStatus, "passed");
    assert.match(project.publication?.stableUrl ?? "", /\/play\/star-dream-duel\/$/);
    assert.match(project.publication?.versionUrl ?? "", /\/version\/.+\/$/);
    assert.match(project.coverUrl ?? "", /\/play\/star-dream-duel\/assets\/cover\.png$/);
    assert.equal(project.publication?.versionId, project.version.id);
    assert.equal(project.publication?.versionNumber, project.version.number);
  } finally {
    await database.close();
  }
});

test("空档接龙固定游戏随星梦对决一起注册为官方游戏并使用自带竖版封面", async () => {
  const { database, repository } = await createRepository();
  try {
    const fixtures = await repository.ensureOfficialFixtures();
    assert.ok(fixtures["star-dream-duel"]);
    assert.ok(fixtures.freecell);
    const project = await repository.get(fixtures.freecell!);
    assert.ok(project);
    assert.equal(project.title, "空档接龙");
    assert.equal(project.fixtureKind, "freecell");
    assert.equal(project.isOfficial, true);
    assert.equal(project.status, "published");
    assert.match(project.publication?.stableUrl ?? "", /\/play\/freecell\/$/);
    assert.match(project.coverUrl ?? "", /\/play\/freecell\/assets\/cover\.png$/);
    assert.ok(project.spec.acceptanceCriteria.some((item) => item.id === "AC-SUPERMOVE" && item.status === "passed"));
    assert.deepEqual(project.spec.inputModes, ["pointer", "drag", "keyboard"]);
    assert.equal((await repository.resolveGameBySlug("freecell"))?.fixture_kind, "freecell");
    const lobby = await repository.publishedGames();
    assert.deepEqual(lobby.map((game) => game.fixtureKind).sort(), officialFixtureGames().map((game) => game.fixtureKind).sort());
    assert.equal(lobby.some((game) => game.fixtureKind === "bug-climb"), false, "已删除的虫虫攀枝不得被重新注册");
    // 重复调用幂等,不会重复插入。
    assert.equal((await repository.ensureOfficialFixtures()).freecell, fixtures.freecell);
    assert.equal(Number((await database.query<{ count: number }>("SELECT COUNT(*) AS count FROM projects WHERE fixture_kind = 'freecell'")).rows[0]?.count), 1);
    assert.equal(Number((await database.query<{ count: number }>("SELECT COUNT(*) AS count FROM builds WHERE project_id = $1", [fixtures.freecell])).rows[0]?.count), 1);
  } finally {
    await database.close();
  }
});

test("游戏大厅只返回已经在线交付的官方游戏", async () => {
  const { database, repository } = await createRepository();
  try {
    const goldenId = await repository.ensureGoldenFixture();
    await repository.create({
      title: "未发布草稿",
      dimensions: "2d",
      idea: "玩家在仓库里收集五个零件，需要在时间结束前返回出口并重新开始。",
    });

    const games = await repository.publishedGames();

    assert.equal(games.length, 1);
    assert.equal(games[0]?.id, goldenId);
    assert.equal(games[0]?.status, "published");
    assert.equal(games[0]?.isOfficial, true);
    assert.equal(games[0]?.publication?.status, "live");
    assert.equal((await repository.list()).some((project) => project.id === goldenId), false);
  } finally {
    await database.close();
  }
});

test("目录边界迁移只把既有在线游戏认作官方，之后的新项目仍归用户", async () => {
  const { database, repository } = await createRepository();
  try {
    const existing = await repository.create({
      title: "迁移前官方游戏",
      dimensions: "2d",
      idea: "玩家在固定棋盘中完成官方挑战，用于验证旧目录迁移与用户项目边界。",
    });
    await database.query("UPDATE projects SET status = 'published' WHERE id = $1", [existing.id]);
    await database.query(
      `INSERT INTO publications (id, project_id, version_id, status, stable_path, version_path, published_at)
       VALUES ($1, $2, $3, 'live', $4, $5, $6)`,
      ["publication-existing", existing.id, existing.version.id, "/play/migrated-official/", "/version/migrated-official/", new Date().toISOString()],
    );

    await repository.initializeCatalogScopes();
    assert.equal((await repository.get(existing.id))?.isOfficial, true);

    const userProject = await repository.create({
      title: "迁移后用户游戏",
      dimensions: "2d",
      idea: "玩家创建自己的收集小游戏，发布后仍应只出现在个人项目列表。",
    });
    await repository.initializeCatalogScopes();

    assert.equal((await repository.get(userProject.id))?.isOfficial, false);
    assert.equal((await repository.list()).some((project) => project.id === userProject.id), true);
    assert.equal((await repository.list()).some((project) => project.id === existing.id), false);
  } finally {
    await database.close();
  }
});

test("新想法会形成持久化合同和不可变初始版本，但不能伪装成可玩版本", async () => {
  const { database, repository } = await createRepository();
  try {
    const project = await repository.create({
      title: "纸城快递",
      dimensions: "2d",
      idea: "玩家驾驶小车在俯视角纸城里按顺序送出三个包裹，需要避开巡逻车辆。",
    });

    assert.equal(project.status, "contract_ready");
    assert.equal(project.version.number, 1);
    assert.equal(project.publication, null);
    await assert.rejects(() => repository.publish(project.id), /还没有可发布的游戏构建/);
    assert.equal((await repository.list()).length, 1);
  } finally {
    await database.close();
  }
});

test("同名项目会获得不同网址标识", async () => {
  const { database, repository } = await createRepository();
  try {
    const input = {
      title: "深海信号",
      dimensions: "2d" as const,
      idea: "玩家驾驶潜艇寻找三个信号源，需要避开水雷并在氧气耗尽前返回基地。",
    };
    const first = await repository.create(input);
    const second = await repository.create(input);

    assert.notEqual(first.slug, second.slug);
    assert.match(first.slug, /^game-[a-f0-9]{8}$/);
    assert.match(second.slug, /^game-[a-f0-9]{8}$/);
  } finally {
    await database.close();
  }
});

test("2D 项目会留下公开步骤、真实文件和可玩不可变版本", async () => {
  const { database, repository } = await createRepository();
  const artifactRoot = mkdtempSync(join(tmpdir(), "studio-build-"));
  try {
    const project = await repository.create({
      title: "雾港信号",
      dimensions: "2d",
      idea: "玩家在俯视角港口中收集八个移动信号，需要在倒计时结束前完成并可以重新开始。",
    });
    const orchestrator = new BuildOrchestrator(repository, artifactRoot, { browserAudit: false, coverArt: testCoverArt });
    const queued = await orchestrator.start(project.id);
    const build = await waitForBuild(repository, project.id);
    const completed = await repository.get(project.id);

    assert.equal(queued.status, "queued");
    assert.equal(build.status, "succeeded");
    assert.equal(build.steps.length, 6);
    assert.ok(build.steps.every((step) => step.status === "succeeded"));
    assert.match(build.steps[4]?.output ?? "", /静态探针通过/);
    assert.equal(completed?.status, "playable");
    assert.equal(completed?.version.number, 2);
    assert.equal(completed?.version.qualityStatus, "passed");
    assert.equal(completed?.version.artReviewStatus, "pending");
    assert.match(completed?.version.qualitySummary ?? "", /项自动验收通过/);
    assert.ok(build.versionId);
    assert.equal(existsSync(join(artifactRoot, build.id, "index.html")), true);
    assert.equal(existsSync(join(artifactRoot, build.id, "_studio", "GAME_DESIGN.md")), true);
    assert.equal(existsSync(join(artifactRoot, build.id, "assets", "cover.png")), true);
    assert.equal(existsSync(join(artifactRoot, build.id, "assets", "arena-background.png")), true);
    assert.equal(existsSync(join(artifactRoot, build.id, "assets", "gameplay-atlas.png")), true);
    assert.equal(existsSync(join(artifactRoot, build.id, "assets", "ambient-loop.wav")), true);
    assert.equal(existsSync(join(artifactRoot, build.id, "assets", "asset-manifest.json")), true);
  } finally {
    await database.close();
    const safeRoot = resolve(artifactRoot);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("重新构建会套用最新玩法合同，同时保留用户已选的风格与画幅", async () => {
  const { database, repository } = await createRepository();
  const artifactRoot = mkdtempSync(join(tmpdir(), "studio-reset-"));
  try {
    const project = await repository.create({
      title: "折光堆叠",
      dimensions: "2d",
      idea: "玩家旋转下落方块消除整行，需要支持触控、暂停和重新开始。",
      template: "tetris",
      artStyle: "geometric",
      visualStyle: "line-art",
      difficulty: "challenging",
      aspectRatio: "4:3",
    });

    await new BuildOrchestrator(repository, artifactRoot, { browserAudit: false, coverArt: testCoverArt }).start(project.id);
    const build = await waitForBuild(repository, project.id);
    const completed = await repository.get(project.id);

    assert.equal(build.status, "succeeded");
    assert.equal(completed?.version.number, 2);
    assert.equal(completed?.spec.template, "tetris");
    assert.equal(completed?.spec.artStyle, "geometric");
    assert.equal(completed?.spec.visualStyle, "line-art");
    assert.equal(completed?.spec.difficulty, "challenging");
    assert.equal(completed?.spec.aspectRatio, "4:3");
    assert.ok(completed?.spec.designContract);
    assert.equal(completed?.spec.designContract.projectId, project.id);
    assert.ok(existsSync(join(artifactRoot, completed!.version.id, "_studio", "GAME_DESIGN_CONTRACT.json")));
    assert.ok(completed?.spec.acceptanceCriteria.some((item) => item.id === "AC-STYLE"));
    assert.ok(completed?.spec.acceptanceCriteria.some((item) => item.id === "AC-ASPECT"));
    assert.ok(completed?.spec.acceptanceCriteria.filter((item) => item.probeType !== "visual").every((item) => item.status === "passed"));
    assert.ok(completed?.spec.acceptanceCriteria.filter((item) => item.probeType === "visual").every((item) => item.status === "pending"));
  } finally {
    await database.close();
    const safeRoot = resolve(artifactRoot);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("发布闸门拒绝未验收版本，并能把稳定网址回滚到历史合格版本", async () => {
  const { database, repository } = await createRepository();
  const artifactRoot = mkdtempSync(join(tmpdir(), "studio-quality-"));
  try {
    const project = await repository.create({
      title: "版本回滚验证",
      dimensions: "2d",
      idea: "玩家在限时内收集光点并返回入口，需要支持键盘、触控和重新开始。",
    });
    const contractVersionId = project.version.id;
    const orchestrator = new BuildOrchestrator(repository, artifactRoot, { browserAudit: false, coverArt: testCoverArt });

    await orchestrator.start(project.id);
    const firstBuild = await waitForBuild(repository, project.id);
    assert.equal(firstBuild.status, "succeeded");
    await assert.rejects(() => repository.publish(project.id, contractVersionId), /还没有完成质量验收/);
    await assert.rejects(() => repository.publish(project.id, firstBuild.versionId ?? ""), /还没有通过主美复核/);

    await repository.reviewVersionArt(project.id, firstBuild.versionId ?? "", { status: "passed", summary: "主美已复核主体、构图、资产一致性与移动画幅。" });
    const firstPublished = await repository.publish(project.id, firstBuild.versionId ?? "");
    assert.equal(firstPublished.publication?.versionId, firstBuild.versionId);
    assert.equal(firstPublished.publication?.versionNumber, 2);

    await orchestrator.start(project.id);
    const secondBuild = await waitForBuild(repository, project.id);
    assert.equal(secondBuild.status, "succeeded");
    assert.notEqual(secondBuild.versionId, firstBuild.versionId);
    assert.equal((await repository.get(project.id))?.status, "published");
    assert.equal((await repository.publishedGames()).some((game) => game.id === project.id), false);
    assert.equal((await repository.list()).some((game) => game.id === project.id), true);
    await repository.reviewVersionArt(project.id, secondBuild.versionId ?? "", { status: "passed", summary: "主美已复核主体、构图、资产一致性与移动画幅。" });
    assert.ok((await repository.get(project.id))?.spec.acceptanceCriteria.filter((item) => item.probeType === "visual").every((item) => item.status === "passed"));
    const secondPublished = await repository.publish(project.id, secondBuild.versionId ?? "");
    assert.equal(secondPublished.publication?.versionNumber, 3);

    const versions = await repository.listVersions(project.id);
    assert.deepEqual(versions.map((version) => version.number), [3, 2, 1]);
    assert.deepEqual(versions.map((version) => version.qualityStatus), ["passed", "passed", "pending"]);
    assert.deepEqual(versions.map((version) => version.artReviewStatus), ["passed", "passed", "pending"]);
    assert.equal(versions[0]?.isPublished, true);

    const rolledBack = await repository.publish(project.id, firstBuild.versionId ?? "");
    assert.equal(rolledBack.publication?.versionId, firstBuild.versionId);
    assert.equal(rolledBack.publication?.versionNumber, 2);
    assert.equal((await repository.listVersions(project.id))[1]?.isPublished, true);
  } finally {
    await database.close();
    const safeRoot = resolve(artifactRoot);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("3D 项目会生成真实 Three.js 场景并通过独立试玩探针", async () => {
  const { database, repository } = await createRepository();
  const artifactRoot = mkdtempSync(join(tmpdir(), "studio-build-"));
  try {
    const project = await repository.create({
      title: "遗迹巡游",
      dimensions: "3d",
      idea: "玩家以第三人称在 3D 遗迹中收集五块碎片，必须在出口关闭前返回。",
    });
    await new BuildOrchestrator(repository, artifactRoot, { browserAudit: false, coverArt: testCoverArt }).start(project.id);
    const build = await waitForBuild(repository, project.id);

    assert.equal(build.status, "succeeded");
    assert.ok(build.steps.every((step) => step.status === "succeeded"));
    assert.match(build.steps[4]?.output ?? "", /静态探针通过/);
    assert.equal((await repository.get(project.id))?.status, "playable");
    assert.equal(existsSync(join(artifactRoot, build.id, "vendor", "three.module.js")), true);
    assert.equal(existsSync(join(artifactRoot, build.id, "assets", "ambient-loop.wav")), true);
    assert.equal(existsSync(join(artifactRoot, build.id, "assets", "gameplay-atlas.png")), true);
    assert.match(readFileSync(join(artifactRoot, build.id, "app.js"), "utf8"), /new THREE\.TextureLoader/);
    assert.match(readFileSync(join(artifactRoot, build.id, "index.html"), "utf8"), /viewport-fit=cover/);
    const styles = readFileSync(join(artifactRoot, build.id, "styles.css"), "utf8");
    assert.match(styles, /\.three-shell\{width:min\(100vw,56\.25svh\);height:min\(100svh,177\.7778vw\);min-height:0;aspect-ratio:9\/16\}/);
    assert.match(styles, /body\[data-game-state=playing\] \.three-back\{display:block\}/);
    assert.match(readFileSync(join(artifactRoot, build.id, "index.html"), "utf8"), /id="back-to-setup"[^>]+返回/);
  } finally {
    await database.close();
    const safeRoot = resolve(artifactRoot);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("3D 项目会按最终玩法模式持久化对应的策划知识与新手教学合同", async () => {
  const { database, repository } = await createRepository();
  try {
    const collector = await repository.create({
      title: "遗迹收集教学",
      dimensions: "3d",
      idea: "玩家以第三人称在 3D 遗迹中收集五块碎片，必须在出口关闭前返回。",
    });
    const arena = await repository.create({
      title: "竞技场射击教学",
      dimensions: "3d",
      idea: "玩家在 3D 竞技场中移动并射击不断出现的敌人，完成三波挑战。",
    });

    assert.equal(collector.spec.threeMode, "collector");
    assert.equal(collector.spec.designKnowledge?.plan.selectedPatternId, "third-person-collection");
    assert.deepEqual(collector.spec.designContract?.onboarding.map(({ successSignal }) => successSignal), ["player-moved"]);
    assert.equal(arena.spec.threeMode, "arena");
    assert.equal(arena.spec.designKnowledge?.plan.selectedPatternId, "wave-shooter");
    assert.deepEqual(arena.spec.designContract?.onboarding.map(({ successSignal }) => successSignal), ["shot-fired"]);

    const restoredArena = await repository.get(arena.id);
    assert.equal(restoredArena?.spec.designKnowledge?.plan.selectedPatternId, "wave-shooter");
    assert.deepEqual(restoredArena?.spec.designContract?.onboarding.map(({ successSignal }) => successSignal), ["shot-fired"]);
  } finally {
    await database.close();
  }
});

test("服务重启会把悬空构建标记为可重试失败，而不是永远显示制作中", async () => {
  const { database, repository } = await createRepository();
  try {
    const project = await repository.create({
      title: "中断恢复",
      dimensions: "2d",
      idea: "玩家收集移动光点并在倒计时结束前完成，失败后可以重新开始挑战。",
    });
    const build = await repository.createBuild(project.id);
    await repository.markBuildRunning(build.id);
    await repository.markStepRunning(build.id, 0);

    await repository.failInterruptedBuilds();
    const recovered = await repository.latestBuild(project.id);

    assert.equal(recovered?.status, "failed");
    assert.equal(recovered?.steps[0]?.status, "failed");
    assert.match(recovered?.error ?? "", /服务重启中断/);
  } finally {
    await database.close();
  }
});

test("创作对话会按项目持久化，并明确不会暗中覆盖当前版本", async () => {
  const { database, repository } = await createRepository();
  try {
    const project = await repository.create({
      title: "对话测试",
      dimensions: "2d",
      idea: "玩家在限时内收集光点并返回入口，需要支持键盘、触控和失败后重新开始。",
    });

    const messages = await repository.addMessage(project.id, { content: "第二局节奏太快，给玩家更多观察时间。" });

    assert.equal(messages.length, 2);
    assert.equal(messages[0]?.role, "user");
    assert.equal(messages[1]?.role, "assistant");
    assert.match(messages[1]?.content ?? "", /难度与节奏/);
    assert.match(messages[1]?.content ?? "", /不会被自动改动/);
    assert.deepEqual(await repository.listMessages(project.id), messages);
  } finally {
    await database.close();
  }
});

test("完成或未完成项目都能归档和恢复，归档项目从常规列表与游戏大厅移出", async () => {
  const { database, repository } = await createRepository();
  const artifactRoot = mkdtempSync(join(tmpdir(), "studio-archive-"));
  try {
    const goldenId = await repository.ensureGoldenFixture();
    assert.ok(goldenId);
    const archived = await repository.archive(goldenId);

    assert.ok(archived.archivedAt);
    assert.equal((await repository.list()).some((project) => project.id === goldenId), false);
    assert.equal((await repository.list({ archived: true })).some((project) => project.id === goldenId), false);
    assert.equal((await repository.publishedGames()).some((project) => project.id === goldenId), false);
    assert.ok(await repository.resolveGameBySlug(archived.slug));

    const restored = await repository.restore(goldenId);
    assert.equal(restored.archivedAt, null);
    assert.equal((await repository.list()).some((project) => project.id === goldenId), false);
    assert.equal((await repository.publishedGames()).some((project) => project.id === goldenId), true);

    await repository.archive(goldenId);
    await new ProjectLifecycle(repository, artifactRoot).deleteArchived(goldenId);
    assert.equal(await repository.get(goldenId), null);
    assert.equal(await repository.ensureGoldenFixture(), null);
  } finally {
    await database.close();
    const safeRoot = resolve(artifactRoot);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

function passingQualityReport(): import("../src/shared/contracts").VersionQualityReport {
  return {
    status: "passed",
    summary: "并发测试验收通过。",
    checkedAt: new Date().toISOString(),
    checks: [{ id: "AC-CONCURRENCY", label: "并发探针", status: "passed", evidence: "并发场景下的模拟验收证据。" }],
  };
}

test("同一项目并行调用两次 createBuild 只会产生一条构建记录", async () => {
  const { database, repository } = await createRepository();
  try {
    const project = await repository.create({
      title: "并发构建测试",
      dimensions: "2d",
      idea: "玩家在限时内收集光点并返回入口，需要支持键盘、触控和重新开始。",
    });

    const [first, second] = await Promise.all([
      repository.createBuild(project.id),
      repository.createBuild(project.id),
    ]);

    assert.equal(first.id, second.id);
    const countRow = (await database.query<{ count: string | number }>(
      "SELECT COUNT(*) AS count FROM builds WHERE project_id = $1", [project.id],
    )).rows[0];
    assert.equal(Number(countRow?.count), 1);
  } finally {
    await database.close();
  }
});

test("并行完成两个构建时版本号不会冲突", async () => {
  const { database, repository } = await createRepository();
  try {
    const project = await repository.create({
      title: "并发完成测试",
      dimensions: "2d",
      idea: "玩家驾驶潜艇寻找三个信号源，需要避开水雷并在氧气耗尽前返回基地。",
    });

    const firstBuild = await repository.createBuild(project.id);
    // Fail the first build so createBuild's "already has an active build" guard lets a second
    // build be created for the same project, giving us two independent builds to complete at once.
    await repository.failBuild(firstBuild.id, 0, "为并发测试人为失败第一条构建。");
    const secondBuild = await repository.createBuild(project.id);
    assert.notEqual(secondBuild.id, firstBuild.id);

    const [firstCompleted, secondCompleted] = await Promise.all([
      repository.completeBuild(firstBuild.id, undefined, passingQualityReport()),
      repository.completeBuild(secondBuild.id, undefined, passingQualityReport()),
    ]);
    assert.ok(firstCompleted);
    assert.ok(secondCompleted);
    const recoveredBuild = await repository.buildById(firstBuild.id);
    assert.equal(recoveredBuild.status, "succeeded");
    assert.equal(recoveredBuild.error, null, "恢复成功的构建不应继续携带旧失败原因");

    const versions = await repository.listVersions(project.id);
    assert.equal(versions.length, 3);
    const numbers = versions.map((version) => version.number).sort((a, b) => a - b);
    assert.deepEqual(numbers, [1, 2, 3]);
    assert.equal(new Set(numbers).size, 3);
  } finally {
    await database.close();
  }
});

test("两个同名项目并行创建时获得不同的网址标识", async () => {
  const { database, repository } = await createRepository();
  try {
    const input = {
      title: "并发同名项目",
      dimensions: "2d" as const,
      idea: "玩家在俯视角港口中收集八个移动信号，需要在倒计时结束前完成并可以重新开始。",
    };

    const [first, second] = await Promise.all([
      repository.create(input),
      repository.create(input),
    ]);

    assert.notEqual(first.slug, second.slug);
    assert.equal((await repository.list()).length, 2);
  } finally {
    await database.close();
  }
});

test("只有归档项目能永久删除，并同时清理构建记录和生成文件", async () => {
  const { database, repository } = await createRepository();
  const artifactRoot = mkdtempSync(join(tmpdir(), "studio-delete-"));
  try {
    const project = await repository.create({
      title: "待清理草稿",
      dimensions: "2d",
      idea: "玩家收集移动光点并在倒计时结束前返回入口，失败后可以重新开始。",
    });
    const originalSlug = project.slug;
    const originalVersionId = project.version.id;
    await assert.rejects(() => repository.deleteArchived(project.id), /必须先归档/);

    const build = await repository.createBuild(project.id);
    await repository.markBuildRunning(build.id);
    await repository.failInterruptedBuilds();
    const artifactPath = join(artifactRoot, build.id);
    mkdirSync(artifactPath, { recursive: true });
    writeFileSync(join(artifactPath, "index.html"), "temporary", "utf8");
    const checkpointPath = join(artifactRoot, "_image-checkpoints", project.id);
    mkdirSync(checkpointPath, { recursive: true });
    writeFileSync(join(checkpointPath, "receipt.json"), "{}", "utf8");

    await repository.archive(project.id);
    await assert.rejects(() => repository.createBuild(project.id), /归档项目不能/);
    await assert.rejects(() => repository.addMessage(project.id, { content: "继续修改" }), /归档项目不能/);

    const result = await new ProjectLifecycle(repository, artifactRoot).deleteArchived(project.id);
    assert.equal(result.deleted, true);
    assert.equal(result.artifactsDeleted, 2);
    assert.equal(await repository.get(project.id), null);
    assert.equal(existsSync(artifactPath), false);
    assert.equal(existsSync(checkpointPath), false);
    assert.equal(await repository.resolveGameBySlug(originalSlug), undefined);
    assert.equal(await repository.resolveGameByVersion(originalVersionId), undefined);
  } finally {
    await database.close();
    const safeRoot = resolve(artifactRoot);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("构建步骤把视听资源排在代码之前，保证代码生成时位图已存在", async () => {
  const { database, repository } = await createRepository();
  try {
    const created = await repository.create({ idea: "海边捡贝壳装满竹篮，五关数量递增，不会失败。", template: "generated" });
    const build = await repository.createBuild(created.id);
    const titles = build.steps.map(({ title }) => title);
    assert.deepEqual(titles, ["解析玩法合同", "写入制作文档", "生成视听资源", "生成可玩核心", "执行试玩探针", "打包不可变版本"]);
    assert.ok(titles.indexOf("生成视听资源") < titles.indexOf("生成可玩核心"), "图片必须先于代码生成");
  } finally { await database.close(); }
});
