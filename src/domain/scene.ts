import type { AssetRole, GameSpecV2, SceneNode } from "./platformTypes";

const makeNode = (
  id: string,
  label: string,
  role: AssetRole,
  layer: number,
  spec: GameSpecV2,
): SceneNode => ({
  id,
  parentId: "SCENE-ROOT",
  label,
  role,
  renderer: spec.capabilities.dimensions === "limited-3d" ? "webgl" : "canvas-2d",
  position: { x: 50, y: 50 },
  size: role === "background" ? { width: 100, height: 100 } : { width: 16, height: 16 },
  anchor: { x: 0.5, y: 0.5 },
  layer,
  visible: true,
  collider: {
    kind: role === "background" ? "none" : role === "collectible" ? "circle" : "box",
    width: role === "background" ? 0 : 12,
    height: role === "background" ? 0 : 12,
    offsetX: 0,
    offsetY: 0,
  },
  animation: { clip: null, speed: 1, movableParts: role === "player" ? ["legs"] : [] },
  assetId: null,
  ruleIds: role === "player" ? spec.rules.map((rule) => rule.id) : [],
  editableProperties: ["position", "size", "layer", "visible", "animation-speed"],
  lockedProperties: ["collider", "rules", "asset-role"],
});

export function createScene(spec: GameSpecV2): SceneNode[] {
  const root: SceneNode = {
    id: "SCENE-ROOT",
    parentId: null,
    label: "游戏场景",
    role: "background",
    renderer: spec.capabilities.dimensions === "limited-3d" ? "webgl" : "canvas-2d",
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    anchor: { x: 0, y: 0 },
    layer: 0,
    visible: true,
    collider: { kind: "none", width: 0, height: 0, offsetX: 0, offsetY: 0 },
    animation: { clip: null, speed: 1, movableParts: [] },
    assetId: null,
    ruleIds: [],
    editableProperties: [],
    lockedProperties: ["collider", "rules", "asset-role"],
  };
  const nodes = [
    makeNode("NODE-BACKGROUND", "背景层", "background", 1, spec),
    makeNode("NODE-PLAYER", spec.entities[0]?.label ?? "玩家角色", "player", 10, spec),
    makeNode("NODE-TARGET", spec.entities[1]?.label ?? "奖励目标", "collectible", 8, spec),
  ];
  if (spec.capabilities.requiredCapabilities.some((item) => item.includes("dodge") || item.includes("collision"))) {
    nodes.push(makeNode("NODE-OBSTACLE", "危险障碍", "obstacle", 7, spec));
  }
  if (spec.source.selectedMechanicIds.includes("lane-dodge") && spec.source.selectedMechanicIds.includes("collect-charge")) {
    const player = nodes.find((node) => node.id === "NODE-PLAYER");
    if (player) {
      player.label = "昆虫身体";
      player.size = { width: 14, height: 16 };
      player.animation.movableParts = [];
    }
    const head = makeNode("NODE-HEAD", "昆虫头部", "player", 12, spec);
    head.parentId = "NODE-PLAYER";
    head.position = { x: 50, y: 42 };
    head.size = { width: 10, height: 8 };
    head.collider.kind = "head";
    head.ruleIds = spec.rules.filter((rule) => /头部|露珠/.test(rule.label)).map((rule) => rule.id);
    head.animation.movableParts = [];
    const legs = makeNode("NODE-LEGS", "可动腿", "player", 9, spec);
    legs.parentId = "NODE-PLAYER";
    legs.position = { x: 50, y: 54 };
    legs.size = { width: 18, height: 12 };
    legs.collider.kind = "none";
    legs.ruleIds = spec.rules.filter((rule) => /移动/.test(rule.label)).map((rule) => rule.id);
    legs.animation = { clip: "walk-cycle", speed: 1, movableParts: ["legs"] };
    nodes.push(head, legs);
  }
  return [root, ...nodes];
}

export type SceneUpdate = Partial<
  Pick<SceneNode, "position" | "size" | "layer" | "visible">
> & { animationSpeed?: number; animationClip?: string | null; colliderWidth?: number };

export function updateSceneNode(
  scene: SceneNode[],
  nodeId: string,
  update: SceneUpdate,
): SceneNode[] {
  const node = scene.find((item) => item.id === nodeId);
  if (!node) throw new Error("找不到要修改的场景对象。");
  if (update.colliderWidth !== undefined) {
    throw new Error("碰撞属性被规则合同锁定，需要转入规则修改和重新验收。");
  }
  if (update.size && (update.size.width <= 0 || update.size.height <= 0)) {
    throw new Error("对象尺寸必须大于零。");
  }
  if (update.animationSpeed !== undefined && update.animationSpeed <= 0) {
    throw new Error("动画速度必须大于零。");
  }
  return scene.map((item) =>
    item.id === nodeId
      ? {
          ...item,
          ...update,
          animation:
            update.animationSpeed === undefined && update.animationClip === undefined
              ? item.animation
              : {
                  ...item.animation,
                  speed: update.animationSpeed ?? item.animation.speed,
                  clip: update.animationClip === undefined ? item.animation.clip : update.animationClip,
                },
        }
      : item,
  );
}

export function validateScene(scene: SceneNode[]): string[] {
  const errors: string[] = [];
  const ids = new Set(scene.map((node) => node.id));
  for (const node of scene) {
    if (node.parentId && !ids.has(node.parentId)) errors.push(`${node.label} 的父节点不存在`);
    if (node.size.width <= 0 || node.size.height <= 0) errors.push(`${node.label} 的尺寸无效`);
    if (node.role === "player" && node.parentId === "SCENE-ROOT" && node.collider.kind === "none") errors.push("玩家角色必须有碰撞区域");
    if (node.animation.movableParts.includes("legs") && node.role !== "player") {
      errors.push(`${node.label} 的可动腿没有绑定到玩家角色`);
    }
  }
  return errors;
}
