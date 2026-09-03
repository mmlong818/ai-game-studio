import { recommendMechanics } from "./research";
import { GAME_TEMPLATES, getTemplate } from "./templates";
import type { GameTemplate } from "./types";

/**
 * 服务端游戏模板 id → 创作流程使用的玩法模板 id。
 * 规则：每一款官方游戏都必须能落到一个玩法模板上，否则不能进入“改一个现有游戏”。
 */
export const SERVER_TEMPLATE_TO_DOMAIN: Record<string, string> = {
  "signal-hunt": "turn-duel-match3",
  tetris: "falling-blocks",
  puzzle: "picture-puzzle",
  breakout: "breakout",
  klotski: "sliding-block",
  maze: "maze",
  snake: "snake",
  "merge-2048": "merge-2048",
  "space-shooter": "space-shooter",
  "polyomino-fit": "polyomino",
  "block-place": "block-placement",
  "region-logic": "region-logic",
  "mahjong-roguelite": "tile-roguelite",
};

/** 固定游戏（fixture）不走服务端模板，按自身种类映射。 */
export const FIXTURE_TEMPLATE_TO_DOMAIN: Record<string, string> = {
  "star-dream-duel": "turn-duel-match3",
  freecell: "solitaire-freecell",
};

/** 3D 项目不看服务端模板，按 threeMode 映射。 */
export const THREE_MODE_TO_DOMAIN: Record<string, string> = {
  collector: "collect-escape-3d",
  arena: "arena-3d",
  popup: "popup-rotate-3d",
};

/** 玩法模板 id → 服务端已有封面所属的模板目录，供创作页当图标用。 */
export const DOMAIN_TEMPLATE_ART: Record<string, string> = {
  "turn-duel-match3": "signal-hunt",
  "falling-blocks": "tetris",
  "picture-puzzle": "puzzle",
  breakout: "breakout",
  "sliding-block": "klotski",
  maze: "maze",
  snake: "snake",
  "merge-2048": "merge-2048",
  "space-shooter": "space-shooter",
  polyomino: "polyomino-fit",
  "block-placement": "block-place",
  "region-logic": "region-logic",
  "tile-roguelite": "mahjong-roguelite",
};

/**
 * AI 原创（generated）游戏没有固定的服务端模板：先从创意描述里识别机制，
 * 再找一个能力集合覆盖这些机制的玩法模板。
 */
export function resolveGeneratedTemplate(idea: string): GameTemplate | undefined {
  const mechanics = recommendMechanics(idea).slice(0, 2).map((item) => item.id);
  if (mechanics.length === 0) return undefined;
  return GAME_TEMPLATES.find((template) => mechanics.every((mechanic) => template.capabilities.includes(mechanic)));
}

export function resolveTemplateForGame(game: { template: string; idea: string; fixtureKind?: string | null; threeMode?: string | null }): GameTemplate | undefined {
  if (game.fixtureKind && FIXTURE_TEMPLATE_TO_DOMAIN[game.fixtureKind]) return getTemplate(FIXTURE_TEMPLATE_TO_DOMAIN[game.fixtureKind]);
  if (game.threeMode && THREE_MODE_TO_DOMAIN[game.threeMode]) return getTemplate(THREE_MODE_TO_DOMAIN[game.threeMode]);
  if (game.template === "generated") return resolveGeneratedTemplate(game.idea);
  return getTemplate(SERVER_TEMPLATE_TO_DOMAIN[game.template] ?? null);
}
