import type { GameProjectV3 } from "../project-schema/index.js";

export interface RuntimeInspectorSnapshot {
  gameState: string;
  fps: number;
  resourceErrors: string[];
  longFrameCount: number;
  activeObjectCount: number;
  peakActiveObjectCount: number;
  objectStats: { created: number; destroyed: number };
  inputState: { keys: string[]; pointer: { x: number; y: number; down: boolean }; touches: number };
  audioState: { elements: number; playing: number; muted: number };
  memoryBytes: number | null;
  events: Array<{ type: string; detail: Record<string, unknown>; at: number }>;
  frozen: boolean;
}

export type DraftHotPatch =
  | { kind: "css-variable"; name: string; value: string }
  | { kind: "image-source"; selector: string; value: string }
  | { kind: "runtime-parameter"; name: "game-speed" | "spawn-rate" | "feedback-intensity"; value: number };

export function validateDraftHotPatch(patch: DraftHotPatch): string[] {
  const errors: string[] = [];
  if (patch.kind === "css-variable") {
    if (!/^--[a-z0-9-]+$/.test(patch.name)) errors.push("CSS 变量名不在安全范围内");
    if (patch.value.length > 120 || /url\s*\(|expression\s*\(/i.test(patch.value)) errors.push("CSS 变量值包含不安全内容");
  } else if (patch.kind === "image-source") {
    if (!/^#[A-Za-z][A-Za-z0-9_-]*$/.test(patch.selector)) errors.push("图片热更新只能使用稳定 ID 选择器");
    if (!/^assets\/[A-Za-z0-9._/-]+$/.test(patch.value) || patch.value.includes("..")) errors.push("图片必须来自工程内 assets 目录");
  } else {
    const ranges = { "game-speed": [0.25, 3], "spawn-rate": [0.25, 4], "feedback-intensity": [0, 2] } as const;
    const [minimum, maximum] = ranges[patch.name];
    if (!Number.isFinite(patch.value) || patch.value < minimum || patch.value > maximum) errors.push(`${patch.name} 超出安全热更新范围`);
  }
  return errors;
}

export function evaluateRuntimeSnapshot(project: GameProjectV3, snapshot: RuntimeInspectorSnapshot) {
  const spawnBudget = project.objects.flatMap(({ behaviors }) => behaviors).find(({ moduleId }) => moduleId === "spawn-and-pool");
  const maximumActive = Number(spawnBudget?.parameters.maximumActive ?? 500);
  return [
    { id: "RUNTIME-FPS", status: snapshot.fps >= project.presentation.targetFps * 0.8 ? "passed" as const : "failed" as const, evidence: `实际 ${snapshot.fps} FPS，目标 ${project.presentation.targetFps} FPS` },
    { id: "RUNTIME-RESOURCES", status: snapshot.resourceErrors.length === 0 ? "passed" as const : "failed" as const, evidence: snapshot.resourceErrors.length ? `${snapshot.resourceErrors.length} 个资源加载失败` : "没有资源加载错误" },
    { id: "RUNTIME-OBJECT-BUDGET", status: snapshot.activeObjectCount <= maximumActive ? "passed" as const : "failed" as const, evidence: `活跃对象 ${snapshot.activeObjectCount}/${maximumActive}` },
    { id: "RUNTIME-FROZEN", status: snapshot.frozen ? "passed" as const : "failed" as const, evidence: snapshot.frozen ? "审核构建已冻结" : "仍处于可热更新草稿状态" },
  ];
}
