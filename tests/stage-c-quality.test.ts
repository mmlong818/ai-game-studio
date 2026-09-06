import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  browserQualityAvailable,
  inspectShooterContinuousInput,
  inspectStageCRealtimeInBrowser,
  type StageCRealtimeTemplate,
} from "../src/server/browser-quality";
import { openTestDatabase } from "../src/server/database";
import { writeDesignDocuments, writeGameArtifact } from "../src/server/game-artifact";
import { StudioRepository } from "../src/server/studio-repository";

const stageCGames: Array<[StageCRealtimeTemplate, string, string]> = [
  ["space-shooter", "星环突围验收", "做一个太空射击游戏，规避敌机并完成目标击破数。"],
  ["snake", "青玉长游验收", "做一个青玉花园贪吃蛇，收集朱果并避开障碍。"],
  ["breakout", "漆海碎星验收", "做一个五章二十关的漆艺海面打砖块游戏。"],
];

function digest(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

test("阶段 C 三款实时游戏通过模板专属真实浏览器验收", { skip: !browserQualityAvailable(), timeout: 120_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const root = mkdtempSync(join(tmpdir(), "studio-stage-c-"));
  try {
    for (const [template, title, idea] of stageCGames) {
      const project = await repository.create({ title, idea, template, dimensions: "2d", aspectRatio: "9:16", difficulty: "standard" });
      const artifactRoot = join(root, template);
      writeDesignDocuments(artifactRoot, project);
      writeGameArtifact(artifactRoot, project);
      const result = await inspectStageCRealtimeInBrowser(artifactRoot, template);
      assert.equal(result.template, template);
      assert.ok(result.checks.length >= 5);
      assert.equal(existsSync(join(artifactRoot, "_studio", "STAGE_C_QUALITY_REPORT.json")), true);

      if (template === "snake") {
        const names = ["snake-head", "snake-body-straight", "snake-body-corner", "snake-tail", "snake-food", "snake-obstacle", "snake-eat", "snake-danger", "snake-complete"];
        const paths = names.map((name) => join(artifactRoot, "assets", "stage-c", `${name}-${["snake-head", "snake-body-straight", "snake-tail"].includes(name) ? "v3" : "v2"}.png`));
        paths.forEach((path) => assert.ok(statSync(path).size > 1_000));
        assert.equal(new Set(paths.map(digest)).size, names.length);
      }

      if (template === "breakout") {
        const paths = ["pearl", "coral", "jellyfish", "star", "abyss"].flatMap((chapter) =>
          ["intact", "cracked", "critical"].map((state) => join(artifactRoot, "assets", "stage-c", `brick-${chapter}-${state}-v2.png`)),
        );
        paths.forEach((path) => assert.ok(statSync(path).size > 1_000));
        assert.equal(new Set(paths.map(digest)).size, paths.length);
      }
    }
  } finally {
    await database.close();
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("星环突围长时拖动验收器可真实保持指针捕获", { skip: !browserQualityAvailable(), timeout: 30_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const root = mkdtempSync(join(tmpdir(), "studio-stage-c-shooter-"));
  try {
    const project = await repository.create({
      title: "星环突围长时输入验收",
      idea: "做一个太空射击游戏，按住拖动飞船并持续迎战。",
      template: "space-shooter",
      dimensions: "2d",
      aspectRatio: "9:16",
      difficulty: "standard",
    });
    writeDesignDocuments(root, project);
    writeGameArtifact(root, project);
    const result = await inspectShooterContinuousInput(root, 3_000);
    assert.ok(result.durationMs >= 3_000);
    assert.ok(result.pointerMoves >= 8);
    assert.ok(result.maxPointerGapMs <= 1_500);
    assert.equal(result.finalState, "playing");
    assert.equal(existsSync(join(root, "_studio", "SHOOTER_LONG_RUN_REPORT.json")), true);
  } finally {
    await database.close();
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});
