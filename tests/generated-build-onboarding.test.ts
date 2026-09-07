import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { BuildOrchestrator } from "../src/server/build-orchestrator";
import { browserQualityAvailable } from "../src/server/browser-quality";
import { openTestDatabase } from "../src/server/database";
import type { GameCodeGenerator } from "../src/server/game-generator";
import { StudioRepository } from "../src/server/studio-repository";
import type { ProjectDetail } from "../src/shared/contracts";
import { generatedDesignHtml } from "./generated-design-fixture";

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(600)]);

async function waitForBuild(repository: StudioRepository, projectId: string) {
  const deadline = Date.now() + 55_000;
  while (Date.now() < deadline) {
    const build = await repository.latestBuild(projectId);
    if (build?.status === "succeeded" || build?.status === "failed") return build;
    await new Promise((resolveWait) => setTimeout(resolveWait, 80));
  }
  throw new Error("等待自由生成构建超时");
}

test("自由生成教学接线失败会把原因反馈给模型并在修正后通过构建", async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const root = mkdtempSync(join(tmpdir(), "studio-generated-build-onboarding-"));
  const feedbacks: string[][] = [];
  let calls = 0;
  const codeGenerator = {
    async generate(project: ProjectDetail, feedback: string[]) {
      calls += 1;
      feedbacks.push([...feedback]);
      const expected = project.spec.designContract?.onboarding[0]?.successSignal;
      assert.ok(expected);
      return { html: generatedDesignHtml(calls === 1 ? "wrong-onboarding-signal" : expected), designNotes: "教学重试测试", rounds: 1 };
    },
  } as unknown as GameCodeGenerator;
  try {
    const project = await repository.create({ title: "雾兽守夜", idea: "守夜人在灯塔上转动光束射击逼近的雾兽。", template: "generated", dimensions: "2d" });
    await new BuildOrchestrator(repository, root, {
      browserAudit: false,
      codeGenerator,
      coverArt: { generate: async () => png, generateDynamicArt: async () => [{ file: "assets/background.png", role: "局内背景", bytes: png, prompt: "为灯塔射击小游戏生成一张不含文字、适合交互层叠加的夜雾海面背景位图。" }] },
    }).start(project.id);
    const build = await waitForBuild(repository, project.id);
    assert.equal(build.status, "succeeded", build.error ?? "构建失败");
    assert.equal(calls, 2);
    assert.match(feedbacks[1]?.join(" ") ?? "", /教学 signal 接口接线或合同信号声明/);
  } finally {
    await database.close();
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("自由生成完整构建归档四类设计运行时证据并通过统一设计合同", { timeout: 60_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const artifactRoot = mkdtempSync(join(tmpdir(), "studio-generated-design-build-"));
  const validPng = readFileSync(resolve("assets/starter/signal-studio/cover.png"));
  const codeGenerator = {
    async generate(project: ProjectDetail) {
      const signal = project.spec.designContract?.onboarding[0]?.successSignal;
      assert.ok(signal);
      return { html: generatedDesignHtml(signal), designNotes: "生成式设计闭环测试", rounds: 1 };
    },
  } as unknown as GameCodeGenerator;
  try {
    const project = await repository.create({ title: "灯塔完整设计闭环", idea: "守夜人在灯塔上转动光束射击逼近的雾兽。", template: "generated", dimensions: "2d" });
    await new BuildOrchestrator(repository, artifactRoot, {
      browserAudit: true,
      codeGenerator,
      coverArt: { generate: async () => validPng, generateDynamicArt: async () => [{ file: "assets/background.png", role: "局内背景", bytes: validPng, prompt: "生成式设计闭环测试使用项目内有效 PNG。" }] },
    }).start(project.id);
    const build = await waitForBuild(repository, project.id);
    assert.equal(build.status, "succeeded", build.error ?? "生成式设计闭环构建失败");
    const completed = await repository.get(project.id);
    assert.ok(completed);
    const root = join(artifactRoot, completed.version.id);
    for (const file of ["DIFFICULTY_QUALITY_REPORT.json", "VARIATION_QUALITY_REPORT.json", "ASSISTANCE_QUALITY_REPORT.json", "DESIGN_ACCEPTANCE_REPORT.json"]) {
      assert.equal(existsSync(join(root, "_studio", file)), true, `缺少 ${file}`);
    }
    const report = JSON.parse(readFileSync(join(root, "_studio", "DESIGN_ACCEPTANCE_REPORT.json"), "utf8"));
    assert.equal(report.passed, true);
    const stored = (await database.query<{ quality_report_json: string | { checks: Array<{ id: string; status: string }> } }>("SELECT quality_report_json FROM versions WHERE id = $1", [completed.version.id])).rows[0]?.quality_report_json;
    const quality = typeof stored === "string" ? JSON.parse(stored) : stored;
    for (const id of ["GEN-BROWSER-ONBOARDING", "PROGRESSION-RUNTIME", "CONTENT-VARIATION-REHEARSAL", "ASSISTANCE-RUNTIME", "DESIGN-ACCEPTANCE"]) {
      assert.ok(quality?.checks.some((check: { id: string; status: string }) => check.id === id && check.status === "passed"), `质量记录缺少 ${id}`);
    }
  } finally {
    const safeRoot = resolve(artifactRoot);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
    await database.close();
  }
});

test("自由生成首稿伪造相同运行结构时，浏览器原因会反馈给模型并由第二稿修复", { skip: !browserQualityAvailable(), timeout: 60_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const artifactRoot = mkdtempSync(join(tmpdir(), "studio-generated-runtime-retry-"));
  const validPng = readFileSync(resolve("assets/starter/signal-studio/cover.png"));
  const feedbacks: string[][] = [];
  let calls = 0;
  const codeGenerator = {
    async generate(project: ProjectDetail, feedback: string[]) {
      calls += 1;
      feedbacks.push([...feedback]);
      const signal = project.spec.designContract?.onboarding[0]?.successSignal;
      assert.ok(signal);
      const compliant = generatedDesignHtml(signal);
      const html = calls === 1
        ? compliant.replace("runtimeSignature:currentRules.runtimeSignature", 'runtimeSignature:"伪造不变结构"')
        : compliant;
      return { html, designNotes: calls === 1 ? "首稿只改倍率" : "根据浏览器证据补齐阶段结构", rounds: 1 };
    },
  } as unknown as GameCodeGenerator;
  try {
    const project = await repository.create({ title: "生成玩法动态修复", idea: "守夜人在变化的雾海中射击不同结构的目标。", template: "generated", dimensions: "2d" });
    await new BuildOrchestrator(repository, artifactRoot, {
      browserAudit: true,
      codeGenerator,
      coverArt: { generate: async () => validPng, generateDynamicArt: async () => [{ file: "assets/background.png", role: "局内背景", bytes: validPng, prompt: "为灯塔射击小游戏生成没有文字的夜雾海面背景，保留中央目标与操作界面的清晰空间。" }] },
    }).start(project.id);
    const build = await waitForBuild(repository, project.id);
    assert.equal(build.status, "succeeded", build.error ?? "动态修复构建失败");
    assert.equal(calls, 2);
    assert.match(feedbacks[1]?.join(" ") ?? "", /1\/5\/9\/13\/17.*不同运行结构/);
  } finally {
    const safeRoot = resolve(artifactRoot);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
    await database.close();
  }
});
