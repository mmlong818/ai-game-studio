import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { inspectMemoryMatchNaturalActions, requireBrowserExecutable } from "../src/server/browser-quality";

for (const mode of ["normal", "freeze", "dedupe", "accepted", "animated", "occluded"]) {
  const broken = mode === "freeze";
  const outOfOrder = mode === "dedupe" || mode === "accepted";
  test(`自然记忆配对门禁 ${mode}，不使用probe`, async () => {
    const browser = await chromium.launch({ executablePath: requireBrowserExecutable(), headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(`<button id="start">开始</button><div id="board"></div><script>
        let completed=0;const emitted=new Set();
        window.__FORGE_ONBOARDING__={isActive:()=>true,getState:()=>({completedStepIds:Array.from({length:completed},(_,i)=>i)})};
        function emit(step){${mode === "dedupe" ? "if(emitted.has(step))return;emitted.add(step);" : ""}if(step===completed+1)completed++;}
        Object.defineProperty(window,'__GAME_DEBUG__',{get(){throw new Error('不准使用probe')}});
        let selected=[],locked=false;
        document.querySelector('#start').onclick=()=>{
          document.querySelector('#board').innerHTML='';
          ['花A','花A','花B','花C','花B','花C'].forEach(face=>{
            const card=document.createElement('button');card.setAttribute('role','gridcell');card.dataset.faceName=face;card.dataset.cardState='closed';card.textContent=face;
            card.onclick=()=>{
              if(locked||card.dataset.cardState!=='closed')return;
              card.dataset.cardState='open';selected.push(card);
              emit(1);
              if(selected.length===2){
                if(selected[0].dataset.faceName===selected[1].dataset.faceName){emit(2);selected.forEach(c=>c.dataset.cardState='matched');selected=[];}
                else {emit(3);locked=true;${broken ? "" : "setTimeout(()=>{selected.forEach(c=>c.dataset.cardState='closed');selected=[];locked=false},100);"}}
              }
            };document.querySelector('#board').appendChild(card);
          });
        };
      </script>`);
      if (mode === "animated") await page.addStyleTag({ content: '@keyframes breathe {from {transform:scale(.96)} to {transform:scale(1.04)}} [role=gridcell]{animation:breathe .8s infinite alternate}' });
      if (mode === "occluded") await page.addStyleTag({ content: '#board::after{content:"";position:fixed;inset:30px 0 0;background:#fff;z-index:99}' });
      if (broken) await assert.rejects(() => inspectMemoryMatchNaturalActions(page), /2秒内没有自动盖回/);
      else if (mode === "occluded") await assert.rejects(() => inspectMemoryMatchNaturalActions(page), /遮挡/);
      else if (mode === "dedupe") await assert.rejects(() => inspectMemoryMatchNaturalActions(page, true), /教学未推进/);
      else await inspectMemoryMatchNaturalActions(page, outOfOrder);
    } finally { await browser.close(); }
  });
}
