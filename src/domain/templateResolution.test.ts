import { describe, expect, it } from "vitest";
import { gameTemplateSchema } from "../shared/contracts";
import { buildGameSpec } from "./gameSpec";
import { createProbe } from "./probe";
import { INITIAL_DRAFT } from "./storage";
import { GAME_TEMPLATES } from "./templates";
import { DOMAIN_TEMPLATE_ART, FIXTURE_TEMPLATE_TO_DOMAIN, THREE_MODE_TO_DOMAIN, resolveTemplateForGame } from "./templateResolution";

describe("官方游戏默认必须有玩法模板", () => {
  it("每一个服务端游戏模板都能落到一个玩法模板", () => {
    for (const serverTemplate of gameTemplateSchema.options) {
      if (serverTemplate === "generated") continue;
      const template = resolveTemplateForGame({ template: serverTemplate, idea: "" });
      expect(template, `服务端模板 ${serverTemplate} 没有对应的玩法模板`).toBeDefined();
    }
  });

  it("AI 原创游戏按创意描述落到能力匹配的玩法模板", () => {
    const template = resolveTemplateForGame({
      template: "generated",
      idea: "Q版小瓢虫在巨大树干的三条树纹之间高速攀爬，躲避树瘤、蘑菇和树脂，收集露珠与金色种子并冲向树冠。",
    });
    expect(template?.id).toBe("lane-climb");
  });

  it("固定游戏按自身种类映射：星梦对决→轮换对决三消，空档接龙→四空档接龙", () => {
    expect(resolveTemplateForGame({ template: "signal-hunt", idea: "" })?.id).toBe("turn-duel-match3");
    expect(resolveTemplateForGame({ template: "signal-hunt", idea: "", fixtureKind: "star-dream-duel" })?.id).toBe("turn-duel-match3");
    expect(resolveTemplateForGame({ template: "signal-hunt", idea: "", fixtureKind: "freecell" })?.id).toBe("solitaire-freecell");
    for (const templateId of Object.values(FIXTURE_TEMPLATE_TO_DOMAIN)) {
      expect(GAME_TEMPLATES.some((template) => template.id === templateId), `${templateId} 不是已登记的玩法模板`).toBe(true);
    }
  });

  it("每个玩法模板都有确定性验收场景，并且图标映射只指向存在的模板", () => {
    for (const template of GAME_TEMPLATES) {
      const spec = buildGameSpec({ ...INITIAL_DRAFT, creationMode: "template-remix", templateId: template.id, selectedSuggestionIds: [`${template.id}-world`] });
      expect(() => createProbe(spec), `${template.id} 缺少专属验收探针`).not.toThrow();
    }
    for (const templateId of Object.keys(DOMAIN_TEMPLATE_ART)) {
      expect(GAME_TEMPLATES.some((template) => template.id === templateId), `${templateId} 不是已登记的玩法模板`).toBe(true);
    }
  });

  it("3D 项目按 threeMode 映射：popup→立体书旋转迷宫，且三种模式都指向已登记模板", () => {
    // 纸境处于 development 阶段：不映射、不进入“改一个现有游戏”。
    expect(resolveTemplateForGame({ template: "maze", idea: "", threeMode: "popup" })).toBeUndefined();
    expect(resolveTemplateForGame({ template: "maze", idea: "", threeMode: "arena" })?.id).toBe("arena-3d");
    for (const templateId of Object.values(THREE_MODE_TO_DOMAIN)) {
      expect(GAME_TEMPLATES.some((template) => template.id === templateId), `${templateId} 不是已登记的玩法模板`).toBe(true);
    }
  });
});
