import { describe, expect, it, vi } from "vitest";
import { isSupportedGameLocale, postGameLocale, withGameLocale } from "./game-locale";

describe("game locale transport", () => {
  it("preserves URL state and accepts exactly the platform locales", () => {
    expect(withGameLocale("https://games.example/play?save=1#board", "ja", "https://studio.example/"))
      .toBe("https://games.example/play?save=1&lang=ja#board");
    expect(["zh-CN", "zh-TW", "en", "ja"].every(isSupportedGameLocale)).toBe(true);
    expect(isSupportedGameLocale("fr")).toBe(false);
  });

  it("posts only to the iframe URL origin", () => {
    const postMessage = vi.fn();
    const frame = document.createElement("iframe");
    Object.defineProperty(frame, "contentWindow", { value: { postMessage } });
    frame.src = "https://games.example/play?lang=zh-CN";
    expect(postGameLocale(frame, "en")).toBe(true);
    expect(postMessage).toHaveBeenCalledWith({ type: "forge:locale", locale: "en" }, "https://games.example");
  });
});
