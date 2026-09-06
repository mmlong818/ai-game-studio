import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright';
import {openTestDatabase} from '../src/server/database.js';
import {StudioRepository} from '../src/server/studio-repository.js';
import {officialGameById} from '../src/shared/official-games/index.js';
import {writeGameArtifact,writeDesignDocuments} from '../src/server/game-artifact.js';
import {startArtifactServer,closeServer,requireBrowserExecutable} from '../src/server/browser-quality.js';
test('月港三航段：双端真实点牌、开路预览及非闯关不解锁',{timeout:90000},async()=>{
  const db=await openTestDatabase(),seed=officialGameById('mahjong-roguelite')!.seed!,root=resolve('dogfood-output/renovation-batch/mahjong-roguelite');
  const project=await new StudioRepository(db,'http://127.0.0.1:4341').create({title:'月港灵牌',idea:seed.idea,artStyle:seed.artStyle,visualStyle:seed.visualStyle,template:'mahjong-roguelite',dimensions:'2d',aspectRatio:'9:16',difficulty:'standard'});
  writeDesignDocuments(root,project);writeGameArtifact(root,project);await db.close();
  const server=await startArtifactServer(root),browser=await chromium.launch({executablePath:requireBrowserExecutable()});
  try{for(const width of [390,1280]){
    const page=await browser.newPage({viewport:{width,height:844}});page.setDefaultTimeout(6000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(server.url+'?probe=1');if(width===1280)await page.locator('[data-mahjong-mode]').selectOption('daily');await page.locator('#start').click();
    let matches=0,previewSeen=false;
    async function chooseCard(index:number){
      const canvas=page.locator('#game-canvas'),box=await canvas.boundingBox();assert.ok(box&&box.height>200,'Choice canvas must be visible');
      const size=await canvas.evaluate((el:HTMLCanvasElement)=>({width:el.width,height:el.height}));
      await page.mouse.click(box.x+(142+index*226)/size.width*box.width,box.y+470/size.height*box.height);
    }
    for(let step=0;step<140;step++){
      const s=await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime);
      if(s.awaitingRoute){let index=s.routeChoices.findIndex((route:{id:string})=>route.id==='garden');if(index<0)index=s.routeChoices.findIndex((route:{id:string})=>!['elite','tideway'].includes(route.id));await page.screenshot({path:join(root,'route-choice-'+width+'.png')});await chooseCard(Math.max(0,index));continue;}
      if(s.awaitingRelic){await chooseCard(0);continue;}
      if(s.remaining===0)break;
      const pair=s.availablePairs[0];assert.ok(pair,'Generated route must retain a playable pair');
      const box=(await page.locator('#game-canvas').boundingBox())!,size=await page.locator('#game-canvas').evaluate((el:HTMLCanvasElement)=>({width:el.width,height:el.height}));
      for(let index=0;index<2;index++){
        const rect=s.hitAreas.find((area:{id:string})=>area.id===pair[index]).rect;
        await page.mouse.click(box.x+(rect.x+rect.width/2)/size.width*box.width,box.y+(rect.y+rect.height/2)/size.height*box.height);
        if(index===0&&!previewSeen){const preview=await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime.pairPreview);assert.ok(preview);await page.screenshot({path:join(root,'open-route-'+width+'.png')});previewSeen=true;}
      }
      matches++;
    }
    const end=await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime);
    assert.equal(end.remaining,0);assert.equal(end.stage,2);assert.equal(end.totalMatches,matches);assert.ok(matches>=42);
    assert.equal(end.level,width===1280?1:2,'Daily must not unlock the campaign');
    await page.waitForTimeout(900);await page.screenshot({path:join(root,'voyage-result-'+width+'.png')});assert.deepEqual(errors,[]);await page.close();
  }}finally{await browser.close();await closeServer(server.server);}
});
