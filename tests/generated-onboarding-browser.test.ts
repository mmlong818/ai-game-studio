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
