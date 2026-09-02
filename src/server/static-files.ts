import { createReadStream, existsSync, statSync } from "node:fs";
import type { ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";

const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff2": "font/woff2",
};

function safePath(root: string, requestedPath: string) {
  const normalizedRoot = resolve(root);
  const candidate = resolve(normalizedRoot, requestedPath);
  const withinRoot = candidate.toLowerCase().startsWith(`${normalizedRoot.toLowerCase()}${sep}`);
  if (!withinRoot && candidate.toLowerCase() !== normalizedRoot.toLowerCase()) return null;
  return candidate;
}

// style-src 放开 'unsafe-inline':生成游戏与动效常用 style 属性,样式注入的危害有限;
// script-src 保持 'self' 严格——这也是生成游戏必须交付为外链 app.js 的原因。
export function gameContentSecurityPolicy(frameAncestors = "'self'") {
  return `default-src 'self'; img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors ${frameAncestors}`;
}

// 工作台页面的 CSP 与游戏产物不同:它需要嵌入游戏源的 iframe 预览、加载游戏源的封面图。
// 游戏与工作台跨源后,default-src 'self' 兜底的 frame-src/img-src 会把它们全拦掉。
export function workbenchContentSecurityPolicy(gameOrigin: string) {
  return `default-src 'self'; img-src 'self' data: ${gameOrigin}; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-src 'self' ${gameOrigin}; object-src 'none'; base-uri 'none'; frame-ancestors 'self'`;
}

export function sendStaticFile(
  response: ServerResponse,
  root: string,
  requestedPath: string,
  immutable = false,
  options: { frameAncestors?: string; csp?: string } = {},
) {
  const filename = safePath(root, requestedPath);
  if (!filename || !existsSync(filename) || !statSync(filename).isFile()) return false;

  const extension = extname(filename).toLowerCase();
  response.writeHead(200, {
    "Content-Type": mimeTypes[extension] ?? "application/octet-stream",
    "Cache-Control": immutable && extension !== ".html" ? "public, max-age=31536000, immutable" : "no-cache",
    "Content-Security-Policy": options.csp ?? gameContentSecurityPolicy(options.frameAncestors),
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
  });
  createReadStream(filename).pipe(response);
  return true;
}
