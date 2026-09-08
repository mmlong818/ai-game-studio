import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { generateGameSpec, projectInputSchema, projectRevisionInputSchema } from "../shared/contracts.js";
import { PLATFORM_VERSION_INFO } from "../shared/platform-version.js";
import { OFFICIAL_GAMES, OFFICIAL_SERVER_TEMPLATE_IDS } from "../shared/official-games/index.js";
import { createDesignKnowledgeShadow } from "../shared/game-design-knowledge/shadow.js";
import { MECHANIC_ATLAS_SUMMARY, searchMechanicAtlas } from "../shared/game-design-knowledge/mechanic-atlas.js";
import { LOCAL_DESIGN_SOURCE_SUMMARY } from "../shared/game-design-knowledge/local-design-sources.js";
import { createResourcePlanningForGameSpec } from "../shared/resource-planning/index.js";
import { AccessControl } from "./access-control.js";
import { openDatabase } from "./database.js";
import { acquireRuntimeOwnership } from "./runtime-ownership.js";
import { BuildOrchestrator, DEFAULT_REPAIR_ROUNDS } from "./build-orchestrator.js";
import { ProductionJobs } from "./production-jobs.js";
import { resolveCreationDesign } from "./creation-design.js";
import { DesignContractGenerator } from "./design-contract.js";
import { readJson, sendError, sendJson } from "./http.js";
import { IdeaAnalyzer } from "./idea-analyzer.js";
import { GameCodeGenerator } from "./game-generator.js";
import { CoverArtGenerator } from "./image-generator.js";
import { OpenAISettings } from "./openai-settings.js";
import { createClaudeCliFetch, DEFAULT_CLAUDE_CLI_MODEL } from "./claude-cli-text-provider.js";
import { ProjectLifecycle } from "./project-lifecycle.js";
import { importLegacySqliteIfEmpty } from "./sqlite-migration.js";
import { sendStaticFile, workbenchContentSecurityPolicy } from "./static-files.js";
import { StudioRepository } from "./studio-repository.js";
import { ResearchPrototypeService } from "./research-prototype.js";
import { loadCuratedResourceLibrary } from "./resource-library.js";
import { ensureV11FixtureArtifact } from "./v11-build-metadata.js";

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
const runtimeOwnership = await acquireRuntimeOwnership(connectionString, () => {
  console.error("数据库运行权连接已丢失，停止服务以防止多个执行器并行处理同一任务。中断调用不会自动重试。");
  process.exit(1);
});
const database = await openDatabase(connectionString).catch(async error => {
  await runtimeOwnership.release();
  throw error;
});
const importedProjectCount = await importLegacySqliteIfEmpty(database, legacySqlitePath);
const resourceFamilies = await loadCuratedResourceLibrary(join(projectRoot, "assets", "library", "curated"));
const promotedResourceRoot = join(projectRoot, "data", "resource-library", "promoted");
if (existsSync(promotedResourceRoot)) resourceFamilies.push(...await loadCuratedResourceLibrary(promotedResourceRoot, { requireCurated: false }));
const repository = new StudioRepository(database, publicOrigin, publicGameOrigin, resourceFamilies);
const legacyArtifactRoot = join(projectRoot, "data", "artifacts");
const artifactRoot = join(projectRoot, "data", "artifacts-v1.1");
const researchPrototypeRoot = join(projectRoot, "data", "research-prototypes");
const openAIKeyFile = process.env.OPENAI_API_KEY_FILE ?? join(projectRoot, "data", "secrets", "openai-api-key.txt");
const openAISettings = new OpenAISettings(process.env.OPENAI_API_KEY, openAIKeyFile);
// Node 的全局 fetch 默认不走 HTTP(S)_PROXY;在设置了代理但未开启 NODE_USE_ENV_PROXY 的环境里,
// OpenAI 调用会以 fetch failed 静默回退,这里提前把问题喊出来。
if ((process.env.HTTPS_PROXY || process.env.HTTP_PROXY) && process.env.NODE_USE_ENV_PROXY !== "1") {
  console.warn("检测到系统代理，但未设置 NODE_USE_ENV_PROXY=1：Node fetch 不会走代理，OpenAI 调用可能全部失败并回退。请用 NODE_USE_ENV_PROXY=1 启动服务。");
}
// STUDIO_TEXT_PROVIDER=claude-cli：策划、规则审核与代码生成改走本机 Claude Code CLI 的订阅额度；
// 图片仍由 OpenAI Key 承载。CLI 每次冷启动较慢，所以放宽各文本调用的超时；重试次数不变。
const claudeCliText = process.env.STUDIO_TEXT_PROVIDER === "claude-cli"
  ? { fetchImpl: createClaudeCliFetch({ executable: process.env.STUDIO_CLAUDE_CLI ?? "claude", model: process.env.STUDIO_CLAUDE_MODEL ?? DEFAULT_CLAUDE_CLI_MODEL }) }
  : null;
if (claudeCliText) {
  openAISettings.useClaudeCliText(process.env.STUDIO_CLAUDE_MODEL ?? DEFAULT_CLAUDE_CLI_MODEL);
  console.log(`文本模型使用本机 Claude CLI（${process.env.STUDIO_CLAUDE_MODEL ?? DEFAULT_CLAUDE_CLI_MODEL}），图片模型继续使用 OpenAI。`);
}
const ideaAnalyzer = new IdeaAnalyzer(openAISettings, claudeCliText ? { ...claudeCliText, timeoutMs: 90_000 } : {});
const designContracts = new DesignContractGenerator(openAISettings, claudeCliText ? { ...claudeCliText, timeoutMs: 300_000 } : {});
const previewDesignContracts = new DesignContractGenerator(openAISettings, { maxAttempts: 1, ...(claudeCliText ? { ...claudeCliText, timeoutMs: 300_000 } : {}) });
const coverArt = new CoverArtGenerator(openAISettings);
const codeGenerator = new GameCodeGenerator(openAISettings, claudeCliText ? { ...claudeCliText, timeoutMs: 1_200_000 } : {});
const orchestrator = new BuildOrchestrator(repository, artifactRoot, {
  designContracts,
  coverArt,
  codeGenerator,
  resourceFamilies,
  maxConcurrentBuilds: Number.parseInt(process.env.BUILD_CONCURRENCY ?? "2", 10) || 2,
  // 质量问题自动修正的轮数上限；网络阻断与远端故障不受此数控制。
  maxRepairRounds: Number.parseInt(process.env.STUDIO_MAX_REPAIR_ROUNDS ?? "", 10) || DEFAULT_REPAIR_ROUNDS,
});
const accessControl = new AccessControl(process.env.STUDIO_ACCESS_TOKEN?.trim() || null, undefined, process.env.STUDIO_REVIEW_TOKEN?.trim() || null);
const researchPrototypes = new ResearchPrototypeService(repository, researchPrototypeRoot, publicGameOrigin, undefined, promotedResourceRoot);
const projectLifecycle = new ProjectLifecycle(repository, artifactRoot);
// 创作页可用的模板封面目录：由官方游戏登记表派生（含固定游戏所落的 signal-hunt）。
const templateArtIds = new Set<string>(OFFICIAL_SERVER_TEMPLATE_IDS);
await repository.failInterruptedBuilds();
await repository.reconcilePublishedStatuses();
await repository.initializeCatalogScopes();
await repository.ensureInitialDesignResearchTasks();
await repository.ensureInitialGameplayRadarSignals();
const officialFixtureIds = await repository.ensureOfficialFixtures();
// 1.0 固定游戏源目录保持只读；1.1 首次启动时复制为版本化不可变产物并补齐结构化工程、变更集与运行观测。
for (const [fixtureKind, projectId] of Object.entries(officialFixtureIds)) {
  if (!projectId) continue;
  const fixtureProject = await repository.get(projectId);
  if (!fixtureProject) continue;
  ensureV11FixtureArtifact(
    join(projectRoot, "fixtures", fixtureKind),
    join(artifactRoot, fixtureProject.version.id),
    fixtureProject,
  );
}
// 按登记表把已发布的官方游戏标记为官方并写入大厅顺序；未登记的项目不动。
await repository.syncOfficialCatalog();
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

function projectActionIdFrom(pathname: string, action: "archive" | "restore" | "playable-build") {
  return pathname.match(new RegExp(`^/api/projects/([^/]+)/${action}$`))?.[1] ?? null;
}

async function createAnalyzedProject(rawInput: ReturnType<typeof projectInputSchema.parse>, report: (title: string) => Promise<void> = async () => {}) {
    const { input, analysis, designProfile } = await resolveCreationDesign(rawInput, {
      analyze: input => ideaAnalyzer.analyze(input),
      generate: (input, analysis) => designContracts.generate(input, analysis),
    }, report);
    await report("正在准备机制与资源计划");
    // 影子策划评估只写入规格供比较和审计；当前生产模板选择仍由 IdeaAnalyzer 决定。
    const designKnowledge = createDesignKnowledgeShadow(input, analysis, await repository.currentDesignKnowledgeLibrary());
    const resourcePlanning = createResourcePlanningForGameSpec(generateGameSpec(input, analysis, designProfile, designKnowledge), resourceFamilies);
    await report("正在保存游戏项目");
    return repository.create(input, analysis, designProfile, designKnowledge, resourcePlanning);
}

const productionJobs = new ProductionJobs(database, async (input, report) => {
  const parsed = projectInputSchema.parse(input);
  let project = parsed.requestId ? await repository.get(parsed.requestId) : null;
  if (project && project.idea !== parsed.idea) throw new Error("制作请求与已有项目不一致。");
  project ??= await createAnalyzedProject(parsed, report);
  await report("正在启动资源生成与游戏构建");
  await orchestrator.start(project.id);
});
await productionJobs.initialize();
await orchestrator.resumeQueuedBuilds();

async function handleApi(request: IncomingMessage, response: ServerResponse, pathname: string) {
  if (request.method === "POST" && pathname === "/api/production-jobs") {
    sendJson(response, 202, { job: await productionJobs.submit(projectInputSchema.parse(await readJson(request))) });
    return true;
  }
  const retryJobId = pathname.match(/^\/api\/production-jobs\/([^/]+)\/retry$/)?.[1];
  if (request.method === "POST" && retryJobId) {
    const job = await productionJobs.resubmitFailed(decodeURIComponent(retryJobId), async id => Boolean(await repository.get(id)));
    sendJson(response, 202, { job });
    return true;
  }
  const productionJobId = pathname.match(/^\/api\/production-jobs\/([^/]+)$/)?.[1];
  const streamJobId = pathname.match(/^\/api\/production-jobs\/([^/]+)\/stream$/)?.[1];
  if (request.method === "GET" && streamJobId) {
    const id = decodeURIComponent(streamJobId);
    response.writeHead(200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" });
    response.flushHeaders();
    let closed = false, previous = "", lastSentAt = Date.now();
    response.on("close", () => { closed = true; });
    try {
      while (!closed) {
        const job = await productionJobs.get(id);
        const build = job?.status === "building" ? await repository.latestBuild(id) : null;
        const snapshot = JSON.stringify({ job, build });
        if (closed) break;
        if (snapshot !== previous) { response.write(snapshot + "\n"); previous = snapshot; lastSentAt = Date.now(); }
        else if (Date.now() - lastSentAt >= 15_000) { response.write(JSON.stringify({ type: "heartbeat" }) + "\n"); lastSentAt = Date.now(); }
        if (!job || job.status === "failed" || build?.status === "succeeded" || build?.status === "failed") break;
        await new Promise(resolve => setTimeout(resolve, 750));
      }
    } catch { if (!closed) response.write(JSON.stringify({ error: "进度连接暂时中断，任务仍在服务端运行。" }) + "\n"); }
    response.end();
    return true;
  }
  if (request.method === "GET" && productionJobId) {
    sendJson(response, 200, { job: await productionJobs.get(decodeURIComponent(productionJobId)) });
    return true;
  }
  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, {
      status: "ok",
      database: "ready",
      platform: PLATFORM_VERSION_INFO,
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
  if (pathname === "/api/settings/openai/models" && request.method === "POST") {
    sendJson(response, 200, await openAISettings.listModels(await readJson(request)));
    return true;
  }
  if (pathname === "/api/settings/openai") {
    if (request.method === "GET") {
      sendJson(response, 200, openAISettings.status());
      return true;
    }
    if (request.method === "PUT") {
      sendJson(response, 200, await openAISettings.save(await readJson(request)));
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
  if (request.method === "GET" && pathname === "/api/design-knowledge/review") {
    sendJson(response, 200, await repository.designKnowledgeReview());
    return true;
  }
  if (pathname === "/api/design-knowledge/reviews") {
    if (request.method === "GET") {
      sendJson(response, 200, { reviews: await repository.listDesignKnowledgeReviews() });
      return true;
    }
    if (request.method === "POST") {
      sendJson(response, 201, { review: await repository.captureDesignKnowledgeReview(await readJson(request)) });
      return true;
    }
  }
  const designReviewDecision = pathname.match(/^\/api\/design-knowledge\/reviews\/([^/]+)\/decisions$/)?.[1];
  if (request.method === "POST" && designReviewDecision) {
    sendJson(response, 201, { decision: await repository.recordDesignKnowledgeDecision(decodeURIComponent(designReviewDecision), await readJson(request)) });
    return true;
  }
  const designReviewChangeSet = pathname.match(/^\/api\/design-knowledge\/reviews\/([^/]+)\/change-set$/)?.[1];
  if (request.method === "POST" && designReviewChangeSet) {
    sendJson(response, 201, { changeSet: await repository.createDesignKnowledgeChangeSet(decodeURIComponent(designReviewChangeSet)) });
    return true;
  }
  if (request.method === "GET" && pathname === "/api/design-knowledge/change-sets") {
    sendJson(response, 200, { changeSets: await repository.listDesignKnowledgeChangeSets() });
    return true;
  }
  const designChangeSetAction = pathname.match(/^\/api\/design-knowledge\/change-sets\/([^/]+)\/(review|export|publish)$/);
  if (designChangeSetAction?.[1] && designChangeSetAction[2] === "review" && request.method === "POST") {
    sendJson(response, 200, { changeSet: await repository.reviewDesignKnowledgeChangeSet(decodeURIComponent(designChangeSetAction[1]), await readJson(request)) });
    return true;
  }
  if (designChangeSetAction?.[1] && designChangeSetAction[2] === "export" && request.method === "GET") {
    sendJson(response, 200, { export: await repository.exportDesignKnowledgeChangeSet(decodeURIComponent(designChangeSetAction[1])) });
    return true;
  }
  if (designChangeSetAction?.[1] && designChangeSetAction[2] === "publish" && request.method === "POST") {
    sendJson(response, 201, { release: await repository.publishDesignKnowledgeChangeSet(decodeURIComponent(designChangeSetAction[1])) });
    return true;
  }
  if (request.method === "GET" && pathname === "/api/design-knowledge/releases") {
    sendJson(response, 200, { releases: await repository.listDesignKnowledgeReleases() });
    return true;
  }
  if (request.method === "POST" && pathname === "/api/design-knowledge/releases/rollback") {
    sendJson(response, 201, { release: await repository.rollbackDesignKnowledgeRelease(await readJson(request)) });
    return true;
  }
  if (request.method === "GET" && pathname === "/api/design-knowledge/insights") {
    sendJson(response, 200, { insights: await repository.designKnowledgeInsights() });
    return true;
  }
  if (request.method === "GET" && pathname === "/api/design-knowledge/mechanic-atlas") {
    const parameters = new URL(request.url ?? pathname, "http://127.0.0.1").searchParams;
    const family = parameters.get("family") || undefined;
    sendJson(response, 200, {
      summary: MECHANIC_ATLAS_SUMMARY,
      localSources: LOCAL_DESIGN_SOURCE_SUMMARY,
      result: searchMechanicAtlas({
        query: parameters.get("query") || undefined,
        family: family as NonNullable<Parameters<typeof searchMechanicAtlas>[0]>["family"],
        offset: Number(parameters.get("offset") || 0), limit: Number(parameters.get("limit") || 30),
      }),
    });
    return true;
  }
  if (pathname === "/api/design-knowledge/radar") {
    if (request.method === "GET") {
      sendJson(response, 200, { clusters: await repository.listGameplayRadar() });
      return true;
    }
    if (request.method === "POST") {
      sendJson(response, 201, { cluster: await repository.ingestGameplayRadarSignal(await readJson(request)) });
      return true;
    }
  }
  const gameplayRadarResearch = pathname.match(/^\/api\/design-knowledge\/radar\/([^/]+)\/research$/)?.[1];
  if (request.method === "POST" && gameplayRadarResearch) {
    sendJson(response, 201, await repository.startGameplayRadarResearch(decodeURIComponent(gameplayRadarResearch), await readJson(request)));
    return true;
  }
  if (pathname === "/api/design-knowledge/research") {
    if (request.method === "GET") {
      sendJson(response, 200, { tasks: await repository.listDesignResearchTasks() });
      return true;
    }
    if (request.method === "POST") {
      sendJson(response, 201, { task: await repository.createDesignResearchTask(await readJson(request)) });
      return true;
    }
  }
  const designResearchAction = pathname.match(/^\/api\/design-knowledge\/research\/([^/]+)\/(sources|synthesis|candidate|decision|change-set)$/);
  if (request.method === "POST" && designResearchAction?.[1]) {
    const taskId = decodeURIComponent(designResearchAction[1]);
    if (designResearchAction[2] === "sources") sendJson(response, 200, { task: await repository.addDesignResearchSource(taskId, await readJson(request)) });
    if (designResearchAction[2] === "synthesis") sendJson(response, 200, { task: await repository.submitDesignResearchSynthesis(taskId, await readJson(request)) });
    if (designResearchAction[2] === "candidate") sendJson(response, 200, { task: await repository.attachDesignResearchCandidate(taskId, await readJson(request)) });
    if (designResearchAction[2] === "decision") sendJson(response, 200, { task: await repository.decideDesignResearchTask(taskId, await readJson(request)) });
    if (designResearchAction[2] === "change-set") sendJson(response, 201, { changeSet: await repository.createDesignResearchChangeSet(taskId) });
    return true;
  }
  const designResearchEvaluation = pathname.match(/^\/api\/design-knowledge\/research\/([^/]+)\/evaluation(?:\/(probes|browser|playtests|run|acquisition))?$/);
  if (request.method === "POST" && designResearchEvaluation?.[1]) {
    const taskId = decodeURIComponent(designResearchEvaluation[1]);
    if (!designResearchEvaluation[2]) sendJson(response, 201, { task: await repository.createDesignResearchEvaluation(taskId) });
    if (designResearchEvaluation[2] === "probes") sendJson(response, 200, { task: await repository.recordDesignResearchProbeRun(taskId, await readJson(request)) });
    if (designResearchEvaluation[2] === "browser") sendJson(response, 200, { task: await repository.recordDesignResearchBrowserRun(taskId, await readJson(request)) });
    if (designResearchEvaluation[2] === "playtests") sendJson(response, 200, { task: await repository.recordDesignResearchPlaytest(taskId, await readJson(request)) });
    if (designResearchEvaluation[2] === "run") sendJson(response, 200, await researchPrototypes.run(taskId));
    if (designResearchEvaluation[2] === "acquisition") sendJson(response, 201, { task: await repository.createDesignResearchResourceAcquisitionTask(taskId) });
    return true;
  }
  const designResearchResourceWork = pathname.match(/^\/api\/design-knowledge\/research\/([^/]+)\/evaluation\/acquisition\/([^/]+)\/(submit|review)$/);
  if (request.method === "POST" && designResearchResourceWork?.[1] && designResearchResourceWork[2]) {
    const taskId = decodeURIComponent(designResearchResourceWork[1]);
    const requirementId = decodeURIComponent(designResearchResourceWork[2]);
    if (designResearchResourceWork[3] === "submit") sendJson(response, 200, { task: await repository.submitDesignResearchResourceAcquisitionWork(taskId, requirementId, await readJson(request)) });
    if (designResearchResourceWork[3] === "review") sendJson(response, 200, { task: await repository.reviewDesignResearchResourceAcquisitionWork(taskId, requirementId, await readJson(request)) });
    return true;
  }
  const designResearchResourceIntake = pathname.match(/^\/api\/design-knowledge\/research\/([^/]+)\/evaluation\/resource-intake(?:\/(review))?$/);
  if (request.method === "POST" && designResearchResourceIntake?.[1]) {
    const taskId = decodeURIComponent(designResearchResourceIntake[1]);
    if (designResearchResourceIntake[2] === "review") sendJson(response, 200, { task: await repository.reviewDesignResearchResourceIntake(taskId, await readJson(request)) });
    else sendJson(response, 200, await researchPrototypes.intake(taskId));
    return true;
  }
  const designResearchResourcePromotion = pathname.match(/^\/api\/design-knowledge\/research\/([^/]+)\/evaluation\/resource-promotion$/)?.[1];
  if (request.method === "POST" && designResearchResourcePromotion) {
    sendJson(response, 200, await researchPrototypes.promoteResources(decodeURIComponent(designResearchResourcePromotion)));
    return true;
  }
  if (pathname === "/api/design-knowledge/playtests") {
    if (request.method === "GET") {
      sendJson(response, 200, { playtests: await repository.listDesignPlaytests() });
      return true;
    }
    if (request.method === "POST") {
      sendJson(response, 201, { playtest: await repository.recordDesignPlaytest(await readJson(request)) });
      return true;
    }
  }
  const activityPlayerId = pathname.match(/^\/api\/play-activity\/(player-[0-9a-f-]{36})$/i)?.[1];
  if (request.method === "GET" && activityPlayerId) {
    sendJson(response, 200, { activities: await repository.playActivities(activityPlayerId) });
    return true;
  }
  if (request.method === "POST" && pathname === "/api/design-preview") {
    const input = projectInputSchema.parse(await readJson(request));
    const streaming = request.headers.accept?.includes("application/x-ndjson");
    const emit = (event: unknown) => { if (!response.destroyed) response.write(JSON.stringify(event) + "\n"); };
    if (streaming) {
      response.writeHead(200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" });
      response.flushHeaders();
      emit({ type: "status", message: "模型请求已提交" });
    }
    const profile = await previewDesignContracts.generate(input, null, [
      "这是用户确认前的实时游戏策划。根据本次描述设计具体玩法，不要返回通用套话。使用普通人能懂的中文，说明实际操作、目标、新手引导、递进与成功反馈。用户未明确的细节给出合理且操作简单的建议。灵感仅是输入，不是固定方案。",
    ], streaming ? text => emit({ type: "delta", text }) : undefined, streaming ? () => emit({ type: "reset" }) : undefined);
    if (streaming) {
      emit(profile ? { type: "done", profile, source: "llm" } : { type: "error", error: "模型输出未完成或未通过检查，请检查模型设置后重试；当前片段不能用于制作。" });
      response.end();
      return true;
    }
    if (!profile) { sendJson(response, 503, { error: "实时方案生成失败，请检查模型设置或稍后重试。没有使用固定方案替代。" }); return true; }
    sendJson(response, 200, { profile, source: "llm" });
    return true;
  }
  if (request.method === "POST" && pathname === "/api/projects") {
    const rawInput = projectInputSchema.parse(await readJson(request));
    if (rawInput.requestId) {
      const existing = await repository.get(rawInput.requestId);
      if (existing) {
        if (existing.idea !== rawInput.idea) { sendJson(response, 409, { error: "创建请求与已有项目不一致。" }); return true; }
        sendJson(response, 200, { project: existing });
        return true;
      }
    }
    sendJson(response, 201, { project: await createAnalyzedProject(rawInput) });
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
  const revisionRoute = pathname.match(/^\/api\/projects\/([^/]+)\/revisions(?:\/([^/]+))?$/);
  if (revisionRoute && request.method === "POST" && !revisionRoute[2]) {
    const input = projectRevisionInputSchema.parse(await readJson(request));
    sendJson(response, 202, { build: await orchestrator.start(decodeURIComponent(revisionRoute[1]), input) });
    return true;
  }
  if (revisionRoute && request.method === "GET" && revisionRoute[2]) {
    sendJson(response, 200, { build: await repository.revisionBuild(decodeURIComponent(revisionRoute[1]), decodeURIComponent(revisionRoute[2])) });
    return true;
  }
  const playableProjectId = projectActionIdFrom(pathname, "playable-build");
  if (request.method === "GET" && playableProjectId) {
    sendJson(response, 200, { build: await repository.latestPlayableBuild(decodeURIComponent(playableProjectId)) });
    return true;
  }
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
  if (request.method === "GET" && versionArtReview) {
    sendJson(response, 200, { reviews: await repository.listVersionArtReviews(
      decodeURIComponent(versionArtReview.projectId), decodeURIComponent(versionArtReview.versionId),
    ) });
    return true;
  }
  if (request.method === "POST" && versionArtReview) {
    sendJson(response, 200, { versions: await repository.reviewVersionArt(
      decodeURIComponent(versionArtReview.projectId),
      decodeURIComponent(versionArtReview.versionId),
      await readJson(request),
      accessControl.reviewIdentity(request) ?? undefined,
    ) });
    return true;
  }

  const publicationVersion = publicationVersionFrom(pathname);
  if (request.method === "POST" && publicationVersion) {
    sendJson(response, 200, { project: await repository.publish(
      decodeURIComponent(publicationVersion.projectId),
      decodeURIComponent(publicationVersion.versionId),
      true,
    ) });
    return true;
  }

  const publicationProjectId = publicationProjectIdFrom(pathname);
  if (request.method === "POST" && publicationProjectId) {
    sendJson(response, 200, { project: await repository.publish(decodeURIComponent(publicationProjectId), undefined, true) });
    return true;
  }
  return false;
}

async function gameRequest(pathname: string) {
  const stable = pathname.match(/^\/play\/([^/]+)(\/.*)?$/);
  if (stable?.[1]) {
    const game = await repository.resolveGameBySlug(decodeURIComponent(stable[1]));
    if (!game) return null;
    const root = await ensureVersionArtifact(game);
    return { root, relativePath: stable[2], immutable: false };
  }
  const version = pathname.match(/^\/version\/([^/]+)(\/.*)?$/);
  if (version?.[1]) {
    const game = await repository.resolveGameByVersion(decodeURIComponent(version[1]));
    if (!game) return null;
    const root = await ensureVersionArtifact(game);
    return { root, relativePath: version[2], immutable: true };
  }
  return null;
}

async function ensureVersionArtifact(game: { project_id: string; fixture_kind: string | null; version_id: string }) {
  const target = join(artifactRoot, game.version_id);
  const source = game.fixture_kind
    ? join(projectRoot, "fixtures", game.fixture_kind)
    : join(legacyArtifactRoot, game.version_id);
  if (!existsSync(target) && !existsSync(source)) return target;
  const project = await repository.getVersion(game.project_id, game.version_id);
  if (!project) return existsSync(target) ? target : source;
  return ensureV11FixtureArtifact(source, target, project);
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

function handleResearchPrototype(response: ServerResponse, pathname: string) {
  const match = pathname.match(/^\/research-prototype\/([^/]+)(\/.*)?$/);
  if (!match?.[1]) return false;
  const artifactId = decodeURIComponent(match[1]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(artifactId)) return false;
  const relativePath = !match[2] || match[2] === "/" ? "index.html" : decodeURIComponent(match[2].slice(1));
  return sendStaticFile(response, join(researchPrototypeRoot, artifactId), relativePath, false, { frameAncestors: [`'self'`, originWithoutSlash(publicOrigin)].join(" ") });
}

function originWithoutSlash(origin: string) {
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}

function handleTemplateArt(response: ServerResponse, pathname: string) {
  if (pathname.startsWith('/media/official-cover/')) {
    const cover = OFFICIAL_GAMES.find(game => game.lobbyCover && pathname === `/media/official-cover/${game.lobbyCover.split('/').pop()}`)?.lobbyCover;
    if (cover && sendStaticFile(response, join(projectRoot, 'assets/library/covers'), cover.split('/').pop()!, true)) return true;
    sendJson(response, 404, { error: '游戏封面不存在。' });
    return true;
  }
  const match = pathname.match(/^\/media\/template-art\/([^/]+)\/(cover|gameplay-atlas)\.png$/);
  if (!match?.[1] || !match[2]) return false;
  const template = decodeURIComponent(match[1]);
  if (!templateArtIds.has(template)) {
    sendJson(response, 404, { error: "模板资源不存在。" });
    return true;
  }
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
    if (request.method === "GET" && url.pathname.startsWith("/research-prototype/") && handleResearchPrototype(response, url.pathname)) return;
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
    if (request.method === "GET" && url.pathname.startsWith("/research-prototype/") && handleResearchPrototype(response, url.pathname)) return;
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
  server.close(() => void database.close().finally(async () => {
    await runtimeOwnership.release();
    process.exit(0);
  }));
}

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
