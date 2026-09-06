// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonState,lessonAccepts} from '../fixtures/freecell/lessons.js';
import {validateMove} from '../fixtures/freecell/game-core.js';
import {chromium} from 'playwright';
import {resolve,join} from 'node:path';
import {mkdirSync} from 'node:fs';
import {startArtifactServer,closeServer,requireBrowserExecutable} from '../src/server/browser-quality.js';
test('三段接龙练习均为完整52张合法局面，目标动作可执行',()=>{
  for(let index=0;index<3;index++){
    const state=lessonState(index),cards=state.columns.flat();assert.equal(cards.length,52);assert.equal(new Set(cards).size,52);
    const move={from:{type:'column',index:0},to:{type:index===0?'cell':'column',index:index===0?0:1},count:index===2?3:1};
    assert.equal(validateMove(state,move).ok,true);assert.equal(lessonAccepts(index,move),true);
  }
});
test('接龙双端首次练习真实点击，全部完成后恢复正式局',{timeout:40000},async()=>{
  const server=await startArtifactServer(resolve('fixtures/freecell')),browser=await chromium.launch({executablePath:requireBrowserExecutable()});
  const output=resolve('dogfood-output/renovation-batch/freecell');mkdirSync(output,{recursive:true});
  try{for(const width of [390,1280]){
    const page=await browser.newPage({viewport:{width,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(server.url);await page.waitForFunction(()=>window.__freecell?.getMeta().practice?.index===0);
    await page.screenshot({path:join(output,'learning-'+width+'.png')});
    await page.locator('[data-slot=cell-0]').click();await page.waitForFunction(()=>window.__freecell.getMeta().practice.passed);
    await page.locator('[data-learn=next]').click();await page.locator('.card[data-card="7C"]').click({position:{x:12,y:6}});
    await page.waitForFunction(()=>window.__freecell.getMeta().practice.passed);
    await page.locator('[data-learn=next]').click();await page.locator('.card[data-card="4D"]').click({position:{x:12,y:6}});
    await page.waitForFunction(()=>window.__freecell.getMeta().practice.passed);await page.locator('[data-learn=next]').click();
    assert.equal((await page.evaluate(()=>window.__freecell.getMeta())).moves,0);assert.equal((await page.evaluate(()=>window.__freecell.getMeta())).practice,null);
    const before=await page.evaluate(()=>window.__freecell.getState());
    await page.reload();await page.waitForFunction(()=>Boolean(window.__freecell));assert.deepEqual(await page.evaluate(()=>window.__freecell.getState()),before);
    await page.waitForTimeout(1800); // Capture the settled table, not the deliberate dealing animation.
    const columns=await page.locator('.slot--column').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().x));
    assert.equal(new Set(columns).size,8);
    assert.deepEqual(errors,[]);await page.screenshot({path:join(output,'playing-'+width+'.png')});await page.close();
  }}finally{await browser.close();await closeServer(server.server);}
});
