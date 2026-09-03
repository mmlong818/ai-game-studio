/**
 * 官方游戏登记表。
 *
 * 新增一款官方游戏只需：`npm run game:new -- <id> --kind fixture|template|three --title "…"`，
 * 然后填好生成的登记文件；GAME_TEMPLATES、GOLDEN_SCENARIOS、运行时定义、机制映射、
 * 服务端模板枚举、officialFixtures、seed 清单和大厅顺序全部从这里派生。
 * 操作手册见 docs/55-adding-an-official-game.md。禁止再回到各处手写映射表。
 */
import { blockPlace } from "./block-place.js";
import { breakout } from "./breakout.js";
import { freecell } from "./freecell.js";
import { klotski } from "./klotski.js";
import { mahjongRoguelite } from "./mahjong-roguelite.js";
import { maze } from "./maze.js";
import { merge2048 } from "./merge-2048.js";
import { paperPopup } from "./paper-popup.js";
import { polyominoFit } from "./polyomino-fit.js";
import { puzzle } from "./puzzle.js";
import { regionLogic } from "./region-logic.js";
import { snake } from "./snake.js";
import { spaceShooter } from "./space-shooter.js";
import { starDreamDuel } from "./star-dream-duel.js";
import { tetris } from "./tetris.js";
import type { OfficialGameDefinition, ServerTemplatesOf } from "./types.js";

export * from "./types.js";
export { commonSuggestions, suggestion } from "./suggestions.js";

/**
 * 登记顺序决定 gameTemplateSchema 枚举顺序（模板目录、创作页列表都按它排列）；
 * 大厅顺序另由 lobbyRank 决定。
 */
export const OFFICIAL_GAMES = [
  starDreamDuel,
  tetris,
  puzzle,
  breakout,
  klotski,
  maze,
  snake,
  merge2048,
  spaceShooter,
  polyominoFit,
  blockPlace,
  regionLogic,
  mahjongRoguelite,
  freecell,
  paperPopup,
  // @scaffold:insert — 脚手架会把新登记追加在这一行之上
] as const satisfies readonly OfficialGameDefinition[];

export type OfficialGame = (typeof OFFICIAL_GAMES)[number];
export type OfficialGameId = OfficialGame["id"];
/** 登记表中出现过的服务端模板 id（含固定游戏所落的模板），顺序与登记顺序一致。 */
export type OfficialServerTemplateId = ServerTemplatesOf<typeof OFFICIAL_GAMES>[number];

/** 服务端 GameTemplate 枚举的登记来源（不含 "generated" 兜底通道），去重后保持登记顺序。 */
export const OFFICIAL_SERVER_TEMPLATE_IDS = Array.from(new Set(
  OFFICIAL_GAMES.flatMap((game) => (game.serverTemplate ? [game.serverTemplate] : [])),
)) as unknown as ServerTemplatesOf<typeof OFFICIAL_GAMES>;

export const officialGames = (): readonly OfficialGameDefinition[] => OFFICIAL_GAMES;

export const officialGameById = (id: string): OfficialGameDefinition | undefined =>
  OFFICIAL_GAMES.find((game) => game.id === id);

export const officialGameByServerTemplate = (serverTemplate: string): OfficialGameDefinition | undefined =>
  OFFICIAL_GAMES.find((game) => game.serverTemplate === serverTemplate);

export const officialGameByFixtureKind = (fixtureKind: string): OfficialGameDefinition | undefined =>
  OFFICIAL_GAMES.find((game) => game.kind === "fixture" && game.fixtureKind === fixtureKind);

export const officialTemplateGames = (): OfficialGameDefinition[] =>
  OFFICIAL_GAMES.filter((game) => game.kind === "template");

export const officialFixtureGames = (): OfficialGameDefinition[] =>
  OFFICIAL_GAMES.filter((game) => game.kind === "fixture");

/** 按 lobbyRank 升序排列的登记表（大厅顺序）。 */
export const officialLobbyOrder = (): OfficialGameDefinition[] =>
  [...OFFICIAL_GAMES].sort((left, right) => left.lobbyRank - right.lobbyRank);
