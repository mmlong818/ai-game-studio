import { useEffect, useMemo, useRef, useState } from "react";
import { createSpriteSheetPlayer } from "../shared/sprite-sheet-runtime";
import type { SpriteAnimationClipId, SpriteSheetAnimation } from "../shared/generated-blueprint";
import spriteAnimationDemoPng from "../web/assets/sprite-animation-adventurer-v2.png";

export type SpriteAnimationPreference = "auto" | "none";

const clipLabels: Record<SpriteAnimationClipId, string> = {
  idle: "待机",
  run: "移动",
  hit: "受击",
  effect: "特效",
};

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

export function SpriteAnimationPreview({ label = "Sprite Sheet 播放预览" }: { label?: string }) {
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
  return <section className="sprite-animation-preview" aria-label={label}>
    <div className="sprite-animation-preview-heading"><span>可播放示例</span><small>示例动画，可切换动作查看效果</small></div>
    <canvas ref={canvasRef} role="img" aria-label={`${clipLabels[clipId]}动作第 ${status.frame + 1} 帧`} />
    <div className="sprite-animation-actions" role="group" aria-label="预览动作">
      {spriteAnimationDemo.clips.map(item => <button key={item.id} type="button" className={item.id === clipId ? "is-selected" : undefined} onClick={() => { setStatus({ frame: item.startFrame, ended: false }); setClipId(item.id); }}>{clipLabels[item.id]}</button>)}
    </div>
    <label className="sprite-animation-speed">预览速度 <select value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
    <p aria-live="polite">{clipLabels[clipId]} · 第 {status.frame - clip.startFrame + 1}/{clip.frameCount} 帧 · {clip.fps} fps · {clip.loop ? "循环播放" : status.ended ? "已停在最后一帧" : "播放一次后停在最后一帧"}</p>
  </section>;
}

export function SpriteAnimationChoice({ value, onChange }: { value: SpriteAnimationPreference; onChange: (value: SpriteAnimationPreference) => void }) {
  return <fieldset className="sprite-animation-choice">
    <legend>角色和短特效要动起来吗？</legend>
    <p>适合 2D 角色、持续运动物和命中特效。平台会把每个动作做成 4–8 帧的透明底图集，并在游戏中播放。</p>
    <div>
      <label className={value === "auto" ? "is-selected" : undefined}><input type="radio" name="sprite-animation" value="auto" checked={value === "auto"} onChange={() => onChange("auto")} /><span><strong>适用时生成可播放动画</strong><small>为适合的角色或特效自动安排待机、移动、受击或短特效。</small></span></label>
      <label className={value === "none" ? "is-selected" : undefined}><input type="radio" name="sprite-animation" value="none" checked={value === "none"} onChange={() => onChange("none")} /><span><strong>这次使用静态图片</strong><small>适合以静态道具和界面元素为主的游戏。</small></span></label>
    </div>
    {value === "auto" && <SpriteAnimationPreview />}
  </fieldset>;
}

export function SpriteClipChoice({ value, available, onChange }: { value: SpriteAnimationClipId; available: readonly SpriteAnimationClipId[]; onChange: (value: SpriteAnimationClipId) => void }) {
  return <fieldset className="sprite-clip-choice">
    <legend>要替换哪段动画？</legend>
    <p>这款游戏已有可播放图集。只替换一段动作，其余动作和玩法会保留。</p>
    <div role="radiogroup" aria-label="要替换的动画">
      {available.map(clipId => <label className={value === clipId ? "is-selected" : undefined} key={clipId}><input type="radio" name="sprite-clip" value={clipId} checked={value === clipId} onChange={() => onChange(clipId)} /><span>{clipLabels[clipId]}</span></label>)}
    </div>
  </fieldset>;
}
