import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { generateGameSpec, type ProjectDetail } from "../shared/contracts.js";
import { applyQualifiedProjectResources } from "./golden-resource-bindings.js";

const temporaryRoots: string[] = [];
const makeRoot = () => {
  const root = mkdtempSync(join(tmpdir(), "golden-resource-binding-"));
  temporaryRoots.push(root);
  return root;
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function project(template: "merge-2048" | "breakout" | "snake" | "signal-hunt", dimensions: "2d" | "3d" = "2d"): ProjectDetail {
  const idea = dimensions === "3d"
    ? "第三人称 3D 收集闯关，玩家经过检查点并抵达出口完成任务。"
    : "玩家操作游戏中的主要物件完成核心目标，并在达成条件后获得胜利。";
  const spec = generateGameSpec({ title: "绑定测试", idea, template, dimensions });
  return { id: "PROJECT-BINDING-TEST", title: "绑定测试", idea: "验证精选资源绑定。", dimensions, spec } as ProjectDetail;
}

describe("黄金模板精选资源绑定", () => {
  test.each([
    ["merge-2048", 7],
    ["breakout", 3],
  ] as const)("%s 会把清单内资源复制到运行时真实槽位", (template, expectedCount) => {
    const root = makeRoot();
    const libraryRoot = resolve("assets/library/curated");
    const report = applyQualifiedProjectResources(root, project(template), libraryRoot);
    expect(report?.schemaVersion).toBe("curated-resource-bindings-v2");
    expect(report?.bindings[0]?.familyId).toBe("classic-puzzle-2d");
    expect(report?.bindings[0]?.requirementIds.some((id) => id.startsWith("ASSET-MECHANIC-"))).toBe(true);
    expect(report?.assets).toHaveLength(expectedCount);
    for (const asset of report?.assets ?? []) {
      expect(readFileSync(join(root, asset.target))).toEqual(readFileSync(join(libraryRoot, asset.familyId, asset.source)));
      expect(asset.runtimeEvidence.length).toBeGreaterThan(10);
      expect(asset.sha256).toMatch(/^[A-F0-9]{64}$/);
    }
  });

  test("未完成槽位核验的模板不会被隐式套用", () => {
    expect(applyQualifiedProjectResources(makeRoot(), project("snake"))).toBeNull();
  });

  test("3D 收集黄金切片会复制三个经哈希校验的 GLB", () => {
    const root = makeRoot();
    const report = applyQualifiedProjectResources(root, project("signal-hunt", "3d"));
    expect(report).not.toBeNull();
    expect(report!.mode).toBe("collector");
    expect(report!.bindings[0]?.familyId).toBe("low-poly-nature-3d");
    expect(report!.bindings[0]?.requirementIds).toEqual(["ASSET-BACKGROUND"]);
    expect(report!.assets).toHaveLength(3);
    expect(report!.assets.every((asset) => asset.target.endsWith(".glb") && readFileSync(join(root, asset.target)).length === asset.bytes)).toBe(true);
  });
});
