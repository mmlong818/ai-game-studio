import assert from 'node:assert/strict';
import test from 'node:test';
import { SOLO_LEVELS, createSoloProgress, collectSolo, soloOutcome, soloStars } from '../fixtures/star-dream-duel/solo-mode.js';
import { canOwnerSwap, createBoard, createSeededRng, findValidMoves, swapTiles, findMatches, findMatchGroups, calculateTacticalEffects, removeAndCollapse } from '../fixtures/star-dream-duel/game-core.js';

test('单人独立目标、最后一步优先判胜、提示不降低评价', () => {
  const level = SOLO_LEVELS[0];
  const progress = createSoloProgress(level);
  collectSolo(progress, { cloud: 20 });
  assert.equal(soloOutcome(level, progress), 'playing');
  progress.movesLeft = 0;
  assert.equal(soloOutcome(level, progress), 'lost');
  collectSolo(progress, { star: 3 });
  assert.equal(soloOutcome(level, progress), 'won');
  assert.equal(soloStars(level, progress), 1);
  progress.movesLeft = level.moves;
  progress.hints = 10;
  assert.equal(soloStars(level, progress), 3);
  assert.deepEqual(createSoloProgress(level).collected, {});
});

test('20 关固定种子均能用目标优先合法交换在步数内完成', () => {
  const overBudget = [];
  for (const level of SOLO_LEVELS) {
    const rng = createSeededRng(level.seed);
    let board = createBoard(rng);
    const progress = createSoloProgress(level);
    progress.movesLeft = 100;
    while (soloOutcome(level, progress) === 'playing') {
      let moves = findValidMoves(board, 'solo');
      if (!moves.length) { board = createBoard(rng); moves = findValidMoves(board, 'solo'); }
      const [move] = moves.map(move => {
        const preview = swapTiles(board, move.first, move.second);
        const counts = calculateTacticalEffects(preview, findMatches(preview), findMatchGroups(preview), 1).counts;
        const score = Object.entries(level.targets).reduce((sum, [type, target]) => sum + Math.min(Math.max(0, target - (progress.collected[type] || 0)), counts[type] || 0), 0);
        return { ...move, score };
      }).sort((a, b) => b.score - a.score);
      board = swapTiles(board, move.first, move.second);
      progress.movesLeft -= 1;
      for (let cascade = 1; findMatches(board).length; cascade++) {
        assert.ok(cascade < 100, '连消必须终止');
        const matches = findMatches(board);
        collectSolo(progress, calculateTacticalEffects(board, matches, findMatchGroups(board), cascade).counts);
        board = removeAndCollapse(board, matches, rng);
      }
    }
    const needed = 100 - progress.movesLeft;
    if (needed > level.moves) overBudget.push({ level: level.number, budget: level.moves, needed });
  }
  assert.deepEqual(overBudget, []);
});

test('随机序列可恢复，继续游戏不会改变后续落子', () => {
  const rng = createSeededRng(123); rng(); rng();
  const snapshot = rng.getState();
  const expected = [rng(), rng()];
  const restored = createSeededRng(0); restored.setState(snapshot);
  assert.deepEqual([restored(), restored()], expected);
});

test('单人整盘操作不改变对战分区，20 关初盘均无死局', () => {
  assert.equal(canOwnerSwap({ row: 3, col: 2 }, { row: 4, col: 2 }, 'solo'), true);
  assert.equal(canOwnerSwap({ row: 3, col: 2 }, { row: 4, col: 2 }, 'player'), false);
  assert.equal(canOwnerSwap({ row: 0, col: 2 }, { row: 0, col: 3 }, 'player'), false);
  for (const level of SOLO_LEVELS) {
    const board = createBoard(createSeededRng(level.seed));
    assert.ok(findValidMoves(board, 'solo').length);
    assert.ok(findValidMoves(board, 'solo').some(move => move.first.row < 4));
  }
});
