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

export function LiveDesignReview({ draft, revisionPlan, onBack, onConfirm }: { draft: StudioDraft; revisionPlan?: RevisionPlan; onBack: () => void; onConfirm: (text: string, profile: GameDesignProfile, originalIdea: string, referenceFallback?: { decision: "user-approved-original-demo"; gameplayDescription: string }) => void }) {
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
  const sourceProjectId = draft.creationMode === "template-remix" ? draft.sourceGame?.id : undefined;
  const creationMode = resolveCreationModeIntent({ idea: request, sourceProjectId, referenceFallback: referenceFallback ?? undefined });
  const previewInput = {
    idea: request,
    template: templateId,
    creationMode,
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
    ["游戏类型", profile.genre], ["玩家体验", profile.playerFantasy], ["适合谁玩", profile.targetPlayer],
    ["每局时长", profile.sessionLength], ["具体怎么玩", profile.coreLoop.join(" → ")],
    ["怎样获胜", profile.winCondition], ["怎样失败", profile.failCondition],
    ...(profile.generatedCampaign ? [["关卡安排", `${profile.generatedCampaign.mode === "endless" ? "无限玩法，没有通关目标" : `共 ${profile.generatedCampaign.levelCount} 关`}；${profile.generatedCampaign.failurePolicy === "forbidden" ? "不会失败，操作失误后可以继续" : "有失败与重试"}。${profile.generatedCampaign.rationale}`]] : []),
    ...(profile.generatedBlueprint ? [
      ["玩法取舍", `${profile.generatedBlueprint.coreDecision}\n为什么有意义：${profile.generatedBlueprint.tension}\n玩得好的样子：${profile.generatedBlueprint.masterySignal}`],
      ["局内美术", `会先生成图片再写代码：${profile.generatedBlueprint.sprites.map(({ role }) => role).join("、")}`],
    ] : []),
    ["第一次怎么玩", profile.onboarding.join("\n")], ["关卡与成长", profile.progression.join("\n")],
    ["难度怎样递进", profile.difficultyCurve.join("\n")], ["操作与成就反馈", profile.gameFeel.join("\n")],
    ["手机与易用性", profile.accessibility.join("\n")], ["制作时需验证", profile.productionRisks.join("\n")],
  ].filter(([, value]) => value) : [];
  return <section className="review-screen live-design-review" id="live-game-design" aria-label="游戏方案">
    <header className="review-heading"><div><span className="eyebrow">实时 AI 策划</span><h1>{template ? (draft.sourceGame?.title ?? template.name) + "个性化方案" : creationMode === "reference-replica" ? "参考游戏机制提炼" : "新游戏机制方案"}</h1><p>{template ? "方案会按你确认的修改项生成，并把未点名的玩法、资源和操作列为保留项。" : creationMode === "reference-replica" ? "先获取并核对公开参考资料，再提炼有依据的核心机制；取得结果前不会执行原创机制策划。" : "先制作一局可以完整试玩的 demo；不会默认增加关卡、等级或教学系统。"}分析会使用文字模型额度；此时不生成图片或制作游戏。</p></div></header>
    {!profile && !error && !stopped && !stopping && <WaitingActivity key={key} startedAt={phase.key === key ? phase.startedAt : null} elapsedLabel={creationMode === "reference-replica" ? "参考资料已等待" : "本次方案已等待"} label={creationMode === "reference-replica" && (phase.key !== key || phase.value === "submitted" || phase.value === "reference-acquiring") ? "正在获取并核对公开参考资料；完成前不会开始原创机制策划。" : phase.value === "reference-ready" ? "参考资料已取得并通过证据检查，正在准备基础复刻方案。" : phase.key !== key || phase.value === "submitted" ? "请求已提交，等待方案内容。" : phase.value === "receiving" ? "正在接收方案内容。" : "正在检查方案。"} />}
    {!profile && partial.key === key && partial.text && <section aria-label="正在生成的方案"><p>以下是模型正在生成的内容，尚未完成检查。</p><div className="streaming-design-text">{streamingDesignText(partial.text)}</div></section>}
    {stopping && <p className="flow-stopped" role="status">正在停止方案生成…</p>}
    {stopped && <p className="flow-stopped" role="status">已停止方案生成；不会继续接收或使用这次未完成的结果。</p>}
    {Boolean(error) && !referenceNegotiation && <FailureDetails error={error} fallback="方案生成没有完成。请按上面的下一步处理后再手动重新生成；这次没有开始制作游戏。" />}
    {referenceNegotiation && <section className="reference-capability" aria-label="参考玩法核对情况"><h2>{referenceGameplayUnverified ? "尚未确认实际玩法" : "参考资料不足"}</h2><ul>
      <li>已读取：{referenceEvidenceMissing ? "没有取得足够的公开玩法资料" : failedInspection?.method === "source-contract" ? "公开代码、资源或已确认规则" : "公开页面中的规则说明"}</li>
      <li>已查看：{failedInspection?.runtimeStatus === "visible" ? "游戏运行页面" : "尚未看到可用的游戏运行页面"}</li>
      <li>尚未确认：实际操作、胜负流程和完整关卡结构</li>
    </ul>{failedInspection?.limitations.map(item => <p key={item}>{item}</p>)}</section>}
    {(referenceEvidenceMissing || referenceGameplayUnverified) && !referenceFallback && <section className="reference-fallback" aria-label="改按玩法描述制作">
      <h2>如果你愿意，可以改按你的描述制作</h2>
      <p>当前查看能力没有完成实际操作验证，因此不能确认完整玩法。请写清玩家的关键操作、目标，以及怎样获胜或结束这一局。</p>
      <label htmlFor="reference-gameplay-description">你了解到的玩法</label>
      <textarea id="reference-gameplay-description" rows={5} value={fallbackDescription} onChange={event => setFallbackDescription(event.target.value)} placeholder="例如：拖动相同甜点合并升级，完成顾客订单后过关；格子放满则本局结束。" />
      <p>点击后会按你的描述规划一局原创 demo。原链接只作为背景记录，不承诺忠实复刻，也不会立即制作游戏。</p>
      <button type="button" className="primary-action" disabled={!fallbackDescriptionReady} onClick={() => setReferenceFallback({ decision: "user-approved-original-demo", gameplayDescription: fallbackDescription.trim() })}>按我的描述制作单局 demo</button>
    </section>}
    {profile && <><span className="ready-stamp">方案草案 · 待制作验证</span>{profile.creationMode === "reference-replica" && <section className="reference-capability" aria-label="参考内容核对情况"><h2>系统实际核对到的内容</h2><ul>
      <li>已读取：{profile.referenceInspection.method === "source-contract" ? "公开代码、资源或已确认规则" : "公开页面中的规则说明"}</li>
      <li>已查看：{profile.referenceInspection.runtimeStatus === "visible" ? "游戏运行页面" : "尚未看到可用的游戏运行页面"}</li>
      <li>尚未确认：{profile.referenceInspection.gameplayStatus === "gameplay-verified" ? "没有" : "实际操作、胜负流程和完整关卡结构"}</li>
    </ul>{profile.referenceInspection.limitations.map(item => <p key={item}>{item}</p>)}<p>记录了 {profile.referenceEvidence.filter(item => item.status === "observed").length} 项可核实信息；其他内容不会按猜测补写。</p></section>}<dl className="fact-list">{sections.filter(([title]) => ["玩家体验", "玩法取舍", "每局时长", "具体怎么玩", "怎样获胜", "关卡安排"].includes(title)).map(([title, text]) => <div key={title}><dt>{title}</dt><dd style={{ whiteSpace: "pre-line" }}>{text}</dd></div>)}</dl>
      <details><summary>查看完整玩法、教学与制作要求</summary><dl className="fact-list">{sections.filter(([title]) => !["玩家体验", "玩法取舍", "每局时长", "具体怎么玩", "怎样获胜", "关卡安排"].includes(title)).map(([title, text]) => <div key={title}><dt>{title}</dt><dd style={{ whiteSpace: "pre-line" }}>{text}</dd></div>)}</dl></details>
      <p>{profile.creationMode === "reference-replica" ? "这轮只制作有证据支持的核心机制 demo。试玩验收通过后，才会提供风格、底图、色调或难度等可选调整。" : "这轮先制作一局完整 demo。试玩验收通过后，你可以再明确选择是否增加关卡或难度。"}</p><p>确认后将调用已配置的模型制作游戏代码和图片，并执行检查与有界修正，会产生额外模型用量。已有可复用资源会保留；本次不会自动发布。</p></>}
    <div className="review-actions"><button className="secondary-action" onClick={backToEdit}>返回修改</button>
      {!profile && !error && !stopped && <button className="secondary-action stop-action" disabled={stopping} onClick={stopPreview}>{stopping ? "正在停止…" : "停止生成方案"}</button>}
      {((error && !referenceNegotiation) || stopped || profile) && <button className="secondary-action" onClick={() => { setStoppedKey(null); setAttempt(n => n + 1); }}>重新生成方案</button>}
      <button className="primary-action" disabled={!profile} onClick={() => { if (profile) onConfirm(["用户确认的游戏方案（尚待制作验证）：", request, ...sections.map(([title, text]) => title + "：" + text)].join("\n"), profile, request, referenceFallback ?? undefined); }}>确认方案，开始制作</button>
    </div>
  </section>;
}
