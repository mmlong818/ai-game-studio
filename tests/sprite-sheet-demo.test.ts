import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

const demoDirectory = path.join(process.cwd(), "tests", "fixtures", "sprite-sheet-demo");

type Animation = {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  frameCount: number;
  anchor: { x: number; y: number };
  clips: Array<{ id: string; startFrame: number; frameCount: number }>;
};

async function readFrame(sheet: Buffer, animation: Animation, frameIndex: number) {
  const left = (frameIndex % animation.columns) * animation.frameWidth;
  const top = Math.floor(frameIndex / animation.columns) * animation.frameHeight;
  const { data, info } = await sharp(sheet)
    .extract({ left, top, width: animation.frameWidth, height: animation.frameHeight })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, info };
}

function inspectFrame(data: Buffer, width: number) {
  let opaque = 0;
  let transparent = 0;
  let shirt = 0;
  let skin = 0;
  let spell = 0;
  let maxOpaqueY = -1;

  for (let offset = 0; offset < data.length; offset += 4) {
    const [red, green, blue, alpha] = [data[offset]!, data[offset + 1]!, data[offset + 2]!, data[offset + 3]!];
    if (alpha === 0) transparent += 1;
    if (alpha > 180) {
      opaque += 1;
      maxOpaqueY = Math.max(maxOpaqueY, Math.floor(offset / 4 / width));
      if (red >= 30 && red <= 100 && green >= 85 && green <= 175 && blue >= 120 && blue <= 215) shirt += 1;
      if (red >= 175 && green >= 90 && green <= 190 && blue >= 55 && blue <= 150) skin += 1;
      if (red < 180 && green > 180 && blue > 180) spell += 1;
    }
  }
  return { opaque, transparent, shirt, skin, spell, maxOpaqueY };
}

test("programmatic adventurer demo has real character motion and stable grounded frames", async () => {
  const animation = JSON.parse(await readFile(path.join(demoDirectory, "animation.json"), "utf8")) as Animation;
  const sheet = await readFile(path.join(demoDirectory, "character-sheet.png"));
  const metadata = await sharp(sheet).metadata();

  assert.deepEqual(animation.clips.map(({ id, frameCount }) => ({ id, frameCount })), [
    { id: "idle", frameCount: 4 },
    { id: "run", frameCount: 4 },
    { id: "hit", frameCount: 4 },
    { id: "effect", frameCount: 4 },
  ]);
  assert.equal(metadata.width, animation.frameWidth * animation.columns);
  assert.equal(metadata.height, animation.frameHeight * animation.rows);

  const frames = await Promise.all(Array.from({ length: animation.frameCount }, (_, index) => readFrame(sheet, animation, index)));
  const inspections = frames.map(({ data, info }) => inspectFrame(data, info.width));

  for (const [index, frame] of inspections.entries()) {
    assert.ok(frame.opaque > 600, `frame ${index} should contain a visible figure`);
    assert.ok(frame.transparent > 4_000, `frame ${index} should retain transparent padding`);
    assert.ok(frame.shirt > 100, `frame ${index} should retain the adventurer's blue tunic`);
    assert.ok(frame.skin > 45, `frame ${index} should retain the same human character`);
    assert.ok(frame.maxOpaqueY >= animation.anchor.y - 2 && frame.maxOpaqueY <= animation.anchor.y, `frame ${index} should remain grounded at the shared foot anchor`);
  }

  const runFrames = frames.slice(4, 8).map(({ data }) => data.toString("base64"));
  assert.equal(new Set(runFrames).size, 4, "run frames should contain distinct limb poses");

  const effectFrames = inspections.slice(12, 16);
  assert.ok(effectFrames.every(({ shirt, skin }) => shirt > 100 && skin > 45), "every effect frame should still show the adventurer");
  assert.ok(effectFrames.every(({ spell }) => spell > 10), "every effect frame should show the spell around the adventurer");
  assert.ok(effectFrames.at(-1)!.spell > effectFrames[0]!.spell, "the spell should visibly grow through the clip");
});
