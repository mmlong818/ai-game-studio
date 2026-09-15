import { describeChangeLevel } from "../domain/classifyChange";
import { GAME_TEMPLATES, MECHANIC_LIBRARY } from "../domain/templates";
import type { StudioDraft } from "../domain/types";
import { readableDesign } from "../domain/readableDesign";
import { useReviewMessages } from "./review-i18n";

export function ReviewScreen({
  draft,
  onBack,
  onStartProduction,
}: {
  draft: StudioDraft;
  onBack: () => void;
  onStartProduction: () => void;
}) {
  const t = useReviewMessages();
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
    <section className="review-screen" aria-label={t("label")} tabIndex={-1}>
      <div className="review-heading">
        <div>
          <span className="eyebrow">{t("formed")}</span>
          <h1>{template ? t("remixTitle", { title: draft.sourceGame?.title ?? template.name }) : t("newTitle")}</h1>
          <p>{draft.referenceDossier?.references.length
            ? t("referenceDetail") : t("newDetail")}</p>
        </div>
        <span className="ready-stamp">{t("stamp")}</span>
      </div>

      <div className="review-grid">
        <section className="review-main" aria-labelledby="review-content-heading">
          <h2 id="review-content-heading">{t("summary")}</h2>
          {template ? (
            <>
              <dl className="fact-list">
                <div>
                  <dt>{t("based")}</dt>
                  <dd>{template.name}</dd>
                </div>
                <div>
                  <dt>{t("scope")}</dt>
                  <dd>{describeChangeLevel(draft.changeLevel)}</dd>
                </div>
                <div>
                  <dt>{t("loop")}</dt>
                  <dd>{template.coreLoop}</dd>
                </div>
              </dl>
              <h3>{t("requirements")}</h3>
              <ul className="review-list">
                {selectedSuggestions?.map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </li>
                ))}
                {draft.freeRequest && (
                  <li>
                    <strong>{t("yourWords")}</strong>
                    <span>{draft.freeRequest}</span>
                  </li>
                )}
              </ul>
            </>
          ) : (
            <>
              <blockquote>{draft.newGameBrief}</blockquote>
              <h3>{t("direction")}</h3>
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
          <h3>{t("how")}</h3>
          <dl className="fact-list">
            <div><dt>{t("action")}</dt><dd>{readable.play || t("actionFallback")}</dd></div>
            <div><dt>{t("example")}</dt><dd>{readable.example}</dd></div>
            <div><dt>{t("goal")}</dt><dd>{readable.goal}</dd></div>
          </dl>
          {readable.needsCombination && <p>{t("combination")}</p>}
          <h3>{t(readable.preserve ? "preserve" : "experience")}</h3>
          <dl className="fact-list">
            {readable.experience.map(item => <div key={item.title}><dt>{item.title}</dt><dd>{item.detail}</dd></div>)}
          </dl>
        </section>

        <aside className="review-evidence" aria-labelledby="evidence-heading">
          <h2 id="evidence-heading">{t("checks")}</h2>
          <ul className="gate-list">
            <li><span>{t("pending")}</span> {t("core")}</li><li><span>{t("pending")}</span> {t("feedback")}</li><li><span>{t("pending")}</span> {t(draft.referenceDossier?.references.length ? "reference" : "rhythm")}</li><li><span>{t("pending")}</span> {t("art")}</li><li><span>{t("pending")}</span> {t("devices")}</li>
          </ul>
          {draft.referenceDossier && (
            <div className="source-summary">
              <strong>{t("sources", { count: draft.referenceDossier.references.length })}</strong>
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
        <p>{t("quota")}</p>
        <button type="button" className="secondary-action" onClick={onBack}>
          {t("back")}
        </button>
        <button
          type="button"
          className="primary-action review-primary"
          onClick={onStartProduction}
        >
          {t("continue")} <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
