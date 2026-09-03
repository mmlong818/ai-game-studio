// @ts-nocheck
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const core = await import("../fixtures/star-dream-duel/game-core.js");

test("星梦对决六类棋子有不同战术职责，四连给予额外回合", () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill("cloud"));
  board[7] = ["star", "star", "star", "star", "heart", "drop", "flower", "moon"];
  const group = { axis: "horizontal", type: "star", positions: [0, 1, 2, 3].map((col) => ({ row: 7, col })) };
  const effects = core.calculateTacticalEffects(board, group.positions, [group], 1);
  assert.equal(effects.damage, 20);
  assert.equal(effects.healing, 0);
  assert.equal(effects.extraTurn, true);
  assert.equal(effects.shape, "row");

  const mixed = core.calculateTacticalEffects(board, [
    { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 }, { row: 7, col: 7 },
  ], [], 1);
  assert.equal(mixed.healing, 2);
  assert.deepEqual(mixed.energy, { tide: 2, bloom: 2, veil: 2 });
});

test("星梦对决所有常规恢复量减半并向上取整", () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill("heart"));
  const threeHearts = [0, 1, 2].map((col) => ({ row: 7, col }));
  const effects = core.calculateTacticalEffects(board, threeHearts, [], 1);
  assert.equal(core.HEALING_MULTIPLIER, 0.5);
  assert.equal(effects.healing, 5);
});

test("无解重排只更换棋盘，不恢复双方生命", () => {
  const state = {
    board: Array.from({ length: 8 }, () => Array(8).fill("cloud")),
    playerScore: 37,
    aiScore: 52,
    playerShield: 8,
    playerEnergy: { tide: 2, bloom: 4, veil: 6 },
  };
  const reshuffled = core.reshuffleBattleBoard(state, core.createSeededRng(2026));
  assert.equal(reshuffled.playerScore, 37);
  assert.equal(reshuffled.aiScore, 52);
  assert.equal(reshuffled.playerShield, 8);
  assert.deepEqual(reshuffled.playerEnergy, state.playerEnergy);
  assert.notDeepEqual(reshuffled.board, state.board);
});

test("高价值构形会生成并激活可持续存在的特殊棋子", () => {
  const rowGroup = { axis: "horizontal", type: "star", positions: [0, 1, 2, 3].map((col) => ({ row: 7, col })) };
  const creation = core.createSpecialFromGroups([rowGroup], { row: 7, col: 2 });
  assert.deepEqual(creation, { position: { row: 7, col: 2 }, shape: "row", type: "star" });

  const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) => core.TILE_TYPES[(row + col) % core.TILE_TYPES.length]));
  board[7][2] = "star";
  const collapsed = core.removeAndCollapse(board, rowGroup.positions, core.createSeededRng(7), creation);
  assert.equal(core.tileBase(collapsed[7][2]), "star");
  assert.equal(core.tileSpecial(collapsed[7][2]), "row");

  collapsed[4][2] = "star:row";
  const expanded = core.expandSpecialMatches(collapsed, [{ row: 4, col: 2 }]);
  assert.equal(expanded.matches.filter((position) => position.row === 4).length, 8);
  assert.equal(expanded.activated[0].special, "row");
});

test("挑战 AI 使用确定的两层回应评估，且护盾先吸收伤害", () => {
  const board = core.createBoard(core.createSeededRng(42));
  const first = core.rankTacticalMoves(board, "ai", { lookahead: 2 });
  const second = core.rankTacticalMoves(board, "ai", { lookahead: 2 });
  assert.ok(first.length > 0);
  assert.deepEqual(first, second);
  assert.ok(first.every((move) => Number.isFinite(move.opponentReply)));
  assert.deepEqual(core.chooseTacticalAiMove(board, "challenging", core.createSeededRng(9)), first[0]);

  const result = core.applyAttack({ aiScore: 100, playerScore: 100, aiShield: 8, playerShield: 0, playerDamage: 0, aiDamage: 0 }, "player", 13);
  assert.equal(result.aiShield, 0);
  assert.equal(result.aiScore, 95);
  assert.equal(result.playerDamage, 5);
  assert.equal(result.lastAbsorbed, 8);
});

test("后期封印障碍固定在原位并切分重力区段", () => {
  const blockers = [{ row: 2, col: 3 }, { row: 5, col: 4 }];
  const board = core.createBoard(core.createSeededRng(77), { blockers });
  assert.equal(board[2][3], "blocker");
  assert.equal(board[5][4], "blocker");
  const moves = [...core.findValidMoves(board, "ai"), ...core.findValidMoves(board, "player")];
  assert.ok(moves.every((move) => board[move.first.row][move.first.col] !== "blocker" && board[move.second.row][move.second.col] !== "blocker"));
  const collapsed = core.removeAndCollapse(board, [{ row: 1, col: 3 }, { row: 6, col: 4 }], core.createSeededRng(78));
  assert.equal(collapsed[2][3], "blocker");
  assert.equal(collapsed[5][4], "blocker");
});

test("固定游戏声明二十个独立任务、三技能和清晰 AI 半区", () => {
  const app = readFileSync(resolve("fixtures", "star-dream-duel", "app.js"), "utf8");
  const html = readFileSync(resolve("fixtures", "star-dream-duel", "index.html"), "utf8");
  const css = readFileSync(resolve("fixtures", "star-dream-duel", "styles.css"), "utf8");
  assert.equal((app.match(/^  \['/gm) ?? []).length, 20);
  assert.equal((app.match(/^  \[\{ row:/gm) ?? []).length, 8);
  assert.match(app, /chooseTacticalAiMove/);
  assert.match(app, /aiFairness: 'same-board-same-zone-same-resources'/);
  assert.match(html, /data-skill="tide"/);
  assert.match(html, /data-skill="bloom"/);
  assert.match(html, /data-skill="veil"/);
  const veilRule = css.match(/\.ai-veil \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.doesNotMatch(veilRule, /backdrop-filter/);
  assert.match(veilRule, /pointer-events: none/);
});
