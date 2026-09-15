import { useState } from "react";
import { SpriteAnimationChoice, type SpriteAnimationPreference } from "./SpriteAnimationControl";
import { AspectRatioChoice, type NewGameAspectRatio } from "./AspectRatioChoice";
import { useComponentMessages } from "./component-i18n";

export function CreationStart({ value, onChange, onContinue, onRemix, errors, spriteAnimation, onSpriteAnimationChange, aspectRatio, onAspectRatioChange }: {
  value: string; onChange: (value: string) => void; onContinue: (explicit?: boolean) => void; onRemix: () => void; errors: string[];
  spriteAnimation: SpriteAnimationPreference; onSpriteAnimationChange: (value: SpriteAnimationPreference) => void;
  aspectRatio: NewGameAspectRatio | null; onAspectRatioChange: (value: NewGameAspectRatio) => void;
}) {
  const t = useComponentMessages();
  const ideas = [1, 2, 3].map(number => ({ name: t(`creation.idea${number}Name` as "creation.idea1Name"), text: t(`creation.idea${number}` as "creation.idea1") }));
  const [replacement, setReplacement] = useState<string | null>(null);
  const ready = value.trim().length >= 12;
  function update(text: string) { onChange(text); }
  function useIdea(text: string) {
    if (value.trim() && value !== text) setReplacement(text);
    else update(text);
  }
  return <div className="creation-start">
    <section className="creation-composer" aria-labelledby="creation-brief-label">
      <div className="creation-composer-heading"><span>{t("creation.begin")}</span><span>{t("creation.step")}</span></div>
      <label id="creation-brief-label" htmlFor="creation-brief">{t("creation.question")}</label>
      <textarea id="creation-brief" value={value} onChange={event => update(event.target.value)} rows={5}
        aria-describedby="creation-brief-help" placeholder={t("creation.placeholder")} />
      <AspectRatioChoice value={aspectRatio} onChange={onAspectRatioChange} />
      <div className="creation-submit-row">
        <p id="creation-brief-help" role="status">{ready && !aspectRatio ? t("creation.needAspect") : ready ? t("creation.ready") : t("creation.needBrief")}</p>
        <button type="button" className="primary-action" disabled={!ready || !aspectRatio} onClick={() => onContinue(true)}>{t("creation.submit")} <span aria-hidden="true">→</span></button>
      </div>
      <div className="creation-inspiration"><span>{t("creation.inspiration")}</span>
        {ideas.map(idea => <button type="button" key={idea.name} onClick={() => useIdea(idea.text)}>{idea.name} ↗</button>)}
      </div>
      <SpriteAnimationChoice value={spriteAnimation} onChange={onSpriteAnimationChange} />
      {errors.length > 0 && <p role="alert">{errors.join("；")}</p>}
      {replacement && <div className="creation-replace" role="status"><span>{t("creation.replacePrompt")}</span><button type="button" onClick={() => { update(replacement); setReplacement(null); }}>{t("creation.replace")}</button><button type="button" onClick={() => setReplacement(null)}>{t("creation.keep")}</button></div>}
    </section>
    <aside className="creation-companion" aria-label={t("creation.flowLabel")}>
      <span className="eyebrow">{t("creation.flowEyebrow")}</span><h2>{t("creation.flowTitle").split("\n").map((line, index) => <span key={line}>{index ? <br /> : null}{line}</span>)}</h2>
      <ol><li><strong>{t("creation.flow1")}</strong><p>{t("creation.flow1Detail")}</p></li><li><strong>{t("creation.flow2")}</strong><p>{t("creation.flow2Detail")}</p></li><li><strong>{t("creation.flow3")}</strong><p>{t("creation.flow3Detail")}</p></li></ol>
      <button type="button" className="creation-remix" onClick={onRemix}><strong>{t("creation.remix")} <span aria-hidden="true">→</span></strong><span>{t("creation.remixDetail")}</span></button>
    </aside>
  </div>;
}
