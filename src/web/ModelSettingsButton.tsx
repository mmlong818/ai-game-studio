import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound, LoaderCircle, ShieldCheck, X } from "lucide-react";
import type { OpenAISettingsStatus } from "../shared/contracts";
import { clearOpenAIKey, getOpenAISettings, saveOpenAIKey } from "./api";
import { usePreferences } from "./preferences";

export function ModelSettingsButton({ compact = false }: { compact?: boolean }) {
  const { t } = usePreferences();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OpenAISettingsStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setBusy(true);
    setError("");
    void getOpenAISettings()
      .then(setStatus)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t("models.loadFailed")))
      .finally(() => setBusy(false));
  }, [open, t]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      setStatus(await saveOpenAIKey(apiKey));
      setApiKey("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("models.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setError("");
    try {
      setStatus(await clearOpenAIKey());
      setApiKey("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("models.clearFailed"));
    } finally {
      setBusy(false);
    }
  }

  const statusText = !status?.configured
    ? t("models.unconfigured")
    : status.source === "environment"
      ? t("models.environment")
      : status.source === "file"
        ? t("models.file")
        : t("models.session");

  return (
    <>
      <button
        className={compact ? "workbench-button button-secondary model-settings-trigger is-compact" : "model-settings-trigger"}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <KeyRound size={15} aria-hidden="true" />
        <span>{t("models.trigger")}</span>
      </button>
      <dialog
        className="model-settings-dialog"
        ref={dialogRef}
        onClose={() => setOpen(false)}
        aria-labelledby="model-settings-title"
      >
        <header className="model-settings-heading">
          <div>
            <span className="model-settings-kicker">OPENAI</span>
            <h2 id="model-settings-title">{t("models.title")}</h2>
            <p>{t("models.description")}</p>
          </div>
          <button className="model-settings-close" type="button" onClick={() => setOpen(false)} aria-label={t("models.close")}>
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className="model-settings-status" aria-live="polite">
          {busy && !status ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
          <span>{statusText}</span>
        </div>

        <div className="model-roster" aria-label={t("models.available")}>
          <article>
            <span>{t("models.textRole")}</span>
            <strong>GPT-5.6</strong>
            <code>{status?.models.text ?? "gpt-5.6"}</code>
            <p>{t("models.textDetail")}</p>
          </article>
          <article>
            <span>{t("models.imageRole")}</span>
            <strong>GPT Image 2</strong>
            <code>{status?.models.image ?? "gpt-image-2"}</code>
            <p>{t("models.imageDetail")}</p>
          </article>
        </div>

        <form className="model-key-form" onSubmit={save}>
          <label htmlFor="openai-api-key">{t("models.keyLabel")}</label>
          <div className="model-key-field">
            <KeyRound size={17} aria-hidden="true" />
            <input
              id="openai-api-key"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.currentTarget.value)}
              placeholder="sk-…"
              autoComplete="off"
              spellCheck={false}
              required
              minLength={20}
              disabled={busy}
            />
          </div>
          <p className="model-security-note"><ShieldCheck size={15} aria-hidden="true" />{t("models.security")}</p>
          {error ? <p className="model-settings-error" role="alert">{error}</p> : null}
          <footer className="model-settings-actions">
            {status?.source === "session" ? <button className="model-key-clear" type="button" onClick={clear} disabled={busy}>{t("models.clear")}</button> : <span />}
            <button className="model-key-save" type="submit" disabled={busy || apiKey.trim().length < 20}>
              {busy ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <KeyRound size={16} aria-hidden="true" />}
              {t("models.save")}
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
