import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { openTestDatabase } from '../src/server/database.js';
import { StudioRepository } from '../src/server/studio-repository.js';
import { officialGameById } from '../src/shared/official-games/index.js';
import { writeGameArtifact, writeDesignDocuments } from '../src/server/game-artifact.js';

const baseline=process.argv.includes('--baseline');
const template=process.argv.includes('--mahjong')?'mahjong-roguelite':'merge-2048';
const root=resolve('dogfood-output',baseline?'renovation-baseline':'renovation-batch',template);
if(baseline&&existsSync(root))throw new Error('Refusing to overwrite baseline');
const db=await openTestDatabase();
try {
  const game=officialGameById(template)!,seed=game.seed!;
  const project=await new StudioRepository(db,'http://127.0.0.1:4341').create({title:game.title,idea:seed.idea,artStyle:seed.artStyle,visualStyle:seed.visualStyle,template,dimensions:'2d',aspectRatio:'9:16',difficulty:'standard'});
  writeDesignDocuments(root,project);writeGameArtifact(root,project);console.log(root);
} finally {await db.close();}
