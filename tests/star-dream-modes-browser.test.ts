import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { startArtifactServer, closeServer, requireBrowserExecutable } from '../src/server/browser-quality';

test('三个玩法按钮双端可点、选中唯一、支持键盘', async () => {
  const server = await startArtifactServer(resolve('fixtures/star-dream-duel'));
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable() });
  mkdirSync('dogfood-output/star-dream-modes', { recursive: true });
  try {
    for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
      // This suite covers returning players; first-visit guidance is tested separately.
      await page.addInitScript(() => { for (const mode of ['solo', 'duel', 'endless']) localStorage.setItem(`star-dream-duel:help-seen:${mode}:v1`, 'seen'); });
      await page.goto(server.url);
      assert.equal(await page.locator('.mode-buttons button').count(), 3);
      assert.equal(await page.locator('select#game-mode').count(), 0);
      for (const mode of ['solo', 'duel', 'endless']) {
        const button = page.locator(`button[data-game-mode="${mode}"]`);
        await button.click();
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('.mode-buttons [aria-pressed=true]').count(), 1);
        const box = await button.boundingBox();
        assert.ok(box && box.height >= 44 && box.width >= 44);
      }
      await page.locator('button[data-game-mode=solo]').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('body').getAttribute('data-game-mode'), 'solo');
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.mode-buttons [aria-pressed=true]')!).color === 'rgb(255, 255, 255)');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `dogfood-output/star-dream-modes/mode-buttons-${width}.png` });
      await page.close();
    }
  } finally { await browser.close(); await closeServer(server.server); }
});

test('无限休闲无目标不限步、整盘交换、独立恢复', { timeout: 120_000 }, async () => {
  const server = await startArtifactServer(resolve('fixtures/star-dream-duel'));
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable() });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
      // This suite covers returning players; first-visit guidance is tested separately.
      await page.addInitScript(() => { for (const mode of ['solo', 'duel', 'endless']) localStorage.setItem(`star-dream-duel:help-seen:${mode}:v1`, 'seen'); });
    await page.goto(server.url);
    await page.click('button[data-game-mode="endless"]');
    assert.equal(await page.locator('#campaign-level').isVisible(), false);
    await page.click('#setup-start');
    assert.equal(await page.locator('.solo-hud').isVisible(), false);
    assert.equal(await page.locator('.tile:not(:disabled)').count(), 64);
    for (let move = 0; move < 13; move++) {
      await page.click('#hint-button');
      const positions = await page.locator('.tile.is-hint').evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.position));
      assert.equal(positions.length, 2);
      for (const position of positions) await page.click(`[data-position="${position}"]`);
      await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getState().phase === 'player');
      assert.equal(await page.locator('#result-modal').isVisible(), false);
    }
    const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem('star-dream-duel:endless:session:v1')!));
    assert.equal(snapshot.state.solo.movesLeft, null);
    assert.equal(snapshot.state.round, 14);
    await page.reload();
    await page.click('button[data-game-mode="endless"]');
    await page.click('#setup-start');
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('star-dream-duel:endless:session:v1')!).state), snapshot.state);
    await page.click('#back-to-setup');
    await page.click('button[data-game-mode="solo"]');
    assert.equal(await page.inputValue('#campaign-level'), '0');
    await page.click('#setup-start');
    assert.equal(await page.locator('.solo-hud').isVisible(), true);
    assert.equal(await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().solo.movesLeft), 12);
    assert.deepEqual(errors, []);
    await page.close();
  } finally { await browser.close(); await closeServer(server.server); }
});

test('完整动效在两种系统偏好与两种玩法下均保留', { timeout: 120_000 }, async () => {
  const server = await startArtifactServer(resolve('fixtures/star-dream-duel'));
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable() });
  try {
    for (const reducedMotion of ['reduce', 'no-preference'] as const) for (const mode of ['solo', 'duel']) {
      const page = await browser.newPage({ reducedMotion, serviceWorkers: 'block' });
      await page.addInitScript(() => {
        (window as any).animationDurations = [];
        const animate = Element.prototype.animate;
        Element.prototype.animate = function (frames, options) {
          (window as any).animationDurations.push(typeof options === 'object' ? options.duration : options);
          return animate.call(this, frames, options);
        };
      });
      // This suite covers returning players; first-visit guidance is tested separately.
      await page.addInitScript(() => { for (const mode of ['solo', 'duel', 'endless']) localStorage.setItem(`star-dream-duel:help-seen:${mode}:v1`, 'seen'); });
      await page.goto(server.url);
      await page.click(`button[data-game-mode="${mode}"]`);
      await page.click('#setup-start');
      await page.click('#hint-button');
      const positions = await page.locator('.tile.is-hint').evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.position));
      assert.equal(positions.length, 2);
      for (const position of positions) await page.click(`[data-position="${position}"]`);
      await page.waitForFunction(() => ['player', 'ended'].includes((window as any).__GAME_DEBUG__.getState().phase));
      const durations: number[] = await page.evaluate(() => (window as any).animationDurations);
      assert.ok(durations.includes(210), `${mode}/${reducedMotion}: 交换动画`);
      assert.ok(durations.includes(260), `${mode}/${reducedMotion}: 消除动画`);
      assert.ok(durations.some(value => value >= 332 && value <= 428), `${mode}/${reducedMotion}: 下落动画`);
      assert.ok(durations.includes(430), `${mode}/${reducedMotion}: 粒子动画`);
      if (mode === 'solo') {
        // Only the result animation is forced here; real-input completion has its own test below.
        await page.evaluate(() => (window as any).__GAME_DEBUG__.forceWin());
        assert.equal(await page.locator('#solo-result').evaluate(node => getComputedStyle(node).animationName), 'solo-stamp');
        assert.equal(await page.locator('#solo-result').evaluate(node => getComputedStyle(node).animationDuration), '0.45s');
      }
      await page.close();
    }
  } finally { await browser.close(); await closeServer(server.server); }
});

test('星梦双模式：真实交换完成单人首关、恢复、模式隔离与双端显示', { timeout: 120_000 }, async () => {
  const server = await startArtifactServer(resolve('fixtures/star-dream-duel'));
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable() });
  mkdirSync('dogfood-output/star-dream-modes', { recursive: true });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      // This suite covers returning players; first-visit guidance is tested separately.
      await page.addInitScript(() => { for (const mode of ['solo', 'duel', 'endless']) localStorage.setItem(`star-dream-duel:help-seen:${mode}:v1`, 'seen'); });
      await page.goto(server.url);
      await page.click('button[data-game-mode="solo"]');
      await page.click('#setup-start');
      assert.equal(await page.locator('.tile:not(:disabled)').count(), 64);
      const invalid = await page.evaluate(async () => {
        const core = await import('/game-core.js?v=7');
        const board = Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, col) =>
          document.querySelector(`[data-row="${row}"][data-col="${col}"] img`)!.getAttribute('src')!.split('/').pop()!.replace('.png', '')));
        for (let row = 0; row < 8; row++) for (let col = 0; col < 7; col++) {
          const first = { row, col }, second = { row, col: col + 1 };
          if (!core.findMatches(core.swapTiles(board, first, second)).length) return { first, second };
        }
        throw new Error('缺少无效交换测试样本');
      });
      await page.click(`[data-row="${invalid.first.row}"][data-col="${invalid.first.col}"]`);
      await page.click(`[data-row="${invalid.second.row}"][data-col="${invalid.second.col}"]`);
      await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getState().phase === 'player');
      assert.equal(await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().solo.movesLeft), 12);
      await page.screenshot({ path: `dogfood-output/star-dream-modes/solo-${viewport.width}.png` });
      // Uses the visible hint, then real pointer clicks. No state injection or forced outcome.
      for (let attempt = 0; attempt < 12; attempt++) {
        if (await page.locator('#result-modal').isVisible()) break;
        await page.click('#hint-button');
        const hinted = await page.locator('.tile.is-hint').evaluateAll(nodes => nodes.map(n => ({ row: (n as HTMLElement).dataset.row, col: (n as HTMLElement).dataset.col })));
        assert.equal(hinted.length, 2);
        await page.click(`[data-row="${hinted[0].row}"][data-col="${hinted[0].col}"]`);
        await page.click(`[data-row="${hinted[1].row}"][data-col="${hinted[1].col}"]`);
        await page.waitForFunction(() => ['player', 'ended'].includes((window as any).__GAME_DEBUG__.getState().phase));
      }
      assert.match(await page.locator('#result-title').innerText(), /收集完成/);
      await page.screenshot({ path: `dogfood-output/star-dream-modes/win-${viewport.width}.png` });
      await page.click('#play-again');
      assert.equal(await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().campaign.level.number), 2);
      const stored = await page.evaluate(() => localStorage.getItem('star-dream-duel:solo:session:v1'));
      await page.reload();
      await page.click('button[data-game-mode="solo"]');
      await page.click('#setup-start');
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('star-dream-duel:solo:session:v1')!).state), JSON.parse(stored!).state);
      await page.click('#back-to-setup');
      await page.click('button[data-game-mode="duel"]');
      assert.equal(await page.inputValue('#campaign-level'), '0');
      await page.click('#setup-start');
      assert.equal(await page.locator('.tile:not(:disabled)').count(), 32);
      await page.click('#back-to-setup');
      await page.click('button[data-game-mode="solo"]');
      assert.equal(await page.inputValue('#campaign-level'), '1');
      await page.click('#setup-start');
      assert.equal(await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().solo.movesLeft), 12);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); await closeServer(server.server); }
});
