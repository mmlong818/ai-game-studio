import { useId, useRef, useState } from "react";
import { useRevisionCopy } from "./revision-i18n";
export type RecordArtReview = (versionId: string, status: "passed" | "failed", summary: string) => Promise<void>;

export function ManualArtReview({ versionId, busy, onRecord }: { versionId: string; busy: boolean; onRecord: RecordArtReview }) {
  const copy = useRevisionCopy();
  const id = useId();
  const lock = useRef(false);
  const [status, setStatus] = useState<"passed" | "failed" | "">("");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return <details className="manual-art-review">
    <summary>{copy.reviewSummary}</summary>
    <form className="revision-composer" onSubmit={async event => {
      event.preventDefault();
      if (busy || lock.current || !status || summary.trim().length < 12) return;
      lock.current = true; setSaving(true); setError("");
      try { await onRecord(versionId, status, summary.trim()); }
      catch { setError(copy.saveError); }
      finally { lock.current = false; setSaving(false); }
    }}>
      <p>{copy.reviewHelp}</p>
      <label htmlFor={`${id}-result`}>{copy.reviewResult}</label>
      <select id={`${id}-result`} value={status} disabled={busy || saving} required onChange={e => setStatus(e.target.value as typeof status)}>
        <option value="">{copy.chooseResult}</option><option value="passed">{copy.passed}</option><option value="failed">{copy.failedNeedsWork}</option>
      </select>
      <label htmlFor={`${id}-evidence`}>{copy.evidence}</label>
      <textarea id={`${id}-evidence`} value={summary} minLength={12} maxLength={500} required disabled={busy || saving} onChange={e => setSummary(e.target.value)} placeholder={copy.evidencePlaceholder} />
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={busy || saving || !status || summary.trim().length < 12}>{saving ? copy.saving : copy.save}</button>
    </form>
  </details>;
}
