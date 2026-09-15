import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import test from 'node:test';
import {chromium} from 'playwright';
import {closeServer,requireBrowserExecutable,startArtifactServer} from '../src/server/browser-quality';

test('endless match-3 switches all four locales without resetting a live board',async()=>{
  const server=await startArtifactServer(resolve('fixtures/endless-match3'));
  const browser=await chromium.launch({executablePath:requireBrowserExecutable(),args:['--no-sandbox']});
  try{
    const page=await browser.newPage();
    await page.goto(`${server.url}?lang=en&probe=1`);
    assert.equal(await page.locator('h1').textContent(),'Endless Match 3');
    await page.click('#start');
    await page.waitForSelector('.hint');
    await page.click('.hint');
    await page.waitForFunction(()=>Number(document.querySelector('#score')?.textContent)>0);
    await page.waitForFunction(()=>(window as any).__GAME_DEBUG__.getState().phase==='idle');
    const before=await page.evaluate(()=>{const s=(window as any).__GAME_DEBUG__.getState();return {score:s.score,board:s.board.join(','),state:s.state};});
    for(const [locale,title,scoreLabel] of [
      ['zh-CN','无限三消','分数'],['zh-TW','無限三消','分數'],['en','Endless Match 3','Score'],['ja','エンドレス3マッチ','スコア'],
    ] as const){
      await page.evaluate(value=>(window as any).EndlessI18n.applyLocale(value),locale);
      assert.equal(await page.locator('h1').textContent(),title);
      assert.equal(await page.locator('.hud-stats .stat:first-child .k').textContent(),scoreLabel);
      const after=await page.evaluate(()=>{const s=(window as any).__GAME_DEBUG__.getState();return {score:s.score,board:s.board.join(','),state:s.state};});
      assert.deepEqual(after,before);
    }
  }finally{await browser.close();await closeServer(server.server);}
});

test('star dream duel switches menu, help, playing and result UI without resetting play',async()=>{
  const server=await startArtifactServer(resolve('fixtures/star-dream-duel'));
  const browser=await chromium.launch({executablePath:requireBrowserExecutable(),args:['--no-sandbox']});
  try{
    const page=await browser.newPage();
    await page.goto(`${server.url}?lang=en`);
    assert.equal(await page.locator('#setup-title').textContent(),'Welcome to Star Dream Duel');
    if(!await page.locator('#game-help-dialog[open]').count())await page.click('.setup-help-button');
    assert.equal(await page.locator('#game-help-title').textContent(),'Meet your board');
    await page.click('#game-help-next');
    assert.match(await page.locator('#game-help-content').innerText(),/target colors|Every color/);
    await page.evaluate(()=>(window as any).StarI18n.applyLocale('ja'));
    assert.equal(await page.locator('#game-help-title').textContent(),'このモードの遊び方');
    assert.match(await page.locator('#game-help-content').innerText(),/目標色/);
    await page.click('#game-help-close');

    await page.click('button[data-game-mode="duel"]');
    if(await page.locator('#game-help-dialog[open]').count())await page.click('#game-help-close');
    await page.click('#setup-start');
    if(await page.locator('#game-help-dialog[open]').count())await page.click('#game-help-close');
    await page.waitForFunction(()=>['player','ended'].includes((window as any).__GAME_DEBUG__.getState().phase));
    const snapshot=await page.evaluate(()=>({
      state:(window as any).__GAME_DEBUG__.getState(),
      board:[...document.querySelectorAll('#board .tile')].map((node:any)=>node.className).join(','),
    }));
    for(const [locale,turn,zone] of [['zh-CN','当前回合','你的操作区'],['zh-TW','目前回合','你的操作區'],['en','Current turn','Your area'],['ja','現在のターン','あなたの操作エリア']] as const){
      await page.evaluate(value=>(window as any).StarI18n.applyLocale(value),locale);
      assert.equal(await page.locator('.round-card__top > span').textContent(),turn);
      assert.equal(await page.locator('.zone-divider strong').textContent(),zone);
      const current=await page.evaluate(()=>({
        state:(window as any).__GAME_DEBUG__.getState(),
        board:[...document.querySelectorAll('#board .tile')].map((node:any)=>node.className).join(','),
      }));
      assert.deepEqual(current,snapshot);
    }

    await page.evaluate(()=>(window as any).__GAME_DEBUG__.forceWin());
    assert.equal(await page.locator('#result-title').textContent(),'ステージ 1 クリア');
    const ended=await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState());
    await page.evaluate(()=>(window as any).StarI18n.applyLocale('en'));
    assert.equal(await page.locator('#result-title').textContent(),'Level 1 complete');
    assert.deepEqual(await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState()),ended);
    await page.evaluate(()=>(window as any).StarI18n.applyLocale('zh-TW'));
    assert.equal(await page.locator('#result-title').textContent(),'第 1 關完成');
    assert.deepEqual(await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState()),ended);
  }finally{await browser.close();await closeServer(server.server);}
});
