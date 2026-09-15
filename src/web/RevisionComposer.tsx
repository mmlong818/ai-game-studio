import { useEffect, useState } from "react";
import type { RevisionPlan } from "../shared/contracts";
import { pendingRevision } from "./project-revision";
import { RevisionPlanPicker } from "./RevisionPlanPicker";
import { useRevisionCopy } from "./revision-i18n";

export function RevisionComposer({ projectId, disabled, working, onConfirm }: {
  projectId: string;
  disabled: boolean;
  working: boolean;
  onConfirm: (content: string, revisionPlan: RevisionPlan) => Promise<void>;
}) {
  const copy = useRevisionCopy();
  const draftKey = `studio-revision-draft:${projectId}`;
  const pending = pendingRevision(projectId);
  const [draft, setDraft] = useState(() => {
    try { return pending?.content ?? sessionStorage.getItem(draftKey) ?? ""; } catch { return ""; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, draft); } catch { /* The durable receipt is saved immediately before the one explicit submit. */ }
  }, [draftKey, draft]);

  return <div className="revision-composer">
    <RevisionPlanPicker
      projectId={projectId}
      content={draft}
      onContentChange={setDraft}
      disabled={disabled || working}
      placeholder={copy.composerPlaceholder}
      submitLabel={copy.composerSubmit}
      onConfirm={async plan => { await onConfirm(draft.trim(), plan); setDraft(""); }}
    />
    {working ? <p>{copy.working}</p> : <p>{copy.composerHelp}</p>}
  </div>;
}
