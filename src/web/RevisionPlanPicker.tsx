import { useState } from "react";
import type { RevisionAssetCandidate, RevisionAssetTarget, RevisionOperation, RevisionPlan } from "../shared/contracts";
import { planProjectRevision } from "./api";
import { FailureDetails } from "../components/FailureDetails";

type PlannedRevision = Awaited<ReturnType<typeof planProjectRevision>>;

const scopeCopy: Record<RevisionOperation["scope"], { title: string; detail: string }> = {
  gameplay: { title: "玩法与数值", detail: "保留未点名的规则与操作。" },
  assets: { title: "资源与角色", detail: "只替换你选中的资源；未选资源保持不变。" },
  "visual-style": { title: "画面风格", detail: "调整色彩、质感和插画表现，不改变玩法和布局。" },
};

function assetTarget(candidate: RevisionAssetCandidate, animate: boolean): RevisionAssetTarget {
  return {
    file: candidate.file,
    label: candidate.label,
    ...(animate && candidate.supportsAnimation ? { animation: "sprite-sheet" as const } : {}),
  };
}

function isSelectableCandidate(candidate: RevisionAssetCandidate | undefined, animationRequested: boolean): candidate is RevisionAssetCandidate {
  return candidate !== undefined && (!animationRequested || candidate.supportsAnimation);
}

function planWithSelections(response: PlannedRevision, selectedOperationIds: Set<string>, selectedFiles: Set<string>): RevisionPlan | null {
  const hasAnimatedAssetOperation = response.revisionPlan.operations.some(operation => operation.scope === "assets" && operation.targets.some(target => target.animation === "sprite-sheet"));
  const animationRequested = /精灵|动画|动图|sprite/i.test(response.revisionPlan.content);
  const candidates = new Map(response.candidates.map(candidate => [candidate.file, candidate]));
  const selectedOperations: RevisionOperation[] = [];
  response.revisionPlan.operations.forEach((operation, index) => {
    if (!selectedOperationIds.has(`${operation.scope}-${index}`)) return;
    if (operation.scope !== "assets") { selectedOperations.push(operation); return; }
    const targets = [...selectedFiles]
      .map(file => candidates.get(file))
      .filter(candidate => isSelectableCandidate(candidate, animationRequested))
      .map(candidate => assetTarget(candidate, hasAnimatedAssetOperation));
    if (targets.length) selectedOperations.push({ ...operation, targets });
  });
  // Ambiguous asset language deliberately arrives as an empty preflight plan.
  // Choosing concrete candidates is the user's explicit permission to add this operation.
  if (response.status === "selection-required" && selectedFiles.size) {
    const targets = [...selectedFiles]
      .map(file => candidates.get(file))
      .filter(candidate => isSelectableCandidate(candidate, animationRequested))
      .map(candidate => assetTarget(candidate, animationRequested));
    if (targets.length) selectedOperations.push({ scope: "assets", content: response.revisionPlan.content, targets });
  }
  return selectedOperations.length ? { ...response.revisionPlan, operations: selectedOperations } : null;
}

export function RevisionPlanPicker({
  projectId,
  content,
  onContentChange,
  disabled = false,
  inputId = "revision-message",
  inputLabel = "具体想调整什么？",
  placeholder,
  submitLabel,
  onConfirm,
}: {
  projectId: string;
  content: string;
  onContentChange: (content: string) => void;
  disabled?: boolean;
  inputId?: string;
  inputLabel?: string;
  placeholder?: string;
  submitLabel: string;
  onConfirm: (plan: RevisionPlan) => Promise<void> | void;
}) {
  const [response, setResponse] = useState<PlannedRevision | null>(null);
  const [selectedOperationIds, setSelectedOperationIds] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [planning, setPlanning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const updateContent = (value: string) => {
    onContentChange(value);
    setResponse(null);
    setSelectedOperationIds(new Set());
    setSelectedFiles(new Set());
    setError(null);
  };
  const analyse = async () => {
    if (disabled || planning || content.trim().length < 2) return;
    setPlanning(true); setError(null);
    try {
      const next = await planProjectRevision(projectId, content.trim());
      setResponse(next);
      setSelectedOperationIds(new Set(next.revisionPlan.operations.map((operation, index) => `${operation.scope}-${index}`)));
      const recommended = next.recommendedTargetFiles.length ? next.recommendedTargetFiles : next.candidates.filter(candidate => candidate.recommended).map(candidate => candidate.file);
      setSelectedFiles(new Set(recommended));
    } catch (reason) {
      setError(reason);
    } finally { setPlanning(false); }
  };
  const confirm = async () => {
    if (!response || confirming || disabled) return;
    const plan = planWithSelections(response, selectedOperationIds, selectedFiles);
    if (!plan) { setError("请至少保留一项要修改的内容，并为资源替换选择资源。"); return; }
    setConfirming(true); setError(null);
    try { await onConfirm(plan); }
    catch (reason) { setError(reason); }
    finally { setConfirming(false); }
  };
  const plan = response ? planWithSelections(response, selectedOperationIds, selectedFiles) : null;
  const hasAssets = response?.revisionPlan.operations.some(operation => operation.scope === "assets") || response?.status === "selection-required";
  const animationRequested = response ? /精灵|动画|动图|sprite/i.test(response.revisionPlan.content) : false;
  const compatibleAnimationCandidates = response?.candidates.filter(candidate => isSelectableCandidate(candidate, animationRequested)) ?? [];
  const noCompatibleAnimationTarget = response?.status === "selection-required" && animationRequested && compatibleAnimationCandidates.length === 0;

  return <section className="revision-plan-picker" aria-label="修改计划">
    <label htmlFor={inputId}>{inputLabel}</label>
    <textarea id={inputId} rows={4} minLength={2} maxLength={2000} value={content} onChange={event => updateContent(event.currentTarget.value)} placeholder={placeholder} disabled={disabled || planning || confirming} />
    {!response ? <>
      <p>可以一次描述几项互不冲突的调整。提交检查只会读取当前作品和资源，不会开始制作。</p>
      <button type="button" className="revision-primary primary-action" disabled={disabled || planning || content.trim().length < 2} onClick={() => void analyse()}>{planning ? "正在分析修改内容…" : "分析修改内容"}</button>
    </> : <>
      <section className="revision-plan-summary" aria-live="polite">
        <header><strong>{noCompatibleAnimationTarget ? "该资源不能升级为精灵动图" : response.status === "selection-required" ? "请选择要替换的资源" : "已识别的修改项"}</strong><button type="button" className="secondary-action" onClick={() => setResponse(null)} disabled={confirming}>返回修改文字</button></header>
        <p>选择需要保留的修改项。未选中的改动和资源不会进入本次制作。</p>
        <div className="revision-operation-list">
          {response.revisionPlan.operations.map((operation, index) => {
            const id = `${operation.scope}-${index}`;
            const copy = scopeCopy[operation.scope];
            const animated = operation.scope === "assets" && operation.targets.some(target => target.animation === "sprite-sheet");
            return <label key={id}><input type="checkbox" checked={selectedOperationIds.has(id)} onChange={event => { const checked = event.currentTarget.checked; setSelectedOperationIds(current => { const next = new Set(current); if (checked) next.add(id); else next.delete(id); return next; }); }} disabled={confirming} /><span><strong>{copy.title}{animated ? " · 生成可播放动画" : ""}</strong><small>{copy.detail}</small></span></label>;
          })}
        </div>
      </section>
      {(hasAssets || response.status === "selection-required") && <fieldset className="revision-resource-list" disabled={confirming}>
        <legend>这次替换哪些资源？</legend>
        <p>{animationRequested ? "这次请求可播放的精灵动图；只有已声明图集动画播放器的资源可以选择。" : "已推荐全部角色；背景、封面和其他未推荐资源不会自动选择。"}</p>
        {response.candidates.map(candidate => {
          const cannotSatisfyAnimation = animationRequested && !candidate.supportsAnimation;
          return <label key={candidate.file}><input type="checkbox" checked={selectedFiles.has(candidate.file)} disabled={confirming || cannotSatisfyAnimation} onChange={event => { const checked = event.currentTarget.checked; setSelectedFiles(current => { const next = new Set(current); if (checked) next.add(candidate.file); else next.delete(candidate.file); return next; }); }} /><span><strong>{candidate.label}{candidate.recommended ? "（推荐）" : ""}</strong><small>{candidate.kind === "role" ? candidate.supportsAnimation ? "角色 · 支持图集动画" : "角色" : candidate.kind === "background" ? "背景" : candidate.kind === "cover" ? "封面" : "其他资源"}{cannotSatisfyAnimation && candidate.animationUnavailableReason ? ` · ${candidate.animationUnavailableReason}` : ""}</small></span></label>;
        })}
      </fieldset>}
      {response.status === "selection-required" && <p role="status">{noCompatibleAnimationTarget ? "当前作品没有可升级为精灵动图的资源。请返回修改文字，选择支持播放动画的角色，或改为静态卡面修改。" : "需要你明确选择资源后才能继续；不会自动选择背景或封面。"}</p>}
      <p className="revision-plan-confirmation">本次将提交 {plan?.operations.length ?? 0} 项修改，确认后才会制作一个新版本并使用模型用量。</p>
      <button type="button" className="revision-primary primary-action" disabled={disabled || confirming || !plan} onClick={() => void confirm()}>{confirming ? "正在提交…" : submitLabel}</button>
    </>}
    {error ? <FailureDetails error={error} fallback="本次修改没有被确认。请保留当前文字和所选资源，按提示处理后再明确提交。" /> : null}
  </section>;
}
