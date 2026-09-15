import { useState } from "react";
import type { RevisionAssetCandidate, RevisionAssetTarget, RevisionOperation, RevisionPlan } from "../shared/contracts";
import { planProjectRevision } from "./api";
import { FailureDetails } from "../components/FailureDetails";
import { formatRevisionCopy, useRevisionCopy } from "./revision-i18n";

type PlannedRevision = Awaited<ReturnType<typeof planProjectRevision>>;

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
  inputLabel,
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
  const copy = useRevisionCopy();
  const scopeCopy: Record<RevisionOperation["scope"], { title: string; detail: string }> = {
    gameplay: { title: copy.gameplayTitle, detail: copy.gameplayDetail },
    assets: { title: copy.assetsTitle, detail: copy.assetsDetail },
    "visual-style": { title: copy.visualTitle, detail: copy.visualDetail },
  };
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
    if (!plan) { setError(copy.keepOne); return; }
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

  return <section className="revision-plan-picker" aria-label={copy.planLabel}>
    <label htmlFor={inputId}>{inputLabel ?? copy.inputLabel}</label>
    <textarea id={inputId} rows={4} minLength={2} maxLength={2000} value={content} onChange={event => updateContent(event.currentTarget.value)} placeholder={placeholder} disabled={disabled || planning || confirming} />
    {!response ? <>
      <p>{copy.planHelp}</p>
      <button type="button" className="revision-primary primary-action" disabled={disabled || planning || content.trim().length < 2} onClick={() => void analyse()}>{planning ? copy.analysing : copy.analyse}</button>
    </> : <>
      <section className="revision-plan-summary" aria-live="polite">
        <header><strong>{noCompatibleAnimationTarget ? copy.animationUnavailable : response.status === "selection-required" ? copy.chooseAssets : copy.identified}</strong><button type="button" className="secondary-action" onClick={() => setResponse(null)} disabled={confirming}>{copy.editText}</button></header>
        <p>{copy.selectionHelp}</p>
        <div className="revision-operation-list">
          {response.revisionPlan.operations.map((operation, index) => {
            const id = `${operation.scope}-${index}`;
            const operationCopy = scopeCopy[operation.scope];
            const animated = operation.scope === "assets" && operation.targets.some(target => target.animation === "sprite-sheet");
            return <label key={id}><input type="checkbox" checked={selectedOperationIds.has(id)} onChange={event => { const checked = event.currentTarget.checked; setSelectedOperationIds(current => { const next = new Set(current); if (checked) next.add(id); else next.delete(id); return next; }); }} disabled={confirming} /><span><strong>{operationCopy.title}{animated ? ` · ${copy.animated}` : ""}</strong><small>{operationCopy.detail}</small></span></label>;
          })}
        </div>
      </section>
      {(hasAssets || response.status === "selection-required") && <fieldset className="revision-resource-list" disabled={confirming}>
        <legend>{copy.assetLegend}</legend>
        <p>{animationRequested ? copy.animatedHelp : copy.assetHelp}</p>
        {response.candidates.map(candidate => {
          const cannotSatisfyAnimation = animationRequested && !candidate.supportsAnimation;
          return <label key={candidate.file}><input type="checkbox" checked={selectedFiles.has(candidate.file)} disabled={confirming || cannotSatisfyAnimation} onChange={event => { const checked = event.currentTarget.checked; setSelectedFiles(current => { const next = new Set(current); if (checked) next.add(candidate.file); else next.delete(candidate.file); return next; }); }} /><span><strong>{candidate.label}{candidate.recommended ? ` (${copy.recommended})` : ""}</strong><small>{candidate.kind === "role" ? candidate.supportsAnimation ? copy.roleAnimated : copy.role : candidate.kind === "background" ? copy.background : candidate.kind === "cover" ? copy.cover : copy.other}{cannotSatisfyAnimation && candidate.animationUnavailableReason ? ` · ${candidate.animationUnavailableReason}` : ""}</small></span></label>;
        })}
      </fieldset>}
      {response.status === "selection-required" && <p role="status">{noCompatibleAnimationTarget ? copy.noAnimatedTarget : copy.selectionRequired}</p>}
      <p className="revision-plan-confirmation">{formatRevisionCopy(copy.confirmation, { count: plan?.operations.length ?? 0 })}</p>
      <button type="button" className="revision-primary primary-action" disabled={disabled || confirming || !plan} onClick={() => void confirm()}>{confirming ? copy.submitting : submitLabel}</button>
    </>}
    {error ? <FailureDetails error={error} fallback={copy.failure} /> : null}
  </section>;
}
