import { resolve } from 'node:path';
import { openTestDatabase } from '../src/server/database.js';
import { StudioRepository } from '../src/server/studio-repository.js';
import { writeDesignDocuments, writeGameArtifact } from '../src/server/game-artifact.js';
import { inspectStageDClassicInBrowser, inspectNonRealtimeOnboardingInBrowser, startArtifactServer, closeServer, requireBrowserExecutable } from '../src/server/browser-quality.js';
import { chromium } from 'playwright';

const database=await openTestDatabase();
try {
  const repository=new StudioRepository(database,'http://127.0.0.1:4340');
  const project=await repository.create({title:'软糖拼岛',idea:'旋转软糖拼块，填满岛屿轮廓。',template:'polyomino-fit',dimensions:'2d',aspectRatio:'9:16',difficulty:'standard'});
  const root=resolve('dogfood-output/polyomino-renovation');
  writeDesignDocuments(root,project);
  writeGameArtifact(root,project);
  await inspectStageDClassicInBrowser(root,'polyomino-fit');
  await inspectNonRealtimeOnboardingInBrowser(root,'polyomino-fit');
  const server=await startArtifactServer(root);
  const browser=await chromium.launch({executablePath:requireBrowserExecutable()});
  try {
    for(const width of [390,1280]){
      const page=await browser.newPage({viewport:{width,height:844}});
      await page.goto(server.url);
      await page.locator('#start').click();
      await page.screenshot({path:resolve(root,'playing-'+width+'.png')});
      await page.close();
    }
  }finally {await browser.close();await closeServer(server.server);}
  console.log('Preview verified:',root);
} finally { await database.close(); }
