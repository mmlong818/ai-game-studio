import { z } from "zod";

export const mechanicStabilitySchema = z.enum(["stable", "experimental", "project"]);
export const mechanicPermissionSchema = z.enum(["input", "render", "audio", "storage", "network", "device"]);

const parameterSchema = z.object({
  type: z.enum(["number", "boolean", "string"]),
  default: z.union([z.number(), z.boolean(), z.string()]),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  editableByAi: z.boolean(),
}).strict();

export const mechanicModuleSchema = z.object({
  id: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  name: z.string().min(1),
  experienceGoal: z.string().min(1),
  stability: mechanicStabilitySchema,
  objectRoles: z.array(z.string()).min(1),
  dependencies: z.array(z.string()).default([]),
  conflicts: z.array(z.string()).default([]),
  permissions: z.array(mechanicPermissionSchema).default([]),
  parameters: z.record(z.string(), parameterSchema).default({}),
  probes: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), kind: z.enum(["rule", "viewport", "performance", "accessibility"]) }).strict()).min(1),
}).strict();

export type MechanicModule = z.infer<typeof mechanicModuleSchema>;

const module = (definition: MechanicModule) => mechanicModuleSchema.parse(definition);

export const MECHANIC_MODULES = [
  module({ id: "game-state", version: "1.1.0", name: "游戏状态机", experienceGoal: "开始、暂停、结算与重开始终可理解", stability: "stable", objectRoles: ["helper", "interface"], dependencies: [], conflicts: [], permissions: [], parameters: {}, probes: [{ id: "state-cycle", label: "状态环可以完整运行", kind: "rule" }] }),
  module({ id: "unified-input", version: "1.1.0", name: "统一输入", experienceGoal: "桌面和手机都能完成主要操作", stability: "stable", objectRoles: ["player", "interface"], dependencies: ["game-state"], conflicts: [], permissions: ["input", "device"], parameters: { deadZone: { type: "number", default: 0.12, minimum: 0, maximum: 0.5, editableByAi: true } }, probes: [{ id: "input-desktop-touch", label: "键盘与触控输入均有效", kind: "accessibility" }] }),
  module({ id: "movement-2d", version: "1.1.0", name: "二维移动", experienceGoal: "移动立即响应并保持可控", stability: "stable", objectRoles: ["player", "hazard"], dependencies: ["unified-input"], conflicts: [], permissions: ["input", "render"], parameters: { speed: { type: "number", default: 320, minimum: 40, maximum: 1200, editableByAi: true }, acceleration: { type: "number", default: 1600, minimum: 0, maximum: 6000, editableByAi: true } }, probes: [{ id: "movement-response", label: "输入后角色发生有限位移", kind: "rule" }] }),
  module({ id: "movement-spatial", version: "1.1.0", name: "空间移动", experienceGoal: "固定镜头下的三维移动方向始终可辨", stability: "experimental", objectRoles: ["player"], dependencies: ["unified-input"], conflicts: ["movement-2d"], permissions: ["input", "render"], parameters: { speed: { type: "number", default: 5, minimum: 0.5, maximum: 20, editableByAi: true } }, probes: [{ id: "spatial-movement-response", label: "空间输入产生可辨且有限的位移", kind: "rule" }] }),
  module({ id: "spatial-boundary", version: "1.1.0", name: "空间边界", experienceGoal: "角色不会离开可玩区域", stability: "stable", objectRoles: ["player", "hazard"], dependencies: [], conflicts: [], permissions: ["render"], parameters: { padding: { type: "number", default: 8, minimum: 0, maximum: 128, editableByAi: true } }, probes: [{ id: "inside-boundary", label: "对象保持在玩法边界内", kind: "rule" }] }),
  module({ id: "collision", version: "1.1.0", name: "碰撞", experienceGoal: "接触结果明确且与画面位置一致", stability: "stable", objectRoles: ["player", "hazard", "collectible"], dependencies: [], conflicts: [], permissions: [], parameters: { scale: { type: "number", default: 0.82, minimum: 0.35, maximum: 1, editableByAi: false } }, probes: [{ id: "collision-contract", label: "碰撞双方与结果符合规则", kind: "rule" }] }),
  module({ id: "collect-and-destroy", version: "1.1.0", name: "收集与销毁", experienceGoal: "奖励接触后立即反馈并离场", stability: "stable", objectRoles: ["collectible", "effect"], dependencies: ["collision"], conflicts: [], permissions: ["render", "audio"], parameters: { score: { type: "number", default: 1, minimum: 0, maximum: 100000, editableByAi: true } }, probes: [{ id: "collect-destroys-target", label: "收集后奖励消失且只计分一次", kind: "rule" }] }),
  module({ id: "score-and-timer", version: "1.1.0", name: "计分与计时", experienceGoal: "进度、压力和目标始终可读", stability: "stable", objectRoles: ["interface", "helper"], dependencies: ["game-state"], conflicts: [], permissions: ["render"], parameters: { targetScore: { type: "number", default: 10, minimum: 1, maximum: 1000000, editableByAi: true }, durationSeconds: { type: "number", default: 120, minimum: 5, maximum: 7200, editableByAi: true } }, probes: [{ id: "score-finite", label: "计分和倒计时保持有限有效值", kind: "rule" }] }),
  module({ id: "spawn-and-pool", version: "1.1.0", name: "生成与回收", experienceGoal: "难度增长时仍保持安全路线和稳定性能", stability: "stable", objectRoles: ["hazard", "collectible"], dependencies: ["spatial-boundary"], conflicts: [], permissions: ["render"], parameters: { intervalMs: { type: "number", default: 900, minimum: 80, maximum: 10000, editableByAi: true }, maximumActive: { type: "number", default: 40, minimum: 1, maximum: 500, editableByAi: true } }, probes: [{ id: "spawn-budget", label: "活跃对象不超过预算", kind: "performance" }] }),
  module({ id: "sensory-feedback", version: "1.1.0", name: "视听反馈", experienceGoal: "成功、受伤和失败具有不同且舒适的反馈", stability: "stable", objectRoles: ["effect", "interface"], dependencies: [], conflicts: [], permissions: ["render", "audio"], parameters: { shake: { type: "number", default: 4, minimum: 0, maximum: 18, editableByAi: true }, volume: { type: "number", default: 0.7, minimum: 0, maximum: 1, editableByAi: true } }, probes: [{ id: "feedback-distinct", label: "关键结果具有可区分反馈", kind: "rule" }] }),
  module({ id: "local-persistence", version: "1.1.0", name: "本地存档", experienceGoal: "刷新后可以安全继续且旧存档不会破坏新版本", stability: "stable", objectRoles: ["helper"], dependencies: ["game-state"], conflicts: [], permissions: ["storage"], parameters: { schemaVersion: { type: "number", default: 1, minimum: 1, maximum: 1000, editableByAi: false } }, probes: [{ id: "persistence-roundtrip", label: "存档可恢复且版本不匹配时安全忽略", kind: "rule" }] }),
] as const;

export const MECHANIC_MODULE_REGISTRY = new Map<string, MechanicModule>(MECHANIC_MODULES.map((entry) => [entry.id, entry]));

export interface MechanicSelection {
  id: string;
  parameters?: Record<string, unknown>;
}

export function resolveMechanicModules(selections: readonly MechanicSelection[]): MechanicModule[] {
  const selected = new Map(selections.map((selection) => [selection.id, selection]));
  const ordered: MechanicModule[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error(`玩法能力依赖形成循环：${id}`);
    const definition = MECHANIC_MODULE_REGISTRY.get(id);
    if (!definition) throw new Error(`玩法能力不存在：${id}`);
    visiting.add(id);
    definition.dependencies.forEach(visit);
    visiting.delete(id);
    visited.add(id);
    ordered.push(definition);
  };
  selected.forEach((_, id) => visit(id));

  const ids = new Set(ordered.map(({ id }) => id));
  for (const definition of ordered) {
    const conflict = definition.conflicts.find((id) => ids.has(id));
    if (conflict) throw new Error(`玩法能力冲突：${definition.id} 与 ${conflict}`);
    const parameters = selected.get(definition.id)?.parameters ?? {};
    for (const [name, value] of Object.entries(parameters)) {
      const descriptor = definition.parameters[name];
      if (!descriptor) throw new Error(`${definition.id} 没有参数 ${name}`);
      if (typeof value !== descriptor.type) throw new Error(`${definition.id}.${name} 参数类型错误`);
      if (typeof value === "number" && (value < (descriptor.minimum ?? -Infinity) || value > (descriptor.maximum ?? Infinity))) {
        throw new Error(`${definition.id}.${name} 超出安全范围`);
      }
    }
  }
  return ordered;
}

export type PromotionEvidence = {
  gameCategories: string[];
  automatedChecksPassed: boolean;
  mobileVerified: boolean;
  rollbackVerified: boolean;
};

export function canPromoteMechanic(definition: MechanicModule, evidence: PromotionEvidence): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (definition.stability === "stable") reasons.push("能力已经是稳定级别");
  if (new Set(evidence.gameCategories).size < 4) reasons.push("尚未经过四类游戏验证");
  if (!evidence.automatedChecksPassed) reasons.push("自动检查未全部通过");
  if (!evidence.mobileVerified) reasons.push("尚未完成手机验证");
  if (!evidence.rollbackVerified) reasons.push("尚未验证回滚");
  return { allowed: reasons.length === 0, reasons };
}

export function createProjectMechanic(input: Pick<MechanicModule, "id" | "name" | "experienceGoal" | "objectRoles" | "permissions" | "parameters" | "probes">): MechanicModule {
  if (input.permissions.includes("network")) throw new Error("项目专用能力默认不能申请网络权限");
  return mechanicModuleSchema.parse({ ...input, version: "1.1.0", stability: "project", dependencies: [], conflicts: [] });
}

export function validateMechanicBindings(bindings: ReadonlyArray<{ moduleId: string; moduleVersion: string; parameters: Record<string, unknown> }>): string[] {
  const errors: string[] = [];
  for (const binding of bindings) {
    const definition = MECHANIC_MODULE_REGISTRY.get(binding.moduleId);
    if (!definition) {
      errors.push(`未登记玩法能力：${binding.moduleId}`);
      continue;
    }
    if (binding.moduleVersion.split(".")[0] !== definition.version.split(".")[0]) errors.push(`${binding.moduleId} 主版本不兼容：${binding.moduleVersion} → ${definition.version}`);
    if (definition.stability === "stable" && definition.permissions.includes("network")) errors.push(`稳定能力不能直接请求网络权限：${binding.moduleId}`);
    try {
      resolveMechanicModules([{ id: binding.moduleId, parameters: binding.parameters }]);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return errors;
}

export function migrateMechanicBindings<T extends { moduleId: string; moduleVersion: string; parameters: Record<string, unknown> }>(bindings: readonly T[]): T[] {
  return bindings.map((binding) => {
    const definition = MECHANIC_MODULE_REGISTRY.get(binding.moduleId);
    if (!definition) throw new Error(`无法迁移未登记玩法能力：${binding.moduleId}`);
    if (binding.moduleVersion.split(".")[0] !== definition.version.split(".")[0]) throw new Error(`${binding.moduleId} 需要显式主版本迁移`);
    return {
      ...binding,
      moduleVersion: definition.version,
      parameters: {
        ...Object.fromEntries(Object.entries(definition.parameters).map(([name, descriptor]) => [name, descriptor.default])),
        ...binding.parameters,
      },
    };
  });
}
