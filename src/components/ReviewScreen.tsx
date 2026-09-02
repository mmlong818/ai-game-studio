import { getChangeLevelLabel } from "../domain/classifyChange";
import { GAME_TEMPLATES, MECHANIC_LIBRARY } from "../domain/templates";
import type { StudioDraft } from "../domain/types";

const exportJson = (filename: string, value: unknown) => {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

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
  const selectedSuggestions = template?.suggestions.filter((item) =>
    draft.selectedSuggestionIds.includes(item.id),
  );
  const selectedMechanics = MECHANIC_LIBRARY.filter((item) =>
    draft.selectedMechanicIds.includes(item.id),
  );
  const spec = {
    schemaVersion: "game-spec-v2",
    creationMode: draft.creationMode,
    productBoundary: {
      networkMode: "single-player",
      deliveryTarget: "web",
      assetPolicy: "ai-generated-raster-only-for-game-art",
    },
    source: template
      ? {
          baseTemplateId: template.id,
          baseTemplateName: template.name,
          changeLevel: draft.changeLevel,
          lockedCoreRules: template.coreRules,
          selectedSuggestions: selectedSuggestions?.map((item) => item.title),
          freeRequest: draft.freeRequest || null,
        }
      : {
          brief: draft.newGameBrief,
          selectedMechanics: selectedMechanics.map((item) => ({
            id: item.id,
            name: item.name,
            capabilities: item.capabilityIds,
          })),
        },
    referenceDossierId: draft.referenceDossier?.id ?? null,
    nextGate: "rules-and-acceptance-contract",
  };

  return (
    <main className="review-screen">
      <div className="review-heading">
        <div>
          <span className="eyebrow">规则规格已形成</span>
          <h1>{template ? `${template.name}改造方案` : "新游戏机制方案"}</h1>
          <p>现在得到的是制作合同，不是无法回头的最终生成。核心边界和资料来源已经可以检查。</p>
        </div>
        <span className="ready-stamp">可以进入规则设计</span>
      </div>

      <div className="review-grid">
        <section className="review-main" aria-labelledby="review-content-heading">
          <h2 id="review-content-heading">方案摘要</h2>
          {template ? (
            <>
              <dl className="fact-list">
                <div>
                  <dt>玩法起点</dt>
                  <dd>{template.name}</dd>
                </div>
                <div>
                  <dt>改造级别</dt>
                  <dd>
                    {draft.changeLevel} · {getChangeLevelLabel(draft.changeLevel)}
                  </dd>
                </div>
                <div>
                  <dt>核心循环</dt>
                  <dd>{template.coreLoop}</dd>
                </div>
              </dl>
              <h3>采用的固定建议</h3>
              <ul className="review-list">
                {selectedSuggestions?.map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </li>
                ))}
                {draft.freeRequest && (
                  <li>
                    <strong>补充要求</strong>
                    <span>{draft.freeRequest}</span>
                  </li>
                )}
              </ul>
            </>
          ) : (
            <>
              <blockquote>{draft.newGameBrief}</blockquote>
              <h3>组合的玩法要素</h3>
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
        </section>

        <aside className="review-evidence" aria-labelledby="evidence-heading">
          <h2 id="evidence-heading">制作门禁</h2>
          <ul className="gate-list">
            <li><span>通过</span> 单人网页范围</li>
            <li><span>通过</span> 核心玩法边界</li>
            <li><span>通过</span> AI 位图资源规则</li>
            <li><span>通过</span> 桌面与触控双输入</li>
            <li><span>下一步</span> 规则与验收合同</li>
          </ul>
          {draft.referenceDossier && (
            <div className="source-summary">
              <strong>{draft.referenceDossier.id}</strong>
              <span>{draft.referenceDossier.references.length} 个来源</span>
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
        <button type="button" className="secondary-action" onClick={onBack}>
          返回调整
        </button>
        {draft.referenceDossier && (
          <button
            type="button"
            className="secondary-action"
            onClick={() => exportJson("REFERENCE_DOSSIER.json", draft.referenceDossier)}
          >
            下载参考档案
          </button>
        )}
        <button
          type="button"
          className="secondary-action"
          onClick={() => exportJson("GAME_SPEC_V2.json", spec)}
        >
          下载制作规格 <span aria-hidden="true">↓</span>
        </button>
        <button
          type="button"
          className="primary-action review-primary"
          onClick={onStartProduction}
        >
          进入制作工作台 <span aria-hidden="true">→</span>
        </button>
      </div>
    </main>
  );
}
