import { describe, expect, it } from "vitest";
import { MECHANIC_ATLAS, DESIGN_MODIFIERS } from "./game-design-knowledge/mechanic-atlas";
import {
  blueprintPlanningPrompt,
  blueprintRules,
  blueprintSpriteFiles,
  generatedBlueprintPrompt,
  generatedBlueprintSchema,
  selectBlueprintCandidates,
} from "./generated-blueprint";

const valid = {
  mechanicIds: [MECHANIC_ATLAS[0].id],
  modifierIds: [DESIGN_MODIFIERS[0].id],
  coreDecision: "每次只能带走一枚贝壳，先捡快被浪带走的还是先凑齐同色。",
  tension: "篮子格位有限，错误顺序会让稀有贝壳被浪带走。",
  masterySignal: "熟练玩家先清理临浪区，再回头凑色，用更少步数装满。",
  sprites: [
    { file: "assets/shell-scallop.png", role: "大扇贝", hint: "粉橙扇形贝壳，边缘有清晰放射纹" },
    { file: "assets/basket.png", role: "竹篮", hint: "浅色编织竹篮，正面开口可见内部" },
  ],
};

describe("生成式游戏知识蓝图", () => {
  it("接受取自知识库的机制与修饰器，并给出局内美术清单", () => {
    const plan = generatedBlueprintSchema.parse(valid);
    expect(blueprintSpriteFiles(plan)).toEqual(["assets/shell-scallop.png", "assets/basket.png"]);
    expect(blueprintSpriteFiles(null)).toEqual([]);
  });

  it("接受row-major多动作图集并拒绝越界、重叠和短动作", () => {
    const animation = {
      frameWidth: 128, frameHeight: 96, columns: 4, rows: 3, frameCount: 12,
      anchor: { x: 64, y: 88 },
      clips: [
        { id: "idle", startFrame: 0, frameCount: 4, fps: 6, loop: true },
        { id: "run", startFrame: 4, frameCount: 4, fps: 12, loop: true },
        { id: "hit", startFrame: 8, frameCount: 4, fps: 10, loop: false },
      ],
    } as const;
    const plan = generatedBlueprintSchema.parse({ ...valid, sprites: [{ ...valid.sprites[0], animation }, valid.sprites[1]] });
    expect(plan.sprites[0].animation?.clips).toHaveLength(3);
    expect(() => generatedBlueprintSchema.parse({ ...valid, sprites: [{ ...valid.sprites[0], animation: { ...animation, clips: [{ id: "idle", startFrame: 0, frameCount: 4, fps: 6, loop: true }, { id: "run", startFrame: 3, frameCount: 4, fps: 12, loop: true }] } }, valid.sprites[1]] })).toThrow(/重叠|最后一个动作/);
    expect(() => generatedBlueprintSchema.parse({ ...valid, sprites: [{ ...valid.sprites[0], animation: { ...animation, clips: [{ id: "idle", startFrame: 0, frameCount: 3, fps: 6, loop: true }] } }, valid.sprites[1]] })).toThrow();
  });

  it("机制或修饰器不在知识库中时整份蓝图作废", () => {
    expect(() => generatedBlueprintSchema.parse({ ...valid, mechanicIds: ["click-anything"] })).toThrow(/机制必须取自机制图谱/);
    expect(() => generatedBlueprintSchema.parse({ ...valid, modifierIds: ["vibes"] })).toThrow(/设计修饰器必须取自知识库/);
  });

  it("拒绝重复机制、重复文件名，以及占用平台封面与背景的清单", () => {
    expect(() => generatedBlueprintSchema.parse({ ...valid, mechanicIds: [MECHANIC_ATLAS[0].id, MECHANIC_ATLAS[0].id] })).toThrow(/机制不能重复/);
    expect(() => generatedBlueprintSchema.parse({ ...valid, sprites: [valid.sprites[0], valid.sprites[0]] })).toThrow(/文件名不能重复/);
    expect(() => generatedBlueprintSchema.parse({ ...valid, sprites: [valid.sprites[0], { file: "assets/cover.png", role: "封面", hint: "不该出现在清单里" }] })).toThrow(/封面与局内背景由平台生成/);
  });

  it("要求写清取舍、张力与熟练度，空话无法通过长度门槛", () => {
    expect(() => generatedBlueprintSchema.parse({ ...valid, coreDecision: "点就行" })).toThrow();
    expect(() => generatedBlueprintSchema.parse({ ...valid, sprites: [valid.sprites[0]] })).toThrow();
  });

  it("蓝图规则逐条进入审核，包含机制生产规则与位图接入要求", () => {
    const rules = blueprintRules(generatedBlueprintSchema.parse(valid));
    expect(rules.some(rule => rule.startsWith("玩家取舍:"))).toBe(true);
    expect(rules.some(rule => rule.includes(MECHANIC_ATLAS[0].label))).toBe(true);
    expect(rules.some(rule => rule.includes("assets/shell-scallop.png"))).toBe(true);
    expect(blueprintRules(null)).toEqual([]);
  });

  it("代码提示要求绘制已生成位图并禁止程序化自绘主体", () => {
    const prompt = generatedBlueprintPrompt(generatedBlueprintSchema.parse(valid));
    expect(prompt).toContain("assets/basket.png");
    expect(prompt).toContain("禁止用 canvas 路径");
    expect(generatedBlueprintPrompt(null)).toBe("");
  });

  it("机制候选按创意检索且结果确定，同时保持家族多样", () => {
    const idea = "玩家推动箱子改变空间布局，把它们推到指定位置";
    const first = selectBlueprintCandidates(idea).map(({ id }) => id);
    expect(first).toEqual(selectBlueprintCandidates(idea).map(({ id }) => id));
    expect(first.length).toBe(14);
    expect(new Set(first).size).toBe(first.length);
    expect(selectBlueprintCandidates("").length).toBe(14);
  });

  it("策划提示给出候选菜单与反纯点选要求", () => {
    const prompt = blueprintPlanningPrompt("海边捡贝壳装满竹篮");
    expect(prompt).toContain("mechanic_ids 只能从这些 id 中选 1–3 个");
    expect(prompt).toContain("纯点选玩法不可接受");
    expect(prompt).toContain("difficulty_curve 至少有一条改变决策结构");
    expect(prompt).toContain(DESIGN_MODIFIERS[0].id);
  });
});
