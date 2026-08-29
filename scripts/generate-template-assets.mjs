import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = join(projectRoot, "assets", "templates");
const generatedRoot = join(templateRoot, "generated");
const generatedAtlasRoot = join(templateRoot, "generated-atlases");
const generatedLevelRoot = join(templateRoot, "generated-levels");
const packRoot = join(templateRoot, "packs");
const promptJobs = readFileSync(join(templateRoot, "prompts", "games.jsonl"), "utf8")
  .trim()
  .split(/\r?\n/)
  .map((line) => JSON.parse(line));
const atlasJobs = new Map(readFileSync(join(templateRoot, "prompts", "gameplay-atlases.jsonl"), "utf8")
  .trim()
  .split(/\r?\n/)
  .map((line) => JSON.parse(line))
  .map((job) => [job.out.replace(/-source\.png$/, ""), job]));
const sampleRate = 44_100;

const spriteRoles = {
  tetris: ["primary-piece-a", "primary-piece-b", "primary-piece-c", "primary-piece-d", "primary-piece-e", "primary-piece-f", "primary-piece-g", "score-feedback", "legal-feedback"],
  puzzle: ["primary-piece-a", "primary-piece-b", "primary-piece-c", "primary-piece-d", "board-decoration", "selection-marker", "secondary-decoration-a", "secondary-decoration-b", "completion-feedback"],
  breakout: ["primary-brick-a", "primary-brick-b", "primary-brick-c", "obstacle-brick", "player-paddle", "interactive-ball", "hit-feedback", "secondary-character", "completion-feedback"],
  klotski: ["player-piece", "obstacle-piece-a", "obstacle-piece-b", "obstacle-piece-c", "secondary-piece-a", "secondary-piece-b", "board-decoration", "completion-marker", "legal-feedback"],
  maze: ["obstacle-wall", "path-marker", "player-character", "completion-marker", "interactive-object-a", "interactive-object-b", "secondary-decoration", "legal-feedback", "illegal-feedback"],
  snake: ["player-head", "player-body-a", "player-body-b", "interactive-food", "reward-feedback", "secondary-decoration-a", "secondary-decoration-b", "speed-feedback", "player-tail"],
  "merge-2048": ["empty-tile", "primary-tile-a", "primary-tile-b", "primary-tile-c", "primary-tile-d", "primary-tile-e", "primary-tile-f", "merge-feedback", "reward-feedback"],
  platformer: ["player-right", "player-left", "platform-a", "platform-b", "interactive-collectible", "completion-marker", "patrol-enemy", "dash-crystal", "checkpoint-pennant"],
  "space-shooter": ["player-character", "enemy-character", "elite-enemy", "player-projectile", "enemy-projectile", "hit-feedback", "interactive-pickup", "movement-feedback", "secondary-decoration"],
  "polyomino-fit": ["primary-piece-a", "primary-piece-b", "primary-piece-c", "primary-piece-d", "primary-piece-e", "primary-piece-f", "legal-feedback", "hint-feedback", "completion-feedback"],
  "block-place": ["primary-piece-a", "primary-piece-b", "primary-piece-c", "primary-piece-d", "primary-piece-e", "score-feedback", "combo-feedback", "illegal-feedback", "completion-feedback"],
  "region-logic": ["primary-token-a", "primary-token-b", "primary-token-c", "primary-token-d", "primary-token-e", "rule-marker", "hint-feedback", "illegal-feedback", "completion-feedback"],
  "mahjong-roguelite": ["primary-motif-a", "primary-motif-b", "primary-motif-c", "primary-motif-d", "primary-motif-e", "primary-motif-f", "primary-motif-g", "primary-motif-h", "primary-motif-i"],
};

const soundProfiles = {
  tetris: { root: 73.42, pulse: 2, color: "geometric glass pulse" },
  puzzle: { root: 196, pulse: 0.75, color: "botanical glass and paper" },
  breakout: { root: 55, pulse: 1.25, color: "lacquer sea and mineral bell" },
  klotski: { root: 98, pulse: 0.5, color: "wood, lacquer and restrained drum" },
  maze: { root: 146.83, pulse: 0.4, color: "wind, reed and distant lantern" },
  snake: { root: 110, pulse: 1.6, color: "jade percussion and garden rhythm" },
  "merge-2048": { root: 82.41, pulse: 1.1, color: "brass grid, glass merge and restrained pulse" },
  platformer: { root: 130.81, pulse: 1.35, color: "open air, mineral steps and elastic landing" },
  "space-shooter": { root: 65.41, pulse: 2.4, color: "orbital engine, signal burst and clipped percussion" },
  "polyomino-fit": { root: 174.61, pulse: .72, color: "soft jelly, water droplets and warm glass chimes" },
  "block-place": { root: 87.31, pulse: 1.8, color: "gummy percussion, bright pops and playful kitchen rhythm" },
  "region-logic": { root: 146.83, pulse: .52, color: "felt texture, tiny bells and quiet deductive pulse" },
  "mahjong-roguelite": { root: 110, pulse: .68, color: "coastal ceramic clicks, moonlit tide and compact travel chimes" },
};

function clamp(value) {
  return Math.max(-1, Math.min(1, value));
}

function writeMonoWav(filename, duration, sampleAt) {
  const sampleCount = Math.floor(duration * sampleRate);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  let noiseState = 0x5f3759df;
  let filteredNoise = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    noiseState = (Math.imul(noiseState, 1_664_525) + 1_013_904_223) >>> 0;
    const noise = noiseState / 0xffff_ffff * 2 - 1;
    filteredNoise += (noise - filteredNoise) * 0.003;
    const time = index / sampleRate;
    buffer.writeInt16LE(Math.round(clamp(sampleAt(time, duration, filteredNoise)) * 32_767), 44 + index * 2);
  }
  writeFileSync(filename, buffer);
}

function envelope(time, duration) {
  return Math.max(0, Math.min(1, time / 0.18, (duration - time) / 0.25));
}

function sha256(filename) {
  return createHash("sha256").update(readFileSync(filename)).digest("hex");
}

function tracedAsset(root, filename, role, source, extra = {}) {
  const path = join(root, filename);
  return { filename, role, source, bytes: statSync(path).size, sha256: sha256(path), ...extra };
}

function visualAsset(root, filename, role, source, extra = {}) {
  return tracedAsset(root, filename, role, source, {
    usage: role.replaceAll("-", " "),
    targetSize: extra.alphaChannel ? "384x384" : "1024x1536",
    transparentBackground: Boolean(extra.alphaChannel),
    safeCrop: extra.alphaChannel ? "9% transparent padding" : "center 72% safe area",
    subjectRatio: extra.alphaChannel ? "68-82%" : "55-78%",
    sourceVersion: 1,
    ...extra,
  });
}

function atlasPrompt(job) {
  return [
    `Use case: ${job.use_case}`,
    "Asset type: 3×3 game sprite atlas",
    `Primary request: ${job.prompt}`,
    `Style/medium: ${job.style}`,
    `Composition/framing: ${job.composition}`,
    `Lighting/mood: ${job.lighting}`,
    `Constraints: ${job.constraints}`,
  ].join("\n") + "\n";
}

function generateAudio(root, profile) {
  writeMonoWav(join(root, "music.wav"), 12, (time, duration, noise) => {
    const fade = envelope(time, duration);
    const step = Math.floor(time * profile.pulse * 2) % 8;
    const notes = [1, 1.25, 1.5, 1.25, 1, 1.5, 2, 1.5];
    const note = profile.root * notes[step];
    const pad = Math.sin(Math.PI * 2 * note * time) * .014 + Math.sin(Math.PI * 2 * note * .5 * time) * .012;
    return fade * (pad + noise * .004);
  });
  writeMonoWav(join(root, "ambient.wav"), 12, (time, duration, noise) => {
    const fade = envelope(time, duration);
    const tide = 0.72 + Math.sin(Math.PI * 2 * time / 6) * 0.2;
    const pulse = Math.max(0, Math.sin(Math.PI * 2 * profile.pulse * time)) ** 8;
    const drone = Math.sin(Math.PI * 2 * profile.root * time) * 0.025 + Math.sin(Math.PI * 2 * profile.root * 1.5 * time + .8) * 0.014;
    const bell = pulse * Math.sin(Math.PI * 2 * profile.root * 4 * time) * 0.018;
    return fade * (drone * tide + bell + noise * 0.012);
  });
  writeMonoWav(join(root, "legal.wav"), .16, (time, duration) => {
    const fade = Math.sin(Math.PI * time / duration) ** 2;
    return fade * Math.sin(Math.PI * 2 * (profile.root * 3 + time * 420) * time) * .24;
  });
  writeMonoWav(join(root, "victory.wav"), 1.25, (time, duration) => {
    const notes = [1, 1.25, 1.5, 2];
    const index = Math.min(notes.length - 1, Math.floor(time / .3));
    const local = time - index * .3;
    const fade = Math.sin(Math.PI * Math.min(1, local / .3)) ** 2 * envelope(time, duration);
    return fade * (Math.sin(Math.PI * 2 * profile.root * 3 * notes[index] * time) * .24 + Math.sin(Math.PI * 4 * profile.root * notes[index] * time) * .05);
  });
  writeMonoWav(join(root, "defeat.wav"), .62, (time, duration) => {
    const fade = envelope(time, duration) * (1 - time / duration);
    return fade * Math.sin(Math.PI * 2 * (profile.root * 2.2 - time * profile.root) * time) * .22;
  });
  writeMonoWav(join(root, "illegal.wav"), .22, (time, duration, noise) => {
    const fade = (1 - time / duration) ** 2;
    return fade * (Math.sin(Math.PI * 2 * (profile.root * 1.6 - time * 90) * time) * .16 + noise * .04);
  });
  writeMonoWav(join(root, "reward.wav"), .48, (time, duration) => {
    const fade = envelope(time, duration) * (1 - time / duration);
    return fade * (Math.sin(Math.PI * 2 * profile.root * 4 * time) * .18 + Math.sin(Math.PI * 2 * profile.root * 6 * time) * .08);
  });
  writeMonoWav(join(root, "hit.wav"), .12, (time, duration, noise) => {
    const fade = (1 - time / duration) ** 3;
    return fade * (Math.sin(Math.PI * 2 * profile.root * 2.2 * time) * .14 + noise * .13);
  });
  writeMonoWav(join(root, "ui.wav"), .09, (time, duration) => {
    const fade = (1 - time / duration) ** 3;
    return fade * Math.sin(Math.PI * 2 * profile.root * 5 * time) * .13;
  });
}

function preserveStageCAssets(root, manifest) {
  const stageManifestPath = join(root, "stage-c", "manifest.json");
  if (!existsSync(stageManifestPath)) return;
  const stageManifest = JSON.parse(readFileSync(stageManifestPath, "utf8"));
  manifest.assets.push(...stageManifest.assets);
  manifest.stageCGeneration = {
    batch: stageManifest.batch,
    model: stageManifest.model,
    sourceImageSha256: stageManifest.sourceImageSha256,
    promptFile: "stage-c/prompt.json",
    assetCount: stageManifest.assets.length,
  };
}

for (const job of promptJobs) {
  const template = job.out.replace(/\.png$/, "");
  const root = join(packRoot, template);
  const profile = soundProfiles[template];
  const atlasJob = atlasJobs.get(template);
  if (!atlasJob) throw new Error(`Missing gameplay atlas prompt for ${template}`);
  mkdirSync(root, { recursive: true });
  copyFileSync(join(generatedRoot, job.out), join(root, "cover.png"));
  copyFileSync(join(generatedAtlasRoot, `${template}.png`), join(root, "gameplay-atlas.png"));
  const split = spawnSync("python", [
    join(projectRoot, "scripts", "split-template-atlas.py"),
    join(root, "gameplay-atlas.png"),
    join(root, "sprites"),
    "--cover", join(root, "cover.png"),
    "--background", join(root, "background.png"),
  ], { encoding: "utf8" });
  if (split.status !== 0) throw new Error(`Failed to split ${template} atlas: ${split.stderr || split.stdout}`);
  if (template === "puzzle") {
    for (let index = 1; index <= 20; index += 1) {
      const filename = `level-gallery-${String(index).padStart(2, "0")}.png`;
      copyFileSync(join(generatedLevelRoot, "puzzle", filename), join(root, filename));
    }
    copyFileSync(join(templateRoot, "prompts", "puzzle-levels.jsonl"), join(root, "puzzle-levels.jsonl"));
  }
  if (template === "breakout") {
    for (const filename of ["level-coral-gate.png", "level-jellyfish-tide.png", "level-star-reef.png", "level-abyss-crown.png"]) {
      copyFileSync(join(generatedLevelRoot, "breakout", filename), join(root, filename));
    }
    copyFileSync(join(templateRoot, "prompts", "breakout-levels.jsonl"), join(root, "breakout-levels.jsonl"));
  }
  if (template === "klotski") {
    copyFileSync(join(generatedLevelRoot, "klotski", "klotski-courtyard.png"), join(root, "klotski-courtyard.png"));
    copyFileSync(join(templateRoot, "prompts", "klotski-effects.jsonl"), join(root, "klotski-effects.jsonl"));
  }
  writeFileSync(join(root, "prompt.txt"), `Use case: stylized-concept\nPrimary request: ${job.prompt}\n`, "utf8");
  writeFileSync(join(root, "gameplay-atlas.txt"), atlasPrompt(atlasJob), "utf8");
  generateAudio(root, profile);
  const manifest = {
    schemaVersion: 3,
    template,
    audioDirection: profile.color,
    trackSystem: { music: "music.wav", ambient: "ambient.wav", gameplay: ["legal.wav", "illegal.wav", "reward.wav", "hit.wav", "victory.wav", "defeat.wav"], ui: "ui.wav" },
    generatedAt: new Date().toISOString(),
    assets: [
      visualAsset(root, "cover.png", "cover", "openai-image-api", { model: "gpt-image-2", width: 1024, height: 1536, promptFile: "prompt.txt" }),
      visualAsset(root, "background.png", "gameplay-background", "openai-image-api+local-derivative", { model: "gpt-image-2", width: 1024, height: 1536, promptFile: "prompt.txt", derivative: "reduced-frequency-background" }),
      tracedAsset(root, "gameplay-atlas.png", "source-atlas", "openai-image-api+local-chroma-key", { model: "gpt-image-2", width: 1024, height: 1024, promptFile: "gameplay-atlas.txt", alphaChannel: true, layout: "3x3", deliveryUse: false, ...(template === "mahjong-roguelite" ? { generationMode: "text-only", backgroundRemoval: "local-hard-key-contract-feather", spriteContent: "transparent-motif-only", sourceVersion: 2 } : {}) }),
      ...spriteRoles[template].map((role, index) => visualAsset(root, `sprites/sprite-${String(index + 1).padStart(2, "0")}.png`, `sprite-${role}`, "openai-image-api+local-role-extraction", { model: "gpt-image-2", width: 384, height: 384, promptFile: "gameplay-atlas.txt", alphaChannel: true, sourceCell: index + 1, ...(template === "mahjong-roguelite" ? { sourceVersion: 2, spriteContent: "transparent-motif-only" } : {}) })),
      ...(template === "puzzle" ? [
        ...Array.from({ length: 20 }, (_, index) => {
          const levelNumber = String(index + 1).padStart(2, "0");
          return tracedAsset(root, `level-gallery-${levelNumber}.png`, "puzzle-level", "openai-image-api", { model: "gpt-image-2", width: 1024, height: 1536, promptFile: "puzzle-levels.jsonl", levelId: `gallery-${levelNumber}` });
        }),
      ] : []),
      ...(template === "breakout" ? [
        tracedAsset(root, "level-coral-gate.png", "level-background", "openai-image-api", { model: "gpt-image-2", width: 1024, height: 1536, promptFile: "breakout-levels.jsonl", levelId: "coral-gate" }),
        tracedAsset(root, "level-jellyfish-tide.png", "level-background", "openai-image-api", { model: "gpt-image-2", width: 1024, height: 1536, promptFile: "breakout-levels.jsonl", levelId: "jellyfish-tide" }),
        tracedAsset(root, "level-star-reef.png", "level-background", "openai-image-api", { model: "gpt-image-2", width: 1024, height: 1536, promptFile: "breakout-levels.jsonl", levelId: "star-reef" }),
        tracedAsset(root, "level-abyss-crown.png", "level-background", "openai-image-api", { model: "gpt-image-2", width: 1024, height: 1536, promptFile: "breakout-levels.jsonl", levelId: "abyss-crown" }),
      ] : []),
      ...(template === "klotski" ? [
        tracedAsset(root, "klotski-courtyard.png", "gameplay-background", "openai-image-api", { model: "gpt-image-2", width: 1024, height: 1536, promptFile: "klotski-effects.jsonl" }),
      ] : []),
      tracedAsset(root, "music.wav", "music-track", "procedural-synthesis", { durationSeconds: 12, sampleRate }),
      tracedAsset(root, "ambient.wav", "ambient-track", "procedural-synthesis", { durationSeconds: 12, sampleRate }),
      tracedAsset(root, "legal.wav", "legal-sfx", "procedural-synthesis", { durationSeconds: .16, sampleRate }),
      tracedAsset(root, "illegal.wav", "illegal-sfx", "procedural-synthesis", { durationSeconds: .22, sampleRate }),
      tracedAsset(root, "reward.wav", "reward-sfx", "procedural-synthesis", { durationSeconds: .48, sampleRate }),
      tracedAsset(root, "hit.wav", "hit-sfx", "procedural-synthesis", { durationSeconds: .12, sampleRate }),
      tracedAsset(root, "victory.wav", "victory-sfx", "procedural-synthesis", { durationSeconds: 1.25, sampleRate }),
      tracedAsset(root, "defeat.wav", "defeat-sfx", "procedural-synthesis", { durationSeconds: .62, sampleRate }),
      tracedAsset(root, "ui.wav", "ui-sfx", "procedural-synthesis", { durationSeconds: .09, sampleRate }),
    ],
  };
  preserveStageCAssets(root, manifest);
  writeFileSync(join(root, "asset-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

console.log(`Generated ${promptJobs.length} artistic template packs in ${packRoot}`);
