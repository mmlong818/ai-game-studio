import assert from 'node:assert/strict';
import test from 'node:test';
import { join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import { officialGameById } from '../src/shared/official-games/index.js';
import { regionLogicLevels } from '../src/server/game-runtimes/region-logic-levels.generated.js';
import { openTestDatabase } from '../src/server/database.js';
import { StudioRepository } from '../src/server/studio-repository.js';
import { writeGameArtifact } from '../src/server/game-artifact.js';
import { startArtifactServer, closeServer, requireBrowserExecutable } from '../src/server/browser-quality.js';

const state=(page:Page)=>page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime);
async function screenPoint(page:Page, point:{x:number;y:number}){
  const box=(await page.locator('#game-canvas').boundingBox())!;
  const size=await page.locator('#game-canvas').evaluate((canvas:HTMLCanvasElement)=>({width:canvas.width,height:canvas.height}));
  return {x:box.x+point.x/size.width*box.width,y:box.y+point.y/size.height*box.height};
}
async function drag(page:Page,from:{x:number;y:number},to:{x:number;y:number},touch:boolean){
  const start=await screenPoint(page,from),end=await screenPoint(page,to);
  if(touch){
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
    for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*i/12,y:start.y+(end.y-start.y)*i/12,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }else{await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:12});await page.mouse.up();}
}

test('三款学习改造：真实首课、双级提示、双星放置和触摸组拼', {timeout:150000},async()=>{
  const database=await openTestDatabase();const repository=new StudioRepository(database,'http://127.0.0.1:4341');
  const browser=await chromium.launch({executablePath:requireBrowserExecutable()});
  try{
    for(const template of ['tetris','region-logic','puzzle'] as const){
      const game=officialGameById(template)!,seed=game.seed!;
      const project=await repository.create({title:game.title,idea:seed.idea,artStyle:seed.artStyle,visualStyle:seed.visualStyle,template,dimensions:'2d',aspectRatio:'9:16',difficulty:'standard'});
      const root=resolve('dogfood-output/renovation-batch',template);writeGameArtifact(root,project);
      const server=await startArtifactServer(root);
      try{
        for(const width of [390,1280]){
          const page=await browser.newPage({viewport:{width,height:844},hasTouch:width===390});page.setDefaultTimeout(7000);
          const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
          try{
            await page.goto(server.url+'?probe=1');await page.locator('#start').click();
            await page.screenshot({path:join(root,`learning-${width}.png`)});
            if(template==='tetris'){
              // Complete the real tutorial, then make a real safe/unsafe placement choice.
              await page.keyboard.press('ArrowUp');
              let current=await state(page);assert.equal(current.currentPiece.rotation,0);assert.equal(current.landing.clearRows.length,1);
              await page.keyboard.press('ArrowLeft');current=await state(page);assert.ok(current.landing.addedHoles>0);
              await page.screenshot({path:join(root,`forecast-${width}.png`)});
              await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');
              current=await state(page);assert.equal(current.lines,1);assert.equal(current.lesson.complete,true);assert.equal(current.skillGoalAchieved,true);
              await page.screenshot({path:join(root,`lesson-${width}.png`)});
              // Explicit result probe checks award wiring, not a natural level completion.
              const stars=await page.evaluate(()=>{const debug=(window as any).__GAME_DEBUG__,id=debug.getState().campaign.level.id;debug.forceWin();return debug.getState().campaign.mastery[id];});
              assert.equal(stars,2,'one completed lesson adds its mastery star, without fabricating score mastery');
            }else{
              await page.getByRole('button',{name:'跳过教学'}).click();
              if(template==='region-logic'){
                const before=await state(page);await page.locator('[data-control=hint]').click();
                const observed=await state(page);assert.equal(observed.hints,before.hints);assert.equal(observed.hintStage,'observe');
                await page.locator('[data-control=hint]').click();const explained=await state(page);
                assert.equal(explained.hints,before.hints-1);assert.equal(explained.stars,before.stars);assert.equal(explained.hintStage,'explain');
                await page.locator('[data-control=hint]').click();assert.equal((await state(page)).hints,explained.hints);
                await page.screenshot({path:join(root,`reason-${width}.png`)});
                const assistedStars=await page.evaluate(()=>{const debug=(window as any).__GAME_DEBUG__,id=debug.getState().campaign.level.id;debug.solveRegion();return debug.getState().campaign.mastery[id];});
                assert.equal(assistedStars,2,'observed solution cannot earn the independent-reasoning star');
                // Select a real campaign level, then click two legal stars in one row.
                const index=regionLogicLevels.findIndex(level=>level.starsPerUnit===2),level=regionLogicLevels[index];
                await page.evaluate(number=>{const debug=(window as any).__GAME_DEBUG__;debug.setLevel(number);debug.restart();},index+1);
                await page.locator('[data-control=star]').click();
                const layout=(await state(page)).boardLayout;
                const row=level.solution[0][0],pair=level.solution.filter(([r])=>r===row);
                assert.equal(pair.length,2);
                for(const [r,c] of pair){const p=await screenPoint(page,{x:layout.x+(c+.5)*layout.cell,y:layout.y+(r+.5)*layout.cell});await page.mouse.click(p.x,p.y);}
                const placed=await state(page);assert.equal(placed.stars,2);assert.equal(placed.errors,0);
                await page.screenshot({path:join(root,`double-star-${width}.png`)});
              }else{
                const probe=await page.evaluate(()=>(window as any).__GAME_DEBUG__.neighborProbe());assert.ok(probe,'must have reachable pair');
                await drag(page,probe.from,probe.to,width===390);await page.waitForTimeout(120);
                const grouped=await state(page);assert.ok(grouped.largestGroup>=2,'real drag should connect a pair');
                await page.locator('[data-puzzle-region]').selectOption('0');
                const filtered=await state(page);
                for(const piece of filtered.workshop.pieces){const group=filtered.workshop.pieces.filter((p:any)=>p.groupId===piece.groupId);assert.equal(new Set(group.map((p:any)=>p.visible)).size,1);}
                await page.locator('[data-puzzle-region]').selectOption('all');
                const before=await state(page);await page.locator('[data-control=hint]').click();assert.equal((await state(page)).hintsRemaining,before.hintsRemaining);
                await page.locator('[data-control=hint]').click();assert.equal((await state(page)).hintsRemaining,before.hintsRemaining-1);
                await page.screenshot({path:join(root,`workshop-${width}.png`)});
                await page.reload();await page.locator('#start').click();
                assert.ok((await state(page)).largestGroup>=2,'refresh must preserve connected group');
                await page.locator('#restart').click();await page.locator('#restart').click();
                const restarted=await state(page);assert.equal(restarted.largestGroup,1);assert.equal(restarted.placedCount,0);assert.equal(restarted.hintsUsed,0);
              }
            }
            assert.deepEqual(errors,[]);console.log('Learning verified',template,width);
          }finally{await page.close();}
        }
      }finally{await closeServer(server.server);}
    }
  }finally{await browser.close();await database.close();}
});
