/**
 * 引擎层 · 行为注册表（服务端登记）。浏览器实现见 runtime/behaviors.js，两边 id 必须一致（tests/engine-playcanvas.test.ts 守卫）。
 * 这是 3D（renderer=webgl）对象专用的行为集合，与 src/shared/mechanics 的 2D 能力模块并列，互不影响；
 * 缺少的能力见 docs/58-engine-layer.md §5。
 */
import type { GameProjectV3 } from "../../shared/project-schema/index.js";

export type EngineBehaviorParameter = { type: "number" | "boolean" | "string" | "array"; default: unknown; minimum?: number; maximum?: number; description: string };

export type EngineBehaviorDescriptor = {
  id: string;
  version: string;
  name: string;
  summary: string;
  roles: Array<GameProjectV3["objects"][number]["role"]>;
  parameters: Record<string, EngineBehaviorParameter>;
  events: string[];
};

export const ENGINE_BEHAVIORS: readonly EngineBehaviorDescriptor[] = [
  { id: "engine.grid-footprint", version: "1.0.0", name: "网格占位 / 高度", summary: "把实体吸附到格心并登记为可走格；height 为顶面高度，footprint 由实例尺寸按格取整", roles: ["background", "helper"], parameters: { height: { type: "number", default: 0, minimum: 0, maximum: 10, description: "顶面高度（世界单位）" } }, events: [] },
  { id: "engine.static-decor", version: "1.0.0", name: "静态装饰", summary: "不参与碰撞与网格的装饰物；可确定性随机朝向", roles: ["background", "effect", "helper"], parameters: { randomYaw: { type: "boolean", default: false, description: "按实例 id 种子随机绕 Y 转" }, castShadows: { type: "boolean", default: true, description: "是否投影" } }, events: [] },
  { id: "engine.pickup", version: "1.0.0", name: "可拾取物", summary: "旋转浮动；玩家进入同格时发 collision（kind=pickup）并隐藏，只触发一次", roles: ["collectible"], parameters: { spinSpeed: { type: "number", default: 1.4, minimum: 0, maximum: 10, description: "自转速度（弧度/秒）" }, bob: { type: "number", default: 0.05, minimum: 0, maximum: 1, description: "上下浮动幅度" } }, events: ["collision"] },
  { id: "engine.pressure-plate", version: "1.0.0", name: "压板 / 可触发机关", summary: "玩家踩上去切换（toggle）或按住（hold）激活，发 trigger 事件并改自发光", roles: ["helper", "hazard", "background"], parameters: { mode: { type: "string", default: "toggle", description: "toggle | hold" } }, events: ["trigger"] },
  { id: "engine.beat-mover", version: "1.0.0", name: "节拍移动障碍", summary: "沿相对格位移路径每 every 拍走一步，与玩家同格时发 collision（kind=hazard）", roles: ["hazard"], parameters: { path: { type: "array", default: [[1, 0], [-1, 0]], description: "相对格位移序列 [[dx,dz],...]" }, every: { type: "number", default: 1, minimum: 1, maximum: 8, description: "每几拍走一步" } }, events: ["collision"] },
  { id: "engine.grid-walker", version: "1.0.0", name: "网格行走者（玩家）", summary: "抽象动作 N/E/S/W 走一格（目标格必须可走），jump 越过一格空隙；一拍插值移动", roles: ["player"], parameters: { stepsPerSecond: { type: "number", default: 4, minimum: 0.5, maximum: 20, description: "插值速度" } }, events: ["moved", "blocked"] },
];

export const ENGINE_BEHAVIOR_REGISTRY = new Map(ENGINE_BEHAVIORS.map((behavior) => [behavior.id, behavior]));

/** 校验 GameProjectV3 中 webgl 对象的行为绑定：未登记 id、主版本不兼容、角色不匹配、参数类型 / 范围。 */
export function validateEngineBehaviors(project: GameProjectV3): string[] {
  const errors: string[] = [];
  for (const object of project.objects) {
    if (object.renderer !== "webgl") continue;
    for (const binding of object.behaviors) {
      const descriptor = ENGINE_BEHAVIOR_REGISTRY.get(binding.moduleId);
      if (!descriptor) { errors.push(`${object.id}/${binding.id}：未登记的引擎行为 ${binding.moduleId}`); continue; }
      if (binding.moduleVersion.split(".")[0] !== descriptor.version.split(".")[0]) errors.push(`${object.id}/${binding.id}：${binding.moduleId} 主版本不兼容 ${binding.moduleVersion} → ${descriptor.version}`);
      if (!descriptor.roles.includes(object.role)) errors.push(`${object.id}/${binding.id}：${binding.moduleId} 不适用于角色 ${object.role}`);
      for (const [name, value] of Object.entries(binding.parameters)) {
        const parameter = descriptor.parameters[name];
        if (!parameter) { errors.push(`${object.id}/${binding.id}：${binding.moduleId} 没有参数 ${name}`); continue; }
        const actualType = Array.isArray(value) ? "array" : typeof value;
        if (actualType !== parameter.type) { errors.push(`${object.id}/${binding.id}：${binding.moduleId}.${name} 类型应为 ${parameter.type}`); continue; }
        if (typeof value === "number" && (value < (parameter.minimum ?? -Infinity) || value > (parameter.maximum ?? Infinity))) errors.push(`${object.id}/${binding.id}：${binding.moduleId}.${name} 超出范围`);
      }
    }
  }
  return errors;
}
