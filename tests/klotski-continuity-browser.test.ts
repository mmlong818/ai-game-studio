import assert from 'node:assert/strict';
import test from 'node:test';
import {resolve,join} from 'node:path';
import {chromium,type Page} from 'playwright';
import {openTestDatabase} from '../src/server/database.js';
import {StudioRepository} from '../src/server/studio-repository.js';
import {officialGameById} from '../src/shared/official-games/index.js';
import {writeGameArtifact,writeDesignDocuments} from '../src/server/game-artifact.js';
import {startArtifactServer,closeServer,requireBrowserExecutable,inspectNonRealtimeOnboardingInBrowser} from '../src/server/browser-quality.js';
const state=(page:Page)=>page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime);
test('华容：双端拖动、让路解释、撤销恢复、取消旧回放', {timeout:90000},async()=>{
  const db=await openTestDatabase();
  const game=officialGameById('klotski')!,seed=game.seed!;
  const project=await new StudioRepository(db,'http://127.0.0.1:4341').create({title:game.title,idea:seed.idea,artStyle:seed.artStyle,visualStyle:seed.visualStyle,template:'klotski',dimensions:'2d',aspectRatio:'9:16',difficulty:'standard'});
  const root=resolve('dogfood-output/renovation-batch/klotski');writeDesignDocuments(root,project);writeGameArtifact(root,project);
  const server=await startArtifactServer(root),browser=await chromium.launch({executablePath:requireBrowserExecutable()});
  try{
    for(const width of [390,1280]){
      const page=await browser.newPage({viewport:{width,height:844},hasTouch:width===390});page.setDefaultTimeout(6000);
      try{
        const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
        await page.goto(server.url+'?probe=1');await page.locator('#start').click();
        await page.screenshot({path:join(root,'tutorial-'+width+'.png')});
        const skip=page.getByRole('button',{name:'跳过教学'});if(await skip.isVisible())await skip.click();
        const initial=await state(page),box=(await page.locator('#game-canvas').boundingBox())!;
        const hud=(await page.locator('.klotski-course-hud').boundingBox())!;
        assert.ok(Math.abs(hud.x+hud.width/2-box.x-box.width/2)<2,'课程栏必须跟随棋盘居中');
        const point=(p:{x:number;y:number})=>({x:box.x+p.x/initial.canvasSize.width*box.width,y:box.y+p.y/initial.canvasSize.height*box.height});
        const from=point(initial.dragProbe.from),to=point(initial.dragProbe.to);
        if(width===390){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...to,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
        else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();}
        await page.waitForTimeout(300);assert.equal((await state(page)).moves,1);
        const placed=(await state(page)).pieceState;
        await page.locator('[data-control=hint]').click();assert.ok((await state(page)).hintReason);
        assert.equal(await page.locator('.klotski-reason').isVisible(),true);
        await page.screenshot({path:join(root,'reason-'+width+'.png')});
        await page.locator('[data-control=undo]').click();assert.equal((await state(page)).hint,null);assert.equal((await state(page)).moves,0);
        assert.equal(await page.locator('.klotski-reason').isVisible(),false);
        await page.reload();await page.locator('#start').click();assert.equal((await state(page)).canRedo,true);
        await page.locator('[data-control=redo]').click();assert.deepEqual((await state(page)).pieceState,placed);
        await page.reload();await page.locator('#start').click();assert.equal((await state(page)).restored,true);assert.equal((await state(page)).moves,1);
        // Add a second legal step to exercise cancellation across an awaited replay step.
        await page.evaluate(()=>(window as any).__GAME_DEBUG__.legalMove());await page.waitForTimeout(300);
        await page.locator('[data-control=replay]').click();
        await page.locator('#restart').click();await page.locator('#restart').click();
        await page.waitForTimeout(850);assert.equal((await state(page)).moves,0);assert.equal((await state(page)).replaying,false);
        assert.deepEqual((await state(page)).pieceState,initial.pieceState);
        assert.deepEqual(errors,[]);console.log('Klotski continuity verified',width);
      }finally{await page.close();}
    }
  }finally{await browser.close();await closeServer(server.server);await db.close();}
  await inspectNonRealtimeOnboardingInBrowser(root,'klotski');
});
