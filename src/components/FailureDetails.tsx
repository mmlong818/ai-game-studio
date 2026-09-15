import type { Build } from "../shared/contracts";
import { failureDetailsFrom, failureMessage } from "../web/failure";
import { useComponentMessages } from "./component-i18n";

export function FailureDetails({ error, details, fallback, className = "" }: {
  error?: unknown;
  details?: Build["failureDetails"];
  fallback?: string;
  className?: string;
}) {
  const t = useComponentMessages();
  const resolved = details ?? failureDetailsFrom(error);
  const message = failureMessage(error, t("failure.defaultMessage"));
  if (!resolved?.length) return <section className={`failure-details ${className}`.trim()} role="alert"><strong>{t("failure.shortTitle")}</strong><p>{message}</p><p className="failure-legacy">{fallback ?? t("failure.defaultFallback")}</p></section>;
  return <section className={`failure-details ${className}`.trim()} role="alert" aria-live="assertive">
    <strong>{t("failure.title")}</strong>
    <div className="failure-detail-list">
      {resolved.map((detail, index) => <article key={`${detail.code}-${detail.resource?.file ?? ""}-${index}`}>
        <header><strong>{t(`failure.stage.${detail.stage}` as "failure.stage.unknown")} · {t(`failure.category.${detail.category}` as "failure.category.unknown")}</strong>{detail.retryable ? <span>{t("failure.retryable")}</span> : ["authentication", "permission", "configuration", "rate-limit"].includes(detail.category) && detail.code !== "RATE_LIMIT" ? <span>{t("failure.account")}</span> : <span>{t("failure.preserved")}</span>}</header>
        {detail.resource ? <p className="failure-object">{t("failure.resource", { label: detail.resource.label, file: detail.resource.file })}</p> : null}
        {detail.operation ? <p className="failure-object">{t("failure.operation", { operation: detail.operation })}</p> : null}
        <details><summary>{t("failure.technical")}</summary><p>{detail.message}</p><p>{detail.nextStep}</p></details>
        <small>{[t("failure.reference", { code: detail.code }), detail.attempt ? t("failure.attempt", { attempt: detail.attempt }) : "", detail.httpStatus ? t("failure.http", { status: detail.httpStatus }) : ""].filter(Boolean).join(" · ")}</small>
      </article>)}
    </div>
  </section>;
}
