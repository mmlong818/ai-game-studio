import type { RenovationScope } from "../shared/contracts";

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
  return (
    <fieldset className="revision-scope-picker" disabled={disabled}>
      <legend>这次只改哪一类？</legend>
      <p>先圈定一个范围，再说具体想改的地方。</p>
      <div>
        {revisionScopeOptions.map((option) => (
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
