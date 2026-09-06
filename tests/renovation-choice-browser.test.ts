import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve, join } from 'node:path';
import { chromium, type Page } from 'playwright';
import { openTestDatabase } from '../src/server/database.js';
import { StudioRepository } from '../src/server/studio-repository.js';
import { writeGameArtifact } from '../src/server/game-artifact.js';
import { officialGameById } from '../src/shared/official-games/index.js';
import { startArtifactServer, closeServer, requireBrowserExecutable } from '../src/server/browser-quality.js';

const state=(page:Page)=>page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime);
async function canvasPoint(page:Page,x:number,y:number){
  const box=(await page.locator('#game-canvas').boundingBox())!;
  const size=await page.locator('#game-canvas').evaluate((canvas:HTMLCanvasElement)=>({width:canvas.width,height:canvas.height}));
  return {x:box.x+x/size.width*box.width,y:box.y+y/size.height*box.height};
}

test('新版选择机制：关后强化、真实按键点灯与控角预告', {timeout:120000},async()=>{
  const database=await openTestDatabase();
  const repository=new StudioRepository(database,'http://127.0.0.1:4341');
  const browser=await chromium.launch({executablePath:requireBrowserExecutable()});
  try{
    for(const template of ['space-shooter','breakout'] as const){
      const game=officialGameById(template)!,seed=game.seed!;
      const project=await repository.create({title:game.title,idea:seed.idea,artStyle:seed.artStyle,visualStyle:seed.visualStyle,template,dimensions:'2d',aspectRatio:'9:16',difficulty:'standard'});
      const root=resolve('dogfood-output/renovation-batch',template);writeGameArtifact(root,project);
      const server=await startArtifactServer(root);
      try{
        for(const width of [390,1280]){
          const page=await browser.newPage({viewport:{width,height:844}});
          page.setDefaultTimeout(6000);
          try {
          const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
          await page.goto(server.url+'?probe=1');await page.locator('#start').click();
          const skip=page.getByRole('button',{name:'跳过教学'});if(await skip.isVisible())await skip.click();
          if(template==='space-shooter'){
            assert.equal((await state(page)).supplyChoice,null);
            assert.equal(await page.locator('.shooter-rewards').isVisible(),false);
            await page.locator('.shooter-pause').click();
            const before=await state(page);
            await page.waitForTimeout(1100);
            assert.equal((await state(page)).elapsedMs,before.elapsedMs);
            await page.locator('.shooter-pause').click();
            // Explicit result probe: proves reward handoff, not natural completion.
            await page.evaluate(()=>(window as any).__GAME_DEBUG__.previewCompletedLevel());
            assert.equal(await page.locator('.shooter-rewards').isVisible(),true);
            await page.locator('[data-shooter-reward=upgrade]').click();
            assert.equal(await page.locator('[data-shooter-reward=upgrade]').getAttribute('aria-pressed'),'true');
            assert.equal(await page.locator('[data-shooter-reward=shield]').isDisabled(),true);
            await page.screenshot({path:join(root,`post-level-${width}.png`)});
            await page.locator('#start').click();
            assert.equal((await state(page)).upgradeLevel,1);
            assert.equal((await state(page)).estimatedSessionSeconds,180);
            assert.equal(await page.locator('.shooter-rewards').isVisible(),false);
            await page.reload();
            await page.locator('#start').click();
            assert.equal((await state(page)).upgradeLevel,1);
            assert.equal((await state(page)).supplyChoice,null);
            await page.evaluate(()=>(window as any).__GAME_DEBUG__.previewCompletedLevel());
            await page.locator('[data-shooter-reward=shield]').click();
            await page.locator('#start').click();
            assert.equal((await state(page)).shield,1);
            assert.equal((await state(page)).upgradeLevel,0);
            await page.evaluate(()=>(window as any).__GAME_DEBUG__.previewCompletedLevel());
            await page.locator('[data-shooter-reward=pulse]').click();
            await page.locator('#start').click();
            assert.equal((await state(page)).pulseCharge,100);
          }else{
            await page.evaluate(()=>(window as any).__GAME_DEBUG__.prepareCleanupGuidanceReview());
            const before=await state(page);assert.equal(before.brickCount-before.cleared,3);assert.ok(before.guidance);
            const point=await canvasPoint(page,before.guidance.x,before.paddle.y);
            await page.mouse.move(point.x,point.y,{steps:8});
            await page.screenshot({path:join(root,`cleanup-${width}.png`)});
          }
          assert.deepEqual(errors,[]);
          console.log('Choice verified',template,width);
          }finally{await page.close();}
        }
      }finally{await closeServer(server.server);}
    }
  }finally{await browser.close();await database.close();}
});
