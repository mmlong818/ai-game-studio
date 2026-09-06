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
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    const build = await repository.latestBuild(projectId);
    if (build?.status === "succeeded" || build?.status === "failed") return build;
    await new Promise((resolveWait) => setTimeout(resolveWait, 120));
  }
  throw new Error("等待 3D 设计闭环构建超时。");
}

test("三种 3D 模式的完整构建均归档四项设计验收和深层试玩证据", { skip: !browserQualityAvailable(), timeout: 180_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const artifactRoot = mkdtempSync(join(tmpdir(), "three-design-build-"));
  const fallbackCover = resolve("assets/starter/signal-studio/cover.png");
  const art = {
    generate: async () => readFileSync(fallbackCover),
    generateDynamicArt: async () => [{ file: "assets/background.png", role: "局内背景", bytes: readFileSync(fallbackCover), prompt: "3D 设计闭环测试使用项目内有效 PNG 验证完整构建链路。" }],
  };
  const scenarios = [
    { mode: "collector" as const, idea: "第三人称 3D 收集闯关，经过检查点并到达出口。" },
    { mode: "arena" as const, idea: "3D 小型竞技场射击，完成三波敌人并获得升级。" },
  ];
  try {
    for (const scenario of scenarios) {
      const project = await repository.create({ title: `3D ${scenario.mode} 完整构建`, idea: scenario.idea, dimensions: "3d", aspectRatio: "9:16" });
      assert.equal(project.spec.threeMode, scenario.mode);
      await new BuildOrchestrator(repository, artifactRoot, { browserAudit: true, coverArt: art }).start(project.id);
      const build = await waitForBuild(repository, project.id);
      assert.equal(build.status, "succeeded", build.error ?? `${scenario.mode} 构建失败`);
      const completed = await repository.get(project.id);
      assert.ok(completed);
      const root = join(artifactRoot, completed.version.id);
      for (const file of ["ONBOARDING_QUALITY_REPORT.json", "VARIATION_QUALITY_REPORT.json", "DIFFICULTY_QUALITY_REPORT.json", "ASSISTANCE_QUALITY_REPORT.json", "DESIGN_ACCEPTANCE_REPORT.json", "STAGE_F_3D_REPORT.json"]) {
        assert.equal(existsSync(join(root, "_studio", file)), true, `${scenario.mode} 缺少 ${file}`);
      }
      const stored = (await database.query<{ quality_report_json: string | { checks: Array<{ id: string; status: string }> } }>("SELECT quality_report_json FROM versions WHERE id = $1", [completed.version.id])).rows[0]?.quality_report_json;
      const quality = typeof stored === "string" ? JSON.parse(stored) : stored;
      for (const id of [`ONBOARDING-3D-${scenario.mode.toUpperCase()}`, "CONTENT-VARIATION-REHEARSAL", "PROGRESSION-RUNTIME", "ASSISTANCE-RUNTIME", "DESIGN-ACCEPTANCE"]) {
        assert.ok(quality?.checks.some((check: { id: string; status: string }) => check.id === id && check.status === "passed"), `${scenario.mode} 质量记录缺少 ${id}`);
      }
    }
  } finally {
    rmSync(artifactRoot, { recursive: true, force: true });
    await database.close();
  }
});
