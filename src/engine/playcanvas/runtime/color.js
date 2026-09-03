// 引擎层 · 颜色工具（浏览器运行时片段）。
// 约定：色板用 sRGB 十六进制整数；顶点色直接写 sRGB 字节（材质 vertexColorGamma 解码），灯光与清屏色交给引擎转线性。
// 本文件不依赖 DOM；`pc` 通过参数注入，便于在 Node 里单测。产物打包时 export 前缀会被剥掉。

export function createColorKit(pc) {
  function rgb(hex) { return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]; }
  function hexOf(r, g, b) { const c = (v) => Math.max(0, Math.min(255, Math.round(v * 255))); return (c(r) << 16) | (c(g) << 8) | c(b); }
  function pcColor(hex, alpha) { const c = rgb(hex); return new pc.Color(c[0], c[1], c[2], alpha === undefined ? 1 : alpha); }
  function toHsl(hex) {
    const c = rgb(hex); const max = Math.max(c[0], c[1], c[2]); const min = Math.min(c[0], c[1], c[2]);
    const l = (max + min) / 2; let h = 0; let s = 0;
    if (max !== min) {
      const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === c[0]) h = (c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0); else if (max === c[1]) h = (c[2] - c[0]) / d + 2; else h = (c[0] - c[1]) / d + 4;
      h /= 6;
    }
    return { h, s, l };
  }
  function fromHsl(h, s, l) {
    const hue = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    if (s === 0) return hexOf(l, l, l);
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q;
    return hexOf(hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3));
  }
  function shade(hex, amount) { const c = toHsl(hex); return fromHsl(c.h, c.s, Math.max(0, Math.min(1, c.l * (1 + amount)))); }
  function mixColor(a, b, t) { const x = rgb(a); const y = rgb(b); return hexOf(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); }
  function deg(rad) { return rad * 180 / Math.PI; }
  // 解析 "#rrggbb" / "rrggbb" / 数字；无法解析时返回 fallback。
  function parseHex(value, fallback) {
    if (typeof value === "number" && Number.isFinite(value)) return value & 0xffffff;
    if (typeof value === "string") { const m = value.trim().replace("#", ""); if (/^[0-9a-fA-F]{6}$/.test(m)) return parseInt(m, 16); }
    return fallback === undefined ? 0xffffff : fallback;
  }
  return { rgb, hexOf, pcColor, toHsl, fromHsl, shade, mixColor, deg, parseHex };
}
