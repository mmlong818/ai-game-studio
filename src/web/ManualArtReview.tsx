import { useId, useRef, useState } from "react";
export type RecordArtReview = (versionId: string, status: "passed" | "failed", summary: string) => Promise<void>;

export function ManualArtReview({ versionId, busy, onRecord }: { versionId: string; busy: boolean; onRecord: RecordArtReview }) {
  const id = useId();
  const lock = useRef(false);
  const [status, setStatus] = useState<"passed" | "failed" | "">("");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return <details className="manual-art-review">
    <summary>记录人工美术审核</summary>
    <form className="revision-composer" onSubmit={async event => {
      event.preventDefault();
      if (busy || lock.current || !status || summary.trim().length < 12) return;
      lock.current = true; setSaving(true); setError("");
      try { await onRecord(versionId, status, summary.trim()); }
      catch { setError("审核记录未确认保存，请保留依据并检查记录后再操作。"); }
      finally { lock.current = false; setSaving(false); }
    }}>
      <p>仅供实际完成复核的人记录。普通用户可直接试玩和提出修改，无需替平台做专业验收。填写说明不会自动发布游戏。</p>
      <label htmlFor={`${id}-result`}>审核结论</label>
      <select id={`${id}-result`} value={status} disabled={busy || saving} required onChange={e => setStatus(e.target.value as typeof status)}>
        <option value="">请选择实际结论</option><option value="passed">通过</option><option value="failed">未通过，需要修改</option>
      </select>
      <label htmlFor={`${id}-evidence`}>实际检查依据</label>
      <textarea id={`${id}-evidence`} value={summary} minLength={12} maxLength={500} required disabled={busy || saving} onChange={e => setSummary(e.target.value)} placeholder="说明检查了哪些画面、画幅与资源，发现什么问题，为什么得出该结论。" />
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={busy || saving || !status || summary.trim().length < 12}>{saving ? "正在保存…" : "保存审核记录"}</button>
    </form>
  </details>;
}
