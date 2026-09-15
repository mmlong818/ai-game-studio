import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { normalizeRepairFailure, readRepairExperiences, recordRepairExperience, repairExperienceScope, repairExperienceSuggestions } from "./repair-experience.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const project = (runtimeTarget = "web-2d") => ({ spec: { template: "custom", runtimeTarget, mechanics: ["用户自定义点击内容", "配对"], designContract: { schemaVersion: "game-design-contract-v1" }, designProfile: { generatedCampaign: { mode: "single", failurePolicy: "optional" }, generatedBlueprint: null } } }) as never;

describe("repair experience", () => {
  it("失败经验只用于避开重复路径，不会晋升为可复用规则", () => {
    const root = mkdtempSync(join(tmpdir(), "repair-experience-")); roots.push(root);
    const failure = normalizeRepairFailure("BROWSER_VALIDATION", "手机视口按钮被遮挡 C:\\private\\artifact\\app.js sk-secret");
    recordRepairExperience(root, { ...failure, scope: repairExperienceScope(project()), outcome: "failed", verification: "rejected" });
    const advice = repairExperienceSuggestions(root, project(), [failure.signature]);
    expect(advice.verified).toHaveLength(0);
    expect(advice.promptReferences.join(" ")).toContain("失败路径提醒");
    expect(JSON.stringify(readRepairExperiences(root))).not.toMatch(/private|secret|按钮被遮挡/);
    expect(JSON.stringify(readRepairExperiences(root))).not.toContain("用户自定义点击内容");
  });

  it("不同运行时或规则范围的经验不会复用", () => {
    const root = mkdtempSync(join(tmpdir(), "repair-experience-")); roots.push(root);
    const failure = normalizeRepairFailure("BROWSER_VALIDATION", "Sprite 只绘制单帧");
    recordRepairExperience(root, { ...failure, scope: repairExperienceScope(project("web-2d")), outcome: "verified", verification: "artifact-and-browser" });
    expect(repairExperienceSuggestions(root, project("web-3d"), [failure.signature]).promptReferences).toEqual([]);
  });

  it("同范围且复验成功的经验会进入下一次修复参考", () => {
    const root = mkdtempSync(join(tmpdir(), "repair-experience-")); roots.push(root);
    const failure = normalizeRepairFailure("BROWSER_VALIDATION", "Sprite 只绘制单帧");
    recordRepairExperience(root, { ...failure, scope: repairExperienceScope(project()), outcome: "verified", verification: "artifact-and-browser" });
    const advice = repairExperienceSuggestions(root, project(), [failure.signature]);
    expect(advice.verified).toHaveLength(1);
    expect(advice.promptReferences[0]).toContain("不可信修复经验参考");
    expect(advice.promptReferences[0]).toContain("Sprite 合同");
  });
});
