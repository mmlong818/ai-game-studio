import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import type { ProjectDetail } from "../shared/contracts.js";
import { resolveMechanicModules, validateMechanicBindings } from "../shared/mechanics/index.js";
import { migrateLegacyProjectToV11, type MigratedResource } from "../shared/project-schema/migrate-v1.js";
import { validateGameProjectV3, type GameProjectV3 } from "../shared/project-schema/index.js";
import { validateRegisteredRules } from "../shared/rules/index.js";
import { PLATFORM_VERSION_INFO } from "../shared/platform-version.js";
import { installGamePrefab } from "../shared/prefabs/index.js";

const mimeTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".woff2": "font/woff2",
  ".glb": "model/gltf-binary",
};

function listFiles(root: string, current = root): string[] {
  if (!existsSync(current)) return [];
  return readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const path = join(current, entry.name);
    return entry.isDirectory() ? listFiles(root, path) : [relative(root, path).replaceAll("\\", "/")];
  });
}

function inferRole(path: string): MigratedResource["role"] {
  const value = path.toLowerCase();
  if (/player|hero|ship|bug|body|head|leg/.test(value)) return "player";
  if (/obstacle|enemy|hazard|resin|brick/.test(value)) return "obstacle";
  if (/collect|target|drop|food|reward|star/.test(value)) return "collectible";
  if (/effect|burst|particle|trail/.test(value)) return "effect";
  if (/cover|ui|button|panel|hud/.test(value)) return "interface";
  if (/\.(mp3|ogg|wav)$/.test(value)) return "audio";
  if (/\.(woff2?|ttf|otf)$/.test(value)) return "font";
  if (/\.(glb|gltf)$/.test(value)) return "model";
  return "background";
}

function collectResources(root: string): MigratedResource[] {
  return listFiles(root, join(root, "assets"))
    .filter((path) => mimeTypes[extname(path).toLowerCase()])
    .map((path) => {
      const bytes = readFileSync(join(root, path));
      const contentHash = createHash("sha256").update(bytes).digest("hex");
      return {
        id: `RESOURCE-${createHash("sha256").update(path).digest("hex").slice(0, 16).toUpperCase()}`,
        role: inferRole(path),
        path,
        mimeType: mimeTypes[extname(path).toLowerCase()],
        contentHash,
        provenance: "ai-generated" as const,
        license: "project-owned",
      };
    });
}

const inspectorScript = `(() => {
  const draft = new URLSearchParams(location.search).get('draft') === '1' && /^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname);
  const events = [];
  const resourceErrors = [];
  const longFrames = [];
  const keys = new Set();
  const inputState = { pointer: { x: 0, y: 0, down: false }, touches: 0 };
  let created = 0, destroyed = 0, peakActiveObjectCount = 0, lastGameState = document.body.dataset.gameState || 'unknown';
  let frames = 0, lastSecond = performance.now(), fps = 0, frozen = !draft;
  const record = (type, detail = {}) => { events.push({ type, detail, at: performance.now() }); if (events.length > 80) events.shift(); };
  addEventListener('error', event => { const target = event.target; if (target && target !== window && target.src) resourceErrors.push(String(target.src)); }, true);
  addEventListener('forge:rule', event => record('rule', event.detail || {}));
  addEventListener('forge:collision', event => record('collision', event.detail || {}));
  addEventListener('keydown', event => { keys.add(event.key); record('input', { kind: 'keyboard', key: event.key, active: true }); });
  addEventListener('keyup', event => { keys.delete(event.key); record('input', { kind: 'keyboard', key: event.key, active: false }); });
  addEventListener('pointerdown', event => { inputState.pointer = { x: event.clientX, y: event.clientY, down: true }; record('input', { kind: 'pointer', active: true }); });
  addEventListener('pointermove', event => { inputState.pointer.x = event.clientX; inputState.pointer.y = event.clientY; });
  addEventListener('pointerup', () => { inputState.pointer.down = false; record('input', { kind: 'pointer', active: false }); });
  addEventListener('touchstart', event => { inputState.touches = event.touches.length; record('input', { kind: 'touch', count: event.touches.length }); }, { passive: true });
  addEventListener('touchend', event => { inputState.touches = event.touches.length; }, { passive: true });
  new MutationObserver(entries => { for (const entry of entries) { if (entry.type === 'childList') { created += entry.addedNodes.length; destroyed += entry.removedNodes.length; } else { const next = document.body.dataset.gameState || 'unknown'; if (next !== lastGameState) { record('state', { from: lastGameState, to: next }); lastGameState = next; } } } }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-game-state'] });
  const tick = now => { frames++; const delta = now - lastSecond; if (delta >= 1000) { fps = Math.round(frames * 1000 / delta); if (delta / Math.max(frames, 1) > 34) longFrames.push(delta / Math.max(frames, 1)); frames = 0; lastSecond = now; } requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const safeAsset = value => typeof value === 'string' && /^assets\\/[A-Za-z0-9._/-]+$/.test(value) && !value.includes('..');
  const api = {
    version: '1.1.0',
    snapshot: () => { const debug = window.__GAME_DEBUG__?.getState?.() || null; const runtime = debug?.runtime || debug || {}; const activeObjectCount = Object.values(runtime).reduce((total, value) => total + (Array.isArray(value) ? value.length : 0), 0); peakActiveObjectCount = Math.max(peakActiveObjectCount, activeObjectCount); const audio = [...document.querySelectorAll('audio')]; const memoryBytes = Number.isFinite(performance.memory?.usedJSHeapSize) ? performance.memory.usedJSHeapSize : null; return { gameState: document.body.dataset.gameState || 'unknown', fps, resourceErrors: [...resourceErrors], longFrameCount: longFrames.length, activeObjectCount, peakActiveObjectCount, objectStats: { created, destroyed }, inputState: { keys: [...keys], pointer: { ...inputState.pointer }, touches: inputState.touches }, audioState: { elements: audio.length, playing: audio.filter(node => !node.paused).length, muted: audio.filter(node => node.muted).length }, memoryBytes, events: [...events], debug, frozen }; },
    applyDraftPatch: patch => {
      if (frozen) return { ok: false, reason: '当前是冻结构建' };
      if (patch?.kind === 'css-variable' && /^--[a-z0-9-]+$/.test(patch.name) && typeof patch.value === 'string') { document.documentElement.style.setProperty(patch.name, patch.value); record('hot-patch', patch); return { ok: true }; }
      if (patch?.kind === 'image-source' && safeAsset(patch.value)) { const node = document.querySelector(patch.selector); if (node instanceof HTMLImageElement) { node.src = patch.value; record('hot-patch', patch); return { ok: true }; } }
      if (patch?.kind === 'runtime-parameter' && ['game-speed', 'spawn-rate', 'feedback-intensity'].includes(patch.name) && Number.isFinite(patch.value)) { const ranges = { 'game-speed': [0.25, 3], 'spawn-rate': [0.25, 4], 'feedback-intensity': [0, 2] }; const [minimum, maximum] = ranges[patch.name]; if (patch.value >= minimum && patch.value <= maximum) { dispatchEvent(new CustomEvent('forge:hot-parameter', { detail: { name: patch.name, value: patch.value } })); record('hot-patch', patch); return { ok: true }; } }
      return { ok: false, reason: '补丁不在安全热更新范围内' };
    },
    freeze: () => { frozen = true; record('freeze'); },
  };
  Object.defineProperty(window, '__FORGE_INSPECTOR__', { value: Object.freeze(api), configurable: false, writable: false });
})();`;

function readPreviousProject(previousRoot?: string): GameProjectV3 | null {
  if (!previousRoot) return null;
  const path = join(previousRoot, "_studio", "GAME_PROJECT_V3.json");
  if (!existsSync(path)) return null;
  try {
    const result = validateGameProjectV3(JSON.parse(readFileSync(path, "utf8")));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function describeChanges(previous: GameProjectV3 | null, current: GameProjectV3) {
  if (!previous) return [{ kind: "initial-migration", id: current.metadata.id, summary: "从 1.0 合同建立首个 1.1 结构化工程" }];
  const changes: Array<{ kind: string; id: string; summary: string }> = [];
  const previousResources = new Map(previous.resources.map((resource) => [resource.id, resource]));
  current.resources.forEach((resource) => {
    const before = previousResources.get(resource.id);
    if (!before) changes.push({ kind: "resource-added", id: resource.id, summary: `新增资源 ${resource.path}` });
    else if (before.contentHash !== resource.contentHash) changes.push({ kind: "resource-replaced", id: resource.id, summary: `替换资源 ${resource.path}` });
  });
  previous.resources.forEach((resource) => {
    if (!current.resources.some(({ id }) => id === resource.id)) changes.push({ kind: "resource-removed", id: resource.id, summary: `移除资源 ${resource.path}` });
  });
  const previousBehaviors = new Map(previous.objects.flatMap(({ behaviors }) => behaviors.map((behavior) => [behavior.id, behavior])));
  current.objects.flatMap(({ behaviors }) => behaviors).forEach((behavior) => {
    const before = previousBehaviors.get(behavior.id);
    if (before && JSON.stringify(before.parameters) !== JSON.stringify(behavior.parameters)) changes.push({ kind: "behavior-parameters", id: behavior.id, summary: `调整 ${behavior.moduleId} 参数` });
  });
  const previousRules = new Map(previous.rules.map((rule) => [rule.id, rule]));
  current.rules.forEach((rule) => {
    const before = previousRules.get(rule.id);
    if (!before) changes.push({ kind: "rule-added", id: rule.id, summary: `新增规则：${rule.name}` });
    else if (JSON.stringify(before) !== JSON.stringify(rule)) changes.push({ kind: "rule-updated", id: rule.id, summary: `更新规则：${rule.name}` });
  });
  return changes.length ? changes : [{ kind: "rebuild", id: current.metadata.id, summary: "结构未变化，重新生成并验证冻结产物" }];
}

export function writeV11BuildMetadata(root: string, project: ProjectDetail, options: { directions?: string[]; previousRoot?: string } = {}) {
  normalizeLegacyStartControl(root);
  const resources = collectResources(root);
  let gameProject = migrateLegacyProjectToV11({ id: project.id, title: project.title, createdAt: project.createdAt, spec: project.spec }, resources);
  for (const prefabId of ["start-flow", "hud", "mobile-controls", "play-remix"]) {
    gameProject = installGamePrefab(gameProject, prefabId, "V11");
  }
  const ruleErrors = validateRegisteredRules(gameProject);
  if (ruleErrors.length) throw new Error(`1.1 规则登记检查失败：${ruleErrors.join("；")}`);
  const bindings = gameProject.objects.flatMap(({ behaviors }) => behaviors);
  const bindingErrors = validateMechanicBindings(bindings);
  if (bindingErrors.length) throw new Error(`1.1 能力兼容检查失败：${bindingErrors.join("；")}`);
  const selections = [...new Map(bindings.map(({ moduleId, parameters }) => [moduleId, { id: moduleId, parameters }])).values()];
  const modules = resolveMechanicModules(selections);
  const studioRoot = join(root, "_studio");
  mkdirSync(studioRoot, { recursive: true });
  const projectJson = JSON.stringify(gameProject, null, 2);
  const previous = readPreviousProject(options.previousRoot);
  const changes = describeChanges(previous, gameProject);
  writeFileSync(join(studioRoot, "GAME_PROJECT_V3.json"), projectJson, "utf8");
  writeFileSync(join(studioRoot, "runtime-inspector.js"), inspectorScript, "utf8");
  writeFileSync(join(studioRoot, "CHANGESET_V11.json"), JSON.stringify({
    schemaVersion: 1,
    platformRelease: "1.1",
    status: "completed",
    userDirections: options.directions ?? [],
    previousProjectHash: previous ? createHash("sha256").update(JSON.stringify(previous)).digest("hex") : null,
    nextProjectHash: createHash("sha256").update(projectJson).digest("hex"),
    changes,
    affectedAcceptanceIds: gameProject.acceptance.filter((assertion) =>
      changes.some((change) => assertion.ruleIds.includes(change.id) || assertion.behaviorIds.includes(change.id)) ||
      changes.some(({ kind }) => kind.startsWith("resource-")) && ["asset", "viewport", "performance", "game-feel"].includes(assertion.kind),
    ).map(({ id }) => id),
    rollbackProject: previous,
    createdAt: new Date().toISOString(),
  }, null, 2), "utf8");
  writeFileSync(join(studioRoot, "V11_BUILD.json"), JSON.stringify({
    schemaVersion: 1,
    platform: PLATFORM_VERSION_INFO,
    projectHash: createHash("sha256").update(projectJson).digest("hex"),
    frozenByDefault: true,
    draftHotReload: ["css-variable", "image-source", "runtime-parameter"],
    mechanics: modules.map(({ id, version, stability, permissions }) => ({ id, version, stability, permissions })),
    resourceCount: resources.length,
    generatedAt: new Date().toISOString(),
  }, null, 2), "utf8");

  const indexPath = join(root, "index.html");
  const html = readFileSync(indexPath, "utf8");
  if (!html.includes("_studio/runtime-inspector.js")) {
    writeFileSync(indexPath, html.replace(/<\/body>/i, '<script src="_studio/runtime-inspector.js"></script></body>'), "utf8");
  }
  return gameProject;
}

export function ensureV11FixtureArtifact(sourceRoot: string, artifactRoot: string, project: ProjectDetail) {
  if (!existsSync(artifactRoot)) {
    mkdirSync(dirname(artifactRoot), { recursive: true });
    copyDirectory(sourceRoot, artifactRoot);
  }
  const manifestPath = join(artifactRoot, "_studio", "V11_BUILD.json");
  if (!existsSync(manifestPath)) writeV11BuildMetadata(artifactRoot, project);
  else refreshRuntimeInspector(artifactRoot);
  return artifactRoot;
}

function refreshRuntimeInspector(root: string) {
  normalizeLegacyStartControl(root);
  const studioRoot = join(root, "_studio");
  mkdirSync(studioRoot, { recursive: true });
  writeFileSync(join(studioRoot, "runtime-inspector.js"), inspectorScript, "utf8");
  const indexPath = join(root, "index.html");
  const html = readFileSync(indexPath, "utf8");
  if (!html.includes("_studio/runtime-inspector.js")) {
    writeFileSync(indexPath, html.replace(/<\/body>/i, '<script src="_studio/runtime-inspector.js"></script></body>'), "utf8");
  }
}

function normalizeLegacyStartControl(root: string) {
  const indexPath = join(root, "index.html");
  if (!existsSync(indexPath)) return;
  const html = readFileSync(indexPath, "utf8");
  if (/<(?:button|a)[^>]+id=["'](?:start|restart)["']/i.test(html)) return;
  if (!/id=["']setup-start["']/i.test(html)) return;
  writeFileSync(indexPath, html.replace(/id=(["'])setup-start\1/i, "id=$1start$1"), "utf8");
  for (const relativePath of listFiles(root).filter((path) => path.endsWith(".js") && !path.startsWith("_studio/"))) {
    const scriptPath = join(root, relativePath);
    const script = readFileSync(scriptPath, "utf8");
    const migrated = script.replace(/querySelector\((["'])#setup-start\1\)/g, "querySelector($1#start$1)");
    if (migrated !== script) writeFileSync(scriptPath, migrated, "utf8");
  }
}

function copyDirectory(sourceRoot: string, targetRoot: string) {
  mkdirSync(targetRoot, { recursive: false });
  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    const source = join(sourceRoot, entry.name);
    const target = join(targetRoot, entry.name);
    if (entry.isDirectory()) copyDirectory(source, target);
    else if (entry.isFile()) copyFileSync(source, target);
  }
}
