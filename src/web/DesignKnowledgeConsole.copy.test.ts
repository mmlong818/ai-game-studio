import { describe, expect, it } from "vitest";
import { designKnowledgeCopy, designKnowledgeCopyKeys } from "./DesignKnowledgeConsole.copy";
import { designKnowledgeExtraKeys, designKnowledgeExtraUsesGeneric } from "./DesignKnowledgeConsole.extra-copy";

describe("design knowledge console copy", () => {
  it.each(["zh-CN", "zh-TW", "en", "ja"] as const)("has every non-empty %s key", (locale) => {
    for (const key of designKnowledgeCopyKeys) expect(designKnowledgeCopy(locale, key).trim(), key).not.toBe("");
  });
  it("does not fall back to Chinese in English or Japanese", () => {
    for (const key of designKnowledgeCopyKeys) {
      expect(designKnowledgeCopy("en", key), key).not.toMatch(/[\u3400-\u9fff]/);
    }
    expect(designKnowledgeCopy("ja", "main.title")).toBe("試遊エビデンスを次の設計能力へ");
    expect(designKnowledgeCopy("ja", "radar.empty")).not.toContain("暂无");
    expect(designKnowledgeCopy("ja", "atlas.detail")).not.toContain("每张卡");
  });
  it("does not expose generic placeholder copy for any declared key", () => {
    for (const key of designKnowledgeExtraKeys) expect(designKnowledgeExtraUsesGeneric(key), key).toBe(false);
  });
});
