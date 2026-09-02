import { stableId } from "./hash";
import { GOLDEN_SCENARIOS, scenarioForMechanics, type GameProbe, type GoldenScenarioDefinition } from "./probe";
import type {
  AcceptanceAssertion,
  BuildManifest,
  QualityEvidence,
  StudioProject,
} from "./platformTypes";

interface ScenarioResult {
  passedLabels: string[];
  log: string[];
  errors: string[];
}

const includesEvery = (events: string[], expected: string[]): boolean =>
  expected.every((event) => events.includes(event));

function runMergeScenario(probe: GameProbe): ScenarioResult {
  probe.setSeed(17);
  probe.restart();
  probe.performAction("start");
  const before = probe.snapshot();
  const result = probe.performAction("slide-left");
  const after = probe.snapshot();
  const errors: string[] = [];
  if (!result.accepted) errors.push("合法滑动被拒绝");
  if (after.score !== before.score + 4) errors.push("合并没有正确计分");
  if (!includesEvery(after.events, ["board-slid", "equal-merged-once", "tile-spawned-after-valid-move"])) {
    errors.push("滑动、一次一并或移动后生成没有形成完整事件证据");
  }
  probe.restart();
  probe.restore(after);
  if (!probe.snapshot().events.includes("checkpoint-restored")) errors.push("刷新后没有恢复当前局面");
  return {
    passedLabels: errors.length === 0 ? ["一次输入推动全盘", "同值方块每步只合并一次", "有效移动后生成新块"] : [],
    log: after.events,
    errors,
  };
}

function runLadybugScenario(probe: GameProbe): ScenarioResult {
  const errors: string[] = [];
  probe.setSeed(17);
  probe.restart();
  probe.performAction("start");
  for (const action of ["move-left", "move-right", "move-up", "move-down"]) {
    if (!probe.performAction(action).accepted) errors.push(`${action} 不可用`);
  }
  const beforeBodyTouch = probe.snapshot();
  probe.performAction("body-touch-dew");
  if (probe.snapshot().resources.dew !== beforeBodyTouch.resources.dew) {
    errors.push("身体触碰错误收集了露珠");
  }
  probe.performAction("head-touch-dew");
  let state = probe.snapshot();
  if (state.resources.dew !== 1 || state.values.dewVisible !== false || state.values.dewBurst !== true) {
    errors.push("头部拾取、露珠爆开或消失规则失败");
  }
  probe.performAction("advance");
  state = probe.snapshot();
  if (Number(state.values.backgroundOffset) <= 0) errors.push("背景没有向下滚动");
  if (!state.events.includes("safe-lane-preserved")) errors.push("生成批次没有安全通路证据");
  probe.performAction("boost");
  if (probe.snapshot().values.speedTier !== "boost") errors.push("冲刺速度层次不可辨认");
  probe.performAction("hit-resin");
  if (probe.snapshot().values.resinVisible !== false) errors.push("冲刺没有破坏树脂");

  probe.restart();
  probe.performAction("start");
  probe.performAction("hit-resin");
  state = probe.snapshot();
  if (state.result !== "failed") errors.push("普通状态碰撞没有失败");

  const labels = [
    "角色支持上下左右连续移动",
    "只有头部触碰露珠才会获取",
    "露珠获取后爆开并立即消失",
    "普通状态撞到树脂会失败",
    "冲刺状态能够破坏树脂障碍",
    "背景树皮持续向下滚动形成速度感",
    "速度具有巡航、加速和冲刺三个可辨层次",
    "每个生成批次至少保留一条安全通路",
  ];
  return { passedLabels: errors.length === 0 ? labels : [], log: state.events, errors };
}

function runTileRogueliteScenario(probe: GameProbe): ScenarioResult {
  probe.setSeed(17);
  probe.restart();
  probe.performAction("start");
  const blocked = probe.performAction("match-blocked-pair");
  probe.performAction("match-free-pair");
  probe.performAction("choose-risk-route");
  probe.performAction("take-relic");
  probe.performAction("save-checkpoint");
  probe.performAction("finish");
  const state = probe.snapshot();
  const errors: string[] = [];
  if (blocked.accepted) errors.push("被压住的牌错误地允许配对");
  if (state.values.layoutSolvable !== true || !state.events.includes("seeded-solvable-layout")) errors.push("牌阵没有可解证据");
  if (!includesEvery(state.events, ["route-choice-applied", "relic-synergy-applied", "checkpoint-saved"])) errors.push("路线、遗物或恢复没有影响本局");
  return {
    passedLabels: errors.length === 0 ? ["只有自由牌可以配对", "牌阵必须可解", "路线和遗物会影响本局"] : [],
    log: state.events,
    errors,
  };
}

function runCollectEscape3DScenario(probe: GameProbe): ScenarioResult {
  probe.setSeed(17);
  probe.restart();
  probe.performAction("start");
  probe.performAction("move-forward");
  probe.performAction("rotate-camera");
  const wall = probe.performAction("cross-wall");
  probe.performAction("fall-check");
  probe.performAction("collect");
  probe.performAction("enter-exit");
  const state = probe.snapshot();
  const errors: string[] = [];
  if (!includesEvery(state.events, ["character-moved", "camera-rotated"])) errors.push("角色或相机不可控");
  if (wall.accepted || state.values.wallCrossed === true) errors.push("碰撞边界允许穿墙");
  if (!includesEvery(state.events, ["target-collected", "exit-unlocked", "exit-reached"]) || state.result !== "completed") errors.push("收集后无法抵达出口");
  return {
    passedLabels: errors.length === 0 ? ["角色和相机可控", "碰撞边界清楚", "收集目标后可以抵达出口"] : [],
    log: state.events,
    errors,
  };
}

function runGoldenTemplateScenario(project: StudioProject, probe: GameProbe, override?: GoldenScenarioDefinition): ScenarioResult {
  const templateId = project.spec.source.templateId;
  const definition = override ?? (templateId ? GOLDEN_SCENARIOS[templateId] : undefined);
  if (!definition) return { passedLabels: [], log: [], errors: ["缺少玩法专属验收场景"] };
  const errors: string[] = [];
  probe.setSeed(17);
  probe.restart();
  if (!probe.performAction("start").accepted) errors.push("无法从准备状态正常开始");
  const illegal = probe.performAction("__illegal-action__");
  if (illegal.accepted) errors.push("未登记的非法动作被错误接受");
  for (const action of Object.keys(definition.actions)) {
    const result = probe.performAction(action);
    const shouldReject = definition.rejectedActions?.includes(action) ?? false;
    if (result.accepted === shouldReject) errors.push(`${action} 的合法性结果错误`);
  }
  const saved = probe.snapshot();
  if (saved.resources.steps <= 0) errors.push("合法动作没有产生核心资源变化");
  if (saved.lifecycle !== "result" || saved.result === null) errors.push("正常规则路径没有到达结算");
  probe.restart();
  if (probe.snapshot().lifecycle !== "ready") errors.push("失败或完成后不能重新开始");
  probe.restore(saved);
  const state = probe.snapshot();
  const expectedEvents = Object.values(definition.actions).flat();
  if (!includesEvery(state.events, expectedEvents)) errors.push("专属动作没有产生完整规则事件");
  if (!state.events.includes("checkpoint-restored")) errors.push("刷新后没有恢复当前局面");
  return {
    passedLabels: errors.length === 0 ? project.spec.rules.map((rule) => rule.label) : [],
    log: state.events,
    errors,
  };
}

export function runGameplayAcceptance(
  project: StudioProject,
  build: BuildManifest,
  probe: GameProbe,
): { assertions: AcceptanceAssertion[]; evidence: QualityEvidence[]; errors: string[] } {
  if (build.status !== "healthy") {
    return { assertions: project.assertions, evidence: [], errors: ["构建不健康，不能执行玩法验收"] };
  }
  const scenario = project.spec.source.templateId === "merge-2048"
    ? runMergeScenario(probe)
    : project.spec.source.templateId === "tile-roguelite"
      ? runTileRogueliteScenario(probe)
      : project.spec.source.templateId === "collect-escape-3d"
        ? runCollectEscape3DScenario(probe)
        : project.spec.source.templateId
          ? runGoldenTemplateScenario(project, probe)
          : project.spec.source.selectedMechanicIds.includes("lane-dodge") && project.spec.source.selectedMechanicIds.includes("collect-escape")
            ? runLadybugScenario(probe)
            : runGoldenTemplateScenario(project, probe, scenarioForMechanics(project.spec.source.selectedMechanicIds) ?? undefined);
  const capturedAt = new Date().toISOString();
  const change = project.changeSets.find((item) => item.id === build.changeSetId);
  const affectedRules = new Set(change?.affectedRuleIds ?? project.spec.rules.map((rule) => rule.id));
  const evidence: QualityEvidence[] = [];
  const assertions = project.assertions.map((assertion) => {
    if (assertion.kind !== "rule") return assertion;
    if (assertion.status === "passed" && !assertion.sourceRuleIds.some((id) => affectedRules.has(id))) return assertion;
    const rule = project.spec.rules.find((item) => assertion.sourceRuleIds.includes(item.id));
    const passed = Boolean(rule && scenario.passedLabels.includes(rule.label));
    const evidenceId = stableId("EVIDENCE", `${build.id}:${assertion.id}:probe`);
    evidence.push({
      id: evidenceId,
      assertionId: assertion.id,
      buildId: build.id,
      kind: "event-log",
      capturedAt,
      value: passed ? scenario.log.join(",") : scenario.errors.join("；") || "场景没有覆盖此规则",
      specHash: build.specHash,
      codeHash: build.codeHash,
      assetManifestHash: build.assetManifestHash,
    });
    return {
      ...assertion,
      status: passed ? ("passed" as const) : ("failed" as const),
      message: passed ? "GameProbe 已通过合法动作验证" : scenario.errors.join("；") || "场景未覆盖",
      evidenceIds: [evidenceId],
    };
  });
  return { assertions, evidence, errors: scenario.errors };
}
