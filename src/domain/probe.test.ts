import { describe, expect, it } from "vitest";
import { buildGameSpec } from "./gameSpec";
import { runGameplayAcceptance } from "./gameplayAcceptance";
import { createProbe, LadybugClimbProbe, MergeGridProbe } from "./probe";
import { createBuild } from "./quality";
import { createProject } from "./project";
import { createReferenceDossier } from "./research";
import { INITIAL_DRAFT } from "./storage";
import { withGeneratedAssets } from "../test/projectFixtures";
import { GAME_TEMPLATES } from "./templates";

describe("GameProbe", () => {
  it("用合法滑动验证现有 2048 改造的三条核心规则", async () => {
    const project = await withGeneratedAssets(createProject({
      ...INITIAL_DRAFT,
      selectedSuggestionIds: ["merge-2048-world"],
    }));
    const result = await createBuild(project, "merge-runtime-v1");
    const accepted = runGameplayAcceptance(project, result.build, new MergeGridProbe());

    expect(accepted.errors).toEqual([]);
    expect(accepted.assertions.filter((item) => item.kind === "rule").every((item) => item.status === "passed")).toBe(true);
  });

  it("验证虫虫攀枝的移动、头部拾取、速度、碰撞与安全通路", async () => {
    const brief = "Q 版小昆虫在树干上高速闪避树脂并用头部收集露珠";
    const project = await withGeneratedAssets(createProject({
      ...INITIAL_DRAFT,
      creationMode: "mechanic-composition",
      templateId: null,
      newGameBrief: brief,
      selectedMechanicIds: ["lane-dodge", "collect-escape"],
      changeLevel: "R3",
      referenceDossier: createReferenceDossier(brief, ["lane-dodge", "collect-escape"]),
    }));
    const result = await createBuild(project, "ladybug-runtime-v1");
    const accepted = runGameplayAcceptance(project, result.build, createProbe(project.spec));

    expect(project.spec.rules).toHaveLength(8);
    expect(accepted.errors).toEqual([]);
    expect(accepted.assertions.filter((item) => item.kind === "rule").every((item) => item.status === "passed")).toBe(true);
  });

  it("普通身体触碰露珠不会被算作获取", () => {
    const probe = new LadybugClimbProbe();
    probe.performAction("start");
    const result = probe.performAction("body-touch-dew");

    expect(result.accepted).toBe(false);
    expect(result.state.resources.dew).toBe(0);
    expect(result.state.values.dewVisible).toBe(true);
  });

  it("破坏任一虫虫核心反馈会让玩法验收失败", async () => {
    const brief = "Q 版小昆虫在树干上高速闪避树脂并用头部收集露珠";
    const project = await withGeneratedAssets(createProject({
      ...INITIAL_DRAFT,
      creationMode: "mechanic-composition",
      templateId: null,
      newGameBrief: brief,
      selectedMechanicIds: ["lane-dodge", "collect-escape"],
      changeLevel: "R3",
      referenceDossier: createReferenceDossier(brief, ["lane-dodge", "collect-escape"]),
    }));
    const build = await createBuild(project, "ladybug-runtime-broken");
    const probe = new LadybugClimbProbe();
    const snapshot = probe.snapshot.bind(probe);
    probe.snapshot = () => {
      const state = snapshot();
      return { ...state, events: state.events.filter((event) => event !== "safe-lane-preserved") };
    };
    const result = runGameplayAcceptance(project, build.build, probe);
    expect(result.errors).toContain("生成批次没有安全通路证据");
    expect(result.assertions.filter((item) => item.kind === "rule").some((item) => item.status === "failed")).toBe(true);
  });

  it("根据规格选择专属探针而不是只提供强制胜负", () => {
    const spec = buildGameSpec({
      ...INITIAL_DRAFT,
      selectedSuggestionIds: ["merge-2048-world"],
    });
    const probe = createProbe(spec);

    expect(probe.listActions()).toContain("start");
    expect(probe.listActions()).not.toContain("forceWin");
    expect(probe.listActions()).not.toContain("forceLose");
  });

  it.each([
    ["tile-roguelite", ["只有自由牌可以配对", "牌阵必须可解", "路线和遗物会影响本局"]],
    ["collect-escape-3d", ["角色和相机可控", "碰撞边界清楚", "收集目标后可以抵达出口"]],
  ])("为黄金模板 %s 执行专属正常路径", async (templateId, expectedRules) => {
    const project = await withGeneratedAssets(createProject({
      ...INITIAL_DRAFT,
      templateId,
      selectedSuggestionIds: [`${templateId}-world`],
      changeLevel: "R0",
    }));
    const build = await createBuild(project, `${templateId}-runtime`);
    const accepted = runGameplayAcceptance(project, build.build, createProbe(project.spec));

    expect(project.spec.rules.map((rule) => rule.label)).toEqual(expectedRules);
    expect(accepted.errors).toEqual([]);
    expect(accepted.assertions.filter((item) => item.kind === "rule").every((item) => item.status === "passed")).toBe(true);
  });

  it("所有成熟模板都有自己的确定性验收场景", async () => {
    for (const template of GAME_TEMPLATES) {
      const project = await withGeneratedAssets(createProject({
        ...INITIAL_DRAFT,
        templateId: template.id,
        selectedSuggestionIds: [`${template.id}-world`],
        changeLevel: "R0",
      }));
      const build = await createBuild(project, `${template.id}-runtime`);
      const accepted = runGameplayAcceptance(project, build.build, createProbe(project.spec));
      expect(accepted.errors, template.id).toEqual([]);
      expect(
        accepted.assertions.filter((item) => item.kind === "rule").every((item) => item.status === "passed"),
        template.id,
      ).toBe(true);
    }
  });
});
