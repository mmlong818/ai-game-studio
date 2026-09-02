import { describe, expect, it } from "vitest";
import { sampleAnimation, validateAnimationClip, type AnimationClip } from "./animation";
import { commitHistory, createHistory, redoHistory, undoHistory } from "./history";
import { ImageGenerationQueue } from "./imageQueue";
import { analyzeChangeImpact, invalidateImpactedEvidence } from "./impactAnalysis";
import { createProject } from "./project";
import { Canvas2DSceneAdapter, DOMSceneAdapter, WebGLSceneAdapter, validateSceneAdapterCoverage } from "./sceneAdapters";
import { INITIAL_DRAFT } from "./storage";
import { generateRuntimeFiles } from "./runtimeGenerator";
import { GAME_TEMPLATES } from "./templates";
import { buildGameSpec } from "./gameSpec";
import { validateGameFeel } from "./gameFeel";
import { splitSpriteSheet } from "./spriteSheet";
import { createBuild } from "./quality";
import { attachBuildResult, createChangeSet } from "./project";
import { runtimeAssetPaths } from "./assets";

describe("production capabilities", () => {
  it("只让受变更影响的证据失效", () => {
    const project = createProject({ ...INITIAL_DRAFT, selectedSuggestionIds: ["merge-2048-world"] });
    const rule = project.assertions.find((item) => item.kind === "rule")!;
    const asset = project.assertions.find((item) => item.kind === "asset")!;
    const passed = project.assertions.map((item) => ({ ...item, status: "passed" as const, evidenceIds: [`E-${item.id}`] }));
    const evidence = passed.map((item) => ({
      id: `E-${item.id}`, assertionId: item.id, buildId: "B", kind: "state" as const,
      capturedAt: "2026-09-01", value: "ok", specHash: "s", codeHash: "c", assetManifestHash: "a",
    }));
    const source = { ...project, assertions: passed, evidence };
    const impact = analyzeChangeImpact(source, rule.sourceRuleIds, [], []);
    const result = invalidateImpactedEvidence(passed, evidence, impact);
    expect(result.assertions.find((item) => item.id === rule.id)?.status).toBe("stale");
    expect(result.assertions.find((item) => item.id === asset.id)?.status).toBe("passed");
    expect(result.evidence.some((item) => item.assertionId === asset.id)).toBe(true);
  });

  it("新构建保留未受影响的规则证据，只替换需要重跑的检查", async () => {
    const base = createProject({ ...INITIAL_DRAFT, selectedSuggestionIds: ["merge-2048-world"] });
    const rule = base.assertions.find((item) => item.kind === "rule")!;
    const existingEvidence = {
      id: "E-RULE", assertionId: rule.id, buildId: "OLD", kind: "state" as const,
      capturedAt: "2026-09-01", value: "ok", specHash: "s", codeHash: "c", assetManifestHash: "a",
    };
    const proven = {
      ...base,
      assertions: base.assertions.map((item) => item.id === rule.id ? { ...item, status: "passed" as const, evidenceIds: [existingEvidence.id] } : item),
      evidence: [existingEvidence],
    };
    const changed = createChangeSet(proven, "只换背景图片", [], ["ASSET-BACKGROUND"]);
    const result = await createBuild(changed, "same-code", changed.changeSets.at(-1)!.id);
    const attached = attachBuildResult(changed, changed.changeSets.at(-1)!.id, result);
    expect(attached.assertions.find((item) => item.id === rule.id)?.status).toBe("passed");
    expect(attached.evidence).toContainEqual(existingEvidence);
  });

  it("支持五十步内完整撤销和重做", () => {
    let history = createHistory(0, 50);
    history = commitHistory(history, 1);
    history = commitHistory(history, 2);
    history = undoHistory(history);
    expect(history.present).toBe(1);
    history = redoHistory(history);
    expect(history.present).toBe(2);
    for (let value = 3; value <= 60; value += 1) history = commitHistory(history, value);
    expect(history.past).toHaveLength(50);
  });

  it("DOM、Canvas 2D、WebGL 使用一致的对象排序与交互合同", () => {
    const project = createProject({ ...INITIAL_DRAFT, selectedSuggestionIds: ["merge-2048-world"] });
    const canvas = Canvas2DSceneAdapter.snapshot(project.scene);
    const domNodes = project.scene.map((node) => ({ ...node, renderer: "dom" as const }));
    const webglNodes = project.scene.map((node) => ({ ...node, renderer: "webgl" as const }));
    expect(canvas.drawOrder.at(-1)).toBe("NODE-PLAYER");
    expect(DOMSceneAdapter.snapshot(domNodes).interactiveNodeIds).toContain("NODE-PLAYER");
    expect(WebGLSceneAdapter.snapshot(webglNodes).interactiveNodeIds).toContain("NODE-PLAYER");
    expect(validateSceneAdapterCoverage([...domNodes, ...webglNodes, ...project.scene])).toEqual([]);
  });

  it("时间轴只允许可动部件并能插值关键帧", () => {
    const clip: AnimationClip = {
      id: "walk", label: "行走", durationMs: 400, loop: true, part: "legs",
      keyframes: [
        { at: 0, x: 0, y: 0, rotation: -12, scale: 1 },
        { at: 0.5, x: 0, y: 2, rotation: 12, scale: 1 },
        { at: 1, x: 0, y: 0, rotation: -12, scale: 1 },
      ],
    };
    expect(validateAnimationClip(clip, ["legs"])).toEqual([]);
    expect(sampleAnimation(clip, 100).rotation).toBe(0);
    expect(validateAnimationClip({ ...clip, part: "fixed-body" }, ["legs"])).toContain("fixed-body 不是当前对象的可动部件");
  });

  it("每个成熟模板都生成自己的可操作运行时", () => {
    const scripts = new Set<string>();
    for (const template of GAME_TEMPLATES) {
      const spec = buildGameSpec({ ...INITIAL_DRAFT, creationMode: "template-remix", templateId: template.id, selectedSuggestionIds: [`${template.id}-world`] });
      const runtime = generateRuntimeFiles(spec, { background: "assets/background.png", player: "assets/player.png", collectible: "assets/target.png" });
      expect(runtime["app.js"]).toContain(template.id === "merge-2048" ? "class=\"cell\"" : "runtime-actions");
      expect(runtime["app.js"]).toContain("assets/background.png");
      expect(runtime["styles.css"]).not.toContain("generic-object");
      scripts.add(runtime["app.js"]);
    }
    expect(scripts.size).toBe(GAME_TEMPLATES.length);
  });

  it("两种 3D 黄金模板使用有限 3D 能力与 WebGL 场景节点", () => {
    for (const templateId of ["collect-escape-3d", "arena-3d"]) {
      const project = createProject({ ...INITIAL_DRAFT, templateId, selectedSuggestionIds: [`${templateId}-world`] });
      expect(project.spec.capabilities.dimensions).toBe("limited-3d");
      expect(project.spec.capabilities.perspective).toBe("fixed-camera");
      expect(project.scene.every((node) => node.renderer === "webgl")).toBe(true);
      expect(generateRuntimeFiles(project.spec)["app.js"]).toContain("getContext('webgl'");
    }
  });

  it("图片任务按顺序执行并能取消排队任务", async () => {
    const queue = new ImageGenerationQueue<number>();
    const order: number[] = [];
    queue.enqueue("first", async () => { order.push(1); return 1; });
    queue.enqueue("second", async () => { order.push(2); return 2; });
    expect(queue.cancel("second")).toBe(true);
    await queue.idle();
    expect(order).toEqual([1]);
    expect(queue.get("first")?.status).toBe("completed");
    expect(queue.get("second")?.status).toBe("cancelled");
  });

  it("闪避游戏会拦截过大的玩家、静止背景和缺失安全路线", () => {
    const spec = buildGameSpec({
      ...INITIAL_DRAFT,
      creationMode: "mechanic-composition",
      templateId: null,
      newGameBrief: "控制昆虫高速爬树，收集露珠并躲开树脂后撤离",
      selectedMechanicIds: ["lane-dodge", "collect-escape"],
    });
    const project = createProject({ ...INITIAL_DRAFT, creationMode: "mechanic-composition", templateId: null, newGameBrief: "控制昆虫高速爬树，收集露珠并躲开树脂后撤离", selectedMechanicIds: ["lane-dodge", "collect-escape"] });
    expect(validateGameFeel(spec, project.scene)).toEqual([]);
    const oversized = project.scene.map((node) => node.role === "player" ? { ...node, size: { ...node.size, width: 40 } } : node);
    expect(validateGameFeel(spec, oversized)).toContain("玩家宽度超过安全路线的 28%，无法稳定躲避");
  });

  it("精灵图可以确定性拆成动画帧", () => {
    expect(splitSpriteSheet(1024, 512, 4, 2)).toHaveLength(8);
    expect(splitSpriteSheet(1024, 512, 4, 2)[5]).toEqual({ index: 5, x: 256, y: 256, width: 256, height: 256 });
    expect(() => splitSpriteSheet(1000, 512, 3, 2)).toThrow(/整齐拆分/);
  });

  it("虫虫角色把身体、头部和可动腿建成独立资源绑定点", () => {
    const project = createProject({
      ...INITIAL_DRAFT,
      creationMode: "mechanic-composition",
      templateId: null,
      newGameBrief: "控制昆虫高速爬树，收集露珠并躲开树脂后撤离",
      selectedMechanicIds: ["lane-dodge", "collect-escape"],
    });
    expect(project.scene.find((node) => node.id === "NODE-HEAD")?.collider.kind).toBe("head");
    expect(project.scene.find((node) => node.id === "NODE-LEGS")?.animation.movableParts).toEqual(["legs"]);
    expect(project.scene.find((node) => node.id === "NODE-LEGS")?.parentId).toBe("NODE-PLAYER");
    expect(runtimeAssetPaths(project)).toEqual({});
  });
});
