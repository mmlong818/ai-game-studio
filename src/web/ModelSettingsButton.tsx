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

  const keyStatusText = !status?.configured
    ? "尚未保存 Key"
    : status.source === "environment"
      ? "已配置环境 Key（将在首次制作时验证）"
      : status.source === "file"
        ? "已配置本机 Key（将在首次制作时验证）"
        : "已保存会话 Key（将在首次制作时验证）";
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
            <p>连接模型服务后即可制作游戏。模型由工作室固定，更新 Key 不会改变创作所用模型。</p>
          </div>
          <button className="model-settings-close" type="button" onClick={() => setOpen(false)} aria-label={t("models.close")}>
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className="model-settings-status" data-configured={Boolean(status?.configured)} aria-live="polite">
          {busy && !status ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : status?.configured ? <CheckCircle2 size={16} aria-hidden="true" /> : <KeyRound size={16} aria-hidden="true" />}
          <span>{busy && !status ? "正在读取 Key 设置…" : status?.configured ? "已保存 Key；首次制作时验证连接" : "尚未保存 Key，请先填写"}</span>
        </div>

        <form className="model-key-form" onSubmit={save}>
          <label htmlFor="openai-api-key">{t("models.keyLabel")}</label>
          <div className="model-key-field">
            <KeyRound size={17} aria-hidden="true" />
            <input id="openai-api-key" type="password" value={apiKey}
              onChange={(event) => { setApiKey(event.currentTarget.value); setError(null); setSaved(false); }}
              placeholder={status?.configured ? "已配置，更换时填写新 Key" : "sk-…"}
              autoComplete="off" spellCheck={false} required={!status?.configured} minLength={20} disabled={busy} />
          </div>
          <p className="model-security-note"><ShieldCheck size={15} aria-hidden="true" />{t("models.security")}</p>
          <p className="model-connection-hint">保存设置不会开始制作游戏；实际制作会使用模型服务额度。</p>
          <details className="model-options">
          <summary>模型选择与连接详情</summary>
          <p>{keyStatusText}。模型固定，不能在此更换。</p>
        <div className="model-roster" aria-label={t("models.available")}>
          <article>
            <strong>文本模型：gpt-5.6-terra</strong>
          </article>
          <article>
            <strong>图像模型：gpt-image-2.5-sunburst</strong>
          </article>
        </div>
          </details>

        <p aria-live="polite">保存只检查 Key 格式，不会测试连接，也不会自动发起游戏制作。</p>
        {saved ? <p role="status">密钥已保存；首次制作时固定使用 gpt-5.6-terra 和 gpt-image-2.5-sunburst。</p> : null}

          {Boolean(error) ? <FailureDetails error={error} className="model-settings-error" fallback="连接或保存设置没有完成。请按上面的下一步处理；不会修改已有设置。" /> : null}
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
