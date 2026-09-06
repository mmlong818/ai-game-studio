import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { officialGameById } from '../src/shared/official-games/index.js';
import { openTestDatabase } from '../src/server/database.js';
import { StudioRepository } from '../src/server/studio-repository.js';
import { writeDesignDocuments, writeGameArtifact } from '../src/server/game-artifact.js';
import { startArtifactServer, closeServer, requireBrowserExecutable, inspectStageCRealtimeInBrowser, inspectStageDClassicInBrowser, inspectStageEInBrowser, inspectNonRealtimeOnboardingInBrowser, inspectTemplateOnboardingInBrowser } from '../src/server/browser-quality.js';

const database=await openTestDatabase();
const baseline=process.argv.includes('--baseline');
const games=process.argv.includes('--puzzles')
  ? [['tetris','折光堆叠'],['puzzle','植光拼图'],['region-logic','星灵巡格']] as const
  : [['space-shooter','星环突围'],['breakout','漆海碎星']] as const;
try {
  const repository=new StudioRepository(database,'http://127.0.0.1:4341');
  for(const [template,title] of games){
    const root=resolve(baseline?'dogfood-output/renovation-baseline':'dogfood-output/renovation-batch',template);
    if(baseline&&existsSync(join(root,'app.js')))throw new Error('Baseline already exists; refusing to overwrite: '+root);
    const seed=officialGameById(template)!.seed!;
    const project=await repository.create({title,idea:seed.idea,artStyle:seed.artStyle,visualStyle:seed.visualStyle,template,dimensions:'2d',aspectRatio:'9:16',difficulty:'standard'});
    writeDesignDocuments(root,project);writeGameArtifact(root,project);
    if(baseline){ /* Capture before changes; do not label it as verified. */ }
    else if(template==='space-shooter'||template==='breakout'){
      await inspectStageCRealtimeInBrowser(root,template);
      await inspectTemplateOnboardingInBrowser(root,template);
    }else if(template==='tetris'||template==='puzzle'){
      await inspectStageDClassicInBrowser(root,template);
      if(template==='tetris')await inspectTemplateOnboardingInBrowser(root,template);
      else await inspectNonRealtimeOnboardingInBrowser(root,template);
    }else{
      await inspectStageEInBrowser(root,template);
      await inspectNonRealtimeOnboardingInBrowser(root,template);
    }
    const server=await startArtifactServer(root);
    const browser=await chromium.launch({executablePath:requireBrowserExecutable()});
    try {
      for(const width of [390,1280]){
        const page=await browser.newPage({viewport:{width,height:844}});
        const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
        await page.goto(server.url);
        await page.locator('#start').click();
        await page.screenshot({path:join(root,'tutorial-'+width+'.png')});
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(400);
        await page.screenshot({path:join(root,'playing-'+width+'.png')});
        if(errors.length)throw new Error(template+': '+errors.join(';'));
        await page.close();
      }
    }finally {await browser.close();await closeServer(server.server);}
    console.log((baseline?'Captured baseline: ':'Verified preview: ')+root);
  }
}finally {await database.close();}
