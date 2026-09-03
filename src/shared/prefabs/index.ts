import { parseGameProjectV3, type GameProjectV3 } from "../project-schema/index.js";

export type GamePrefab = {
  id: string;
  version: "1.1.0";
  name: string;
  purpose: string;
  resourceSlots: string[];
  create: (instancePrefix: string) => {
    objects: GameProjectV3["objects"];
    instances: GameProjectV3["scenes"][number]["instances"];
    rules: GameProjectV3["rules"];
    acceptance: GameProjectV3["acceptance"];
  };
};

const interfacePrefab = (id: string, name: string, purpose: string, controls: Array<{ id: string; label: string; action: string }>): GamePrefab => ({
  id,
  version: "1.1.0",
  name,
  purpose,
  resourceSlots: ["background-raster", "button-raster"],
  create: (prefix) => {
    const objectId = `OBJECT-${prefix}-${id}`;
    const instanceId = `INSTANCE-${prefix}-${id}`;
    const rules = controls.map((control) => ({
      id: `RULE-${prefix}-${control.id}`,
      name: control.label,
      sceneId: "SCENE-GAME",
      enabled: true,
      priority: "P0" as const,
      when: [{ type: "input.received", parameters: { action: control.action }, references: [{ kind: "object" as const, id: objectId }] }],
      then: [
        ...(["start", "pause", "restart"].includes(control.action)
          ? [{ type: "state.set", parameters: { value: control.action === "start" ? "playing" : control.action === "pause" ? "paused" : "idle" }, references: [] }]
          : []),
        { type: "feedback.emit", parameters: { type: control.action }, references: [] },
      ],
    }));
    return {
      objects: [{ id: objectId, name, role: "interface", renderer: "dom", resourceIds: [], behaviors: [] }],
      instances: [{ id: instanceId, objectId, parentInstanceId: null, position: { x: 0, y: 0 }, size: { width: 100, height: 16 }, anchor: { x: 0, y: 0 }, layer: 200, visible: true, overrides: { controls } }],
      rules,
      acceptance: rules.map((rule) => ({ id: `ASSERT-${rule.id}`, label: `${rule.name}可以操作`, kind: "accessibility" as const, ruleIds: [rule.id], behaviorIds: [] })),
    };
  },
});

const worldPrefab = (id: string, name: string, purpose: string, role: "hazard" | "collectible" | "effect", moduleId: string): GamePrefab => ({
  id,
  version: "1.1.0",
  name,
  purpose,
  resourceSlots: [`${role}-raster`],
  create: (prefix) => {
    const objectId = `OBJECT-${prefix}-${id}`;
    const instanceId = `INSTANCE-${prefix}-${id}`;
    const behaviorId = `BEHAVIOR-${prefix}-${id}`;
    return {
      objects: [{ id: objectId, name, role, renderer: "canvas-2d", resourceIds: [], behaviors: [{ id: behaviorId, moduleId, moduleVersion: "1.1.0", enabled: true, parameters: {} }] }],
      instances: [{ id: instanceId, objectId, parentInstanceId: null, position: { x: 50, y: 30 }, size: { width: 12, height: 12 }, anchor: { x: 0.5, y: 0.5 }, layer: role === "effect" ? 80 : 20, visible: true, overrides: {} }],
      rules: [],
      acceptance: [{ id: `ASSERT-${prefix}-${id}`, label: `${name}在桌面和手机画面内正确出现`, kind: "viewport", ruleIds: [], behaviorIds: [behaviorId] }],
    };
  },
});

export const GAME_PREFABS: readonly GamePrefab[] = [
  interfacePrefab("start-flow", "开始与结算", "提供开始、暂停、重开和结算入口", [
    { id: "START", label: "开始游戏", action: "start" },
    { id: "PAUSE", label: "暂停游戏", action: "pause" },
    { id: "RESTART", label: "重新开始", action: "restart" },
  ]),
  interfacePrefab("hud", "游戏状态栏", "展示分数、生命、倒计时与关卡进度", []),
  interfacePrefab("mobile-controls", "移动端控制", "提供不遮挡核心玩法的触控操作", [
    { id: "UP", label: "向上", action: "up" },
    { id: "LEFT", label: "向左", action: "left" },
    { id: "DOWN", label: "向下", action: "down" },
    { id: "RIGHT", label: "向右", action: "right" },
  ]),
  interfacePrefab("play-remix", "边玩边改", "在游戏固定边缘收集一句话意见并返回创作流程", [
    { id: "REMIX", label: "改造游戏", action: "open-remix" },
  ]),
  worldPrefab("collectible-feedback", "收集物与反馈", "提供收集、计分、爆开和销毁插槽", "collectible", "collect-and-destroy"),
  worldPrefab("obstacle-wave", "障碍生成组", "提供障碍生成、安全路线和离屏回收插槽", "hazard", "spawn-and-pool"),
  worldPrefab("feedback-layer", "视听反馈层", "承载粒子、震动和结果音效", "effect", "sensory-feedback"),
] as const;

export const GAME_PREFAB_REGISTRY = new Map(GAME_PREFABS.map((prefab) => [prefab.id, prefab]));

export function installGamePrefab(project: GameProjectV3, prefabId: string, prefix = "DEFAULT"): GameProjectV3 {
  const prefab = GAME_PREFAB_REGISTRY.get(prefabId);
  if (!prefab) throw new Error(`预制组件不存在：${prefabId}`);
  const addition = prefab.create(prefix);
  const next = structuredClone(project);
  next.objects.push(...addition.objects);
  const scene = next.scenes.find(({ id }) => id === next.startSceneId);
  if (!scene) throw new Error("开始场景不存在，无法安装预制组件");
  scene.instances.push(...addition.instances);
  next.rules.push(...addition.rules);
  next.acceptance.push(...addition.acceptance);
  next.metadata.updatedAt = new Date().toISOString();
  return parseGameProjectV3(next);
}
