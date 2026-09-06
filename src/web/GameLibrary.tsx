import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Gamepad2,
  History,
  Medal,
  SearchX,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { GameTemplate, PlayActivity, ProjectSummary } from "../shared/contracts";
import { getPlayActivities, getPublishedGames } from "./api";
import { SiteHeader } from "./SiteHeader";
import { usePreferences, type MessageKey } from "./preferences";

const templateNameKeys: Record<GameTemplate, MessageKey> = {
  "signal-hunt": "library.template.signal-hunt",
  tetris: "library.template.tetris",
  puzzle: "library.template.puzzle",
  breakout: "library.template.breakout",
  klotski: "library.template.klotski",
  snake: "library.template.snake",
  "merge-2048": "library.template.merge-2048",
  "space-shooter": "library.template.space-shooter",
  "polyomino-fit": "library.template.polyomino-fit",
  "block-place": "library.template.block-place",
  "region-logic": "library.template.region-logic",
  "mahjong-roguelite": "library.template.mahjong-roguelite",
  generated: "library.template.generated",
};

export function GameArtwork({ game, featured }: { game: ProjectSummary; featured: boolean }) {
  const { t } = usePreferences();
  const [failed, setFailed] = useState(false);
  const artworkUrl = game.coverUrl ?? `/media/template-art/${game.template}/cover.png`;
  return (
    <div className="library-art">
      {game.dimensions === "3d" ? <span className="library-dimension-badge"><Box size={14} aria-hidden="true" />3D</span> : null}
      {failed ? <div className="library-art-fallback" role="img" aria-label={t("library.coverUnavailable")}><Box size={30} aria-hidden="true" /><span>{game.title}</span><small>{t("library.coverUnavailable")}</small></div> : <img
        className="library-art-image"
        src={artworkUrl}
        width={2048}
        height={1152}
        loading={featured ? "eager" : "lazy"}
        fetchPriority={featured ? "high" : "auto"}
        alt={`${game.title} 游戏封面`}
        onError={() => setFailed(true)}
      />}
    </div>
  );
}

function GameChipArt({ game }: { game: ProjectSummary }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Gamepad2 size={18} aria-hidden="true" />;
  return <img src={game.coverUrl ?? `/media/template-art/${game.template}/cover.png`} width={64} height={64} loading="lazy" alt="" onError={() => setFailed(true)} />;
}

function GameMarquee({ games }: { games: ProjectSummary[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRef = useRef<HTMLDivElement>(null);
  const [loop, setLoop] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const segment = segmentRef.current;
    if (!container || !segment) return;
    const measure = () => {
      const overflow = segment.scrollWidth > container.clientWidth + 1;
      setLoop(overflow);
      setDuration(overflow ? Math.max(12, segment.scrollWidth / 36) : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(segment);
    return () => observer.disconnect();
  }, [games]);

  const chips = games.map((game) => (
    <span className="library-marquee-chip" key={game.id}>
      <span className="library-marquee-chip-art"><GameChipArt game={game} /></span>
      {game.title}
    </span>
  ));

  return (
    <div className={`library-marquee ${loop ? "is-looping" : ""}`} ref={containerRef} aria-hidden="true">
      <div className="library-marquee-track" style={loop ? { animationDuration: `${duration}s` } : undefined}>
        <div className="library-marquee-segment" ref={segmentRef}>{chips}</div>
        {loop ? <div className="library-marquee-segment">{chips}</div> : null}
      </div>
    </div>
  );
}

function GameCard({ game, featured, activity }: { game: ProjectSummary; featured: boolean; activity?: PlayActivity }) {
  const { t } = usePreferences();
  const publication = game.publication;
  if (!publication) return null;
  const hasNewVersion = Boolean(activity && activity.versionId !== publication.versionId);
  const actionLabel = activity?.status === "completed" ? t("library.replay") : activity ? t("library.continue") : t("library.play");
  const difficultyLabel = game.difficulty === "relaxed" ? t("library.difficultyRelaxed") : game.difficulty === "challenging" ? t("library.difficultyChallenging") : t("library.difficultyStandard");
  return (
    <article className={`library-card ${featured ? "is-featured" : ""}`}>
      <GameArtwork game={game} featured={featured} />
      <div className="library-card-body">
        <div className="library-badges" aria-label={t("library.playStatus")}>
          {activity?.status === "completed" ? <span className="library-badge is-complete" title={t("library.completed")}><Medal size={14} aria-hidden="true" /><span className="sr-only">{t("library.completed")}</span></span> : null}
          {activity && activity.status !== "completed" ? <span className="library-badge" title={t("library.recent")}><History size={14} aria-hidden="true" /><span className="sr-only">{t("library.recent")}</span></span> : null}
          {activity && activity.bestScore > 0 ? <span className="library-badge is-score" title={t("library.best", { score: activity.bestScore })}><Trophy size={14} aria-hidden="true" />{activity.bestScore}</span> : null}
          {hasNewVersion ? <span className="library-badge is-new" title={t("library.newVersion")}><Sparkles size={14} aria-hidden="true" /><span className="sr-only">{t("library.newVersion")}</span></span> : null}
        </div>
        <p className="library-card-category">{t(templateNameKeys[game.template])} · {game.dimensions.toUpperCase()}</p>
        <h2>{game.title}</h2>
        <p className="library-card-idea">{game.idea}</p>
        <p className="library-card-meta">v{publication.versionNumber} · {difficultyLabel} · {game.sessionLength}</p>
        <a className="library-play-link" href={`/player-first?game=${encodeURIComponent(game.id)}`}>
          <Gamepad2 size={18} aria-hidden="true" /> {actionLabel}
        </a>
      </div>
    </article>
  );
}

function LibrarySkeleton() {
  const { t } = usePreferences();
  return (
    <div className="library-skeleton-grid" role="status" aria-label={t("library.loading")}>
      {Array.from({ length: 6 }, (_, index) => <span aria-hidden="true" key={index} />)}
    </div>
  );
}

export function GameLibrary() {
  const { t } = usePreferences();
  const [games, setGames] = useState<ProjectSummary[]>([]);
  const [activities, setActivities] = useState<Map<string, PlayActivity>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    let playerId = "";
    try {
      playerId = localStorage.getItem("forge-player-id") || "";
      if (!/^player-[0-9a-f-]{36}$/i.test(playerId)) {
        playerId = `player-${crypto.randomUUID()}`;
        localStorage.setItem("forge-player-id", playerId);
      }
    } catch { playerId = `player-${crypto.randomUUID()}`; }
    Promise.all([getPublishedGames(), getPlayActivities(playerId)])
      .then(([result, activityRows]) => {
        if (active) {
          const activityMap = new Map(activityRows.map((activity) => [activity.projectId, activity]));
          setActivities(activityMap);
          setGames([...result].sort((left, right) => (activityMap.get(right.id)?.lastPlayedAt ?? "").localeCompare(activityMap.get(left.id)?.lastPlayedAt ?? "")));
        }
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "游戏大厅读取失败。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleGames = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return games;
    return games.filter((game) => game.title.toLowerCase().includes(needle) || game.idea.toLowerCase().includes(needle));
  }, [games, query]);

  const filtering = query.trim().length > 0;

  return (
    <div className="library-page">
      <SiteHeader active="games" search={{ value: query, onChange: setQuery, placeholder: t("library.searchPlaceholder"), label: t("library.searchLabel") }} />
      {games.length > 0 ? <GameMarquee games={games} /> : null}
      <main className="library-main" id="main-content" tabIndex={-1}>
        <header className="library-hero">
          <div>
            <p className="eyebrow">{t("library.eyebrow")}</p>
            <h1>{t("library.hero").split("\n").map((line, index) => <span key={line}>{index ? <br /> : null}{line}</span>)}</h1>
          </div>
          <div className="library-summary">
            <strong>{String(games.length).padStart(2, "0")}</strong>
            <span>{t("library.count")}</span>
            <p>{t("library.detail")}</p>
          </div>
        </header>

        {error ? <div className="library-message is-error" role="alert">{error}</div> : null}
        {loading ? (
          <LibrarySkeleton />
        ) : visibleGames.length > 0 ? (
          <section className="library-grid" aria-label={t("library.list")}>
            {visibleGames.map((game, index) => <GameCard game={game} activity={activities.get(game.id)} featured={index === 0} key={game.id} />)}
          </section>
        ) : filtering ? (
          <section className="library-empty">
            <SearchX size={28} aria-hidden="true" />
            <h2>{t("library.noResults")}</h2>
            <p>{t("library.noResultsDetail")}</p>
            <button type="button" onClick={() => setQuery("")}>{t("library.clearFilters")}</button>
          </section>
        ) : (
          <section className="library-empty">
            <Box size={28} aria-hidden="true" />
            <h2>{t("library.none")}</h2>
            <p>{t("library.noneDetail")}</p>
            <a href="/projects">{t("library.back")}</a>
          </section>
        )}
      </main>
      <footer className="library-footer">
        <span>{t("library.footer")}</span>
        <span>{t("library.footerDetail")}</span>
      </footer>
    </div>
  );
}
