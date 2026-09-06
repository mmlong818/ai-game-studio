import { describe, expect, it } from "vitest";
import { buildGameSpec, migrateLegacySpec, validateGameSpec } from "./gameSpec";
import { createReferenceDossier } from "./research";
import { INITIAL_DRAFT } from "./storage";

describe("game spec v2", () => {
  it("为成熟模板生成稳定规则合同和跨设备能力声明", () => {
    const draft = {
      ...INITIAL_DRAFT,
      selectedSuggestionIds: ["merge-2048-world"],
      changeLevel: "R0" as const,
    };
    const first = buildGameSpec(draft);
    const second = buildGameSpec(draft);

    expect(first.projectId).toBe(second.projectId);
    expect(first.rules.map((rule) => rule.id)).toEqual(second.rules.map((rule) => rule.id));
    expect(first.capabilities.inputs).toEqual(["keyboard", "pointer", "touch"]);
    expect(first.assetPolicy.allowSvgGameArt).toBe(false);
    expect(validateGameSpec(first)).toEqual([]);
  });

  it("为新游戏组合生成实验规格并绑定参考档案", () => {
    const brief = "玩家操纵小昆虫在树干上高速闪避并收集露珠";
    const dossier = createReferenceDossier(brief, ["lane-dodge", "collect-charge"]);
    const spec = buildGameSpec({
      ...INITIAL_DRAFT,
      creationMode: "mechanic-composition",
      templateId: null,
      newGameBrief: brief,
      selectedMechanicIds: ["lane-dodge", "collect-charge"],
      changeLevel: "R3",
      referenceDossier: dossier,
    });

    expect(spec.source.templateId).toBeNull();
    expect(spec.source.referenceDossierId).toBe(dossier.id);
    expect(spec.capabilities.perspective).toBe("top-down");
    expect(spec.rules.length).toBeGreaterThan(0);
  });

  it("把旧规格迁移到 v2 且不保留固定 20 关约束", () => {
    const migrated = migrateLegacySpec({
      schemaVersion: "game-spec-v1",
      templateId: "merge-2048",
      request: "增加新的关卡内容",
      levels: 20,
    });

    expect(migrated.schemaVersion).toBe("game-spec-v2");
    expect(migrated.progression.mode).toBe("finite-campaign");
    expect(migrated).not.toHaveProperty("levels");
    expect(validateGameSpec(migrated)).toEqual([]);
  });
});
