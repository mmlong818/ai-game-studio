import type { GameAspectRatio } from "../shared/contracts";

export type NewGameAspectRatio = Extract<GameAspectRatio, "9:16" | "16:9" | "1:1">;

const choices: Array<{ value: NewGameAspectRatio; label: string; shape: string }> = [
  { value: "9:16", label: "竖向", shape: "竖向画幅" },
  { value: "16:9", label: "横向", shape: "横向画幅" },
  { value: "1:1", label: "方形", shape: "方形画幅" },
];

export function AspectRatioChoice({ value, onChange }: { value: NewGameAspectRatio | null; onChange: (value: NewGameAspectRatio) => void }) {
  return (
    <fieldset className="aspect-ratio-choice">
      <legend>选择游戏画幅</legend>
      <p>画幅只决定游戏画面的横竖比例，不限制操作方式或设备。</p>
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
