import { LiveExcerpt } from "../components/WaitingActivity";
import { BuildStageList } from "../components/BuildStageList";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArtReviewHistory } from "./ArtReviewHistory";
import {
  Activity,
  Archive,
  ArchiveRestore,
  Check,
  CheckCircle2,
  Clock3,
  Code2,
  Copy,
  ExternalLink,
  FileCheck2,
  Globe2,
  History,
  LoaderCircle,
  Maximize2,
  MessageSquareText,
  Monitor,
  Play,
  RefreshCw,
  Rocket,
  RotateCcw,
  ScanSearch,
  Smartphone,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";
import { visualStyleOptions, type Build, type IdeaAnalysis, type ProjectDetail, type ProjectMessage, type ProjectVersion, type RevisionPlan } from "../shared/contracts";
import {
  archiveProject,
  cancelBuild,
  getLatestBuild,
  getPlayableBuild,
  getProject,
  getProjectMessages,
  getProjectVersions,
  getDemoReview,
  approveDemoReview,
  publishProject,
  publishProjectVersion,
  restoreProject,
  startBuild,
} from "./api";
import { ModelSettingsButton } from "./ModelSettingsButton";
import { RevisionComposer } from "./RevisionComposer";
import { FailureDetails } from "../components/FailureDetails";
import { confirmProjectRevision, recoverPendingRevision } from "./project-revision";
import { localizedTemplateNames, PreferenceControls, usePreferences, type ResolvedLocale } from "./preferences";
import { postGameLocale, withGameLocale } from "./game-locale";
import { projectCopy } from "./project-copy";

const statusLabelKeys = {
  queued: "studio.buildQueued",
  running: "studio.building",
  succeeded: "studio.buildReady",
  failed: "studio.buildFailed",
  cancelled: "studio.buildCancelled",
} as const;

const qualityLabelKeys = {
  legacy: "studio.quality.legacy",
  pending: "studio.quality.pending",
  passed: "studio.quality.passed",
  failed: "studio.quality.failed",
} as const;

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

export function PreviewPane({ project, build }: { project: ProjectDetail; build: Build | null }) {
  const { locale, t } = usePreferences();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const localizedUrl = useRef<{ source: string; value: string } | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [device, setDevice] = useState<"desktop" | "mobile">(() => (
    typeof window !== "undefined" && window.matchMedia("(max-width: 620px)").matches ? "mobile" : "desktop"
  ));
  const shellRef = useRef<HTMLDivElement>(null);
  const [playable, setPlayable] = useState<{ projectId: string; url: string } | null>(null);
  useEffect(() => {
    let active = true;
    if (build?.status === "succeeded" && build.previewUrl) {
      setPlayable({ projectId: project.id, url: build.previewUrl });
    } else {
      void getPlayableBuild(project.id).then(previous => {
        if (active && previous?.previewUrl) setPlayable({ projectId: project.id, url: previous.previewUrl });
      }).catch(() => { /* Keep the last known playable version during a read outage. */ });
    }
    return () => { active = false; };
  }, [project.id, build?.id, build?.status, build?.previewUrl]);
  const previewUrl = (build?.status === "succeeded" ? build.previewUrl : null) ?? (playable?.projectId === project.id ? playable.url : null) ?? project.publication?.stableUrl;
  let frameUrl: string | null = null;
  if (previewUrl) {
    try {
      if (localizedUrl.current?.source !== previewUrl) localizedUrl.current = { source: previewUrl, value: withGameLocale(previewUrl, locale) };
      frameUrl = localizedUrl.current.value;
    } catch { frameUrl = null; }
  }
  useEffect(() => { postGameLocale(frameRef.current, locale); }, [locale, frameUrl]);
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
      {frameUrl && (build?.status === "running" || build?.status === "queued" || build?.status === "failed" || build?.status === "cancelled") && <p className="preview-version-notice" role="status">{build.status === "failed" || build.status === "cancelled" ? t("studio.previewOldFailed") : t("studio.previewOldBuilding")}</p>}
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
            disabled={!frameUrl}
            onClick={() => setFrameKey((value) => value + 1)}
            aria-label={t("studio.refresh")}
            title={t("studio.refresh")}
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
          {frameUrl ? (
            <a className="workbench-icon-button" href={frameUrl} target="_blank" rel="noreferrer" aria-label={t("studio.open")} title={t("studio.open")}>
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          ) : null}
          <button className="workbench-icon-button" type="button" onClick={enterFullscreen} aria-label={t("studio.fullscreen")} title={t("studio.fullscreen")}>
            <Maximize2 size={16} aria-hidden="true" />
          </button>
          <span className={`preview-runtime-status status-${build?.status ?? "idle"}`}>
            <i /> {build?.status === "running" ? t("studio.runtime.building") : frameUrl ? t("studio.runtime.playable") : t("studio.runtime.waiting")}
          </span>
        </div>
      </header>
      <div className="preview-stage" ref={shellRef} data-device={device} data-aspect={project.spec.aspectRatio} style={previewStyle}>
        <div className="preview-canvas">
          {frameUrl ? (
            <iframe
              ref={frameRef}
              key={`${frameUrl}-${frameKey}`}
              className="game-preview-frame"
              src={frameUrl}
              onLoad={() => postGameLocale(frameRef.current, locale)}
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
              <small>{t("studio.previewTagline")}</small>
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

export function DesignDecisionCards({ project }: { project: ProjectDetail }) {
  const { locale, t } = usePreferences();
  const connective = {
    "zh-CN": { failures: "{count} 次失败：", practice: "综合练习", colon: "：", separator: "；", joiner: "、" },
    "zh-TW": { failures: "失敗 {count} 次：", practice: "綜合練習", colon: "：", separator: "；", joiner: "、" },
    en: { failures: "After {count} failures: ", practice: "Combined practice", colon: ": ", separator: "; ", joiner: ", " },
    ja: { failures: "{count} 回失敗後：", practice: "総合練習", colon: "：", separator: "；", joiner: "、" },
  }[locale];
  const contract = project.spec.designContract;
  if (!contract) return null;
  const mechanicLabels = new Map(contract.mechanics.map(({ id, label }) => [id, label]));
  const learning = contract.onboarding.map(({ requiredAction }) => requiredAction).join(" → ");
  const progression = contract.content.beats.map(({ label, changeReason }) => `${label}${connective.colon}${changeReason}`).join(connective.separator);
  const assistance = contract.assistance.steps.map(({ afterFailures, message }) => `${connective.failures.replace("{count}", new Intl.NumberFormat(locale).format(afterFailures))}${message}`).join(connective.separator);
  const variation = contract.content.beats.map((beat) => {
    const labels = [...beat.introducesMechanicIds, ...beat.practicesMechanicIds].map((id) => mechanicLabels.get(id)).filter(Boolean);
    return `${beat.label}${connective.colon}${labels.length ? [...new Set(labels)].join(connective.joiner) : connective.practice}`;
  }).join(connective.separator);
  return (
    <div className="design-decision-grid" role="group" aria-label={t("studio.design.summary")}>
      <article><strong>{t("studio.design.learning")}</strong><p>{learning}</p></article>
      <article><strong>{t("studio.design.progression")}</strong><p>{progression}</p></article>
      <article><strong>{t("studio.design.assistance")}</strong><p>{assistance}</p></article>
      <article><strong>{t("studio.design.variation")}</strong><p>{variation}</p></article>
    </div>
  );
}

function ConversationContract({ project }: { project: ProjectDetail }) {
  const { t } = usePreferences();
  const style = visualStyleOptions.find((option) => option.id === project.spec.visualStyle)!;
  const passed = project.spec.acceptanceCriteria.filter((criterion) => criterion.status === "passed").length;
  const resourceSummary = project.spec.resourcePlanning?.summary;

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
      {resourceSummary ? (
        <div className="contract-resource-readiness" role="status">
          <strong>{t("studio.resources.title")}</strong>
          <p>{t("studio.resources.summary", {
            reusable: resourceSummary.reusable,
            generation: resourceSummary.needsGeneration,
            review: resourceSummary.needsReview,
          })}</p>
        </div>
      ) : null}
      <div className="contract-loop">
        <span>{t("studio.loop")}</span>
        <ol>{project.spec.designProfile.coreLoop.map((item) => <li key={item}>{item}</li>)}</ol>
      </div>
      <DesignDecisionCards project={project} />
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
      <DesignDecisionCards project={project} />

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
  const { locale, t } = usePreferences();
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
      <BuildStageList steps={build.steps} evidenceLabel={t("studio.stageEvidence")} />
      {build.status === "failed" ? <div className="workbench-build-error"><strong>{projectCopy(locale, "failureReason")}</strong><p>{projectCopy(locale, build.failureDetails?.length ? "affectedNext" : "noFailureDetail")}</p></div> : null}
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

function VersionHistory({ projectId, versions, busy, archived, onPublish }: {
  projectId: string;
  versions: ProjectVersion[];
  busy: boolean;
  archived: boolean;
  onPublish: (versionId: string) => Promise<void>;
}) {
  const { locale, t } = usePreferences();
  if (!versions.length) return null;
  const recentVersions = versions.slice(0, 5);
  const olderVersions = versions.slice(5);

  const renderVersion = (version: ProjectVersion) => {
    const canPublish = !archived && !version.isPublished && version.qualityStatus === "passed";
    const canReview = !archived && version.qualityStatus === "passed" && (version.artReviewStatus === "pending" || version.artReviewStatus === "failed");
    return (
      <li key={version.id}>
        <div className={`version-quality quality-${version.qualityStatus}`}>
          {version.qualityStatus === "passed" ? <CheckCircle2 size={15} aria-hidden="true" /> : version.qualityStatus === "failed" ? <XCircle size={15} aria-hidden="true" /> : <Clock3 size={15} aria-hidden="true" />}
          <span>v{version.number}</span>
        </div>
        <div className="version-description">
          <p>{projectCopy(locale, "autoCheck", { quality: projectCopy(locale, version.qualityStatus === "passed" ? "passed" : version.qualityStatus === "failed" ? "failed" : "pending"), art: projectCopy(locale, version.artReviewStatus === "passed" ? "artPassed" : version.artReviewStatus === "failed" ? "failed" : "artPending") })}</p>
          <strong>{version.isPublished ? t("studio.onlineVersion") : t(qualityLabelKeys[version.qualityStatus])}</strong>
          <small title={version.artReviewSummary ?? version.qualitySummary ?? undefined}>{version.artReviewStatus === "passed" ? version.artReviewSummary ?? t("studio.artPassed") : version.artReviewStatus === "failed" ? version.artReviewSummary ?? t("studio.artFailed") : version.qualitySummary ?? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(version.createdAt))}</small>
        </div>
        {canReview ? (
          <p>{projectCopy(locale, "formalReview")}</p>
        ) : canPublish && version.artReviewStatus === "passed" ? (
          <button type="button" disabled={busy} onClick={() => onPublish(version.id)}>
            <RotateCcw size={14} aria-hidden="true" />{t("studio.publishVersion")}
          </button>
        ) : <span className="version-current">{version.isPublished ? t("studio.currentOnline") : ""}</span>}
        <ArtReviewHistory key={`${projectId}-${version.id}`} projectId={projectId} versionId={version.id} revision={version.artReviewedAt} />
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

function buildConversationText(build: Build | null, t: Translator, locale: ResolvedLocale) {
  if (!build) return t("studio.contractSaved");
  if (build.status === "queued") return t("studio.queued");
  if (build.status === "running") {
    const runningStep = build.steps.find((step) => step.status === "running");
    return runningStep ? t("studio.runningStep", { title: runningStep.title, detail: runningStep.detail }) : t("studio.runningNext");
  }
  if (build.status === "failed") return projectCopy(locale, build.failureDetails?.length ? "failedWithSteps" : "noFailureDetail");
  if (build.status === "cancelled") return projectCopy(locale, "stoppedPlayable");
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

function DemoReviewGate({ project }: { project: ProjectDetail }) {
  const { locale } = usePreferences();
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void getDemoReview(project.id, project.version.id).then(review => { if (active) setApproved(Boolean(review)); }).catch(() => { if (active) setError(projectCopy(locale, "reviewLoadFailed")); });
    return () => { active = false; };
  }, [locale, project.id, project.version.id]);
  const approve = async () => {
    setBusy(true); setError("");
    try { await approveDemoReview(project.id, project.version.id); setApproved(true); }
    catch { setError(projectCopy(locale, "reviewSaveFailed")); }
    finally { setBusy(false); }
  };
  return <section className="workspace-summary" aria-label={projectCopy(locale, "reviewLabel")}>
    <strong>{projectCopy(locale, approved ? "reviewed" : "reviewFirst")}</strong>
    {approved
      ? <p>{projectCopy(locale, "reviewedDetail")}</p>
      : <><p>{projectCopy(locale, "reviewDetail")}</p><button type="button" className="workbench-button button-primary" disabled={busy} onClick={() => void approve()}>{projectCopy(locale, busy ? "reviewSaving" : "reviewApprove")}</button></>}
    {error && <p role="alert">{error}</p>}
  </section>;
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
  stopping: boolean;
  onSend: (content: string, revisionPlan: RevisionPlan) => Promise<void>;
  onStartBuild: () => void;
  onRetryBuild: () => Promise<void>;
  onCancelBuild: () => Promise<void>;
  onPublishVersion: (versionId: string) => Promise<void>;
};

function WorkbenchPanel({ project, build, messages, loading, sending, archived, versions, busy, canStartBuild, stopping, onSend, onStartBuild, onRetryBuild, onCancelBuild, onPublishVersion }: WorkbenchPanelProps) {
  const { locale, t } = usePreferences();
  const streamRef = useRef<HTMLDivElement>(null);
  const completedSteps = build?.steps.filter((step) => step.status === "succeeded" || step.status === "failed").length ?? 0;
  const totalSteps = build?.steps.length ?? 0;
  const progress = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const canRetryFailure = Boolean(build?.failureDetails?.length && build.failureDetails.every(detail => detail.retryable));

  return (
    <aside className="workbench-panel" aria-labelledby="workbench-panel-heading">
      <header className="workbench-panel-header">
        <div className="panel-title"><h2 id="workbench-panel-heading">{projectCopy(locale, "workspace")}</h2></div>
        <div className="panel-pulse">
          <span className={`panel-live-state state-${build?.status ?? "idle"}`}><i />{build?.status === "running" || build?.status === "queued" ? t("studio.building") : projectCopy(locale, "playModify")}</span>
        </div>
      </header>

      <div className="workbench-stream" ref={streamRef} aria-busy={loading}>
        <section className="workspace-summary" aria-live="polite"><span>{projectCopy(locale, "progress")}</span><h3>{projectCopy(locale, stopping ? "stoppingTitle" : loading ? "loadingTitle" : build?.status === "succeeded" ? "readyTitle" : build?.status === "failed" ? "failedTitle" : build?.status === "cancelled" ? "stoppedTitle" : build?.status === "running" ? "runningTitle" : build?.status === "queued" ? "queuedTitle" : "idleTitle")}</h3><p>{stopping ? projectCopy(locale, "stoppingDetail") : build?.status === "cancelled" ? projectCopy(locale, "stoppedDetail") : build?.status === "running" ? build.steps.find(step => step.status === "running")?.detail ?? projectCopy(locale, "runningDetail") : projectCopy(locale, "idleDetail")}</p>{build?.status === "running" && build.steps.find(step => step.status === "running")?.excerpt ? <LiveExcerpt text={build.steps.find(step => step.status === "running")!.excerpt!} /> : null}</section>
        {build?.status === "failed" && <FailureDetails error={build.failureDetails?.length ? build.error : undefined} details={build.failureDetails} fallback={projectCopy(locale, "noFailureDetail")} />}
        {build?.status === "failed" && !archived && canStartBuild && canRetryFailure ? <div className="production-retry" role="group" aria-label={projectCopy(locale, "retry")}>
          <button type="button" className="workbench-button button-primary" disabled={busy} onClick={() => void onRetryBuild()}>{busy ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />} {projectCopy(locale, "retryButton")}</button>
          <p>{projectCopy(locale, "retryDetail")}</p>
        </div> : null}
        {(build?.status === "queued" || build?.status === "running") && <div className="review-actions"><button type="button" className="workbench-button button-secondary stop-action" disabled={stopping} onClick={() => void onCancelBuild()}>{projectCopy(locale, stopping ? "stopping" : "stop")}</button></div>}
        {project.status !== "contract_ready" && <DemoReviewGate project={project} />}
        <RevisionComposer key={project.id} projectId={project.id} disabled={archived || busy || sending || loading || stopping || !canStartBuild} working={build?.status === "running" || build?.status === "queued"} onConfirm={onSend} />
        {!!messages.filter(message => message.role === "user").length && <details className="workspace-details"><summary>{projectCopy(locale, "recent")}</summary><DirectionLog messages={messages.filter(message => message.role === "user").slice(-3)} /></details>}
        <details className="workspace-details"><summary>{projectCopy(locale, "full")}</summary><p>{projectCopy(locale, "fullDetail")}</p>
        <CreatorBrief project={project} />

        <div className="production-system-note"><Sparkles size={15} aria-hidden="true" /><p>{t("studio.intro")}</p></div>
        <ConversationContract project={project} />

        <BuildSteps build={build} project={project} busy={busy} canConfirm={canStartBuild} onConfirm={onStartBuild} />

        <section className={`production-outcome event-${build?.status ?? "idle"}`}>
          <header><Activity size={15} aria-hidden="true" /><span>{t("studio.currentResult")}</span></header>
          <p>{buildConversationText(build, t, locale)}</p>
        </section>

        {loading ? <div className="stream-loading"><LoaderCircle className="spin" size={16} /> {t("studio.readingJournal")}</div> : null}
        <DirectionLog messages={messages} />

        <DeliveryUrls project={project} />
        <VersionHistory projectId={project.id} versions={versions} busy={busy} archived={archived} onPublish={onPublishVersion} />
        </details>
      </div>

      {build && (build.status === "queued" || build.status === "running") ? (
        <div className="build-progress" role="status" aria-label={t("studio.progress", { progress })}>
          <span>{t(statusLabelKeys[build.status])}</span>
          <div><i style={{ width: `${progress}%` }} /></div>
          <output>{completedSteps}/{totalSteps}</output>
        </div>
      ) : null}

    </aside>
  );
}

type ProjectStudioProps = {
  project: ProjectDetail;
  onProjectChange: (project: ProjectDetail) => void;
};

export function ProjectStudio({ project, onProjectChange }: ProjectStudioProps) {
  const { locale, t } = usePreferences();
  const [build, setBuild] = useState<Build | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [stopping, setStopping] = useState(false);
  const cancellingBuild = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([recoverPendingRevision(project.id).then(recovered => recovered ?? getLatestBuild(project.id)), getProjectMessages(project.id), getProjectVersions(project.id)])
      .then(([nextBuild, nextMessages, nextVersions]) => {
        if (!active || cancellingBuild.current === build?.id) return;
        setBuild(nextBuild);
        setMessages(nextMessages);
        setVersions(nextVersions);
      })
      .catch((caught) => {
        if (active) setError(caught);
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
        if (active) setError(caught);
      }
    }, 450);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [build?.status, onProjectChange, project.id]);

  async function beginBuild() {
    document.getElementById("revision-message")?.focus();
  }

  // 失败后的重新制作只由用户点击触发，沿用当前方案与已生成的图片，不改项目记录。
  async function retryBuild() {
    setBusy(true);
    setError(null);
    try {
      setBuild(await startBuild(project.id));
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  async function cancelCurrentBuild() {
    if (!build || stopping) return;
    cancellingBuild.current = build.id;
    setStopping(true);
    setError(null);
    try {
      const next = await cancelBuild(project.id, build.id);
      setBuild(next);
      if (next.status === "succeeded") {
        const [nextProject, nextVersions] = await Promise.all([getProject(project.id), getProjectVersions(project.id)]);
        onProjectChange(nextProject);
        setVersions(nextVersions);
      }
    } catch (caught) {
      setError(caught);
    } finally {
      cancellingBuild.current = null;
      setStopping(false);
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
      setError(caught);
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
      setError(caught);
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
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(content: string, revisionPlan: RevisionPlan) {
    setSending(true);
    setError(null);
    try {
      setBuild(await confirmProjectRevision(project.id, content, revisionPlan));
      // Failure to refresh discussion after acceptance must never make the
      // confirmed paid request look unaccepted or encourage another submission.
      try { setMessages(await getProjectMessages(project.id)); } catch { /* Build receipt already confirmed. */ }
    } catch (caught) {
      setError(caught);
      throw caught;
    } finally {
      setSending(false);
    }
  }

  const canBuild = !project.archivedAt && !project.fixtureKind && (!build || build.status === "failed" || build.status === "succeeded" || build.status === "cancelled");
  const canPublish = !project.archivedAt && project.status !== "contract_ready" && build?.status === "succeeded" && project.version.qualityStatus === "passed" && project.version.artReviewStatus === "passed";

  return (
    <>
      <a className="skip-link skip-link-dark" href="#main-content">{t("a11y.skip")}</a>
      <main className="maker-workbench" id="main-content" tabIndex={-1}>
      <header className="workbench-topbar">
        <div className="workbench-brand-group">
          <a className="workbench-brand" href="/" aria-label={t("brand.home")}><span aria-hidden="true">界</span><strong>{t("brand.name")}</strong></a>
          <nav className="workbench-nav" aria-label={t("nav.create")}>
            <a href="/">{t("nav.games")}</a>
            <a href="/create">{t("nav.gameCreate")}</a>
            <a href="/projects">{t("nav.projects")}</a>
          </nav>
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
              {projectCopy(locale, "modify")}
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

      <div className={`workbench-error-slot ${error ? "has-error" : project.archivedAt ? "has-archive" : ""}`}>
        {Boolean(error) ? <><XCircle size={17} aria-hidden="true" /><FailureDetails error={error} fallback={projectCopy(locale, "actionFallback")} /></> : project.archivedAt ? <><Archive size={16} aria-hidden="true" />{t("studio.archivedNotice")}</> : null}
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
          stopping={stopping}
          onSend={sendMessage}
          onStartBuild={beginBuild}
          onRetryBuild={retryBuild}
          onCancelBuild={cancelCurrentBuild}
          onPublishVersion={publishVersion}
        />
      </div>

      </main>
    </>
  );
}
