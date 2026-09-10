import { useEffect, useRef, useState } from "react";
import type { RenovationScope } from "../shared/contracts";
import type { SpriteAnimationClipId } from "../shared/generated-blueprint";
import { pendingRevision } from "./project-revision";
import { RevisionScopePicker, revisionScopeLabel, revisionScopeOptions } from "./RevisionScopePicker";
import { SpriteClipChoice } from "../components/SpriteAnimationControl";

export function RevisionComposer({ projectId, disabled, working, onConfirm, animationClipIds = [] }: {
  projectId: string; disabled: boolean; working: boolean; animationClipIds?: readonly SpriteAnimationClipId[];
  onConfirm: (content: string, revisionScope: RenovationScope, assetTarget?: { clipId: SpriteAnimationClipId }) => Promise<void>;
}) {
  const draftKey = `studio-revision-draft:${projectId}`;
  const scopeKey = `studio-revision-scope:${projectId}`;
  const pending = pendingRevision(projectId);
  const [draft, setDraft] = useState(() => {
    try { return pending?.content ?? sessionStorage.getItem(draftKey) ?? ""; } catch { return ""; }
  });
  const [revisionScope, setRevisionScope] = useState<RenovationScope>(() => {
    try {
      const saved = sessionStorage.getItem(scopeKey) as RenovationScope | null;
      return pending?.revisionScope ?? revisionScopeOptions.find(option => option.id === saved)?.id ?? "gameplay";
    } catch { return pending?.revisionScope ?? "gameplay"; }
  });
  const [clipId, setClipId] = useState<SpriteAnimationClipId>(() => pending?.assetTarget?.clipId ?? animationClipIds[0] ?? "idle");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, draft); } catch { /* Pending paid receipts are persisted separately before submission. */ }
  }, [draftKey, draft]);
  useEffect(() => {
    try { sessionStorage.setItem(scopeKey, revisionScope); } catch { /* The pending receipt remains the durable source of truth. */ }
  }, [revisionScope, scopeKey]);
  useEffect(() => { if (confirming) confirmRef.current?.focus(); }, [confirming]);
  async function confirm() {
    if (disabled || working || locked.current || draft.trim().length < 2) return;
    locked.current = true; setSending(true); setError("");
    try {
      const assetTarget = revisionScope === "assets" && animationClipIds.includes(clipId) ? { clipId } : undefined;
      if (assetTarget) await onConfirm(draft.trim(), revisionScope, assetTarget);
      else await onConfirm(draft.trim(), revisionScope);
      setDraft(""); setConfirming(false);
    }
    catch { setError("未能确认这次修改是否已接收，草稿和请求编号已保留。刷新只恢复记录；再次确认会核对同一请求，不会另建任务。"); }
    finally { locked.current = false; setSending(false); }
  }
  return <form className="revision-composer" onSubmit={event => { event.preventDefault(); if (!disabled && !working && draft.trim().length >= 2) { setError(""); setConfirming(true); } }}>
    <RevisionScopePicker value={revisionScope} onChange={setRevisionScope} disabled={disabled || working || sending || confirming} />
    {revisionScope === "assets" && animationClipIds.length > 0 && <SpriteClipChoice value={clipId} available={animationClipIds} onChange={setClipId} />}
    <label htmlFor="revision-message">具体想调整什么？</label>
    <p>{working ? "新版正在制作，原来的游戏仍可试玩。" : "每次集中调整一件事。本次制作要求保留原有核心玩法和操作。"}</p>
    <textarea ref={inputRef} id="revision-message" name="revision" rows={4} minLength={2} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder={revisionScopeOptions.find(option => option.id === revisionScope)?.example} disabled={disabled || working || sending || confirming} />
    {confirming ? <section className="revision-confirmation" aria-label="确认本次修改">
      <h3>按这次局部调整制作新版？</h3><p className="revision-scope-summary">范围：{revisionScopeLabel(revisionScope)}</p><p className="revision-quote">{draft}</p>
      <p>本次制作要求保留当前游戏的核心玩法和操作，只在所选范围内修改、检查并按需生成资源，这会产生模型用量。当前成功版本保留，新版通过后才切换；不会自动发布。</p>
      <div><button type="button" disabled={sending || working} onClick={() => { setConfirming(false); setTimeout(() => inputRef.current?.focus(), 0); }}>返回修改</button><button ref={confirmRef} className="revision-primary" type="button" onClick={() => void confirm()} disabled={disabled || working || sending}>{sending ? "正在提交…" : "确认修改，制作新版"}</button></div>
    </section> : <button className="revision-primary" type="submit" disabled={disabled || working || draft.trim().length < 2}>查看修改确认</button>}
    {error && <p role="alert">{error}</p>}
  </form>;
}
