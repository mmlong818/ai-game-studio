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

export function LiveDesignReview({ draft, revisionPlan, onBack, onConfirm }: { draft: StudioDraft; revisionPlan?: RevisionPlan; onBack: () => void; onConfirm: (text: string, profile: GameDesignProfile, originalIdea: string) => void }) {
  const template = draft.creationMode === "template-remix" ? getTemplate(draft.templateId) : undefined;
  const request = template
    ? ["基于游戏：" + (draft.sourceGame?.title ?? template.name), "原玩法：" + template.coreLoop,
      ...(revisionPlan ? ["用户已确认的修改项：", ...revisionPlan.operations.map(operation => operation.content)] : [renovationScopeInstruction(draft.revisionScope, "用户指定的局部调整：" + draft.freeRequest)]),
      ...template.suggestions.filter(item => draft.selectedSuggestionIds.includes(item.id)).map(item => item.description)].join("\n")
    : draft.newGameBrief;
  const mapped = gameTemplateSchema.safeParse(template ? DOMAIN_TEMPLATE_ART[template.id] : "generated");
  const templateId = mapped.success ? mapped.data : "generated";
  const previewInput = {
    idea: request,
    template: templateId,
    ...(draft.creationMode === "mechanic-composition" ? { spriteAnimation: draft.spriteAnimation } : {}),
    ...(template && draft.sourceGame ? revisionPlan ? { sourceProjectId: draft.sourceGame.id, revisionPlan } : { sourceProjectId: draft.sourceGame.id, revisionScope: draft.revisionScope } : {}),
  };
  const [result, setResult] = useState<{ key: string; profile: GameDesignProfile } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [partial, setPartial] = useState({ key: "", text: "" });
  const [phase, setPhase] = useState<{ key: string; value: DesignPreviewPhase; startedAt: string | null }>({ key: "", value: "submitted", startedAt: null });
  const [stoppedKey, setStoppedKey] = useState<string | null>(null);
  const [stoppingKey, setStoppingKey] = useState<string | null>(null);
  const key = JSON.stringify([previewInput, attempt]);
  const profile = result?.key === key ? result.profile : null;
  const error = failure?.key === key ? failure.message : "";
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
        if (active) setFailure({ key, message: reason instanceof Error ? reason.message : "实时分析失败，请重试。" });
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
    <header className="review-heading"><div><span className="eyebrow">实时 AI 策划</span><h1>{template ? (draft.sourceGame?.title ?? template.name) + "个性化方案" : "新游戏机制方案"}</h1><p>{template ? "方案会按你确认的修改项生成，并把未点名的玩法、资源和操作列为保留项。" : "根据当前描述实时生成，不是预先写好的灵感方案。"}分析会使用文字模型额度；此时不生成图片或制作游戏。</p></div></header>
    {!profile && !error && !stopped && !stopping && <WaitingActivity key={key} startedAt={phase.key === key ? phase.startedAt : null} elapsedLabel="本次方案已等待" label={phase.key !== key || phase.value === "submitted" ? "请求已提交，等待方案内容。" : phase.value === "receiving" ? "正在接收方案内容。" : "正在检查方案。"} />}
    {!profile && partial.key === key && partial.text && <section aria-label="正在生成的方案"><p>以下是模型正在生成的内容，尚未完成检查。</p><div className="streaming-design-text">{streamingDesignText(partial.text)}</div></section>}
    {stopping && <p className="flow-stopped" role="status">正在停止方案生成…</p>}
    {stopped && <p className="flow-stopped" role="status">已停止方案生成；不会继续接收或使用这次未完成的结果。</p>}
    {error && <p role="alert">{error}</p>}
    {profile && <><span className="ready-stamp">方案草案 · 待制作验证</span><dl className="fact-list">{sections.filter(([title]) => ["玩家体验", "玩法取舍", "每局时长", "具体怎么玩", "怎样获胜", "关卡安排"].includes(title)).map(([title, text]) => <div key={title}><dt>{title}</dt><dd style={{ whiteSpace: "pre-line" }}>{text}</dd></div>)}</dl>
      <details><summary>查看完整玩法、教学与制作要求</summary><dl className="fact-list">{sections.filter(([title]) => !["玩家体验", "玩法取舍", "每局时长", "具体怎么玩", "怎样获胜", "关卡安排"].includes(title)).map(([title, text]) => <div key={title}><dt>{title}</dt><dd style={{ whiteSpace: "pre-line" }}>{text}</dd></div>)}</dl></details>
      <p>确认后将调用已配置的模型制作游戏代码和图片，并执行检查与有界修正，会产生额外模型用量。已有可复用资源会保留；本次不会自动发布。</p></>}
    <div className="review-actions"><button className="secondary-action" onClick={backToEdit}>返回修改</button>
      {!profile && !error && !stopped && <button className="secondary-action stop-action" disabled={stopping} onClick={stopPreview}>{stopping ? "正在停止…" : "停止生成方案"}</button>}
      {(error || stopped || profile) && <button className="secondary-action" onClick={() => { setStoppedKey(null); setAttempt(n => n + 1); }}>重新生成方案</button>}
      <button className="primary-action" disabled={!profile} onClick={() => { if (profile) onConfirm(["用户确认的游戏方案（尚待制作验证）：", request, ...sections.map(([title, text]) => title + "：" + text)].join("\n"), profile, request); }}>确认方案，开始制作</button>
    </div>
  </section>;
}
