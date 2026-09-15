import { useEffect, useRef, useState } from "react";
import type { Build, ProjectDetail } from "../shared/contracts";
import { getPlayableBuild } from "./api";
import { SiteHeader } from "./SiteHeader";
import { postGameLocale, withGameLocale } from "./game-locale";
import { usePreferences } from "./preferences";

/** Private playback is a read-only operation, independent of publication. */
export function PrivateGamePreview({ project }: { project: ProjectDetail }) {
  const { locale, t } = usePreferences();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const localizedUrl = useRef<{ source: string; value: string } | null>(null);
  const [result, setResult] = useState<{ projectId: string; build: Build | null; error?: string } | null>(null);
  useEffect(() => {
    let active = true;
    getPlayableBuild(project.id).then(build => {
      if (active) setResult({ projectId: project.id, build });
    }).catch(() => {
      if (active) setResult({ projectId: project.id, build: null, error: t("preview.loadFailed") });
    });
    return () => { active = false; };
  }, [project.id, t]);
  const current = result?.projectId === project.id ? result : null;
  let url: string | null = null;
  try {
    const candidate = new URL(current?.build?.previewUrl ?? "", location.href);
    if (["http:", "https:"].includes(candidate.protocol) && candidate.origin !== location.origin) {
      if (localizedUrl.current?.source !== candidate.href) localizedUrl.current = { source: candidate.href, value: withGameLocale(candidate.href, locale) };
      url = localizedUrl.current.value;
    }
  } catch { /* Never embed untrusted or same-origin content with script privileges. */ }
  useEffect(() => { postGameLocale(frameRef.current, locale); }, [locale, url]);
  return <>
    <SiteHeader active="studio" />
    <main className="private-game-preview" id="main-content" tabIndex={-1}>
      <header><div><h1>{project.title}</h1><p>{t("preview.detail")}</p></div><a href={`/projects/${encodeURIComponent(project.id)}`}>{t("preview.back")}</a></header>
      {!current ? <p role="status">{t("preview.loading")}</p> : current.error ? <p role="alert">{current.error}</p> : url ? <iframe ref={frameRef} onLoad={() => postGameLocale(frameRef.current, locale)} title={t("preview.frameTitle", { title: project.title })} src={url} sandbox="allow-scripts allow-same-origin allow-top-navigation-by-user-activation" allow="autoplay; fullscreen" /> : <p role="status">{t("preview.unavailable")}</p>}
    </main>
  </>;
}
