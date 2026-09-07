import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { stripPlatformSegments } from "./game-generator.js";

const MAX_SOURCE_BYTES = 4 * 1024 * 1024;

/** Reconstruct an iteration prompt, never execute HTML or follow its resource URLs. */
export function readGeneratedSource(root: string): string | null {
  try {
    const canonicalRoot = realpathSync(resolve(root));
    const read = (name: "index.html" | "styles.css" | "app.js") => {
      const path = join(canonicalRoot, name);
      const stat = lstatSync(path);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_SOURCE_BYTES || dirname(realpathSync(path)) !== canonicalRoot) throw new Error("Not a reusable source file");
      return readFileSync(path, "utf8");
    };
    // Successful immutable versions include this exact platform-owned inspector.
    // It is re-injected when the next version is finalized, never sent as game code.
    let html = stripPlatformSegments(read("index.html"))
      .replace('<script src="_studio/runtime-inspector.js"></script>', "");
    const css = stripPlatformSegments(read("styles.css"))
      .split(/\r?\n/)
      // Legacy platform CSS was appended in these two dedicated minified lines.
      .filter(line => !/^\s*\.forge-(?:onboarding|assistance)\{/.test(line))
      .join("\n");
    const script = stripPlatformSegments(read("app.js"));
    if (!script.trim()) return null;
    let styles = 0, scripts = 0;
    html = html.replace(/<link\b[^>]*>/gi, tag => {
      const href = tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
      if (href !== "./styles.css" && href !== "styles.css") return tag;
      styles++;
      return `<style>\n${css}\n</style>`;
    });
    html = html.replace(/<script\b([^>]*)>\s*<\/script\s*>/gi, (tag, attributes: string) => {
      const src = attributes.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2];
      if (src !== "./app.js" && src !== "app.js") return tag;
      scripts++;
      const module = /\btype\s*=\s*(["'])module\1/i.test(attributes);
      return `<script${module ? ' type="module"' : ""}>\n${script}\n</script>`;
    });
    // Broken or foreign resource references are not a usable previous generation.
    if (styles !== 1 || scripts !== 1 || /<script\b[^>]*\bsrc\s*=/i.test(html)) return null;
    return html;
  } catch {
    return null;
  }
}
