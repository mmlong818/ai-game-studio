import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptRoot, "..");
const assetRoot = join(projectRoot, "assets", "starter", "signal-studio");
const templateRoot = join(projectRoot, "assets", "templates");
const sampleRate = 44_100;

const atlasJob = readFileSync(join(templateRoot, "prompts", "gameplay-atlases.jsonl"), "utf8")
  .trim()
  .split(/\r?\n/)
  .map((line) => JSON.parse(line))
  .find((job) => job.out === "signal-studio-source.png") ?? {
    use_case: "stylized-concept",
    prompt: "Nine isolated assets for a coastal signal hunt and 3D ruin exploration game: signal orb, ruin fragment, explorer marker, exit emblem, floor texture, wall texture, fog wisp, capture ring and warning flare.",
    style: "high-end painted archaeological science-fiction game sprites",
    composition: "exact 3x3 equal-cell contact sheet with one centered asset per cell",
    lighting: "moonlit fog with coral and antique-gold emission",
    constraints: "uniform chroma-green background, no text, logo, watermark, overlap or edge crop",
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

  let noiseState = 0x4d595df4;
  const noise = () => {
    noiseState = (Math.imul(noiseState, 1_664_525) + 1_013_904_223) >>> 0;
    return noiseState / 0xffff_ffff * 2 - 1;
  };
  let filteredNoise = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    filteredNoise += (noise() - filteredNoise) * 0.004;
    const value = clamp(sampleAt(time, duration, filteredNoise));
    buffer.writeInt16LE(Math.round(value * 32_767), 44 + index * 2);
  }
  writeFileSync(join(assetRoot, filename), buffer);
}

function edgeFade(time, duration, seconds = 0.35) {
  return Math.min(1, time / seconds, (duration - time) / seconds);
}

function softPulse(time, start, length) {
  const local = time - start;
  if (local < 0 || local > length) return 0;
  return Math.sin(Math.PI * local / length) ** 2;
}

mkdirSync(assetRoot, { recursive: true });
mkdirSync(join(assetRoot, "prompts"), { recursive: true });
copyFileSync(join(templateRoot, "generated-atlases", "signal-studio.png"), join(assetRoot, "gameplay-atlas.png"));
const split = spawnSync("python", [
  join(projectRoot, "scripts", "split-template-atlas.py"),
  join(assetRoot, "gameplay-atlas.png"),
  join(assetRoot, "sprites"),
], { encoding: "utf8" });
if (split.status !== 0) throw new Error(`Failed to split signal atlas: ${split.error || split.stderr || split.stdout}`);
writeFileSync(join(assetRoot, "prompts", "gameplay-atlas.txt"), [
  `Use case: ${atlasJob.use_case}`,
  "Asset type: 3×3 game sprite and texture atlas",
  `Primary request: ${atlasJob.prompt}`,
  `Style/medium: ${atlasJob.style}`,
  `Composition/framing: ${atlasJob.composition}`,
  `Lighting/mood: ${atlasJob.lighting}`,
  `Constraints: ${atlasJob.constraints}`,
].join("\n") + "\n", "utf8");

writeMonoWav("ambient-loop.wav", 20, (time, duration, noise) => {
  const pad =
    Math.sin(Math.PI * 2 * 55 * time) * 0.026 +
    Math.sin(Math.PI * 2 * 82.5 * time + 0.8) * 0.018 +
    Math.sin(Math.PI * 2 * 110 * time + 1.6) * 0.01;
  const tide = 0.72 + Math.sin(Math.PI * 2 * time / 10) * 0.18;
  const beacon = [3.5, 8.5, 13.5, 18].reduce((sum, start) => {
    const envelope = softPulse(time, start, 1.4);
    return sum + envelope * Math.sin(Math.PI * 2 * 392 * time) * 0.025;
  }, 0);
  return edgeFade(time, duration) * (pad * tide + noise * 0.016 + beacon);
});

writeMonoWav("collect.wav", 0.26, (time, duration) => {
  const envelope = Math.sin(Math.PI * time / duration) ** 2;
  const frequency = 310 + time / duration * 250;
  return envelope * (Math.sin(Math.PI * 2 * frequency * time) * 0.28 + Math.sin(Math.PI * 4 * frequency * time) * 0.08);
});

writeMonoWav("warning.wav", 0.72, (time) => {
  const envelope = softPulse(time, 0, 0.25) + softPulse(time, 0.38, 0.25);
  return envelope * Math.sin(Math.PI * 2 * 174 * time) * 0.24;
});

writeMonoWav("victory.wav", 1.8, (time) => {
  const notes = [293.66, 369.99, 440, 587.33];
  const noteLength = 0.38;
  const noteIndex = Math.min(notes.length - 1, Math.floor(time / noteLength));
  const local = time - noteIndex * noteLength;
  const envelope = local < noteLength ? Math.sin(Math.PI * local / noteLength) ** 2 : Math.exp(-(time - 1.52) * 3);
  const frequency = notes[noteIndex];
  return envelope * (Math.sin(Math.PI * 2 * frequency * time) * 0.22 + Math.sin(Math.PI * 4 * frequency * time) * 0.07);
});

writeMonoWav("music.wav", 20, (time, duration) => edgeFade(time, duration) * (
  Math.sin(Math.PI * 2 * 55 * time) * .015
  + Math.sin(Math.PI * 2 * 82.5 * time + .8) * .01
));
writeMonoWav("ambient.wav", 20, (time, duration, noise) => edgeFade(time, duration) * (noise * .018 + Math.sin(Math.PI * 2 * .11 * time) * .008));
copyFileSync(join(assetRoot, "collect.wav"), join(assetRoot, "legal.wav"));
writeMonoWav("illegal.wav", .22, (time, duration, noise) => (1 - time / duration) ** 2 * (Math.sin(Math.PI * 2 * 150 * time) * .17 + noise * .05));
writeMonoWav("reward.wav", .48, (time, duration) => edgeFade(time, duration, .08) * (1 - time / duration) * Math.sin(Math.PI * 2 * (420 + time * 260) * time) * .2);
writeMonoWav("hit.wav", .12, (time, duration, noise) => (1 - time / duration) ** 3 * (noise * .14 + Math.sin(Math.PI * 2 * 125 * time) * .12));
copyFileSync(join(assetRoot, "warning.wav"), join(assetRoot, "defeat.wav"));
writeMonoWav("ui.wav", .09, (time, duration) => (1 - time / duration) ** 3 * Math.sin(Math.PI * 2 * 660 * time) * .12);

function sha256(filename) {
  return createHash("sha256").update(readFileSync(join(assetRoot, filename))).digest("hex");
}

function asset(filename, role, source, extra = {}) {
  return {
    filename,
    role,
    source,
    bytes: statSync(join(assetRoot, filename)).size,
    sha256: sha256(filename),
    ...extra,
  };
}

const manifest = {
  schemaVersion: 3,
  pack: "signal-studio",
  trackSystem: { music: "music.wav", ambient: "ambient.wav", gameplay: ["legal.wav", "illegal.wav", "reward.wav", "hit.wav", "victory.wav", "defeat.wav"], ui: "ui.wav" },
  generatedAt: new Date().toISOString(),
  assets: [
    asset("cover.png", "cover", "openai-image-api", { model: "gpt-image-2", promptFile: "prompts/cover.txt", width: 2048, height: 1152 }),
    asset("arena-background.png", "gameplay-background", "openai-image-api", { model: "gpt-image-2", promptFile: "prompts/arena-background.txt", width: 2048, height: 1152 }),
    asset("gameplay-atlas.png", "source-atlas", "openai-image-api+local-chroma-key", { model: "gpt-image-2", promptFile: "prompts/gameplay-atlas.txt", width: 1024, height: 1024, alphaChannel: true, layout: "3x3", deliveryUse: false }),
    ...["signal-target", "fragment", "player", "gate", "ground-texture", "ruin-texture", "legal-feedback", "illegal-feedback", "completion-feedback"].map((role, index) => asset(`sprites/sprite-${String(index + 1).padStart(2, "0")}.png`, `sprite-${role}`, "openai-image-api+local-role-extraction", { model: "gpt-image-2", promptFile: "prompts/gameplay-atlas.txt", width: 384, height: 384, targetSize: "384x384", alphaChannel: true, transparentBackground: true, safeCrop: "9% transparent padding", subjectRatio: "68-82%", sourceVersion: 1, sourceCell: index + 1 })),
    asset("music.wav", "music-track", "procedural-synthesis", { durationSeconds: 20, sampleRate }),
    asset("ambient.wav", "ambient-track", "procedural-synthesis", { durationSeconds: 20, sampleRate }),
    asset("legal.wav", "legal-sfx", "procedural-synthesis", { durationSeconds: .26, sampleRate }),
    asset("illegal.wav", "illegal-sfx", "procedural-synthesis", { durationSeconds: .22, sampleRate }),
    asset("reward.wav", "reward-sfx", "procedural-synthesis", { durationSeconds: .48, sampleRate }),
    asset("hit.wav", "hit-sfx", "procedural-synthesis", { durationSeconds: .12, sampleRate }),
    asset("victory.wav", "victory-sfx", "procedural-synthesis", { durationSeconds: 1.8, sampleRate }),
    asset("defeat.wav", "defeat-sfx", "procedural-synthesis", { durationSeconds: .72, sampleRate }),
    asset("ui.wav", "ui-sfx", "procedural-synthesis", { durationSeconds: .09, sampleRate }),
    asset("ambient-loop.wav", "legacy-ambient", "procedural-synthesis", { durationSeconds: 20, sampleRate }),
    asset("collect.wav", "legacy-collect", "procedural-synthesis", { durationSeconds: .26, sampleRate }),
    asset("warning.wav", "legacy-warning", "procedural-synthesis", { durationSeconds: .72, sampleRate }),
  ],
};

writeFileSync(join(assetRoot, "asset-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Generated ${manifest.assets.length} traced assets in ${assetRoot}`);
