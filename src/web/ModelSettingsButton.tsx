import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound, LoaderCircle, ShieldCheck, X } from "lucide-react";
import type { OpenAISettingsStatus } from "../shared/contracts";
import { clearOpenAIKey, getOpenAISettings, saveOpenAIKey } from "./api";
import { usePreferences } from "./preferences";
import { FailureDetails } from "../components/FailureDetails";

export function ModelSettingsButton({ compact = false }: { compact?: boolean }) {
  const { t } = usePreferences();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OpenAISettingsStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setBusy(true);
    setError(null);
    void getOpenAISettings()
      .then(setStatus)
      .catch((reason: unknown) => setError(reason))
      .finally(() => setBusy(false));
  }, [open, t]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setStatus(await saveOpenAIKey(apiKey.trim()));
      setApiKey("");
      setSaved(true);
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setError(null);
    try {
      setStatus(await clearOpenAIKey());
      setApiKey("");
      setSaved(false);
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  }

  const localTextProvider = status?.textProvider?.kind === "claude-cli" ? status.textProvider : null;
  const imageKeySource = status?.source === "environment" ? t("models.source.environment")
    : status?.source === "file" ? t("models.source.file")
      : status?.source === "session" ? t("models.source.session") : null;
  const providerStatusText = localTextProvider
    ? status?.configured ? t("models.status.claudeWithImage", { source: imageKeySource ?? t("models.source.server") }) : t("models.status.claudeNoImage")
    : status?.configured
      ? t("models.status.openai", { source: imageKeySource ?? t("models.source.server") })
      : t("models.status.none");
  const textModelLabel = localTextProvider ? `Claude CLI（${localTextProvider.model}）` : "gpt-5.6-terra";
  return (
    <>
      <button
        className={compact ? "workbench-button button-secondary model-settings-trigger is-compact" : "model-settings-trigger"}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={t("models.trigger")}
      >
        <KeyRound size={15} aria-hidden="true" />
        <span>{t("models.trigger")}</span>
      </button>
      <dialog
        className="model-settings-dialog"
        ref={dialogRef}
        onClose={() => { setOpen(false); setApiKey(""); setSaved(false); }}
        aria-labelledby="model-settings-title"
      >
        <header className="model-settings-heading">
          <div>
            <span className="model-settings-kicker">OPENAI</span>
            <h2 id="model-settings-title">{t("models.title")}</h2>
            <p>{t("models.descriptionDetail")}</p>
          </div>
          <button className="model-settings-close" type="button" onClick={() => setOpen(false)} aria-label={t("models.close")}>
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className="model-settings-status" data-configured={Boolean(status?.configured || localTextProvider)} aria-live="polite">
          {busy && !status ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : status?.configured || localTextProvider ? <CheckCircle2 size={16} aria-hidden="true" /> : <KeyRound size={16} aria-hidden="true" />}
          <span>{busy && !status ? t("models.loading") : providerStatusText}</span>
        </div>

        <form className="model-key-form" onSubmit={save}>
          <label htmlFor="openai-api-key">{t("models.keyLabel")}</label>
          <div className="model-key-field">
            <KeyRound size={17} aria-hidden="true" />
            <input id="openai-api-key" type="password" value={apiKey}
              onChange={(event) => { setApiKey(event.currentTarget.value); setError(null); setSaved(false); }}
              placeholder={status?.configured ? t("models.keyConfiguredPlaceholder") : "sk-…"}
              autoComplete="off" spellCheck={false} required={!status?.configured} minLength={20} disabled={busy} />
          </div>
          <p className="model-security-note"><ShieldCheck size={15} aria-hidden="true" />{t("models.security")}</p>
          <p className="model-connection-hint">{t("models.connectionHint")}</p>
          <details className="model-options">
          <summary>{t("models.details")}</summary>
          <p>{t("models.fixed", { status: providerStatusText })}</p>
        <div className="model-roster" aria-label={t("models.available")}>
          <article>
            <strong>{t("models.textModel", { model: textModelLabel })}</strong>
          </article>
          <article>
            <strong>{t("models.imageModel", { model: "gpt-image-2.5-sunburst" })}</strong>
          </article>
        </div>
          </details>

        <p aria-live="polite">{t("models.validationNote")}</p>
        {saved ? <p role="status">{t("models.saved", { textModel: textModelLabel, imageModel: "gpt-image-2.5-sunburst" })}</p> : null}

          {Boolean(error) ? <FailureDetails error={error} className="model-settings-error" fallback={t("models.actionFailed")} /> : null}
          <footer className="model-settings-actions">
            {status?.source === "session" ? <button className="model-key-clear" type="button" onClick={clear} disabled={busy}>{t("models.clear")}</button> : <span />}
            <button className="model-key-save" type="submit" disabled={busy || (apiKey.trim() ? apiKey.trim().length < 20 : !status?.configured)}>
              {busy ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <KeyRound size={16} aria-hidden="true" />}
              {t("models.save")}
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
