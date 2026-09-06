export const ENGINE_SCORE_DIMENSIONS = [
  { id: "project-mapping", label: "GameProjectV3 可映射性", weight: 20 },
  { id: "deterministic-build", label: "无头构建与确定性", weight: 15 },
  { id: "web-runtime", label: "Web 运行质量", weight: 15 },
  { id: "agent-control", label: "Agent 可控性", weight: 15 },
  { id: "publishing-increment", label: "发布能力增量", weight: 10 },
  { id: "asset-package", label: "资源与包体", weight: 10 },
  { id: "openness-exit", label: "开放性与退出成本", weight: 10 },
  { id: "maintenance-ecosystem", label: "维护与生态", weight: 5 },
] as const;

export type EngineScoreDimensionId = typeof ENGINE_SCORE_DIMENSIONS[number]["id"];

export const ENGINE_HARD_GATES = [
  { id: "no-required-uncontrolled-cloud", label: "构建不依赖不可控云服务" },
  { id: "version-lock", label: "引擎和工具链版本可冻结" },
  { id: "offline-artifact", label: "发布物可离线、自包含运行" },
  { id: "declared-runtime-content", label: "远程资源、追踪与许可均可声明审计" },
  { id: "diagnostic-traceability", label: "错误可映射回稳定工程 ID" },
  { id: "quality-gates-compatible", label: "无需绕过平台质量门禁" },
  { id: "non-professional-default", label: "默认流程不要求用户理解或选择引擎" },
] as const;

export type EngineHardGateId = typeof ENGINE_HARD_GATES[number]["id"];
export type GateStatus = "pass" | "fail" | "unknown";
export type EngineDisposition = "baseline" | "evaluate" | "compare" | "observe" | "reject";

export interface EngineLicenseComponent {
  component: string;
  scope: "runtime" | "editor" | "tooling" | "examples" | "cloud-service";
  license: string;
  sourceUrl: string;
  redistributable: boolean | "review-required";
}

export interface EngineCandidate {
  id: string;
  name: string;
  disposition: EngineDisposition;
  primaryValue: string;
  versionPolicy: string;
  capabilities: string[];
  targets: string[];
  automation: {
    cli: boolean | "partial" | "unknown";
    headlessBuild: boolean | "partial" | "unknown";
    stableTextProject: boolean | "partial" | "unknown";
  };
  cloudRequiredForBuild: boolean | "unknown";
  exportWithoutService: boolean | "partial" | "unknown";
  licenses: EngineLicenseComponent[];
  evidenceUrls: string[];
  notes: string[];
}

export interface EngineCandidateCatalog {
  catalogVersion: 1;
  reviewedAt: string;
  engines: EngineCandidate[];
}

export interface DimensionAssessment {
  score: number;
  evidence: string[];
}

export interface GateAssessment {
  status: GateStatus;
  evidence: string[];
}

export interface BenchmarkResult {
  benchmarkId: "B1" | "B2" | "B3";
  status: "pass" | "fail" | "not-run";
  evidence: string[];
}

export interface EngineAssessmentInput {
  engineId: string;
  engineVersion: string;
  evaluatedAt: string;
  dimensions: Record<EngineScoreDimensionId, DimensionAssessment>;
  gates: Record<EngineHardGateId, GateAssessment>;
  benchmarks: BenchmarkResult[];
}

export interface EngineAssessmentResult extends EngineAssessmentInput {
  weightedScore: number;
  allHardGatesPassed: boolean;
  failedGateIds: EngineHardGateId[];
  unresolvedGateIds: EngineHardGateId[];
  recommendation: "adopt" | "evaluate" | "observe" | "reject";
  adoptionEligible: boolean;
}

export interface EngineBenchmarkDefinition {
  id: "B1" | "B2" | "B3";
  name: string;
  kind: "2d-action" | "2d-logic" | "limited-3d";
  fixtureId: string;
  purpose: string;
  requiredCapabilities: string[];
  probeIds: string[];
}
