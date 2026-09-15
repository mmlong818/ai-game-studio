import { useEffect, useState } from "react";
import { useComponentMessages } from "./component-i18n";

export function WaitingActivity({ label, startedAt, elapsedLabel }: { label: string; startedAt?: string | null; elapsedLabel?: string }) {
  const t = useComponentMessages();
  const [mountedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const serverStart = startedAt ? Date.parse(startedAt) : NaN;
  const durable = Number.isFinite(serverStart);
  const seconds = Math.max(0, Math.floor((now - (durable ? serverStart : mountedAt)) / 1000));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <div className="waiting-activity" aria-label={t("waiting.label")}>
    <div className="waiting-blocks" aria-hidden="true"><i /><i /><i /><i /></div>
    <div><p role="status">{label}</p><small>{elapsedLabel ?? (durable ? t("waiting.durable") : t("waiting.page"))} {t("waiting.time", { minutes: Math.floor(seconds / 60), seconds: seconds % 60 })}</small>
      {seconds >= 45 && <p className="waiting-delay" role="status">{t("waiting.delay")}</p>}
    </div>
  </div>;
}

/** 正在生成内容的尾部片段：让人看到制作在往前走，而不是只有计时。 */
export function LiveExcerpt({ text, title }: { text: string; title?: string }) {
  const t = useComponentMessages();
  return <figure className="live-excerpt" aria-live="off">
    <figcaption>{title ?? t("waiting.excerpt")}<small>{t("waiting.excerptDetail")}</small></figcaption>
    <pre>{text}<i className="live-caret" aria-hidden="true" /></pre>
  </figure>;
}
