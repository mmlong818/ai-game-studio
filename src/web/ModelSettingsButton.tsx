import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound, LoaderCircle, ShieldCheck, X } from "lucide-react";
import type { OpenAISettingsStatus, OpenAIModelCatalog } from "../shared/contracts";
import { clearOpenAIKey, getOpenAIModels, getOpenAISettings, saveOpenAIKey } from "./api";
import { usePreferences } from "./preferences";

export function ModelSettingsButton({ compact = false }: { compact?: boolean }) {
  const { t } = usePreferences();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OpenAISettingsStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [catalog, setCatalog] = useState<OpenAIModelCatalog | null>(null);
  const [models, setModels] = useState({ text: "", image: "" });
  const [loadingModels, setLoadingModels] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open || (!apiKey.trim() && !status?.configured) || (apiKey.trim() && apiKey.trim().length < 20)) return;
    const controller = new AbortController();
    setLoadingModels(true);
    const timer = setTimeout(() => {
      void getOpenAIModels(apiKey.trim(), controller.signal).then(result => {
        if (controller.signal.aborted) return;
        setCatalog(result);
        setModels({
          text: !apiKey.trim() && result.text.some(m => m.id === status?.models.text) ? status!.models.text : result.recommended.text ?? "",
          image: !apiKey.trim() && result.image.some(m => m.id === status?.models.image) ? status!.models.image : result.recommended.image ?? "",
        });
        setError("");
      }).catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "模型列表获取失败");
      }).finally(() => { if (!controller.signal.aborted) setLoadingModels(false); });
    }, 600);
    return () => { clearTimeout(timer); controller.abort(); setLoadingModels(false); };
  }, [open, apiKey, status, retry]);

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
      setStatus(await saveOpenAIKey(apiKey.trim(), catalog ? models : undefined));
      setApiKey("");
      setSaved(true);
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
      setCatalog(null);
      setModels({ text: "", image: "" });
      setSaved(false);
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
        aria-label={t("models.trigger")}
      >
        <KeyRound size={15} aria-hidden="true" />
        <span>{t("models.trigger")}</span>
      </button>
      <dialog
        className="model-settings-dialog"
        ref={dialogRef}
        onClose={() => { setOpen(false); setApiKey(""); setCatalog(null); setSaved(false); }}
        aria-labelledby="model-settings-title"
      >
        <header className="model-settings-heading">
          <div>
            <span className="model-settings-kicker">OPENAI</span>
            <h2 id="model-settings-title">{t("models.title")}</h2>
            <p>连接模型服务后即可制作游戏。平台会自动推荐可用模型，无需了解技术参数。</p>
          </div>
          <button className="model-settings-close" type="button" onClick={() => setOpen(false)} aria-label={t("models.close")}>
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className="model-settings-status" data-configured={Boolean(status?.configured)} aria-live="polite">
          {busy && !status ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : status?.configured ? <CheckCircle2 size={16} aria-hidden="true" /> : <KeyRound size={16} aria-hidden="true" />}
          <span>{busy && !status ? "正在读取连接设置…" : status?.configured ? "已配置模型服务" : "尚未连接，请先填写 Key"}</span>
        </div>

        <form className="model-key-form" onSubmit={save}>
          <label htmlFor="openai-api-key">{t("models.keyLabel")}</label>
          <div className="model-key-field">
            <KeyRound size={17} aria-hidden="true" />
            <input id="openai-api-key" type="password" value={apiKey}
              onChange={(event) => { setApiKey(event.currentTarget.value); setCatalog(null); setModels({ text: "", image: "" }); setError(""); setSaved(false); }}
              placeholder={status?.configured ? "已配置，更换时填写新 Key" : "sk-…"}
              autoComplete="off" spellCheck={false} required={!status?.configured} minLength={20} disabled={busy} />
          </div>
          <p className="model-security-note"><ShieldCheck size={15} aria-hidden="true" />{t("models.security")}</p>
          <p className="model-connection-hint">保存设置不会开始制作游戏；实际制作会使用模型服务额度。</p>
          <details className="model-options">
          <summary>模型选择与连接详情（可选）</summary>
          <p>{statusText}。可以沿用自动推荐，也可以自行调整。</p>
        <div className="model-roster" aria-label={t("models.available")}>
          <article>
            <span>{t("models.textRole")}</span>
            <label htmlFor="text-model">文本 / 游戏设计</label>
            <select id="text-model" value={models.text} disabled={busy || !catalog?.text.length} onChange={e => { setModels(value => ({ ...value, text: e.target.value })); setSaved(false); }}>
              {!catalog?.text.length ? <option value="">等待远端模型列表</option> : catalog.text.map(model => <option key={model.id} value={model.id}>{model.id}{model.id === catalog.recommended.text ? "（推荐）" : ""}</option>)}
            </select>
            <p>{t("models.textDetail")}</p>
          </article>
          <article>
            <span>{t("models.imageRole")}</span>
            <label htmlFor="image-model">图像 / 游戏资源</label>
            <select id="image-model" value={models.image} disabled={busy || !catalog?.image.length} onChange={e => { setModels(value => ({ ...value, image: e.target.value })); setSaved(false); }}>
              {!catalog?.image.length ? <option value="">等待远端模型列表</option> : catalog.image.map(model => <option key={model.id} value={model.id}>{model.id}{model.id === catalog.recommended.image ? "（推荐）" : ""}</option>)}
            </select>
            <p>{t("models.imageDetail")}</p>
          </article>
        </div>
          </details>

        <p aria-live="polite">{loadingModels ? "正在自动获取远端模型列表…" : catalog ? "已按兼容模型的版本排序，优先推荐新版本。可直接保存，也可调整选择。" : "输入完整 Key 后自动获取可用模型。"}
          {!loadingModels && (apiKey.trim().length >= 20 || status?.configured) ? <button type="button" disabled={busy} onClick={() => { setCatalog(null); setRetry(value => value + 1); }}>重新获取</button> : null}
        </p>
        {catalog && (!catalog.text.length || !catalog.image.length) ? <p role="alert">当前账号缺少平台兼容的文本或图像模型，暂不能保存。模型列表权限不等于实际调用额度。</p> : null}
        {saved ? <p role="status">已保存，后续生成使用所选模型（当前服务会话）。</p> : null}

          {error ? <p className="model-settings-error" role="alert">{error}</p> : null}
          <footer className="model-settings-actions">
            {status?.source === "session" ? <button className="model-key-clear" type="button" onClick={clear} disabled={busy}>{t("models.clear")}</button> : <span />}
            <button className="model-key-save" type="submit" disabled={busy || (apiKey.trim() ? apiKey.trim().length < 20 : !status?.configured) || Boolean(catalog && (!models.text || !models.image))}>
              {busy ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <KeyRound size={16} aria-hidden="true" />}
              {t("models.save")}
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
