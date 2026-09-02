import { describe, expect, it, vi } from "vitest";
import { INITIAL_DRAFT } from "./storage";
import { buildSimplePlayableRevision, createMockGeneratedImage } from "./simpleProduction";

describe("普通用户制作流水线", () => {
  it("把一句意见变成带 AI 位图、健康构建和玩法证据的项目", async () => {
    const save = vi.fn();
    const progress: string[] = [];
    const result = await buildSimplePlayableRevision({
      draft: { ...INITIAL_DRAFT, freeRequest: "画面更可爱，操作反馈更明显" },
      goal: "画面更可爱，操作反馈更明显",
      visualDirection: "绘本森林",
      onProgress: (event) => progress.push(event.stage),
    }, { generateImage: createMockGeneratedImage, save });

    expect(result.errors).toEqual([]);
    expect(result.project.builds.at(-1)?.status).toBe("healthy");
    expect(result.project.scene.filter((node) => node.id !== "SCENE-ROOT").every((node) => node.assetId)).toBe(true);
    expect(result.project.assertions.filter((assertion) => assertion.kind === "rule").every((assertion) => assertion.status === "passed")).toBe(true);
    expect(progress).toEqual(["preparing", "assets", "building", "probing", "ready"]);
    expect(save).toHaveBeenCalledOnce();
  });
});
