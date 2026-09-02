import { stableId } from "./hash";
import type {
  AnonymousQualityEvent,
  InputMethod,
  StudioProject,
} from "./platformTypes";

const REASON_CODE = /^[a-z0-9-]{1,48}$/;

export interface QualityEventInput {
  event: AnonymousQualityEvent["event"];
  viewport: string;
  input: InputMethod;
  ruleId?: string;
  reasonCode?: string;
  numericValue?: number;
}

export function recordQualityEvent(
  project: StudioProject,
  input: QualityEventInput,
): StudioProject {
  if (!project.activeBuildId) throw new Error("没有活动构建，不能记录质量事件。");
  if (input.reasonCode && !REASON_CODE.test(input.reasonCode)) {
    throw new Error("失败原因只能使用预定义短代码，不能保存自由文本或个人信息。");
  }
  if (input.viewport.length > 24) throw new Error("视口标识无效。");
  const occurredAt = new Date().toISOString();
  const event: AnonymousQualityEvent = {
    id: stableId(
      "EVENT",
      `${project.id}:${project.activeBuildId}:${input.event}:${occurredAt}:${project.qualityEvents.length}`,
    ),
    projectId: project.id,
    buildId: project.activeBuildId,
    event: input.event,
    occurredAt,
    viewport: input.viewport,
    input: input.input,
    ...(input.ruleId ? { ruleId: input.ruleId } : {}),
    ...(input.reasonCode ? { reasonCode: input.reasonCode } : {}),
    ...(input.numericValue === undefined ? {} : { numericValue: input.numericValue }),
  };
  return { ...project, qualityEvents: [...project.qualityEvents, event] };
}

export function summarizeQualityEvents(project: StudioProject): {
  sessions: number;
  completed: number;
  failed: number;
  retries: number;
  averageFps: number | null;
  failureReasons: Record<string, number>;
} {
  const performance = project.qualityEvents
    .filter((item) => item.event === "performance" && item.numericValue !== undefined)
    .map((item) => item.numericValue as number);
  const failureReasons = project.qualityEvents
    .filter((item) => item.event === "failed" && item.reasonCode)
    .reduce<Record<string, number>>((summary, item) => {
      const reason = item.reasonCode as string;
      summary[reason] = (summary[reason] ?? 0) + 1;
      return summary;
    }, {});
  return {
    sessions: project.qualityEvents.filter((item) => item.event === "session-start").length,
    completed: project.qualityEvents.filter((item) => item.event === "completed").length,
    failed: project.qualityEvents.filter((item) => item.event === "failed").length,
    retries: project.qualityEvents.filter((item) => item.event === "retry").length,
    averageFps:
      performance.length === 0
        ? null
        : performance.reduce((total, value) => total + value, 0) / performance.length,
    failureReasons,
  };
}
