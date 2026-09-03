import type { GameSpec } from "../contracts.js";
import { MECHANIC_MODULE_REGISTRY, resolveMechanicModules, type MechanicSelection } from "../mechanics/index.js";
import { PLATFORM_RELEASE, PROJECT_FORMAT_VERSION } from "../platform-version.js";
import { parseGameProjectV3, type GameProjectV3 } from "./index.js";

export type LegacyProjectSource = {
  id: string;
  title: string;
  createdAt: string;
  spec: GameSpec;
};

export type MigratedResource = GameProjectV3["resources"][number];

const movementTemplates = new Set(["tetris", "breakout", "klotski", "maze", "snake", "space-shooter", "generated"]);
const spawningTemplates = new Set(["tetris", "breakout", "snake", "space-shooter", "block-place", "generated"]);

export function mechanicsForLegacySpec(spec: GameSpec): MechanicSelection[] {
  const ids = new Set(["game-state", "unified-input", "collision", "score-and-timer", "sensory-feedback", "local-persistence"]);
  if (spec.runtimeTarget === "web-3d") ids.add("movement-spatial");
  else if (movementTemplates.has(spec.template)) ids.add("movement-2d");
  if (movementTemplates.has(spec.template) || spec.runtimeTarget === "web-3d") ids.add("spatial-boundary");
  if (spawningTemplates.has(spec.template) || spec.runtimeTarget === "web-3d") ids.add("spawn-and-pool");
  if (spec.mechanics.some((entry) => /收集|拾取|collect/i.test(entry))) ids.add("collect-and-destroy");
  return [...ids].map((id) => ({ id }));
}

function roleForResource(resource: MigratedResource): GameProjectV3["objects"][number]["role"] | null {
  if (resource.role === "player") return "player";
  if (resource.role === "obstacle") return "hazard";
  if (resource.role === "collectible") return "collectible";
  if (resource.role === "background") return "background";
  if (resource.role === "interface") return "interface";
  if (resource.role === "effect") return "effect";
  return null;
}

function acceptanceKind(probeType: GameSpec["acceptanceCriteria"][number]["probeType"]): GameProjectV3["acceptance"][number]["kind"] {
  if (probeType === "visual") return "game-feel";
  if (probeType === "performance") return "performance";
  if (probeType === "browser") return "viewport";
  return "rule";
}

export function migrateLegacyProjectToV11(source: LegacyProjectSource, resources: MigratedResource[] = []): GameProjectV3 {
  const migratedAt = new Date().toISOString();
  const modules = resolveMechanicModules(mechanicsForLegacySpec(source.spec));
  const renderer = source.spec.runtimeTarget === "web-3d" ? "webgl" as const : "canvas-2d" as const;
  const resourcesByRole = new Map<GameProjectV3["objects"][number]["role"], string[]>();
  resources.forEach((resource) => {
    const role = roleForResource(resource);
    if (role) resourcesByRole.set(role, [...(resourcesByRole.get(role) ?? []), resource.id]);
  });
  const behavior = (id: string, owner: string) => {
    const definition = MECHANIC_MODULE_REGISTRY.get(id);
    if (!definition) throw new Error(`迁移需要的玩法能力不存在：${id}`);
    return { id: `BEHAVIOR-${owner}-${id.toUpperCase()}`, moduleId: id, moduleVersion: definition.version, enabled: true, parameters: Object.fromEntries(Object.entries(definition.parameters).map(([name, descriptor]) => [name, descriptor.default])) };
  };
  const playerModules = modules.filter((entry) => entry.objectRoles.includes("player")).map(({ id }) => behavior(id, "PLAYER"));
  const helperModules = modules.filter((entry) => entry.objectRoles.includes("helper") || entry.objectRoles.includes("interface")).map(({ id }) => behavior(id, "INTERFACE"));
  const hazardModules = modules.filter((entry) => entry.objectRoles.includes("hazard")).map(({ id }) => behavior(id, "HAZARD"));
  const objects: GameProjectV3["objects"] = [
    { id: "OBJECT-PLAYER", name: "主要操作对象", role: "player", renderer, resourceIds: resourcesByRole.get("player") ?? [], behaviors: playerModules },
    { id: "OBJECT-HAZARD", name: "危险或阻挡对象", role: "hazard", renderer, resourceIds: resourcesByRole.get("hazard") ?? [], behaviors: hazardModules },
    { id: "OBJECT-TARGET", name: "目标或奖励对象", role: "collectible", renderer, resourceIds: resourcesByRole.get("collectible") ?? [], behaviors: modules.some(({ id }) => id === "collect-and-destroy") ? [behavior("collect-and-destroy", "TARGET")] : [] },
    { id: "OBJECT-INTERFACE", name: "游戏界面", role: "interface", renderer: "dom", resourceIds: resourcesByRole.get("interface") ?? [], behaviors: helperModules },
  ];
  if (resourcesByRole.has("background")) objects.push({ id: "OBJECT-BACKGROUND", name: "背景", role: "background", renderer, resourceIds: resourcesByRole.get("background")!, behaviors: [] });
  const instances: GameProjectV3["scenes"][number]["instances"] = objects.map((object, index) => ({
    id: `INSTANCE-${object.id.slice("OBJECT-".length)}`,
    objectId: object.id,
    parentInstanceId: null,
    position: object.role === "interface" ? { x: 0, y: 0 } : { x: 50, y: object.role === "player" ? 72 : 32 },
    size: object.role === "background" ? { width: 100, height: 100 } : object.role === "interface" ? { width: 100, height: 18 } : { width: 14, height: 14 },
    anchor: { x: object.role === "interface" ? 0 : 0.5, y: object.role === "interface" ? 0 : 0.5 },
    layer: object.role === "background" ? 0 : object.role === "interface" ? 100 : 10 + index,
    visible: true,
    overrides: {},
  }));
  const rules: GameProjectV3["rules"] = source.spec.acceptanceCriteria.map((criterion, index) => ({
    id: `RULE-${String(index + 1).padStart(2, "0")}`,
    name: criterion.statement,
    sceneId: "SCENE-GAME",
    enabled: true,
    priority: criterion.priority,
    when: [{ type: "state.is", parameters: { value: "playing" }, references: [{ kind: "object", id: "OBJECT-PLAYER" }] }],
    then: [{ type: "feedback.emit", parameters: { acceptanceId: criterion.id }, references: [] }],
  }));
  return parseGameProjectV3({
    metadata: { id: source.id, title: source.title, platformRelease: PLATFORM_RELEASE, projectFormat: PROJECT_FORMAT_VERSION, createdAt: source.createdAt, updatedAt: migratedAt },
    migration: { source: "legacy-1.0", sourceProjectId: source.id, sourceSpecVersion: source.spec.schemaVersion, migratedAt },
    startSceneId: "SCENE-GAME",
    scenes: [{ id: "SCENE-GAME", name: "游戏场景", instances }],
    objects,
    rules,
    variables: [
      { id: "VARIABLE-SCORE", scope: "global", ownerId: null, initialValue: 0, persistent: true },
      { id: "VARIABLE-GAME-STATE", scope: "global", ownerId: null, initialValue: "idle", persistent: false },
    ],
    resources,
    controls: {
      keyboard: source.spec.inputModes.includes("keyboard"),
      pointer: source.spec.inputModes.some((mode) => mode === "pointer" || mode === "drag" || mode === "swipe"),
      touch: source.spec.inputModes.some((mode) => mode === "touch-buttons" || mode === "virtual-stick" || mode === "drag" || mode === "swipe" || mode === "pointer"),
      gamepad: false,
    },
    presentation: { aspectRatio: source.spec.aspectRatio, targetFps: 60, responsive: true },
    acceptance: [
      ...source.spec.acceptanceCriteria.map((criterion, index) => ({
        id: criterion.id,
        label: criterion.statement,
        kind: acceptanceKind(criterion.probeType),
        ruleIds: [`RULE-${String(index + 1).padStart(2, "0")}`],
        behaviorIds: [],
      })),
      ...modules.flatMap((module) => module.probes.map((probe) => ({
        id: `ASSERT-MECHANIC-${module.id}-${probe.id}`,
        label: probe.label,
        kind: probe.kind,
        ruleIds: [],
        behaviorIds: objects.flatMap(({ behaviors }) => behaviors.filter(({ moduleId }) => moduleId === module.id).map(({ id }) => id)),
      }))),
    ],
  });
}
