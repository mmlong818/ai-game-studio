import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  ChevronRight,
  Gamepad2,
  LoaderCircle,
  Play,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import type { ProjectDetail, ProjectSummary } from "../shared/contracts";
import {
  archiveProject,
  deleteArchivedProject,
  getArchivedProjects,
  getProject,
  getProjects,
  restoreProject,
} from "./api";
import { GameLibrary } from "./GameLibrary";
import { ProjectStudio } from "./ProjectStudio";
import { SiteHeader } from "./SiteHeader";
import { AdvancedStudioApp } from "../App";
import { usePreferences, type ResolvedLocale } from "./preferences";
import { DesignKnowledgeConsole } from "./DesignKnowledgeConsole";

function projectIdFromLocation() {
  return new URLSearchParams(window.location.search).get("project");
}

function projectIdFromPath() {
  const match = window.location.pathname.match(/^\/projects\/([^/]+)\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function projectPath(projectId: string) {
  return `/projects/${encodeURIComponent(projectId)}`;
}

function formatDate(value: string, locale: ResolvedLocale) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}


type ProjectListProps = {
  projects: ProjectSummary[];
  archived: boolean;
  busyId: string | null;
  onArchive: (project: ProjectSummary) => void;
  onRestore: (project: ProjectSummary) => void;
  onDelete: (project: ProjectSummary) => void;
};

function ProjectList({ projects, archived, busyId, onArchive, onRestore, onDelete }: ProjectListProps) {
  const { locale, t } = usePreferences();
  if (!projects.length) {
    return <div className="projects-empty"><Gamepad2 size={28} aria-hidden="true" /><strong>{archived ? t("projects.archiveEmpty") : t("projects.none")}</strong><p>{archived ? t("projects.archiveEmptyDetail") : t("projects.noneDetail")}</p></div>;
  }
  return (
    <div className="project-card-grid">
      {projects.map((project) => {
        const cover = project.coverUrl ?? `/media/template-art/${project.template}/cover.png`;
        return (
          <article className={`project-card ${archived ? "is-archived" : ""}`} key={project.id}>
            <a className="project-card-link" href={projectPath(project.id)}>
              <div className="project-cover">
                <img src={cover} alt={t("projects.coverAlt", { title: project.title })} width="640" height="360" loading="lazy" />
                <span className={`status-pill status-${project.status}`}>{archived ? t("projects.archived") : project.status === "published" ? t("projects.published") : project.status === "playable" ? t("projects.playable") : t("projects.contractReady")}</span>
              </div>
              <div className="project-card-body">
                <div><h3>{project.title}</h3><span>{project.dimensions.toUpperCase()} · v{project.version.number}</span></div>
                <p>{project.idea}</p>
                <footer><time>{formatDate(project.archivedAt ?? project.createdAt, locale)}</time><span>{archived ? t("projects.view") : t("projects.continue")} <ChevronRight size={15} aria-hidden="true" /></span></footer>
              </div>
            </a>
            <div className="project-card-actions">
              {archived ? (
                <>
                  <button type="button" onClick={() => onRestore(project)} disabled={busyId === project.id}><ArchiveRestore size={15} aria-hidden="true" />{t("projects.restore")}</button>
                  <button className="project-delete-button" type="button" onClick={() => onDelete(project)} disabled={busyId === project.id}><Trash2 size={15} aria-hidden="true" />{t("projects.delete")}</button>
                </>
              ) : (
                <>
                  {project.publication?.status === "live" ? (
                    <a className="project-play-link" href={`/player-first?game=${encodeURIComponent(project.id)}`}><Play size={15} aria-hidden="true" />{t("projects.play")}</a>
                  ) : (
                    <span className="project-play-link is-disabled" title={t("projects.playNeedsPublish")} aria-disabled="true"><Play size={15} aria-hidden="true" />{t("projects.play")}</span>
                  )}
                  <a className="project-edit-link" href={projectPath(project.id)}><SquarePen size={15} aria-hidden="true" />{t("projects.edit")}</a>
                  <button type="button" onClick={() => onArchive(project)} disabled={busyId === project.id}><Archive size={15} aria-hidden="true" />{t("projects.archive")}</button>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function DeleteProjectDialog({ project, busy, error, onCancel, onConfirm }: {
  project: ProjectSummary | null;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = usePreferences();
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (project && !dialog.open) dialog.showModal();
    if (!project && dialog.open) dialog.close();
  }, [project]);

  return (
    <dialog className="delete-project-dialog" ref={dialogRef} onCancel={(event) => { if (busy) event.preventDefault(); }} onClose={() => { if (!busy) onCancel(); }} aria-labelledby="delete-project-title">
      <header><span><AlertTriangle size={20} aria-hidden="true" /></span><button type="button" onClick={onCancel} disabled={busy} aria-label={t("projects.deleteCancel")}><X size={19} aria-hidden="true" /></button></header>
      <h2 id="delete-project-title">{t("projects.deleteTitle")}</h2>
      <p>{t("projects.deleteDetail", { title: project?.title ?? "" })}</p>
      <div className="delete-project-scope"><strong>{t("projects.deleteScopeTitle")}</strong><span>{t("projects.deleteScope")}</span></div>
      {error ? <p className="delete-project-error" role="alert">{error}</p> : null}
      <footer>
        <button type="button" onClick={onCancel} disabled={busy}>{t("projects.deleteCancel")}</button>
        <button className="confirm-delete-button" type="button" onClick={onConfirm} disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}{t("projects.deleteConfirm")}</button>
      </footer>
    </dialog>
  );
}

function ProjectSkeleton() {
  const { t } = usePreferences();
  return (
    <div className="project-skeleton-grid" role="status" aria-label={t("projects.loading")}>
      {Array.from({ length: 4 }, (_, index) => <span aria-hidden="true" key={index} />)}
    </div>
  );
}

function StudioHome() {
  const { t } = usePreferences();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(() => window.location.hash === "#archive");

  useEffect(() => {
    let active = true;
    Promise.all([getProjects(), getArchivedProjects()])
      .then(([projectList, archivedList]) => { if (active) { setProjects(projectList); setArchivedProjects(archivedList); } })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "项目加载失败。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const updateView = () => setShowArchived(window.location.hash === "#archive");
    window.addEventListener("hashchange", updateView);
    return () => window.removeEventListener("hashchange", updateView);
  }, []);

  async function handleArchive(project: ProjectSummary) {
    setBusyId(project.id);
    setError(null);
    try {
      const archived = await archiveProject(project.id);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setArchivedProjects((current) => [archived, ...current.filter((item) => item.id !== project.id)]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("projects.archiveFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(project: ProjectSummary) {
    setBusyId(project.id);
    setError(null);
    try {
      const restored = await restoreProject(project.id);
      setArchivedProjects((current) => current.filter((item) => item.id !== project.id));
      setProjects((current) => [restored, ...current.filter((item) => item.id !== project.id)]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("projects.restoreFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setDeleteError(null);
    try {
      await deleteArchivedProject(deleteTarget.id);
      setArchivedProjects((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : t("projects.deleteFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="app-shell studio-home-shell">
      <SiteHeader active="studio" />
      <main className="studio-home-main" id="main-content" tabIndex={-1}>
        <section className="projects-section" id="projects">
          <header className="projects-heading">
            <div><p className="eyebrow">{t("projects.count", { count: projects.length })}</p><h2>{t("nav.projects")}</h2></div>
            <a href="/">{t("projects.viewDelivered")} <ArrowRight size={16} aria-hidden="true" /></a>
          </header>
          <nav className="project-view-tabs" aria-label={t("projects.views")}>
            <a href="#projects" aria-current={!showArchived ? "page" : undefined}><span>{t("projects.active")}</span><strong>{projects.length}</strong></a>
            <a href="#archive" aria-current={showArchived ? "page" : undefined}><Archive size={15} aria-hidden="true" /><span>{t("projects.archiveBox")}</span><strong>{archivedProjects.length}</strong></a>
          </nav>
          {error ? <div className="global-error" role="alert">{error}</div> : null}
          {loading ? <ProjectSkeleton /> : <ProjectList projects={showArchived ? archivedProjects : projects} archived={showArchived} busyId={busyId} onArchive={handleArchive} onRestore={handleRestore} onDelete={(project) => { setDeleteError(null); setDeleteTarget(project); }} />}
        </section>
      </main>
      <DeleteProjectDialog project={deleteTarget} busy={Boolean(deleteTarget && busyId === deleteTarget.id)} error={deleteError} onCancel={() => { if (!busyId) setDeleteTarget(null); }} onConfirm={confirmDelete} />
      <footer className="studio-home-footer">
        <span>{t("footer.studio")}</span>
        <span>{t("footer.proof")}</span>
        <small>{t("footer.maintenance")}</small>
      </footer>
    </div>
  );
}

function ProjectPage({ projectId, legacyUrl = false }: { projectId: string; legacyUrl?: boolean }) {
  const { t } = usePreferences();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (legacyUrl) window.history.replaceState({}, "", projectPath(projectId));
    getProject(projectId)
      .then((result) => {
        if (!active) return;
        setProject(result);
        document.title = `${result.title} · 制作台`;
      })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "项目详情加载失败。"); });
    return () => { active = false; document.title = "造界 · AI 游戏工坊"; };
  }, [legacyUrl, projectId]);

  return (
    <div className="app-shell studio-route-shell">
      {project ? <ProjectStudio project={project} onProjectChange={setProject} /> : (
        <main className="project-page-state">
          {error ? <div className="global-error" role="alert">{error}</div> : <div className="loading-state" role="status"><LoaderCircle className="spin" size={20} /> {t("studio.loadingPage")}</div>}
          <a className="secondary-button" href="/projects#projects">{t("studio.backProjects")}</a>
        </main>
      )}
    </div>
  );
}

function NotFoundPage() {
  const { t } = usePreferences();
  return (
    <div className="app-shell studio-home-shell">
      <SiteHeader active="studio" />
      <main className="not-found-page" id="main-content" tabIndex={-1}>
        <p className="eyebrow">404 · ROUTE NOT FOUND</p>
        <h1>{t("notFound.title")}</h1>
        <p>{t("notFound.detail")}</p>
        <div><a className="primary-action-link" href="/projects">{t("notFound.back")}</a><a className="text-action-link" href="/">{t("notFound.games")} <ArrowRight size={16} aria-hidden="true" /></a></div>
      </main>
    </div>
  );
}

function CreatePage() {
  useEffect(() => {
    document.title = "游戏创作 · 造界";
    return () => {
      document.title = "造界 · AI 游戏工坊";
    };
  }, []);
  return (
    <div className="app-shell">
      <SiteHeader active="create" />
      <AdvancedStudioApp />
    </div>
  );
}

export function App() {
  const pathProjectId = projectIdFromPath();
  if (pathProjectId) return <ProjectPage projectId={pathProjectId} />;
  const legacyProjectId = projectIdFromLocation();
  if (legacyProjectId) return <ProjectPage projectId={legacyProjectId} legacyUrl />;
  if (["/", "", "/games"].includes(window.location.pathname)) return <GameLibrary />;
  if (window.location.pathname === "/projects") return <StudioHome />;
  if (window.location.pathname === "/create") return <CreatePage />;
  if (window.location.pathname === "/design-knowledge") return <DesignKnowledgeConsole />;
  return <NotFoundPage />;
}
