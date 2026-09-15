import { useEffect, useState } from "react";
import type { StudioDraft } from "../domain/types";
import { getTemplate } from "../domain/templates";
import { DOMAIN_TEMPLATE_ART } from "../domain/templateResolution";
import { gameTemplateSchema, type GameDesignProfile, type RevisionPlan } from "../shared/contracts";
import { cancelDesignPreview, getDesignPreview } from "../domain/designPreviewCache";
import { WaitingActivity } from "./WaitingActivity";
import { streamingDesignText } from "../domain/streamingDesignText";
import type { DesignPreviewPhase } from "../web/api";
import { renovationScopeInstruction } from "../shared/renovation-scope";
import { FailureDetails } from "./FailureDetails";
import { resolveCreationModeIntent } from "../shared/generated-blueprint";
import { failureDetailsFrom, StudioApiError } from "../web/failure";
import { resolveEarlyStyleDirection } from "../shared/early-style";
import { useComponentLocale } from "./component-i18n";
import { formatCopy, liveDesignCopy } from "./live-design-i18n";

export function LiveDesignReview({ draft, revisionPlan, onBack, onConfirm }: { draft: StudioDraft; revisionPlan?: RevisionPlan; onBack: () => void; onConfirm: (text: string, profile: GameDesignProfile, originalIdea: string, referenceFallback?: { decision: "user-approved-original-demo"; gameplayDescription: string }) => void }) {
  const locale = useComponentLocale();
  const c = liveDesignCopy[locale];
  const [fallbackDescription, setFallbackDescription] = useState("");
  const [referenceFallback, setReferenceFallback] = useState<{ decision: "user-approved-original-demo"; gameplayDescription: string } | null>(null);
  const template = draft.creationMode === "template-remix" ? getTemplate(draft.templateId) : undefined;
  const request = template
    ? ["基于游戏：" + (draft.sourceGame?.title ?? template.name), "原玩法：" + template.coreLoop,
      ...(revisionPlan ? ["用户已确认的修改项：", ...revisionPlan.operations.map(operation => operation.content)] : [renovationScopeInstruction(draft.revisionScope, "用户指定的局部调整：" + draft.freeRequest)]),
      ...template.suggestions.filter(item => draft.selectedSuggestionIds.includes(item.id)).map(item => item.description)].join("\n")
    : draft.newGameBrief;
  const mapped = gameTemplateSchema.safeParse(template ? DOMAIN_TEMPLATE_ART[template.id] : "generated");
  const templateId = mapped.success ? mapped.data : "generated";
  const styleDirection = resolveEarlyStyleDirection(request, templateId);
  const sourceProjectId = draft.creationMode === "template-remix" ? draft.sourceGame?.id : undefined;
  const creationMode = resolveCreationModeIntent({ idea: request, sourceProjectId, referenceFallback: referenceFallback ?? undefined });
  const previewInput = {
    idea: request,
    template: templateId,
    creationMode,
    artStyle: styleDirection.artStyle,
    visualStyle: styleDirection.visualStyle,
    ...(referenceFallback ? { referenceFallback } : {}),
    ...(draft.creationMode === "mechanic-composition" ? { spriteAnimation: draft.spriteAnimation } : {}),
    ...(draft.creationMode === "mechanic-composition" && draft.aspectRatio ? { aspectRatio: draft.aspectRatio } : {}),
    ...(template && draft.sourceGame ? revisionPlan ? { sourceProjectId: draft.sourceGame.id, revisionPlan } : { sourceProjectId: draft.sourceGame.id, revisionScope: draft.revisionScope } : {}),
  };
  const [result, setResult] = useState<{ key: string; profile: GameDesignProfile } | null>(null);
  const [failure, setFailure] = useState<{ key: string; reason: unknown } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [partial, setPartial] = useState({ key: "", text: "" });
  const [phase, setPhase] = useState<{ key: string; value: DesignPreviewPhase; startedAt: string | null }>({ key: "", value: "submitted", startedAt: null });
  const [stoppedKey, setStoppedKey] = useState<string | null>(null);
  const [stoppingKey, setStoppingKey] = useState<string | null>(null);
  const key = JSON.stringify([previewInput, attempt]);
  const profile = result?.key === key ? result.profile : null;
  const error = failure?.key === key ? failure.reason : null;
  const errorDetails = error ? failureDetailsFrom(error) : [];
  const referenceEvidenceMissing = errorDetails.some(detail => detail.code === "REFERENCE_EVIDENCE_REQUIRED");
  const referenceGameplayUnverified = errorDetails.some(detail => detail.code === "REFERENCE_GAMEPLAY_UNVERIFIED");
  const referenceNegotiation = referenceEvidenceMissing || referenceGameplayUnverified;
  const failedInspection = error instanceof StudioApiError ? error.referenceInspection : undefined;
  const fallbackDescriptionContent = fallbackDescription.replace(/https?:\/\/\S+/gi, "").trim();
  const fallbackDescriptionReady = Boolean(fallbackDescriptionContent) && !/^(?:我想|请)?(?:复制|复刻|参考|照着|仿照)(?:这个|该)?(?:游戏|作品)?[。！!，,\s]*$/.test(fallbackDescriptionContent);
  const stopped = stoppedKey === key;
  const stopping = stoppingKey === key;
  useEffect(() => {
    if (stopped) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const value = await getDesignPreview(
          previewInput, attempt > 0,
          text => { if (active) setPartial({ key, text }); },
          (value, startedAt) => { if (active) setPhase({ key, value, startedAt }); },
        );
        if (active) setResult({ key, profile: value });
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (active) setFailure({ key, reason });
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [key, stopped]);
  const stopPreview = () => {
    if (stopping || stopped) return;
    setStoppingKey(key);
    cancelDesignPreview(previewInput);
    setPartial({ key, text: "" });
    // design-preview owns no durable job. Closing its request stream is the server's
    // cancellation signal, so only mark it stopped once that abort has been issued.
    queueMicrotask(() => { setStoppedKey(key); setStoppingKey(null); });
  };
  const backToEdit = () => { if (!profile && !error && !stopped) stopPreview(); onBack(); };
  const sections = profile ? [
    [c.section.genre, profile.genre], [c.section.fantasy, profile.playerFantasy], [c.section.audience, profile.targetPlayer],
    [c.section.duration, profile.sessionLength], [c.section.loop, profile.coreLoop.join(" → ")],
    [c.section.win, profile.winCondition], [c.section.fail, profile.failCondition],
    ...(profile.generatedCampaign ? [[c.section.campaign, `${profile.generatedCampaign.mode === "endless" ? c.endless : formatCopy(c.levels, { count: profile.generatedCampaign.levelCount })}；${profile.generatedCampaign.failurePolicy === "forbidden" ? c.noFailure : c.retryFailure}。${profile.generatedCampaign.rationale}`]] : []),
    ...(profile.generatedBlueprint ? [
      ...(profile.generatedBlueprint.coreDecision || profile.generatedBlueprint.tension || profile.generatedBlueprint.masterySignal ? [[c.section.tradeoff, [profile.generatedBlueprint.coreDecision, profile.generatedBlueprint.tension && formatCopy(c.why, { text: profile.generatedBlueprint.tension }), profile.generatedBlueprint.masterySignal && formatCopy(c.mastery, { text: profile.generatedBlueprint.masterySignal })].filter(Boolean).join("\n")]] : []),
      [c.section.assets, profile.generatedBlueprint.sprites.length ? formatCopy(c.bitmaps, { roles: profile.generatedBlueprint.sprites.map(({ role }) => role).join("、") }) : c.procedural],
    ] : []),
    [c.section.art, formatCopy(c.artLine, { label: styleDirection.label, tone: styleDirection.tone, shape: styleDirection.shape, rendering: styleDirection.rendering })],
    [c.section.onboarding, profile.onboarding.join("\n")], [c.section.progression, profile.progression.join("\n")],
    [c.section.difficulty, profile.difficultyCurve.join("\n")], [c.section.feel, profile.gameFeel.join("\n")],
    [c.section.accessibility, profile.accessibility.join("\n")], [c.section.risks, profile.productionRisks.join("\n")],
  ].filter(([, value]) => value) : [];
  const primarySections = new Set([c.section.fantasy, c.section.tradeoff, c.section.duration, c.section.loop, c.section.win, c.section.campaign, c.section.art]);
  return <section className="review-screen live-design-review" id="live-game-design" aria-label={c.aria}>
    <header className="review-heading"><div><span className="eyebrow">{c.eyebrow}</span><h1>{template ? formatCopy(c.personalized, { title: draft.sourceGame?.title ?? template.name }) : creationMode === "reference-replica" ? c.referenceTitle : c.originalTitle}</h1><p>{template ? c.templateIntro : creationMode === "reference-replica" ? c.referenceIntro : c.originalIntro}{c.modelNote}</p></div></header>
    {!profile && !error && !stopped && !stopping && <WaitingActivity key={key} startedAt={phase.key === key ? phase.startedAt : null} elapsedLabel={creationMode === "reference-replica" ? c.refElapsed : c.planElapsed} label={creationMode === "reference-replica" && (phase.key !== key || phase.value === "submitted" || phase.value === "reference-acquiring") ? c.acquiring : phase.value === "reference-ready" ? c.refReady : phase.key !== key || phase.value === "submitted" ? c.submitted : phase.value === "receiving" ? c.receiving : c.checking} />}
    {!profile && partial.key === key && partial.text && <section aria-label={c.streamingAria}><p>{c.streaming}</p><div className="streaming-design-text">{streamingDesignText(partial.text)}</div></section>}
    {stopping && <p className="flow-stopped" role="status">{c.stopping}</p>}
    {stopped && <p className="flow-stopped" role="status">{c.stopped}</p>}
    {Boolean(error) && !referenceNegotiation && <FailureDetails error={error} fallback={c.failure} />}
    {referenceNegotiation && <section className="reference-capability" aria-label={c.refCheck}><h2>{referenceGameplayUnverified ? c.gameplayUnknown : c.evidenceShort}</h2><ul>
      <li>{c.read}{referenceEvidenceMissing ? c.noEvidence : failedInspection?.method === "source-contract" ? c.source : c.pageRules}</li>
      <li>{c.viewed}{failedInspection?.runtimeStatus === "visible" ? c.runtime : c.noRuntime}</li>
      <li>{c.unverified}{c.unverifiedDetail}</li>
    </ul>{failedInspection?.limitations.map(item => <p key={item}>{item}</p>)}</section>}
    {(referenceEvidenceMissing || referenceGameplayUnverified) && !referenceFallback && <section className="reference-fallback" aria-label={c.fallbackAria}>
      <h2>{c.fallbackTitle}</h2><p>{c.fallbackDetail}</p>
      <label htmlFor="reference-gameplay-description">{c.gameplayLabel}</label>
      <textarea id="reference-gameplay-description" rows={5} value={fallbackDescription} onChange={event => setFallbackDescription(event.target.value)} placeholder={c.gameplayPlaceholder} />
      <p>{c.fallbackNote}</p>
      <button type="button" className="primary-action" disabled={!fallbackDescriptionReady} onClick={() => setReferenceFallback({ decision: "user-approved-original-demo", gameplayDescription: fallbackDescription.trim() })}>{c.fallbackCta}</button>
    </section>}
    {profile && <><span className="ready-stamp">{c.draft}</span>{profile.creationMode === "reference-replica" && <section className="reference-capability" aria-label={c.checkedAria}><h2>{c.checkedTitle}</h2><ul>
      <li>{c.read}{profile.referenceInspection.method === "source-contract" ? c.source : c.pageRules}</li><li>{c.viewed}{profile.referenceInspection.runtimeStatus === "visible" ? c.runtime : c.noRuntime}</li><li>{c.unverified}{profile.referenceInspection.gameplayStatus === "gameplay-verified" ? c.none : c.unverifiedDetail}</li>
    </ul>{profile.referenceInspection.limitations.map(item => <p key={item}>{item}</p>)}<p>{formatCopy(c.evidenceCount, { count: profile.referenceEvidence.filter(item => item.status === "observed").length })}</p></section>}<dl className="fact-list">{sections.filter(([title]) => primarySections.has(title)).map(([title, text]) => <div key={title}><dt>{title}</dt><dd style={{ whiteSpace: "pre-line" }}>{text}</dd></div>)}</dl>
      <details><summary>{c.details}</summary><dl className="fact-list">{sections.filter(([title]) => !primarySections.has(title)).map(([title, text]) => <div key={title}><dt>{title}</dt><dd style={{ whiteSpace: "pre-line" }}>{text}</dd></div>)}</dl></details>
      <p>{profile.creationMode === "reference-replica" ? c.referenceScope : c.originalScope}</p><p>{c.usage}</p></>}
    <div className="review-actions"><button className="secondary-action" onClick={backToEdit}>{c.back}</button>
      {!profile && !error && !stopped && <button className="secondary-action stop-action" disabled={stopping} onClick={stopPreview}>{stopping ? c.stopping : c.stop}</button>}
      {((error && !referenceNegotiation) || stopped || profile) && <button className="secondary-action" onClick={() => { setStoppedKey(null); setAttempt(n => n + 1); }}>{c.retry}</button>}
      <button className="primary-action" disabled={!profile} onClick={() => { if (profile) onConfirm(["用户确认的游戏方案（尚待制作验证）：", request, ...sections.map(([title, text]) => (title === c.section.art ? "已确认美术方向" : title) + "：" + text)].join("\n"), profile, request, referenceFallback ?? undefined); }}>{c.confirm}</button>
    </div>
  </section>;
}
