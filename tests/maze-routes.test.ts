import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { inspectStageEInBrowser } from "../src/server/browser-quality";
import { openTestDatabase } from "../src/server/database";
import { writeGameArtifact } from "../src/server/game-artifact";
import { StudioRepository } from "../src/server/studio-repository";

test("苔径迷庭生成环路、岔口和入口到出口的替代路线", { timeout: 30_000 }, async () => {
  const database = await openTestDatabase();
  const root = mkdtempSync(join(tmpdir(), "maze-routes-"));
  try {
    const repository = new StudioRepository(database, "http://127.0.0.1:4312");
    const project = await repository.create({
      title: "迷宫多路线验收",
      idea: "做一个每关有环路、岔口与多条可选路线的苔石迷宫。",
      template: "maze",
      dimensions: "2d",
      aspectRatio: "9:16",
    });
    writeGameArtifact(root, project);
    const result = await inspectStageEInBrowser(root, "maze");
    const initial = result.evidence.initial as {
      loopCount: number;
      junctionCount: number;
      alternativeSegments: number;
      hasMultipleRoutes: boolean;
    };

    assert.ok(initial.loopCount >= 5);
    assert.ok(initial.junctionCount >= 3);
    assert.ok(initial.alternativeSegments >= 3);
    assert.equal(initial.hasMultipleRoutes, true);
    assert.equal(result.completedRuns, 3);
    assert.equal(result.failedRuns, 2);
  } finally {
    await database.close();
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});
