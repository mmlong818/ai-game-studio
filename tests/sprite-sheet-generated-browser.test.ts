import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { browserQualityAvailable, inspectGeneratedGameInBrowser } from "../src/server/browser-quality";
import { inspectGeneratedArtifact, writeGeneratedArtifact } from "../src/server/game-generator";
import { generateGameSpec, type ProjectDetail } from "../src/shared/contracts";
import { createGameDesignContractForLegacyProject } from "../src/shared/game-design-contract/from-legacy";
import { DESIGN_MODIFIERS, MECHANIC_ATLAS } from "../src/shared/game-design-knowledge/mechanic-atlas";
import { generatedDesignHtml } from "./generated-design-fixture";

test("generated Sprite Sheet从蓝图进入平台播放器并在浏览器产生真实帧推进", { skip: !browserQualityAvailable(), timeout: 60_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "generated-sprite-sheet-"));
  try {
    const base = generateGameSpec({ idea: "守夜人奔跑躲开雾兽并收集灯芯，抵达灯塔即完成。", template: "generated", dimensions: "2d", spriteAnimation: "auto" });
    const animation = { frameWidth: 64, frameHeight: 64, columns: 4, rows: 1, frameCount: 4, anchor: { x: 32, y: 58 }, clips: [{ id: "run" as const, startFrame: 0, frameCount: 4, fps: 8, loop: true }] };
    base.designProfile = { ...base.designProfile, generatedBlueprint: {
      mechanicIds: [MECHANIC_ATLAS[0].id], modifierIds: [DESIGN_MODIFIERS[0].id],
      coreDecision: "每次冲刺前要判断先捡近处灯芯，还是冒险穿过雾兽去拿高价值灯芯。",
      tension: "雾兽巡逻会改变安全路线，错误时机会迫使玩家绕远路。",
      masterySignal: "熟练玩家抓住巡逻空隙连续奔跑，以更短路线收齐灯芯。",
      sprites: [
        { file: "assets/hero.png", role: "守夜人", hint: "提灯奔跑的守夜人，深色斗篷和暖色灯光", animation },
        { file: "assets/wick.png", role: "灯芯", hint: "轮廓清楚的金色发光灯芯，透明背景" },
      ],
    } };
    base.designContract = createGameDesignContractForLegacyProject({ projectId: "sprite-demo", title: "动画守夜人", idea: base.vision, createdAt: "2026-09-11T00:00:00.000Z", spec: base });
    const project = { id: "sprite-demo", title: "动画守夜人", version: { id: "sprite-v1" }, spec: base } as unknown as ProjectDetail;
    const animationJson = JSON.stringify(animation);
    const animatedHtml = generatedDesignHtml("mechanic-1-completed").replace("<script>", `<script>
const heroImage=new Image();heroImage.src="./assets/hero.png";
const wickImage=new Image();wickImage.src="./assets/wick.png";
const heroPlayer=window.__FORGE_SPRITES__.create(heroImage,${animationJson},"run");heroPlayer.play("run");
const heroContext=document.querySelector("#game-canvas").getContext("2d");
function renderHero(now){heroContext.clearRect(0,0,720,540);if(heroImage.complete&&heroImage.naturalWidth)heroPlayer.draw(heroContext,180,220,1,now);requestAnimationFrame(renderHero)}requestAnimationFrame(renderHero);
`);
    writeGeneratedArtifact(root, project, { html: animatedHtml, designNotes: "真实Sprite Sheet播放夹具", rounds: 1 });
    mkdirSync(join(root, "assets"), { recursive: true });
    const sheet = await sharp({ create: { width: 256, height: 64, channels: 4, background: "#00000000" } }).composite([0, 1, 2, 3].map(index => ({ input: { create: { width: 42, height: 54, channels: 4, background: index % 2 ? "#f0a030ff" : "#50a0e0ff" } }, left: index * 64 + 11, top: 6 }))).png().toBuffer();
    const staticSprite = await sharp({ create: { width: 64, height: 64, channels: 4, background: "#f0d050ff" } }).png().toBuffer();
    writeFileSync(join(root, "assets", "hero.png"), sheet);
    writeFileSync(join(root, "assets", "wick.png"), staticSprite);
    writeFileSync(join(root, "assets", "background.png"), staticSprite);
    inspectGeneratedArtifact(root, { requireAiArt: false, expectedBlueprint: base.designProfile.generatedBlueprint });
    const result = await inspectGeneratedGameInBrowser(root, { expectedBlueprint: base.designProfile.generatedBlueprint });
    assert.equal(result.checks.find(check => check.id === "GEN-BROWSER-VISUAL")?.status, "passed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
