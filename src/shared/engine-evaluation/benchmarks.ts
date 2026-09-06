import { parseGameProjectV3, type GameProjectV3 } from "../project-schema/index.js";
import { PLATFORM_RELEASE, PROJECT_FORMAT_VERSION } from "../platform-version.js";
import type { EngineBenchmarkDefinition } from "./types.js";

const FIXED_AT = "2026-09-05T00:00:00.000Z";

function baseProject(id: string, title: string, renderer: "canvas-2d" | "webgl", kind: "action" | "logic" | "3d") {
  const sceneId = `SCENE-${id}`;
  const playerId = `OBJECT-${id}-PLAYER`;
  const targetId = `OBJECT-${id}-TARGET`;
  const moveBehaviorId = `BEHAVIOR-${id}-MOVE`;
  return parseGameProjectV3({
    metadata: { id: `PROJECT-${id}`, title, platformRelease: PLATFORM_RELEASE, projectFormat: PROJECT_FORMAT_VERSION, createdAt: FIXED_AT, updatedAt: FIXED_AT },
    migration: null,
    startSceneId: sceneId,
    scenes: [{
      id: sceneId,
      name: "固定基准场景",
      instances: [
        { id: `INSTANCE-${id}-PLAYER`, objectId: playerId, parentInstanceId: null, position: { x: 1, y: 1 }, size: { width: 1, height: 1 }, anchor: { x: 0.5, y: 0.5 }, layer: 10, visible: true, overrides: kind === "3d" ? { height: 0.8, color: "#f7efdd" } : {} },
        { id: `INSTANCE-${id}-TARGET`, objectId: targetId, parentInstanceId: null, position: { x: 3, y: 1 }, size: { width: 1, height: 1 }, anchor: { x: 0.5, y: 0.5 }, layer: 5, visible: true, overrides: kind === "3d" ? { shape: "star", emissive: 0.8 } : {} },
      ],
    }],
    objects: [
      {
        id: playerId,
        name: kind === "logic" ? "棋盘光标" : "玩家",
        role: "player" as const,
        renderer,
        resourceIds: [],
        behaviors: [{
          id: moveBehaviorId,
          moduleId: kind === "3d" ? "engine.grid-walker" : kind === "logic" ? "logic.grid-cursor" : "movement.continuous-2d",
          moduleVersion: "1.0.0",
          enabled: true,
          parameters: kind === "3d" ? { stepsPerSecond: 6 } : {},
        }],
      },
      {
        id: targetId,
        name: kind === "action" ? "移动危险物" : kind === "logic" ? "目标格" : "收集物",
        role: kind === "action" ? "hazard" as const : "collectible" as const,
        renderer,
        resourceIds: [],
        behaviors: kind === "3d"
          ? [{ id: `BEHAVIOR-${id}-PICKUP`, moduleId: "engine.pickup", moduleVersion: "1.0.0", enabled: true, parameters: { spinSpeed: 1.2 } }]
          : [],
      },
    ],
    rules: [{
      id: `RULE-${id}-CORE`,
      name: kind === "logic" ? "合法移动更新棋盘" : "接触目标触发核心结果",
      sceneId,
      enabled: true,
      priority: "P0" as const,
      when: [{ type: kind === "logic" ? "input.valid-move" : "collision.overlap", parameters: {}, references: [{ kind: "object" as const, id: playerId }, { kind: "object" as const, id: targetId }] }],
      then: [{ type: kind === "action" ? "state.lose" : "state.win", parameters: {}, references: [] }],
    }],
    variables: kind === "logic"
      ? [{ id: `VARIABLE-${id}-MOVES`, scope: "global" as const, ownerId: null, initialValue: 0, persistent: true }]
      : [],
    resources: [],
    controls: { keyboard: true, pointer: kind === "logic", touch: true, gamepad: false },
    presentation: { aspectRatio: kind === "action" ? "9:16" as const : "16:9" as const, targetFps: 60, responsive: true },
    acceptance: [{ id: `ASSERT-${id}-CORE`, label: "核心循环可完成", kind: "rule" as const, ruleIds: [`RULE-${id}-CORE`], behaviorIds: [moveBehaviorId] }],
  });
}

function buildActionFixture() {
  const project = baseProject("B1", "B1 · 2D 动作短局", "canvas-2d", "action");
  project.rules.push({
    id: "RULE-B1-WAVE",
    name: "按波次生成危险物",
    sceneId: "SCENE-B1",
    enabled: true,
    priority: "P1",
    when: [{ type: "timer.wave", parameters: { intervalMs: 1500 }, references: [] }],
    then: [{ type: "entity.pool-spawn", parameters: { maximum: 40 }, references: [{ kind: "object", id: "OBJECT-B1-TARGET" }] }],
  });
  project.acceptance.push({ id: "ASSERT-B1-RESTART", label: "胜负后可无刷新重开", kind: "rule", ruleIds: ["RULE-B1-CORE"], behaviorIds: [] });
  return parseGameProjectV3(project);
}

function buildLogicFixture() {
  const project = baseProject("B2", "B2 · 2D 逻辑关卡", "canvas-2d", "logic");
  project.rules.push(
    {
      id: "RULE-B2-UNDO",
      name: "撤销恢复确定性状态",
      sceneId: "SCENE-B2",
      enabled: true,
      priority: "P1",
      when: [{ type: "input.undo", parameters: {}, references: [] }],
      then: [{ type: "history.restore", parameters: { steps: 1 }, references: [] }],
    },
    {
      id: "RULE-B2-HINT",
      name: "提示只返回合法下一步",
      sceneId: "SCENE-B2",
      enabled: true,
      priority: "P1",
      when: [{ type: "input.hint", parameters: {}, references: [] }],
      then: [{ type: "solver.suggest", parameters: { deterministic: true }, references: [] }],
    },
  );
  project.acceptance.push({ id: "ASSERT-B2-SOLVABLE", label: "固定种子关卡可解且提示合法", kind: "rule", ruleIds: ["RULE-B2-HINT"], behaviorIds: [] });
  return parseGameProjectV3(project);
}

function buildLimited3dFixture() {
  const project = baseProject("B3", "B3 · 有限 3D 收集机关", "webgl", "3d");
  project.objects.push({
    id: "OBJECT-B3-PLATFORM",
    name: "机关平台",
    role: "background",
    renderer: "webgl",
    resourceIds: [],
    behaviors: [{ id: "BEHAVIOR-B3-FOOTPRINT", moduleId: "engine.grid-footprint", moduleVersion: "1.0.0", enabled: true, parameters: { height: 0.3 } }],
  });
  project.scenes[0].instances.push({ id: "INSTANCE-B3-PLATFORM", objectId: "OBJECT-B3-PLATFORM", parentInstanceId: null, position: { x: 2, y: 1 }, size: { width: 5, height: 3 }, anchor: { x: 0.5, y: 0.5 }, layer: 0, visible: true, overrides: { height: 0.3 } });
  project.rules.push({
    id: "RULE-B3-CHECKPOINT",
    name: "失败后从检查点恢复",
    sceneId: "SCENE-B3",
    enabled: true,
    priority: "P1",
    when: [{ type: "state.failed", parameters: {}, references: [] }],
    then: [{ type: "checkpoint.restore", parameters: {}, references: [{ kind: "instance", id: "INSTANCE-B3-PLAYER" }] }],
  });
  project.acceptance.push({ id: "ASSERT-B3-DEGRADE", label: "低性能档关闭高成本效果但保留玩法", kind: "performance", ruleIds: ["RULE-B3-CORE"], behaviorIds: ["BEHAVIOR-B3-MOVE"] });
  return parseGameProjectV3(project);
}

export const ENGINE_BENCHMARK_FIXTURES: Readonly<Record<"B1" | "B2" | "B3", GameProjectV3>> = Object.freeze({
  B1: buildActionFixture(),
  B2: buildLogicFixture(),
  B3: buildLimited3dFixture(),
});

export const ENGINE_BENCHMARKS: readonly EngineBenchmarkDefinition[] = Object.freeze([
  {
    id: "B1",
    name: "2D 动作短局",
    kind: "2d-action",
    fixtureId: "PROJECT-B1",
    purpose: "验证连续输入、碰撞、对象池、波次、胜负、重开、声音与手机性能",
    requiredCapabilities: ["keyboard-and-touch", "continuous-movement", "collision", "object-pool", "audio", "restart"],
    probeIds: ["b1.input", "b1.collision", "b1.pool-cap", "b1.restart", "b1.mobile-frame"],
  },
  {
    id: "B2",
    name: "2D 逻辑关卡",
    kind: "2d-logic",
    fixtureId: "PROJECT-B2",
    purpose: "验证确定性规则、撤销、提示、可解性、存档、无效输入与可访问状态",
    requiredCapabilities: ["deterministic-rules", "undo", "hint", "solver-probe", "save-state", "accessible-state"],
    probeIds: ["b2.seed-replay", "b2.undo", "b2.hint-valid", "b2.solvable", "b2.invalid-input"],
  },
  {
    id: "B3",
    name: "有限 3D 收集机关",
    kind: "limited-3d",
    fixtureId: "PROJECT-B3",
    purpose: "验证 3D 场景、碰撞、动画状态、检查点、机关、性能降级与 Web 发布",
    requiredCapabilities: ["3d-scene", "gltf", "lighting", "collision", "animation-state", "checkpoint", "performance-tier"],
    probeIds: ["b3.scene-map", "b3.collect", "b3.checkpoint", "b3.performance-tier", "b3.offline-web"],
  },
]);

export function getEngineBenchmark(id: "B1" | "B2" | "B3") {
  const benchmark = ENGINE_BENCHMARKS.find((item) => item.id === id);
  if (!benchmark) throw new Error(`引擎基准不存在：${id}`);
  return { definition: benchmark, project: ENGINE_BENCHMARK_FIXTURES[id] };
}
