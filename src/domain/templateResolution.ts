import { LIVE_OFFICIAL_GAMES } from "../shared/official-games";
import { recommendMechanics } from "./research";
import { GAME_TEMPLATES, GAMEPLAY_TEMPLATE_BUNDLES, getTemplate } from "./templates";
import type { GameTemplate } from "./types";

/**
 * 服务端游戏模板 id → 创作流程使用的玩法模板 id。
 * 由官方游戏登记表派生：每条带 serverTemplate 的登记（模板游戏，以及固定游戏所落的模板）都贡献一项。
 * 规则：每一款官方游戏都必须能落到一个玩法模板上，否则不能进入“改一个现有游戏”。
 */
export const SERVER_TEMPLATE_TO_DOMAIN: Record<string, string> = Object.fromEntries(
  LIVE_OFFICIAL_GAMES
    .filter((game) => game.serverTemplate)
    .map((game) => [game.serverTemplate as string, game.domainTemplate.id]),
);

/** 固定游戏（fixture）不走服务端模板，按自身种类映射。由登记表的 fixture 型条目派生。 */
export const FIXTURE_TEMPLATE_TO_DOMAIN: Record<string, string> = Object.fromEntries(
  LIVE_OFFICIAL_GAMES
    .filter((game) => game.kind === "fixture" && game.fixtureKind)
    .map((game) => [game.fixtureKind as string, game.domainTemplate.id]),
);

/** 3D 项目不看服务端模板，按 threeMode 映射。由玩法模板捆绑里声明了 threeMode 的条目派生。 */
export const THREE_MODE_TO_DOMAIN: Record<string, string> = Object.fromEntries(
  GAMEPLAY_TEMPLATE_BUNDLES
    .filter((bundle) => bundle.threeMode && !bundle.development)
    .map((bundle) => [bundle.threeMode as string, bundle.domainTemplate.id]),
);

/** 玩法模板 id → 服务端已有封面所属的模板目录，供创作页当图标用。由登记表派生。 */
export const DOMAIN_TEMPLATE_ART: Record<string, string> = Object.fromEntries(
  LIVE_OFFICIAL_GAMES
    .filter((game) => game.serverTemplate)
    .map((game) => [game.domainTemplate.id, game.serverTemplate as string]),
);

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
  // 固定游戏与 3D 游戏只认自己的映射；没有映射（例如登记为 development）就视为暂不可改造，不落到 2D 模板。
  if (game.fixtureKind) return getTemplate(FIXTURE_TEMPLATE_TO_DOMAIN[game.fixtureKind] ?? null);
  if (game.threeMode) return getTemplate(THREE_MODE_TO_DOMAIN[game.threeMode] ?? null);
  if (game.template === "generated") return resolveGeneratedTemplate(game.idea);
  return getTemplate(SERVER_TEMPLATE_TO_DOMAIN[game.template] ?? null);
}
