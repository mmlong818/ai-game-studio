import { stableId } from "./hash";
import { getTemplate, MECHANIC_LIBRARY } from "./templates";
import type { StudioDraft } from "./types";
import type {
  CapabilityDeclaration,
  GameActionContract,
  GameEntityContract,
  GameRuleContract,
  GameSpecV2,
  ProgressionMode,
} from "./platformTypes";

const NOW = "2026-09-01T00:00:00.000Z";

const progressionFor = (capabilities: string[]): ProgressionMode => {
  if (capabilities.some((item) => item.includes("endless") || item.includes("body-trail"))) {
    return "endless";
  }
  if (capabilities.some((item) => item.includes("route") || item.includes("relic"))) {
    return "run-based";
  }
  if (capabilities.some((item) => item.includes("round") || item.includes("turn"))) {
    return "round-based";
  }
  if (capabilities.some((item) => item.includes("chapter") || item.includes("branch"))) {
    return "chapter-based";
  }
  return "finite-campaign";
};

const perspectiveFor = (
  capabilities: string[],
  force3d = false,
): CapabilityDeclaration["perspective"] => {
  if (force3d) return "fixed-camera";
  if (capabilities.some((item) => item.includes("grid") || item.includes("board"))) return "board";
  if (capabilities.some((item) => item.includes("lane") || item.includes("movement"))) return "top-down";
  if (capabilities.some((item) => item.includes("3d") || item.includes("camera"))) return "fixed-camera";
  return "side";
};

const buildRule = (label: string, index: number): GameRuleContract => ({
  id: stableId("RULE", `${index}:${label}`),
  priority: "P0",
  label,
  trigger: `玩家执行与“${label}”相关的动作`,
  conditions: ["state=playing"],
  effects: [label],
  invariants: [`“${label}”在重试和恢复后保持一致`],
  observable: ["状态变化可见", "动作产生即时反馈"],
  failureMessage: `核心规则未满足：${label}`,
});

const goldenLadybugRules = [
  "角色支持上下左右连续移动",
  "只有头部触碰露珠才会获取",
  "露珠获取后爆开并立即消失",
  "普通状态撞到树脂会失败",
  "冲刺状态能够破坏树脂障碍",
  "背景树皮持续向下滚动形成速度感",
  "速度具有巡航、加速和冲刺三个可辨层次",
  "每个生成批次至少保留一条安全通路",
];

const actionSet = (capabilities: string[]): GameActionContract[] => {
  const continuous = capabilities.some((item) =>
    ["continuous-movement", "lane-dodge", "character-control"].includes(item),
  );
  return [
    {
      id: "ACT-PRIMARY",
      label: continuous ? "移动或闪避" : "执行主要操作",
      availableWhen: ["state=playing"],
      inputBindings: continuous
        ? ["ArrowKeys/WASD", "touch:direction"]
        : ["pointer:primary", "touch:primary", "keyboard:arrows"],
      continuous,
      effects: ["推进核心循环"],
      feedback: ["visual-response", "audio-response", "state-change"],
    },
    {
      id: "ACT-RESTART",
      label: "重新开始",
      availableWhen: ["state=result", "state=error", "state=paused"],
      inputBindings: ["button:restart"],
      continuous: false,
      effects: ["reset current session"],
      feedback: ["scene-reset", "status-announcement"],
    },
  ];
};

const entitySet = (capabilities: string[]): GameEntityContract[] => {
  const usesGrid = capabilities.some((item) => item.includes("grid") || item.includes("board"));
  return [
    {
      id: "ENTITY-PLAYER",
      label: usesGrid ? "主要操作对象" : "玩家角色",
      role: "player",
      collider: usesGrid ? "grid-cell" : "box",
      spawnWhen: ["state=ready"],
      destroyWhen: [],
      effects: ["receives player input"],
      presentation: ["highest interaction contrast", "clear focus state"],
    },
    {
      id: "ENTITY-TARGET",
      label: usesGrid ? "目标格或目标块" : "奖励目标",
      role: "collectible",
      collider: usesGrid ? "grid-cell" : "circle",
      spawnWhen: ["state=playing"],
      destroyWhen: ["resolved=true"],
      effects: ["advances objective"],
      presentation: ["distinct from hazards", "resolution feedback"],
    },
  ];
};

export function buildGameSpec(draft: StudioDraft): GameSpecV2 {
  const template = draft.creationMode === "template-remix" ? getTemplate(draft.templateId) : undefined;
  const mechanics = MECHANIC_LIBRARY.filter((item) => draft.selectedMechanicIds.includes(item.id));
  const capabilities = template?.capabilities ?? mechanics.flatMap((item) => item.capabilityIds);
  const title = template ? `${template.name}改造` : "AI 原创新游戏";
  const vision = template?.pitch ?? draft.newGameBrief.trim();
  const isLadybugGoldenPath =
    !template &&
    draft.selectedMechanicIds.includes("lane-dodge") &&
    draft.selectedMechanicIds.includes("collect-charge");
  const isLimited3d = Boolean(template?.id.endsWith("-3d")) || capabilities.some((item) => item.includes("3d") || item.includes("camera"));
  const ruleLabels = template?.coreRules ??
    (isLadybugGoldenPath ? goldenLadybugRules : mechanics.map((item) => item.description));
  const rules = ruleLabels.map(buildRule);
  const projectId = stableId(
    "PROJECT",
    `${draft.creationMode}:${draft.templateId ?? "new"}:${draft.newGameBrief}:${draft.selectedSuggestionIds.join(",")}`,
  );
  const progressionMode = progressionFor(capabilities);

  return {
    schemaVersion: "game-spec-v2",
    projectId,
    createdAt: NOW,
    creationMode: draft.creationMode,
    intent: {
      title,
      vision,
      genre: template?.genre ?? "组合玩法",
      targetPlayer: "希望在浏览器中快速理解并完成一局的单人玩家",
      playerFantasy: template?.coreLoop ?? draft.newGameBrief.trim(),
      sessionLength: { minimumMinutes: 1, targetMinutes: 5, maximumMinutes: 15 },
      designPillars: template
        ? ["规则清晰", "操作有反馈", "失败可理解"]
        : ["核心机制组合", "跨设备可操作", "实验规则可验证"],
    },
    capabilities: {
      dimensions: isLimited3d
        ? "limited-3d"
        : "2d",
      perspective: perspectiveFor(capabilities, isLimited3d),
      world: "single-stage",
      progressionMode,
      networkMode: "single-player",
      deliveryTarget: "web",
      inputs: capabilities.includes("gamepad-input")
        ? ["keyboard", "pointer", "touch", "gamepad"]
        : ["keyboard", "pointer", "touch"],
      requiredCapabilities: Array.from(new Set(capabilities)),
    },
    source: {
      templateId: template?.id ?? null,
      changeLevel: draft.changeLevel,
      lockedCoreRuleIds: template ? rules.map((rule) => rule.id) : [],
      selectedMechanicIds: mechanics.map((item) => item.id),
      referenceDossierId: draft.referenceDossier?.id ?? null,
    },
    lifecycle: ["loading", "ready", "playing", "paused", "result", "error"],
    actions: actionSet(capabilities),
    entities: entitySet(capabilities),
    rules,
    progression: {
      mode: progressionMode,
      supportsRestore: true,
      completion: "通过正常动作完成核心目标后进入 result",
      failure: "触发明确失败原因后进入 result，并允许重试",
    },
    assetPolicy: {
      gameArt: "ai-generated-raster-only",
      allowSvgGameArt: false,
      requireLocalFiles: true,
      requireProvenance: true,
    },
    qualityTargets: {
      touchTargetPx: 44,
      requiredViewports: ["360x640", "390x844", "844x390", "1366x768", "1920x1080"],
      targetFps: 60,
      initialAssetBudgetMb: 10,
      packageBudgetMb: 25,
    },
  };
}

export function validateGameSpec(spec: GameSpecV2): string[] {
  const errors: string[] = [];
  if (spec.schemaVersion !== "game-spec-v2") errors.push("规格版本不是 game-spec-v2");
  if (spec.intent.designPillars.length < 1 || spec.intent.designPillars.length > 4) {
    errors.push("设计支柱必须为 1–4 条");
  }
  if (spec.rules.length === 0) errors.push("至少需要一条规则合同");
  if (new Set(spec.rules.map((rule) => rule.id)).size !== spec.rules.length) {
    errors.push("规则 ID 必须唯一");
  }
  if (!spec.capabilities.inputs.includes("touch") || !spec.capabilities.inputs.includes("keyboard")) {
    errors.push("必须同时提供手机与桌面输入");
  }
  if (spec.assetPolicy.allowSvgGameArt !== false) errors.push("游戏美术禁止 SVG");
  return errors;
}

export function migrateLegacySpec(input: Record<string, unknown>): GameSpecV2 {
  if (input.schemaVersion === "game-spec-v2") return input as unknown as GameSpecV2;
  const draft: StudioDraft = {
    creationMode: input.creationMode === "mechanic-composition" ? "mechanic-composition" : "template-remix",
    templateId: typeof input.templateId === "string" ? input.templateId : "merge-2048",
    selectedSuggestionIds: [],
    freeRequest: typeof input.request === "string" ? input.request : "迁移旧项目内容",
    newGameBrief: typeof input.brief === "string" ? input.brief : "",
    selectedMechanicIds: Array.isArray(input.mechanicIds)
      ? input.mechanicIds.filter((item): item is string => typeof item === "string")
      : [],
    changeLevel: "R1",
    referenceDossier: null,
  };
  return buildGameSpec(draft);
}
