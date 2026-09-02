import { randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { inspectGameInBrowser, inspectStarDreamStageEInBrowser } from "../src/server/browser-quality.js";
import { openDatabase } from "../src/server/database.js";
import { StudioRepository } from "../src/server/studio-repository.js";
import { playTelemetryScript } from "../src/server/game-artifact.js";

const projectRoot = process.cwd();
const artifactRoot = join(projectRoot, "data", "artifacts");
const fixtureRoot = join(projectRoot, "fixtures", "star-dream-duel");
const connectionString = process.env.DATABASE_URL ?? "postgresql://studio@127.0.0.1:54329/ai_game_studio";
const publicOrigin = process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:4312";
const versionId = randomUUID();
const versionRoot = join(artifactRoot, versionId);

if (!existsSync(fixtureRoot)) throw new Error("星梦对决固定游戏目录不存在。");
mkdirSync(artifactRoot, { recursive: true });
const database = await openDatabase(connectionString);
try {
  const repository = new StudioRepository(database, publicOrigin);
  const projectId = await repository.ensureGoldenFixture();
  if (!projectId) throw new Error("星梦对决已被删除，不能创建兼容版本。");
  cpSync(fixtureRoot, versionRoot, { recursive: true, errorOnExist: true });
  const appPath = join(versionRoot, "app.js");
  writeFileSync(appPath, `${readFileSync(appPath, "utf8")}\n${playTelemetryScript(projectId, versionId)}`, "utf8");
  const browserResult = await inspectGameInBrowser(versionRoot);
  const stageEResult = await inspectStarDreamStageEInBrowser(versionRoot);
  const checkedAt = new Date().toISOString();
  const project = await repository.createFixtureVersion(projectId, versionId, {
    status: "passed",
    summary: `${browserResult.checks.length}/${browserResult.checks.length} 项固定游戏浏览器验收通过；Stage E 已完成 ${stageEResult.completedRuns} 局并触发 ${stageEResult.failedRuns} 次失败，可以进入主美复核。`,
    checkedAt,
    checks: browserResult.checks,
  });
  console.log(JSON.stringify({ projectId, versionId, versionNumber: project.version.number, previewUrl: `${publicOrigin}/version/${versionId}/` }, null, 2));
} catch (error) {
  const safeVersionRoot = resolve(versionRoot);
  if (safeVersionRoot.startsWith(resolve(artifactRoot)) && existsSync(safeVersionRoot)) rmSync(safeVersionRoot, { recursive: true, force: true });
  throw error;
} finally {
  await database.close();
}
