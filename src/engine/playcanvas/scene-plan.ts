/**
 * 引擎层 · 场景计划：GameProjectV3（场景 / 对象 / 实例 / 行为 / 资源）→ ScenePlan（实体树的纯数据描述）。
 * 浏览器里 runtime/scene-graph.js 只消费 ScenePlan，不再看 GameProjectV3；服务端与测试可以在没有 WebGL 的地方验证映射结果。
 *
 * 映射规则（详见 docs/58-engine-layer.md §4）：
 * - instance.position.x → 世界 X；instance.position.y → 世界 Z（俯视平面）；overrides.elevation → 世界 Y（底面高度，缺省 0）。
 * - size.width → X 方向尺寸；size.height → Z 方向尺寸；overrides.height → Y 方向尺寸（缺省按角色）。
 * - overrides.shape：box | sheet | cone | cylinder | sphere | star | plane（缺省按角色）；overrides.color："#rrggbb"（缺省按角色色板）。
 * - object.renderer 必须是 "webgl"，否则整条实例记入 skipped 并说明原因；interface 角色由 HUD（DOM）负责，也记入 skipped。
 * - object.resourceIds 中的位图资源 → textures（贴纸模式，或 overrides.textureMode="wrap" 包裹）；非位图资源忽略。
 * - parentInstanceId → 父实体；子实例的 position 视为相对父实体的局部坐标。
 * - options.center 为真时把所有顶层实例的包围盒中心（吸附到格）平移到原点；子实例位置保持相对父实体。
 */
import type { GameProjectV3 } from "../../shared/project-schema/index.js";

export type ScenePlanShape = "box" | "sheet" | "cone" | "cylinder" | "sphere" | "star" | "plane";

export type ScenePlanEntity = {
  id: string;
  name: string;
  objectId: string;
  objectName: string;
  role: GameProjectV3["objects"][number]["role"];
  parentId: string | null;
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  yaw: number;
  layer: number;
  visible: boolean;
  shape: ScenePlanShape;
  color: number;
  emissive: number;
  opacity: number;
  textureMode: "sticker" | "wrap";
  textureTiling: number;
  textures: Array<{ id: string; path: string; mimeType: string }>;
  behaviors: GameProjectV3["objects"][number]["behaviors"];
  overrides: Record<string, unknown>;
};

export type ScenePlan = {
  sceneId: string;
  sceneName: string;
  cellSize: number;
  origin: { x: number; z: number };
  bounds: { min: { x: number; z: number }; max: { x: number; z: number } } | null;
  entities: ScenePlanEntity[];
  skipped: Array<{ instanceId: string; objectId: string; renderer: string; reason: string }>;
  warnings: string[];
};

export const rolePalette: Record<ScenePlanEntity["role"], number> = {
  player: 0xf7efdd,
  hazard: 0xd97f66,
  collectible: 0xf4b93a,
  background: 0x9fb08a,
  effect: 0xffffff,
  interface: 0xffffff,
  helper: 0xc9c9c9,
};

const roleShape: Record<ScenePlanEntity["role"], ScenePlanShape> = { player: "box", hazard: "cone", collectible: "star", background: "box", effect: "plane", interface: "plane", helper: "box" };
const roleHeight: Record<ScenePlanEntity["role"], number> = { player: 0.8, hazard: 0.5, collectible: 0.4, background: 0.3, effect: 0.02, interface: 0.02, helper: 0.3 };

function numberOf(value: unknown, fallback: number) { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function parseColor(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value & 0xffffff;
  if (typeof value === "string") { const hex = value.trim().replace("#", ""); if (/^[0-9a-fA-F]{6}$/.test(hex)) return parseInt(hex, 16); }
  return fallback;
}
const shapes = new Set<ScenePlanShape>(["box", "sheet", "cone", "cylinder", "sphere", "star", "plane"]);

export function buildScenePlan(project: GameProjectV3, options: { sceneId?: string; cellSize?: number; center?: boolean } = {}): ScenePlan {
  const sceneId = options.sceneId ?? project.startSceneId;
  const scene = project.scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) throw new Error(`场景不存在：${sceneId}`);
  const cellSize = options.cellSize ?? 1;
  const objects = new Map(project.objects.map((object) => [object.id, object]));
  const resources = new Map(project.resources.map((resource) => [resource.id, resource]));
  const skipped: ScenePlan["skipped"] = [];
  const warnings: string[] = [];
  const entities: ScenePlanEntity[] = [];
  const skippedIds = new Set<string>();

  for (const instance of scene.instances) {
    const object = objects.get(instance.objectId);
    if (!object) { skipped.push({ instanceId: instance.id, objectId: instance.objectId, renderer: "unknown", reason: "对象不存在" }); skippedIds.add(instance.id); continue; }
    if (object.renderer !== "webgl") { skipped.push({ instanceId: instance.id, objectId: object.id, renderer: object.renderer, reason: `renderer=${object.renderer} 不由 3D 引擎层渲染` }); skippedIds.add(instance.id); continue; }
    if (object.role === "interface") { skipped.push({ instanceId: instance.id, objectId: object.id, renderer: object.renderer, reason: "interface 对象由 HUD（DOM）层负责" }); skippedIds.add(instance.id); continue; }
    const o = instance.overrides;
    const shapeValue = typeof o.shape === "string" && shapes.has(o.shape as ScenePlanShape) ? (o.shape as ScenePlanShape) : roleShape[object.role];
    if (typeof o.shape === "string" && !shapes.has(o.shape as ScenePlanShape)) warnings.push(`${instance.id} 未知形状 ${o.shape}，回退为 ${shapeValue}`);
    const textures = object.resourceIds.map((id) => resources.get(id)).filter((resource): resource is NonNullable<typeof resource> => Boolean(resource && resource.mimeType.startsWith("image/"))).map((resource) => ({ id: resource.id, path: resource.path, mimeType: resource.mimeType }));
    entities.push({
      id: instance.id,
      name: object.name,
      objectId: object.id,
      objectName: object.name,
      role: object.role,
      parentId: instance.parentInstanceId,
      position: { x: instance.position.x * cellSize, y: numberOf(o.elevation, 0), z: instance.position.y * cellSize },
      size: { x: instance.size.width * cellSize, y: numberOf(o.height, roleHeight[object.role]), z: instance.size.height * cellSize },
      yaw: numberOf(o.yaw, 0),
      layer: instance.layer,
      visible: instance.visible,
      shape: shapeValue,
      color: parseColor(o.color, rolePalette[object.role]),
      emissive: numberOf(o.emissive, 0),
      opacity: numberOf(o.opacity, 1),
      textureMode: o.textureMode === "wrap" ? "wrap" : "sticker",
      textureTiling: numberOf(o.textureTiling, 1),
      textures,
      behaviors: object.behaviors.filter((behavior) => behavior.enabled),
      overrides: o,
    });
  }
  // 父实例被跳过时，子实例挂到根并提示。
  entities.forEach((entity) => {
    if (entity.parentId && skippedIds.has(entity.parentId)) { warnings.push(`${entity.id} 的父实例 ${entity.parentId} 未渲染，已挂到场景根`); entity.parentId = null; }
  });
  entities.sort((a, b) => a.layer - b.layer);
  const top = entities.filter((entity) => !entity.parentId);
  const bounds = top.length ? {
    min: { x: Math.min(...top.map((entity) => entity.position.x - entity.size.x / 2)), z: Math.min(...top.map((entity) => entity.position.z - entity.size.z / 2)) },
    max: { x: Math.max(...top.map((entity) => entity.position.x + entity.size.x / 2)), z: Math.max(...top.map((entity) => entity.position.z + entity.size.z / 2)) },
  } : null;
  // 居中：原点取顶层实例包围盒中心并吸附到格（cellSize 的整数倍），保证格心仍落在整数世界坐标上。
  const snap = (value: number) => Math.round(value / cellSize) * cellSize;
  const origin = options.center && bounds ? { x: snap((bounds.min.x + bounds.max.x) / 2), z: snap((bounds.min.z + bounds.max.z) / 2) } : { x: 0, z: 0 };
  if (options.center) top.forEach((entity) => { entity.position.x -= origin.x; entity.position.z -= origin.z; });
  return { sceneId: scene.id, sceneName: scene.name, cellSize, origin, bounds, entities, skipped, warnings };
}

/** 场景计划摘要（写进 _studio/ENGINE_SCENE.json，供验收与 AI 复核）。 */
export function summarizeScenePlan(plan: ScenePlan) {
  const byRole: Record<string, number> = {};
  const byShape: Record<string, number> = {};
  const behaviorIds = new Set<string>();
  plan.entities.forEach((entity) => {
    byRole[entity.role] = (byRole[entity.role] ?? 0) + 1;
    byShape[entity.shape] = (byShape[entity.shape] ?? 0) + 1;
    entity.behaviors.forEach((behavior) => behaviorIds.add(behavior.moduleId));
  });
  return { sceneId: plan.sceneId, entityCount: plan.entities.length, skippedCount: plan.skipped.length, byRole, byShape, behaviorModules: [...behaviorIds].sort(), texturedEntities: plan.entities.filter((entity) => entity.textures.length).length, warnings: plan.warnings };
}
