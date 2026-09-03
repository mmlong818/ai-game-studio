import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyStructuredChangeSet, planNaturalLanguageChange, rollbackStructuredChangeSet } from "./changes";
import { generateGameSpec, type ProjectDetail } from "./contracts";
import { canPromoteMechanic, createProjectMechanic, MECHANIC_MODULE_REGISTRY, migrateMechanicBindings, resolveMechanicModules, validateMechanicBindings } from "./mechanics";
import { installGamePrefab } from "./prefabs";
import { migrateLegacyProjectToV11 } from "./project-schema/migrate-v1";
import { serializeGameProjectV3 } from "./project-schema";
import { createRuleRuntimeState, executeRuleFrame, validateRegisteredRules } from "./rules";
import { evaluateRuntimeSnapshot, validateDraftHotPatch } from "./runtime-inspector";
import { writeV11BuildMetadata } from "../server/v11-build-metadata";
import { compileGameProjectV3 } from "../server/game-compiler";

const projectFor = (template: "tetris" | "merge-2048" | "space-shooter" | "generated", dimensions: "2d" | "3d" = "2d") => {
  const spec = generateGameSpec({
    title: `迁移 ${template}`,
    idea: dimensions === "3d" ? "制作一个固定镜头的三维收集逃脱游戏" : `制作一个 ${template} 单人网页小游戏`,
    template,
    dimensions,
  });
  return migrateLegacyProjectToV11({ id: `PROJECT-${template.toUpperCase()}`, title: spec.title, createdAt: "2026-09-03T00:00:00.000Z", spec });
};

describe("平台 1.1 全阶段能力", () => {
  it("A：动作、棋盘、射击和 3D 四类旧项目迁移到独立 1.1 工程", () => {
    const projects = [
      projectFor("tetris"),
      projectFor("merge-2048"),
      projectFor("space-shooter"),
      projectFor("generated", "3d"),
    ];
    expect(projects.every(({ metadata }) => metadata.platformRelease === "1.1" && metadata.projectFormat === "game-project-v3")).toBe(true);
    expect(projects.every(({ migration }) => migration?.source === "legacy-1.0")).toBe(true);
    expect(projects[0].objects.flatMap(({ behaviors }) => behaviors).some(({ moduleId }) => moduleId === "movement-2d")).toBe(true);
    expect(projects[1].objects.flatMap(({ behaviors }) => behaviors).some(({ moduleId }) => moduleId === "movement-2d")).toBe(false);
    expect(projects[2].objects.flatMap(({ behaviors }) => behaviors).some(({ moduleId }) => moduleId === "spawn-and-pool")).toBe(true);
    expect(projects[3].objects.flatMap(({ behaviors }) => behaviors).some(({ moduleId }) => moduleId === "movement-spatial")).toBe(true);
  });

  it("A：工程保存和重新读取保持稳定，不产生漂移", () => {
    const first = serializeGameProjectV3(projectFor("merge-2048"));
    const second = serializeGameProjectV3(JSON.parse(first));
    expect(second).toBe(first);
  });

  it("A：GameProjectV3 可以直接编译为不依赖远程资源的网页游戏", () => {
    const project = projectFor("tetris");
    const roleResources = [
      { id: "RESOURCE-PLAYER", role: "player" as const, path: "assets/player.png" },
      { id: "RESOURCE-HAZARD", role: "obstacle" as const, path: "assets/hazard.png" },
      { id: "RESOURCE-TARGET", role: "collectible" as const, path: "assets/target.png" },
    ].map((resource, index) => ({ ...resource, mimeType: "image/png", contentHash: `${index + 1}`.repeat(64), provenance: "ai-generated" as const, license: "project-owned" }));
    project.resources = roleResources;
    project.objects.find(({ id }) => id === "OBJECT-PLAYER")!.resourceIds = ["RESOURCE-PLAYER"];
    project.objects.find(({ id }) => id === "OBJECT-HAZARD")!.resourceIds = ["RESOURCE-HAZARD"];
    project.objects.find(({ id }) => id === "OBJECT-TARGET")!.resourceIds = ["RESOURCE-TARGET"];
    const files = compileGameProjectV3(project);
    expect(files["index.html"]).toContain('id="start"');
    expect(files["index.html"]).toContain('id="restart"');
    expect(files["app.js"]).toContain("project.rules");
    expect(files["app.js"]).not.toContain("http://");
    expect(JSON.parse(files["_studio/COMPILE_REPORT.json"]).platformRelease).toBe("1.1");
  });

  it("B：能力自动补齐依赖、检查参数并携带探针", () => {
    const modules = resolveMechanicModules([{ id: "movement-2d", parameters: { speed: 480 } }]);
    expect(modules.map(({ id }) => id)).toEqual(["game-state", "unified-input", "movement-2d"]);
    expect(modules.every(({ probes }) => probes.length > 0)).toBe(true);
    expect(() => resolveMechanicModules([{ id: "movement-2d", parameters: { speed: 9999 } }])).toThrow(/安全范围/);
  });

  it("C：条件动作运行器执行收集规则，结构化修改可以完整回滚", () => {
    const project = projectFor("space-shooter");
    project.rules = [{
      id: "RULE-COLLECT",
      name: "玩家收集目标",
      sceneId: "SCENE-GAME",
      enabled: true,
      priority: "P0",
      when: [{ type: "collision.overlap", parameters: {}, references: [{ kind: "object", id: "OBJECT-PLAYER" }, { kind: "object", id: "OBJECT-TARGET" }] }],
      then: [
        { type: "variable.add", parameters: { id: "VARIABLE-SCORE", value: 1 }, references: [] },
        { type: "feedback.emit", parameters: { type: "collect-burst" }, references: [] },
      ],
    }];
    project.acceptance = project.acceptance.map((assertion) => ({ ...assertion, ruleIds: ["RULE-COLLECT"] }));
    expect(validateRegisteredRules(project)).toEqual([]);
    const state = createRuleRuntimeState(project);
    state.gameState = "playing";
    const collected = executeRuleFrame(project, state, { type: "collision", sourceId: "OBJECT-PLAYER", targetId: "OBJECT-TARGET" });
    expect(collected.variables["VARIABLE-SCORE"]).toBe(1);
    expect(collected.feedback[0]?.type).toBe("collect-burst");

    const change = applyStructuredChangeSet(planNaturalLanguageChange(project, "角色太大，速度再快一点"));
    expect(change.after).not.toEqual(change.before);
    const rolledBack = rollbackStructuredChangeSet(change);
    expect(rolledBack.project).toEqual(change.before);
  });

  it("D：预制组件安装后仍通过完整引用校验", () => {
    const project = installGamePrefab(installGamePrefab(projectFor("merge-2048"), "start-flow", "FLOW"), "play-remix", "REMIX");
    expect(project.objects.some(({ id }) => id === "OBJECT-FLOW-start-flow")).toBe(true);
    expect(project.rules.some(({ name }) => name === "改造游戏")).toBe(true);
    expect(validateRegisteredRules(project)).toEqual([]);
  });

  it("E：真实产物写入冻结工程清单、能力清单和安全热更新探针", () => {
    const root = mkdtempSync(join(tmpdir(), "studio-v11-build-"));
    try {
      mkdirSync(join(root, "assets"));
      writeFileSync(join(root, "assets", "background.png"), new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]));
      writeFileSync(join(root, "index.html"), "<!doctype html><html><body data-game-state=\"idle\"></body></html>");
      const spec = generateGameSpec({ title: "1.1 构建样本", idea: "制作一个俄罗斯方块网页游戏", template: "tetris", dimensions: "2d" });
      const detail = { id: "PROJECT-BUILD", title: spec.title, createdAt: "2026-09-03T00:00:00.000Z", spec } as ProjectDetail;
      const gameProject = writeV11BuildMetadata(root, detail);
      const html = readFileSync(join(root, "index.html"), "utf8");
      const build = JSON.parse(readFileSync(join(root, "_studio", "V11_BUILD.json"), "utf8"));
      const change = JSON.parse(readFileSync(join(root, "_studio", "CHANGESET_V11.json"), "utf8"));
      const inspector = readFileSync(join(root, "_studio", "runtime-inspector.js"), "utf8");
      expect(gameProject.resources).toHaveLength(1);
      expect(html).toContain("_studio/runtime-inspector.js");
      expect(build.frozenByDefault).toBe(true);
      expect(build.mechanics.length).toBeGreaterThan(0);
      expect(change.changes[0].kind).toBe("initial-migration");
      expect(inspector).toContain("__FORGE_INSPECTOR__");
    expect(inspector).toContain("当前是冻结构建");
    expect(inspector).toContain("forge:hot-parameter");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("E：运行观测执行帧率、资源、对象预算和冻结检查", () => {
    const project = projectFor("space-shooter");
    const telemetry = { peakActiveObjectCount: 18, objectStats: { created: 4, destroyed: 2 }, inputState: { keys: [], pointer: { x: 0, y: 0, down: false }, touches: 0 }, audioState: { elements: 1, playing: 1, muted: 0 }, memoryBytes: 1024 };
    const checks = evaluateRuntimeSnapshot(project, { gameState: "playing", fps: 58, resourceErrors: [], longFrameCount: 0, activeObjectCount: 18, events: [], frozen: true, ...telemetry });
    expect(checks.every(({ status }) => status === "passed")).toBe(true);
    expect(evaluateRuntimeSnapshot(project, { gameState: "playing", fps: 20, resourceErrors: ["missing.png"], longFrameCount: 4, activeObjectCount: 999, events: [], frozen: false, ...telemetry }).filter(({ status }) => status === "failed")).toHaveLength(4);
    expect(validateDraftHotPatch({ kind: "css-variable", name: "--game-speed", value: "1.1" })).toEqual([]);
    expect(validateDraftHotPatch({ kind: "image-source", selector: "img", value: "https://example.com/a.png" })).toHaveLength(2);
    expect(validateDraftHotPatch({ kind: "runtime-parameter", name: "game-speed", value: 1.5 })).toEqual([]);
    expect(validateDraftHotPatch({ kind: "runtime-parameter", name: "game-speed", value: 9 })).toHaveLength(1);
  });

  it("F：实验能力只有具备四类游戏、自动检查、手机和回滚证据才能晋级", () => {
    const spatial = MECHANIC_MODULE_REGISTRY.get("movement-spatial")!;
    expect(canPromoteMechanic(spatial, { gameCategories: ["action", "board", "shooter"], automatedChecksPassed: true, mobileVerified: true, rollbackVerified: true }).allowed).toBe(false);
    expect(canPromoteMechanic(spatial, { gameCategories: ["action", "board", "shooter", "3d"], automatedChecksPassed: true, mobileVerified: true, rollbackVerified: true })).toEqual({ allowed: true, reasons: [] });
  });

  it("F：能力版本兼容、升级和项目权限受到治理", () => {
    const upgraded = migrateMechanicBindings([{ moduleId: "movement-2d", moduleVersion: "1.0.0", parameters: { speed: 400 } }]);
    expect(upgraded[0]).toMatchObject({ moduleVersion: "1.1.0", parameters: { speed: 400, acceleration: 1600 } });
    expect(validateMechanicBindings(upgraded)).toEqual([]);
    expect(validateMechanicBindings([{ moduleId: "movement-2d", moduleVersion: "2.0.0", parameters: {} }])).toContain("movement-2d 主版本不兼容：2.0.0 → 1.1.0");
    expect(() => createProjectMechanic({ id: "online-cheat", name: "项目能力", experienceGoal: "测试", objectRoles: ["helper"], permissions: ["network"], parameters: {}, probes: [{ id: "probe", label: "检查", kind: "rule" }] })).toThrow(/网络权限/);
  });
});
