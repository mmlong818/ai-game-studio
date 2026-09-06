import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {startArtifactServer,closeServer,requireBrowserExecutable} from '../src/server/browser-quality.js';

const browser=await chromium.launch({executablePath:requireBrowserExecutable(),args:['--no-sandbox']});
const results=[];
try {
  for(const game of ['island-kart','meadow-railway']) {
    const server=await startArtifactServer(resolve('fixtures',game));
    try {
      const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:2});
      await context.addInitScript({content:`(() => {
        Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4});
        Object.defineProperty(navigator,'deviceMemory',{get:()=>4});
      })()`});
      const page=await context.newPage(), errors:string[]=[];
      page.on('pageerror',e=>errors.push(e.message));
      const cdp=await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
      await page.goto(server.url+'?probe=1');
      if(game==='meadow-railway'){
        await page.locator('#begin').click();
        await page.locator('#new').click();await page.locator('#preset-scenic').click();
        await page.locator('#play').click();
      } else {
        // Use the same actual menu controls as the gameplay browser regression.
        const begin=page.locator('#help-start');
        if(await begin.isVisible())await begin.click();
        await page.locator('#start').click();
      }
      await page.waitForTimeout(8000);
      const timing=await page.evaluate(`new Promise(resolve=>{
        const samples=[];let last=performance.now(),start=last;
        function frame(now){samples.push(now-last);last=now;if(now-start<12000){requestAnimationFrame(frame);return;}
          const meanMs=samples.reduce((a,b)=>a+b,0)/samples.length;
          samples.sort((a,b)=>a-b);resolve({frames:samples.length,meanMs,p95Ms:samples[Math.floor(samples.length*.95)]});}
        requestAnimationFrame(frame);
      })`);
      const graphics=await page.evaluate(()=>((window as any).__kart??(window as any).__railway).graphics());
      results.push({game,cpuSlowdown:4,hardwareHints:{cores:4,memoryGB:4},viewport:'1280x720 @ DPR 2',timing,graphics,errors});
      if(errors.length)throw Error(errors.join('\n'));
      await context.close();
    } finally {await closeServer(server.server);}
  }
} finally {await browser.close();}
mkdirSync('output/performance',{recursive:true});
writeFileSync('output/performance/3d-low-spec.json',JSON.stringify({testedAt:new Date().toISOString(),limitation:'CPU throttling is not a physical low-end GPU test.',results},null,2));
console.log(JSON.stringify(results,null,2));
