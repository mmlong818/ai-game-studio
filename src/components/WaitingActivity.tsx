import { useEffect, useState } from "react";

export function WaitingActivity({ label, startedAt }: { label: string; startedAt?: string | null }) {
  const [mountedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const serverStart = startedAt ? Date.parse(startedAt) : NaN;
  const durable = Number.isFinite(serverStart);
  const seconds = Math.max(0, Math.floor((now - (durable ? serverStart : mountedAt)) / 1000));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <div className="waiting-activity" aria-label="等待状态">
    <div className="waiting-blocks" aria-hidden="true"><i /><i /><i /><i /></div>
    <div><p role="status">{label}</p><small>{durable ? "本次制作已用" : "本次页面等待"} {Math.floor(seconds / 60)} 分 {seconds % 60} 秒</small>
      {seconds >= 45 && <p className="waiting-delay" role="status">本次等待较长，尚未收到完成结果。计时不代表制作进度，不会因此重复提交。</p>}
    </div>
  </div>;
}

/** 正在生成内容的尾部片段：让人看到制作在往前走，而不是只有计时。 */
export function LiveExcerpt({ text, title = "正在写入的游戏代码" }: { text: string; title?: string }) {
  return <figure className="live-excerpt" aria-live="off">
    <figcaption>{title}<small>只显示最后几行，完整代码在制作完成后可查</small></figcaption>
    <pre>{text}<i className="live-caret" aria-hidden="true" /></pre>
  </figure>;
}
