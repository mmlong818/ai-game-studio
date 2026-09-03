import { buildProjectReferenceIndex, parseGameProjectV3, type GameProjectV3 } from "../project-schema/index.js";

export type ProjectPatch =
  | { kind: "behavior-parameter"; behaviorId: string; name: string; value: unknown }
  | { kind: "instance-property"; instanceId: string; property: "position" | "size" | "visible" | "layer"; value: unknown }
  | { kind: "resource-replace"; resourceId: string; next: GameProjectV3["resources"][number] }
  | { kind: "rule-enabled"; ruleId: string; enabled: boolean };

export interface StructuredChangeSet {
  id: string;
  goal: string;
  createdAt: string;
  status: "planned" | "applied" | "rolled-back";
  patches: ProjectPatch[];
  affectedIds: string[];
  affectedAcceptanceIds: string[];
  before: GameProjectV3;
  after: GameProjectV3 | null;
}

function affectedAcceptance(project: GameProjectV3, affectedIds: Set<string>): string[] {
  const referenceIndex = buildProjectReferenceIndex(project);
  const referencedPaths = [...affectedIds].flatMap((id) => [...referenceIndex.entries()].filter(([key]) => key.endsWith(`:${id}`)).flatMap(([, paths]) => paths));
  return project.acceptance.filter((assertion, index) =>
    assertion.ruleIds.some((id) => affectedIds.has(id)) ||
    assertion.behaviorIds.some((id) => affectedIds.has(id)) ||
    referencedPaths.some((path) => path.startsWith(`acceptance.${index}.`)),
  ).map(({ id }) => id);
}

export function createStructuredChangeSet(project: GameProjectV3, goal: string, patches: ProjectPatch[]): StructuredChangeSet {
  if (!goal.trim()) throw new Error("变更目标不能为空");
  if (patches.length === 0) throw new Error("变更集至少需要一项结构化修改");
  const affectedIds = patches.map((patch) => patch.kind === "behavior-parameter" ? patch.behaviorId : patch.kind === "instance-property" ? patch.instanceId : patch.kind === "resource-replace" ? patch.resourceId : patch.ruleId);
  const createdAt = new Date().toISOString();
  return {
    id: `CHANGE-${createdAt.replace(/\D/g, "")}`,
    goal: goal.trim(),
    createdAt,
    status: "planned",
    patches: structuredClone(patches),
    affectedIds,
    affectedAcceptanceIds: affectedAcceptance(project, new Set(affectedIds)),
    before: structuredClone(project),
    after: null,
  };
}

export function applyStructuredChangeSet(change: StructuredChangeSet): StructuredChangeSet {
  if (change.status !== "planned") throw new Error("只有待执行变更集可以应用");
  const next = structuredClone(change.before);
  for (const patch of change.patches) {
    if (patch.kind === "behavior-parameter") {
      const behavior = next.objects.flatMap(({ behaviors }) => behaviors).find(({ id }) => id === patch.behaviorId);
      if (!behavior) throw new Error(`找不到行为：${patch.behaviorId}`);
      behavior.parameters[patch.name] = structuredClone(patch.value);
    } else if (patch.kind === "instance-property") {
      const instance = next.scenes.flatMap(({ instances }) => instances).find(({ id }) => id === patch.instanceId);
      if (!instance) throw new Error(`找不到实例：${patch.instanceId}`);
      (instance as unknown as Record<string, unknown>)[patch.property] = structuredClone(patch.value);
    } else if (patch.kind === "resource-replace") {
      const index = next.resources.findIndex(({ id }) => id === patch.resourceId);
      if (index < 0) throw new Error(`找不到资源：${patch.resourceId}`);
      if (patch.next.id !== patch.resourceId) throw new Error("替换资源必须保持稳定资源 ID");
      next.resources[index] = structuredClone(patch.next);
    } else {
      const rule = next.rules.find(({ id }) => id === patch.ruleId);
      if (!rule) throw new Error(`找不到规则：${patch.ruleId}`);
      rule.enabled = patch.enabled;
    }
  }
  next.metadata.updatedAt = new Date().toISOString();
  return { ...change, status: "applied", after: parseGameProjectV3(next) };
}

export function rollbackStructuredChangeSet(change: StructuredChangeSet): { change: StructuredChangeSet; project: GameProjectV3 } {
  if (change.status !== "applied") throw new Error("只有已应用变更集可以回滚");
  return { change: { ...change, status: "rolled-back" }, project: parseGameProjectV3(structuredClone(change.before)) };
}

export function planNaturalLanguageChange(project: GameProjectV3, request: string): StructuredChangeSet {
  const normalized = request.trim().toLowerCase();
  const patches: ProjectPatch[] = [];
  const movement = project.objects.flatMap(({ behaviors }) => behaviors).find(({ moduleId }) => /movement/.test(moduleId));
  const player = project.scenes.flatMap(({ instances }) => instances).find(({ objectId }) => objectId === "OBJECT-PLAYER");
  if (/更快|加速|速度/.test(normalized) && movement) {
    const current = Number(movement.parameters.speed ?? 320);
    patches.push({ kind: "behavior-parameter", behaviorId: movement.id, name: "speed", value: Math.min(current * 1.15, movement.moduleId === "movement-spatial" ? 20 : 1200) });
  }
  if (/小一点|太大|缩小/.test(normalized) && player) {
    patches.push({ kind: "instance-property", instanceId: player.id, property: "size", value: { width: player.size.width * 0.88, height: player.size.height * 0.88 } });
  }
  if (patches.length === 0) throw new Error("这条意见尚不能安全转换为 1.1 结构化修改，需要进入规则或美术方案分析");
  return createStructuredChangeSet(project, request, patches);
}
