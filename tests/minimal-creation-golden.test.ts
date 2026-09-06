import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { BuildOrchestrator } from "../src/server/build-orchestrator";
import { browserQualityAvailable } from "../src/server/browser-quality";
import { openTestDatabase } from "../src/server/database";
import { IdeaAnalyzer } from "../src/server/idea-analyzer";
import { OpenAISettings } from "../src/server/openai-settings";
import { loadCuratedResourceLibrary } from "../src/server/resource-library";
import { StudioRepository } from "../src/server/studio-repository";
import { generateGameSpec, projectInputSchema } from "../src/shared/contracts";
import { createDesignKnowledgeShadow } from "../src/shared/game-design-knowledge/shadow";
import { createResourcePlanningForGameSpec } from "../src/shared/resource-planning";

async function waitForBuild(repository: StudioRepository, projectId: string) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const build = await repository.latestBuild(projectId);
    if (build?.status === "succeeded" || build?.status === "failed") return build;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error("等待最小操作黄金样例构建超时。 ");
}

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex").toUpperCase();

test("一句话会生成资源真实补齐、完整教学和递进难度的软糖拼岛", { skip: !browserQualityAvailable() }, async () => {
  const database = await openTestDatabase();
  const families = await loadCuratedResourceLibrary(resolve("assets/library/curated"));
  const repository = new StudioRepository(database, "http://127.0.0.1:4312", null, families);
  const artifactRoot = mkdtempSync(join(tmpdir(), "minimal-creation-golden-"));
  const art = {
    generate: async (project: { spec: { template: string } }) => readFileSync(resolve("assets/templates/packs", project.spec.template, "cover.png")),
    generateDynamicArt: async (project: { spec: { template: string } }) => [{
      file: "assets/background.png",
      role: "局内背景",
      bytes: readFileSync(resolve("assets/templates/packs", project.spec.template, "background.png")),
      prompt: "黄金样例复用项目内有效位图，隔离联网生图波动并验证真实产物链路。",
    }],
  };

  try {
    // 真实最小入口：不传标题、模板、维度、风格、难度或控制方式。
    const input = projectInputSchema.parse({
      idea: "做一个适合手机新手的软糖拼岛小游戏：旋转多格拼块，完整填满岛屿轮廓，关卡逐步变难。",
    });
    const analysis = await new IdeaAnalyzer(new OpenAISettings(null)).analyze(input);
    assert.equal(analysis.source, "heuristic");
    assert.equal(analysis.template, "polyomino-fit");
    assert.equal(analysis.dimensions, "2d");

    const designKnowledge = createDesignKnowledgeShadow(input, analysis, await repository.currentDesignKnowledgeLibrary());
    assert.equal(designKnowledge.agreement, "exact");
    assert.equal(designKnowledge.productionPatternId, "drag-assembly-puzzle");
    assert.deepEqual(new Set(designKnowledge.plan.mechanicIds), new Set(["drag-snap-assembly", "polyomino-placement"]));

    const resourcePlanning = createResourcePlanningForGameSpec(generateGameSpec(input, analysis, null, designKnowledge), families);
    const mechanicDecisions = resourcePlanning.decisions.filter(({ requirementId }) => requirementId.startsWith("ASSET-MECHANIC-"));
    assert.equal(mechanicDecisions.length, 2);
    assert.ok(mechanicDecisions.every(({ action, selectedRecipeId }) => action === "reuse-approved" && selectedRecipeId === "polyomino-fit-classic-puzzle-slots"));

    const project = await repository.create(input, analysis, null, designKnowledge, resourcePlanning);
    assert.equal(project.title, "软糖拼岛");
    assert.equal(project.spec.template, "polyomino-fit");
    assert.equal(project.spec.visualStyle, "cute");
    assert.equal(project.spec.difficulty, "standard");
    assert.equal(project.spec.aspectRatio, "9:16");
    assert.ok(project.spec.inputModes.includes("touch-buttons"));

    const orchestrator = new BuildOrchestrator(repository, artifactRoot, { browserAudit: true, coverArt: art, resourceFamilies: families });
    await orchestrator.start(project.id);
    const build = await waitForBuild(repository, project.id);
    assert.equal(build.status, "succeeded", build.error ?? "软糖拼岛黄金样例构建失败");
    const completed = await repository.get(project.id);
    assert.ok(completed);
    const root = join(artifactRoot, completed.version.id);

    const requiredReports = [
      "GAME_DESIGN_CONTRACT.json", "ONBOARDING_PLAN.json", "RESOURCE_PLAN.json", "CURATED_RESOURCES.json",
      "BROWSER_QUALITY_REPORT.json", "ONBOARDING_QUALITY_REPORT.json", "DIFFICULTY_QUALITY_REPORT.json",
      "ASSISTANCE_QUALITY_REPORT.json", "VARIATION_QUALITY_REPORT.json", "DESIGN_ACCEPTANCE_REPORT.json",
    ];
    for (const file of requiredReports) assert.equal(existsSync(join(root, "_studio", file)), true, `缺少黄金证据 ${file}`);

    const contract = JSON.parse(readFileSync(join(root, "_studio", "GAME_DESIGN_CONTRACT.json"), "utf8"));
    assert.equal(contract.audience.experience, "first-time");
    assert.ok(contract.onboarding.length >= 1);
    const taughtMechanics = new Set(contract.onboarding.map(({ teachesMechanicId }: { teachesMechanicId: string }) => teachesMechanicId));
    assert.ok(contract.mechanics.filter(({ core }: { core: boolean }) => core).every(({ id }: { id: string }) => taughtMechanics.has(id)));
    assert.ok(contract.onboarding.every((step: { safeState: string; dismissal: { automatic: boolean; replayable: boolean; skippable: boolean }; deviceVariants: { touch?: string } }) => step.safeState && step.dismissal.automatic && step.dismissal.replayable && step.dismissal.skippable && step.deviceVariants.touch));
    assert.deepEqual(contract.content.beats.map(({ pressure }: { pressure: string }) => pressure), ["safe", "normal", "high"]);
    assert.equal(contract.assistance.hiddenAdaptation, false);
    assert.deepEqual(new Set(contract.acceptance.map(({ kind }: { kind: string }) => kind)), new Set(["onboarding", "progression", "assistance", "content-variation"]));

    const curated = JSON.parse(readFileSync(join(root, "_studio", "CURATED_RESOURCES.json"), "utf8"));
    assert.equal(curated.bindings.length, 1);
    assert.equal(curated.bindings[0].recipeId, "polyomino-fit-classic-puzzle-slots");
    assert.equal(curated.bindings[0].source.licenseId, "CC0-1.0");
    assert.deepEqual(new Set(curated.bindings[0].requirementIds), new Set(["ASSET-MECHANIC-DRAG-SNAP-ASSEMBLY", "ASSET-MECHANIC-POLYOMINO-PLACEMENT"]));
    assert.equal(curated.assets.length, 6);
    for (const asset of curated.assets as Array<{ target: string; bytes: number; sha256: string }>) {
      const bytes = readFileSync(join(root, asset.target));
      assert.equal(bytes.length, asset.bytes);
      assert.equal(sha256(bytes), asset.sha256);
    }

    const browser = JSON.parse(readFileSync(join(root, "_studio", "BROWSER_QUALITY_REPORT.json"), "utf8"));
    assert.deepEqual(browser.failures, []);
    assert.ok(browser.checks.every(({ status }: { status: string }) => status === "passed"));
    const browserEvidence = browser.checks.map(({ evidence }: { evidence: string }) => evidence).join("\n");
    assert.match(browserEvidence, /精选精灵槽位 .*已全部解码/);
    assert.match(browserEvidence, /已进入画布绘制/);

    const storedQuality = (await database.query<{ quality_report_json: string | { checks: Array<{ id: string; status: string }> } }>("SELECT quality_report_json FROM versions WHERE id = $1", [completed.version.id])).rows[0]?.quality_report_json;
    const quality = typeof storedQuality === "string" ? JSON.parse(storedQuality) : storedQuality;
    for (const id of ["ONBOARDING-POLYOMINO-FIT", "PROGRESSION-RUNTIME", "ASSISTANCE-RUNTIME", "CONTENT-VARIATION-REHEARSAL", "DESIGN-ACCEPTANCE"]) {
      assert.ok(quality?.checks.some((check: { id: string; status: string }) => check.id === id && check.status === "passed"), `${id} 未通过`);
    }
  } finally {
    rmSync(artifactRoot, { recursive: true, force: true });
    await database.close();
  }
});
