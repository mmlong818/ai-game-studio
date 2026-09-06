import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {startArtifactServer,closeServer,requireBrowserExecutable} from '../src/server/browser-quality.js';

test('railway: real clicks, connection, playback, persistence, rebuild lifecycle and mobile', {timeout:90000},async()=>{
  const server=await startArtifactServer(resolve('fixtures/meadow-railway'));
  const browser=await chromium.launch({executablePath:requireBrowserExecutable(),args:['--no-sandbox']});
  const errors:string[]=[];mkdirSync(resolve('output/meadow-railway'),{recursive:true});mkdirSync(resolve('fixtures/meadow-railway/assets'),{recursive:true});
  try{
    const page=await browser.newPage({viewport:{width:1366,height:768}});
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(server.url+'?probe=1');await page.locator('#guide[open]').waitFor();
    await page.screenshot({path:resolve('output/meadow-railway/help-desktop.png')});await page.locator('#begin').click();
    await page.locator('[data-piece=left]').click();assert.equal(await page.evaluate(()=>(window as any).__railway.state().closed),true);
    await page.locator('#play').click();const start=await page.evaluate(()=>(window as any).__railway.state().distance);
    await page.waitForFunction((d:number)=>(window as any).__railway.state().distance>d+.4,start);
    await page.locator('#play').click();const paused=await page.evaluate(()=>(window as any).__railway.state().time);
    await page.waitForTimeout(160);assert.equal(await page.evaluate(()=>(window as any).__railway.state().time),paused);
    await page.screenshot({path:resolve('output/meadow-railway/loop-desktop.png')});
    await page.locator('#save').click();await page.reload();assert.equal(await page.locator('#guide').isVisible(),false);assert.equal(await page.evaluate(()=>(window as any).__railway.state().closed),true);
    await page.locator('#open-loop').click();assert.equal(await page.evaluate(()=>(window as any).__railway.state().closed),false);assert.equal(await page.locator('.tools').isVisible(),true);
    await page.locator('[data-piece=down]').hover();assert.match(await page.locator('#build-hint').innerText(),/地面/);assert.equal(await page.evaluate(()=>(window as any).__railway.details().preview),1);
    await page.screenshot({path:resolve('output/meadow-railway/invalid-preview-desktop.png')});
    await page.locator('#new').click();await page.locator('#preset-start').click();
    await page.locator('[data-piece=down]').click();assert.equal(await page.evaluate(()=>(window as any).__railway.state().pieces.length),1);assert.match(await page.locator('#toast').innerText(),/地面/);
    for(const type of['up','bridge','down','left','tunnel'])await page.locator(`[data-piece=${type}]`).click();
    assert.equal(await page.evaluate(()=>(window as any).__railway.state().pieces.length),6);
    await page.locator('#undo').click();assert.equal(await page.evaluate(()=>(window as any).__railway.state().pieces.length),5);await page.locator('#redo').click();
    await page.locator('#home').click();await page.screenshot({path:resolve('output/meadow-railway/bridge-tunnel-desktop.png')});
    await page.locator('#new').click();await page.locator('#preset-scenic').click();assert.equal(await page.evaluate(()=>(window as any).__railway.state().pieces.length),18);assert.equal(await page.evaluate(()=>(window as any).__railway.state().closed),true);
    await page.waitForTimeout(700);await page.screenshot({path:resolve('output/meadow-railway/scenic-desktop.png')});
    await page.locator('#play').click();await page.locator('#follow').click();await page.waitForTimeout(750);const details=await page.evaluate(()=>(window as any).__railway.details());assert.equal(details.wheels,14);assert.equal(details.rods,2);assert.ok(Math.abs(details.spin)>1);await page.screenshot({path:resolve('output/meadow-railway/train-detail-desktop.png')});
    await page.locator('#play').click();await page.locator('#home').click();
    await page.locator('#new').click();await page.locator('#preset-loop').click();await page.waitForTimeout(150);
    const initial=await page.evaluate(()=>(window as any).__railway.graphics());
    for(let i=0;i<8;i++){await page.locator('#undo').click();await page.locator('#redo').click();}
    await page.waitForTimeout(150);const after=await page.evaluate(()=>(window as any).__railway.graphics());assert.equal(after.geometries,initial.geometries);assert.ok(after.calls<220);
    await page.locator('#play').click();await page.evaluate(()=>(window as any).__railway.advance(45));assert.ok(await page.evaluate(()=>(window as any).__railway.state().trips)>=2);
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>(window as any).__railway.state().running),false);
    const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(server.url+'?probe=1');await mobile.locator('#begin').tap();await mobile.locator('[data-piece=left]').tap();await mobile.locator('#play').tap();await mobile.waitForFunction(()=>(window as any).__railway.state().distance>4.5);await mobile.locator('#follow').tap();await mobile.waitForTimeout(800);
    assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await mobile.evaluate(()=>(window as any).__railway.state().closed),true);await mobile.screenshot({path:resolve('output/meadow-railway/driving-mobile.png')});
    await mobile.locator('#view').tap();assert.equal(await mobile.locator('.toolbox').isVisible(),false);await mobile.locator('#view').tap();assert.equal(await mobile.locator('.toolbox').isVisible(),true);
    await mobile.locator('#new').tap();await mobile.locator('#preset-scenic').tap();await mobile.waitForTimeout(700);await mobile.screenshot({path:resolve('output/meadow-railway/scenic-mobile.png')});await mobile.locator('#open-loop').tap();assert.equal(await mobile.locator('[data-piece=left]').isEnabled(),true);
    assert.deepEqual(errors,[]);console.log('Railway desktop graphics:',JSON.stringify(after));
  }finally{await browser.close();await closeServer(server.server);}
});
