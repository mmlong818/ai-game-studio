import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { BuildOrchestrator } from "../src/server/build-orchestrator";
import { openTestDatabase } from "../src/server/database";
import { ProjectLifecycle } from "../src/server/project-lifecycle";
import { StudioRepository } from "../src/server/studio-repository";

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

test("黄金游戏会写入数据库并产生稳定网址与版本网址", async () => {
  const { database, repository } = await createRepository();
  try {
    const projectId = await repository.ensureGoldenFixture();
    const project = await repository.get(projectId);

    assert.ok(project);
    assert.equal(project.status, "published");
    assert.equal(project.fixtureKind, "star-dream-duel");
    assert.equal(project.spec.acceptanceCriteria.length, 15);
    assert.ok(project.spec.acceptanceCriteria.every((item) => item.status === "passed"));
    assert.equal(project.version.qualityStatus, "passed");
    assert.equal(project.version.artReviewStatus, "passed");
    assert.match(project.publication?.stableUrl ?? "", /\/play\/star-dream-duel\/$/);
    assert.match(project.publication?.versionUrl ?? "", /\/version\/.+\/$/);
    assert.match(project.coverUrl ?? "", /\/play\/star-dream-duel\/icons\/app-icon-512\.png$/);
    assert.equal(project.publication?.versionId, project.version.id);
    assert.equal(project.publication?.versionNumber, project.version.number);
  } finally {
    await database.close();
  }
});

test("游戏大厅只返回已经在线交付的游戏", async () => {
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
    assert.equal(games[0]?.publication?.status, "live");
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
    const orchestrator = new BuildOrchestrator(repository, artifactRoot, { browserAudit: false });
    const queued = await orchestrator.start(project.id);
    const build = await waitForBuild(repository, project.id);
    const completed = await repository.get(project.id);

    assert.equal(queued.status, "queued");
    assert.equal(build.status, "succeeded");
    assert.equal(build.steps.length, 6);
    assert.ok(build.steps.every((step) => step.status === "succeeded"));
    assert.match(build.steps[4]?.output ?? "", /14\/14 静态探针通过/);
    assert.equal(completed?.status, "playable");
    assert.equal(completed?.version.number, 2);
    assert.equal(completed?.version.qualityStatus, "passed");
    assert.equal(completed?.version.artReviewStatus, "pending");
    assert.match(completed?.version.qualitySummary ?? "", /14\/14/);
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

    await new BuildOrchestrator(repository, artifactRoot, { browserAudit: false }).start(project.id);
    const build = await waitForBuild(repository, project.id);
    const completed = await repository.get(project.id);

    assert.equal(build.status, "succeeded");
    assert.equal(completed?.version.number, 2);
    assert.equal(completed?.spec.template, "tetris");
    assert.equal(completed?.spec.artStyle, "geometric");
    assert.equal(completed?.spec.visualStyle, "line-art");
    assert.equal(completed?.spec.difficulty, "challenging");
    assert.equal(completed?.spec.aspectRatio, "4:3");
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
    const orchestrator = new BuildOrchestrator(repository, artifactRoot, { browserAudit: false });

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
    assert.equal((await repository.publishedGames()).some((game) => game.id === project.id), true);
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
    await new BuildOrchestrator(repository, artifactRoot, { browserAudit: false }).start(project.id);
    const build = await waitForBuild(repository, project.id);

    assert.equal(build.status, "succeeded");
    assert.ok(build.steps.every((step) => step.status === "succeeded"));
    assert.match(build.steps[4]?.output ?? "", /18\/18 静态探针通过/);
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
    assert.equal((await repository.list({ archived: true }))[0]?.id, goldenId);
    assert.equal((await repository.publishedGames()).some((project) => project.id === goldenId), false);
    assert.ok(await repository.resolveGameBySlug(archived.slug));

    const restored = await repository.restore(goldenId);
    assert.equal(restored.archivedAt, null);
    assert.equal((await repository.list()).some((project) => project.id === goldenId), true);

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
    await repository.failInterruptedBuilds();
    const artifactPath = join(artifactRoot, build.id);
    mkdirSync(artifactPath, { recursive: true });
    writeFileSync(join(artifactPath, "index.html"), "temporary", "utf8");

    await repository.archive(project.id);
    await assert.rejects(() => repository.createBuild(project.id), /归档项目不能/);
    await assert.rejects(() => repository.addMessage(project.id, { content: "继续修改" }), /归档项目不能/);

    const result = await new ProjectLifecycle(repository, artifactRoot).deleteArchived(project.id);
    assert.equal(result.deleted, true);
    assert.equal(result.artifactsDeleted, 1);
    assert.equal(await repository.get(project.id), null);
    assert.equal(existsSync(artifactPath), false);
    assert.equal(await repository.resolveGameBySlug(originalSlug), undefined);
    assert.equal(await repository.resolveGameByVersion(originalVersionId), undefined);
  } finally {
    await database.close();
    const safeRoot = resolve(artifactRoot);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});
