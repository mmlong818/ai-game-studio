import { useEffect, useMemo, useRef, useState } from "react";
import { createSpriteSheetPlayer } from "../shared/sprite-sheet-runtime";
import type { SpriteAnimationClipId, SpriteSheetAnimation } from "../shared/generated-blueprint";
import spriteAnimationDemoPng from "../web/assets/sprite-animation-adventurer-v2.png";
import { useComponentMessages } from "./component-i18n";

export type SpriteAnimationPreference = "auto" | "none";

/** This reviewed 4 × 4 PNG is packed by the server Sprite Sheet helper. */
export const spriteAnimationDemo: SpriteSheetAnimation = {
  frameWidth: 128,
  frameHeight: 128,
  columns: 4,
  rows: 4,
  frameCount: 16,
  anchor: { x: 64, y: 118 },
  clips: [
    { id: "idle", startFrame: 0, frameCount: 4, fps: 5, loop: true },
    { id: "run", startFrame: 4, frameCount: 4, fps: 10, loop: true },
    { id: "hit", startFrame: 8, frameCount: 4, fps: 9, loop: false },
    { id: "effect", startFrame: 12, frameCount: 4, fps: 12, loop: false },
  ],
};

// Versioned AI demo art is separate from the deterministic programmatic fixture.
// The preview always draws from a reviewed image source, never CSS art.
export const SPRITE_ANIMATION_DEMO_PNG = spriteAnimationDemoPng;

function clipEnds(animation: SpriteSheetAnimation, clipId: SpriteAnimationClipId, elapsedMs: number) {
  const clip = animation.clips.find(item => item.id === clipId)!;
  return !clip.loop && elapsedMs >= clip.frameCount * 1000 / clip.fps;
}

export function SpriteAnimationPreview({ label }: { label?: string }) {
  const t = useComponentMessages();
  const clipLabels: Record<SpriteAnimationClipId, string> = { idle: t("sprite.idle"), run: t("sprite.run"), hit: t("sprite.hit"), effect: t("sprite.effect") };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [clipId, setClipId] = useState<SpriteAnimationClipId>("idle");
  const [status, setStatus] = useState({ frame: 0, ended: false });
  const [speed, setSpeed] = useState(1);
  const image = useMemo(() => {
    if (!SPRITE_ANIMATION_DEMO_PNG) return null;
    const next = new Image();
    next.src = SPRITE_ANIMATION_DEMO_PNG;
    return next;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    let cancelled = false;
    let animationFrame = 0;
    const startedAt = performance.now();
    const player = createSpriteSheetPlayer(spriteAnimationDemo, clipId, startedAt);
    const render = (now: number) => {
      if (cancelled) return;
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#152338";
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "rgba(255,255,255,.18)";
      context.setLineDash([4, 4]);
      context.beginPath(); context.moveTo(18, height - 28); context.lineTo(width - 18, height - 28); context.stroke();
      context.setLineDash([]);
      const elapsed = (now - startedAt) * speed;
      const frame = player.draw(context, image, width / 2, height - 28, Math.min(0.9, width / 240), startedAt + elapsed);
      const ended = clipEnds(spriteAnimationDemo, clipId, elapsed);
      setStatus(current => current.frame === frame.frame && current.ended === ended ? current : { frame: frame.frame, ended });
      animationFrame = requestAnimationFrame(render);
    };
    const begin = () => { animationFrame = requestAnimationFrame(render); };
    if (image.complete) begin(); else image.addEventListener("load", begin, { once: true });
    return () => { cancelled = true; cancelAnimationFrame(animationFrame); image.removeEventListener("load", begin); };
  }, [clipId, image, speed]);

  const clip = spriteAnimationDemo.clips.find(item => item.id === clipId)!;
  return <section className="sprite-animation-preview" aria-label={label ?? t("sprite.previewLabel")}>
    <div className="sprite-animation-preview-heading"><span>{t("sprite.example")}</span><small>{t("sprite.exampleDetail")}</small></div>
    <canvas ref={canvasRef} role="img" aria-label={t("sprite.frameA11y", { clip: clipLabels[clipId], frame: status.frame + 1 })} />
    <div className="sprite-animation-actions" role="group" aria-label={t("sprite.actions")}>
      {spriteAnimationDemo.clips.map(item => <button key={item.id} type="button" className={item.id === clipId ? "is-selected" : undefined} onClick={() => { setStatus({ frame: item.startFrame, ended: false }); setClipId(item.id); }}>{clipLabels[item.id]}</button>)}
    </div>
    <label className="sprite-animation-speed">{t("sprite.speed")} <select value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
    <p aria-live="polite">{t("sprite.status", { clip: clipLabels[clipId], frame: status.frame - clip.startFrame + 1, total: clip.frameCount, fps: clip.fps, state: clip.loop ? t("sprite.loop") : status.ended ? t("sprite.ended") : t("sprite.once") })}</p>
  </section>;
}

export function SpriteAnimationChoice({ value, onChange }: { value: SpriteAnimationPreference; onChange: (value: SpriteAnimationPreference) => void }) {
  const t = useComponentMessages();
  return <fieldset className="sprite-animation-choice">
    <legend>{t("sprite.title")}</legend>
    <p>{t("sprite.detail")}</p>
    <div>
      <label className={value === "auto" ? "is-selected" : undefined}><input type="radio" name="sprite-animation" value="auto" checked={value === "auto"} onChange={() => onChange("auto")} /><span><strong>{t("sprite.auto")}</strong><small>{t("sprite.autoDetail")}</small></span></label>
      <label className={value === "none" ? "is-selected" : undefined}><input type="radio" name="sprite-animation" value="none" checked={value === "none"} onChange={() => onChange("none")} /><span><strong>{t("sprite.none")}</strong><small>{t("sprite.noneDetail")}</small></span></label>
    </div>
    {value === "auto" && <SpriteAnimationPreview />}
  </fieldset>;
}

export function SpriteClipChoice({ value, available, onChange }: { value: SpriteAnimationClipId; available: readonly SpriteAnimationClipId[]; onChange: (value: SpriteAnimationClipId) => void }) {
  const t = useComponentMessages();
  const clipLabels: Record<SpriteAnimationClipId, string> = { idle: t("sprite.idle"), run: t("sprite.run"), hit: t("sprite.hit"), effect: t("sprite.effect") };
  return <fieldset className="sprite-clip-choice">
    <legend>{t("sprite.replace")}</legend>
    <p>{t("sprite.replaceDetail")}</p>
    <div role="radiogroup" aria-label={t("sprite.replaceGroup")}>
      {available.map(clipId => <label className={value === clipId ? "is-selected" : undefined} key={clipId}><input type="radio" name="sprite-clip" value={clipId} checked={value === clipId} onChange={() => onChange(clipId)} /><span>{clipLabels[clipId]}</span></label>)}
    </div>
  </fieldset>;
}
