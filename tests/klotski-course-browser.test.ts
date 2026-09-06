import assert from 'node:assert/strict';
import test from 'node:test';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright';
import {openTestDatabase} from '../src/server/database.js';
import {StudioRepository} from '../src/server/studio-repository.js';
import {officialGameById} from '../src/shared/official-games/index.js';
import {writeGameArtifact,writeDesignDocuments} from '../src/server/game-artifact.js';
import {startArtifactServer,closeServer,requireBrowserExecutable} from '../src/server/browser-quality.js';
test('朱门整关：解法驱动真实双端输入，四庭连续通关后才结算', {timeout:120000},async()=>{
  const db=await openTestDatabase(),game=officialGameById('klotski')!,seed=game.seed!;
  const project=await new StudioRepository(db,'http://127.0.0.1:4341').create({title:game.title,idea:seed.idea,artStyle:seed.artStyle,visualStyle:seed.visualStyle,template:'klotski',dimensions:'2d',aspectRatio:'9:16',difficulty:'standard'});
  const root=resolve('dogfood-output/renovation-batch/klotski');writeDesignDocuments(root,project);writeGameArtifact(root,project);
  const server=await startArtifactServer(root),browser=await chromium.launch({executablePath:requireBrowserExecutable()});
  try{
    for(const width of [390,1280]){
      const page=await browser.newPage({viewport:{width,height:844},hasTouch:width===390});page.setDefaultTimeout(6000);
      const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
      try{
        await page.goto(server.url+'?probe=1');await page.locator('#start').click();
        await page.screenshot({path:join(root,'course-start-'+width+'.png')});
        const cdp=width===390?await page.context().newCDPSession(page):null;
        let restored=false,actions=0;
        // The solution probe only supplies coordinates. All changes use real input.
        // This proves playability, NOT unassisted player comprehension or playtime.
        for(let attempt=0;attempt<80;attempt++){
          const state=await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState());
          if(await page.locator('body').getAttribute('data-game-state')==='stage-complete')break;
          assert.equal(state.runtime.level,1);
          if(state.runtime.roomIndex===1&&!restored){
            assert.equal(state.runtime.roomResults.length,1);
            assert.equal(await page.locator('.victory-summary').count(),0);
            await page.screenshot({path:join(root,'course-second-'+width+'.png')});
            await page.reload();await page.locator('#start').click();
            const recovered=await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime);
            assert.equal(recovered.roomIndex,1);assert.equal(recovered.roomResults.length,1);assert.equal(recovered.restored,true);
            restored=true;
          }
          const probe=await page.evaluate(()=>(window as any).__GAME_DEBUG__.courseMoveProbe());
          if(!probe){await page.waitForTimeout(1000);continue;}
          const size=await page.locator('#game-canvas').evaluate((canvas:HTMLCanvasElement)=>({width:canvas.width,height:canvas.height}));
          const box=(await page.locator('#game-canvas').boundingBox())!;
          const convert=(p:any)=>({x:box.x+p.x/size.width*box.width,y:box.y+p.y/size.height*box.height});
          const from=convert(probe.from),to=convert(probe.to);
          if(cdp){
            await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});
            await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...to,id:1}]});
            await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          }else{
            await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:3});await page.mouse.up();
          }
          actions++;await page.waitForTimeout(260);
        }
        const result=await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime);
        assert.equal(await page.locator('body').getAttribute('data-game-state'),'stage-complete');
        assert.equal(actions,54);assert.equal(result.totalMoves,54);assert.equal(result.totalOptimal,54);
        assert.equal(result.independentRooms,4);assert.equal(result.level,2);assert.equal(restored,true);
        assert.ok((await page.locator('.klotski-course-result').innerText()).includes('4 庭全通'));
        await page.evaluate(()=>{const note=document.createElement('small');note.textContent='解法驱动自动验收 · 非真人时长与独立解题证据';note.style.cssText='display:block;margin-top:8px;font-size:11px';document.querySelector('.klotski-course-result')!.appendChild(note);});
        await page.waitForTimeout(900);
        await page.screenshot({path:join(root,'course-victory-'+width+'.png')});
        await page.locator('#start').click();const next=await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime);
        assert.equal(next.roomIndex,0);assert.equal(next.roomResults.length,0);assert.equal(next.moves,0);
        assert.deepEqual(errors,[]);console.log('Course complete through real input',width,actions);
      }finally{await page.close();}
    }
  }finally{await browser.close();await closeServer(server.server);await db.close();}
});
