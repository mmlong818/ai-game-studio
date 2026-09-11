import {
  revisionPlanSchema,
  revisionPlanResponseSchema,
  type ProjectDetail,
  type RevisionAssetCandidate,
  type RevisionAssetTarget,
  type RevisionOperation,
  type RevisionPlan,
} from "../shared/contracts.js";
import { revisionAssetCandidates } from "./image-generator.js";

const gameplayPattern = /墨量|能量|消耗|数值|速度|难度|伤害|生命|得分|分数|规则|玩法|关卡|碰撞|操作|冷却|生成间隔/;
const visualStylePattern = /美术风格|画风|视觉风格|配色|材质|绘本|水彩|像素风|卡通风/;
const assetPattern = /角色|人物|唐僧|妖精|小妖|厉妖|封面|背景|图片|图标|素材|精灵|动画|动图|sprite/i;
const allRolesPattern = /(?:所有|全部|全体|每个)?(?:人物)?角色|所有人物|全部人物/;

function selectedAssetTargets(content: string, candidates: RevisionAssetCandidate[]): RevisionAssetTarget[] {
  const animation = /精灵|动画|动图|sprite/i.test(content) ? "sprite-sheet" as const : undefined;
  const selected = allRolesPattern.test(content)
    ? candidates.filter((candidate) => candidate.kind === "role")
    : candidates.filter((candidate) => content.includes(candidate.label));
  return selected.map(({ file, label, supportsAnimation }) => ({
    file,
    label,
    ...(animation && supportsAnimation ? { animation } : {}),
  }));
}

export function planProjectRevision(project: ProjectDetail, rawContent: string) {
  const content = rawContent.trim();
  if (content.length < 2) throw new Error("请说明这次要修改的内容。");
  const clauses = content.split(/[，,。；;\n]|同时|并且/).map((clause) => clause.trim()).filter(Boolean);
  const scopedContent = (pattern: RegExp) => clauses.filter((clause) => pattern.test(clause)).join("，") || content;
  const candidates = revisionAssetCandidates(project);
  const operations: RevisionOperation[] = [];
  const hasAssetIntent = assetPattern.test(content);
  const targets = hasAssetIntent ? selectedAssetTargets(content, candidates) : [];
  const unsupportedAnimation = /精灵|动画|动图|sprite/i.test(content) && targets.some((target) => target.animation !== "sprite-sheet");
  if (hasAssetIntent && targets.length && !unsupportedAnimation) operations.push({ scope: "assets", content: scopedContent(assetPattern), targets });
  if (visualStylePattern.test(content)) operations.push({ scope: "visual-style", content: scopedContent(visualStylePattern) });
  if (gameplayPattern.test(content)) operations.push({
    scope: "gameplay",
    content: scopedContent(gameplayPattern),
  });
  if (!operations.length && !hasAssetIntent) operations.push({ scope: "gameplay", content });
  const recommended = new Set((unsupportedAnimation ? [] : targets).map((target) => target.file));
  const revisionPlan: RevisionPlan = revisionPlanSchema.parse({
    sourceProjectId: project.id,
    sourceVersionId: project.version.id,
    content,
    operations,
  });
  return revisionPlanResponseSchema.parse({
    status: hasAssetIntent && (targets.length === 0 || unsupportedAnimation) ? "selection-required" : "ready",
    revisionPlan,
    candidates: candidates.map((candidate) => ({ ...candidate, recommended: recommended.has(candidate.file) })),
    recommendedTargetFiles: [...recommended],
  });
}

export function validateRevisionPlan(project: ProjectDetail, rawPlan: RevisionPlan, content: string) {
  const plan = revisionPlanSchema.parse(rawPlan);
  if (plan.sourceProjectId !== project.id || plan.sourceVersionId !== project.version.id) {
    throw new Error("来源游戏版本已经变化，请重新检查并确认这次修改。");
  }
  if (plan.content !== content.trim()) throw new Error("修改内容已变化，请重新检查并确认这次修改。");
  const allowed = new Map(revisionAssetCandidates(project).map((candidate) => [candidate.file, candidate]));
  for (const operation of plan.operations) {
    if (operation.scope !== "assets") continue;
    for (const target of operation.targets) {
      const candidate = allowed.get(target.file);
      if (!candidate || candidate.label !== target.label) throw new Error("修改计划包含当前游戏没有的资源，请重新选择。");
      if (target.animation && !candidate.supportsAnimation) throw new Error(`“${target.label}”当前不支持动画升级，请重新选择。`);
    }
  }
  return plan;
}
