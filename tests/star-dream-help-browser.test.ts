import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { startArtifactServer, closeServer, requireBrowserExecutable } from '../src/server/browser-quality';

test('新手帮助：双端分模式说明、真实交换练习、不修改正式对局', { timeout: 60_000 }, async () => {
  const server = await startArtifactServer(resolve('fixtures/star-dream-duel'));
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable() });
  mkdirSync('dogfood-output/star-dream-help', { recursive: true });
  try {
    for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(server.url);
      const help = page.locator('#game-help-dialog');
      assert.equal(await help.isVisible(), true);
      assert.match(await help.innerText(), /单人闯关/);
      assert.equal(await page.locator('body').getAttribute('data-game-mode'), 'solo');
      await page.click('#game-help-close');
      await page.click('button[data-game-mode="duel"]');
      assert.equal(await help.isVisible(), true);
      assert.match(await help.innerText(), /不能跨|不要跨越/);
      await page.click('#game-help-next');
      assert.equal(await page.locator('.help-tile-card').count(), 6);
      await page.screenshot({ path: `dogfood-output/star-dream-help/tiles-${width}.png` });
      await page.click('#game-help-next');
      assert.match(await help.innerText(), /本关双方都不能用技能/);
      assert.match(await help.innerText(), /10 点花能量/);
      await page.click('#game-help-next');
      await page.click('[data-practice="0"]'); await page.click('[data-practice="2"]');
      assert.equal(await page.evaluate(() => localStorage.getItem('star-dream-duel:help:duel:v1')), null);
      await page.click('[data-practice="1"]'); await page.click('[data-practice="4"]');
      assert.match(await page.locator('#help-practice-feedback').innerText(), /已学会/);
      assert.equal(await page.evaluate(() => localStorage.getItem('star-dream-duel:help:duel:v1')), 'completed');
      await page.click('#game-help-next');
      await page.click('#setup-start');
      const before = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState());
      await page.click('#play-help');
      assert.equal(await help.isVisible(), true);
      await page.keyboard.press('Escape');
      assert.deepEqual(await page.evaluate(() => (window as any).__GAME_DEBUG__.getState()), before);
      await page.evaluate(() => { (window as any).__GAME_DEBUG__.legalAction(); });
      assert.equal(await page.locator('#play-help').isDisabled(), true);
      await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getState().phase === 'player');
      await page.click('#back-to-setup');
      await page.evaluate(() => (window as any).__GAME_DEBUG__.setLevel(5));
      await page.click('.setup-help-button');
      await page.click('#game-help-next'); await page.click('#game-help-next');
      assert.match(await help.innerText(), /本关技能已开放/);
      assert.match(await help.innerText(), /玩家要点击技能/);
      await page.click('#game-help-close');
      for (const mode of ['solo', 'endless']) {
        await page.click(`button[data-game-mode="${mode}"]`);
        if (mode === 'solo') await page.click('.setup-help-button');
        assert.equal(await help.isVisible(), true);
        assert.match(await help.innerText(), /整张棋盘/);
        assert.doesNotMatch(await help.innerText(), /生命降到 0/);
        await page.click('#game-help-close');
      }
      await page.reload();
      assert.equal(await help.isVisible(), false);
      await page.click('.setup-help-button');
      assert.equal(await help.isVisible(), true);
      await page.click('#game-help-close');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); await closeServer(server.server); }
});
