import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { startArtifactServer, closeServer, requireBrowserExecutable } from '../src/server/browser-quality.js';

test('海岛卡丁车：生产 CSP、键盘驾驶、暂停、冲线结算和触控自由驾驶', {timeout:90000}, async()=>{
  const server=await startArtifactServer(resolve('fixtures/island-kart'));
  const browser=await chromium.launch({executablePath:requireBrowserExecutable(),args:['--no-sandbox']});
  const errors:string[]=[];
  mkdirSync(resolve('output/island-kart'),{recursive:true});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:720}});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(server.url+'?probe=1');
    await page.locator('#start:not([disabled])').waitFor();
    assert.equal(await page.locator('.guide').isVisible(),true);
    assert.equal(await page.locator('#fatal').isVisible(),false);
    await page.screenshot({path:resolve('output/island-kart/menu-desktop.png')});
    await page.locator('#start').click();
    await page.waitForFunction(()=>document.body.dataset.phase==='racing');
    assert.equal(await page.evaluate(()=>(window as any).__kart.state().racers.length),3);
    assert.equal(await page.locator('#rank-label').innerText(),'/ 3 名');
    await page.waitForFunction(()=>(window as any).__kart.state().racers[0].speed>10);
    const before=await page.evaluate(()=>(window as any).__kart.state().racers[0]);
    await page.keyboard.down('ArrowRight');await page.waitForTimeout(480);await page.keyboard.up('ArrowRight');
    const right=await page.evaluate(()=>(window as any).__kart.state().racers[0]);
    assert.ok(right.offset>before.offset+.3,'右转必须持续改变横向位置');
    await page.keyboard.down('ArrowLeft');await page.waitForTimeout(650);await page.keyboard.up('ArrowLeft');
    const left=await page.evaluate(()=>(window as any).__kart.state().racers[0]);
    assert.ok(left.heading<0,'左转真实改变车头方向');
    const models=await page.evaluate(()=>(window as any).__kart.models());
    assert.equal(models.length,3);
    assert.ok(models.every((m:any)=>m.wheels===4&&m.front===2));
    assert.ok(models[0].turn>0&&models[0].spin>0,'导入模型仍须真实转向和滚动');
    await page.keyboard.press('Space');await page.waitForTimeout(100);
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('boosting')),true);
    await page.screenshot({path:resolve('output/island-kart/driving-desktop.png')});
    await page.locator('#pause').click();
    const paused=await page.evaluate(()=>(window as any).__kart.state().time);
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(()=>(window as any).__kart.state().time),paused);
    await page.locator('#resume').click();
    // A bridge fixture checks geometry/camera; this is separate from the real input assertions above.
    await page.evaluate(()=>(window as any).__kart.place(560,0));await page.waitForTimeout(700);
    await page.screenshot({path:resolve('output/island-kart/bridge-desktop.png')});
    // Fast-forward the real core, never set the result or inject a victory flag.
    await page.evaluate(()=>(window as any).__kart.advance(240,{}));
    await page.locator('#results:not([hidden])').waitFor();
    assert.equal(await page.locator('#podium .podium-step').count(),3);
    assert.match(await page.locator('#result-caption').innerText(),/三圈海岸/);
    await page.screenshot({path:resolve('output/island-kart/results-desktop.png')});
    const saved=await page.evaluate(()=>Object.keys(localStorage));assert.deepEqual(saved,['island-kart.records.v1']);
    await page.locator('#again').click();assert.equal(await page.locator('#results').isVisible(),false);
    const graphics=await page.evaluate(()=>(window as any).__kart.graphics());assert.ok(graphics.calls<230);console.log('3D draw budget',graphics);
    for(let i=0;i<3;i++) {
      await page.locator('#pause').click();await page.locator('#restart').click();
    }
    const afterRestarts=await page.evaluate(()=>(window as any).__kart.graphics());
    assert.equal(afterRestarts.geometries,graphics.geometries,'重开不能持续增加 GPU 几何');
    assert.equal(afterRestarts.textures,graphics.textures,'重开不能持续增加 GPU 纹理');
    await page.close();

    const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    phone.on('pageerror',e=>errors.push(e.message));
    await phone.goto(server.url+'?probe=1');await phone.locator('#start:not([disabled])').waitFor();
    await phone.screenshot({path:resolve('output/island-kart/menu-mobile.png')});
    assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await phone.locator('[data-mode="free"]').tap();await phone.locator('#start').tap();
    await phone.waitForFunction(()=>document.body.dataset.phase==='racing');
    await phone.waitForFunction(()=>(window as any).__kart.state().racers[0].speed>12);
    const button=await phone.locator('[data-control="right"]').boundingBox();assert.ok(button);
    const touchSession=await phone.context().newCDPSession(phone);
    const initial=await phone.evaluate(()=>(window as any).__kart.state().racers[0].offset);
    await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button!.x+25,y:button!.y+25,id:1}]});
    await phone.waitForTimeout(500);
    await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.ok(await phone.evaluate(()=>(window as any).__kart.state().racers[0].offset)>initial+.3);
    assert.equal(await phone.evaluate(()=>(window as any).__kart.input().steer),0,'触控释放不能粘住转向');
    await phone.locator('[data-control="boost"]').tap();await phone.waitForTimeout(100);
    assert.ok(await phone.evaluate(()=>(window as any).__kart.state().racers[0].boost)>0);
    await phone.screenshot({path:resolve('output/island-kart/driving-mobile.png')});
    await phone.evaluate(()=>(window as any).__kart.advance(260,{}));
    const free=await phone.evaluate(()=>(window as any).__kart.state());
    assert.ok(free.racers[0].lap>=3);assert.equal(free.result,null);assert.equal(free.phase,'racing');
    assert.equal(await phone.locator('#results').isVisible(),false);
    await phone.close();assert.deepEqual(errors,[]);
  } finally {await browser.close();await closeServer(server.server);}
});
