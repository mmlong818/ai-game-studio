import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';
import { startArtifactServer, closeServer, requireBrowserExecutable } from '../src/server/browser-quality';
import { openTestDatabase } from '../src/server/database';
import { StudioRepository } from '../src/server/studio-repository';
import { writeGameArtifact } from '../src/server/game-artifact';

test('生成模板的胜利成果卡在双端可操作、失败清理且保留独立进度', { timeout: 120_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, 'http://127.0.0.1:4312');
  const root = mkdtempSync(join(tmpdir(), 'victory-cards-'));
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable() });
  const server = await startArtifactServer(root);
  const screenshots = resolve('dogfood-output/victory-renovation');
  mkdirSync(screenshots, { recursive: true });
  try {
    for (const template of ['merge-2048', 'tetris', 'puzzle', 'breakout', 'klotski', 'snake', 'space-shooter', 'polyomino-fit', 'block-place', 'region-logic', 'mahjong-roguelite'] as const) {
      const project = await repository.create({ title: '胜利成果验收', idea: '独立小游戏，逐关掌握并记录个人成果。', template, dimensions: '2d', aspectRatio: '9:16' });
      writeGameArtifact(join(root, template), project);
      for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
        const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        const response = await page.goto(new URL(template + '/index.html?probe=1', server.url).href);
        assert.equal(response?.status(), 200, template);
        await page.locator('#start').click();
        // Forced outcome exercises only presentation/integration; gameplay is covered by separate real-input suites.
        await page.evaluate(() => (window as any).__GAME_DEBUG__.forceWin());
        const summary = page.locator('[data-victory-summary]');
        await summary.waitFor({ state: 'visible' });
        assert.match(await summary.innerText(), /首次通关/);
        assert.equal(await summary.getAttribute('data-victory-summary'), '1');
        await page.locator('#start').scrollIntoViewIfNeeded();
        const box = await page.locator('#start').boundingBox();
        assert.ok(box && box.height >= 44 && box.y >= 0 && box.y + box.height <= viewport.height + 1, template);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (template === 'merge-2048') await page.screenshot({ path: join(screenshots, viewport.width === 390 ? 'phone.png' : 'desktop.png') });
        await page.locator('#start').click();
        assert.equal(await summary.count(), 0);
        await page.evaluate(() => (window as any).__GAME_DEBUG__.forceLose());
        assert.equal(await summary.count(), 0);
        await page.evaluate(() => {
          const game = (window as any).__GAME_DEBUG__;
          game.setLevel(20); game.start(); game.forceWin();
        });
        assert.match(await summary.innerText(), /全部关卡已完成/);
        const total = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().campaign.stars);
        await page.evaluate(() => (window as any).__GAME_DEBUG__.forceWin());
        assert.match(await summary.innerText(), /已保留本关最佳成绩/);
        assert.equal(await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().campaign.stars), total);
        assert.equal(await summary.count(), 1);
        assert.deepEqual(errors, [], template);
        await page.close();
      }
    }
  } finally {
    await browser.close(); await closeServer(server.server); await database.close();
    rmSync(root, { recursive: true, force: true });
  }
});
