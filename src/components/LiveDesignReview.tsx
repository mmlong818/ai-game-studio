import { useEffect, useState } from "react";
import type { StudioDraft } from "../domain/types";
import { getTemplate } from "../domain/templates";
import { DOMAIN_TEMPLATE_ART } from "../domain/templateResolution";
import { gameTemplateSchema, type GameDesignProfile } from "../shared/contracts";
import { getDesignPreview } from "../domain/designPreviewCache";
import { WaitingActivity } from "./WaitingActivity";
import { streamingDesignText } from "../domain/streamingDesignText";

export function LiveDesignReview({ draft, onBack, onConfirm }: { draft: StudioDraft; onBack: () => void; onConfirm: (text: string, profile: GameDesignProfile, originalIdea: string) => void }) {
  const template = draft.creationMode === "template-remix" ? getTemplate(draft.templateId) : undefined;
  const request = template
    ? ["基于游戏：" + (draft.sourceGame?.title ?? template.name), "原玩法：" + template.coreLoop, draft.freeRequest,
      ...template.suggestions.filter(item => draft.selectedSuggestionIds.includes(item.id)).map(item => item.description)].join("\n")
    : draft.newGameBrief;
  const mapped = gameTemplateSchema.safeParse(template ? DOMAIN_TEMPLATE_ART[template.id] : "generated");
  const templateId = mapped.success ? mapped.data : "generated";
  const [result, setResult] = useState<{ key: string; profile: GameDesignProfile } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [partial, setPartial] = useState({ key: "", text: "" });
  const key = JSON.stringify([request, templateId, attempt]);
  const profile = result?.key === key ? result.profile : null;
  const error = failure?.key === key ? failure.message : "";
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const value = await getDesignPreview({ idea: request, template: templateId }, attempt > 0, text => { if (active) setPartial({ key, text }); });
        if (active) setResult({ key, profile: value });
      } catch (reason) {
        if (active) setFailure({ key, message: reason instanceof Error ? reason.message : "实时分析失败，请重试。" });
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [request, templateId, key]);
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
    <header className="review-heading"><div><span className="eyebrow">实时 AI 策划</span><h1>{template ? (draft.sourceGame?.title ?? template.name) + "改造方案" : "新游戏机制方案"}</h1><p>根据当前描述实时生成，不是预先写好的灵感方案。分析会使用文字模型额度；此时不生成图片或制作游戏。</p></div></header>
    {!profile && !error && <WaitingActivity key={key} label="正在根据你的想法设计玩法，请稍候。" />}
    {!profile && partial.key === key && partial.text && <section aria-label="正在生成的方案"><p>以下是模型正在生成的内容，尚未完成检查。</p><div className="streaming-design-text">{streamingDesignText(partial.text)}</div></section>}
    {error && <p role="alert">{error}</p>}
    {profile && <><span className="ready-stamp">方案草案 · 待制作验证</span><dl className="fact-list">{sections.filter(([title]) => ["玩家体验", "玩法取舍", "每局时长", "具体怎么玩", "怎样获胜", "关卡安排"].includes(title)).map(([title, text]) => <div key={title}><dt>{title}</dt><dd style={{ whiteSpace: "pre-line" }}>{text}</dd></div>)}</dl>
      <details><summary>查看完整玩法、教学与制作要求</summary><dl className="fact-list">{sections.filter(([title]) => !["玩家体验", "玩法取舍", "每局时长", "具体怎么玩", "怎样获胜", "关卡安排"].includes(title)).map(([title, text]) => <div key={title}><dt>{title}</dt><dd style={{ whiteSpace: "pre-line" }}>{text}</dd></div>)}</dl></details>
      <p>确认后将调用已配置的模型制作游戏代码和图片，并执行检查与有界修正，会产生额外模型用量。已有可复用资源会保留；本次不会自动发布。</p></>}
    <div className="review-actions"><button className="secondary-action" onClick={onBack}>返回修改</button>
      {(error || profile) && <button className="secondary-action" onClick={() => setAttempt(n => n + 1)}>重新生成方案</button>}
      <button className="primary-action" disabled={!profile} onClick={() => { if (profile) onConfirm(["用户确认的游戏方案（尚待制作验证）：", request, ...sections.map(([title, text]) => title + "：" + text)].join("\n"), profile, request); }}>确认方案，开始制作</button>
    </div>
  </section>;
}
