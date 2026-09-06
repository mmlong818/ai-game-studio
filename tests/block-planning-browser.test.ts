import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve,join } from 'node:path';
import { chromium,type Page } from 'playwright';
import { openTestDatabase } from '../src/server/database.js';
import { StudioRepository } from '../src/server/studio-repository.js';
import { officialGameById } from '../src/shared/official-games/index.js';
import { writeGameArtifact } from '../src/server/game-artifact.js';
import { startArtifactServer,closeServer,requireBrowserExecutable,inspectNonRealtimeOnboardingInBrowser } from '../src/server/browser-quality.js';
const state=(page:Page)=>page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime);
test('果冻规划：双端真实交叉消线、前瞻提示与模式存档隔离', {timeout:90000}, async()=>{
  const db=await openTestDatabase();
  const game=officialGameById('block-place')!,seed=game.seed!;
  const project=await new StudioRepository(db,'http://127.0.0.1:4341').create({title:game.title,idea:seed.idea,artStyle:seed.artStyle,visualStyle:seed.visualStyle,template:'block-place',dimensions:'2d',aspectRatio:'9:16',difficulty:'standard'});
  const root=resolve('dogfood-output/renovation-batch/block-place');writeGameArtifact(root,project);
  const server=await startArtifactServer(root);
  const browser=await chromium.launch({executablePath:requireBrowserExecutable()});
  try {
    for(const width of [390,1280]){
      const page=await browser.newPage({viewport:{width,height:844},hasTouch:width===390});
      page.setDefaultTimeout(6000);
      const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
      try{
        await page.goto(server.url+'?probe=1');await page.locator('#start').click();
        assert.ok((await page.locator('.onboarding-coach p').innerText()).includes('拖一块果冻'));
        const helpBox=(await page.locator('.onboarding-coach').boundingBox())!;
        const hintBox=(await page.locator('[data-control=hint]').boundingBox())!;
        assert.ok(helpBox.y+helpBox.height<=hintBox.y || helpBox.x+helpBox.width<=hintBox.x || hintBox.x+hintBox.width<=helpBox.x,'教学不得遮住提示按钮');
        await page.screenshot({path:join(root,'tutorial-'+width+'.png')});
        const skip=page.getByRole('button',{name:'跳过教学'});if(await skip.isVisible())await skip.click();
        await page.locator('[data-control=hint]').click();
        const hinted=await state(page);assert.ok(hinted.hint.reason.includes('已验证'));assert.equal(hinted.hintsRemaining,1);
        await page.locator('[data-control=hint]').click();assert.equal((await state(page)).hintsRemaining,1);
        // Controlled cross-clear fixture; placement itself is genuine mouse/touch input.
        const fixture=await page.evaluate(()=>(window as any).__GAME_DEBUG__.prepareCrossReview());
        const box=(await page.locator('#game-canvas').boundingBox())!;
        const size=await page.locator('#game-canvas').evaluate((canvas:HTMLCanvasElement)=>({width:canvas.width,height:canvas.height}));
        const point=(x:number,y:number)=>({x:box.x+x/size.width*box.width,y:box.y+(y+fixture.sceneTop)/size.height*box.height});
        const from=point(fixture.tray.x+96,fixture.tray.y+78);
        const to=point(fixture.layout.x+4.5*fixture.layout.cell,fixture.layout.y+(width===390?5.5:4.5)*fixture.layout.cell);
        const cdp=width===390?await page.context().newCDPSession(page):null;
        if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...to,id:1}]});}
        else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});}
        const preview=(await state(page)).dragPreview.forecast;
        assert.deepEqual(preview.rows,[3]);assert.deepEqual(preview.columns,[4]);assert.equal(preview.earned,25);
        await page.screenshot({path:join(root,'forecast-'+width+'.png')});
        if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
        const placed=await state(page);assert.equal(placed.score,preview.earned);assert.equal(placed.linesCleared,2);assert.equal(placed.dragPreview,null);
        await page.waitForTimeout(450);await page.screenshot({path:join(root,'cleared-'+width+'.png')});
        await page.reload();await page.locator('#start').click();assert.equal((await state(page)).score,25);
        await page.locator('#restart').click();await page.locator('#restart').click();assert.equal((await state(page)).score,0);
        await page.locator('#back-to-setup').click();await page.locator('[data-block-mode=endless]').click();await page.locator('#start').click();
        // Session probe is explicit; visual/input behavior was checked above.
        await page.evaluate(()=>(window as any).__GAME_DEBUG__.legalAction());
        const endlessScore=(await state(page)).score;assert.ok(endlessScore>0);
        await page.locator('#back-to-setup').click();await page.locator('[data-block-mode=journey]').click();await page.locator('#start').click();assert.equal((await state(page)).score,0);
        await page.locator('#back-to-setup').click();await page.locator('[data-block-mode=endless]').click();await page.locator('#start').click();assert.equal((await state(page)).score,endlessScore);
        await page.locator('#back-to-setup').click();await page.locator('[data-block-mode=daily]').click();await page.locator('#start').click();
        const dailyLevel=(await state(page)).level;
        await page.evaluate(()=>(window as any).__GAME_DEBUG__.prepareDailyFinishReview());
        const target=point(fixture.layout.x+4.5*fixture.layout.cell,fixture.layout.y+3.5*fixture.layout.cell);
        await page.mouse.click(target.x,target.y);
        assert.equal(await page.locator('body').getAttribute('data-game-state'),'won');
        assert.equal((await state(page)).level,dailyLevel);
        assert.deepEqual(errors,[]);
        console.log('Block planning verified',width);
      }finally{await page.close();}
    }
  }finally{await browser.close();await closeServer(server.server);await db.close();}
  await inspectNonRealtimeOnboardingInBrowser(root,'block-place');
});
