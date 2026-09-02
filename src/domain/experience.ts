import { stableId } from "./hash";
import type {
  AcceptanceAssertion,
  BuildManifest,
  QualityEvidence,
  StudioProject,
} from "./platformTypes";

export interface ViewportObservation {
  viewport: string;
  coreLoopCompleted: boolean;
  horizontalOverflow: boolean;
  controlsObscurePlayfield: boolean;
  minimumTouchTargetPx: number;
  averageFps: number;
  p95FrameMs: number;
  inputLatencyMs: number;
  longTaskCount: number;
  heapUsedMb: number | null;
  screenshotDataUrl: string | null;
  consoleErrors: number;
  missingAssets: number;
  reducedMotionSupported: boolean;
  focusVisible: boolean;
  audioCanMute: boolean;
  audioCanResume: boolean;
  pausesOnBlur: boolean;
}

export interface ExperienceReview {
  reviewerRoles: ["玩法设计", "界面体验"];
  understoodWithin30Seconds: boolean;
  coreLoopInFirstSession: boolean;
  meaningfulChoice: boolean;
  feedbackSupportsRules: boolean;
  failureIsFairAndExplained: boolean;
  wantsToRetry: boolean;
  desktopComfortable: boolean;
  mobileComfortable: boolean;
  delightSignals: string[];
  note: string;
}

export function validateViewportObservation(observation: ViewportObservation): string[] {
  const errors: string[] = [];
  if (!observation.coreLoopCompleted) errors.push(`${observation.viewport} 无法完成核心循环`);
  if (observation.horizontalOverflow) errors.push(`${observation.viewport} 存在横向溢出`);
  if (observation.controlsObscurePlayfield) errors.push(`${observation.viewport} 控件遮挡游戏区域`);
  if (observation.minimumTouchTargetPx < 44) errors.push(`${observation.viewport} 主要触控目标小于 44px`);
  if (observation.averageFps < 50) errors.push(`${observation.viewport} 平均帧率低于 50 FPS`);
  if (observation.p95FrameMs > 25) errors.push(`${observation.viewport} P95 单帧超过 25ms`);
  if (observation.inputLatencyMs > 100) errors.push(`${observation.viewport} 输入反馈超过 100ms`);
  if (observation.longTaskCount > 0) errors.push(`${observation.viewport} 检测到 ${observation.longTaskCount} 次长任务`);
  if (observation.heapUsedMb !== null && observation.heapUsedMb > 128) errors.push(`${observation.viewport} JS 内存超过 128MB`);
  if (observation.consoleErrors > 0) errors.push(`${observation.viewport} 存在控制台错误`);
  if (observation.missingAssets > 0) errors.push(`${observation.viewport} 存在缺失资源`);
  if (!observation.reducedMotionSupported) errors.push(`${observation.viewport} 未支持减少动态效果`);
  if (!observation.focusVisible) errors.push(`${observation.viewport} 键盘焦点不可见`);
  if (!observation.audioCanMute) errors.push(`${observation.viewport} 没有静音能力`);
  if (!observation.audioCanResume) errors.push(`${observation.viewport} 音频不能在用户操作后恢复`);
  if (!observation.pausesOnBlur) errors.push(`${observation.viewport} 页面失焦后没有暂停`);
  return errors;
}

export function applyViewportEvidence(
  project: StudioProject,
  build: BuildManifest,
  observations: ViewportObservation[],
): { assertions: AcceptanceAssertion[]; evidence: QualityEvidence[]; errors: string[] } {
  const required = project.spec.qualityTargets.requiredViewports;
  const missing = required.filter((viewport) => !observations.some((item) => item.viewport === viewport));
  const errors = [
    ...missing.map((viewport) => `${viewport} 尚未检查`),
    ...observations.flatMap(validateViewportObservation),
  ];
  const groups: Array<{ kind: AcceptanceAssertion["kind"]; errors: string[] }> = [
    {
      kind: "viewport",
      errors: [...missing.map((viewport) => `${viewport} 尚未检查`), ...observations.flatMap((item) => {
        const issues: string[] = [];
        if (!item.coreLoopCompleted) issues.push(`${item.viewport} 无法完成核心循环`);
        if (item.horizontalOverflow) issues.push(`${item.viewport} 存在横向溢出`);
        if (item.controlsObscurePlayfield) issues.push(`${item.viewport} 控件遮挡游戏区域`);
        if (item.missingAssets > 0) issues.push(`${item.viewport} 存在缺失资源`);
        if (item.consoleErrors > 0) issues.push(`${item.viewport} 存在控制台错误`);
        return issues;
      })],
    },
    {
      kind: "performance",
      errors: observations.flatMap((item) => {
        const issues: string[] = [];
        if (item.averageFps < 50) issues.push(`${item.viewport} 平均帧率低于 50 FPS`);
        if (item.p95FrameMs > 25) issues.push(`${item.viewport} P95 单帧超过 25ms`);
        if (item.inputLatencyMs > 100) issues.push(`${item.viewport} 输入反馈超过 100ms`);
        if (item.longTaskCount > 0) issues.push(`${item.viewport} 检测到 ${item.longTaskCount} 次长任务`);
        if (item.heapUsedMb !== null && item.heapUsedMb > 128) issues.push(`${item.viewport} JS 内存超过 128MB`);
        return issues;
      }),
    },
    {
      kind: "accessibility",
      errors: observations.flatMap((item) => {
        const issues: string[] = [];
        if (item.minimumTouchTargetPx < 44) issues.push(`${item.viewport} 主要触控目标小于 44px`);
        if (!item.reducedMotionSupported) issues.push(`${item.viewport} 未支持减少动态效果`);
        if (!item.focusVisible) issues.push(`${item.viewport} 键盘焦点不可见`);
        if (!item.audioCanMute) issues.push(`${item.viewport} 没有静音能力`);
        if (!item.audioCanResume) issues.push(`${item.viewport} 音频不能在用户操作后恢复`);
        if (!item.pausesOnBlur) issues.push(`${item.viewport} 页面失焦后没有暂停`);
        return issues;
      }),
    },
  ];
  const capturedAt = new Date().toISOString();
  const evidence: QualityEvidence[] = [];
  let assertions = project.assertions;
  for (const group of groups) {
    const assertion = project.assertions.find((item) => item.kind === group.kind);
    if (!assertion) continue;
    const evidenceId = stableId("EVIDENCE", `${build.id}:${assertion.id}:browser`);
    evidence.push({
      id: evidenceId, assertionId: assertion.id, buildId: build.id, kind: "metric", capturedAt,
      value: group.errors.length === 0 ? JSON.stringify(observations.map(({ screenshotDataUrl: _screenshot, ...item }) => item)) : group.errors.join("；"),
      specHash: build.specHash, codeHash: build.codeHash, assetManifestHash: build.assetManifestHash,
    });
    assertions = assertions.map((item) => item.id === assertion.id ? {
      ...item,
      status: group.errors.length === 0 ? "passed" : "failed",
      message: group.errors.length === 0 ? "真实浏览器检查通过" : group.errors.join("；"),
      evidenceIds: [evidenceId],
    } : item);
  }
  const viewportAssertion = project.assertions.find((item) => item.kind === "viewport");
  const screenshots: QualityEvidence[] = !viewportAssertion ? [] : observations
    .filter((item) => item.screenshotDataUrl)
    .map((item) => ({
      id: stableId("EVIDENCE", `${build.id}:${viewportAssertion.id}:screenshot:${item.viewport}`),
      assertionId: viewportAssertion.id, buildId: build.id, kind: "screenshot", capturedAt,
      value: JSON.stringify({ viewport: item.viewport, dataUrl: item.screenshotDataUrl }),
      specHash: build.specHash, codeHash: build.codeHash, assetManifestHash: build.assetManifestHash,
    }));
  if (viewportAssertion && screenshots.length > 0) assertions = assertions.map((item) => item.id === viewportAssertion.id
    ? { ...item, evidenceIds: [...item.evidenceIds, ...screenshots.map((shot) => shot.id)] }
    : item);
  return {
    assertions,
    evidence: [...evidence, ...screenshots],
    errors,
  };
}

export function applyExperienceReview(
  project: StudioProject,
  build: BuildManifest,
  review: ExperienceReview,
): { assertions: AcceptanceAssertion[]; evidence: QualityEvidence[]; errors: string[] } {
  const errors: string[] = [];
  if (new Set(review.reviewerRoles).size !== 2) errors.push("必须由玩法设计与界面体验两个互补视角复核");
  if (!review.understoodWithin30Seconds) errors.push("30 秒内无法理解目标和首个动作");
  if (!review.coreLoopInFirstSession) errors.push("第一局没有出现核心循环");
  if (!review.meaningfulChoice) errors.push("缺少会改变局面的选择");
  if (!review.feedbackSupportsRules) errors.push("反馈没有服务规则判断");
  if (!review.failureIsFairAndExplained) errors.push("失败不公平或不可解释");
  if (!review.wantsToRetry) errors.push("失败后缺少重试意愿");
  if (!review.desktopComfortable || !review.mobileComfortable) errors.push("桌面或手机无法舒适完成一局");
  if (review.delightSignals.length < 1 || review.delightSignals.length > 3) {
    errors.push("必须记录 1–3 个可观察爽点信号");
  }
  const assertion = project.assertions.find((item) => item.kind === "manual");
  if (!assertion) return { assertions: project.assertions, evidence: [], errors: ["缺少人工体验验收项"] };
  const evidenceId = stableId("EVIDENCE", `${build.id}:${assertion.id}:manual`);
  const evidence: QualityEvidence = {
    id: evidenceId,
    assertionId: assertion.id,
    buildId: build.id,
    kind: "manual-note",
    capturedAt: new Date().toISOString(),
    value: JSON.stringify({ ...review, note: review.note.slice(0, 500) }),
    specHash: build.specHash,
    codeHash: build.codeHash,
    assetManifestHash: build.assetManifestHash,
  };
  return {
    assertions: project.assertions.map((item) =>
      item.id === assertion.id
        ? {
            ...item,
            status: errors.length === 0 ? "passed" : "failed",
            message: errors.length === 0 ? "真人试玩确认核心体验" : errors.join("；"),
            evidenceIds: [evidenceId],
          }
        : item,
    ),
    evidence: [evidence],
    errors,
  };
}

export const passingViewportObservation = (viewport: string): ViewportObservation => ({
  viewport,
  coreLoopCompleted: true,
  horizontalOverflow: false,
  controlsObscurePlayfield: false,
  minimumTouchTargetPx: 48,
  averageFps: 60,
  p95FrameMs: 16.7,
  inputLatencyMs: 12,
  longTaskCount: 0,
  heapUsedMb: null,
  screenshotDataUrl: null,
  consoleErrors: 0,
  missingAssets: 0,
  reducedMotionSupported: true,
  focusVisible: true,
  audioCanMute: true,
  audioCanResume: true,
  pausesOnBlur: true,
});
