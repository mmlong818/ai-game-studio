import type { GameDesignKnowledgeLibrary } from "./index.js";

export function rankPlayPatterns(library: GameDesignKnowledgeLibrary, request: { tags: string[]; dimensions: "2d" | "limited-3d"; input: "keyboard" | "pointer" | "touch" | "gamepad" }) {
  const tags = new Set(request.tags);
  return library.patterns.map((pattern) => {
    const tagScore = pattern.tags.filter((tag) => tags.has(tag)).length * 10;
    const dimensionScore = pattern.scope.dimensions.includes(request.dimensions) ? 20 : 0;
    const inputScore = pattern.scope.inputs.includes(request.input) ? 10 : 0;
    const evidenceScore = Math.min(20, pattern.evidence.length * 5);
    return { pattern, score: tagScore + dimensionScore + inputScore + evidenceScore };
  }).sort((left, right) => right.score - left.score || left.pattern.id.localeCompare(right.pattern.id));
}
