import { z } from "zod";
import type { GameDesignContractV1 } from "../game-design-contract/index.js";

const id = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

export const onboardingRuntimeStepSchema = z.object({
  id,
  mechanicId: id,
  successSignal: id,
  instruction: z.string().trim().min(1).max(240),
  safeState: z.string().trim().min(1).max(240),
  inputHelp: z.object({
    keyboard: z.string().trim().min(1).max(240).nullable(),
    pointer: z.string().trim().min(1).max(240).nullable(),
    touch: z.string().trim().min(1).max(240).nullable(),
  }).strict(),
  skippable: z.boolean(),
  replayable: z.boolean(),
}).strict();

export const onboardingRuntimePlanSchema = z.object({
  schemaVersion: z.literal("onboarding-runtime-plan-v1"),
  contractId: id,
  steps: z.array(onboardingRuntimeStepSchema).min(1),
}).strict();

export type OnboardingRuntimePlan = z.infer<typeof onboardingRuntimePlanSchema>;
export type OnboardingRuntimeStatus = "not-started" | "active" | "completed" | "skipped";
export type OnboardingRuntimeSnapshot = {
  schemaVersion: "onboarding-runtime-state-v1";
  status: OnboardingRuntimeStatus;
  activeStepId: string | null;
  completedStepIds: string[];
  skippedStepIds: string[];
  acceptedSignals: Array<{ stepId: string; signal: string }>;
};

export function createOnboardingRuntimePlan(contract: GameDesignContractV1): OnboardingRuntimePlan | null {
  if (contract.onboarding.length === 0) return null;
  return onboardingRuntimePlanSchema.parse({
    schemaVersion: "onboarding-runtime-plan-v1",
    contractId: contract.id,
    steps: contract.onboarding.map((step) => ({
      id: step.id,
      mechanicId: step.teachesMechanicId,
      successSignal: step.successSignal,
      instruction: step.requiredAction,
      safeState: step.safeState,
      inputHelp: {
        keyboard: step.deviceVariants.keyboard ?? null,
        pointer: step.deviceVariants.pointer ?? null,
        touch: step.deviceVariants.touch ?? null,
      },
      skippable: step.dismissal.skippable,
      replayable: step.dismissal.replayable,
    })),
  });
}

export function initialOnboardingRuntimeSnapshot(): OnboardingRuntimeSnapshot {
  return {
    schemaVersion: "onboarding-runtime-state-v1",
    status: "not-started",
    activeStepId: null,
    completedStepIds: [],
    skippedStepIds: [],
    acceptedSignals: [],
  };
}

export type OnboardingRuntimeCommand =
  | { type: "start" }
  | { type: "signal"; signal: string }
  | { type: "skip" }
  | { type: "replay" };

export function reduceOnboardingRuntime(
  plan: OnboardingRuntimePlan,
  previous: OnboardingRuntimeSnapshot,
  command: OnboardingRuntimeCommand,
): OnboardingRuntimeSnapshot {
  const state = structuredClone(previous);
  const firstIncomplete = () => plan.steps.find(({ id }) => !state.completedStepIds.includes(id) && !state.skippedStepIds.includes(id));
  if (command.type === "replay") return { ...initialOnboardingRuntimeSnapshot(), status: "active", activeStepId: plan.steps[0].id };
  if (command.type === "start") {
    if (state.status === "completed" || state.status === "skipped") return state;
    const step = firstIncomplete();
    return { ...state, status: step ? "active" : "completed", activeStepId: step?.id ?? null };
  }
  const active = plan.steps.find(({ id }) => id === state.activeStepId);
  if (state.status !== "active" || !active) return state;
  if (command.type === "skip") {
    if (!active.skippable) return state;
    const remaining = plan.steps.filter(({ id }) => !state.completedStepIds.includes(id)).map(({ id }) => id);
    return { ...state, status: "skipped", activeStepId: null, skippedStepIds: [...new Set([...state.skippedStepIds, ...remaining])] };
  }
  if (command.signal !== active.successSignal) return state;
  state.completedStepIds = [...new Set([...state.completedStepIds, active.id])];
  state.acceptedSignals = [...state.acceptedSignals, { stepId: active.id, signal: command.signal }];
  const next = firstIncomplete();
  return { ...state, status: next ? "active" : "completed", activeStepId: next?.id ?? null };
}

export function restoreOnboardingRuntimeSnapshot(plan: OnboardingRuntimePlan, input: unknown): OnboardingRuntimeSnapshot {
  if (!input || typeof input !== "object") return initialOnboardingRuntimeSnapshot();
  const raw = input as Partial<OnboardingRuntimeSnapshot>;
  const knownIds = new Set(plan.steps.map(({ id }) => id));
  const completedStepIds = Array.isArray(raw.completedStepIds) ? raw.completedStepIds.filter((value): value is string => typeof value === "string" && knownIds.has(value)) : [];
  const skippedStepIds = Array.isArray(raw.skippedStepIds) ? raw.skippedStepIds.filter((value): value is string => typeof value === "string" && knownIds.has(value)) : [];
  if (completedStepIds.length === plan.steps.length) return { ...initialOnboardingRuntimeSnapshot(), status: "completed", completedStepIds };
  if (skippedStepIds.length > 0) return { ...initialOnboardingRuntimeSnapshot(), status: "skipped", completedStepIds, skippedStepIds };
  return { ...initialOnboardingRuntimeSnapshot(), completedStepIds };
}
