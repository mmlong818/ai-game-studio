import { describe, expect, it } from "vitest";
import { LOCAL_DESIGN_SOURCES, LOCAL_DESIGN_SOURCE_SUMMARY, localDesignSourceSchema } from "./local-design-sources.js";

describe("本地游戏设计来源首批索引", () => {
  it("索引十二个高价值来源并保存可复核指纹", () => {
    expect(LOCAL_DESIGN_SOURCE_SUMMARY.indexed).toBe(12);
    expect(LOCAL_DESIGN_SOURCES.every((source) => localDesignSourceSchema.safeParse(source).success)).toBe(true);
    expect(new Set(LOCAL_DESIGN_SOURCES.map(({ id }) => id)).size).toBe(12);
    expect(new Set(LOCAL_DESIGN_SOURCES.map(({ sha256 }) => sha256)).size).toBe(12);
  });

  it("许可未知时只保留摘要和主题，不把原文当成正式知识", () => {
    expect(LOCAL_DESIGN_SOURCES.every(({ ingestion, rightsStatus }) => ingestion === "summary-only" && rightsStatus === "not-reviewed")).toBe(true);
    expect(LOCAL_DESIGN_SOURCE_SUMMARY.policy).toMatch(/不复制|不得/);
  });
});
