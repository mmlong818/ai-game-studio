import { useEffect, useState } from "react";
import type { ArtReviewHistoryEntry } from "../shared/contracts";
import { getArtReviewHistory } from "./api";
import { formatRevisionCopy, revisionCopy, useRevisionLocale } from "./revision-i18n";

export function ArtReviewHistory({ projectId, versionId, revision }: { projectId: string; versionId: string; revision: string | null }) {
  const locale = useRevisionLocale();
  const copy = revisionCopy(locale);
  const labels = { legacy: copy.legacy, pending: copy.pending, passed: copy.passed, failed: copy.failed };
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ entries: ArtReviewHistoryEntry[] } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setResult(null); setError(false);
    void getArtReviewHistory(projectId, versionId, controller.signal).then(entries => {
      if (!controller.signal.aborted) setResult({ entries });
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [open, projectId, versionId, revision, attempt]);
  return <details className="art-review-history" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{copy.historySummary}</summary>
    {open ? <div>
      <p>{copy.historyHelp}</p>
      {error ? <div role="alert"><p>{copy.historyError}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>{copy.retry}</button></div>
        : !result ? <p role="status">{copy.loading}</p>
          : !result.entries.length ? <p role="status">{copy.empty}</p>
            : <ol>{result.entries.map(entry => <li key={entry.id}>
              <strong>{formatRevisionCopy(copy.record, { sequence: entry.sequence })} · {labels[entry.previousStatus]} → {labels[entry.status]}</strong>
              <time dateTime={entry.reviewedAt}>{new Date(entry.reviewedAt).toLocaleString(locale)}</time>
              <span>{entry.source === "operator-credential" ? copy.verified : copy.unverified}</span>
              <p>{entry.summary}</p>
            </li>)}</ol>}
    </div> : null}
  </details>;
}
