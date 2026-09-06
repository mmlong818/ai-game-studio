import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { openTestDatabase } from '../src/server/database.js';
import { StudioRepository } from '../src/server/studio-repository.js';
import { officialGameById } from '../src/shared/official-games/index.js';
import { writeGameArtifact } from '../src/server/game-artifact.js';
import { startArtifactServer, closeServer, requireBrowserExecutable } from '../src/server/browser-quality.js';

test('星环首关完整有效时间与局中不中断（免伤计时夹具，非自然通关）', {timeout:120000}, async()=>{
  const database=await openTestDatabase();
  try {
    const game=officialGameById('space-shooter')!, seed=game.seed!;
    const repository=new StudioRepository(database,'http://127.0.0.1:4341');
    const project=await repository.create({title:game.title,idea:seed.idea,artStyle:seed.artStyle,visualStyle:seed.visualStyle,template:'space-shooter',dimensions:'2d',aspectRatio:'9:16',difficulty:'standard'});
    writeGameArtifact(resolve('dogfood-output/renovation-batch/space-shooter'),project);
  } finally { await database.close(); }
  const server=await startArtifactServer(resolve('dogfood-output/renovation-batch/space-shooter'));
  const browser=await chromium.launch({executablePath:requireBrowserExecutable()});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install();
    await page.goto(server.url+'?probe=1');
    await page.locator('#start').click();
    await page.clock.runFor(10000);
    assert.equal(await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime.elapsedMs),0);
    await page.getByRole('button',{name:'跳过教学'}).click();
    await page.evaluate(()=>(window as any).__GAME_DEBUG__.protectForTimingReview());
    await page.clock.runFor(15000);
    let runtime=await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime);
    assert.equal(runtime.currentWave,1);
    assert.equal(runtime.supplyChoice,null);
    assert.ok(runtime.waveSpawned>=7);
    await page.locator('.shooter-pause').click();
    const paused=await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime.elapsedMs);
    await page.clock.runFor(10000);
    assert.equal(await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime.elapsedMs),paused);
    await page.locator('.shooter-pause').click();
    await page.clock.runFor(103000);
    assert.equal(await page.locator('.shooter-rewards').isVisible(),false);
    assert.equal(await page.locator('body').getAttribute('data-game-state'),'playing');
    await page.clock.runFor(60000);
    runtime=await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime);
    assert.ok(runtime.elapsedMs>=120000);
    assert.equal(await page.locator('body').getAttribute('data-game-state'),'stage-complete');
    assert.equal(await page.locator('.shooter-rewards').isVisible(),true);
    assert.equal(runtime.supplyHistory.length,0);
    await page.screenshot({path:resolve('dogfood-output/renovation-batch/space-shooter/timing-review-390.png')});
    assert.deepEqual(errors,[]);
  } finally { await browser.close();await closeServer(server.server); }
});
