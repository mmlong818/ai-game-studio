import { describe, expect, it } from "vitest";
import { renderGameLobbyShell, resolveGameLobbyOrigin } from "./game-lobby-navigation.js";

describe("game lobby navigation", () => {
  it("uses the Vite lobby only for the local API default", () => {
    expect(resolveGameLobbyOrigin({ publicOrigin: "http://127.0.0.1:4312" })).toBe("http://127.0.0.1:4311");
    expect(resolveGameLobbyOrigin({ publicOrigin: "https://studio.example.com" })).toBe("https://studio.example.com");
    expect(resolveGameLobbyOrigin({ publicOrigin: "https://api.example.com", workbenchOrigin: "https://play.example.com/app" })).toBe("https://play.example.com");
  });

  it("renders a navigation shell that leaves the game to its own iframe viewport", () => {
    const shell = renderGameLobbyShell("?mode=qa&__studio_game_raw=1", "https://studio.example.com", "测试游戏");
    expect(shell).toContain('href="https://studio.example.com/"');
    expect(shell).toContain('target="_top"');
    expect(shell).toContain('src="?mode=qa&__studio_game_raw=1"');
    expect(shell).toContain('allow="autoplay; fullscreen; pointer-lock"');
    expect(shell).toContain("测试游戏");
    expect(shell).not.toContain("data-studio-game-content");
    expect(shell).not.toContain("MutationObserver");
  });
});
