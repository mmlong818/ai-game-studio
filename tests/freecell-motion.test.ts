import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {startArtifactServer,closeServer,requireBrowserExecutable} from '../src/server/browser-quality.js';

async function assertVisibleFlight(page:any,selector:string){
  await page.waitForFunction((selector:string)=>document.querySelector(selector)?.getAnimations().some(animation=>animation.effect?.getTiming().duration===640),selector);
  const samples=await page.evaluate(`new Promise(resolve => {
    const el=document.querySelector(${JSON.stringify(selector)});const points=[];const start=performance.now();
    const sample=()=>{const rect=el.getBoundingClientRect();points.push({x:rect.x,y:rect.y,visible:!el.hidden&&rect.width>0});if(performance.now()-start<240)requestAnimationFrame(sample);else resolve(points);};sample();
  })`);
  assert.ok(samples.every((point:any)=>point.visible));
  assert.ok(new Set(samples.map((point:any)=>`${point.x.toFixed(1)},${point.y.toFixed(1)}`)).size>=4,'Must render multiple distinct intermediate positions');
  assert.ok(Math.hypot(samples.at(-1).x-samples[0].x,samples.at(-1).y-samples[0].y)>5,'The card must visibly travel, not just toggle a class');
}

test('接龙两种系统动效偏好均发牌、恢复原局，收牌落地后才结算',{timeout:45000},async()=>{
  const server=await startArtifactServer(resolve('fixtures/freecell'));
  const browser=await chromium.launch({executablePath:requireBrowserExecutable()});
  try{for(const reducedMotion of ['reduce','no-preference'] as const){
    const page=await browser.newPage({reducedMotion,viewport:{width:390,height:844}});
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>localStorage.setItem('freecell.learning.v1',JSON.stringify({seen:true})));
    await page.goto(server.url);await page.waitForFunction(()=>document.body.dataset.dealing==='true');
    await assertVisibleFlight(page,'.card[data-card="JD"]');
    await page.waitForFunction(()=>document.body.dataset.dealing==='false');
    const before=await page.evaluate(()=>(window as any).__freecell.getState());
    await page.reload();await page.waitForFunction(()=>document.body.dataset.dealing==='true');
    assert.deepEqual(await page.evaluate(()=>(window as any).__freecell.getState()),before);
    await page.waitForFunction(()=>document.body.dataset.dealing==='false');
    // Explicit near-win fixture: a real move starts the normal automatic collection path.
    await page.addInitScript(()=>localStorage.setItem('freecell.session.v1',JSON.stringify({level:1,state:{columns:[[48,44],[49,45],[50,46],[51,47],[],[],[],[]],cells:[null,null,null,null],foundations:[11,11,11,11]},history:[],moves:0,elapsed:0,won:false})));
    await page.reload();await page.waitForFunction(()=>document.body.dataset.dealing==='false');
    assert.deepEqual(await page.evaluate(()=>(window as any).__freecell.getState().foundations),[11,11,11,11]);
    await page.locator('.card[data-card="QC"]').click();await page.locator('.card[data-card="QC"]').click();
    await page.waitForFunction(()=>document.body.dataset.cascading==='true');
    await assertVisibleFlight(page,'.card.is-flying');
    assert.equal(await page.evaluate(()=>(window as any).__freecell.getMeta().won),false);
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('.card.is-flying')).some(el=>{const card=(el as HTMLElement).dataset.card;return card?.startsWith('Q')&&document.querySelector('.card.is-flying[data-card="K'+card.slice(1)+'"]');}));
    assert.equal(await page.locator('.card.is-flying[hidden]').count(),0,'Later cards must not hide cards still in flight');
    await page.waitForFunction(()=>document.body.classList.contains('is-celebrating'));
    assert.equal(await page.locator('.card.is-flying').count(),0);
    await page.keyboard.press('u');
    assert.deepEqual(await page.evaluate(()=>(window as any).__freecell.getState().foundations),[13,13,13,13]);
    await page.waitForFunction(()=>(window as any).__freecell.getMeta().won);
    assert.deepEqual(errors,[]);await page.close();
  }}finally{await browser.close();await closeServer(server.server);}
});
