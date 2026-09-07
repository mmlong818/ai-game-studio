import { randomUUID } from "node:crypto";
import { cp, mkdir, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { StudioRepository } from "./studio-repository.js";

type MovedArtifact = { source: string; trash: string };

function safeArtifactPath(artifactRoot: string, buildId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(buildId)) throw new Error("构建产物标识不安全，已停止删除。");
  const root = resolve(artifactRoot);
  const target = resolve(root, buildId);
  if (dirname(target) !== root) throw new Error("构建产物路径超出项目目录，已停止删除。");
  return target;
}

async function moveIfPresent(source: string, trash: string) {
  try {
    await rename(source, trash);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
    await cp(source, trash, { recursive: true, force: false, errorOnExist: true });
    try {
      await rm(source, { recursive: true, force: true, maxRetries: 4, retryDelay: 120 });
      return true;
    } catch (removeError) {
      await rm(trash, { recursive: true, force: true, maxRetries: 4, retryDelay: 120 });
      throw removeError;
    }
  }
}

async function restoreArtifact(artifact: MovedArtifact) {
  try {
    await rename(artifact.trash, artifact.source);
  } catch {
    await cp(artifact.trash, artifact.source, { recursive: true, force: false, errorOnExist: true });
    await rm(artifact.trash, { recursive: true, force: true, maxRetries: 4, retryDelay: 120 });
  }
}

export class ProjectLifecycle {
  constructor(private readonly repository: StudioRepository, private readonly artifactRoot: string) {}

  archive(projectId: string) {
    return this.repository.archive(projectId);
  }

  restore(projectId: string) {
    return this.repository.restore(projectId);
  }

  async deleteArchived(projectId: string) {
    const plan = await this.repository.archivedDeletionPlan(projectId);
    const trashRoot = resolve(this.artifactRoot, ".trash");
    await mkdir(trashRoot, { recursive: true });
    const deletionId = randomUUID();
    const moved: MovedArtifact[] = [];

    try {
      for (const buildId of plan.buildIds) {
        const source = safeArtifactPath(this.artifactRoot, buildId);
        const trash = resolve(trashRoot, `${deletionId}-${buildId}`);
        if (await moveIfPresent(source, trash)) moved.push({ source, trash });
      }
      const checkpointSource = safeArtifactPath(resolve(this.artifactRoot, "_image-checkpoints"), projectId);
      const checkpointTrash = resolve(trashRoot, `${deletionId}-images-${projectId}`);
      if (await moveIfPresent(checkpointSource, checkpointTrash)) moved.push({ source: checkpointSource, trash: checkpointTrash });
      await this.repository.deleteArchived(projectId);
    } catch (error) {
      for (const artifact of moved.reverse()) await restoreArtifact(artifact).catch(() => undefined);
      throw error;
    }

    for (const artifact of moved) await rm(artifact.trash, { recursive: true, force: true, maxRetries: 4, retryDelay: 120 });
    return { deleted: true, artifactsDeleted: moved.length };
  }
}
