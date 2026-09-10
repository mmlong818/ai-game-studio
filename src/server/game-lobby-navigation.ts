type LobbyOriginOptions = {
  publicOrigin: string;
  workbenchOrigin?: string;
};

function safeOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

/** Resolve the workbench entry point without coupling deployed games to a dev port. */
export function resolveGameLobbyOrigin({ publicOrigin, workbenchOrigin }: LobbyOriginOptions) {
  const configured = safeOrigin(workbenchOrigin);
  if (configured) return configured;

  const origin = safeOrigin(publicOrigin);
  if (!origin) return "http://127.0.0.1:4311";
  const url = new URL(origin);
  // In local development the API defaults to 4312 while Vite serves the lobby on 4311.
  if (["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "4312") url.port = "4311";
  return url.origin;
}

/**
 * Keep game code in a real, reduced iframe viewport. The game runtime therefore
 * measures the same viewport it paints into, including canvas backing stores.
 */
export function renderGameLobbyShell(rawGameUrl: string, lobbyOrigin: string, gameTitle: string) {
  const title = gameTitle.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title}</title><style>html,body{width:100%;height:100%;margin:0;overflow:hidden}body{display:grid;grid-template-rows:56px minmax(0,1fr);background:#18241b;font-family:system-ui,"Microsoft YaHei",sans-serif}.game-lobby-bar{display:flex;align-items:center;justify-content:flex-end;padding:6px max(12px,env(safe-area-inset-right)) 6px max(12px,env(safe-area-inset-left));background:#18241b;box-shadow:0 2px 10px rgba(0,0,0,.2)}.game-lobby-bar a{display:inline-flex;min-height:40px;align-items:center;padding:0 13px;border:1px solid rgba(255,255,255,.42);border-radius:9px;background:rgba(255,255,255,.1);color:#fff;font-size:14px;font-weight:600;text-decoration:none}.game-lobby-bar a:hover{background:rgba(255,255,255,.2)}.game-lobby-bar a:focus-visible{outline:3px solid #fff;outline-offset:3px}.game-frame{width:100%;height:100%;border:0;background:#111}@media(max-width:480px){body{grid-template-rows:52px minmax(0,1fr)}.game-lobby-bar{padding-top:5px;padding-bottom:5px}.game-lobby-bar a{min-height:38px;font-size:13px}}</style></head><body><nav class="game-lobby-bar" aria-label="游戏导航"><a href="${lobbyOrigin}/" target="_top">← 回大厅</a></nav><iframe class="game-frame" title="${title}" src="${rawGameUrl}" allow="autoplay; fullscreen; pointer-lock"></iframe></body></html>`;
}
