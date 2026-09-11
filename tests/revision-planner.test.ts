import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ProjectDetail } from "../src/shared/contracts.js";
import { planProjectRevision, validateRevisionPlan } from "../src/server/revision-planner.js";
import { revisionPlanInstructions, selectedRevisionRequest } from "../src/server/build-orchestrator.js";

function project(): ProjectDetail {
  return {
    id: "c1ffffe1-3928-42df-9f37-985bb84f7bd2",
    version: { id: "version-3" },
    spec: {
      template: "generated",
      designProfile: {
        generatedBlueprint: {
          sprites: [
            { file: "assets/monk-tang.png", role: "唐僧", hint: "僧人" },
            { file: "assets/spirit-green.png", role: "青衣小妖", hint: "女妖" },
            { file: "assets/spirit-red.png", role: "红衣厉妖", hint: "女妖" },
            { file: "assets/prayer-bead.png", role: "护身念珠", hint: "道具" },
          ],
        },
      },
    },
  } as unknown as ProjectDetail;
}

test("泛称角色映射所有人物并与玩法调整组成一个计划", () => {
  const result = planProjectRevision(project(), "角色需要是精灵动图，墨量消耗减半");
  assert.equal(result.status, "ready");
  assert.deepEqual(result.revisionPlan.operations.map((operation) => operation.scope), ["assets", "gameplay"]);
  const assets = result.revisionPlan.operations[0];
  assert.equal(assets.scope, "assets");
  if (assets.scope !== "assets") return;
  assert.deepEqual(assets.targets, [
    { file: "assets/monk-tang.png", label: "唐僧", animation: "sprite-sheet" },
    { file: "assets/spirit-green.png", label: "青衣小妖", animation: "sprite-sheet" },
    { file: "assets/spirit-red.png", label: "红衣厉妖", animation: "sprite-sheet" },
  ]);
  assert.ok(!assets.targets.some((target) => target.file.includes("prayer-bead")));
  assert.equal(assets.content, "角色需要是精灵动图");
  const gameplay = result.revisionPlan.operations[1]!;
  assert.equal(gameplay.content, "墨量消耗减半");
  const gameplayOnly = { ...result.revisionPlan, operations: [gameplay] };
  assert.doesNotMatch(selectedRevisionRequest(gameplayOnly), /精灵|动画/);
  assert.doesNotMatch(revisionPlanInstructions(gameplayOnly).join("\n"), /精灵|动画/);
  const assetsOnly = { ...result.revisionPlan, operations: [assets] };
  assert.doesNotMatch(selectedRevisionRequest(assetsOnly), /墨量|减半/);
  assert.doesNotMatch(revisionPlanInstructions(assetsOnly).join("\n"), /墨量|减半/);
  // Selection is also safe for an older client that retained the original sentence in
  // each operation: cancelling either checkbox cannot leak the other command to codegen.
  const legacyAssetOnly = { ...result.revisionPlan, operations: [{ ...assets, content: result.revisionPlan.content }] };
  assert.doesNotMatch(selectedRevisionRequest(legacyAssetOnly), /墨量|减半/);
  const legacyGameplayOnly = { ...result.revisionPlan, operations: [{ ...gameplay, content: result.revisionPlan.content }] };
  assert.doesNotMatch(revisionPlanInstructions(legacyGameplayOnly).join("\n"), /精灵|动画/);
});

test("不能确定资源时返回候选而不伪造执行项", () => {
  const result = planProjectRevision(project(), "把素材更新一下");
  assert.equal(result.status, "selection-required");
  assert.deepEqual(result.revisionPlan.operations, []);
  assert.ok(result.candidates.some((candidate) => candidate.label === "唐僧"));
});

test("来源静态资源清单会暴露心卡，但不把没有播放器的图片伪装成可动画目标", () => {
  const root = mkdtempSync(join(tmpdir(), "revision-static-asset-"));
  try {
    const tiles = join(root, "assets", "tiles-v2");
    mkdirSync(tiles, { recursive: true });
    writeFileSync(join(tiles, "heart.png"), "fixture");
    writeFileSync(join(tiles, "manifest.json"), JSON.stringify({ assets: [{ filename: "heart.png", role: "match3-tile-heart" }] }));
    const result = planProjectRevision(project(), "心卡改为精灵动图", root);
    assert.equal(result.status, "selection-required");
    assert.deepEqual(result.revisionPlan.operations, []);
    assert.deepEqual(result.candidates.find((candidate) => candidate.file === "assets/tiles-v2/heart.png"), {
      file: "assets/tiles-v2/heart.png", label: "心卡", kind: "other", recommended: false, supportsAnimation: false,
      animationUnavailableReason: "来源运行时将此资源作为单张静态图片显示，未声明图集帧或播放器，不能升级为精灵动图。",
    });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("正式提交绑定来源版本和原文并拒绝任意文件", () => {
  const current = project();
  const result = planProjectRevision(current, "唐僧需要是精灵动图");
  assert.doesNotThrow(() => validateRevisionPlan(current, result.revisionPlan, result.revisionPlan.content));
  assert.throws(() => validateRevisionPlan({ ...current, version: { ...current.version, id: "version-4" } }, result.revisionPlan, result.revisionPlan.content), /版本已经变化/);
  const tampered = structuredClone(result.revisionPlan);
  const asset = tampered.operations.find((operation) => operation.scope === "assets");
  if (asset?.scope === "assets") asset.targets[0]!.file = "../../secret.png";
  assert.throws(() => validateRevisionPlan(current, tampered, tampered.content), /当前游戏没有/);
});
