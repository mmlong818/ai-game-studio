import { describe, expect, it } from "vitest";
import { createChangeSet, createProject, rollbackChange } from "./project";
import { updateSceneNode } from "./scene";
import { INITIAL_DRAFT } from "./storage";

describe("transactional change rollback", () => {
  it("整组恢复修改前的场景、资源、证据和活动构建", () => {
    const base = {
      ...createProject({ ...INITIAL_DRAFT, selectedSuggestionIds: ["merge-2048-world"] }),
      activeBuildId: "BUILD-HEALTHY",
    };
    let changed = createChangeSet(base, "把玩家尺寸改大", ["NODE-PLAYER"]);
    const changeId = changed.changeSets.at(-1)!.id;
    changed = {
      ...changed,
      scene: updateSceneNode(changed.scene, "NODE-PLAYER", { size: { width: 80, height: 80 } }),
      activeBuildId: "BUILD-BROKEN",
    };
    const rolledBack = rollbackChange(changed, changeId);

    expect(rolledBack.scene).toEqual(base.scene);
    expect(rolledBack.assets).toEqual(base.assets);
    expect(rolledBack.evidence).toEqual(base.evidence);
    expect(rolledBack.activeBuildId).toBe("BUILD-HEALTHY");
    expect(rolledBack.changeSets.at(-1)?.status).toBe("rolled-back");
  });
});
