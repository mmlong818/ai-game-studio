import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { browserQualityAvailable, inspectGeneratedGameInBrowser } from "../src/server/browser-quality";
import { writeGeneratedArtifact } from "../src/server/game-generator";
import { generateGameSpec, type ProjectDetail } from "../src/shared/contracts";
import { createGameDesignContractForLegacyProject } from "../src/shared/game-design-contract/from-legacy";
import { generatedDesignHtml } from "./generated-design-fixture";

const html = generatedDesignHtml("shot-fired");

for (const failurePolicy of ["required", "forbidden"] as const) {
test(`无限玩法 ${failurePolicy} 不要求胜利或关卡钩子，隐藏胜利必须拒绝`, { skip: !browserQualityAvailable(), timeout: 60_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-endless-"));
  const sample = project();
  sample.spec.designProfile.generatedCampaign = { mode: "endless", failurePolicy, levelCount: 0, milestones: [], difficultyKeys: [], rationale: "持续自由练习，没有最终目标。" };
  let endlessHtml = html.replace("getState:()=>({state,", 'getState:()=>({mode:"endless",state,').replace("setLevel:(level)=>applyLevel(level),restart,", "restart,").replace(/  forceWin:[^\n]+\n/, "");
  if (failurePolicy === "forbidden") endlessHtml = endlessHtml.replace(/  forceLose:[^\n]+\n/, "");
  try {
    writeGeneratedArtifact(root, sample, { html: endlessHtml, designNotes: "无限分支测试夹具，不证明内容品质", rounds: 1 });
    writeFileSync(join(root, "assets", "background.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
    const result = await inspectGeneratedGameInBrowser(root, { expectedCampaign: sample.spec.designProfile.generatedCampaign });
    assert.equal(result.checks.find(check => check.id === "ENDLESS-SAMPLED")?.status, "passed");
    assert.equal(result.checks.some(check => check.id === "PROGRESSION-RUNTIME"), false);
    assert.equal(result.checks.some(check => check.id === "CONTENT-VARIATION-REHEARSAL"), false);
    writeGeneratedArtifact(root, sample, { html: endlessHtml.replace("function fireShot(){", 'function fireShot(){setState("won");setState("playing");'), designNotes: "偷偷胜利负例", rounds: 1 });
    await assert.rejects(() => inspectGeneratedGameInBrowser(root), /禁止的won状态/);
  } finally {
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()) + "\\") && safeRoot.includes("studio-endless-")) rmSync(safeRoot, { recursive: true, force: true });
  }
});
}

test("无失败方案不要求forceLose，短暂失败也不能被刷新掩盖", { skip: !browserQualityAvailable(), timeout: 60_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-no-failure-"));
  const sample = project();
  sample.spec.designProfile.generatedCampaign = { failurePolicy: "forbidden", levelCount: 7, milestones: [1, 4, 7], difficultyKeys: ["goalMultiplier"], rationale: "七关无失败练习。" };
  const noFailure = html.replace("Math.min(20,", "Math.min(7,").replace("(safeLevel-1)/4", "(safeLevel-1)/3").replace(/  forceLose:[^\n]+\n/, "");
  try {
    writeGeneratedArtifact(root, sample, { html: noFailure, designNotes: "无失败测试，不是实际玩法质量证明", rounds: 1 });
    writeFileSync(join(root, "assets", "background.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
    const result = await inspectGeneratedGameInBrowser(root, { expectedCampaign: sample.spec.designProfile.generatedCampaign });
    assert.equal(result.checks.some(check => check.id === "ASSISTANCE-RUNTIME"), false);
    assert.equal(result.checks.find(check => check.id === "NO-FAILURE-SAMPLED")?.status, "passed");
    const report = JSON.parse(readFileSync(join(root, "_studio", "ASSISTANCE_QUALITY_REPORT.json"), "utf8"));
    assert.equal(report.status, "not-applicable");
    writeGeneratedArtifact(root, sample, { html: noFailure.replace("function fireShot(){", 'function fireShot(){setState("lost");setState("playing");'), designNotes: "短暂隐藏失败负例", rounds: 1 });
    await assert.rejects(() => inspectGeneratedGameInBrowser(root), /禁止的lost状态/);
  } finally {
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()) + "\\") && safeRoot.includes("studio-no-failure-")) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("确认七关使用真实维度；二十关冒充七关必须被拒绝", { skip: !browserQualityAvailable(), timeout: 60_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-seven-campaign-"));
  const sample = project();
  sample.spec.designProfile.generatedCampaign = { levelCount: 7, milestones: [1, 4, 7], difficultyKeys: ["targetCount"], rationale: "目标数量逐关增加，三阶段结构变化。" };
  const sevenHtml = html.replace("Math.min(20,", "Math.min(7,").replace("(safeLevel-1)/4", "(safeLevel-1)/3").replace("const difficulty={", "const difficulty={targetCount:3+safeLevel+stage*2,");
  try {
    writeGeneratedArtifact(root, sample, { html: sevenHtml, designNotes: "隔离七关验收样本", rounds: 1 });
    writeFileSync(join(root, "assets", "background.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
    await inspectGeneratedGameInBrowser(root);
    const progression = JSON.parse(readFileSync(join(root, "_studio", "DIFFICULTY_QUALITY_REPORT.json"), "utf8"));
    assert.equal(progression.levelsChecked, 7);
    assert.equal(progression.milestones.length, 3);
    const variation = JSON.parse(readFileSync(join(root, "_studio", "VARIATION_QUALITY_REPORT.json"), "utf8"));
    assert.equal(variation.rehearsalLevel, 7);
    writeGeneratedArtifact(root, sample, { html: sevenHtml.replace("Math.min(7,", "Math.min(20,"), designNotes: "错误关数负例", rounds: 1 });
    await assert.rejects(() => inspectGeneratedGameInBrowser(root), /越界选择却进入第 8 关/);
  } finally {
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()) + "\\") && safeRoot.includes("studio-seven-campaign-")) rmSync(safeRoot, { recursive: true, force: true });
  }
});

function project(): ProjectDetail {
  const baseSpec = generateGameSpec({ idea: "守夜人在灯塔上转动光束射击逼近的雾兽。", template: "generated", dimensions: "2d" });
  const designContract = createGameDesignContractForLegacyProject({ projectId: "generated-onboarding", title: "灯塔守夜人", idea: baseSpec.vision, createdAt: "2026-09-05T00:00:00.000Z", spec: baseSpec });
  return { id: "generated-onboarding", title: "灯塔守夜人", version: { id: "generated-onboarding-v1" }, spec: { ...baseSpec, designContract } } as unknown as ProjectDetail;
}

const threeHtml = html.replace("<script>", `<script type="module">
import * as THREE from "./vendor/three.module.js";
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector("#game-canvas"), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(320, 240);
const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(55, 4 / 3, .1, 20); camera.position.z = 4;
scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x66ccff })));
renderer.render(scene, camera);
`);

function project3d(): ProjectDetail {
  const baseSpec = generateGameSpec({ idea: "玩家在 3D 竞技场移动并射击逼近的雾兽。", template: "generated", dimensions: "3d" });
  const designContract = createGameDesignContractForLegacyProject({ projectId: "generated-onboarding-3d", title: "雾海竞技场", idea: baseSpec.vision, createdAt: "2026-09-05T00:00:00.000Z", spec: baseSpec });
  assert.deepEqual(designContract.onboarding.map(({ successSignal }) => successSignal), ["shot-fired"]);
  return { id: "generated-onboarding-3d", title: "雾海竞技场", version: { id: "generated-onboarding-3d-v1" }, spec: { ...baseSpec, designContract } } as unknown as ProjectDetail;
}

test("自由生成游戏在真实浏览器中完成安全教学、恢复、重看与跳过", { skip: !browserQualityAvailable(), timeout: 40_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-generated-onboarding-"));
  try {
    writeGeneratedArtifact(root, project(), { html, designNotes: "浏览器教学样例", rounds: 1 });
    mkdirSync(join(root, "assets"), { recursive: true });
    writeFileSync(join(root, "assets", "background.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
    const result = await inspectGeneratedGameInBrowser(root);
    for (const id of ["GEN-BROWSER-ONBOARDING", "PROGRESSION-RUNTIME", "CONTENT-VARIATION-REHEARSAL", "ASSISTANCE-RUNTIME"]) {
      assert.equal(result.checks.find((check) => check.id === id)?.status, "passed", `${id} 未通过`);
    }
    for (const file of ["DIFFICULTY_QUALITY_REPORT.json", "VARIATION_QUALITY_REPORT.json", "ASSISTANCE_QUALITY_REPORT.json"]) {
      assert.equal(existsSync(join(root, "_studio", file)), true, `缺少 ${file}`);
    }
    const progression = JSON.parse(readFileSync(join(root, "_studio", "DIFFICULTY_QUALITY_REPORT.json"), "utf8"));
    assert.equal(progression.levelsChecked, 20);
    assert.equal(progression.milestones.length, 5);
  } finally {
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("3D 自由生成模块同样执行合同教学平台", { skip: !browserQualityAvailable(), timeout: 40_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-generated-3d-onboarding-"));
  try {
    writeGeneratedArtifact(root, project3d(), { html: threeHtml, designNotes: "3D 浏览器教学样例", rounds: 1 });
    writeFileSync(join(root, "assets", "background.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
    const result = await inspectGeneratedGameInBrowser(root);
    for (const id of ["GEN-BROWSER-ONBOARDING", "PROGRESSION-RUNTIME", "CONTENT-VARIATION-REHEARSAL", "ASSISTANCE-RUNTIME"]) {
      assert.equal(result.checks.find((check) => check.id === id)?.status, "passed", `3D ${id} 未通过`);
    }
  } finally {
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});
