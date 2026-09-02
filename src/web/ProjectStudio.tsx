import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  Activity,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Braces,
  Check,
  CheckCircle2,
  Clock3,
  Code2,
  Copy,
  ExternalLink,
  FileCheck2,
  FileText,
  FlaskConical,
  Globe2,
  History,
  Image as ImageIcon,
  LoaderCircle,
  Maximize2,
  MessageSquareText,
  Monitor,
  PackageCheck,
  Play,
  RefreshCw,
  Rocket,
  RotateCcw,
  ScanSearch,
  Send,
  Smartphone,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";
import { visualStyleOptions, type Build, type BuildStep, type IdeaAnalysis, type ProjectDetail, type ProjectMessage, type ProjectVersion } from "../shared/contracts";
import {
  archiveProject,
  getLatestBuild,
  getProject,
  getProjectMessages,
  getProjectVersions,
  publishProject,
  publishProjectVersion,
  reviewVersionArt,
  restoreProject,
  sendProjectMessage,
  startBuild,
} from "./api";
import { ModelSettingsButton } from "./ModelSettingsButton";
import { localizedTemplateNames, PreferenceControls, usePreferences, type ResolvedLocale } from "./preferences";

const statusLabelKeys = {
  queued: "studio.buildQueued",
  running: "studio.building",
  succeeded: "studio.buildReady",
  failed: "studio.buildFailed",
} as const;

const qualityLabelKeys = {
  legacy: "studio.quality.legacy",
  pending: "studio.quality.pending",
  passed: "studio.quality.passed",
  failed: "studio.quality.failed",
} as const;

const stepActionLabels: Record<BuildStep["kind"], string> = {
  analyze: "ANALYZE",
  document: "WRITE DOC",
  code: "WRITE CODE",
  asset: "GENERATE ASSET",
  test: "RUN TEST",
  delivery: "PACKAGE",
};

function StepIcon({ status }: { status: BuildStep["status"] }) {
  if (status === "succeeded") return <CheckCircle2 size={16} aria-hidden="true" />;
  if (status === "running") return <LoaderCircle className="spin" size={16} aria-hidden="true" />;
  if (status === "failed") return <XCircle size={16} aria-hidden="true" />;
  return <Clock3 size={16} aria-hidden="true" />;
}

function StepKindIcon({ kind }: { kind: BuildStep["kind"] }) {
  if (kind === "analyze") return <ScanSearch size={15} aria-hidden="true" />;
  if (kind === "document") return <FileText size={15} aria-hidden="true" />;
  if (kind === "code") return <Braces size={15} aria-hidden="true" />;
  if (kind === "asset") return <ImageIcon size={15} aria-hidden="true" />;
  if (kind === "test") return <FlaskConical size={15} aria-hidden="true" />;
  return <PackageCheck size={15} aria-hidden="true" />;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const { t } = usePreferences();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button className="workbench-icon-button" type="button" onClick={copy} aria-label={t("studio.copy", { label })} title={t("studio.copy", { label })}>
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
    </button>
  );
}

function PreviewPane({ project, build }: { project: ProjectDetail; build: Build | null }) {
  const { t } = usePreferences();
  const [frameKey, setFrameKey] = useState(0);
  const [device, setDevice] = useState<"desktop" | "mobile">(() => (
    typeof window !== "undefined" && window.matchMedia("(max-width: 620px)").matches ? "mobile" : "desktop"
  ));
  const shellRef = useRef<HTMLDivElement>(null);
  const previewUrl = build?.previewUrl ?? project.publication?.stableUrl;
  const [aspectWidth, aspectHeight] = project.spec.aspectRatio.split(":").map(Number);
  const previewStyle = {
    "--preview-aspect": project.spec.aspectRatio.replace(":", " / "),
    "--preview-ratio-value": aspectWidth / aspectHeight,
  } as CSSProperties;

  async function enterFullscreen() {
    try {
      await shellRef.current?.requestFullscreen();
    } catch {
      // 浏览器不支持或用户取消时，保持当前预览即可。
    }
  }

  return (
    <section className="workbench-preview" aria-labelledby="preview-heading">
      <header className="workbench-preview-toolbar">
        <div className="device-switch" aria-label={t("studio.previewSize")}>
          <button
            className={device === "desktop" ? "is-active" : ""}
            type="button"
            onClick={() => setDevice("desktop")}
            aria-pressed={device === "desktop"}
          >
            <Monitor size={15} aria-hidden="true" /> {t("studio.desktop")}
          </button>
          <button
            className={device === "mobile" ? "is-active" : ""}
            type="button"
            onClick={() => setDevice("mobile")}
            aria-pressed={device === "mobile"}
          >
            <Smartphone size={15} aria-hidden="true" /> {t("studio.mobile")}
          </button>
          <span className="designed-aspect">{t("studio.aspect", { ratio: project.spec.aspectRatio })}</span>
        </div>
        <div className="preview-toolbar-actions">
          <button
            className="workbench-icon-button"
            type="button"
            disabled={!previewUrl}
            onClick={() => setFrameKey((value) => value + 1)}
            aria-label={t("studio.refresh")}
            title={t("studio.refresh")}
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
          {previewUrl ? (
            <a className="workbench-icon-button" href={previewUrl} target="_blank" rel="noreferrer" aria-label={t("studio.open")} title={t("studio.open")}>
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          ) : null}
          <button className="workbench-icon-button" type="button" onClick={enterFullscreen} aria-label={t("studio.fullscreen")} title={t("studio.fullscreen")}>
            <Maximize2 size={16} aria-hidden="true" />
          </button>
          <span className={`preview-runtime-status status-${build?.status ?? "idle"}`}>
            <i /> {build?.status === "running" ? "BUILDING" : previewUrl ? "PLAYABLE" : "WAITING"}
          </span>
        </div>
      </header>
      <div className="preview-stage" ref={shellRef} data-device={device} data-aspect={project.spec.aspectRatio} style={previewStyle}>
        <div className="preview-canvas">
          {previewUrl ? (
            <iframe
              key={`${previewUrl}-${frameKey}`}
              className="game-preview-frame"
              src={previewUrl}
              title={t("studio.previewTitle", { title: project.title })}
              // previewUrl 指向独立的游戏交付源(GAME_PORT/PUBLIC_GAME_ORIGIN),与工作台跨源;
              // allow-same-origin 只授予游戏自身源(存档与遥测需要),接触不到工作台。
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <div className="preview-placeholder">
              <span><Play size={25} fill="currentColor" aria-hidden="true" /></span>
              <strong id="preview-heading">{t("studio.previewEmpty")}</strong>
              <p>{t("studio.previewEmptyDetail")}</p>
              <small>DIRECT · PLAY · SHARE</small>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function messageTime(value: string, locale: ResolvedLocale) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function ConversationContract({ project }: { project: ProjectDetail }) {
  const { t } = usePreferences();
  const style = visualStyleOptions.find((option) => option.id === project.spec.visualStyle)!;
  const passed = project.spec.acceptanceCriteria.filter((criterion) => criterion.status === "passed").length;

  return (
    <section className="workbench-contract" aria-labelledby="contract-heading">
      <header>
        <FileCheck2 size={17} aria-hidden="true" />
        <div><h3 id="contract-heading">{t("studio.contract")}</h3></div>
        <em>{t("studio.passed", { passed, total: project.spec.acceptanceCriteria.length })}</em>
      </header>
      <p className="contract-vision">{project.spec.vision}</p>
      <dl className="contract-facts">
        <div><dt>{t("studio.genre")}</dt><dd>{project.spec.designProfile.genre}</dd></div>
        <div><dt>{t("studio.session")}</dt><dd>{project.spec.designProfile.sessionLength}</dd></div>
        <div><dt>{t("studio.win")}</dt><dd>{project.spec.designProfile.winCondition}</dd></div>
        <div><dt>{t("studio.visual")}</dt><dd>{style.label} · {style.detailLabel}</dd></div>
        <div><dt>{t("studio.aspectFact")}</dt><dd>{project.spec.aspectRatio}</dd></div>
      </dl>
      <div className="contract-loop">
        <span>{t("studio.loop")}</span>
        <ol>{project.spec.designProfile.coreLoop.map((item) => <li key={item}>{item}</li>)}</ol>
      </div>
      <details className="contract-details">
        <summary>{t("studio.contractDetails")}</summary>
        <div className="contract-details-body">
          <div><strong>{t("studio.controls")}</strong><p>{project.spec.controls.join("、")}</p></div>
          <div><strong>{t("studio.difficultyCurve")}</strong><p>{project.spec.designProfile.difficultyCurve.join("；")}</p></div>
          {project.spec.hardConstraints.length ? <div><strong>{t("studio.constraints")}</strong><p>{project.spec.hardConstraints.join("；")}</p></div> : null}
          <ul>
            {project.spec.acceptanceCriteria.map((criterion) => (
              <li key={criterion.id}>
                {criterion.status === "passed" ? <CheckCircle2 size={15} aria-hidden="true" /> : <Clock3 size={15} aria-hidden="true" />}
                <span><b>{criterion.id}</b>{criterion.statement}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </section>
  );
}

const analysisSourceLabelKeys: Record<IdeaAnalysis["source"], Parameters<Translator>[0]> = {
  llm: "studio.confirm.sourceLlm",
  heuristic: "studio.confirm.sourceHeuristic",
  "heuristic-fallback": "studio.confirm.sourceFallback",
};

function ContractConfirmPanel({ project, busy, canConfirm, onConfirm }: {
  project: ProjectDetail;
  busy: boolean;
  canConfirm: boolean;
  onConfirm: () => void;
}) {
  const { locale, t } = usePreferences();
  const analysis = project.spec.ideaAnalysis;
  const design = project.spec.designProfile;
  const templateName = localizedTemplateNames[locale][project.spec.template];
  const confidencePercent = analysis && analysis.source === "llm" && analysis.confidence != null
    ? Math.round(analysis.confidence * 100)
    : null;

  return (
    <section className="contract-confirm" aria-labelledby="contract-confirm-heading">
      <header>
        <ScanSearch size={18} aria-hidden="true" />
        <div><h3 id="contract-confirm-heading">{t("studio.confirm.title")}</h3></div>
      </header>

      {analysis ? (
        <>
          <div className="contract-confirm-badges">
            <span className={`confirm-badge confirm-badge-${analysis.source}`}>{t(analysisSourceLabelKeys[analysis.source])}</span>
            {confidencePercent !== null ? (
              <span className="confirm-badge confirm-badge-confidence">{t("studio.confirm.confidence", { value: confidencePercent })}</span>
            ) : null}
            {project.spec.designSource === "llm" ? (
              <span className="confirm-badge confirm-badge-design">{t("studio.confirm.designLlm")}</span>
            ) : null}
          </div>
          {analysis.summary ? <p className="contract-vision">{analysis.summary}</p> : null}
          {analysis.source === "heuristic-fallback" && analysis.fallbackReason ? (
            <p className="contract-confirm-fallback">{t("studio.confirm.fallbackNote", { reason: analysis.fallbackReason })}</p>
          ) : null}
          {analysis.mechanics.length ? (
            <div className="contract-confirm-mechanics">
              <span>{t("studio.confirm.mechanics")}</span>
              <ul>{analysis.mechanics.map((mechanic) => <li key={mechanic}>{mechanic}</li>)}</ul>
            </div>
          ) : null}
          {analysis.hardConstraints.length ? (
            <div className="contract-confirm-constraints">
              <span>{t("studio.constraints")}</span>
              <ul>{analysis.hardConstraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="contract-confirm-fallback">{t("studio.waitBuildDetail")}</p>
      )}

      {project.spec.template === "generated" ? (
        <p className="contract-confirm-fallback">{t("studio.confirm.experimental")}</p>
      ) : null}
      <dl className="contract-facts contract-confirm-facts">
        <div><dt>{t("create.templateTitle")}</dt><dd>{templateName}</dd></div>
        <div><dt>{t("studio.genre")}</dt><dd>{design.genre}</dd></div>
        <div><dt>{t("studio.fantasy")}</dt><dd>{design.playerFantasy}</dd></div>
        <div><dt>{t("studio.session")}</dt><dd>{design.sessionLength}</dd></div>
        <div><dt>{t("studio.win")}</dt><dd>{design.winCondition}</dd></div>
      </dl>
      <div className="contract-loop">
        <span>{t("studio.loop")}</span>
        <ol>{design.coreLoop.map((item) => <li key={item}>{item}</li>)}</ol>
      </div>

      <div className="contract-confirm-cta">
        <button type="button" className="workbench-button button-primary" disabled={busy || !canConfirm} onClick={onConfirm}>
          {busy ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
          {t("studio.confirm.cta")}
        </button>
        <p>{t("studio.confirm.note")}</p>
      </div>
    </section>
  );
}

function BuildSteps({ build, project, busy, canConfirm, onConfirm }: {
  build: Build | null;
  project: ProjectDetail;
  busy: boolean;
  canConfirm: boolean;
  onConfirm: () => void;
}) {
  const { t } = usePreferences();
  if (!build) {
    return <ContractConfirmPanel project={project} busy={busy} canConfirm={canConfirm} onConfirm={onConfirm} />;
  }

  const completed = build.steps.filter((step) => step.status === "succeeded").length;

  return (
    <section className="production-lane" aria-labelledby="build-stream-heading">
      <header className="production-lane-heading">
        <h3 id="build-stream-heading">{t("studio.stageLane")}</h3>
        <output>{t("studio.stageCount", { completed, total: build.steps.length })}</output>
      </header>
      <ol className="production-stages">
        {build.steps.map((step, index) => (
          <li className={`production-stage step-${step.status}`} key={step.id}>
            <div className="stage-rail" aria-hidden="true">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <i />
            </div>
            <article className="stage-body">
              <header>
                <span className="stage-action"><StepKindIcon kind={step.kind} />{stepActionLabels[step.kind]}</span>
                <span className="stage-status"><StepIcon status={step.status} /></span>
              </header>
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
              {step.output ? (
                <div className="stage-evidence">
                  <span>{t("studio.stageEvidence")}</span>
                  <p>{step.output}</p>
                </div>
              ) : null}
            </article>
          </li>
        ))}
      </ol>
      {build.error ? <div className="workbench-build-error"><strong>{t("studio.rawError")}</strong><p>{build.error}</p></div> : null}
    </section>
  );
}

function DeliveryUrls({ project }: { project: ProjectDetail }) {
  const { t } = usePreferences();
  if (!project.publication) return null;

  return (
    <section className="workbench-delivery" aria-labelledby="delivery-heading">
      <header><Globe2 size={16} aria-hidden="true" /><h3 id="delivery-heading">{t("studio.delivery")}</h3></header>
      <div className="delivery-url">
        <span>{t("studio.playerUrl")}</span><code>{project.publication.stableUrl}</code>
        <CopyButton value={project.publication.stableUrl} label={t("studio.playerUrl")} />
      </div>
      <div className="delivery-url">
        <span>{t("studio.versionUrl")}</span><code>{project.publication.versionUrl}</code>
        <CopyButton value={project.publication.versionUrl} label={t("studio.versionUrl")} />
      </div>
    </section>
  );
}

function VersionHistory({ versions, busy, archived, onPublish, onReview }: {
  versions: ProjectVersion[];
  busy: boolean;
  archived: boolean;
  onPublish: (versionId: string) => Promise<void>;
  onReview: (versionId: string) => Promise<void>;
}) {
  const { locale, t } = usePreferences();
  if (!versions.length) return null;
  const recentVersions = versions.slice(0, 5);
  const olderVersions = versions.slice(5);

  const renderVersion = (version: ProjectVersion) => {
    const canPublish = !archived && !version.isPublished && version.qualityStatus === "passed";
    const canReview = !archived && version.qualityStatus === "passed" && version.artReviewStatus === "pending";
    return (
      <li key={version.id}>
        <div className={`version-quality quality-${version.qualityStatus}`}>
          {version.qualityStatus === "passed" ? <CheckCircle2 size={15} aria-hidden="true" /> : version.qualityStatus === "failed" ? <XCircle size={15} aria-hidden="true" /> : <Clock3 size={15} aria-hidden="true" />}
          <span>v{version.number}</span>
        </div>
        <div className="version-description">
          <strong>{version.isPublished ? t("studio.onlineVersion") : t(qualityLabelKeys[version.qualityStatus])}</strong>
          <small title={version.artReviewSummary ?? version.qualitySummary ?? undefined}>{version.artReviewStatus === "passed" ? version.artReviewSummary ?? t("studio.artPassed") : version.artReviewStatus === "failed" ? version.artReviewSummary ?? t("studio.artFailed") : version.qualitySummary ?? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(version.createdAt))}</small>
        </div>
        {canReview ? (
          <button type="button" disabled={busy} onClick={() => onReview(version.id)}>
            <Sparkles size={14} aria-hidden="true" />{t("studio.approveArt")}
          </button>
        ) : canPublish && version.artReviewStatus === "passed" ? (
          <button type="button" disabled={busy} onClick={() => onPublish(version.id)}>
            <RotateCcw size={14} aria-hidden="true" />{t("studio.publishVersion")}
          </button>
        ) : <span className="version-current">{version.isPublished ? t("studio.currentOnline") : ""}</span>}
      </li>
    );
  };

  return (
    <section className="version-history" aria-labelledby="version-history-heading">
      <header><History size={16} aria-hidden="true" /><h3 id="version-history-heading">{t("studio.versionHistory")}</h3></header>
      <ol>
        {recentVersions.map(renderVersion)}
      </ol>
      {olderVersions.length ? (
        <details className="older-versions">
          <summary>{t("studio.olderVersions", { count: olderVersions.length })}</summary>
          <ol>{olderVersions.map(renderVersion)}</ol>
        </details>
      ) : null}
    </section>
  );
}

type Translator = ReturnType<typeof usePreferences>["t"];

function buildConversationText(build: Build | null, t: Translator) {
  if (!build) return t("studio.contractSaved");
  if (build.status === "queued") return t("studio.queued");
  if (build.status === "running") {
    const runningStep = build.steps.find((step) => step.status === "running");
    return runningStep ? t("studio.runningStep", { title: runningStep.title, detail: runningStep.detail }) : t("studio.runningNext");
  }
  if (build.status === "failed") return t("studio.failedText", { error: build.error ?? t("studio.noError") });
  return t("studio.succeededText", { count: build.steps.filter((step) => step.status === "succeeded").length });
}

function CreatorBrief({ project }: { project: ProjectDetail }) {
  const { locale, t } = usePreferences();
  const style = visualStyleOptions.find((option) => option.id === project.spec.visualStyle)!;

  return (
    <section className="creator-brief" aria-labelledby="creator-brief-heading">
      <header>
        <span className="brief-index">00</span>
        <h3 id="creator-brief-heading">{t("studio.creatorBrief")}</h3>
        <time>{messageTime(project.createdAt, locale)}</time>
      </header>
      <p>{project.idea}</p>
      <ul aria-label={t("studio.creatorBriefFacts")}>
        <li><span>{t("studio.genre")}</span>{project.spec.designProfile.genre}</li>
        <li><span>{t("studio.aspectFact")}</span>{project.spec.aspectRatio}</li>
        <li><span>{t("studio.visual")}</span>{style.label}</li>
      </ul>
    </section>
  );
}

function DirectionLog({ messages }: { messages: ProjectMessage[] }) {
  const { locale, t } = usePreferences();
  if (!messages.length) return null;

  return (
    <section className="direction-log" aria-labelledby="direction-log-heading">
      <header>
        <MessageSquareText size={16} aria-hidden="true" />
        <h3 id="direction-log-heading">{t("studio.directionLog")}</h3>
        <em>{t("studio.directionCount", { count: messages.length })}</em>
      </header>
      <div className="direction-notes">
        {messages.map((message) => (
          <article className={`direction-note note-${message.role}`} key={message.id}>
            <header>
              <span>{message.role === "user" ? <UserRound size={14} aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}{message.role === "user" ? t("studio.you") : t("brand.name")}</span>
              <time>{messageTime(message.createdAt, locale)}</time>
            </header>
            <p>{message.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

type WorkbenchPanelProps = {
  project: ProjectDetail;
  build: Build | null;
  messages: ProjectMessage[];
  loading: boolean;
  sending: boolean;
  archived: boolean;
  versions: ProjectVersion[];
  busy: boolean;
  canStartBuild: boolean;
  onSend: (content: string) => Promise<void>;
  onStartBuild: () => void;
  onPublishVersion: (versionId: string) => Promise<void>;
  onReviewVersion: (versionId: string) => Promise<void>;
};

function WorkbenchPanel({ project, build, messages, loading, sending, archived, versions, busy, canStartBuild, onSend, onStartBuild, onPublishVersion, onReviewVersion }: WorkbenchPanelProps) {
  const { t } = usePreferences();
  const [draft, setDraft] = useState("");
  const streamRef = useRef<HTMLDivElement>(null);
  const buildSignature = build?.steps.map((step) => step.status).join(":") ?? "empty";
  const completedSteps = build?.steps.filter((step) => step.status === "succeeded" || step.status === "failed").length ?? 0;
  const totalSteps = build?.steps.length ?? 0;
  const progress = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;

  useEffect(() => {
    if (!draft.trim()) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [draft]);

  useEffect(() => {
    const stream = streamRef.current;
    if (stream) stream.scrollTop = stream.scrollHeight;
  }, [build?.status, buildSignature, messages.length]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (content.length < 2 || sending) return;
    try {
      await onSend(content);
      setDraft("");
    } catch {
      // 页面上方会显示可恢复错误，保留草稿便于重试。
    }
  }

  return (
    <aside className="workbench-panel" aria-labelledby="workbench-panel-heading">
      <header className="workbench-panel-header">
        <div className="panel-title"><h2 id="workbench-panel-heading">{t("studio.productionPulse")}</h2></div>
        <div className="panel-pulse">
          <output className="panel-progress" aria-label={t("studio.progress", { progress })}>{progress}%</output>
          <span className={`panel-live-state state-${build?.status ?? "idle"}`}><i />{build?.status === "running" ? t("studio.building") : t("studio.discuss")}</span>
        </div>
      </header>

      <div className="workbench-stream" ref={streamRef} role="log" aria-live="polite" aria-busy={loading}>
        <CreatorBrief project={project} />

        <div className="production-system-note"><Sparkles size={15} aria-hidden="true" /><p>{t("studio.intro")}</p></div>
        <ConversationContract project={project} />

        <BuildSteps build={build} project={project} busy={busy} canConfirm={canStartBuild} onConfirm={onStartBuild} />

        <section className={`production-outcome event-${build?.status ?? "idle"}`}>
          <header><Activity size={15} aria-hidden="true" /><span>{t("studio.currentResult")}</span></header>
          <p>{buildConversationText(build, t)}</p>
        </section>

        {loading ? <div className="stream-loading"><LoaderCircle className="spin" size={16} /> {t("studio.readingJournal")}</div> : null}
        <DirectionLog messages={messages} />

        <DeliveryUrls project={project} />
        <VersionHistory versions={versions} busy={busy} archived={archived} onPublish={onPublishVersion} onReview={onReviewVersion} />
      </div>

      {build && (build.status === "queued" || build.status === "running") ? (
        <div className="build-progress" role="status" aria-label={t("studio.progress", { progress })}>
          <span>{t(statusLabelKeys[build.status])}</span>
          <div><i style={{ width: `${progress}%` }} /></div>
          <output>{completedSteps}/{totalSteps}</output>
        </div>
      ) : null}

      <form className="workbench-composer" onSubmit={submit}>
        <div className="composer-heading">
          <strong>{t("studio.directionTitle")}</strong>
          <p>{t("studio.directionHint")}</p>
        </div>
        <label className="sr-only" htmlFor="project-message">{t("studio.messageLabel")}</label>
        <div className="composer-field">
          <textarea
            id="project-message"
            name="project-message"
            value={draft}
            rows={2}
            minLength={2}
            maxLength={2_000}
            autoComplete="off"
            placeholder={t("studio.messagePlaceholder")}
            onChange={(event) => setDraft(event.currentTarget.value)}
            disabled={archived}
          />
          <button type="submit" disabled={archived || sending || draft.trim().length < 2} aria-label={t("studio.send")}>
            {sending ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
          </button>
        </div>
        <div className="composer-note"><span>{archived ? t("studio.archivedNote") : t("studio.messageNote")}</span><output>{draft.length}/2000</output></div>
      </form>
    </aside>
  );
}

type ProjectStudioProps = {
  project: ProjectDetail;
  onProjectChange: (project: ProjectDetail) => void;
};

export function ProjectStudio({ project, onProjectChange }: ProjectStudioProps) {
  const { t } = usePreferences();
  const [build, setBuild] = useState<Build | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getLatestBuild(project.id), getProjectMessages(project.id), getProjectVersions(project.id)])
      .then(([nextBuild, nextMessages, nextVersions]) => {
        if (!active) return;
        setBuild(nextBuild);
        setMessages(nextMessages);
        setVersions(nextVersions);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "制作记录读取失败。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [project.id]);

  useEffect(() => {
    if (build?.status !== "queued" && build?.status !== "running") return;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const next = await getLatestBuild(project.id);
        if (!active) return;
        setBuild(next);
        if (next?.status === "succeeded") {
          const [nextProject, nextVersions] = await Promise.all([getProject(project.id), getProjectVersions(project.id)]);
          if (!active) return;
          onProjectChange(nextProject);
          setVersions(nextVersions);
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "构建状态更新失败。");
      }
    }, 450);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [build?.status, onProjectChange, project.id]);

  async function beginBuild() {
    setBusy(true);
    setError(null);
    try {
      setBuild(await startBuild(project.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法启动构建。");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const nextProject = await publishProject(project.id);
      onProjectChange(nextProject);
      setVersions(await getProjectVersions(project.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "发布没有完成。");
    } finally {
      setBusy(false);
    }
  }

  async function publishVersion(versionId: string) {
    setBusy(true);
    setError(null);
    try {
      const nextProject = await publishProjectVersion(project.id, versionId);
      onProjectChange(nextProject);
      setVersions(await getProjectVersions(project.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("studio.publishFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function reviewArt(versionId: string) {
    setBusy(true);
    setError(null);
    try {
      setVersions(await reviewVersionArt(project.id, versionId, "passed", t("studio.artReviewEvidence")));
      onProjectChange(await getProject(project.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("studio.artReviewFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive() {
    setBusy(true);
    setError(null);
    try {
      if (project.archivedAt) {
        onProjectChange(await restoreProject(project.id));
      } else {
        await archiveProject(project.id);
        window.location.assign("/projects#archive");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("projects.archiveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(content: string) {
    setSending(true);
    setError(null);
    try {
      setMessages(await sendProjectMessage(project.id, content));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "制作意见没有保存，请稍后重试。");
      throw caught;
    } finally {
      setSending(false);
    }
  }

  const canBuild = !project.archivedAt && !project.fixtureKind && (!build || build.status === "failed" || build.status === "succeeded");
  const canPublish = !project.archivedAt && project.status !== "contract_ready" && build?.status === "succeeded" && project.version.qualityStatus === "passed" && project.version.artReviewStatus === "passed";

  return (
    <>
      <a className="skip-link skip-link-dark" href="#main-content">{t("a11y.skip")}</a>
      <main className="maker-workbench" id="main-content" tabIndex={-1}>
      <header className="workbench-topbar">
        <div className="workbench-brand-group">
          <a className="workbench-brand" href="/" aria-label={t("brand.home")}><span aria-hidden="true">界</span><strong>{t("brand.name")}</strong></a>
          <a className="workbench-projects-link" href="/projects#projects"><ArrowLeft size={15} aria-hidden="true" /> {t("studio.back")}</a>
          <div className="workbench-project-title">
            <strong>{project.title}</strong><span>v{project.version.number} · {project.spec.dimensions.toUpperCase()}</span>
          </div>
          <span className={`topbar-build-state state-${build?.status ?? "idle"}`}>
            {loading ? <LoaderCircle className="spin" size={13} aria-hidden="true" /> : <i />}
            {loading ? t("studio.loading") : build ? t(statusLabelKeys[build.status]) : t("projects.contractReady")}
          </span>
        </div>
        <div className="workbench-topbar-actions">
          <button className="workbench-button button-secondary" type="button" disabled={busy} onClick={toggleArchive}>
            {project.archivedAt ? <ArchiveRestore size={15} aria-hidden="true" /> : <Archive size={15} aria-hidden="true" />}
            {project.archivedAt ? t("projects.restore") : t("projects.archive")}
          </button>
          {canBuild ? (
            <button className="workbench-button button-secondary" type="button" disabled={busy} onClick={beginBuild}>
              {busy ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Code2 size={16} aria-hidden="true" />}
              {build?.status === "failed" ? t("studio.rebuild") : build?.status === "succeeded" ? t("studio.newBuild") : t("studio.build")}
            </button>
          ) : null}
          {canPublish ? (
            <button className="workbench-button button-primary" type="button" disabled={busy} onClick={publish}>
              {busy ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Rocket size={16} aria-hidden="true" />} {t("studio.publish")}
            </button>
          ) : null}
          {project.publication ? (
            <a className="workbench-button button-primary" href={project.publication.stableUrl} target="_blank" rel="noreferrer">
              <Play size={15} aria-hidden="true" /> {t("studio.play")}
            </a>
          ) : null}
          <ModelSettingsButton compact />
          <PreferenceControls compact />
        </div>
      </header>

      <div className={`workbench-error-slot ${error ? "has-error" : project.archivedAt ? "has-archive" : ""}`} role={error ? "alert" : project.archivedAt ? "status" : undefined}>
        {error ? <><XCircle size={17} aria-hidden="true" />{error}</> : project.archivedAt ? <><Archive size={16} aria-hidden="true" />{t("studio.archivedNotice")}</> : null}
      </div>

      <div className="workbench-body">
        <PreviewPane project={project} build={build} />
        <WorkbenchPanel
          project={project}
          build={build}
          messages={messages}
          loading={loading}
          sending={sending}
          archived={Boolean(project.archivedAt)}
          versions={versions}
          busy={busy}
          canStartBuild={canBuild}
          onSend={sendMessage}
          onStartBuild={beginBuild}
          onPublishVersion={publishVersion}
          onReviewVersion={reviewArt}
        />
      </div>

      </main>
    </>
  );
}
