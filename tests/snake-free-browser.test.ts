import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { startArtifactServer, closeServer, requireBrowserExecutable } from '../src/server/browser-quality';
import { openTestDatabase } from '../src/server/database';
import { StudioRepository } from '../src/server/studio-repository';
import { writeGameArtifact } from '../src/server/game-artifact';

test('青玉长游连续转向、大地图、多食物、双模式与分段巡游', { timeout: 180_000 }, async () => {
  const root = resolve('dogfood-output/snake-renovation'); mkdirSync(root, { recursive: true });
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, 'http://127.0.0.1:4312');
  const project = await repository.create({ title: '青玉长游 · 自由巡游', idea: '自由转向探索大庭园，收集朱果。', template: 'snake', dimensions: '2d', aspectRatio: '9:16', difficulty: 'relaxed' });
  writeGameArtifact(root, project);
  const server = await startArtifactServer(root);
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable() });
  try {
    for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(server.url + '?probe=1');
      const assetProbe = await page.evaluate(async () => {
        const names = ['snake-head-v3', 'snake-body-straight-v3', 'snake-tail-v3', 'snake-food-golden-v4', 'snake-food-mint-v4', 'snake-food-dew-v4'];
        return Promise.all(names.map(async name => {
          const image = new Image(); image.src = './assets/stage-c/' + name + '.png'; await image.decode();
          const c = document.createElement('canvas'); c.width=image.width;c.height=image.height;
          const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);
          const pixels=ctx.getImageData(0,0,c.width,c.height).data;
          let clear=0,solid=0,magenta=0;
          for(let i=0;i<pixels.length;i+=4) { if(pixels[i+3]===0)clear++;if(pixels[i+3]>200) { solid++;if(pixels[i]>180 && pixels[i+2]>180 && pixels[i+1]<100)magenta++; } }
          return {clear,solid,magenta};
        }));
      });
      for(const asset of assetProbe) { assert.ok(asset.clear>0 && asset.solid>0); assert.equal(asset.magenta,0,'透明资源不能残留品红底'); }
      await page.click('#start');
      const canvas = page.locator('#game-canvas'), box = (await canvas.boundingBox())!;
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await page.mouse.move(x + 60, y - 80);
      await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getState().runtime.stats.distance > .3);
      const first = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().runtime);
      assert.equal(first.motionVersion, 2);
      assert.equal(first.foragePlan.population,40);
      for (let i=0;i<first.foods.length;i++) for(let j=i+1;j<first.foods.length;j++) assert.ok(Math.hypot(first.foods[i].x-first.foods[j].x, first.foods[i].y-first.foods[j].y)>=2,'食物不应相邻挤在一起');
      assert.ok(first.grid.columns >= 42 && first.grid.rows >= 48);
      assert.ok(Math.abs(first.direction.x) > .1 && Math.abs(first.direction.y) > .1);
      await page.waitForFunction((oldX) => Math.abs((window as any).__GAME_DEBUG__.getState().runtime.camera.originX - oldX) > 5, first.camera.originX);
      await page.locator('[data-control=pause]').click();
      const stopped = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().runtime.head);
      await page.screenshot({ path: resolve(root, `pause-${width}.png`) });
      assert.deepEqual(await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().runtime.head), stopped);
      await page.locator('[data-control=pause]').click();
      // Touch-style drag uses a direction vector, not four cardinal buckets.
      const touch = await page.context().newCDPSession(page);
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 70, y: y - 45 }] });
      const target = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().runtime.targetHeading);
      assert.ok(target < -Math.PI / 2 && target > -Math.PI);
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await touch.detach();
      await page.screenshot({ path: resolve(root, `play-${width}.png`) });
      if (width === 390) {
        // Read positions only; every pickup is driven by real mouse input and the runtime clock.
        const deadline = Date.now() + 25_000;
        while (Date.now() < deadline) {
          const state = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().runtime);
          if (state.forage.totalPicked >= 3) break;
          const point = await canvas.evaluate((element, state) => {
            const rect = element.getBoundingClientRect(), c = element as HTMLCanvasElement;
            return { x: rect.x + Math.max(5, Math.min(c.width - 5, state.camera.originX + (state.food.x + .5) * state.camera.cell)) / c.width * rect.width, y: rect.y + Math.max(5, Math.min(c.height - 5, state.camera.originY + (state.food.y + .5) * state.camera.cell)) / c.height * rect.height };
          }, state);
          await page.mouse.move(point.x, point.y);
          await page.waitForTimeout(100);
        }
        const finished = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().runtime);
        assert.ok(finished.forage.totalPicked >= 3, `真实指向未完成收集: ${finished.forage.totalPicked}`);
        assert.equal(finished.forage.phase, 0, '不足 30 秒不能提前过段');
        assert.equal(finished.foragePlan.minimumSeconds, 120);
        assert.equal(finished.foods.length + finished.forage.totalPicked, finished.foragePlan.population);
        assert.equal(finished.length, 4 + finished.forage.totalPicked);
        const initialFood = new Map(first.foods.map((item: any) => [`${item.x}:${item.y}`, item.kind]));
        for (const item of finished.foods) assert.equal(initialFood.get(`${item.x}:${item.y}`), item.kind, '未吃的食物不能移动或替换');
        assert.equal(new Set(finished.foods.map((item: any) => item.kind)).size, 4);
        await page.screenshot({ path: resolve(root, 'harvest-390.png') });
      }
      await page.goto(server.url + '?probe=1');
      await page.click('[data-snake-mode=endless]');
      assert.equal(await page.locator('[data-snake-mode=endless]').getAttribute('aria-pressed'), 'true');
      await page.click('#start');
      const endless = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().runtime);
      assert.equal(endless.mode, 'endless');
      assert.equal(endless.foragePlan.phases, 0);
      assert.equal(endless.foods.length,64);
      assert.equal(endless.forage.totalPicked, 0);
      await page.screenshot({ path: resolve(root, `endless-${width}.png`) });
      assert.deepEqual(errors, []);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.clock.install();
    await page.goto(server.url + '?probe=1');
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.click('#start');
    const canvas = page.locator('#game-canvas');
    for (let tick = 0; tick < 400; tick++) {
      const state = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().runtime);
      if (state.forage.phase === state.foragePlan.phases) break;
      const rect = (await canvas.boundingBox())!;
      const size = await canvas.evaluate(e => ({ width: (e as HTMLCanvasElement).width, height: (e as HTMLCanvasElement).height }));
      const x = Math.max(5, Math.min(size.width-5,state.camera.originX+(state.food.x+.5)*state.camera.cell));
      const y = Math.max(5, Math.min(size.height-5,state.camera.originY+(state.food.y+.5)*state.camera.cell));
      await page.mouse.move(rect.x+x/size.width*rect.width,rect.y+y/size.height*rect.height);
      await page.clock.runFor(500);
      if (tick === 10) {
        await page.locator('[data-control=pause]').click();
        const before = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().runtime.forage.activeSeconds);
        await page.clock.runFor(10_000);
        assert.equal(await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().runtime.forage.activeSeconds), before);
        await page.locator('[data-control=pause]').click();
      }
    }
    const complete = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().runtime);
    assert.equal(complete.forage.phase, 4, JSON.stringify(complete.forage));
    assert.ok(complete.forage.activeSeconds >= 120);
    assert.ok(complete.forage.totalPicked >= 32);
    await page.clock.runFor(2500);
    assert.equal(await page.locator('[data-snake-mode=campaign]').isVisible(), false, '结算时不出现玩法切换');
    assert.equal(await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().runtime.foragePlan.phases), 4, '结算保持本关计划');
    await page.screenshot({ path: resolve(root, 'harvest-victory-390.png') });
    await page.click('#start');
    assert.equal(await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().runtime.foragePlan.phases), 6, '下一关启用三分钟计划');
    assert.equal(await page.evaluate(() => (window as any).__GAME_DEBUG__.getState().runtime.forage.totalPicked), 0);
    await page.close();
  } finally { await browser.close(); await closeServer(server.server); await database.close(); }
});
