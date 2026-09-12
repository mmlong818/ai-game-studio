import { useEffect, useMemo, useRef, useState } from "react";
import { LiveDesignReview } from "./components/LiveDesignReview";
import { CreationStart } from "./components/CreationStart";
import { AutomaticProduction, getPendingProductionId } from "./components/AutomaticProduction";
import { SimpleStudioApp } from "./components/SimpleStudioApp";
import { classifyChange } from "./domain/classifyChange";
import { createReferenceDossier, recommendMechanics } from "./domain/research";
import { loadDraft, saveDraft } from "./domain/storage";
import { GAME_TEMPLATES, getTemplate } from "./domain/templates";
import { knowledgeMappingForTemplate } from "./shared/game-design-knowledge/official-mapping";
import type { ChangeLevel, CreationMode, GameTemplate, SourceGame, StudioDraft, ValidationResult } from "./domain/types";
import { DOMAIN_TEMPLATE_ART, resolveTemplateForGame } from "./domain/templateResolution";
import { validateDraft } from "./domain/validation";
import { getPublishedGames } from "./web/api";
import type { GameDesignProfile } from "./shared/contracts";
import type { RevisionPlan } from "./shared/contracts";
import { RevisionPlanPicker } from "./web/RevisionPlanPicker";
import { SpriteAnimationChoice, type SpriteAnimationPreference } from "./components/SpriteAnimationControl";
import { AspectRatioChoice, type NewGameAspectRatio } from "./components/AspectRatioChoice";
import { resolveCreationModeIntent } from "./shared/generated-blueprint";

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
        const pickable = mapped.filter(game => game.templateId !== null);
        setGames(pickable.length > 0 ? pickable : GAME_TEMPLATES.map(templateAsPickable));
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
  onConvert,
  onPlanReady,
}: {
  template: GameTemplate;
  sourceGame: SourceGame | null;
  value: string;
  onChange: (value: string) => void;
  onChangeGame: () => void;
  level: ChangeLevel;
  uncertain: boolean;
  onConvert: () => void;
  onPlanReady: (plan: RevisionPlan) => void;
}) {
  const hasText = value.trim().length > 0;
  const explain = uncertain ? UNCERTAIN_EXPLAIN : LEVEL_EXPLAIN[level];
  const blocked = level === "R3";
  const showAssessment = hasText && (explain.tone !== "caution" || /新增|加入|添加|新机制|玩法|战斗|联机/i.test(value));
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
      <RevisionPlanPicker projectId={sourceGame?.id ?? ""} content={value} onContentChange={onChange}
        disabled={!sourceGame} inputId="remix-request" inputLabel="这次想怎么改？"
        placeholder="例如：所有角色改为精灵动图，同时把技能墨量消耗减半。"
        submitLabel="确认改造需求，生成方案" onConfirm={plan => { onPlanReady(plan); }} />
      {showAssessment && (
        <div className={`assessment tone-${explain.tone}`} role="status">
          <strong>{explain.title}</strong>
          <span>{explain.detail}</span>
        </div>
      )}
      <p className="remix-preservation-note">可一次确认玩法、资源和画面风格等互不冲突的修改。未点名的资源、玩法和操作仍会保留。</p>
      {blocked ? (
        <button type="button" className="primary-action" onClick={onConvert}>
          按新游戏继续 <span aria-hidden="true">→</span>
        </button>
      ) : (
        null
      )}
      <p className="action-footnote">{hasText ? "分析修改内容只会读取当前作品和资源，不调用模型；确认后生成方案会使用文字模型用量。" : "先写一句你想改什么。"}</p>
    </section>
  );
}

function NewGameDescribeStep({
  value,
  onChange,
  spriteAnimation,
  onSpriteAnimationChange,
  validation,
  onContinue,
  aspectRatio,
  onAspectRatioChange,
}: {
  value: string;
  onChange: (value: string) => void;
  spriteAnimation: SpriteAnimationPreference;
  onSpriteAnimationChange: (value: SpriteAnimationPreference) => void;
  validation: ValidationResult;
  onContinue: (explicit?: boolean) => void;
  aspectRatio: NewGameAspectRatio | null;
  onAspectRatioChange: (value: NewGameAspectRatio) => void;
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
          <strong>根据描述匹配到这些候选玩法，制作后仍需验证</strong>
          <span>{mechanics.map((item) => item.name).join("、")}</span>
        </div>
      )}
      <AspectRatioChoice value={aspectRatio} onChange={onAspectRatioChange} />
      <SpriteAnimationChoice value={spriteAnimation} onChange={onSpriteAnimationChange} />
      <button type="button" className="primary-action" onClick={() => onContinue(true)} disabled={!validation.valid || !aspectRatio}>
        提交，生成方案 <span aria-hidden="true">→</span>
      </button>
      <p className="action-footnote">
        {ready ? "下一步会先给你看一份可检查的方案，不会马上消耗 AI 额度。" : "再多写一点，一句完整的话就够。"}
      </p>
    </section>
  );
}

export function AdvancedStudioApp() {
  const [draft, setDraft] = useState<StudioDraft>(() => loadDraft());
  const [stage, setStage] = useState<Stage>(() => new URLSearchParams(location.search).has("production") || getPendingProductionId() ? "produce" : "compose");
  const [confirmedPlan, setConfirmedPlan] = useState<string>();
  const [confirmedDesignProfile, setConfirmedDesignProfile] = useState<GameDesignProfile>();
  const [originalIdea, setOriginalIdea] = useState<string>();
  const [confirmedReferenceFallback, setConfirmedReferenceFallback] = useState<{ decision: "user-approved-original-demo"; gameplayDescription: string }>();
  const [revisionPlan, setRevisionPlan] = useState<RevisionPlan>();
  const [reviewScrollRequest, setReviewScrollRequest] = useState(0);
  const completedReviewScroll = useRef(0);
  useEffect(() => {
    if (!reviewScrollRequest || reviewScrollRequest === completedReviewScroll.current || stage !== "review") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("live-game-design")?.scrollIntoView({ block: "start", behavior: "auto" });
      completedReviewScroll.current = reviewScrollRequest;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [reviewScrollRequest, stage]);
  const [step, setStep] = useState<ComposeStep>("choose");
  const [creationErrors, setCreationErrors] = useState<string[]>([]);
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
      revisionScope: "gameplay",
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
      if (resolveCreationModeIntent({ idea: draft.newGameBrief }) === "reference-replica") {
        return { ...draft, selectedSuggestionIds: [], selectedMechanicIds: [], changeLevel: "R3", referenceDossier: null };
      }
      const selectedMechanicIds = recommendMechanics(draft.newGameBrief).slice(0, 2).map((item) => item.id);
      const dossier = createReferenceDossier(draft.newGameBrief, selectedMechanicIds);
      return { ...draft, selectedSuggestionIds: [], selectedMechanicIds, changeLevel: "R3", referenceDossier: dossier };
    }
    const changeLevel: ChangeLevel = draft.freeRequest.trim() ? classification.level : "R0";
    const mechanicIds = template ? knowledgeMappingForTemplate(template.id)?.mechanicIds ?? [] : [];
    const referenceDossier = changeLevel === "R2" && mechanicIds.length
      ? createReferenceDossier(`${draft.sourceGame?.title ?? template?.name ?? "模板"}：${draft.freeRequest}`, mechanicIds.slice(0, 2))
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
    setRevisionPlan(undefined);
    updateDraft({ creationMode, revisionScope: "gameplay", referenceDossier: null, changeLevel: creationMode === "template-remix" ? "R0" : "R3" });
    setStep(creationMode === "template-remix" ? "pick-game" : "describe");
  };

  const pickGame = (game: PickableGame) => {
    if (!game.templateId) return;
    setRevisionPlan(undefined);
    updateDraft({
      revisionScope: "gameplay",
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
    setRevisionPlan(undefined);
    updateDraft({ creationMode: "mechanic-composition", templateId: null, sourceGame: null, newGameBrief: combinedBrief, changeLevel: "R3", aspectRatio: undefined });
    setStep("describe");
    scrollTop();
  };

  const startReview = (explicit = false) => {
    if (!validation.valid) return;
    setStage("review");
    if (explicit) setReviewScrollRequest(value => value + 1);
  };

  if (stage === "produce") {
    return (
      <div className="app-shell studio-app">
        <AutomaticProduction draft={finalizedDraft} confirmedPlan={confirmedPlan} confirmedDesignProfile={confirmedDesignProfile} originalIdea={originalIdea} referenceFallback={confirmedReferenceFallback} revisionPlan={revisionPlan} />
      </div>
    );
  }

  const isRemix = draft.creationMode === "template-remix";
  const remixTitle = draft.sourceGame?.title ?? template?.name ?? "这个游戏";
  const heading = step === "choose"
    ? { title: "把想法，变成好玩的。", lead: "一句话开始你的小游戏。先确认玩法，再制作与试玩。" }
    : step === "pick-game"
      ? { title: "你想改哪一个？", lead: "点一个游戏。" }
      : isRemix
        ? { title: `个性化「${remixTitle}」`, lead: "可以一次说明玩法、资源和画面风格等互不冲突的调整。未点名的内容会保留。" }
        : { title: "你想做一个什么游戏？", lead: "可以说一个你玩过的游戏，也可以说一个从没见过的点子。" };
  const backStep: ComposeStep | null = step === "choose" ? null : step === "describe" && isRemix ? "pick-game" : "choose";

  return (
    <div className="app-shell studio-app">
      {stage === "compose" && (
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

          {step === "choose" && <CreationStart value={draft.newGameBrief}
            errors={creationErrors}
            onChange={newGameBrief => { setCreationErrors([]); updateDraft({ newGameBrief, creationMode: "mechanic-composition", templateId: null, sourceGame: null }); }}
            onContinue={(explicit = false) => {
              if (!draft.aspectRatio) { setCreationErrors(["请先选择游戏画幅。"]); return; }
              const intent = resolveCreationModeIntent({ idea: draft.newGameBrief });
              if (intent === "reference-replica") {
                const next: StudioDraft = { ...draft, creationMode: "mechanic-composition", templateId: null, sourceGame: null, selectedSuggestionIds: [], selectedMechanicIds: [], changeLevel: "R3", referenceDossier: null };
                const check = validateDraft(next);
                setCreationErrors(check.errors);
                if (!check.valid) return;
                setDraft(next); setStage("review");
                if (explicit) setReviewScrollRequest(value => value + 1);
                return;
              }
              const selectedMechanicIds = recommendMechanics(draft.newGameBrief).slice(0, 2).map(item => item.id);
              const next: StudioDraft = { ...draft, creationMode: "mechanic-composition", templateId: null, sourceGame: null, selectedSuggestionIds: [], selectedMechanicIds, changeLevel: "R3", referenceDossier: createReferenceDossier(draft.newGameBrief, selectedMechanicIds) };
              const check = validateDraft(next);
              setCreationErrors(check.errors);
              if (!check.valid) return;
              setDraft(next); setStage("review");
              if (explicit) setReviewScrollRequest(value => value + 1);
            }} onRemix={() => choose("template-remix")} spriteAnimation={draft.spriteAnimation} onSpriteAnimationChange={spriteAnimation => updateDraft({ spriteAnimation })}
            aspectRatio={draft.aspectRatio ?? null} onAspectRatioChange={aspectRatio => { setCreationErrors([]); updateDraft({ aspectRatio }); }} />}
          {step === "pick-game" && <PickGameStep games={games} onPick={pickGame} />}
          {step === "describe" && isRemix && template && (
            <RemixDescribeStep
              template={template}
              sourceGame={draft.sourceGame ?? null}
              value={draft.freeRequest}
              onChange={(freeRequest) => { setRevisionPlan(undefined); updateDraft({ freeRequest }); }}
              onChangeGame={() => setStep("pick-game")}
              level={finalizedDraft.changeLevel}
              uncertain={classification.matchedTerms.length === 0 && draft.freeRequest.trim().length > 0}
              onConvert={convertToNewGame}
              onPlanReady={(plan) => { setRevisionPlan(plan); startReview(true); }}
            />
          )}
          {step === "describe" && !isRemix && (
            <NewGameDescribeStep
              value={draft.newGameBrief}
              onChange={(newGameBrief) => updateDraft({ newGameBrief })}
              spriteAnimation={draft.spriteAnimation}
              onSpriteAnimationChange={(spriteAnimation) => updateDraft({ spriteAnimation })}
              validation={validation}
              onContinue={startReview}
              aspectRatio={draft.aspectRatio ?? null}
              onAspectRatioChange={aspectRatio => updateDraft({ aspectRatio })}
            />
          )}
          </main>
        </div>
      )}
      {stage === "review" && validation.valid && (
        <div className="review-stage">
          <LiveDesignReview draft={finalizedDraft} revisionPlan={revisionPlan} onBack={() => { setStage("compose"); document.querySelector<HTMLTextAreaElement>("textarea")?.focus(); }} onConfirm={(text, profile, idea, fallback) => { if (validation.valid) { setConfirmedPlan(text); setConfirmedDesignProfile(profile); setOriginalIdea(idea); setConfirmedReferenceFallback(fallback); setStage("produce"); scrollTop(); } }} />
        </div>
      )}
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
