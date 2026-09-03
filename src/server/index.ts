import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getTemplateCatalog, projectInputSchema } from "../shared/contracts.js";
import { AccessControl } from "./access-control.js";
import { openDatabase } from "./database.js";
import { BuildOrchestrator } from "./build-orchestrator.js";
import { DesignContractGenerator } from "./design-contract.js";
import { readJson, sendError, sendJson } from "./http.js";
import { IdeaAnalyzer } from "./idea-analyzer.js";
import { GameCodeGenerator } from "./game-generator.js";
import { CoverArtGenerator } from "./image-generator.js";
import { OpenAISettings } from "./openai-settings.js";
import { ProjectLifecycle } from "./project-lifecycle.js";
import { importLegacySqliteIfEmpty } from "./sqlite-migration.js";
import { sendStaticFile, workbenchContentSecurityPolicy } from "./static-files.js";
import { StudioRepository } from "./studio-repository.js";

const port = Number.parseInt(process.env.PORT ?? "4312", 10);
const gamePort = Number.parseInt(process.env.GAME_PORT ?? "4313", 10);
const host = process.env.HOST ?? "127.0.0.1";
const publicOrigin = process.env.PUBLIC_ORIGIN ?? `http://${host}:${port}`;
// 游戏产物在独立端口/子域提供,iframe 试玩因此获得真实跨源隔离;
// 生产环境用 PUBLIC_GAME_ORIGIN 指向游戏子域。
const publicGameOrigin = process.env.PUBLIC_GAME_ORIGIN ?? `http://${host}:${gamePort}`;
const projectRoot = process.cwd();
const connectionString = process.env.DATABASE_URL ?? "postgresql://studio@127.0.0.1:54329/ai_game_studio";
const legacySqlitePath = process.env.LEGACY_SQLITE_PATH ?? process.env.DATABASE_PATH ?? join(projectRoot, "data", "studio.db");
const database = await openDatabase(connectionString);
const importedProjectCount = await importLegacySqliteIfEmpty(database, legacySqlitePath);
const repository = new StudioRepository(database, publicOrigin, publicGameOrigin);
const artifactRoot = join(projectRoot, "data", "artifacts");
const openAIKeyFile = process.env.OPENAI_API_KEY_FILE ?? join(projectRoot, "data", "secrets", "openai-api-key.txt");
const openAISettings = new OpenAISettings(process.env.OPENAI_API_KEY, openAIKeyFile);
// Node 的全局 fetch 默认不走 HTTP(S)_PROXY;在设置了代理但未开启 NODE_USE_ENV_PROXY 的环境里,
// OpenAI 调用会以 fetch failed 静默回退,这里提前把问题喊出来。
if ((process.env.HTTPS_PROXY || process.env.HTTP_PROXY) && process.env.NODE_USE_ENV_PROXY !== "1") {
  console.warn("检测到系统代理，但未设置 NODE_USE_ENV_PROXY=1：Node fetch 不会走代理，OpenAI 调用可能全部失败并回退。请用 NODE_USE_ENV_PROXY=1 启动服务。");
}
const ideaAnalyzer = new IdeaAnalyzer(openAISettings);
const designContracts = new DesignContractGenerator(openAISettings);
const coverArt = new CoverArtGenerator(openAISettings);
const codeGenerator = new GameCodeGenerator(openAISettings);
const orchestrator = new BuildOrchestrator(repository, artifactRoot, {
  designContracts,
  coverArt,
  codeGenerator,
  maxConcurrentBuilds: Number.parseInt(process.env.BUILD_CONCURRENCY ?? "2", 10) || 2,
});
const accessControl = new AccessControl(process.env.STUDIO_ACCESS_TOKEN?.trim() || null);
const projectLifecycle = new ProjectLifecycle(repository, artifactRoot);
const templateArtIds = new Set(["signal-hunt", "tetris", "puzzle", "breakout", "klotski", "maze", "snake", "merge-2048", "space-shooter", "polyomino-fit", "block-place", "region-logic", "mahjong-roguelite"]);
await repository.failInterruptedBuilds();
await repository.reconcilePublishedStatuses();
await repository.initializeCatalogScopes();
const officialFixtureIds = await repository.ensureOfficialFixtures();
const goldenProjectId = officialFixtureIds["star-dream-duel"] ?? null;

function projectIdFrom(pathname: string) {
  return pathname.match(/^\/api\/projects\/([^/]+)$/)?.[1] ?? null;
}

function publicationProjectIdFrom(pathname: string) {
  return pathname.match(/^\/api\/projects\/([^/]+)\/publish$/)?.[1] ?? null;
}

function publicationVersionFrom(pathname: string) {
  const match = pathname.match(/^\/api\/projects\/([^/]+)\/publish\/([^/]+)$/);
  return match?.[1] && match[2] ? { projectId: match[1], versionId: match[2] } : null;
}

function versionsProjectIdFrom(pathname: string) {
  return pathname.match(/^\/api\/projects\/([^/]+)\/versions$/)?.[1] ?? null;
}

function versionArtReviewFrom(pathname: string) {
  const match = pathname.match(/^\/api\/projects\/([^/]+)\/versions\/([^/]+)\/art-review$/);
  return match?.[1] && match[2] ? { projectId: match[1], versionId: match[2] } : null;
}

function buildProjectIdFrom(pathname: string) {
  return pathname.match(/^\/api\/projects\/([^/]+)\/build$/)?.[1] ?? null;
}

function messagesProjectIdFrom(pathname: string) {
  return pathname.match(/^\/api\/projects\/([^/]+)\/messages$/)?.[1] ?? null;
}

function projectActionIdFrom(pathname: string, action: "archive" | "restore") {
  return pathname.match(new RegExp(`^/api/projects/([^/]+)/${action}$`))?.[1] ?? null;
}

async function handleApi(request: IncomingMessage, response: ServerResponse, pathname: string) {
  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, {
      status: "ok",
      database: "ready",
      databaseProvider: database.provider,
      importedProjectCount,
      goldenProjectId,
      officialFixtureIds,
    });
    return true;
  }
  if (request.method === "GET" && pathname === "/api/projects") {
    sendJson(response, 200, { projects: await repository.list() });
    return true;
  }
  if (request.method === "GET" && pathname === "/api/projects/archived") {
    sendJson(response, 200, { projects: await repository.list({ archived: true }) });
    return true;
  }
  if (pathname === "/api/settings/openai") {
    if (request.method === "GET") {
      sendJson(response, 200, openAISettings.status());
      return true;
    }
    if (request.method === "PUT") {
      sendJson(response, 200, openAISettings.set(await readJson(request)));
      return true;
    }
    if (request.method === "DELETE") {
      sendJson(response, 200, openAISettings.clearSessionKey());
      return true;
    }
  }
  if (request.method === "GET" && pathname === "/api/games") {
    sendJson(response, 200, { games: await repository.publishedGames() });
    return true;
  }
  if (request.method === "POST" && pathname === "/api/play-events") {
    sendJson(response, 202, await repository.recordPlayEvent(await readJson(request)));
    return true;
  }
  const activityPlayerId = pathname.match(/^\/api\/play-activity\/(player-[0-9a-f-]{36})$/i)?.[1];
  if (request.method === "GET" && activityPlayerId) {
    sendJson(response, 200, { activities: await repository.playActivities(activityPlayerId) });
    return true;
  }
  if (request.method === "POST" && pathname === "/api/projects") {
    const rawInput = projectInputSchema.parse(await readJson(request));
    const analysis = await ideaAnalyzer.analyze(rawInput);
    // 实验通道:LLM 判定没有模板能承载该玩法时,不再拒绝(422),改为走无模板代码生成;
    // 2D 生成单文件 HTML,3D 生成基于本地 three.js 模块的场景。
    // 没有密钥(走关键词识别)时不存在该判定,维持原有模板路径。
    const experimental = analysis.source === "llm" && analysis.template === null;
    const experimentalDimensions = analysis.dimensions === "3d" ? "3d" as const : "2d" as const;
    const input = experimental ? { ...rawInput, template: "generated" as const, dimensions: experimentalDimensions } : rawInput;
    const designProfile = await designContracts.generate(input, analysis);
    if (experimental && !designProfile) {
      const supported = [...new Set(getTemplateCatalog().map((entry) => entry.genre))].join("、");
      sendJson(response, 422, {
        error: `暂时无法生成这种玩法：${analysis.summary ?? "没有模板能承载它"}，且实验性设计生成未成功，请稍后重试。当前成熟支持的玩法类型：${supported}。`,
      });
      return true;
    }
    sendJson(response, 201, { project: await repository.create(input, analysis, designProfile) });
    return true;
  }

  const archiveProjectId = projectActionIdFrom(pathname, "archive");
  if (request.method === "POST" && archiveProjectId) {
    sendJson(response, 200, { project: await projectLifecycle.archive(decodeURIComponent(archiveProjectId)) });
    return true;
  }
  const restoreProjectId = projectActionIdFrom(pathname, "restore");
  if (request.method === "POST" && restoreProjectId) {
    sendJson(response, 200, { project: await projectLifecycle.restore(decodeURIComponent(restoreProjectId)) });
    return true;
  }

  const buildProjectId = buildProjectIdFrom(pathname);
  if (request.method === "GET" && buildProjectId) {
    sendJson(response, 200, { build: await repository.latestBuild(decodeURIComponent(buildProjectId)) });
    return true;
  }
  if (request.method === "POST" && buildProjectId) {
    sendJson(response, 202, { build: await orchestrator.start(decodeURIComponent(buildProjectId)) });
    return true;
  }

  const messagesProjectId = messagesProjectIdFrom(pathname);
  if (request.method === "GET" && messagesProjectId) {
    sendJson(response, 200, { messages: await repository.listMessages(decodeURIComponent(messagesProjectId)) });
    return true;
  }
  if (request.method === "POST" && messagesProjectId) {
    sendJson(response, 201, { messages: await repository.addMessage(decodeURIComponent(messagesProjectId), await readJson(request)) });
    return true;
  }

  const projectId = projectIdFrom(pathname);
  if (request.method === "GET" && projectId) {
    const project = await repository.get(decodeURIComponent(projectId));
    if (!project) throw new Error("项目不存在。");
    sendJson(response, 200, { project });
    return true;
  }
  if (request.method === "DELETE" && projectId) {
    sendJson(response, 200, await projectLifecycle.deleteArchived(decodeURIComponent(projectId)));
    return true;
  }

  const versionsProjectId = versionsProjectIdFrom(pathname);
  if (request.method === "GET" && versionsProjectId) {
    sendJson(response, 200, { versions: await repository.listVersions(decodeURIComponent(versionsProjectId)) });
    return true;
  }

  const versionArtReview = versionArtReviewFrom(pathname);
  if (request.method === "POST" && versionArtReview) {
    sendJson(response, 200, { versions: await repository.reviewVersionArt(
      decodeURIComponent(versionArtReview.projectId),
      decodeURIComponent(versionArtReview.versionId),
      await readJson(request),
    ) });
    return true;
  }

  const publicationVersion = publicationVersionFrom(pathname);
  if (request.method === "POST" && publicationVersion) {
    sendJson(response, 200, { project: await repository.publish(
      decodeURIComponent(publicationVersion.projectId),
      decodeURIComponent(publicationVersion.versionId),
    ) });
    return true;
  }

  const publicationProjectId = publicationProjectIdFrom(pathname);
  if (request.method === "POST" && publicationProjectId) {
    sendJson(response, 200, { project: await repository.publish(decodeURIComponent(publicationProjectId)) });
    return true;
  }
  return false;
}

async function gameRequest(pathname: string) {
  const stable = pathname.match(/^\/play\/([^/]+)(\/.*)?$/);
  if (stable?.[1]) {
    const game = await repository.resolveGameBySlug(decodeURIComponent(stable[1]));
    if (!game) return null;
    const versionArtifact = join(artifactRoot, game.version_id);
    const root = game.fixture_kind && !existsSync(versionArtifact) ? join(projectRoot, "fixtures", game.fixture_kind) : versionArtifact;
    return { root, relativePath: stable[2], immutable: false };
  }
  const version = pathname.match(/^\/version\/([^/]+)(\/.*)?$/);
  if (version?.[1]) {
    const game = await repository.resolveGameByVersion(decodeURIComponent(version[1]));
    if (!game) return null;
    const versionArtifact = join(artifactRoot, game.version_id);
    const root = game.fixture_kind && !existsSync(versionArtifact) ? join(projectRoot, "fixtures", game.fixture_kind) : versionArtifact;
    return { root, relativePath: version[2], immutable: true };
  }
  return null;
}

async function handleGame(response: ServerResponse, pathname: string) {
  const request = await gameRequest(pathname);
  if (!request) return false;
  if (!request.relativePath) {
    response.writeHead(308, { Location: `${pathname}/` });
    response.end();
    return true;
  }
  const relativePath = request.relativePath === "/" ? "index.html" : request.relativePath.slice(1);
  // 游戏与工作台跨源后,工作台预览 iframe 需要被 frame-ancestors 显式放行;
  // 本机开发时 vite 工作台跑在 4311,一并放行。
  const ancestors = [`'self'`, originWithoutSlash(publicOrigin)];
  if (publicOrigin.includes("127.0.0.1") || publicOrigin.includes("localhost")) ancestors.push("http://127.0.0.1:4311", "http://localhost:4311");
  return sendStaticFile(response, request.root, relativePath, request.immutable, {
    frameAncestors: ancestors.join(" "),
  });
}

function originWithoutSlash(origin: string) {
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}

function handleTemplateArt(response: ServerResponse, pathname: string) {
  const match = pathname.match(/^\/media\/template-art\/([^/]+)\/(cover|gameplay-atlas)\.png$/);
  if (!match?.[1] || !match[2]) return false;
  const template = decodeURIComponent(match[1]);
  if (!templateArtIds.has(template)) return false;
  const artRoot = template === "signal-hunt"
    ? join(projectRoot, "assets", "starter", "signal-studio")
    : join(projectRoot, "assets", "templates", "packs", template);
  return sendStaticFile(response, artRoot, `${match[2]}.png`, true);
}

function handleWorkbench(response: ServerResponse, pathname: string) {
  const webRoot = join(projectRoot, "dist-web");
  if (!existsSync(webRoot)) return false;
  const requestedPath = pathname === "/" ? "index.html" : pathname.slice(1);
  const csp = workbenchContentSecurityPolicy(originWithoutSlash(publicGameOrigin));
  if (sendStaticFile(response, webRoot, requestedPath, false, { csp })) return true;
  return sendStaticFile(response, webRoot, "index.html", false, { csp });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", publicOrigin);
  try {
    if (url.pathname.startsWith("/api/")) {
      const decision = accessControl.check(request, url.pathname);
      if (!decision.allowed) {
        sendJson(response, decision.status, { error: decision.error });
        return;
      }
      const handled = await handleApi(request, response, url.pathname);
      if (!handled) sendJson(response, 404, { error: "接口不存在。" });
      return;
    }
    if (request.method === "GET" && (url.pathname.startsWith("/play/") || url.pathname.startsWith("/version/"))) {
      if (await handleGame(response, url.pathname)) return;
      sendJson(response, 404, { error: "游戏版本不存在。" });
      return;
    }
    if (request.method === "GET" && handleTemplateArt(response, url.pathname)) return;
    if (request.method === "GET" && handleWorkbench(response, url.pathname)) return;
    sendJson(response, 404, { error: "页面不存在。" });
  } catch (error) {
    sendError(response, error);
  }
});

// 游戏端口只承载游戏产物、模板美术与玩家遥测——不暴露工作台 API 与页面,
// 让 iframe 中运行的生成代码与工作台真正跨源隔离。
const gameServer = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", publicGameOrigin);
  try {
    if (url.pathname === "/api/play-events" && request.method === "POST") {
      const decision = accessControl.check(request, url.pathname);
      if (!decision.allowed) {
        sendJson(response, decision.status, { error: decision.error });
        return;
      }
      sendJson(response, 202, await repository.recordPlayEvent(await readJson(request)));
      return;
    }
    if (request.method === "GET" && (url.pathname.startsWith("/play/") || url.pathname.startsWith("/version/"))) {
      if (await handleGame(response, url.pathname)) return;
      sendJson(response, 404, { error: "游戏版本不存在。" });
      return;
    }
    if (request.method === "GET" && handleTemplateArt(response, url.pathname)) return;
    sendJson(response, 404, { error: "页面不存在。" });
  } catch (error) {
    sendError(response, error);
  }
});

server.listen(port, host, () => {
  console.log(`AI Game Studio: ${publicOrigin} · PostgreSQL ready`);
  if (importedProjectCount > 0) console.log(`已从 SQLite 只读导入 ${importedProjectCount} 个项目。`);
});

gameServer.listen(gamePort, host, () => {
  console.log(`游戏交付源（跨源隔离）: ${publicGameOrigin}`);
});

function closeServer() {
  gameServer.close();
  server.close(() => void database.close());
}

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
