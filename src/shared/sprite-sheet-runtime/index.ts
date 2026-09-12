import type { SpriteAnimationClipId, SpriteSheetAnimation } from "../generated-blueprint.js";

export type SpriteSheetFrame = {
  clipId: SpriteAnimationClipId;
  frame: number;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
};

export function spriteSheetFrame(animation: SpriteSheetAnimation, clipId: SpriteAnimationClipId, elapsedMs: number): SpriteSheetFrame {
  const clip = animation.clips.find(candidate => candidate.id === clipId);
  if (!clip) throw new Error(`Sprite Sheet 没有动作 ${clipId}。`);
  const advanced = Math.max(0, Math.floor(Math.max(0, elapsedMs) * clip.fps / 1000));
  const offset = clip.loop ? advanced % clip.frameCount : Math.min(advanced, clip.frameCount - 1);
  const frame = clip.startFrame + offset;
  return {
    clipId,
    frame,
    sourceX: (frame % animation.columns) * animation.frameWidth,
    sourceY: Math.floor(frame / animation.columns) * animation.frameHeight,
    sourceWidth: animation.frameWidth,
    sourceHeight: animation.frameHeight,
  };
}

export function createSpriteSheetPlayer(animation: SpriteSheetAnimation, initialClip: SpriteAnimationClipId = animation.clips[0].id, startedAt = 0) {
  let clipId = initialClip;
  let clipStartedAt = startedAt;
  return {
    play(nextClip: SpriteAnimationClipId, now = performance.now(), restart = false) {
      if (!animation.clips.some(clip => clip.id === nextClip)) throw new Error(`Sprite Sheet 没有动作 ${nextClip}。`);
      if (restart || nextClip !== clipId) { clipId = nextClip; clipStartedAt = now; }
    },
    frame(now = performance.now()) { return spriteSheetFrame(animation, clipId, now - clipStartedAt); },
    draw(context: CanvasRenderingContext2D, image: CanvasImageSource, anchorX: number, anchorY: number, scale = 1, now = performance.now()) {
      const frame = spriteSheetFrame(animation, clipId, now - clipStartedAt);
      const width = frame.sourceWidth * scale;
      const height = frame.sourceHeight * scale;
      context.drawImage(image, frame.sourceX, frame.sourceY, frame.sourceWidth, frame.sourceHeight, anchorX - animation.anchor.x * scale, anchorY - animation.anchor.y * scale, width, height);
      return frame;
    },
    get clipId() { return clipId; },
  };
}

/** Self-contained browser runtime injected before generated game code. */
export const spriteSheetRuntimeScript = String.raw`(() => {
  const registered = window.__FORGE_SPRITE_SPECS__ || {};
  const resolveAnimation = (image, candidate) => {
    const complete = candidate && ["frameWidth", "frameHeight", "columns", "rows", "frameCount"].every(key => Number.isFinite(candidate[key]) && candidate[key] > 0)
      && candidate.anchor && Number.isFinite(candidate.anchor.x) && Number.isFinite(candidate.anchor.y)
      && Array.isArray(candidate.clips) && candidate.clips.length && candidate.clips.every(clip => clip && typeof clip.id === "string" && Number.isFinite(clip.startFrame) && Number.isFinite(clip.frameCount) && Number.isFinite(clip.fps));
    if (complete) return candidate;
    const rawSource = String(image?.currentSrc || image?.src || "");
    let sourcePath = rawSource;
    try { sourcePath = decodeURIComponent(new URL(rawSource, location.href).pathname); } catch {}
    const file = Object.keys(registered).find(path => sourcePath === "/" + path || sourcePath.endsWith("/" + path));
    if (!file) throw new Error("Sprite Sheet 缺少平台登记的动画合同。");
    return registered[file];
  };
  const frameAt = (animation, clipId, elapsedMs) => {
    const clip = animation.clips.find(candidate => candidate.id === clipId);
    if (!clip) throw new Error("Sprite Sheet 没有动作 " + clipId + "。");
    const advanced = Math.max(0, Math.floor(Math.max(0, elapsedMs) * clip.fps / 1000));
    const offset = clip.loop ? advanced % clip.frameCount : Math.min(advanced, clip.frameCount - 1);
    const frame = clip.startFrame + offset;
    return { clipId, frame, sourceX: frame % animation.columns * animation.frameWidth, sourceY: Math.floor(frame / animation.columns) * animation.frameHeight, sourceWidth: animation.frameWidth, sourceHeight: animation.frameHeight };
  };
  window.__FORGE_SPRITES__ = Object.freeze({
    create(image, animation, initialClip) {
      animation = resolveAnimation(image, animation);
      let clipId = initialClip || animation.clips[0].id;
      let clipStartedAt = performance.now();
      return {
        play(nextClip, now = performance.now(), restart = false) {
          if (!animation.clips.some(clip => clip.id === nextClip)) throw new Error("Sprite Sheet 没有动作 " + nextClip + "。");
          if (restart || nextClip !== clipId) { clipId = nextClip; clipStartedAt = now; }
        },
        frame(now = performance.now()) { return frameAt(animation, clipId, now - clipStartedAt); },
        draw(context, anchorX, anchorY, scale = 1, now = performance.now()) {
          const frame = frameAt(animation, clipId, now - clipStartedAt);
          context.drawImage(image, frame.sourceX, frame.sourceY, frame.sourceWidth, frame.sourceHeight, anchorX - animation.anchor.x * scale, anchorY - animation.anchor.y * scale, frame.sourceWidth * scale, frame.sourceHeight * scale);
          return frame;
        },
        get clipId() { return clipId; }
      };
    }
  });
})();`;

/** Register validated blueprint metadata before the player runtime. Generated code may pass it explicitly or let the platform recover it by image URL. */
export function spriteSheetRuntimeWithRegistry(entries: Array<{ file: string; animation: SpriteSheetAnimation }>): string {
  const registry = Object.fromEntries(entries.map(({ file, animation }) => [file, animation]));
  return `window.__FORGE_SPRITE_SPECS__ = Object.freeze(${JSON.stringify(registry)});\n${spriteSheetRuntimeScript}`;
}
