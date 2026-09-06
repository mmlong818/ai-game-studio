import { describe, expect, it } from "vitest";
import { auditAssetRequirementBundle } from "../resource-requirements";
import { POCKET_WORKSHOP_ASSET_REQUIREMENTS, POCKET_WORKSHOP_DESIGN_CONTRACT } from "./pocket-workshop-contract";
import { POCKET_WORKSHOP_LEVELS } from "./pocket-workshop-golden";

describe("掌心工坊设计与资源合同", () => {
  it("合同引用研究证据，覆盖三项核心机制、教学、五章和必要验收", () => {
    expect(POCKET_WORKSHOP_DESIGN_CONTRACT.knowledge.integrationStatus).toBe("prototype-required");
    expect(POCKET_WORKSHOP_DESIGN_CONTRACT.knowledge.evidenceUrls).toHaveLength(3);
    expect(POCKET_WORKSHOP_DESIGN_CONTRACT.mechanics).toHaveLength(3); expect(POCKET_WORKSHOP_DESIGN_CONTRACT.onboarding).toHaveLength(3); expect(POCKET_WORKSHOP_DESIGN_CONTRACT.content.beats).toHaveLength(5);
    expect(POCKET_WORKSHOP_DESIGN_CONTRACT.acceptance.map(({ kind }) => kind)).toEqual(expect.arrayContaining(["onboarding", "rule", "solvability", "progression", "assistance", "viewport", "asset"]));
    expect(POCKET_WORKSHOP_LEVELS).toHaveLength(20);
  });

  it("正式资源未绑定时发布门禁明确失败，不把程序化占位当成成品", () => {
    const project = { resources: [] } as never; const audit = auditAssetRequirementBundle(project, POCKET_WORKSHOP_ASSET_REQUIREMENTS);
    expect(audit.publishReady).toBe(false); expect(audit.gaps.filter(({ code }) => code === "missing-binding").length).toBe(POCKET_WORKSHOP_ASSET_REQUIREMENTS.requirements.length);
    expect(POCKET_WORKSHOP_ASSET_REQUIREMENTS.requirements.map(({ id }) => id)).toEqual(expect.arrayContaining(["ASSET-BACKGROUND", "ASSET-UI-SHELL", "ASSET-AUDIO-FEEDBACK", "ASSET-MECHANIC-FINITE-CONTAINER-PLACEMENT", "ASSET-MECHANIC-ORTHOGONAL-SYNERGY", "ASSET-MECHANIC-DETERMINISTIC-AUTO-RESOLUTION", "ASSET-ONBOARDING-OVERLAY"]));
  });
});

