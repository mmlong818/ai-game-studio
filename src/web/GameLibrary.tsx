import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Box,
  CalendarDays,
  Clock3,
  Gamepad2,
  Gauge,
  History,
  Layers3,
  Radio,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { PlayActivity, ProjectSummary } from "../shared/contracts";
import { getPlayActivities, getPublishedGames } from "./api";
import { SiteHeader } from "./SiteHeader";
import { usePreferences, type ResolvedLocale } from "./preferences";

function formatPublishedAt(value: string, locale: ResolvedLocale) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function GameArtwork({ game, featured }: { game: ProjectSummary; featured: boolean }) {
  const { t } = usePreferences();
  const [failed, setFailed] = useState(false);
  const artworkUrl = game.coverUrl ?? `/media/template-art/${game.template}/cover.png`;
  // 只有以方形 App 图标充当封面的固定游戏需要留白；自带竖版 cover.png 的固定游戏按普通封面展示。
  const squareArt = Boolean(game.fixtureKind) && artworkUrl.endsWith("app-icon-512.png");
  return (
    <div className={`library-art ${squareArt ? "is-square-art" : ""}`}>
      {failed ? <div className="library-art-fallback" role="img" aria-label={t("library.coverUnavailable")}><Box size={30} aria-hidden="true" /><span>{game.title}</span><small>{t("library.coverUnavailable")}</small></div> : <img
        className="library-art-image"
        src={artworkUrl}
        width={squareArt ? 512 : 2048}
        height={squareArt ? 512 : 1152}
        loading={featured ? "eager" : "lazy"}
        fetchPriority={featured ? "high" : "auto"}
        alt={`${game.title} 游戏封面`}
        onError={() => setFailed(true)}
      />}
      <span className="art-label">{game.fixtureKind ? "GOLDEN GAME / BITMAP ART" : "GPT-IMAGE-2 / ORIGINAL KEY ART"}</span>
    </div>
  );
}

function GameCard({ game, featured, activity }: { game: ProjectSummary; featured: boolean; activity?: PlayActivity }) {
  const { locale, t } = usePreferences();
  const publication = game.publication;
  if (!publication) return null;
  const hasNewVersion = Boolean(activity && activity.versionId !== publication.versionId);
  const actionLabel = activity?.status === "completed" ? t("library.replay") : activity ? t("library.continue") : t("library.play");
  const difficultyLabel = game.difficulty === "relaxed" ? t("library.difficultyRelaxed") : game.difficulty === "challenging" ? t("library.difficultyChallenging") : t("library.difficultyStandard");
  const inputLabel = game.inputModes.map((mode) => mode === "keyboard" ? t("library.inputKeyboard") : mode === "pointer" ? t("library.inputPointer") : t("library.inputTouch")).filter((value, index, values) => values.indexOf(value) === index).join(" · ");
  return (
    <article className={`library-card ${featured ? "is-featured" : ""}`}>
      <GameArtwork game={game} featured={featured} />
      <div className="library-card-body">
        <div className="library-card-topline">
          <span><Radio size={13} aria-hidden="true" /> LIVE</span>
          <span>{game.dimensions.toUpperCase()}</span>
        </div>
        <h2>{game.title}</h2>
        <p>{game.idea}</p>
        <div className="library-flags" aria-label={t("library.playStatus")}>
          {activity?.status === "completed" ? <span className="is-complete"><Trophy size={13} aria-hidden="true" />{t("library.completed")}</span> : null}
          {activity && activity.status !== "completed" ? <span><History size={13} aria-hidden="true" />{t("library.recent")}</span> : null}
          {activity && activity.bestScore > 0 ? <span><Trophy size={13} aria-hidden="true" />{t("library.best", { score: activity.bestScore })}</span> : null}
          {hasNewVersion ? <span className="is-new"><Sparkles size={13} aria-hidden="true" />{t("library.newVersion")}</span> : null}
        </div>
        <dl className="library-meta">
          <div><dt><Layers3 size={14} aria-hidden="true" /> {t("library.version")}</dt><dd>v{publication.versionNumber}</dd></div>
          <div><dt><CalendarDays size={14} aria-hidden="true" /> {t("library.publishedAt")}</dt><dd><time dateTime={publication.publishedAt}>{formatPublishedAt(publication.publishedAt, locale)}</time></dd></div>
          <div><dt><Gamepad2 size={14} aria-hidden="true" /> {t("library.format")}</dt><dd>{game.dimensions.toUpperCase()} · {game.aspectRatio}</dd></div>
          <div><dt><Clock3 size={14} aria-hidden="true" /> {t("library.session")}</dt><dd>{game.sessionLength}</dd></div>
          <div><dt><Gauge size={14} aria-hidden="true" /> {t("library.difficulty")}</dt><dd>{difficultyLabel}</dd></div>
          <div><dt><Gamepad2 size={14} aria-hidden="true" /> {t("library.input")}</dt><dd>{inputLabel}</dd></div>
        </dl>
        <a className="library-play-link" href={`/player-first?game=${encodeURIComponent(game.id)}`}>
          {actionLabel} <ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

function LibrarySkeleton() {
  const { t } = usePreferences();
  return (
    <div className="library-skeleton-grid" role="status" aria-label={t("library.loading")}>
      {Array.from({ length: 4 }, (_, index) => <span aria-hidden="true" key={index} />)}
    </div>
  );
}

export function GameLibrary() {
  const { t } = usePreferences();
  const [games, setGames] = useState<ProjectSummary[]>([]);
  const [activities, setActivities] = useState<Map<string, PlayActivity>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="library-page">
      <SiteHeader active="games" />
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
        ) : games.length > 0 ? (
          <section className="library-grid" aria-label={t("library.list")}>
            {games.map((game, index) => <GameCard game={game} activity={activities.get(game.id)} featured={index === 0} key={game.id} />)}
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
