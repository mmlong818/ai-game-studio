import { useEffect, useMemo, useState } from "react";
import { ReviewScreen } from "./components/ReviewScreen";
import { ProductionWorkspace } from "./components/ProductionWorkspace";
import { SimpleStudioApp } from "./components/SimpleStudioApp";
import { createProject } from "./domain/project";
import { classifyChange } from "./domain/classifyChange";
import { createReferenceDossier, recommendMechanics } from "./domain/research";
import { loadDraft, saveDraft } from "./domain/storage";
import { GAME_TEMPLATES, getTemplate, TEMPLATE_MECHANIC_MAP } from "./domain/templates";
import type { ChangeLevel, CreationMode, GameTemplate, SourceGame, StudioDraft, ValidationResult } from "./domain/types";
import { DOMAIN_TEMPLATE_ART, resolveTemplateForGame } from "./domain/templateResolution";
import { validateDraft } from "./domain/validation";
import { getPublishedGames } from "./web/api";

type Stage = "compose" | "review" | "produce";
type ComposeStep = "choose" | "pick-game" | "describe";

// 面向外行的改动说明：不出现 R0–R3 代码，只说会发生什么。
const LEVEL_EXPLAIN: Record<ChangeLevel, { tone: "safe" | "caution" | "blocked"; title: string; detail: string }> = {
  R0: { tone: "safe", title: "这只改画面和文案，玩法不变", detail: "可以直接开始。" },
  R1: { tone: "safe", title: "这是内容和难度上的调整", detail: "可以直接开始。" },
  R2: { tone: "caution", title: "这会给游戏加一种新机制", detail: "开始前我们会先看看同类游戏是怎么做的。" },
  R3: { tone: "blocked", title: "这已经是一款新游戏了", detail: "原来的游戏留着不动，你的描述会带到新游戏里继续。" },
};
const UNCERTAIN_EXPLAIN = { tone: "caution" as const, title: "我们不太确定这算不算改玩法", detail: "会按“加一种新机制”来谨慎处理，开始前先看看同类游戏。" };

interface PickableGame {
  key: string;
  title: string;
  subtitle: string;
  coverUrl: string | null;
  templateId: string | null;
  sourceGame: SourceGame | null;
}

function templateAsPickable(template: GameTemplate): PickableGame {
  const art = DOMAIN_TEMPLATE_ART[template.id];
  return {
    key: `template:${template.id}`,
    title: template.name,
    subtitle: template.genre,
    coverUrl: art ? `/media/template-art/${art}/cover.png` : null,
    templateId: template.id,
    sourceGame: null,
  };
}

function GameArt({ src, title, size = "large" }: { src: string | null; title: string; size?: "large" | "small" }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        className={`game-icon-art is-${size}`}
        src={src}
        alt=""
        width={size === "large" ? 320 : 96}
        height={size === "large" ? 320 : 96}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className={`game-icon-art is-${size} is-text`} aria-hidden="true">
      {title.slice(0, 2)}
    </span>
  );
}

function ChooseStep({ onChoose }: { onChoose: (mode: CreationMode) => void }) {
  return (
    <div className="choice-grid">
      <button type="button" className="choice-card" onClick={() => onChoose("template-remix")}>
        <span className="choice-kicker">先选游戏，再写一句话</span>
        <strong>改一个现有游戏</strong>
        <span className="choice-copy">从大厅里挑一个游戏，说说想改哪里：换画风、调难度、加关卡，或者把玩法改掉。</span>
        <span className="choice-arrow" aria-hidden="true">→</span>
      </button>
      <button type="button" className="choice-card" onClick={() => onChoose("mechanic-composition")}>
        <span className="choice-kicker">只需要一段话</span>
        <strong>做一个新游戏</strong>
        <span className="choice-copy">直接描述你想要的游戏。可以说一个你玩过的游戏，也可以说一个从没见过的点子。</span>
        <span className="choice-arrow" aria-hidden="true">→</span>
      </button>
    </div>
  );
}

/** 优先展示大厅里真实的官方游戏；拿不到大厅数据时退回内部模板列表。 */
function usePickableGames() {
  const [games, setGames] = useState<PickableGame[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    getPublishedGames()
      .then((published) => {
        if (cancelled) return;
        const mapped = published.map<PickableGame>((game) => {
          const template = resolveTemplateForGame(game);
          return {
            key: `game:${game.id}`,
            title: game.title,
            subtitle: template?.genre ?? "暂不能改",
            coverUrl: game.coverUrl,
            templateId: template?.id ?? null,
            sourceGame: { id: game.id, title: game.title, coverUrl: game.coverUrl },
          };
        });
        setGames(mapped.length > 0 ? mapped : GAME_TEMPLATES.map(templateAsPickable));
      })
      .catch(() => {
        if (!cancelled) setGames(GAME_TEMPLATES.map(templateAsPickable));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return games;
}

function PickGameStep({ games, onPick }: { games: PickableGame[] | null; onPick: (game: PickableGame) => void }) {
  if (!games) return <p className="pick-loading" role="status">正在读取大厅里的游戏…</p>;
  return (
    <ul className="game-icon-grid" aria-label="可以改造的游戏">
      {games.map((game) => (
        <li key={game.key}>
          <button
            type="button"
            className="game-icon-tile"
            disabled={!game.templateId}
            title={game.templateId ? undefined : "这款游戏暂时不能改造"}
            onClick={() => onPick(game)}
          >
            <GameArt src={game.coverUrl} title={game.title} />
            <strong>{game.title}</strong>
            <small>{game.subtitle}</small>
          </button>
        </li>
      ))}
    </ul>
  );
}

function RemixDescribeStep({
  template,
  sourceGame,
  value,
  onChange,
  onChangeGame,
  level,
  uncertain,
  validation,
  onContinue,
  onConvert,
}: {
  template: GameTemplate;
  sourceGame: SourceGame | null;
  value: string;
  onChange: (value: string) => void;
  onChangeGame: () => void;
  level: ChangeLevel;
  uncertain: boolean;
  validation: ValidationResult;
  onContinue: () => void;
  onConvert: () => void;
}) {
  const hasText = value.trim().length > 0;
  const explain = uncertain ? UNCERTAIN_EXPLAIN : LEVEL_EXPLAIN[level];
  const blocked = level === "R3";
  const title = sourceGame?.title ?? template.name;
  const art = sourceGame?.coverUrl ?? templateAsPickable(template).coverUrl;
  return (
    <section className="describe-panel" aria-label="描述改动">
      <div className="chosen-game">
        <GameArt src={art} title={title} size="small" />
        <span className="chosen-game-copy">
          <small>要改的游戏</small>
          <strong>{title}</strong>
        </span>
        <button type="button" className="text-link" onClick={onChangeGame}>换一个游戏</button>
      </div>
      <label htmlFor="remix-request">你想怎么改？</label>
      <textarea
        id="remix-request"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={6}
        placeholder={"用自己的话说就行。比如：\n换成海底世界的画风\n关卡多一些，难度低一点\n加一种会动的障碍\n把它和贪吃蛇合成一个游戏"}
      />
      {hasText && (
        <div className={`assessment tone-${explain.tone}`} role="status">
          <strong>{explain.title}</strong>
          <span>{explain.detail}</span>
        </div>
      )}
      {blocked ? (
        <button type="button" className="primary-action" onClick={onConvert}>
          按新游戏继续 <span aria-hidden="true">→</span>
        </button>
      ) : (
        <button type="button" className="primary-action" onClick={onContinue} disabled={!validation.valid}>
          开始制作 <span aria-hidden="true">→</span>
        </button>
      )}
      <p className="action-footnote">{hasText ? "下一步会先给你看一份可检查的方案，不会马上消耗 AI 额度。" : "先写一句你想改什么。"}</p>
    </section>
  );
}

function NewGameDescribeStep({
  value,
  onChange,
  validation,
  onContinue,
}: {
  value: string;
  onChange: (value: string) => void;
  validation: ValidationResult;
  onContinue: () => void;
}) {
  const ready = value.trim().length >= 12;
  const mechanics = ready ? recommendMechanics(value).slice(0, 2) : [];
  return (
    <section className="describe-panel" aria-label="描述新游戏">
      <label htmlFor="new-game-brief">说说你想做的游戏</label>
      <textarea
        id="new-game-brief"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={7}
        placeholder={"比如：\n一个像贪吃蛇的游戏，但吃的是星星，越吃越快\n我想做一个俄罗斯方块\n主角是一只小昆虫，在树干上一边爬一边躲树脂"}
      />
      {ready && mechanics.length > 0 && (
        <div className="assessment tone-safe" role="status">
          <strong>我们听懂了，会用这些已经验证过的玩法来搭</strong>
          <span>{mechanics.map((item) => item.name).join("、")}</span>
        </div>
      )}
      <button type="button" className="primary-action" onClick={onContinue} disabled={!validation.valid}>
        开始制作 <span aria-hidden="true">→</span>
      </button>
      <p className="action-footnote">
        {ready ? "下一步会先给你看一份可检查的方案，不会马上消耗 AI 额度。" : "再多写一点，一句完整的话就够。"}
      </p>
    </section>
  );
}

export function AdvancedStudioApp() {
  const [draft, setDraft] = useState<StudioDraft>(() => loadDraft());
  const [stage, setStage] = useState<Stage>("compose");
  const [step, setStep] = useState<ComposeStep>("choose");
  const games = usePickableGames();
  // 从游戏画面边缘的“改造这个游戏”进来时带有 ?game=<id>，直接预选该游戏并跳到描述步骤。
  const requestedGameId = useMemo(() => new URLSearchParams(window.location.search).get("game"), []);
  const [requestedGameHandled, setRequestedGameHandled] = useState(false);
  useEffect(() => {
    if (!requestedGameId || requestedGameHandled || !games) return;
    setRequestedGameHandled(true);
    const game = games.find((item) => item.key === `game:${requestedGameId}`);
    if (!game?.templateId) return;
    setDraft((current) => ({
      ...current,
      creationMode: "template-remix",
      templateId: game.templateId,
      sourceGame: game.sourceGame,
      selectedSuggestionIds: [],
      freeRequest: "",
      referenceDossier: null,
      changeLevel: "R0",
    }));
    setStep("describe");
  }, [games, requestedGameHandled, requestedGameId]);
  const template = getTemplate(draft.templateId);
  const classification = useMemo(() => classifyChange(draft.freeRequest, template), [draft.freeRequest, template]);

  // 界面不再让用户挑选建议或机制：改动级别由文字判定，新游戏机制由描述推荐。
  const finalizedDraft = useMemo<StudioDraft>(() => {
    if (draft.creationMode === "mechanic-composition") {
      const selectedMechanicIds = recommendMechanics(draft.newGameBrief).slice(0, 2).map((item) => item.id);
      const dossier = createReferenceDossier(draft.newGameBrief, selectedMechanicIds);
      return { ...draft, selectedSuggestionIds: [], selectedMechanicIds, changeLevel: "R3", referenceDossier: dossier };
    }
    const changeLevel: ChangeLevel = draft.freeRequest.trim() ? classification.level : "R0";
    const mechanicId = template ? TEMPLATE_MECHANIC_MAP[template.id] : undefined;
    const referenceDossier = changeLevel === "R2" && mechanicId
      ? createReferenceDossier(`${draft.sourceGame?.title ?? template?.name ?? "模板"}：${draft.freeRequest}`, [mechanicId])
      : null;
    return { ...draft, selectedSuggestionIds: [], changeLevel, referenceDossier };
  }, [classification.level, draft, template]);

  const validation = useMemo(() => validateDraft(finalizedDraft), [finalizedDraft]);

  useEffect(() => {
    saveDraft(finalizedDraft);
  }, [finalizedDraft]);

  const updateDraft = (updates: Partial<StudioDraft>) => {
    setDraft((current) => ({ ...current, ...updates }));
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const choose = (creationMode: CreationMode) => {
    updateDraft({ creationMode, referenceDossier: null, changeLevel: creationMode === "template-remix" ? "R0" : "R3" });
    setStep(creationMode === "template-remix" ? "pick-game" : "describe");
  };

  const pickGame = (game: PickableGame) => {
    if (!game.templateId) return;
    updateDraft({
      templateId: game.templateId,
      sourceGame: game.sourceGame,
      selectedSuggestionIds: [],
      freeRequest: "",
      referenceDossier: null,
      changeLevel: "R0",
    });
    setStep("describe");
  };

  const convertToNewGame = () => {
    const inspiration = draft.sourceGame?.title ?? template?.name;
    const combinedBrief = [inspiration ? `以「${inspiration}」为灵感` : "", draft.freeRequest].filter(Boolean).join("，");
    updateDraft({ creationMode: "mechanic-composition", newGameBrief: combinedBrief, changeLevel: "R3" });
    setStep("describe");
    scrollTop();
  };

  const startReview = () => {
    if (!validation.valid) return;
    setStage("review");
    scrollTop();
  };

  if (stage === "review") {
    return (
      <div className="app-shell studio-app">
        <ReviewScreen
          draft={finalizedDraft}
          onBack={() => setStage("compose")}
          onStartProduction={() => {
            setStage("produce");
            scrollTop();
          }}
        />
      </div>
    );
  }

  if (stage === "produce") {
    return (
      <div className="app-shell studio-app">
        <ProductionWorkspace initialProject={createProject(finalizedDraft)} onBack={() => setStage("review")} />
      </div>
    );
  }

  const isRemix = draft.creationMode === "template-remix";
  const remixTitle = draft.sourceGame?.title ?? template?.name ?? "这个游戏";
  const heading = step === "choose"
    ? { title: "今天想做什么？", lead: "不需要懂游戏设计。选一个方向，然后用自己的话说出来就行。" }
    : step === "pick-game"
      ? { title: "你想改哪一个？", lead: "点一个游戏。" }
      : isRemix
        ? { title: `想怎么改「${remixTitle}」？`, lead: "换画风、调难度、加关卡，或者把玩法改掉，都可以。" }
        : { title: "你想做一个什么游戏？", lead: "可以说一个你玩过的游戏，也可以说一个从没见过的点子。" };
  const backStep: ComposeStep | null = step === "choose" ? null : step === "describe" && isRemix ? "pick-game" : "choose";

  return (
    <div className="app-shell studio-app">
      <div className="studio-layout">
        <main className="studio-main" id="main-content" tabIndex={-1}>
          <div className="intro-row">
            <div>
              {backStep ? (
                <button type="button" className="text-action" onClick={() => setStep(backStep)}>← 返回</button>
              ) : (
                <span className="eyebrow">游戏创作</span>
              )}
              <h1>{heading.title}</h1>
              <p>{heading.lead}</p>
            </div>
            {step === "choose" && <span className="scope-chip">单人 · 网页 · 桌面与手机</span>}
          </div>

          {step === "choose" && <ChooseStep onChoose={choose} />}
          {step === "pick-game" && <PickGameStep games={games} onPick={pickGame} />}
          {step === "describe" && isRemix && template && (
            <RemixDescribeStep
              template={template}
              sourceGame={draft.sourceGame ?? null}
              value={draft.freeRequest}
              onChange={(freeRequest) => updateDraft({ freeRequest })}
              onChangeGame={() => setStep("pick-game")}
              level={finalizedDraft.changeLevel}
              uncertain={classification.matchedTerms.length === 0 && draft.freeRequest.trim().length > 0}
              validation={validation}
              onContinue={startReview}
              onConvert={convertToNewGame}
            />
          )}
          {step === "describe" && !isRemix && (
            <NewGameDescribeStep
              value={draft.newGameBrief}
              onChange={(newGameBrief) => updateDraft({ newGameBrief })}
              validation={validation}
              onContinue={startReview}
            />
          )}
        </main>
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
