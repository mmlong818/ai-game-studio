import { useEffect, useState } from "react";
import type { ArtReviewHistoryEntry } from "../shared/contracts";
import { getArtReviewHistory } from "./api";

const labels = { legacy: "历史状态未核验", pending: "待审核", passed: "通过", failed: "未通过" };
export function ArtReviewHistory({ projectId, versionId, revision }: { projectId: string; versionId: string; revision: string | null }) {
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
    <summary>查看此版本审核历史</summary>
    {open ? <div>
      <p>记录标明凭据验证情况；审核凭据不等于实名身份。历史从记录功能启用后保留，不能据此推断此前未做过审核。</p>
      {error ? <div role="alert"><p>审核历史读取失败，无法确认是否有记录。</p><button type="button" onClick={() => setAttempt(value => value + 1)}>重新读取</button></div>
        : !result ? <p role="status">正在读取审核历史…</p>
          : !result.entries.length ? <p role="status">尚无可追溯的审核历史。这不代表审核通过或未通过，请结合当前版本状态查看。</p>
            : <ol>{result.entries.map(entry => <li key={entry.id}>
              <strong>第 {entry.sequence} 次记录 · {labels[entry.previousStatus]} → {labels[entry.status]}</strong>
              <time dateTime={entry.reviewedAt}>{new Date(entry.reviewedAt).toLocaleString()}</time>
              <span>{entry.source === "operator-credential" ? "平台审核凭据已验证" : "历史人工记录 · 身份未验证"}</span>
              <p>{entry.summary}</p>
            </li>)}</ol>}
    </div> : null}
  </details>;
}
