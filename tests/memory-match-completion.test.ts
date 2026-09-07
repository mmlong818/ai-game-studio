import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { assertMemoryResultNotClipped, completeMemoryMatchThroughInput, requireBrowserExecutable } from "../src/server/browser-quality";

for (const completes of [true, false]) test(`整关必须经正常点击自然结算：${completes}`, async () => {
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable(), headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<body data-game-state="playing"><script>
      Object.defineProperty(window,'__GAME_DEBUG__',{get(){throw new Error('不能调用调试胜利')}});
      let first=null, matched=0;
      for(const face of ['A','B','A','B']) {
        const button=document.createElement('button'); button.setAttribute('role','gridcell');
        button.dataset.faceName=face;button.dataset.cardState='closed';button.textContent='牌';
        button.onclick=()=>{
          if(button.dataset.cardState!=='closed')return;
          button.dataset.cardState='open';
          if(!first){first=button;return;}
          if(first.dataset.faceName===face){first.dataset.cardState=button.dataset.cardState='matched';matched+=2;first=null;}
          if(matched===4&&${completes})document.body.dataset.gameState='won';
        };document.body.append(button);
      }
    </script></body>`);
    if (completes) {
      await completeMemoryMatchThroughInput(page);
      assert.equal(await page.locator('[data-card-state="matched"]').count(), 4);
    } else await assert.rejects(() => completeMemoryMatchThroughInput(page), /Timeout/);
  } finally { await browser.close(); }
});

for (const height of [40, 200]) test(`结算按钮不可被棋盘容器裁切：${height}`, async () => {
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable(), headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<div style="height:${height}px;overflow:hidden"><section id="result"><button style="margin-top:60px">下一关</button></section></div>`);
    if (height === 40) await assert.rejects(() => assertMemoryResultNotClipped(page), /结算按钮被容器裁切/);
    else await assertMemoryResultNotClipped(page);
  } finally { await browser.close(); }
});
