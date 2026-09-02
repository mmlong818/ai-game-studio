import { afterEach, describe, expect, it, vi } from "vitest";
import { passingViewportObservation } from "./experience";
import { INITIAL_DRAFT } from "./storage";
import { buildSimplePlayableRevision, createMockGeneratedImage } from "./simpleProduction";
import { downloadSimpleOpenSourceBundle, publishSimplePlayableRevision, verifySimplePlayableRevision } from "./simpleRelease";

describe("普通用户试玩验收", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("在全部目标视口通过后写入可发布的浏览器证据", async () => {
    const built = await buildSimplePlayableRevision({
      draft: INITIAL_DRAFT,
      goal: "操作反馈更明显",
      visualDirection: "体验增强",
    }, { generateImage: createMockGeneratedImage, save: () => undefined });
    const audit = async (_files: unknown, viewports: string[]) => viewports.map(passingViewportObservation);
    const verified = await verifySimplePlayableRevision(built.project, audit);
    expect(verified.errors).toEqual([]);
    expect(verified.project.assertions.filter((item) => ["viewport", "performance", "accessibility"].includes(item.kind)).every((item) => item.status === "passed")).toBe(true);
  });

  it("创作者试玩确认后通过同一健康构建发布稳定网址", async () => {
    const built = await buildSimplePlayableRevision({
      draft: INITIAL_DRAFT,
      goal: "操作反馈更明显",
      visualDirection: "体验增强",
    }, { generateImage: createMockGeneratedImage, save: () => undefined });
    const verified = await verifySimplePlayableRevision(
      built.project,
      async (_files, viewports) => viewports.map(passingViewportObservation),
    );
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      url: "http://127.0.0.1/play/test/index.html",
      buildId: verified.project.activeBuildId,
    }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const published = await publishSimplePlayableRevision(verified.project);
    expect(published.project.publishedBuildId).toBe(verified.project.activeBuildId);
    expect(published.url).toContain("/play/test/index.html");
    const evidenceIds = new Set(published.project.evidence.map((item) => item.id));
    expect(published.project.assertions.flatMap((item) => item.evidenceIds).every((id) => evidenceIds.has(id))).toBe(true);
    const bundle = await downloadSimpleOpenSourceBundle(published.project);
    expect(bundle.filename).toMatch(/\.zip$/);
    expect(bundle.bytes.length).toBeGreaterThan(100);
  });
});
