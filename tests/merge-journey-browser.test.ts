import assert from 'node:assert/strict';
import '../scripts/preview-merge.js';
import test from 'node:test';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright';
import {startArtifactServer,closeServer,requireBrowserExecutable,inspectMergeOnboardingInBrowser} from '../src/server/browser-quality.js';

test('数织：真实滑动、教学返回、刷新撤销、双模式存档与双端展示',{timeout:90000},async()=>{
  const root=resolve('dogfood-output/renovation-batch/merge-2048');
  const server=await startArtifactServer(root),browser=await chromium.launch({executablePath:requireBrowserExecutable(),args:['--no-sandbox']});
  try{
    for(const width of [390,1280]){
      const page=await browser.newPage({viewport:{width,height:844},hasTouch:width===390});page.setDefaultTimeout(5000);
      const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
      const state=()=>page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime);
      try{
        await page.goto(server.url+'?probe=1');await page.screenshot({path:join(root,'setup-'+width+'.png')});
        await page.locator('#start').click();await page.screenshot({path:join(root,'tutorial-'+width+'.png')});
        // First lesson uses a physical touch swipe or mouse swipe, not a state-changing probe.
        const box=(await page.locator('#game-canvas').boundingBox())!;
        const from={x:box.x+box.width*.3,y:box.y+box.height*.5},to={x:box.x+box.width*.7,y:from.y};
        if(width===390){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...to,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
        else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:4});await page.mouse.up();}
        await page.waitForTimeout(230);assert.equal((await state()).tutorialMode,'merge');
        await page.keyboard.press('ArrowLeft');await page.waitForTimeout(250);
        assert.equal((await state()).moves,0);assert.equal((await state()).score,0);assert.equal((await state()).target,128);
        await page.keyboard.press('ArrowLeft');await page.waitForTimeout(250);
        const before=await state();assert.equal(before.moves,1);
        await page.getByRole('button',{name:'重看',exact:true}).click();
        await page.getByRole('button',{name:'跳过教学',exact:true}).click();
        assert.deepEqual((await state()).board,before.board);assert.equal((await state()).rngState,before.rngState);
        await page.reload();await page.locator('#start').click();assert.deepEqual((await state()).board,before.board);assert.equal((await state()).canUndo,true);
        await page.getByRole('button',{name:'看方向',exact:true}).click();
        assert.equal(await page.locator('.merge-options span').count(),4);
        await page.screenshot({path:join(root,'directions-'+width+'.png')});
        await page.locator('[data-control=undo]').click();assert.equal((await state()).moves,0);
        await page.keyboard.press('ArrowDown');await page.waitForTimeout(250);const campaign=await state();
        await page.reload();await page.locator('[data-merge-mode=endless]').click();await page.locator('#start').click();
        assert.equal((await state()).endless,true);assert.equal((await state()).moves,0);
        await page.keyboard.press('ArrowLeft');await page.waitForTimeout(250);const endless=await state();
        assert.notEqual(endless.sessionKey,campaign.sessionKey);
        await page.reload();await page.locator('#start').click();assert.deepEqual((await state()).board,campaign.board);
        await page.reload();await page.locator('[data-merge-mode=endless]').click();await page.locator('#start').click();assert.deepEqual((await state()).board,endless.board);
        await page.screenshot({path:join(root,'endless-'+width+'.png')});
        assert.deepEqual(errors,[]);console.log('Merge journey verified',width);
      }finally{await page.close();}
    }
  }finally{await browser.close();await closeServer(server.server);}
  await inspectMergeOnboardingInBrowser(root);
});
