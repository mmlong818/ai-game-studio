import { useEffect, useState } from "react";
import type { RevisionPlan } from "../shared/contracts";
import { pendingRevision } from "./project-revision";
import { RevisionPlanPicker } from "./RevisionPlanPicker";

export function RevisionComposer({ projectId, disabled, working, onConfirm }: {
  projectId: string;
  disabled: boolean;
  working: boolean;
  onConfirm: (content: string, revisionPlan: RevisionPlan) => Promise<void>;
}) {
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
      placeholder="例如：所有角色改为精灵动图，同时把技能墨量消耗减半。"
      submitLabel="确认修改，制作新版"
      onConfirm={async plan => { await onConfirm(draft.trim(), plan); setDraft(""); }}
    />
    {working ? <p>新版正在制作，原来的游戏仍可试玩。</p> : <p>可以一次确认几项互不冲突的修改。资源替换只会影响你最后勾选的资源。</p>}
  </div>;
}
