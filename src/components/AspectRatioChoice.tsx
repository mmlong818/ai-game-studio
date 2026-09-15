import type { GameAspectRatio } from "../shared/contracts";
import { useComponentMessages } from "./component-i18n";

export type NewGameAspectRatio = Extract<GameAspectRatio, "9:16" | "16:9" | "1:1">;

export function AspectRatioChoice({ value, onChange }: { value: NewGameAspectRatio | null; onChange: (value: NewGameAspectRatio) => void }) {
  const t = useComponentMessages();
  const choices = [
    { value: "9:16" as const, label: t("aspect.portrait"), shape: t("aspect.portraitShape") },
    { value: "16:9" as const, label: t("aspect.landscape"), shape: t("aspect.landscapeShape") },
    { value: "1:1" as const, label: t("aspect.square"), shape: t("aspect.squareShape") },
  ];
  return (
    <fieldset className="aspect-ratio-choice">
      <legend>{t("aspect.title")}</legend>
      <p>{t("aspect.detail")}</p>
      <div className="aspect-ratio-options">
        {choices.map(choice => (
          <label key={choice.value}>
            <input type="radio" name="new-game-aspect-ratio" value={choice.value} checked={value === choice.value} onChange={() => onChange(choice.value)} />
            <span className={`aspect-ratio-shape is-${choice.value.replace(":", "-")}`} aria-hidden="true" />
            <strong>{choice.label}</strong>
            <small>{choice.value} · {choice.shape}</small>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
