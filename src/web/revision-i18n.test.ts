import { describe, expect, it } from "vitest";
import { revisionCopy } from "./revision-i18n";

describe("revision copy", () => {
  it.each([
    ["zh-CN", "这次只改哪一类？", "正在保存…"],
    ["zh-TW", "這次只改哪一類？", "正在儲存…"],
    ["en", "What would you like to change?", "Saving…"],
    ["ja", "今回変更する範囲は？", "保存中…"],
  ] as const)("provides complete %s platform copy", (locale, legend, saving) => {
    const copy = revisionCopy(locale);
    expect(copy.scopeLegend).toBe(legend);
    expect(copy.saving).toBe(saving);
    expect(Object.values(copy)).not.toContain(undefined);
  });
});
