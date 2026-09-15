import type { RenovationScope } from "../shared/contracts";
import { useRevisionCopy } from "./revision-i18n";

export const revisionScopeOptions: ReadonlyArray<{
  id: RenovationScope;
  label: string;
  detail: string;
  example: string;
}> = [
  {
    id: "gameplay",
    label: "改一个玩点",
    detail: "只调整一个局部体验，其他规则、内容结构和操作列为保留项。",
    example: "例如：只让一次成功操作的反馈更明显。",
  },
  {
    id: "assets",
    label: "替换部分资源",
    detail: "只替换指定的封面、背景或角色图片，玩法和操作列为保留项。",
    example: "例如：只替换背景图，保留其他素材。",
  },
  {
    id: "visual-style",
    label: "改变美术风格",
    detail: "统一颜色、质感和界面风格，玩法、内容和操作列为保留项。",
    example: "例如：整体改成水彩绘本风格。",
  },
];

export function revisionScopeLabel(scope: RenovationScope) {
  return revisionScopeOptions.find((option) => option.id === scope)?.label ?? revisionScopeOptions[0].label;
}

export function RevisionScopePicker({ value, onChange, disabled = false }: {
  value: RenovationScope;
  onChange: (value: RenovationScope) => void;
  disabled?: boolean;
}) {
  const copy = useRevisionCopy();
  const options = revisionScopeOptions.map((option) => ({ ...option, ...(option.id === "gameplay" ? { label: copy.gameplay[0], detail: copy.gameplay[1], example: copy.gameplay[2] } : option.id === "assets" ? { label: copy.assets[0], detail: copy.assets[1], example: copy.assets[2] } : { label: copy.visual[0], detail: copy.visual[1], example: copy.visual[2] }) }));
  return (
    <fieldset className="revision-scope-picker" disabled={disabled}>
      <legend>{copy.scopeLegend}</legend>
      <p>{copy.scopeHelp}</p>
      <div>
        {options.map((option) => (
          <label className={value === option.id ? "is-selected" : undefined} key={option.id}>
            <input
              type="radio"
              name="revision-scope"
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
            />
            <span>
              <strong>{option.label}</strong>
              <small>{option.detail}</small>
              <em>{option.example}</em>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
