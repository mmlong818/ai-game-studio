import assert from 'node:assert/strict';
import '../scripts/preview-merge.js';
import test from 'node:test';
import {createContext,runInContext} from 'node:vm';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright';
import {merge2048Script} from '../src/server/game-runtimes/merge-2048.js';
import {startArtifactServer,closeServer,requireBrowserExecutable} from '../src/server/browser-quality.js';

test('数织首关：仅由可见棋盘选方向，正常输入达到128后才结算',{timeout:120000},async()=>{
  const context=createContext({config:{campaignStorageKey:'test'},performance:{now:()=>0}});
  runInContext(merge2048Script.slice(0,merge2048Script.indexOf('function mergeLayout()')),context);
  // Test player has no RNG state or future-spawn access. Not a human playtime measurement.
  runInContext(`function grade(board){
    const logs=board.map(row=>row.map(v=>v?Math.log2(v):0));let smooth=0;
    for(let r=0;r<4;r++)for(let c=0;c<4;c++){if(c<3)smooth+=Math.abs(logs[r][c]-logs[r][c+1]);if(r<3)smooth+=Math.abs(logs[r][c]-logs[r+1][c]);}
    const max=Math.max(...board.flat()),corner=[board[0][0],board[0][3],board[3][0],board[3][3]].includes(max);
    return availableCells(board).length*160-smooth*8+(corner?120:0)+max;
  }
  function choose(board){let best=null,score=-Infinity;
    for(const direction of ['left','down','right','up']){const result=resolveMergeMove(board,direction);if(!result.changed)continue;
      let total=0,cells=availableCells(result.next);
      for(const cell of cells){const next=cloneBoard(result.next);next[cell.row][cell.column]=2;let future=-10000;
        for(const move of ['left','down','right','up']){const candidate=resolveMergeMove(next,move);if(candidate.changed)future=Math.max(future,grade(candidate.next)+candidate.scoreGain*.2);}
        total+=future;
      }
      const value=total/Math.max(1,cells.length)+result.scoreGain*.2;if(value>score){best=direction;score=value;}
    }return best;
  }`,context);
  const root=resolve('dogfood-output/renovation-batch/merge-2048'),server=await startArtifactServer(root);
  const browser=await chromium.launch({executablePath:requireBrowserExecutable()});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(server.url+'?probe=1');await page.locator('#start').click();
    await page.keyboard.press('ArrowRight');await page.waitForTimeout(230);await page.keyboard.press('ArrowLeft');await page.waitForTimeout(230);
    let actions=0,saw64=false;
    for(;actions<300;actions++){
      const state=await page.evaluate(()=>(window as any).__GAME_DEBUG__.getState().runtime);
      if(await page.locator('body').getAttribute('data-game-state')==='stage-complete')break;
      if(state.bestTile===64){saw64=true;assert.equal(state.missionComplete,false);assert.equal(await page.locator('.victory-summary').count(),0);}
      context.inputBoard=state.board;
      const direction=runInContext('choose(inputBoard)',context) as string|null;assert.ok(direction,'Test player reached a dead end');
      await page.keyboard.press('Arrow'+direction[0].toUpperCase()+direction.slice(1));await page.waitForTimeout(190);
    }
    assert.equal(await page.locator('body').getAttribute('data-game-state'),'stage-complete');assert.equal(saw64,true);
    assert.ok((await page.locator('.merge-result').innerText()).includes('128'));
    await page.evaluate(()=>{const note=document.createElement('p');note.textContent='自动策略正常输入 · 非真人时长证据';document.querySelector('.merge-result')!.after(note);});
    await page.waitForTimeout(900);await page.screenshot({path:join(root,'victory-390.png')});assert.deepEqual(errors,[]);
    console.log('128 reached via normal input:',actions,'moves');
  }finally{await browser.close();await closeServer(server.server);}
});
