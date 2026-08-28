import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  browserQualityAvailable,
  inspectStageDClassicInBrowser,
  type StageDClassicTemplate,
} from "../src/server/browser-quality";
import { openTestDatabase } from "../src/server/database";
import { writeDesignDocuments, writeGameArtifact } from "../src/server/game-artifact";
import { StudioRepository } from "../src/server/studio-repository";

const games: Array<[StageDClassicTemplate, string, string]> = [
  ["tetris", "折光堆叠阶段 D 验收", "做一个有暂存、下一个、计分和手势操作的二十关俄罗斯方块。"],
  ["merge-2048", "数织矩阵阶段 D 验收", "做一个有撤销、历史最佳和危险提示的二十关 2048。"],
  ["klotski", "朱门华容阶段 D 验收", "做一个有撤销、参考步数和操作回放的二十局华容道。"],
  ["puzzle", "植光拼图阶段 D 验收", "做一个有二十张图、四到五十块、支持点击拖动和键盘的拼图。"],
  ["block-place", "果冻填阵阶段 D 验收", "做一个候选批次保证可解并有危险预警的二十关方块填阵。"],
  ["polyomino-fit", "软糖拼岛阶段 D 验收", "做一个二十种轮廓、提示不自动旋转的多格拼合游戏。"],
];

test("阶段 D 六款经典与拼合游戏通过模板专属真实浏览器验收", { skip: !browserQualityAvailable(), timeout: 90_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const root = mkdtempSync(join(tmpdir(), "studio-stage-d-"));
  try {
    for (const [template, title, idea] of games) {
      const project = await repository.create({ title, idea, template, dimensions: "2d", aspectRatio: "9:16", difficulty: "standard" });
      const artifactRoot = join(root, template);
      writeDesignDocuments(artifactRoot, project);
      writeGameArtifact(artifactRoot, project);
      const result = await inspectStageDClassicInBrowser(artifactRoot, template);
      assert.equal(result.template, template);
      assert.ok(result.checks.length >= 5);
      assert.equal(existsSync(join(artifactRoot, "_studio", "STAGE_D_QUALITY_REPORT.json")), true);
    }
  } finally {
    await database.close();
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});
