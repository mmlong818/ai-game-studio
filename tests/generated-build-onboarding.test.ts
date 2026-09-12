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

test("generated 单局 demo 的完整编排允许零图片 provider 并交付程序绘制产物", async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const artifactRoot = mkdtempSync(join(tmpdir(), "studio-generated-zero-art-"));
  let imageCalls = 0;
  const codeGenerator = { generate: async () => ({
    html: generatedDesignHtml("unused").replaceAll("./assets/background.png", ""),
    designNotes: "单局程序绘制 demo", rounds: 1,
  }) } as unknown as GameCodeGenerator;
  try {
    const project = await repository.create({ title: "单局圆点", idea: "点击移动圆点，达到目标后结束这一局。", template: "generated", dimensions: "2d", aspectRatio: "1:1" });
    await new BuildOrchestrator(repository, artifactRoot, {
      browserAudit: false,
      codeGenerator,
      coverArt: { generate: async () => { imageCalls++; return png; }, generateDynamicArt: async () => { imageCalls++; return []; } },
    }).start(project.id);
    const build = await waitForBuild(repository, project.id);
    assert.equal(build.status, "succeeded", build.error ?? "零图单局构建失败");
    assert.equal(imageCalls, 0);
    const delivered = join(artifactRoot, build.versionId!);
    assert.equal(existsSync(join(delivered, "assets", "cover.png")), false);
    assert.equal(existsSync(join(delivered, "assets", "background.png")), false);
  } finally {
    await database.close();
    const safeRoot = resolve(artifactRoot); if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

