import { describe, expect, it, vi } from "vitest";
import { INITIAL_DRAFT } from "./storage";
import { buildSimplePlayableRevision, createMockGeneratedImage } from "./simpleProduction";

describe("普通用户制作流水线", () => {
  it("把一句意见变成带 AI 位图、健康构建和玩法证据的项目", async () => {
    const save = vi.fn();
    const progress: string[] = [];
    const requests: Parameters<typeof createMockGeneratedImage>[0][] = [];
    const result = await buildSimplePlayableRevision({
      draft: { ...INITIAL_DRAFT, freeRequest: "画面更可爱，操作反馈更明显" },
      goal: "画面更可爱，操作反馈更明显",
      visualDirection: "绘本森林",
      onProgress: (event) => progress.push(event.stage),
    }, { generateImage: async (input, existing) => { requests.push(input); return createMockGeneratedImage(input, existing); }, save });

    expect(result.errors).toEqual([]);
    expect(result.project.builds.at(-1)?.status).toBe("healthy");
    expect(result.project.scene.filter((node) => node.id !== "SCENE-ROOT").every((node) => node.assetId)).toBe(true);
    expect(result.project.assertions.filter((assertion) => assertion.kind === "rule").every((assertion) => assertion.status === "passed")).toBe(true);
    expect(progress).toEqual(["preparing", "assets", "building", "probing", "ready"]);
    expect(save).toHaveBeenCalledOnce();
    expect(requests.length).toBeGreaterThan(0);
    const background = requests.find((request) => request.role === "background");
    expect(background?.delivery).toMatchObject({ fit: "cover", background: "opaque", purpose: "environment" });
    expect(background?.prompt).toContain("只生成环境层");
    expect(background?.prompt).toContain("不承载文字、按钮或关键主体");
    const subject = requests.find((request) => request.role !== "background");
    expect(subject?.delivery).toMatchObject({ fit: "contain", background: "transparent" });
    expect(subject?.prompt).toContain("只生成一个点名主体");
    expect(result.project.assets.every((asset) => asset.delivery)).toBe(true);
  });
});
