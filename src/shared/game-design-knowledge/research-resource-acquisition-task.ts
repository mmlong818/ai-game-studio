import { z } from "zod";
import { researchResourceAcquisitionPlanSchema, type ResearchResourceAcquisitionPlan } from "./research-resource-acquisition.js";

const id = z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const text = z.string().trim().min(1).max(500);
const evidenceKindSchema = z.enum(["resource-file", "generator-config", "license-record", "visual-review", "runtime-report"]);
const artifactReference = z.string().trim().min(1).max(300).refine((value) => !value.includes("..") && !value.startsWith("/") && !value.startsWith("\\") && !/^[A-Za-z]:[\\/]/.test(value), "证据引用必须是安全的相对路径或归档 ID");

export const researchResourceEvidenceSchema = z.object({ kind: evidenceKindSchema, reference: artifactReference, note: text }).strict();
export const researchResourceSubmissionInputSchema = z.object({
  note: text,
  evidence: z.array(researchResourceEvidenceSchema).min(1).max(20),
  verifiedLicense: z.object({ licenseId: z.string().trim().min(1).max(120), sourceUrl: z.string().url(), obligations: z.array(text).max(20) }).strict().optional(),
}).strict();
export const researchResourceReviewInputSchema = z.object({ decision: z.enum(["approve", "return"]), rationale: text }).strict();

const resourceSubmissionSchema = researchResourceSubmissionInputSchema.extend({ id, submittedAt: z.string().datetime() }).strict();
const resourceReviewSchema = researchResourceReviewInputSchema.extend({ id, reviewedAt: z.string().datetime(), submissionId: id }).strict();

export const researchResourceAcquisitionWorkItemSchema = z.object({
  id,
  requirementId: id,
  route: z.enum(["reuse-existing", "procedural-generate", "procure", "create"]),
  state: z.enum(["prototype-ready", "awaiting-binding-approval", "awaiting-license-review", "awaiting-asset-review", "submitted-for-review", "approved", "returned"]),
  automatedPreparation: z.boolean(),
  selectedFamilyId: z.string().min(1).nullable(),
  suggestedPaths: z.array(z.string().min(1)).max(12),
  missingVariants: z.array(z.string().min(1)),
  license: z.object({ status: z.enum(["verified", "pending", "not-required"]), licenseId: z.string().min(1).nullable(), sourceUrl: z.string().url().nullable(), obligations: z.array(z.string().min(1)) }).strict(),
  title: text,
  deliverable: text,
  checklist: z.array(text).min(1),
  completionRule: text,
  submissions: z.array(resourceSubmissionSchema).default([]),
  reviews: z.array(resourceReviewSchema).default([]),
}).strict();

export const researchResourceAcquisitionTaskSchema = z.object({
  schemaVersion: z.literal("research-resource-acquisition-task-v1"),
  id,
  researchTaskId: id,
  evaluationId: id,
  sourcePlanGeneratedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  status: z.enum(["prepared", "in-progress", "review-ready", "completed"]),
  items: z.array(researchResourceAcquisitionWorkItemSchema).min(1),
  summary: z.object({
    total: z.number().int().nonnegative(),
    prototypeReady: z.number().int().nonnegative(),
    awaitingBindingApproval: z.number().int().nonnegative(),
    awaitingLicenseReview: z.number().int().nonnegative(),
    awaitingAssetReview: z.number().int().nonnegative(),
    submitted: z.number().int().nonnegative().default(0),
    approved: z.number().int().nonnegative().default(0),
    returned: z.number().int().nonnegative().default(0),
  }).strict(),
  safetyBoundaries: z.array(text).min(1),
}).strict();

export type ResearchResourceAcquisitionTask = z.infer<typeof researchResourceAcquisitionTaskSchema>;
export type ResearchResourceSubmissionInput = z.input<typeof researchResourceSubmissionInputSchema>;
export type ResearchResourceReviewInput = z.input<typeof researchResourceReviewInputSchema>;

const details = (decision: ResearchResourceAcquisitionPlan["decisions"][number]) => {
  if (decision.route === "reuse-existing") return {
    state: "awaiting-binding-approval" as const,
    automatedPreparation: false,
    title: `确认并批准 ${decision.requirementId} 的库内绑定`,
    checklist: ["查看候选资源与实际玩法状态是否语义一致", "确认全部状态变体和触控可读性", "批准绑定后重跑资源与浏览器验收"],
    completionRule: "人工确认语义、状态、许可与运行时证据后才能批准绑定。",
  };
  if (decision.route === "procedural-generate") return {
    state: "prototype-ready" as const,
    automatedPreparation: true,
    title: `保留 ${decision.requirementId} 的程序化原型方案`,
    checklist: ["固定生成参数或随机种子", "保存程序化资源配置与输出证据", "进入评审前确认是否需要正式美术替换"],
    completionRule: "只证明原型阶段可用；评审或发布要求必须按原资源合同另行验收。",
  };
  if (decision.route === "procure") return {
    state: "awaiting-license-review" as const,
    automatedPreparation: false,
    title: `为 ${decision.requirementId} 调研并取得许可资源`,
    checklist: ["只从作者或官方分发页选择候选", "保存许可正文、来源网址、作者和取得日期", "复核商业使用、修改与再分发权利", "入库后校验文件哈希并完成人工内容审核"],
    completionRule: "许可证据、权利范围和实际文件都齐全后，才允许转入资源库。",
  };
  return {
    state: "awaiting-asset-review" as const,
    automatedPreparation: false,
    title: `创作并复核 ${decision.requirementId}`,
    checklist: ["按缺失状态形成制作简报", "生成或制作全部要求的变体", "检查风格一致性、状态可辨识度和技术规格", "记录项目所有权并通过浏览器实际使用验收"],
    completionRule: "成品、所有权记录、人工复核和运行时证据全部齐全后才算完成。",
  };
};

export function createResearchResourceAcquisitionTask(
  researchTaskId: string,
  evaluationId: string,
  rawPlan: unknown,
  now = new Date(),
): ResearchResourceAcquisitionTask {
  const plan = researchResourceAcquisitionPlanSchema.parse(rawPlan);
  const items = plan.decisions.map((decision) => researchResourceAcquisitionWorkItemSchema.parse({
    id: `ACQUIRE:${decision.requirementId}`,
    requirementId: decision.requirementId,
    route: decision.route,
    selectedFamilyId: decision.selectedFamilyId,
    suggestedPaths: decision.suggestedPaths,
    missingVariants: decision.missingVariants,
    license: decision.license,
    deliverable: decision.deliverable,
    ...details(decision),
  }));
  const count = (state: ResearchResourceAcquisitionTask["items"][number]["state"]) => items.filter((item) => item.state === state).length;
  return researchResourceAcquisitionTaskSchema.parse({
    schemaVersion: "research-resource-acquisition-task-v1",
    id: `ACQUISITION:${researchTaskId}`,
    researchTaskId,
    evaluationId,
    sourcePlanGeneratedAt: plan.generatedAt,
    createdAt: now.toISOString(),
    status: "prepared",
    items,
    summary: {
      total: items.length,
      prototypeReady: count("prototype-ready"),
      awaitingBindingApproval: count("awaiting-binding-approval"),
      awaitingLicenseReview: count("awaiting-license-review"),
      awaitingAssetReview: count("awaiting-asset-review"),
      submitted: 0,
      approved: 0,
      returned: 0,
    },
    safetyBoundaries: [
      "生成任务不等于素材已经获得、许可已经批准或绑定已经完成。",
      "系统不会自动购买资源，也不会代表操作者接受第三方条款。",
      "采购、创作和库内绑定都必须保留人工复核与运行时验收。",
    ],
  });
}

function requiredEvidenceKinds(route: ResearchResourceAcquisitionTask["items"][number]["route"]) {
  if (route === "procedural-generate") return ["generator-config", "resource-file", "visual-review", "runtime-report"] as const;
  if (route === "procure") return ["resource-file", "license-record", "visual-review", "runtime-report"] as const;
  return ["resource-file", "visual-review", "runtime-report"] as const;
}

function recalculate(rawTask: ResearchResourceAcquisitionTask, items: ResearchResourceAcquisitionTask["items"]): ResearchResourceAcquisitionTask {
  const count = (state: ResearchResourceAcquisitionTask["items"][number]["state"]) => items.filter((item) => item.state === state).length;
  const approved = count("approved");
  const submitted = count("submitted-for-review");
  const returned = count("returned");
  const status = approved === items.length
    ? "completed" as const
    : submitted > 0 && items.every(({ state }) => state === "submitted-for-review" || state === "approved")
      ? "review-ready" as const
      : items.some(({ submissions, reviews }) => submissions.length > 0 || reviews.length > 0)
        ? "in-progress" as const
        : "prepared" as const;
  return researchResourceAcquisitionTaskSchema.parse({ ...rawTask, status, items, summary: {
    total: items.length,
    prototypeReady: count("prototype-ready"),
    awaitingBindingApproval: count("awaiting-binding-approval"),
    awaitingLicenseReview: count("awaiting-license-review"),
    awaitingAssetReview: count("awaiting-asset-review"),
    submitted, approved, returned,
  } });
}

export function submitResearchResourceAcquisitionWork(
  rawTask: ResearchResourceAcquisitionTask,
  requirementId: string,
  rawInput: ResearchResourceSubmissionInput,
  now = new Date(),
): ResearchResourceAcquisitionTask {
  const task = researchResourceAcquisitionTaskSchema.parse(rawTask);
  const input = researchResourceSubmissionInputSchema.parse(rawInput);
  const index = task.items.findIndex((item) => item.requirementId === requirementId);
  if (index < 0) throw new Error("资源执行任务中不存在该需求");
  const item = task.items[index]!;
  if (item.state === "approved") throw new Error("已经批准的资源成果不能重复提交");
  if (item.state === "submitted-for-review") throw new Error("当前成果正在等待复核，不能重复提交");
  const kinds = new Set(input.evidence.map(({ kind }) => kind));
  const missing = requiredEvidenceKinds(item.route).filter((kind) => !kinds.has(kind));
  if (missing.length) throw new Error(`资源成果缺少必需证据：${missing.join("、")}`);
  if (item.route === "procure" && !input.verifiedLicense) throw new Error("采购资源提交前必须补齐已核验许可记录");
  if (item.route !== "procure" && input.verifiedLicense) throw new Error("只有采购路线可以在成果提交时补录第三方许可");
  const submission = resourceSubmissionSchema.parse({ ...input, id: `SUBMISSION-${item.submissions.length + 1}`, submittedAt: now.toISOString() });
  const license = input.verifiedLicense
    ? { status: "verified" as const, licenseId: input.verifiedLicense.licenseId, sourceUrl: input.verifiedLicense.sourceUrl, obligations: input.verifiedLicense.obligations }
    : item.license;
  const items = task.items.map((current, itemIndex) => itemIndex === index ? { ...current, state: "submitted-for-review" as const, license, submissions: [...current.submissions, submission] } : current);
  return recalculate(task, items);
}

export function reviewResearchResourceAcquisitionWork(
  rawTask: ResearchResourceAcquisitionTask,
  requirementId: string,
  rawInput: ResearchResourceReviewInput,
  now = new Date(),
): ResearchResourceAcquisitionTask {
  const task = researchResourceAcquisitionTaskSchema.parse(rawTask);
  const input = researchResourceReviewInputSchema.parse(rawInput);
  const index = task.items.findIndex((item) => item.requirementId === requirementId);
  if (index < 0) throw new Error("资源执行任务中不存在该需求");
  const item = task.items[index]!;
  if (item.state !== "submitted-for-review") throw new Error("只有已提交且等待复核的资源成果才能批准或退回");
  const submission = item.submissions.at(-1);
  if (!submission) throw new Error("资源成果缺少对应提交记录");
  const review = resourceReviewSchema.parse({ ...input, id: `REVIEW-${item.reviews.length + 1}`, submissionId: submission.id, reviewedAt: now.toISOString() });
  const items = task.items.map((current, itemIndex) => itemIndex === index ? { ...current, state: input.decision === "approve" ? "approved" as const : "returned" as const, reviews: [...current.reviews, review] } : current);
  return recalculate(task, items);
}
