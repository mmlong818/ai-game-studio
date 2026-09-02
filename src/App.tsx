import { useEffect, useMemo, useState } from "react";
import { ReviewScreen } from "./components/ReviewScreen";
import { ProductionWorkspace } from "./components/ProductionWorkspace";
import { SimpleStudioApp } from "./components/SimpleStudioApp";
import { createProject } from "./domain/project";
import {
  classifyChange,
  maxChangeLevel,
} from "./domain/classifyChange";
import {
  createReferenceDossier,
  getResearchSourceCount,
  recommendMechanics,
} from "./domain/research";
import { loadDraft, saveDraft } from "./domain/storage";
import {
  GAME_TEMPLATES,
  MECHANIC_LIBRARY,
  getTemplate,
} from "./domain/templates";
import type {
  ChangeLevel,
  CreationMode,
  StudioDraft,
  ValidationResult,
} from "./domain/types";
import { validateDraft } from "./domain/validation";

type Stage = "compose" | "review" | "produce";

const TEMPLATE_MECHANIC_MAP: Record<string, string> = {
  "falling-blocks": "grid-merge",
  "picture-puzzle": "drag-snap",
  breakout: "projectile-combat",
  "sliding-block": "grid-path",
  maze: "grid-path",
  snake: "lane-dodge",
  "merge-2048": "grid-merge",
  "space-shooter": "projectile-combat",
  polyomino: "drag-snap",
  "block-placement": "grid-merge",
  "region-logic": "constraint-deduction",
  "tile-roguelite": "route-choice",
  "collect-escape-3d": "collect-escape",
  "arena-3d": "projectile-combat",
};

const LEVEL_HELP: Record<
  ChangeLevel,
  { label: string; description: string; tone: string }
> = {
  R0: {
    label: "表现改造",
    description: "核心玩法不变，可以直接进入资源与文案制作。",
    tone: "safe",
  },
  R1: {
    label: "内容与调节",
    description: "只修改模板已经登记的内容和参数。",
    tone: "safe",
  },
  R2: {
    label: "小规则扩展",
    description: "只增加一种机制，并补充参考研究和专属测试。",
    tone: "caution",
  },
  R3: {
    label: "核心重写",
    description: "需求已超出模板边界，需要转入新游戏设计。",
    tone: "blocked",
  },
};

const CATEGORY_LABELS = {
  world: "世界观",
  visual: "美术",
  content: "内容",
  tuning: "调节",
  mechanic: "机制",
};

function ModeSwitch({
  value,
  onChange,
}: {
  value: CreationMode;
  onChange: (mode: CreationMode) => void;
}) {
  return (
    <div className="mode-switch" aria-label="选择创作方式">
      <button
        type="button"
        aria-pressed={value === "template-remix"}
        onClick={() => onChange("template-remix")}
      >
        <span>改造现有玩法</span>
        <small>更快、更稳妥</small>
      </button>
      <button
        type="button"
        aria-pressed={value === "mechanic-composition"}
        onClick={() => onChange("mechanic-composition")}
      >
        <span>设计新游戏</span>
        <small>先研究，再组合</small>
      </button>
    </div>
  );
}

function StepRail({ stage, mode }: { stage: Stage; mode: CreationMode }) {
  const steps = [
    ["01", "选择起点", mode === "template-remix" ? "成熟玩法模板" : "玩家体验描述"],
    ["02", "收紧范围", mode === "template-remix" ? "固定改造建议" : "复用有效机制"],
    ["03", "确认规则", "边界与资料依据"],
    ["04", "进入制作", "生成规格与验收"],
  ];
  const activeIndex = stage === "review" ? 2 : 0;

  return (
    <aside className="step-rail" aria-label="制作步骤">
      <div className="rail-heading">
        <span className="eyebrow">制作路径</span>
        <strong>先把游戏想清楚</strong>
      </div>
      <ol>
        {steps.map(([number, title, detail], index) => (
          <li
            key={number}
            className={index <= activeIndex ? "is-active" : undefined}
            aria-current={index === activeIndex ? "step" : undefined}
          >
            <span className="step-number">{number}</span>
            <span>
              <strong>{title}</strong>
              <small>{detail}</small>
            </span>
          </li>
        ))}
      </ol>
      <p className="rail-note">
        只制作单人网页小游戏。需要联机、开放世界或复杂经营时，系统会明确停止套用旧模板。
      </p>
    </aside>
  );
}

function TemplatePicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="section-block" aria-labelledby="template-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">第一步 · 玩法起点</span>
          <h2 id="template-heading">先选一个已经站得住的核心循环</h2>
        </div>
        <span className="count-label">{GAME_TEMPLATES.length} 个成熟起点</span>
      </div>
      <div className="template-grid">
        {GAME_TEMPLATES.map((template, index) => (
          <button
            type="button"
            key={template.id}
            className="template-option"
            aria-pressed={selectedId === template.id}
            onClick={() => onSelect(template.id)}
          >
            <span className="template-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="template-copy">
              <span className="template-meta">{template.genre}</span>
              <strong>{template.name}</strong>
              <small>{template.pitch}</small>
              <span className="loop-line">{template.coreLoop}</span>
            </span>
            <span className="select-mark" aria-hidden="true">
              {selectedId === template.id ? "已选" : "选择"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SuggestionPicker({
  templateId,
  selectedIds,
  onToggle,
  freeRequest,
  onFreeRequestChange,
  classification,
}: {
  templateId: string | null;
  selectedIds: string[];
  onToggle: (id: string) => void;
  freeRequest: string;
  onFreeRequestChange: (value: string) => void;
  classification: ReturnType<typeof classifyChange>;
}) {
  const template = getTemplate(templateId);
  if (!template) return null;

  return (
    <section className="section-block" aria-labelledby="suggestion-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">第二步 · 推荐改造</span>
          <h2 id="suggestion-heading">从安全变化开始，不必自己写完整方案</h2>
        </div>
        <span className="count-label">可组合选择</span>
      </div>
      <div className="suggestion-grid">
        {template.suggestions.map((item) => {
          const selected = selectedIds.includes(item.id);
          return (
            <button
              type="button"
              key={item.id}
              className="suggestion-card"
              aria-pressed={selected}
              onClick={() => onToggle(item.id)}
            >
              <span className="suggestion-topline">
                <span>{CATEGORY_LABELS[item.category]}</span>
                <span className={`level-badge level-${item.level.toLowerCase()}`}>
                  {item.level}
                </span>
              </span>
              <strong>{item.title}</strong>
              <span className="suggestion-description">{item.description}</span>
              <span className="suggestion-detail">
                <b>保持：</b>
                {item.keeps}
              </span>
              <span className="suggestion-detail">
                <b>新增：</b>
                {item.newAssets}
              </span>
              <span className="suggestion-action">
                {selected ? "已加入方案" : "加入这项改造"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="free-request">
        <label htmlFor="free-request">还有其他要求</label>
        <p>可以自由描述，系统会先判断是否仍适合当前模板。</p>
        <textarea
          id="free-request"
          value={freeRequest}
          onChange={(event) => onFreeRequestChange(event.target.value)}
          placeholder="例如：改成 Q 版昆虫世界，关卡节奏稍快，并加入一种会移动的障碍…"
          rows={4}
        />
        {freeRequest.trim() && (
          <div
            className={`classification-result tone-${LEVEL_HELP[classification.level].tone}`}
            role="status"
          >
            <span className="classification-level">{classification.level}</span>
            <span>
              <strong>{classification.label}</strong>
              <small>{classification.reasons[0]}</small>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function NewGameDesigner({
  brief,
  onBriefChange,
  selectedMechanicIds,
  onToggleMechanic,
}: {
  brief: string;
  onBriefChange: (value: string) => void;
  selectedMechanicIds: string[];
  onToggleMechanic: (id: string) => void;
}) {
  const recommendations = recommendMechanics(brief);
  const recommendedIds = new Set(recommendations.map((item) => item.id));

  return (
    <>
      <section className="section-block" aria-labelledby="new-brief-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">第一步 · 玩家体验</span>
            <h2 id="new-brief-heading">先说玩家反复做什么，暂时不要列功能</h2>
          </div>
        </div>
        <div className="brief-field">
          <label htmlFor="new-game-brief">一句完整的游戏描述</label>
          <textarea
            id="new-game-brief"
            value={brief}
            onChange={(event) => onBriefChange(event.target.value)}
            placeholder="例如：玩家控制一只小昆虫在高速移动的树干上收集露珠，通过上下左右换位躲开树脂障碍。"
            rows={5}
          />
          <span>{brief.trim().length} 个字 · 建议写清主要动作、风险和目标</span>
        </div>
      </section>

      <section className="section-block" aria-labelledby="mechanic-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">第二步 · 有效要素</span>
            <h2 id="mechanic-heading">优先复用平台已经能验证的玩法能力</h2>
          </div>
          <span className="count-label">首版建议 1–2 项</span>
        </div>
        <div className="mechanic-list">
          {MECHANIC_LIBRARY.map((mechanic) => {
            const selected = selectedMechanicIds.includes(mechanic.id);
            const recommended = recommendedIds.has(mechanic.id);
            return (
              <button
                type="button"
                key={mechanic.id}
                className="mechanic-option"
                aria-pressed={selected}
                onClick={() => onToggleMechanic(mechanic.id)}
              >
                <span className="mechanic-check" aria-hidden="true">
                  {selected ? "✓" : "+"}
                </span>
                <span>
                  <span className="mechanic-name-row">
                    <strong>{mechanic.name}</strong>
                    {recommended && <small>与描述接近</small>}
                  </span>
                  <span>{mechanic.description}</span>
                  <code>{mechanic.capabilityIds.join(" · ")}</code>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

function BoundaryPanel({
  draft,
  validation,
  onContinue,
  onConvert,
}: {
  draft: StudioDraft;
  validation: ValidationResult;
  onContinue: () => void;
  onConvert: () => void;
}) {
  const template =
    draft.creationMode === "template-remix"
      ? getTemplate(draft.templateId)
      : undefined;
  const help = LEVEL_HELP[draft.changeLevel];
  const selectedMechanics = draft.selectedMechanicIds
    .map((id) => MECHANIC_LIBRARY.find((mechanic) => mechanic.id === id)?.name)
    .filter(Boolean);
  const isBlocked = draft.creationMode === "template-remix" && draft.changeLevel === "R3";

  return (
    <aside className="boundary-panel" aria-labelledby="boundary-heading">
      <span className="eyebrow">实时边界检查</span>
      <h2 id="boundary-heading">
        {draft.creationMode === "template-remix" ? "这次改造会动到哪里" : "新游戏的研究底稿"}
      </h2>

      <div className={`level-summary tone-${help.tone}`}>
        <span>{draft.changeLevel}</span>
        <div>
          <strong>{help.label}</strong>
          <p>{help.description}</p>
        </div>
      </div>

      {template && draft.creationMode === "template-remix" && (
        <div className="boundary-section">
          <h3>不会被改坏的核心</h3>
          <ul className="check-list">
            {template.coreRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      )}

      {draft.creationMode === "mechanic-composition" && (
        <div className="boundary-section">
          <h3>当前机制组合</h3>
          {selectedMechanics.length > 0 ? (
            <ul className="plain-list">
              {selectedMechanics.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : (
            <p className="empty-copy">选择后会在这里形成能力清单。</p>
          )}
        </div>
      )}

      <div className="boundary-section research-status">
        <h3>资料依据</h3>
        {draft.referenceDossier ? (
          <>
            <strong>{draft.referenceDossier.references.length} 个真实来源已归档</strong>
            <p>规则观察、跨设备控制和不可复制边界已经分开记录。</p>
          </>
        ) : (
          <>
            <strong>复用模板已有资料</strong>
            <p>没有增加新规则时，不重复搜索，减少等待和成本。</p>
          </>
        )}
      </div>

      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="validation-messages" role="alert">
          {validation.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
          {validation.warnings.map((warning) => (
            <p key={warning} className="warning">
              {warning}
            </p>
          ))}
        </div>
      )}

      {isBlocked ? (
        <button type="button" className="primary-action" onClick={onConvert}>
          转为新游戏设计 <span aria-hidden="true">→</span>
        </button>
      ) : (
        <button
          type="button"
          className="primary-action"
          onClick={onContinue}
          disabled={!validation.valid}
        >
          生成制作规格 <span aria-hidden="true">→</span>
        </button>
      )}
      <p className="action-footnote">不会立即消耗 AI 额度，先生成可检查的规则规格。</p>
    </aside>
  );
}

export function AdvancedStudioApp() {
  const [draft, setDraft] = useState<StudioDraft>(() => loadDraft());
  const [stage, setStage] = useState<Stage>("compose");
  const template = getTemplate(draft.templateId);
  const classification = useMemo(
    () => classifyChange(draft.freeRequest, template),
    [draft.freeRequest, template],
  );

  const finalizedDraft = useMemo<StudioDraft>(() => {
    if (draft.creationMode === "mechanic-composition") {
      const dossier = createReferenceDossier(
        draft.newGameBrief,
        draft.selectedMechanicIds,
      );
      return { ...draft, changeLevel: "R3", referenceDossier: dossier };
    }

    const selectedLevels =
      template?.suggestions
        .filter((item) => draft.selectedSuggestionIds.includes(item.id))
        .map((item) => item.level) ?? [];
    const levels: ChangeLevel[] = [...selectedLevels];
    if (draft.freeRequest.trim()) levels.push(classification.level);
    const changeLevel = maxChangeLevel(levels.length > 0 ? levels : ["R0"]);
    const needsResearch = changeLevel === "R2";
    const mechanicId = template ? TEMPLATE_MECHANIC_MAP[template.id] : undefined;
    const referenceDossier =
      needsResearch && mechanicId
        ? createReferenceDossier(
            `${template?.name ?? "模板"}：${draft.freeRequest || "增加一种小机制"}`,
            [mechanicId],
          )
        : null;
    return { ...draft, changeLevel, referenceDossier };
  }, [classification.level, draft, template]);

  const validation = useMemo(
    () => validateDraft(finalizedDraft),
    [finalizedDraft],
  );

  useEffect(() => {
    saveDraft(finalizedDraft);
  }, [finalizedDraft]);

  const updateDraft = (updates: Partial<StudioDraft>) => {
    setDraft((current) => ({ ...current, ...updates }));
  };

  const changeMode = (creationMode: CreationMode) => {
    setStage("compose");
    updateDraft({
      creationMode,
      referenceDossier: null,
      changeLevel: creationMode === "template-remix" ? "R0" : "R3",
    });
  };

  const selectTemplate = (templateId: string) => {
    updateDraft({
      templateId,
      selectedSuggestionIds: [],
      freeRequest: "",
      referenceDossier: null,
      changeLevel: "R0",
    });
  };

  const toggleSuggestion = (suggestionId: string) => {
    if (!template) return;
    const selected = draft.selectedSuggestionIds.includes(suggestionId);
    const target = template.suggestions.find((item) => item.id === suggestionId);
    let selectedSuggestionIds = selected
      ? draft.selectedSuggestionIds.filter((id) => id !== suggestionId)
      : [...draft.selectedSuggestionIds, suggestionId];

    if (!selected && target?.level === "R2") {
      const otherMechanicIds = new Set(
        template.suggestions
          .filter((item) => item.level === "R2" && item.id !== suggestionId)
          .map((item) => item.id),
      );
      selectedSuggestionIds = selectedSuggestionIds.filter(
        (id) => !otherMechanicIds.has(id),
      );
    }
    updateDraft({ selectedSuggestionIds });
  };

  const toggleMechanic = (mechanicId: string) => {
    const selected = draft.selectedMechanicIds.includes(mechanicId);
    const selectedMechanicIds = selected
      ? draft.selectedMechanicIds.filter((id) => id !== mechanicId)
      : [...draft.selectedMechanicIds, mechanicId];
    updateDraft({ selectedMechanicIds });
  };

  const convertToNewGame = () => {
    const selectedTitles =
      template?.suggestions
        .filter((item) => draft.selectedSuggestionIds.includes(item.id))
        .map((item) => item.title)
        .join("、") ?? "";
    const combinedBrief = [
      template ? `以「${template.name}」为灵感` : "",
      selectedTitles ? `希望${selectedTitles}` : "",
      draft.freeRequest,
    ]
      .filter(Boolean)
      .join("，");
    const recommendations = recommendMechanics(combinedBrief);
    updateDraft({
      creationMode: "mechanic-composition",
      newGameBrief: combinedBrief,
      selectedMechanicIds: recommendations.slice(0, 2).map((item) => item.id),
      changeLevel: "R3",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (stage === "review") {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand-mark" aria-hidden="true">游</div>
          <div className="brand-copy">
            <strong>AI 单人网页小游戏制作平台</strong>
            <span>把创意收紧成能做、能玩、能验收的游戏</span>
          </div>
          <span className="draft-status">草稿已保存</span>
        </header>
        <ReviewScreen
          draft={finalizedDraft}
          onBack={() => setStage("compose")}
          onStartProduction={() => {
            setStage("produce");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    );
  }

  if (stage === "produce") {
    return (
      <div className="app-shell">
        <ProductionWorkspace
          initialProject={createProject(finalizedDraft)}
          onBack={() => setStage("review")}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">游</div>
        <div className="brand-copy">
          <strong>AI 单人网页小游戏制作平台</strong>
          <span>把创意收紧成能做、能玩、能验收的游戏</span>
        </div>
        <div className="topbar-meta">
          <span>{getResearchSourceCount()} 个已核验资料入口</span>
          <span className="draft-status">草稿自动保存</span>
        </div>
      </header>

      <div className="studio-layout">
        <StepRail stage={stage} mode={draft.creationMode} />
        <main className="studio-main">
          <div className="intro-row">
            <div>
              <span className="eyebrow">创建一个新项目</span>
              <h1>不要从空白提示词开始</h1>
              <p>先选一个可靠起点。我们会告诉你哪些能放心改，哪些需求已经变成另一款游戏。</p>
            </div>
            <span className="scope-chip">单人 · 网页 · 桌面与手机</span>
          </div>

          <ModeSwitch value={draft.creationMode} onChange={changeMode} />

          {draft.creationMode === "template-remix" ? (
            <>
              <TemplatePicker selectedId={draft.templateId} onSelect={selectTemplate} />
              <SuggestionPicker
                templateId={draft.templateId}
                selectedIds={draft.selectedSuggestionIds}
                onToggle={toggleSuggestion}
                freeRequest={draft.freeRequest}
                onFreeRequestChange={(freeRequest) => updateDraft({ freeRequest })}
                classification={classification}
              />
            </>
          ) : (
            <NewGameDesigner
              brief={draft.newGameBrief}
              onBriefChange={(newGameBrief) => updateDraft({ newGameBrief })}
              selectedMechanicIds={draft.selectedMechanicIds}
              onToggleMechanic={toggleMechanic}
            />
          )}
        </main>

        <BoundaryPanel
          draft={finalizedDraft}
          validation={validation}
          onContinue={() => {
            if (validation.valid) {
              setStage("review");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          onConvert={convertToNewGame}
        />
      </div>
      <footer className="app-footer">
        <span>当前能力：从范围判断到构建、验证与发布闭环</span>
        <span>不会复制参考游戏的品牌、美术、音乐或界面识别</span>
      </footer>
    </div>
  );
}

export default function App() {
  return window.location.pathname === "/create" || new URLSearchParams(window.location.search).get("advanced") === "1"
    ? <AdvancedStudioApp />
    : <SimpleStudioApp />;
}
