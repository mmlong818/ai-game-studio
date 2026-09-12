import { describe, expect, it, vi } from "vitest";
import type { SpriteSheetAnimation } from "../generated-blueprint";
import { createSpriteSheetPlayer, spriteSheetFrame, spriteSheetRuntimeWithRegistry } from ".";

const animation: SpriteSheetAnimation = {
  frameWidth: 64, frameHeight: 48, columns: 4, rows: 2, frameCount: 8,
  anchor: { x: 32, y: 44 },
  clips: [
    { id: "idle", startFrame: 0, frameCount: 4, fps: 4, loop: true },
    { id: "hit", startFrame: 4, frameCount: 4, fps: 8, loop: false },
  ],
};

describe("Sprite Sheet播放器", () => {
  it("按row-major和动作时钟选择帧，循环与单次动作边界正确", () => {
    expect(spriteSheetFrame(animation, "idle", 750)).toMatchObject({ frame: 3, sourceX: 192, sourceY: 0 });
    expect(spriteSheetFrame(animation, "idle", 1000)).toMatchObject({ frame: 0, sourceX: 0, sourceY: 0 });
    expect(spriteSheetFrame(animation, "hit", 10_000)).toMatchObject({ frame: 7, sourceX: 192, sourceY: 48 });
  });

  it("统一draw使用九参数source rect并按锚点定位", () => {
    const drawImage = vi.fn();
    const player = createSpriteSheetPlayer(animation, "idle", 0);
    player.draw({ drawImage } as unknown as CanvasRenderingContext2D, {} as CanvasImageSource, 100, 120, 2, 750);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 192, 0, 64, 48, 36, 32, 128, 96);
    player.play("hit", 1000);
    expect(player.frame(1125)).toMatchObject({ clipId: "hit", frame: 5 });
  });

  it("生成代码漏传或错传动画对象时按图片 URL 使用平台登记合同", () => {
    Function(spriteSheetRuntimeWithRegistry([{ file: "assets/hero.png", animation }]))();
    const runtime = (window as any).__FORGE_SPRITES__;
    const drawImage = vi.fn();
    const player = runtime.create({ src: "http://game/assets/hero.png?v=2#frame" }, { idle: { start: 0, frames: 4 } }, "idle");
    player.draw({ drawImage }, 100, 120, 1, performance.now() + 800);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), expect.any(Number), 0, 64, 48, 68, 76, 64, 48);
    const started = performance.now();
    player.play("hit", started, true);
    expect(player.frame(started + 140)).toMatchObject({ clipId: "hit", frame: 5, sourceX: 64, sourceY: 48 });
    const explicit = { ...animation, frameWidth: 32, anchor: { x: 16, y: 44 } };
    const explicitPlayer = runtime.create({ src: "http://game/assets/hero.png" }, explicit, "idle");
    expect(explicitPlayer.frame(performance.now())).toMatchObject({ sourceWidth: 32 });
    expect(() => runtime.create({ src: "http://game/assets/unknown.png" }, null, "idle")).toThrow(/缺少平台登记/);
  });
});
