import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { BuildOrchestrator } from "../src/server/build-orchestrator";
import { browserQualityAvailable } from "../src/server/browser-quality";
import { openTestDatabase } from "../src/server/database";
import { StudioRepository } from "../src/server/studio-repository";

async function waitForBuild(repository: StudioRepository, projectId: string) {
  const deadline = Date.now() + 75_000;
  while (Date.now() < deadline) {
    const build = await repository.latestBuild(projectId);
    if (build?.status === "succeeded" || build?.status === "failed") return build;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error("等待精选资源浏览器构建超时。 ");
}

test("两个二维黄金切片会在真实浏览器中解码并绘制精选精灵", { skip: !browserQualityAvailable() }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const artifactRoot = mkdtempSync(join(tmpdir(), "golden-resource-browser-"));
  const art = {
    generate: async (project: { spec: { template: string } }) => readFileSync(resolve("assets/templates/packs", project.spec.template, "cover.png")),
    generateDynamicArt: async (project: { spec: { template: string } }) => {
      const bytes = readFileSync(resolve("assets/templates/packs", project.spec.template, "background.png"));
      return [{ file: "assets/background.png", role: "局内背景", bytes, prompt: "浏览器黄金资源验收使用项目内已有的有效位图，验证精灵解码与画布绘制链路。" }];
    },
  };
  try {
    const cases = [
      { title: "浏览器精选 2048", idea: "滑动数字方块合并到目标数字。", template: "merge-2048" as const },
      { title: "浏览器精选打砖块", idea: "移动挡板反弹小球并清除全部砖块。", template: "breakout" as const },
    ];
    for (const item of cases) {
      const project = await repository.create({ ...item, dimensions: "2d" });
      const orchestrator = new BuildOrchestrator(repository, artifactRoot, { browserAudit: true, coverArt: art });
      await orchestrator.start(project.id);
      const build = await waitForBuild(repository, project.id);
      assert.equal(build.status, "succeeded", build.error ?? `${item.template} 浏览器构建失败`);
      const completed = await repository.get(project.id);
      assert.ok(completed);
      const report = JSON.parse(readFileSync(join(artifactRoot, completed.version.id, "_studio", "BROWSER_QUALITY_REPORT.json"), "utf8"));
      assert.deepEqual(report.failures, []);
      assert.ok(report.checks.every((check: { status: string }) => check.status === "passed"));
      assert.match(report.checks[0].evidence, /精选精灵槽位 .*已全部解码/);
      assert.match(report.checks[0].evidence, /已进入画布绘制/);
      assert.equal(existsSync(join(artifactRoot, completed.version.id, "_studio", "DIFFICULTY_QUALITY_REPORT.json")), true);
      assert.equal(existsSync(join(artifactRoot, completed.version.id, "_studio", "ASSISTANCE_QUALITY_REPORT.json")), true);
      assert.equal(existsSync(join(artifactRoot, completed.version.id, "_studio", "VARIATION_QUALITY_REPORT.json")), true);
      assert.equal(existsSync(join(artifactRoot, completed.version.id, "_studio", "DESIGN_ACCEPTANCE_REPORT.json")), true);
      const storedQuality = (await database.query<{ quality_report_json: string | { checks: Array<{ id: string; status: string }> } }>("SELECT quality_report_json FROM versions WHERE id = $1", [completed.version.id])).rows[0]?.quality_report_json;
      const versionQuality = typeof storedQuality === "string" ? JSON.parse(storedQuality) : storedQuality;
      assert.ok(versionQuality?.checks.some((check: { id: string; status: string }) => check.id === "PROGRESSION-RUNTIME" && check.status === "passed"));
      assert.ok(versionQuality?.checks.some((check: { id: string; status: string }) => check.id === "ASSISTANCE-RUNTIME" && check.status === "passed"));
      assert.ok(versionQuality?.checks.some((check: { id: string; status: string }) => check.id === "CONTENT-VARIATION-REHEARSAL" && check.status === "passed"));
      assert.ok(versionQuality?.checks.some((check: { id: string; status: string }) => check.id === "DESIGN-ACCEPTANCE" && check.status === "passed"));
    }
  } finally {
    rmSync(artifactRoot, { recursive: true, force: true });
    await database.close();
  }
});
