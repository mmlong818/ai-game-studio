import { describe, expect, it } from "vitest";
import { renderGameLobbyShell, resolveGameLobbyOrigin } from "./game-lobby-navigation.js";

describe("game lobby navigation", () => {
  it("uses the Vite lobby only for the local API default", () => {
    expect(resolveGameLobbyOrigin({ publicOrigin: "http://127.0.0.1:4312" })).toBe("http://127.0.0.1:4311");
    expect(resolveGameLobbyOrigin({ publicOrigin: "https://studio.example.com" })).toBe("https://studio.example.com");
    expect(resolveGameLobbyOrigin({ publicOrigin: "https://api.example.com", workbenchOrigin: "https://play.example.com/app" })).toBe("https://play.example.com");
  });

  it("renders a navigation shell that leaves the game to its own iframe viewport", () => {
    const shell = renderGameLobbyShell("?mode=qa&__studio_game_raw=1", "https://studio.example.com", "测试游戏", "test-nonce");
    expect(shell).toContain('href="https://studio.example.com/"');
    expect(shell).toContain('target="_top"');
    expect(shell).toContain('data-source="?mode=qa&amp;__studio_game_raw=1"');
    expect(shell).toContain('allow="autoplay; fullscreen; pointer-lock"');
    expect(shell).toContain("测试游戏");
    expect(shell).toContain('<script nonce="test-nonce">');
    expect(shell).not.toContain("data-studio-game-content");
    expect(shell).not.toContain("MutationObserver");
    expect(shell).toContain("event.source!==parent");
    expect(shell).toContain("event.origin!==parentOrigin");
    expect(shell).toContain("frame.contentWindow.postMessage({type:'forge:locale',locale},origin)");
  });

  it("escapes shell content and the CSP nonce instead of making it executable", () => {
    const shell = renderGameLobbyShell('?x=" onload="alert(1)', "https://studio.example.com", '<script>alert(1)</script>', 'nonce" onload="alert(2)');
    expect(shell).not.toContain('<script>alert(1)</script>');
    expect(shell).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(shell).toContain('nonce="nonce&quot; onload=&quot;alert(2)"');
  });
});
