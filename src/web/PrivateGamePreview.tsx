import { useEffect, useState } from "react";
import type { Build, ProjectDetail } from "../shared/contracts";
import { getPlayableBuild } from "./api";
import { SiteHeader } from "./SiteHeader";

/** Private playback is a read-only operation, independent of publication. */
export function PrivateGamePreview({ project }: { project: ProjectDetail }) {
  const [result, setResult] = useState<{ projectId: string; build: Build | null; error?: string } | null>(null);
  useEffect(() => {
    let active = true;
    getPlayableBuild(project.id).then(build => {
      if (active) setResult({ projectId: project.id, build });
    }).catch(() => {
      if (active) setResult({ projectId: project.id, build: null, error: "暂时无法读取可玩版本。你的游戏不会被重新制作，请稍后刷新。" });
    });
    return () => { active = false; };
  }, [project.id]);
  const current = result?.projectId === project.id ? result : null;
  let url: string | null = null;
  try {
    const candidate = new URL(current?.build?.previewUrl ?? "", location.href);
    if (["http:", "https:"].includes(candidate.protocol) && candidate.origin !== location.origin) url = candidate.href;
  } catch { /* Never embed untrusted or same-origin content with script privileges. */ }
  return <>
    <SiteHeader active="studio" />
    <main className="private-game-preview" id="main-content" tabIndex={-1}>
      <header><div><h1>{project.title}</h1><p>自己的游戏，随时试玩。不需要先公开发布。</p></div><a href={`/projects/${encodeURIComponent(project.id)}`}>返回作品空间</a></header>
      {!current ? <p role="status">正在打开最近成功的版本…</p> : current.error ? <p role="alert">{current.error}</p> : url ? <iframe title={`${project.title}试玩`} src={url} sandbox="allow-scripts allow-same-origin allow-top-navigation-by-user-activation" allow="autoplay; fullscreen" /> : <p role="status">还没有通过检查的可玩版本。返回作品空间查看制作进度。</p>}
    </main>
  </>;
}
