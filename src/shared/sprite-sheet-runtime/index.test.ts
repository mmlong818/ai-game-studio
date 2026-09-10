import { describe, expect, it, vi } from "vitest";
import type { SpriteSheetAnimation } from "../generated-blueprint";
import { createSpriteSheetPlayer, spriteSheetFrame } from ".";

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
});
