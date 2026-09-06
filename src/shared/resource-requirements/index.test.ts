import { describe, expect, it } from "vitest";
import { merge2048DesignSample } from "../game-design-contract/samples";
import type { GameProjectV3 } from "../project-schema";
import { auditAssetRequirementBundle, generateAssetRequirements } from ".";

const project: GameProjectV3 = {
  metadata: { id: "merge-2048", title: "2048", platformRelease: "1.1", projectFormat: "game-project-v3", createdAt: "2026-09-05T00:00:00.000Z", updatedAt: "2026-09-05T00:00:00.000Z" },
  migration: null, startSceneId: "SCENE", scenes: [{ id: "SCENE", name: "游戏", instances: [] }], objects: [], rules: [], variables: [],
  resources: [{ id: "RES-BG", role: "background", path: "assets/bg.webp", mimeType: "image/webp", contentHash: "12345678", provenance: "project-owned", license: "project-owned" }],
  controls: { keyboard: true, pointer: false, touch: true, gamepad: false }, presentation: { aspectRatio: "16:9", targetFps: 60, responsive: true }, acceptance: [],
};

describe("设计驱动资源需求", () => {
  it("从 2048 设计合同生成发布资源、机制状态、教学和反馈需求", () => {
    const bundle = generateAssetRequirements(merge2048DesignSample, { generatedAt: "2026-09-05T00:00:00.000Z" });
    expect(bundle.requirements.map(({ id }) => id)).toEqual(expect.arrayContaining(["ASSET-BACKGROUND", "ASSET-UI-SHELL", "ASSET-AUDIO-FEEDBACK", "ASSET-MECHANIC-MECHANIC-SLIDE", "ASSET-MECHANIC-MECHANIC-MERGE", "ASSET-ONBOARDING-OVERLAY"]));
    expect(bundle.requirements.find(({ id }) => id === "ASSET-UI-SHELL")?.variants).toEqual(expect.arrayContaining(["START", "HINT", "WIN", "LOSE"]));
  });

  it("没有显式绑定时发布门禁失败，不能把现有同角色文件猜作已满足", () => {
    const bundle = generateAssetRequirements(merge2048DesignSample, { generatedAt: "2026-09-05T00:00:00.000Z" });
    const report = auditAssetRequirementBundle(project, bundle);
    expect(report.publishReady).toBe(false);
    expect(report.gaps.filter(({ code }) => code === "missing-binding").length).toBe(bundle.requirements.length);
  });

  it("检查绑定资源存在、媒体类型、状态覆盖和审批状态", () => {
    const bundle = generateAssetRequirements(merge2048DesignSample, { generatedAt: "2026-09-05T00:00:00.000Z" });
    bundle.bindings = [{ requirementId: "ASSET-BACKGROUND", resourceIds: ["RES-BG"], coveredVariants: ["GAMEPLAY"], status: "approved" }];
    const report = auditAssetRequirementBundle(project, bundle);
    expect(report.gaps.some(({ requirementId, code }) => requirementId === "ASSET-BACKGROUND" && code !== "missing-binding")).toBe(false);
    expect(report.gaps.some(({ requirementId, code }) => requirementId === "ASSET-UI-SHELL" && code === "missing-binding")).toBe(true);
  });
});
