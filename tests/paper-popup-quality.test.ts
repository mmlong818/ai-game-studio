import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { browserQualityAvailable, inspectStageF3DInBrowser } from "../src/server/browser-quality";
import { openTestDatabase } from "../src/server/database";
import { inspectGameArtifact, writeDesignDocuments, writeGameArtifact } from "../src/server/game-artifact";
import { StudioRepository } from "../src/server/studio-repository";
import { auditPopupBlueprints, popupBestTemplateBlueprints, popupBlueprintSignatures, popupChapters } from "../src/shared/paper-popup-levels";
import { createPaperPopupRules, paperPopupRulesSource, type PopupRules } from "../src/shared/paper-popup-rules";
import { readPaperPopupAssetManifest, paperPopupTextureFiles } from "../src/server/three-popup-runtime";

const popupIdea = "立体书风格的 3D 旋转迷宫：把整本书转 90 度，桥和台阶才接得上，走到出口门通关，三颗折纸星可选。";

async function createPopupArtifact(root: string) {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  try {
    const project = await repository.create({ title: "纸境 · 立体书迷宫", idea: popupIdea, dimensions: "3d", aspectRatio: "9:16" });
    assert.equal(project.spec.threeMode, "popup");
    assert.equal(project.spec.threeContract?.cameraDistance, 14);
    writeDesignDocuments(root, project);
    writeGameArtifact(root, project);
    return project;
  } finally {
    await database.close();
  }
}

function cleanup(root: string) {
  const safeRoot = resolve(root);
  if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
}

test("纸境规则内核：内嵌源码与直接实现求解结果一致", () => {
  const direct = createPaperPopupRules();
  const embedded = new Function(`return ${paperPopupRulesSource()};`)() as PopupRules;
  for (const blueprint of popupBestTemplateBlueprints.slice(0, 5)) {
    assert.deepEqual(embedded.validate(blueprint), []);
    assert.deepEqual(embedded.solveLevel(blueprint), direct.solveLevel(blueprint));
  }
  const first = popupBestTemplateBlueprints[0];
  const rotated = direct.step(first, direct.createState(first), "cw");
  assert.equal(rotated.state.o, 1);
  assert.equal(rotated.state.t, 0, "转动不消耗节拍");
  const waited = direct.step(first, rotated.state, "wait");
  assert.equal(waited.state.t, 1);
  assert.equal(direct.screenToGrid("E", 1), "N", "书顺时针转 90° 后屏幕向右对应网格向北");
});

test("纸境 20 关：数据校验、可解、必须转动、隐藏星与可选星全部成立", () => {
  const reports = auditPopupBlueprints();
  assert.equal(reports.length, 20);
  assert.equal(new Set(popupBlueprintSignatures()).size, 20, "20 关签名唯一");
  for (const report of reports) {
    const blueprint = popupBestTemplateBlueprints.find((item) => item.id === report.id)!;
    assert.deepEqual(report.issues, [], `${report.id} ${blueprint.name}`);
    assert.ok(report.solution, `${report.id} 必须可解`);
    assert.ok(report.solution!.rotations >= 1 && report.requiresRotation, `${report.id} 必须至少转动一次才能通关`);
    assert.ok(report.solution!.beats <= 60, `${report.id} 主线节拍应在 1–3 分钟内`);
    assert.ok(report.hiddenStarIndexes.length >= 1, `${report.id} 至少一颗星在默认角度不可见`);
    assert.ok(report.starsCollectible.every(Boolean), `${report.id} 三颗星都可以拿到`);
    assert.equal(blueprint.chapterName, popupChapters[blueprint.chapter - 1].name);
  }
  const byChapter = [1, 2, 3, 4].map((chapter) => popupBestTemplateBlueprints.filter((item) => item.chapter === chapter));
  assert.deepEqual(byChapter.map((levels) => levels.length), [5, 5, 5, 5]);
  assert.ok(byChapter[0].every((item) => item.links.some((link) => link.angles) && item.hazards.length === 0 && item.plates.length === 0), "第一章只有旋转看路");
  assert.ok(byChapter[1].every((item) => item.hazards.length > 0), "第二章引入纸浪纸鸟");
  assert.ok(byChapter[2].every((item) => item.hazards.length > 0 && item.plates.some((plate) => plate.kind === "order")), "第三章叠加顺序机关");
  assert.ok(byChapter[3].every((item) => item.hazards.length > 0 && item.plates.some((plate) => plate.kind === "timer")), "第四章叠加限时门");
  assert.ok(byChapter[3].filter((item) => item.plates.some((plate) => plate.kind !== "timer")).length >= 2, "第四章至少两关综合运用机关");
});

test("纸境隐藏星规则：默认角度不可拾取，转到指定角度后可拾取", () => {
  const rules = createPaperPopupRules();
  const blueprint = popupBestTemplateBlueprints[0];
  const hiddenIndex = blueprint.stars.findIndex((star) => !star.angles.includes(0));
  const star = blueprint.stars[hiddenIndex];
  const onStar = { ...rules.createState(blueprint), x: star.x, z: star.z };
  const stayed = rules.step(blueprint, onStar, "wait");
  assert.equal(stayed.state.stars[hiddenIndex], false);
  let state = onStar;
  while (state.o !== star.angles[0]) state = rules.step(blueprint, state, "cw").state;
  assert.equal(state.stars[hiddenIndex], true, "站在星格上转到可见角度即拾取");
});

test("纸境官方贴图包：gpt-image-2 记录完整，交付文件哈希一致", () => {
  const manifest = readPaperPopupAssetManifest();
  assert.equal(manifest.model, "gpt-image-2");
  for (const filename of paperPopupTextureFiles) {
    const entry = manifest.entries.find((item) => item.file === filename);
    assert.ok(entry, filename);
    assert.ok(entry!.prompt.length > 40);
    assert.match(entry!.delivered.sha256, /^[0-9a-f]{64}$/);
    assert.match(entry!.source.sha256, /^[0-9a-f]{64}$/);
    const path = resolve("assets", "starter", "paper-popup", filename);
    assert.ok(existsSync(path));
    assert.equal(statSync(path).size, entry!.delivered.bytes);
  }
  const cover = manifest.entries.find((item) => item.file === "cover.png")!;
  assert.deepEqual([cover.delivered.width, cover.delivered.height], [1024, 1536]);
});

test("纸境 3D 产物：popup 模式生成不可变产物并通过静态探针", async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-paper-popup-source-"));
  try {
    await createPopupArtifact(root);
    const manifest = JSON.parse(readFileSync(join(root, "game-manifest.json"), "utf8"));
    const script = readFileSync(join(root, "app.js"), "utf8");
    const html = readFileSync(join(root, "index.html"), "utf8");
    assert.equal(manifest.threeMode, "popup");
    assert.deepEqual(Object.keys(manifest.performanceProfiles), ["low", "medium", "high"]);
    assert.equal(manifest.performanceProfiles.high.tiltShift, true);
    assert.match(script, /function applyPerformanceTier/);
    assert.match(script, /renderSuspended/);
    assert.match(script, /function togglePause/);
    assert.match(script, /function createPaperPopupRules\(\)/);
    assert.match(script, /prefers-reduced-motion/);
    assert.doesNotMatch(script, /new THREE\.Sprite\(/, "禁止位图立牌充当 3D 物体");
    assert.doesNotMatch(`${html}\n${script}`, /<svg|\.svg/i);
    assert.match(html, /data-key="jump"/);
    assert.match(html, /data-key="cw"/);
    const probes = inspectGameArtifact(root);
    assert.ok(probes.includes("二十关数据校验与求解"));
    assert.ok(probes.includes("高性能档移轴景深"));
    for (const filename of paperPopupTextureFiles) assert.ok(existsSync(join(root, "assets", filename)), filename);
    const dynamicArt = JSON.parse(readFileSync(join(root, "_studio", "DYNAMIC_ART.json"), "utf8"));
    assert.equal(dynamicArt.schemaVersion, 2);
    assert.ok(dynamicArt.entries.some((entry: { role: string }) => entry.role === "封面"));
    assert.ok(existsSync(join(root, "_studio", "THREE_ASSET_PROVENANCE.json")));
    assert.ok(existsSync(join(root, "_studio", "PAPER_POPUP_ASSET_PROMPTS.md")));
    const levelAudit = JSON.parse(readFileSync(join(root, "_studio", "PAPER_POPUP_LEVELS.json"), "utf8"));
    assert.equal(levelAudit.levels.length, 20);
  } finally {
    cleanup(root);
  }
});

test("纸境 3D 产物：手机与桌面各完成一局、跳空回检查点、后台停渲染，20 关全部由探针按角度序列通关", { skip: !browserQualityAvailable(), timeout: 240_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-paper-popup-browser-"));
  try {
    await createPopupArtifact(root);
    const result = await inspectStageF3DInBrowser(root, "popup");
    assert.equal(result.mode, "popup");
    assert.ok(result.completedRuns >= 2, `完成局数 ${result.completedRuns}`);
    assert.equal(result.failedRuns, 2);
    assert.equal(result.evidence.hiddenRenderPaused, true);
    assert.equal(result.evidence.popupHiddenStarVerified, true);
    assert.equal(result.evidence.popupBridgeRotationVerified, true);
    assert.equal(result.evidence.popupCheckpointRecoveries, 2);
    assert.deepEqual(result.evidence.popupLevelsCompleted, Array.from({ length: 20 }, (_, index) => index + 1));
    assert.ok(existsSync(join(root, "_studio", "STAGE_F_3D_REPORT.json")));
  } finally {
    cleanup(root);
  }
});
