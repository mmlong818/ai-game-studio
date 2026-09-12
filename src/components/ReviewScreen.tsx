import { describeChangeLevel } from "../domain/classifyChange";
import { GAME_TEMPLATES, MECHANIC_LIBRARY } from "../domain/templates";
import type { StudioDraft } from "../domain/types";
import { readableDesign } from "../domain/readableDesign";

export function ReviewScreen({
  draft,
  onBack,
  onStartProduction,
}: {
  draft: StudioDraft;
  onBack: () => void;
  onStartProduction: () => void;
}) {
  const template =
    draft.creationMode === "template-remix"
      ? GAME_TEMPLATES.find((item) => item.id === draft.templateId)
      : undefined;
  const readable = readableDesign(draft);
  const selectedSuggestions = template?.suggestions.filter((item) =>
    draft.selectedSuggestionIds.includes(item.id),
  );
  const selectedMechanics = MECHANIC_LIBRARY.filter((item) =>
    draft.selectedMechanicIds.includes(item.id),
  );

  return (
    <section className="review-screen" aria-label="游戏方案" tabIndex={-1}>
      <div className="review-heading">
        <div>
          <span className="eyebrow">方案已形成</span>
          <h1>{template ? `${draft.sourceGame?.title ?? template.name}改造方案` : "新游戏机制方案"}</h1>
          <p>{draft.referenceDossier?.references.length
            ? "先确认基础复刻是否准确。系统会保留参考中已经核实的关卡和局制，不会擅自改玩法；不合适就返回修改。"
            : "先看看这一局玩家会怎样玩。符合你的想法就继续制作单局 demo，不合适就返回修改；不会默认增加关卡、等级或教学系统。"}</p>
        </div>
        <span className="ready-stamp">方案草案 · 待制作验证</span>
      </div>

      <div className="review-grid">
        <section className="review-main" aria-labelledby="review-content-heading">
          <h2 id="review-content-heading">方案摘要</h2>
          {template ? (
            <>
              <dl className="fact-list">
                <div>
                  <dt>基于的玩法</dt>
                  <dd>{template.name}</dd>
                </div>
                <div>
                  <dt>改动范围</dt>
                  <dd>{describeChangeLevel(draft.changeLevel)}</dd>
                </div>
                <div>
                  <dt>玩家会反复做什么</dt>
                  <dd>{template.coreLoop}</dd>
                </div>
              </dl>
              <h3>你的要求</h3>
              <ul className="review-list">
                {selectedSuggestions?.map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </li>
                ))}
                {draft.freeRequest && (
                  <li>
                    <strong>你写的话</strong>
                    <span>{draft.freeRequest}</span>
                  </li>
                )}
              </ul>
            </>
          ) : (
            <>
              <blockquote>{draft.newGameBrief}</blockquote>
              <h3>我们理解的玩法方向</h3>
              <ul className="review-list">
                {selectedMechanics.map((item) => (
                  <li key={item.id}>
                    <strong>{item.name}</strong>
                    <span>{item.description}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3>具体怎么玩</h3>
          <dl className="fact-list">
            <div><dt>玩家要做什么</dt><dd>{readable.play || "先明确玩家最常做的一个动作，再确定其他规则。"}</dd></div>
            <div><dt>实际玩一小段</dt><dd>{readable.example}</dd></div>
            <div><dt>怎样过关或结束</dt><dd>{readable.goal}</dd></div>
          </dl>
          {readable.needsCombination && <p>上面列出的是不同玩法方向的候选规则，不是要求玩家同时完成所有目标；它们怎样配合、以哪个目标为准，制作前仍需确认。</p>}
          <h3>{readable.preserve ? "本次改造需要照顾的体验" : "建议做成怎样的完整体验"}</h3>
          <dl className="fact-list">
            {readable.experience.map(item => <div key={item.title}><dt>{item.title}</dt><dd>{item.detail}</dd></div>)}
          </dl>
        </section>

        <aside className="review-evidence" aria-labelledby="evidence-heading">
          <h2 id="evidence-heading">制作时需要完成的检查</h2>
          <ul className="gate-list">
            <li><span>待验证</span> 核心玩法与胜负规则</li>
            <li><span>待验证</span> 操作反馈是否清楚</li>
            <li><span>待验证</span> {draft.referenceDossier?.references.length ? "参考中的关卡与局制" : "单局节奏"}</li>
            <li><span>待验证</span> 图像资源与胜利结算</li>
            <li><span>待验证</span> 桌面、触控与运行流畅度</li>
          </ul>
          {draft.referenceDossier && (
            <div className="source-summary">
              <strong>已收录的参考资料：{draft.referenceDossier.references.length} 项</strong>
              <ul>
                {draft.referenceDossier.references.map((reference) => (
                  <li key={reference.url}>
                    <a href={reference.url} target="_blank" rel="noreferrer">
                      {reference.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <div className="review-actions">
        <p>点击“继续”后将保存方案、分析并制作游戏；模型分析和图片生成可能使用已配置的模型额度。</p>
        <button type="button" className="secondary-action" onClick={onBack}>
          返回修改
        </button>
        <button
          type="button"
          className="primary-action review-primary"
          onClick={onStartProduction}
        >
          继续 <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
