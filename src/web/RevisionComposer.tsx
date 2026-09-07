import { useEffect, useRef, useState } from "react";
import { pendingRevision } from "./project-revision";

export function RevisionComposer({ projectId, disabled, working, onConfirm }: {
  projectId: string; disabled: boolean; working: boolean; onConfirm: (content: string) => Promise<void>;
}) {
  const draftKey = `studio-revision-draft:${projectId}`;
  const [draft, setDraft] = useState(() => {
    try { return pendingRevision(projectId)?.content ?? sessionStorage.getItem(draftKey) ?? ""; } catch { return ""; }
  });
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, draft); } catch { /* Pending paid receipts are persisted separately before submission. */ }
  }, [draftKey, draft]);
  useEffect(() => { if (confirming) confirmRef.current?.focus(); }, [confirming]);
  async function confirm() {
    if (disabled || working || locked.current || draft.trim().length < 2) return;
    locked.current = true; setSending(true); setError("");
    try { await onConfirm(draft.trim()); setDraft(""); setConfirming(false); }
    catch { setError("未能确认这次修改是否已接收，草稿和请求编号已保留。刷新只恢复记录；再次确认会核对同一请求，不会另建任务。"); }
    finally { locked.current = false; setSending(false); }
  }
  return <form className="revision-composer" onSubmit={event => { event.preventDefault(); if (!disabled && !working && draft.trim().length >= 2) { setError(""); setConfirming(true); } }}>
    <label htmlFor="revision-message">想让这个游戏变得怎样？</label>
    <p>{working ? "新版正在制作，原来的游戏仍可试玩。" : "说出你想改变的地方。平台会沿用当前作品，而不是从头另做。"}</p>
    <textarea ref={inputRef} id="revision-message" name="revision" rows={4} minLength={2} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="例如：第一关再轻松一点，配对成功的反馈更明显。" disabled={disabled || working || sending || confirming} />
    {confirming ? <section className="revision-confirmation" aria-label="确认本次修改">
      <h3>按这段意见制作新版？</h3><p className="revision-quote">{draft}</p>
      <p>会使用已配置的模型进行修改、检查和必要的资源生成，产生模型用量。当前成功版本保留，新版通过后才切换；不会自动发布。</p>
      <div><button type="button" disabled={sending || working} onClick={() => { setConfirming(false); setTimeout(() => inputRef.current?.focus(), 0); }}>返回修改</button><button ref={confirmRef} className="revision-primary" type="button" onClick={() => void confirm()} disabled={disabled || working || sending}>{sending ? "正在提交…" : "确认修改，制作新版"}</button></div>
    </section> : <button className="revision-primary" type="submit" disabled={disabled || working || draft.trim().length < 2}>查看修改确认</button>}
    {error && <p role="alert">{error}</p>}
  </form>;
}
