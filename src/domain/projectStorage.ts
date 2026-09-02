import { migrateLegacySpec, validateGameSpec } from "./gameSpec";
import type { StudioProject } from "./platformTypes";

const PROJECT_KEY = "ai-game-studio:projects:v2";

type ProjectIndex = Record<string, StudioProject>;

const readIndex = (): ProjectIndex => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROJECT_KEY);
    return raw ? (JSON.parse(raw) as ProjectIndex) : {};
  } catch {
    return {};
  }
};

export function saveProject(project: StudioProject): void {
  if (typeof window === "undefined") return;
  const index = readIndex();
  window.localStorage.setItem(PROJECT_KEY, JSON.stringify({ ...index, [project.id]: project }));
}

export function loadProject(projectId: string): StudioProject | null {
  const stored = readIndex()[projectId];
  if (!stored) return null;
  try {
    const spec = migrateLegacySpec(stored.spec as unknown as Record<string, unknown>);
    if (validateGameSpec(spec).length > 0) return null;
    return {
      ...stored,
      spec,
      id: spec.projectId,
      changeSets: (stored.changeSets ?? []).map((change) => ({
        ...change,
        beforeScreenshotEvidenceIds: change.beforeScreenshotEvidenceIds ?? [],
        afterScreenshotEvidenceIds: change.afterScreenshotEvidenceIds ?? [],
      })),
    };
  } catch {
    return null;
  }
}

export function listProjects(): Array<Pick<StudioProject, "id" | "name" | "activeBuildId">> {
  return Object.values(readIndex()).map(({ id, name, activeBuildId }) => ({ id, name, activeBuildId }));
}
