import type { DeterministicArtifactRepairHint } from "./generation-budget.js";

export type DeterministicArtifactRepair = {
  html: string;
  strategyId: "repair-game-board-marker";
  summary: string;
};

function maskNonMarkupContent(html: string) {
  return html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, match => " ".repeat(match.length));
}

/**
 * Apply one browser-proven markup repair without executing or interpreting game
 * code. The runtime hint identifies the exact common board container; this
 * function still requires a unique, non-root source tag and refuses ambiguous
 * markup or an existing semantic board root.
 */
export function applyDeterministicArtifactRepair(html: string, hint: DeterministicArtifactRepairHint | undefined): DeterministicArtifactRepair | null {
  if (!hint || hint.kind !== "add-game-board-marker") return null;
  if (!/^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/.test(hint.elementId)) return null;
  const expectedTag = hint.elementTag.toLowerCase();
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(expectedTag) || ["html", "body", "main"].includes(expectedTag)) return null;

  const masked = maskNonMarkupContent(html);
  const matches: Array<{ index: number; tag: string; source: string }> = [];
  const startTag = /<([A-Za-z][A-Za-z0-9-]*)\b[^<>]*>/g;
  for (const match of masked.matchAll(startTag)) {
    const index = match.index;
    const source = html.slice(index, index + match[0].length);
    const id = source.match(/\bid\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (id === hint.elementId) matches.push({ index, tag: match[1].toLowerCase(), source });
  }
  if (matches.length !== 1 || matches[0].tag !== expectedTag) return null;

  // Do not add a second board declaration. Only real start tags count; strings in
  // inline scripts and comments were masked above.
  for (const match of masked.matchAll(startTag)) {
    const source = html.slice(match.index, match.index + match[0].length);
    const id = source.match(/\bid\s*=\s*(["'])(.*?)\1/i)?.[2];
    const role = source.match(/\brole\s*=\s*(["'])(.*?)\1/i)?.[2]?.toLowerCase();
    if (/\bdata-game-board(?:\s|=|\/?>)/i.test(source) || role === "grid" || id === "board") return null;
  }

  const target = matches[0];
  if (/\bdata-game-board(?:\s|=|\/?>)/i.test(target.source)) return null;
  const insertion = target.index + 1 + target.tag.length;
  return {
    html: `${html.slice(0, insertion)} data-game-board${html.slice(insertion)}`,
    strategyId: "repair-game-board-marker",
    summary: `为浏览器已确认的真实棋盘共同容器 #${hint.elementId} 补充 data-game-board，并重新执行完整验收。`,
  };
}
